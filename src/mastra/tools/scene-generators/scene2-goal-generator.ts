import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

        GOAL SCENE:
        - Title: "Your Security Goal" (simple).

        - Subtitle: One short sentence (max 12 words) in ${analysis.language}:  
          "Next time you encounter [${analysis.topic}], you will [safe action]."  
          • Threat/incident → use "pause and report it".  
          • Practice/tool/policy → use "apply the safe behavior" (e.g., create a strong password).  
          • Keep natural and behavior-focused.  

        - Goals: Exactly three, each with title, subtitle, description.  
          • Titles: short natural phrases (no static prefixes).  
          • Subtitles: 2–3 plain words (e.g., "Pause and think").  
          • Descriptions: start with "Helps you..." and give a clear learner benefit.  

        - Key messages: Three short, distinct phrases (max 6–7 words).  
          • One fact, one safe action, one escalation.  
          • Must be realistic, non-repetitive, easy to recall.  

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "2": {
    "iconName": "target",
    "title": "Your ${analysis.topic} Goal",
    "subtitle": "In ${analysis.language}, provide one short sentence: 'Next time you encounter [${analysis.topic}-related situation], you will [specific safe action]' (max 12 words).",
    "callToActionText": "Translate 'Continue' to ${analysis.language}.",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Provide a simple recognition title for ${analysis.topic} in ${analysis.language}.",
        "subtitle": "Pause and think",
        "description": "Provide ONE short 'Helps you...' sentence in ${analysis.language} for recognizing ${analysis.topic} issues (ideally under 12 words)."
      },
      {
        "iconName": "shield-check",
        "title": "Make the Right Decision",
        "subtitle": "Safe action",
        "description": "Provide ONE short 'Helps you...' sentence in ${analysis.language} for safe ${analysis.topic} behavior (ideally under 12 words)."
      },
      {
        "iconName": "flag",
        "title": "Provide a simple escalation title for ${analysis.topic} in ${analysis.language}.",
        "subtitle": "Report button",
        "description": "Provide ONE short 'Helps you...' sentence in ${analysis.language} for ${analysis.topic} escalation (ideally under 12 words)."
      }
    ],
    "key_message": [
      "Provide a 3–5 word ${analysis.topic} recognition behavior in ${analysis.language}.",
      "Provide a 5–7 word ${analysis.topic} safe action in ${analysis.language}.",
      "Provide a 3–5 word ${analysis.topic} escalation behavior in ${analysis.language}."
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