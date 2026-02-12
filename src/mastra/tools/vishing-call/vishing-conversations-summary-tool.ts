/**
 * Vishing Conversations Summary Tool
 * Generates a structured summary (timeline, disclosed info, outcome) + next steps from a completed vishing call transcript.
 */

import { generateText } from 'ai';
import { getModelWithOverride, Model, ModelProvider } from '../../model-providers';
import { getLogger } from '../../utils/core/logger';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { withRetry } from '../../utils/core/resilience-utils';
import {
  VishingConversationsSummaryOutputSchema,
  VishingConversationsSummarySchema,
  VishingNextStepCardSchema,
  VishingStatusCardSchema,
  type VishingConversationsSummary,
  type VishingStatusCard,
} from '../../schemas/vishing-conversations-summary';

const logger = getLogger('VishingConversationsSummaryTool');

const DEFAULT_NEXT_STEPS: readonly { title: string; description: string }[] = [
  { title: 'Verifying Caller Identity', description: 'Always verify the caller through official channels before sharing any information.' },
  { title: 'Never Share OTPs or Passwords', description: 'Legitimate organizations never ask for passwords or one-time codes over the phone.' },
] as const;

const STATUS_CARD_BY_OUTCOME: Record<string, VishingStatusCard> = {
  data_disclosed: {
    variant: 'warning',
    title: 'Data Disclosed',
    description:
      'Sensitive information was shared during the call. Review what was disclosed and take recommended next steps.',
  },
  refused: {
    variant: 'success',
    title: 'No Data Disclosed',
    description: 'You correctly refused to share sensitive information. Well done recognizing the attempt.',
  },
  detected: {
    variant: 'success',
    title: 'Simulation Detected',
    description: 'You identified this as a simulation. Great awareness of vishing tactics.',
  },
  other: {
    variant: 'info',
    title: 'Call Completed',
    description: 'The simulation ended. Review the timeline and recommendations below.',
  },
};

export type VishingMessage = { role: 'agent' | 'user'; text: string; timestamp?: number };

function parseNextSteps(raw: unknown): { title: string; description: string }[] {
  if (!Array.isArray(raw)) return [...DEFAULT_NEXT_STEPS];
  const validated = raw
    .map((item) => VishingNextStepCardSchema.safeParse(item))
    .filter((r): r is { success: true; data: { title: string; description: string } } => r.success)
    .map((r) => r.data);
  return validated.length > 0 ? validated : [...DEFAULT_NEXT_STEPS];
}

function buildMessagesPrompt(messages: VishingMessage[]): string {
  return messages
    .map((m) => {
      const ts = m.timestamp !== undefined && m.timestamp !== null ? `[${m.timestamp}s] ` : '';
      return `${ts}${m.role === 'agent' ? 'Agent' : 'User'}: ${m.text}`;
    })
    .join('\n');
}

export async function generateVishingConversationsSummary(
  messages: VishingMessage[]
): Promise<{ summary: VishingConversationsSummary; nextSteps: { title: string; description: string }[]; statusCard: VishingStatusCard }> {
  const conversationText = buildMessagesPrompt(messages);

  const systemPrompt = `You are a senior security training analyst specializing in social engineering and vishing (voice phishing) assessments. Analyze this transcript from a simulated vishing call and produce a structured debrief for the learner.

CONTEXT: This is a security training simulation, not a real attack. "Agent" = the simulated scammer; "User" = the learner being assessed. Your job is to identify what happened, what (if anything) was disclosed, and provide actionable feedback.

TIMELINE PHASES (use exactly these labels):
- Introduction: Caller introduces themselves, states reason for call
- Credibility Building: Caller establishes fake authority or trust
- Pressure: Caller creates urgency, time pressure, or fear
- Data Request: Caller explicitly asks for sensitive information
- Data Disclosed: Moment when learner shared sensitive data (only if outcome is data_disclosed)
- Simulation Reveal: When the simulation ends and debrief begins
- Other: Only if the phase does not fit any of the above

OUTCOME RULES:
- data_disclosed: Learner shared sensitive info (passwords, OTP, card numbers, account details, etc.). List each item in disclosedInfo.
- refused: Learner refused without disclosing. No sensitive data was shared — leave disclosedInfo empty.
- detected: Learner identified it as a simulation. No sensitive data was shared — leave disclosedInfo empty.
- other: Call ended without clear outcome (e.g. dropped, incomplete). No sensitive data to report — leave disclosedInfo empty.

NEXT STEPS: Tailor to outcome. For data_disclosed: include "Change exposed passwords", "Contact bank if financial info shared". For refused/detected: reinforce positive behavior. 2-4 items, each with title and description. Output in English.

OUTPUT STRUCTURE (valid JSON only):
{
  "summary": {
    "timeline": [
      { "timestamp": "MM:SS", "label": "<phase>", "snippet": "<1-2 sentence excerpt, direct quote or close paraphrase>" }
    ],
    "disclosedInfo": [
      { "item": "<what was shared: e.g. OTP, password, card number>", "timestamp": "MM:SS" }
    ],
    "outcome": "data_disclosed" | "refused" | "detected" | "other"
  },
  "nextSteps": [
    { "title": "<short title>", "description": "<actionable recommendation>" }
  ]
}

Return ONLY the JSON object. No markdown, no code blocks, no extra text.`;

  const userPrompt = `Analyze this vishing simulation transcript:\n\n${conversationText}`;

  logger.info('vishing_conversations_summary_llm_start', { messageCount: messages.length });

  const model = getModelWithOverride(ModelProvider.OPENAI, Model.OPENAI_GPT_5_1);
  const { text } = await withRetry(
    () =>
      generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
      }),
    'Vishing conversations summary'
  );

  logger.info('vishing_conversations_summary_llm_complete');

  const cleaned = cleanResponse(text, 'vishing-conversations-summary');
  const raw = JSON.parse(cleaned) as Record<string, unknown>;

  // Normalize: LLM may return flat { timeline, outcome, ... } instead of { summary, nextSteps }
  let parsed: { summary: VishingConversationsSummary; nextSteps: { title: string; description: string }[] };
  if (raw.summary && typeof raw.summary === 'object' && Array.isArray(raw.nextSteps)) {
    parsed = VishingConversationsSummaryOutputSchema.parse(raw);
  } else if (raw.timeline && raw.outcome) {
    const summary = VishingConversationsSummarySchema.parse({
      timeline: raw.timeline,
      disclosedInfo: raw.disclosedInfo ?? [],
      outcome: raw.outcome,
    });
    parsed = { summary, nextSteps: parseNextSteps(raw.nextSteps) };
  } else {
    parsed = VishingConversationsSummaryOutputSchema.parse(raw);
  }
  const statusCard =
    STATUS_CARD_BY_OUTCOME[parsed.summary.outcome] ?? STATUS_CARD_BY_OUTCOME.other;

  const statusCardValidated = VishingStatusCardSchema.parse(statusCard);

  // Enforce: refused/detected/other must have empty disclosedInfo
  const summary =
    parsed.summary.outcome === 'data_disclosed'
      ? parsed.summary
      : { ...parsed.summary, disclosedInfo: [] };

  return {
    summary,
    nextSteps: parsed.nextSteps,
    statusCard: statusCardValidated,
  };
}
