import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene7Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 7 (nudge):
{
  "7": {
    "iconName": "repeat",
    "subtitle": "Write short subtitle in ${analysis.language}: 'Your action plan to stay safe from ${analysis.topic}' (max 8 words)",
    "callToActionText": "If ${analysis.language} is English, use 'Continue'. Otherwise, localize ONLY the word 'Continue' into ${analysis.language} - DO NOT add extra words",
    "texts": {
      "title": "Localize 'Action Plan' into ${analysis.language}",
      "subtitle": "Write short subtitle in ${analysis.language} about next time ${analysis.topic} situation (max 10 words)",
      "actionsTitle": "Localize 'Your next steps' into ${analysis.language}"
    },
    "key_message": [
      "Write first actionable step in ${analysis.language} for ${analysis.topic} (maximum 6 words)",
      "Write second actionable step in ${analysis.language} for ${analysis.topic} (maximum 8 words)",
      "Write third actionable step in ${analysis.language} for ${analysis.topic} (maximum 5 words)"
    ],
    "scene_type": "nudge"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete action steps.
2. TOPIC CONSISTENCY: Keep all nudge content focused strictly on ${analysis.topic}.`;
}