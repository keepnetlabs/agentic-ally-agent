import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';

export function generateScene4VishingPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

VISHING SIMULATION SCENE (Voice Call Practice):
PURPOSE: Simulate a realistic phone-call scam and teach the learner to respond safely.
FORMAT: Step-by-step call handling actions with clear decision points.

CRITICAL RULES:
1. This scene is ALWAYS voice-call focused (no email/inbox language)
2. Use realistic caller impersonation patterns (bank, IT, manager, vendor)
3. Emphasize verification and refusal steps
4. All text in ${analysis.language}

{
  "4": {
    "iconName": "phone",
    "title": "Role-play focused title (max 6 words). Example: 'Vishing Call Role-Play' or 'Practice the Call'.",
    "subtitle": "Brief role-play flow (max 12 words). Example: 'Act it out, verify, end safely'.",
    "callerName": "Fictional caller display name aligned with the scenario (no real people).",
    "callerNumber": "Fictional caller phone number (safe, non-realistic, no real numbers).",
    "prompt": "System prompt (final text) for the voice-call simulation agent. Write 6-9 short sentences total. MUST include these rules in natural language: This is a security-training role-play, not a real attempt; never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or any personal/company secrets; use mild urgency and pretext without threats; if the user refuses/calls out vishing/asks to verify, end politely and give a short debrief; if the user starts to comply, continue briefly (1-2 turns max) then end and debrief; always end with a 1-2 sentence summary of red flags and correct next steps. After the rules, add a Scenario section with 4 short lines using this exact format: 1) Persona: ... 2) Pretext: ... 3) FictionalRequest: ... 4) UrgencyCue: ... Keep everything fictional and safe (made-up names, fake identifiers, non-realistic numbers). Avoid these words: account, transfer, wire, beneficiary, funds.",
    "firstMessage": "First spoken line (final text, not instructions). 1-2 sentences, realistic caller intro aligned with ${analysis.topic} and the persona. Include a reason for the call and mild urgency, but keep details fictional and safe; do not request real data.",
    "callToActionText": "Localize 'Start Call Practice' into ${analysis.language}. Output the localized text directly.",
    "successCallToActionText": "Localize 'Continue' into ${analysis.language}. Output the localized text directly.",
    "key_message": [
      "Step 1 - Role-play the call",
      "Step 2 - Verify and refuse risky requests",
      "Step 3 - End the call safely"
    ],
    "texts": {
      "mobileHint": "Action hint (max 12 words with 💡): role-play, verify, refuse, end safely.",
      "feedbackCorrect": "Success message (max 12 words with ✅): safe handling; brief debrief will follow.",
      "feedbackWrong": "Error message (max 15 words with ⚠️): verify the caller, refuse, retry."
    },
    "scientific_basis": "Behavioral Rehearsal: Simulated calls build response confidence under pressure.",
    "scene_type": "vishing_simulation"
  }
}

CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any
2. Adapt to ${analysis.topic} context (voice-call scenario, no inbox)
3. All text in ${analysis.language}
4. No placeholders, no instructional text, return final content only`;
}
