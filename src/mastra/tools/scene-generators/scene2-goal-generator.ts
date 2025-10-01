  import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

        GOAL SCENE:
- Title: "Your Security Goal" (simple).

- Subtitle: Write implementation intention for ${analysis.topic}: "Next time you [specific situation], you will [specific action]"  

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
    "subtitle": "Next time you encounter ${analysis.topic} risks, you will pause and take safe action",
    "callToActionText": "Continue",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Spot the Warning Signs",
        "subtitle": "Pause and think",
        "description": "Write conversational 'Helps you...' sentence - like 'when something looks unusual'",
      },
      {
        "iconName": "shield-check",
        "title": "Verify Before Acting",
        "subtitle": "Safe action",
        "description": "Write natural 'Helps you...' - like 'avoid risky links and verify before opening'",
      },
      {
        "iconName": "flag",
        "title": "Report Suspicious Activity",
        "subtitle": "Report button",
        "description": "Write simple 'Helps you...' - like 'use the report button so security can act quickly'",
      }
    ],
    "key_message": [
      "Stay alert to warning signs",
      "Verify through official channels",
      "Report concerns immediately"
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