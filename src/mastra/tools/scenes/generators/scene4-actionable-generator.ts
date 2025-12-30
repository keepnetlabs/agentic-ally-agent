import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';

export function generateScene4Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

ACTIONABLE SCENE (Always inbox-based):
CRITICAL: This scene is ALWAYS an email inbox simulation, regardless of topic.
- Even for phone/voice topics (vishing, smishing), this scene uses EMAIL format where emails contain callback/voicemail requests
- Even for physical topics (tailgating, USB), this scene uses EMAIL format where emails discuss these scenarios
- iconName: MUST always be "mail-check" - NEVER use "phone", "message-square", "usb", or other icons
- Title: Topic-aware, action-oriented practice title. INBOX FORMAT ALWAYS. Examples: Phishing→"Practice Phishing Detection" | Ransomware→"Spot Ransomware Emails" | Vishing→"Practice Email Callback Scams" | Security Protocols→"Practice Remote Work Policy Review". Pattern: THREATS/TOOLS→"[Practice/Spot/Check] [Topic] [Detection/Emails]" | PROCESS→"[Practice/Review] [Topic] [Policy/Compliance]". NEVER generic like "Spot Suspicious Emails"

- Subtitle: 3 verbs + objects for email checking (max 12 words)
  • THREATS/TOOLS: "Check [sender/content], spot [threats/risks], report/verify safely"
  • PROCESS: "Review [practices], identify [gaps], verify [compliance]"
  • Production examples: "Check emails, spot threats, and report safely" | "Review practices, identify risks, verify compliance"

- Actions: 3 cards (email inspection steps) - PRODUCTION QUALITY
  • Titles: 3-5 words | Descriptions: max 15 words showing what to check | Tips: max 12 words with specific warning signs
  • Action 1: Check sender/source. Tip should be specific (e.g., 'Mismatched URLs and urgent requests are warning signs')
  • Action 2: Spot threats/warnings. Tip should be protective (e.g., 'Avoid clicking links or opening attachments')
  • Action 3: Report/verify. Tip should show outcome (e.g., 'Use Report button so IT can investigate')
  • Action 1 iconName: MUST be "mail" (checking sender)
  • Action 2 iconName: MUST be "alert-triangle" (spotting threats)
  • Action 3 iconName: MUST be "flag" (reporting)

{
  "4": {
    "iconName": "mail-check",
    "title": "Topic-aware action-oriented title. Examples: Phishing→'Practice Phishing Detection' | Ransomware→'Spot Ransomware Emails' | Vishing→'Practice Email Callback Scams'. INBOX FORMAT (emails always, not phone/calls medium).",
    "subtitle": "3 ACTION VERBS showing what learner does (max 12 words). Pattern: 'Check [sender/content], spot [threats/risks], report/verify safely' - all ACTION-focused. Examples: Phishing→'Check emails, spot threats, and report safely' | Ransomware→'Review emails, identify malware signs, report now' | Vishing→'Check senders, spot callback requests, report immediately'. NOT observation: avoid 'understand', 'learn', 'recognize' as main verbs - use CHECK, SPOT, REPORT, PRESS.",
    "callToActionText": "Localize 'Start Practice' into ${analysis.language}. Output the localized text directly, not instructions.",
    "successCallToActionText": "Localize 'Continue' into ${analysis.language}. Output the localized text directly, not instructions.",
    "key_message": [
      "Step 1 - Check action (3-5 words): 'Check the email' or 'Review sender source' (concrete, not conditional)",
      "Step 2 - Protective directive (3-5 words): 'Don't click links' or 'Spot warning signs' (include DON'T where relevant)",
      "Step 3 - Action outcome (3-5 words): 'Press Report' or 'Report if suspicious' (action-focused)"
    ],
    "actions": [
      {
        "iconName": "mail",
        "title": "Action 1 title (3-5 words): 'Check the Sender' or 'Review Email Source'. Concrete step for examining email.",
        "description": "What to check (max 15 words): Explain what learner should examine (sender, subject, content). Example: 'Review the sender, subject and content before you act.'",
        "tip": "Specific warning signs (max 12 words): Concrete indicators to watch for. Example: 'Mismatched URLs and urgent requests are common warning signs.'"
      },
      {
        "iconName": "alert-triangle",
        "title": "Action 2 title (3-5 words): 'Spot Warning Signs' or 'Identify Threats'. Focus on recognizing suspicious elements.",
        "description": "Protective action (max 15 words): Explain what to avoid/protect against. Example: 'Avoid clicking suspicious links or opening unknown attachments.'",
        "tip": "Protective guidance (max 12 words): Concrete protection advice. Example: 'Hover over links to preview where they go.'"
      },
      {
        "iconName": "flag",
        "title": "Action 3 title (3-5 words): 'Report It Safely' or 'Report Suspicious Emails'. Focus on taking action.",
        "description": "How to report (max 15 words): Explain the reporting mechanism and benefit. Example: 'If it looks suspicious, use the Report button so IT can investigate.'",
        "tip": "Outcome/impact (max 12 words): Show why reporting matters. Example: 'Use Report Phishing in Outlook or Gmail for quick reporting.'"
      }
    ],
    "tipConfig": {
      "iconName": "info"
    },
    "texts": {
      "mobileHint": "Action hint (max 12 words with 💡): 'Open each email. If it looks suspicious, press Report.' Shows learner what to do.",
      "feedbackCorrect": "Success message (max 12 words with ✅): 'Good job — reporting helps protect everyone' or 'Correct — that email was suspicious.' Emphasize team impact.",
      "feedbackWrong": "Error message (max 15 words with ⚠️): 'Not quite right — this email looks safe. Try again' or 'Think again — check the sender carefully.' Guide to retry."
    },
    "scientific_basis": "Procedural Knowledge: Step-by-step guidance builds competency.",
    "scene_type": "actionable_content"
  }
}

CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any
2. Where you see "Return ... like '[example]'" - output text SIMILAR to the example, NOT the instruction itself
3. Match examples style but adapt to ${analysis.topic} context (emails about the topic, NOT the topic medium itself)
4. All text in ${analysis.language}
5. NO placeholders, NO "Return...", NO "Other examples" - just the final text
6. INBOX FORMAT ONLY (CRITICAL):
   - iconName MUST ALWAYS be "mail-check"
   - Title MUST be topic-aware action-oriented, NOT generic (e.g., "Practice Phishing Detection" not "Spot Suspicious Emails")
   - For vishing/smishing/phone topics: Title/content still about EMAILS (e.g., "Practice Email Callback Scams"), NOT phone calls
   - Learner always checks inbox, never makes calls`;
}