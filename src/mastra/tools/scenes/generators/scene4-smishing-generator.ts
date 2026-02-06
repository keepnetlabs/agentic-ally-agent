import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';
import { resolveSmishingChannel, buildSmishingChannelPromptRules } from '../../../utils/smishing-channel';

function buildCriticalRulesBlock(
  analysis: PromptAnalysis,
  channelFocusRule: string,
  channelToneRule: string,
  channelInteractionRule: string
): string {
  return `CRITICAL RULES:
1. ${channelFocusRule}
2. Use realistic sender impersonation patterns (bank, IT, manager, vendor)
3. Emphasize verification and refusal steps
4. Start with one or two short messages that sound conversational
5. Always end with a question that invites a reply
6. ${channelToneRule}
7. ${channelInteractionRule}
8. Never reference missing artifacts. If a message mentions a link, file, code, QR, or attachment, include the fictional artifact in that same message.
9. Topic-first rule: keep scenario content anchored to ${analysis.topic}. Channel rules affect style only, not the scenario domain.
10. All text in ${analysis.language}
11. Priority order if rules conflict: safety and simulation integrity first, then topic fit, then channel realism, then brevity/style polish`;
}

function buildRolePlayPromptInstruction(
  analysis: PromptAnalysis,
  channelPromptLabel: string,
  channelInteractionRule: string
): string {
  return `System prompt (final text) for the ${channelPromptLabel} role-play agent. Write 6-9 short sentences total. MUST include these rules in natural language: This is a security-training role-play, not a real attempt; never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or any personal/company secrets; use mild urgency and pretext without threats; keep replies short like ${channelPromptLabel}; follow this channel style exactly: ${channelInteractionRule}; keep scenario semantics anchored to ${analysis.topic} and user intent, and use channel rules only for delivery style; if rules conflict, prioritize safety and simulation integrity first, then topic fit, then channel realism, then brevity/style polish; start with one or two short messages that sound conversational; always end each reply with a short question that expects a user response; never reference a missing artifact (if you mention a link/file/code/attachment, include a clearly fictional one in that same message); if the user says a code arrived, asks about a code, or asks whether to share a code, continue naturally for 1 short turn without requesting the code value, then move to debrief; if the user shares/offers any code, address, or says they clicked/opened a link or downloaded a file, stop role-play and give a simulation-only safety debrief; if the user refuses/calls out smishing/asks to verify, end politely and give a short debrief; if the user starts to comply, continue briefly (1-2 turns max) then end and debrief; debrief format must be exactly: 1 sentence "this is a simulation" reminder, then 2-3 concise red flags, then 1 correct next step; keep the debrief educational, not incident-response-heavy. After the rules, add a Scenario section with 4 short lines using this exact format: 1) Persona: ... 2) Pretext: ... 3) FictionalRequest: ... 4) UrgencyCue: ... Keep everything fictional and safe (made-up names, fake identifiers, non-realistic numbers). Avoid these words: account, transfer, wire, beneficiary, funds.`;
}

function buildFirstMessageInstruction(
  analysis: PromptAnalysis,
  channelFirstMessageLabel: string,
  channelPromptLabel: string
): string {
  return `${channelFirstMessageLabel} (final text, not instructions). 1-2 sentences, realistic intro aligned with ${analysis.topic} and the persona. CRITICAL: Sender must introduce themselves by the exact name from the senderName field above. Include a reason for the message and mild urgency, but keep details fictional and safe; do not request real data. If you reference a link/file/code/attachment, include that fictional artifact in the same message; otherwise do not imply 'below/attached' and ask permission to send details in the next message. Keep it ${channelPromptLabel}-style, short. End with a short question.`;
}

function buildOutputCriticalBlock(
  analysis: PromptAnalysis,
  channelLabel: string,
  channelToneRule: string
): string {
  return `CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any (channel is required)
2. Adapt to ${analysis.topic} context (${channelLabel} scenario, no inbox)
3. Start with one or two short messages that sound conversational
4. Always end with a question that invites a reply
5. ${channelToneRule}
6. No placeholders, no instructional text, return final content only`;
}

export function generateScene4SmishingPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);
  const channel = resolveSmishingChannel(analysis);
  const {
    channelLabel,
    channelFocusRule,
    channelToneRule,
    channelInteractionRule,
    channelPromptLabel,
    channelFirstMessageLabel,
  } = buildSmishingChannelPromptRules(channel);
  const criticalRulesBlock = buildCriticalRulesBlock(analysis, channelFocusRule, channelToneRule, channelInteractionRule);
  const rolePlayPromptInstruction = buildRolePlayPromptInstruction(analysis, channelPromptLabel, channelInteractionRule);
  const firstMessageInstruction = buildFirstMessageInstruction(analysis, channelFirstMessageLabel, channelPromptLabel);
  const outputCriticalBlock = buildOutputCriticalBlock(analysis, channelLabel, channelToneRule);

  return `${contextData}

SMISHING SIMULATION SCENE (${channelLabel} Chat Role-Play):
PURPOSE: Simulate a realistic ${channelLabel}-based scam and teach the learner to respond safely.
FORMAT: Step-by-step message thread handling with clear decision points.

${criticalRulesBlock}

{
  "4": {
    "iconName": "message-square",
    "channel": "${channel}",
    "title": "Role-play focused title (max 6 words). Example: 'Smishing Chat Role-Play' or 'Practice the Text'.",
    "subtitle": "Brief role-play flow (max 12 words). Example: 'Text it out, verify, end safely'.",
    "senderName": "Fictional sender display name aligned with the scenario and ${analysis.language} locale (no real people). Can include role/title if relevant to ${analysis.topic} context.",
    "senderNumber": "Fictional sender phone number in ${analysis.language} locale format (safe, non-realistic, no real numbers). Examples: '+90 555 234 5678' for Turkish (tr), '+44 844 123 4567' for English (en). Use obviously fake prefixes.",
    "prompt": "${rolePlayPromptInstruction}",
    "firstMessage": "${firstMessageInstruction}",
    "callToActionText": "Localize 'Start Chat Practice' into ${analysis.language}. Output the localized text directly.",
    "successCallToActionText": "Localize 'Continue' into ${analysis.language}. Output the localized text directly.",
    "key_message": [
      "Step 1 - Role-play the text",
      "Step 2 - Verify and refuse risky requests",
      "Step 3 - End the chat safely"
    ],
    "texts": {
      "privacyNotice": "Privacy-safe simulation. Your messages are not stored."
    },
    "statusTexts": {
      "sending": "Sending message...",
      "receiving": "Receiving reply...",
      "ending": "Wrapping up safely...",
      "error": "Something went wrong, please try again",
      "idle": "Tap to start"
    },
    "scientific_basis": "Behavioral Rehearsal: Simulated chats build response confidence under pressure.",
    "scene_type": "smishing_simulation"
  }
}

${outputCriticalBlock}`;
}

