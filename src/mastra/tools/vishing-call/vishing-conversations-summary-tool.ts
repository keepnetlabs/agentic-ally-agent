/**
 * Vishing Conversations Summary Tool
 * Generates a structured summary (timeline, disclosed info, outcome) + next steps from a completed vishing call transcript.
 */

import { generateText } from 'ai';
import { getModelWithOverride, Model, ModelProvider } from '../../model-providers';
import { getLogger } from '../../utils/core/logger';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import { AGENT_CALL_TIMEOUT_MS } from '../../constants';
import {
  VishingConversationsSummaryOutputSchema,
  VishingConversationsSummarySchema,
  VishingNextStepCardSchema,
  VishingStatusCardSchema,
  type VishingConversationsSummary,
  type VishingStatusCard,
} from '../../schemas/vishing-conversations-summary';
import { LOW_DETERMINISM_PARAMS } from '../../utils/config/llm-generation-params';

const logger = getLogger('VishingConversationsSummaryTool');

const DEFAULT_NEXT_STEPS: readonly { title: string; description: string }[] = [
  {
    title: 'Verifying Caller Identity',
    description: 'Always verify the caller through official channels before sharing any information.',
  },
  {
    title: 'Never Share OTPs or Passwords',
    description: 'Legitimate organizations never ask for passwords or one-time codes over the phone.',
  },
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

type TimelineItemLike = {
  timestamp?: unknown;
  label?: unknown;
  snippet?: unknown;
};

function normalizeEnumKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function normalizeTimelineLabel(label: unknown): string {
  if (typeof label !== 'string') return 'Other';
  const v = normalizeEnumKey(label);

  if (v === 'introduction' || v === 'intro') return 'Introduction';
  if (v === 'credibility_building' || v === 'credibility' || v === 'authority') return 'Credibility Building';
  if (v === 'pressure' || v === 'urgency') return 'Pressure';
  if (v === 'data_request' || v === 'request' || v === 'ask') return 'Data Request';
  if (v === 'data_disclosed' || v === 'disclosed' || v === 'disclosure') return 'Data Disclosed';
  if (v === 'simulation_reveal' || v === 'reveal' || v === 'detected' || v === 'detection') return 'Simulation Reveal';
  if (v === 'other') return 'Other';
  return 'Other';
}

function normalizeTimelineItems(timeline: unknown): unknown[] {
  if (!Array.isArray(timeline)) return [];

  return timeline.map(item => {
    const record = (item ?? {}) as TimelineItemLike;
    return {
      timestamp: typeof record.timestamp === 'string' ? record.timestamp : '0:00',
      label: normalizeTimelineLabel(record.label),
      snippet: typeof record.snippet === 'string' ? record.snippet : '',
    };
  });
}

function normalizeOutcome(outcome: unknown): unknown {
  if (typeof outcome !== 'string') return outcome;
  const v = normalizeEnumKey(outcome);
  if (v === 'data_disclosed' || v === 'disclosed' || v === 'shared') return 'data_disclosed';
  if (v === 'refused' || v === 'reject' || v === 'rejected') return 'refused';
  if (v === 'detected' || v === 'detection') return 'detected';
  if (v === 'other' || v === 'unknown') return 'other';
  return outcome;
}

function normalizeRawSummaryPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...raw };

  if (normalized.summary && typeof normalized.summary === 'object' && normalized.summary !== null) {
    const summary = normalized.summary as Record<string, unknown>;
    normalized.summary = {
      ...summary,
      timeline: normalizeTimelineItems(summary.timeline),
      outcome: normalizeOutcome(summary.outcome),
    };
  } else {
    normalized.timeline = normalizeTimelineItems(normalized.timeline);
    normalized.outcome = normalizeOutcome(normalized.outcome);
  }

  return normalized;
}

function parseNextSteps(raw: unknown): { title: string; description: string }[] {
  if (!Array.isArray(raw)) return [...DEFAULT_NEXT_STEPS];
  const validated = raw
    .map(item => VishingNextStepCardSchema.safeParse(item))
    .filter((r): r is { success: true; data: { title: string; description: string } } => r.success)
    .map(r => r.data);
  return validated.length > 0 ? validated : [...DEFAULT_NEXT_STEPS];
}

function buildMessagesPrompt(messages: VishingMessage[]): string {
  return messages
    .map(m => {
      const ts = m.timestamp !== undefined && m.timestamp !== null ? `[${m.timestamp}s] ` : '';
      return `${ts}${m.role === 'agent' ? 'Agent' : 'User'}: ${m.text}`;
    })
    .join('\n');
}

export async function generateVishingConversationsSummary(messages: VishingMessage[]): Promise<{
  summary: VishingConversationsSummary;
  nextSteps: { title: string; description: string }[];
  statusCard: VishingStatusCard;
}> {
  const conversationText = buildMessagesPrompt(messages);

  const systemPrompt = `You are a senior security training analyst specializing in social engineering and vishing (voice phishing) assessments. Analyze this transcript from a simulated vishing call and produce a structured debrief for the learner.

CONTEXT: This is a security training simulation, not a real attack. "Agent" = the simulated scammer; "User" = the learner being assessed.

TIMELINE PHASE ENUM (exact, case-sensitive):
- "Introduction"
- "Credibility Building"
- "Pressure"
- "Data Request"
- "Data Disclosed"
- "Simulation Reveal"
- "Other"

TIMELINE MAPPING:
- opening/greeting/self-intro -> "Introduction"
- authority/trust/pretext setup -> "Credibility Building"
- urgency/threat/deadline pressure -> "Pressure"
- request for OTP/password/card/account detail -> "Data Request"
- user shares sensitive detail -> "Data Disclosed"
- simulation announced or debrief starts -> "Simulation Reveal"
- unmatched phase -> "Other"

OUTCOME ENUM (exact, lowercase, underscore):
- "data_disclosed"
- "refused"
- "detected"
- "other"

OUTCOME RULES:
- data_disclosed: Learner shared sensitive info (passwords, OTP, card numbers, account details, etc.). List each item in disclosedInfo.
- refused: Learner refused and shared no sensitive data. disclosedInfo must be [].
- detected: Learner identified simulation and shared no sensitive data. disclosedInfo must be [].
- other: Call ended without clear outcome. disclosedInfo must be [].

NEXT STEPS:
- Tailor to outcome.
- For data_disclosed include actions like password reset and financial provider contact if relevant.
- For refused/detected reinforce positive behavior.
- 2-4 items, each with title + description, in English.

OUTPUT STRUCTURE:
{
  "summary": {
    "timeline": [
      { "timestamp": "MM:SS", "label": "Introduction", "snippet": "<1-2 sentence excerpt>" }
    ],
    "disclosedInfo": [
      { "item": "<what was shared>", "timestamp": "MM:SS" }
    ],
    "outcome": "refused"
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
      withTimeout(
        generateText({
          model,
          system: systemPrompt,
          prompt: userPrompt,
          ...LOW_DETERMINISM_PARAMS,
        }),
        AGENT_CALL_TIMEOUT_MS
      ),
    'Vishing conversations summary'
  );

  logger.info('vishing_conversations_summary_llm_complete');

  const cleaned = cleanResponse(text, 'vishing-conversations-summary');
  const raw = normalizeRawSummaryPayload(JSON.parse(cleaned) as Record<string, unknown>);

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
  const statusCard = STATUS_CARD_BY_OUTCOME[parsed.summary.outcome] ?? STATUS_CARD_BY_OUTCOME.other;

  const statusCardValidated = VishingStatusCardSchema.parse(statusCard);

  // Enforce: refused/detected/other must have empty disclosedInfo
  const summary =
    parsed.summary.outcome === 'data_disclosed' ? parsed.summary : { ...parsed.summary, disclosedInfo: [] };

  return {
    summary,
    nextSteps: parsed.nextSteps,
    statusCard: statusCardValidated,
  };
}
