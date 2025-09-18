import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene4Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 4 (actionable_content):
{
  "4": {
    "iconName": "mail-check", 
    "title": "Practice ${analysis.topic} Detection",
    "subtitle": "Write short, action-oriented subtitle in ${analysis.language} using simple verbs (example: 'Check emails, spot threats, and report safely', 'Review messages, find risks, stay protected')",
    "callToActionText": "If ${analysis.language} is English, use 'Start Practice'. Otherwise, translate 'Start Practice' to ${analysis.language}",
    "successCallToActionText": "If ${analysis.language} is English, use 'Continue'. Otherwise, translate 'Continue' to ${analysis.language}",
    "key_message": [
      "Write key action 1 in ${analysis.language} specific to ${analysis.topic}",
      "Write key action 2 in ${analysis.language} specific to ${analysis.topic}", 
      "Write key action 3 in ${analysis.language} specific to ${analysis.topic}"
    ],
    "actions": [
      {
        "iconName": "mail",
        "title": "Write action title in ${analysis.language} for ${analysis.topic} step 1",
        "description": "Write description in ${analysis.language} for first ${analysis.topic} action",
        "tip": "Write tip in ${analysis.language} specific to ${analysis.topic} warning signs"
      },
      {
        "iconName": "alert-triangle", 
        "title": "Write action title in ${analysis.language} for ${analysis.topic} step 2",
        "description": "Write description in ${analysis.language} for second ${analysis.topic} action",
        "tip": "Write tip in ${analysis.language} for ${analysis.topic} prevention"
      },
      {
        "iconName": "flag",
        "title": "Write action title in ${analysis.language} for ${analysis.topic} step 3",
        "description": "Write description in ${analysis.language} for third ${analysis.topic} action",
        "tip": "Write tip in ${analysis.language} for ${analysis.topic} reporting process"
      }
    ],
    "tipConfig": {
      "iconName": "info"
    },
    "texts": {
      "mobileHint": "💡 Open the email. If it looks suspicious, press Report.",
      "feedbackCorrect": "✅ Good job — reporting helps protect everyone.",
      "feedbackWrong": "⚠️ Not quite right — this email looks safe. Try again."
    },
    "scene_type": "actionable_content"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete actionable steps.
2. TOPIC CONSISTENCY: Keep all actionable content focused strictly on ${analysis.topic}.`;
}