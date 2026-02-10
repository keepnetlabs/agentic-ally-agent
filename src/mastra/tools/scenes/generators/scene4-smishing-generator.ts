import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';
import { resolveSmishingChannel, buildSmishingChannelPromptRules } from '../../../utils/smishing-channel';

function buildContentRulesBlock(
  analysis: PromptAnalysis,
  channelFocusRule: string,
  channelToneRule: string,
  channelInteractionRule: string
): string {
  return `CONTENT RULES (for JSON generation only - agent behavior rules are applied separately):
1. ${channelFocusRule}
2. ${channelToneRule}
3. ${channelInteractionRule}
4. Use realistic sender impersonation patterns (bank, IT, manager, vendor)
5. Keep scenario content anchored to ${analysis.topic}
6. All generated text in ${analysis.language}
7. No placeholders or instructional text in output values - return final content only`;
}

function buildRolePlayPromptInstruction(
  analysis: PromptAnalysis,
  channelPromptLabel: string
): string {
  return `Generate ONLY a Scenario section for a ${channelPromptLabel} security-training role-play about ${analysis.topic}. Use this exact format with 4 short lines:
1) Persona: [Fictional sender name and role aligned with ${analysis.topic}]
2) Pretext: [The believable reason for contacting the target]
3) FictionalRequest: [What the scammer wants the target to do]
4) UrgencyCue: [The time-pressure or emotional trigger used]
Keep everything fictional and safe (made-up names, fake identifiers, non-realistic numbers). Avoid these words: account, transfer, wire, beneficiary, funds. All text in ${analysis.language}.`;
}

function buildFirstMessageInstruction(
  analysis: PromptAnalysis,
  channelFirstMessageLabel: string,
  channelPromptLabel: string
): string {
  return `${channelFirstMessageLabel} (final text, not instructions). 1-2 sentences, realistic intro aligned with ${analysis.topic} and the persona. CRITICAL: Sender must introduce themselves by the exact name from the senderName field above. Include a reason for the message and mild urgency, but keep details fictional and safe; do not request real data. If you reference a link/file/code/attachment, include that fictional artifact in the same message; otherwise do not imply 'below/attached' and ask permission to send details in the next message. Keep it ${channelPromptLabel}-style, short. End with a short question.`;
}

function buildOutputRulesBlock(
  channelLabel: string
): string {
  return `OUTPUT RULES:
1. Use EXACTLY these JSON keys - do not add or remove any (channel is required)
2. Return valid JSON only - no markdown, no extra text
3. Adapt all content to ${channelLabel} scenario context (no inbox references)`;
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
  const contentRulesBlock = buildContentRulesBlock(analysis, channelFocusRule, channelToneRule, channelInteractionRule);
  const rolePlayPromptInstruction = buildRolePlayPromptInstruction(analysis, channelPromptLabel);
  const firstMessageInstruction = buildFirstMessageInstruction(analysis, channelFirstMessageLabel, channelPromptLabel);
  const outputRulesBlock = buildOutputRulesBlock(channelLabel);

  return `${contextData}

SMISHING SIMULATION SCENE (${channelLabel} Chat Role-Play):
PURPOSE: Simulate a realistic ${channelLabel}-based scam and teach the learner to respond safely.
FORMAT: Step-by-step message thread handling with clear decision points.

${contentRulesBlock}

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

${outputRulesBlock}`;
}

