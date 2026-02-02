import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';

export function generateScene7Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  // Use keyTopics to provide more specific context for dynamic nudge generation
  const keyTopicsHint = analysis.keyTopics?.slice(0, 3).join(', ') || 'general security practice';

  return `${contextData}

SCENE 7 - NUDGE (Implementation Intention Reminder):
Topic: ${analysis.topic} | Key Topics: ${keyTopicsHint} | Category: ${analysis.category} | Language: ${analysis.language}

⚠️ JSON OUTPUT RULES (CRITICAL):
- Return ONLY key "7" (NEVER "1", "2", etc.)
- scene_type MUST be "nudge" (NEVER other types)
- Do NOT add extra fields or change field names
- Output ONLY valid JSON

=== PRODUCTION EXAMPLE: Phishing (THREAT Category)

Phishing Example:
Subtitle: "Next time a suspicious email appears, you will do this:"
Key Messages:
1. "Recognise a suspicious email"
2. "Don't click links or open unknown attachments"
3. "Use the report button"

ADAPT THIS EXACT PATTERN TO ${analysis.topic}:

SUBTITLE PATTERN FOR ${analysis.topic}:
Structure: "Next time [specific situation in ${analysis.topic}], you will [concrete action]:"
Guidelines:
- Situation: Must be specific, observable trigger for ${analysis.topic}
- Action: Concrete, immediately actionable step(s)
- Format: Question/directive style ending with colon (:)
- Max 15 words in ${analysis.language}

Examples by Category:
- IF THREAT (${analysis.category}): "Next time [suspicious activity], you will [verify/report/isolate]:"
- IF TOOL (${analysis.category}): "Next time [need/opportunity], you will [enable/setup]:"
- IF PROCESS (${analysis.category}): "Next time [situation], you will [follow/apply]:"

Generate for ${analysis.topic}: Apply ${analysis.category} subtitle pattern above. Max 15 words.

=== KEY MESSAGE STRUCTURE (3-Step Dynamic Framework)

STEP 1 - RECOGNIZE (Action verb + topic-specific indicator):
Pattern: [Action verb] [specific indicator for ${analysis.topic}]
Example: "Recognise a suspicious email" (for phishing)
Generate for ${analysis.topic}: Max 6 words in ${analysis.language}

STEP 2 - PROTECT (Category-specific pattern for ${analysis.topic}):

IF category is THREAT:
  Pattern: "Don't [harmful action to avoid]"
  Examples by topic:
  - Phishing: "Don't click links or open unknown attachments"
  - Vishing: "Don't confirm credentials or transfer funds"
  - Quishing: "Don't scan unknown or misplaced QR codes"
  - Ransomware: "Don't pay ransom or execute suspicious files"
  - Deepfake: "Don't trust unusual media without verification"
  Generate for ${analysis.topic}: [DON'T] [specific harmful action]. Max 8 words.

IF category is TOOL:
  Pattern: "[Enable/Use/Setup] [security feature]"
  Example: "Enable MFA before accessing company systems"
  Generate for ${analysis.topic}: [ENABLE/USE/SETUP] [feature from ${keyTopicsHint}]. Max 8 words.

IF category is PROCESS:
  Pattern: "[Follow/Use/Apply] [procedure/framework]"
  Example: "Follow incident response procedures immediately"
  Generate for ${analysis.topic}: [FOLLOW/USE] [procedure]. Max 8 words.

YOUR TOPIC CATEGORY: ${analysis.category}
Apply the ${analysis.category} pattern above for ${analysis.topic}.

STEP 3 - VERIFY (Escalation or confirmation action):
Pattern: [Action verb] [escalation/reporting/verification method]
Example: "Use the report button" (for phishing)
Generate for ${analysis.topic}: Max 5 words in ${analysis.language}

{
  "7": {
    "iconName": "Generate topic-appropriate icon from lucide-react library. Map '${analysis.topic}' to icon: phishing→'mail-warning', vishing→'phone', quishing→'qr-code', ransomware→'alert-circle', deepfake→'video', malware→'shield-alert', social-engineering→'alert-triangle'. If topic doesn't match, use most relevant icon from list. Output ONLY the icon name (e.g., 'phone'), no other text.",
    "subtitle": "Your action plan to stay safe from ${analysis.topic}",
    "callToActionText": "Localize 'Continue' into ${analysis.language}",
    "texts": {
      "title": "Localize 'Action Plan' into ${analysis.language}",
      "subtitle": "Next time [specific situation in ${analysis.topic}], you will [concrete action]: Max 15 words in ${analysis.language}. REFERENCE: Phishing='Next time a suspicious email appears, you will do this:' | Vishing='Next time you receive a suspicious call, you will do this:' | Quishing='Next time you see a suspicious QR code, you will do this:'",
      "actionsTitle": "Localize 'Your next steps' into ${analysis.language}"
    },
    "key_message": [
      "Step 1 - RECOGNIZE for ${analysis.topic}: Generate observable threat indicator specific to topic. REFERENCE EXAMPLES: Phishing='Recognise a suspicious email' | Vishing='Recognise a suspicious caller' | Quishing='Recognise a suspicious QR code' | Ransomware='Recognise encryption or lock signs' | Deepfake='Recognise media quality oddities' | Insider-Threat='Recognise unusual access requests' | Social-Engineering='Recognise manipulation attempts'. FOR ANY TOPIC NOT LISTED: Generate 'Recognise [observable threat indicator specific to ${analysis.topic}]'. Max 6 words in ${analysis.language}",

      "Step 2 - PROTECT for ${analysis.topic} (${analysis.category} category): Generate harmful action to avoid in THREAT category. REFERENCE EXAMPLES: Phishing='Don't click links or open attachments' | Vishing='Don't confirm credentials or transfer funds' | Quishing='Don't scan unknown or misplaced QR codes' | Ransomware='Don't pay ransom or execute suspicious files' | Deepfake='Don't trust unusual media without verification' | Insider-Threat='Don't share credentials or sensitive access' | Supply-Chain='Don't trust unexpected vendor communications'. FOR ANY TOPIC NOT LISTED: Generate 'Don't [specific harmful action for ${analysis.topic}]'. Max 8 words in ${analysis.language}",

      "Step 3 - VERIFY for ${analysis.topic}: Generate appropriate escalation/reporting action specific to topic. REFERENCE EXAMPLES: Phishing='Use the report button' | Vishing='Report to security team' | Quishing='Report to IT team' | Ransomware='Report to IT immediately' | Deepfake='Report suspicious content to security' | Insider-Threat='Report to compliance officer' | Supply-Chain='Alert procurement team'. FOR ANY TOPIC NOT LISTED: Generate '[Action] [appropriate escalation channel for ${analysis.topic}]'. Max 5 words in ${analysis.language}"
    ],
    "scientific_basis": "Implementation Intentions: Concrete plans improve behavior change.",
    "scene_type": "nudge"
  }
}`;
}