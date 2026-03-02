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
    "callerName": "Fictional male caller display name aligned with the scenario and ${analysis.language} locale (no real people). Can include role/title if relevant to ${analysis.topic} context.",
    "callerNumber": "Fictional caller phone number in ${analysis.language} locale format (safe, non-realistic, no real numbers). Examples: '+90 555 234 5678' for Turkish (tr), '+44 844 123 4567' for English (en). Use obviously fake prefixes.",
    "prompt": "Generate ONLY a Scenario section for a voice-call security-training role-play about ${analysis.topic}. Use this exact format with 4 short lines: 1) Persona: [Fictional caller name and role aligned with ${analysis.topic}] 2) Pretext: [The believable reason for calling the target] 3) FictionalRequest: [What the scammer wants the target to do] 4) UrgencyCue: [The time-pressure or emotional trigger used] Keep everything fictional and safe (made-up names, fake identifiers, non-realistic numbers). Avoid these words: account, transfer, wire, beneficiary, funds. All text in ${analysis.language}.",
    "firstMessage": "First spoken line (final text, not instructions). 1-2 sentences, realistic caller intro aligned with ${analysis.topic} and the persona. CRITICAL: Caller must introduce themselves by the exact name from the callerName field above. Include a reason for the call and mild urgency, but keep details fictional and safe; do not request real data. End with an open question (e.g., 'Do you have a moment?').",
    "callToActionText": "Localize 'Start Call Practice' into ${analysis.language}. Output the localized text directly.",
    "successCallToActionText": "Localize 'Continue' into ${analysis.language}. Output the localized text directly.",
    "key_message": [
      "Step 1 - Role-play the call",
      "Step 2 - Verify and refuse risky requests",
      "Step 3 - End the call safely"
    ],
    "texts": {
      "privacyNotice": "Privacy-safe simulation. Your voice is not recorded, scripted, or stored."
    },
    "statusTexts": {
      "requesting-mic": "Waiting for microphone access...",
      "connecting": "Connecting the dialer...",
      "live": "Live call in progress",
      "ending": "Wrapping up safely...",
      "error": "Something went wrong, please try again",
      "idle": "Tap to start"
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
