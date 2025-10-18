import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene4Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

ACTIONABLE SCENE (Always inbox-based):
CRITICAL: This scene is ALWAYS an email inbox simulation, regardless of topic.
- Even for phone/voice topics (vishing, smishing), this scene uses EMAIL format where emails contain callback/voicemail requests
- Even for physical topics (tailgating, USB), this scene uses EMAIL format where emails discuss these scenarios
- iconName: MUST always be "mail-check" - NEVER use "phone", "message-square", "usb", or other icons
- Title: MUST always be "Spot Suspicious Emails" (3 words) - NEVER change to "calls", "messages", "devices"

- Subtitle: 3 verbs + objects for email checking (max 12 words)
  • Pattern: "Check [sender/content], spot [threats/risks], report/verify safely"
  • Examples: 'Check sender, spot threats, report safely' | 'Review emails, identify risks, take action'
  • For vishing/smishing: Still email-based → 'Check sender, spot callback scams, report safely'

- Key messages: 3 email-checking actions (3-5 words each)
  • Step 1: Check sender/source | Step 2: Spot warning signs | Step 3: Report or verify

- Actions: 3 cards (email inspection steps)
  • Titles: 3-5 words | Descriptions: max 15 words | Tips: max 12 words
  • Action 1 iconName: MUST be "mail" (checking sender)
  • Action 2 iconName: MUST be "alert-triangle" (spotting threats)
  • Action 3 iconName: MUST be "flag" (reporting)

{
  "4": {
    "iconName": "mail-check",
    "title": "Spot Suspicious Emails",
    "subtitle": "3 verbs + objects for email checking (max 12 words). Pattern: 'Check [sender/content], spot [threats/risks], report/verify safely'. Match ${analysis.topic} context naturally. Examples: phishing→'Check sender, spot threats, report safely' | credentials→'Check sender, spot credential requests, verify safely' | password→'Check emails, spot password resets, verify requests' | incident response→'Check emails, spot incidents, follow playbook'.",
    "callToActionText": "Localize 'Start Practice' into ${analysis.language}. Output the localized text directly, not instructions.",
    "successCallToActionText": "Localize 'Continue' into ${analysis.language}. Output the localized text directly, not instructions.",
    "key_message": [
      "Return phrase like 'Check sender address' (3-5 words) for checking sender. Other examples: 'Review email source' | 'Verify sender domain'.",
      "Return phrase like 'Look for red flags' (3-5 words) for spotting threats. Other examples: 'Spot warning signs' | 'Identify suspicious content'.",
      "Return phrase like 'Report if suspicious' (3-5 words) for taking action. Other examples: 'Verify before acting' | 'Use report button'."
    ],
    "actions": [
      {
        "iconName": "mail",
        "title": "Return title like 'Check the Sender' (3-5 words) for checking sender. Other examples: 'Review Email Source' | 'Verify Sender Domain'.",
        "description": "Return description like 'Look at who sent the message and check if the address looks real' (max 15 words) explaining what to check.",
        "tip": "Return tip like 'Real company emails come from official domains' (max 12 words) as practical advice."
      },
      {
        "iconName": "alert-triangle",
        "title": "Return title like 'Spot Warning Signs' (3-5 words) for spotting threats. Other examples: 'Identify Red Flags' | 'Check Email Content'.",
        "description": "Return description like 'Look for things that seem off like urgent threats or strange requests' (max 15 words) explaining what to look for.",
        "tip": "Return tip like 'If it feels wrong, it probably is' (max 12 words) as practical advice."
      },
      {
        "iconName": "flag",
        "title": "Return title like 'Report It Safely' (3-5 words) for taking action. Other examples: 'Verify Before Acting' | 'Use Report Button'.",
        "description": "Return description like 'Use the report button to let the security team know about suspicious emails' (max 15 words) explaining what to do.",
        "tip": "Return tip like 'Reporting helps protect everyone on the team' (max 12 words) as practical advice."
      }
    ],
    "tipConfig": {
      "iconName": "info"
    },
    "texts": {
      "mobileHint": "Return hint like '💡 Open each email. If it looks suspicious, press Report.' (max 12 words starting with 💡 emoji).",
      "feedbackCorrect": "Return success message like '✅ Good job — reporting helps protect everyone' (max 12 words starting with ✅). Other example: '✅ Correct — that email was suspicious'.",
      "feedbackWrong": "Return error message like '⚠️ Not quite right — this email looks safe. Try again' (max 15 words starting with ⚠️). Other example: '⚠️ Think again — check the sender carefully'."
    },
    "scene_type": "actionable_content"
  }
}

CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any
2. Where you see "Return ... like '[example]'" - output text SIMILAR to the example, NOT the instruction itself
3. Match examples style but adapt to ${analysis.topic} context (emails about the topic, NOT the topic medium itself)
4. All text in ${analysis.language}
5. NO placeholders, NO "Return...", NO "Other examples" - just the final text
6. INBOX FORMAT ONLY: iconName MUST be "mail-check", title MUST be "Spot Suspicious Emails" - even for vishing, smishing, phone topics`;
}