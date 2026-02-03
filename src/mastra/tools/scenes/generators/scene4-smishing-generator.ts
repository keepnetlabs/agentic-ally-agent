import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';

export function generateScene4SmishingPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

SMISHING SIMULATION SCENE (SMS Chat Role-Play):
PURPOSE: Simulate a realistic SMS-based scam and teach the learner to respond safely.
FORMAT: Step-by-step message thread handling with clear decision points.

CRITICAL RULES:
1. This scene is ALWAYS SMS/chat focused (no email/inbox language)
2. Use realistic sender impersonation patterns (bank, IT, manager, vendor)
3. Emphasize verification and refusal steps
4. Start with one or two short messages that sound conversational
5. Always end with a question that invites a reply
6. Keep SMS tone: short, conversational, no markdown
5. All text in ${analysis.language}

{
  "4": {
    "iconName": "message-square",
    "title": "Role-play focused title (max 6 words). Example: 'Smishing Chat Role-Play' or 'Practice the Text'.",
    "subtitle": "Brief role-play flow (max 12 words). Example: 'Text it out, verify, end safely'.",
    "prompt": "System prompt (final text) for the SMS role-play agent. Write 6-9 short sentences total. MUST include these rules in natural language: This is a security-training role-play, not a real attempt; never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or any personal/company secrets; use mild urgency and pretext without threats; keep replies short like SMS; start with one or two short messages that sound conversational; always end each reply with a short question that expects a user response; if the user shares any code, address, or says they clicked/opened a link, stop the role-play and give a brief safety debrief; if the user refuses/calls out smishing/asks to verify, end politely and give a short debrief; if the user starts to comply, continue briefly (1-2 turns max) then end and debrief; always end with a 1-2 sentence summary of red flags and correct next steps. After the rules, add a Scenario section with 4 short lines using this exact format: 1) Persona: ... 2) Pretext: ... 3) FictionalRequest: ... 4) UrgencyCue: ... Keep everything fictional and safe (made-up names, fake identifiers, non-realistic numbers). Avoid these words: account, transfer, wire, beneficiary, funds.",
    "firstMessage": "First SMS line (final text, not instructions). 1-2 sentences, realistic intro aligned with ${analysis.topic} and the persona. Include a reason for the message and mild urgency, but keep details fictional and safe; do not request real data. Keep it SMS-style, short. End with a short question.",
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
      "sending": "Sending message…",
      "receiving": "Receiving reply…",
      "ending": "Wrapping up safely…",
      "error": "Something went wrong, please try again",
      "idle": "Tap to start"
    },
    "scientific_basis": "Behavioral Rehearsal: Simulated chats build response confidence under pressure.",
    "scene_type": "smishing_simulation"
  }
}

CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any
2. Adapt to ${analysis.topic} context (SMS scenario, no inbox)
3. All text in ${analysis.language}
4. Start with one or two short messages that sound conversational
5. Always end with a question that invites a reply
6. Keep SMS tone: short, conversational, no markdown
7. No placeholders, no instructional text, return final content only`;
}
