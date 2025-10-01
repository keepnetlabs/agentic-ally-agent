  import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

        GOAL SCENE:
- Title: "Your Security Goal" (simple).

- Subtitle: MUST use "Next time you [situation], you will [action]" pattern
  • Threats (phishing/malware/social engineering) → "Next time you see a suspicious [email/file/link], you will pause and [report it/verify it/check it]"
  • Security tools (MFA/passwords/encryption) → "Next time you [create/set up/use] [X], you will [enable/use/apply] [Y]"
  • Policies/practices (backup/privacy/compliance) → "Next time you [handle/share/store] [data/files], you will [follow/apply/use] [practice]"
  • Action MUST be concrete verb, NEVER generic phrases  

- Goals: Exactly three, each with title, subtitle, description.  
  • Titles: short natural phrases (no static prefixes).  
  • Subtitles: 2–3 plain words (e.g., "Pause and think").  
  • Descriptions: start with "Helps you..." and describe a concrete learner benefit.  

- Key messages: Three short, distinct phrases (max 6–7 words).  
  • One fact, one safe action, one escalation.  
  • Must be realistic, non-repetitive, and easy to recall.  

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "2": {
    "iconName": "target",
    "title": "Your Security Goal",
    "subtitle": "Use pattern 'Next time you [situation], you will [action]'. MUST match ${analysis.topic}. For threats (phishing/deepfake/malware/ransomware)→'see a suspicious [email/video/file/attachment based on topic]', Physical threats (USB/device/removable media)→'encounter/find [unfamiliar/unknown] [USB/device/media]', Tools (password/MFA)→'create/set up [password/account]', Practices (backup/recovery)→'handle/verify [backup/data]'. Choose action: Threats→'pause and [report/verify/check] it', Physical threats→'check/verify before [using/connecting]', Tools→'enable/use [feature]', Practices→'verify/test [it]'. Examples: phishing→'Next time you see a suspicious email, you will pause and report it', USB→'Next time you encounter an unfamiliar USB, you will check before using it', backup→'Next time you verify a backup, you will test the restoration process'. Output ONLY the final sentence for ${analysis.topic}.",
    "callToActionText": "Continue",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Write title (3-5 words) using pattern: '[Action Verb] [Specific Object]'. MUST use correct terminology for ${analysis.topic}. Examples: Phishing→'Recognise Suspicious Emails', Malware→'Spot Dangerous Files', Backup/Ransomware→'Identify Compromised Backups' or 'Recognise Backup Threats' (NOT 'Ransomware Backups'). Bad: 'Spot the Warning Signs', 'Be Aware of Risks'. Use specific nouns with proper grammar.",
        "subtitle": "Pause and think",
        "description": "Format: 'Helps you [benefit]'. Total max 10 words including 'Helps you'. Keep simple and conversational. Good: 'Helps you pause and think when something looks unusual'. Bad: 'Helps you recognize telltale indicators of sophisticated attacks'.",
      },
      {
        "iconName": "shield-check",
        "title": "Write title (3-5 words) for decision/action step. MUST use correct terminology for ${analysis.topic}. Examples: Password→'Choose Strong Passwords', Backup/Ransomware→'Maintain Secure Backups' or 'Protect Backup Data' (NOT 'Protect Ransomware Backups'). Bad: 'Verify Before Acting', 'Take Safe Action'. Use natural language.",
        "subtitle": "Safe action",
        "description": "Format: 'Helps you [action]'. Total max 12 words including 'Helps you'. Be specific but simple. Good: 'Helps you avoid risky links and verify attachments before opening'. Bad: 'Helps you meticulously examine URL structures and sender authentication protocols'.",
      },
      {
        "iconName": "flag",
        "title": "Write title (3-4 words) for reporting/escalation step. MUST use correct terminology. Examples: General→'Report Safely', 'Alert Security Team', Backup→'Report Backup Issues' (NOT 'Report Backups Incident'). Bad: 'Report Suspicious Activity', 'Escalate Concerns'. Be concise with natural grammar.",
        "subtitle": "Report button",
        "description": "Format: 'Helps you [escalation]'. Total max 12 words including 'Helps you'. Focus on tool/team. Good: 'Helps you use the Report button so the security team can act quickly'. Bad: 'Helps you leverage enterprise-grade incident reporting workflows'.",
      }
    ],
    "key_message": [
      "Write recognition message for ${analysis.topic} (max 6 words). Use pattern 'Recognise a [threat]' or 'Spot [danger]'. Examples: Phishing→'Recognise a suspicious email', Malware→'Spot dangerous downloads', Deepfake→'Recognise a suspicious video'. Match threat type to ${analysis.topic}. Output ONLY the message, no labels.",
      "Write prevention message for ${analysis.topic} (max 7 words). Use pattern 'Don't [risky action related to topic]'. Examples: Phishing→'Don't click links or open unknown attachments', Password→'Never share passwords with anyone', Deepfake→'Don't share unverified media', Ransomware→'Don't open suspicious attachments'. Match action to ${analysis.topic}. Output ONLY the message, no labels.",
      "Write escalation message (max 5 words). Use pattern 'Use the [tool]' or 'Report [action]'. Example: 'Use the report button', 'Alert security immediately'. Generic for all topics. Output ONLY the message, no labels."
    ],
    "texts": {},
    "scene_type": "goal",
    "points": 5,
    "duration_seconds": ${Math.round(microlearning.scenes[1]?.metadata.duration_seconds || 20)},
    "hasAchievementNotification": false,
    "scientific_basis": "Goal – Goal Activation + Relevance: Implementation intention language and goal priming. 'Next time X happens, you will Y' format bridges intention–action gap.",
    "icon": {
      "sceneIconName": "target"
    }
  }
}
`;
}