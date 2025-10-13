  import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

        GOAL SCENE:
- Title: "Your Security Goal" (simple).

- Subtitle: Implementation intention using "Next time you [situation], you will [action]"
  • Match topic: ${analysis.topic}
  • Output ONLY the final sentence

- Goals: Exactly three (recognition, action, reporting)
  • Titles: 3-5 words, action verb + object
  • Descriptions: "Helps you..." max 10-12 words

- Key messages: Three phrases (recognition, prevention, escalation)
  • Max 5-7 words each
  • Must match ${analysis.topic}

- Duration: 20 seconds (goal scene standard)  

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "2": {
    "iconName": "target",
    "title": "Your Security Goal",
    "subtitle": "Create sentence: 'Next time you [situation for ${analysis.topic}], you will [action]'. Examples: phishing→'Next time you see a suspicious email, you will pause and report it' | impersonation→'Next time you receive a suspicious authority request, you will pause and verify it'. Return ONLY the sentence.",
    "callToActionText": "Continue",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Recognition title for ${analysis.topic} (3-5 words). Pattern: '[Verb] [Object]'. Examples: phishing→'Recognise Suspicious Emails', impersonation→'Recognise Authority Manipulation', malware→'Spot Dangerous Files'.",
        "subtitle": "Pause and think",
        "description": "Helps you [benefit] (max 10 words). Example: Helps you pause and think when something looks unusual.",
      },
      {
        "iconName": "shield-check",
        "title": "Action title for ${analysis.topic} (3-5 words). Examples: phishing→'Make the Right Decision', impersonation→'Verify Before Acting', password→'Choose Strong Passwords'.",
        "subtitle": "Safe action",
        "description": "Helps you [action] (max 12 words). Example: Helps you verify requests through official channels.",
      },
      {
        "iconName": "flag",
        "title": "Reporting title (3-4 words). Examples: 'Report Safely', 'Report Impostor Attempts', 'Alert Security Team'.",
        "subtitle": "Report button",
        "description": "Helps you [escalation] (max 12 words). MUST mention security team. Example: Helps you report threats so security team can act quickly.",
      }
    ],
    "key_message": [
      "Recognition message for ${analysis.topic} (max 6 words). Pattern: 'Recognise a [threat]'. Examples: phishing→'Recognise a suspicious email', impersonation→'Recognise authority manipulation', deepfake→'Recognise a suspicious video'.",
      "Prevention message for ${analysis.topic} (max 7 words). Pattern: 'Don't [risky action]'. Examples: phishing→'Don't click links or open unknown attachments', impersonation→'Don't trust urgent authority requests', password→'Never share passwords with anyone'.",
      "Escalation message (max 5 words). Examples: 'Use the report button', 'Report impostor attempts', 'Alert security immediately'."
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