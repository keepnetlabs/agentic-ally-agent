import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene7Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  // Use keyTopics to provide more specific context for dynamic nudge generation
  const keyTopicsHint = analysis.keyTopics?.slice(0, 3).join(', ') || 'general security practice';

  return `${baseContext}

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
  Example: "Don't click links or open unknown attachments"
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
    "iconName": "repeat",
    "subtitle": "Your action plan to stay safe from ${analysis.topic}",
    "callToActionText": "Localize 'Continue' into ${analysis.language}",
    "texts": {
      "title": "Localize 'Action Plan' into ${analysis.language}",
      "subtitle": "Adapt phishing example pattern to ${analysis.topic}. Next time [specific situation in ${analysis.topic}], you will [concrete action]: Max 15 words in ${analysis.language}. REFERENCE PHISHING: 'Next time a suspicious email appears, you will do this:'",
      "actionsTitle": "Localize 'Your next steps' into ${analysis.language}"
    },
    "key_message": [
      "Step 1 - RECOGNIZE for ${analysis.topic}: Adapt from phishing example 'Recognise a suspicious email'. Max 6 words in ${analysis.language}",
      "Step 2 - PROTECT for ${analysis.topic} (${analysis.category} category): Adapt from phishing example 'Don't click links or open unknown attachments' using ${analysis.category} pattern. Max 8 words in ${analysis.language}",
      "Step 3 - VERIFY for ${analysis.topic}: Adapt from phishing example 'Use the report button'. Max 5 words in ${analysis.language}"
    ],
    "scene_type": "nudge"
  }
}`;
}