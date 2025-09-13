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
    "subtitle": "Your action plan to stay safe from ${analysis.topic.toLowerCase()}",
    "callToActionText": "Translate 'Continue' to ${analysis.language}",
    "texts": {
      "title": "Action Plan",
      "subtitle": "Next time you encounter ${analysis.topic.toLowerCase()} situation, you will do this:",
      "actionsTitle": "Your next steps"
    },
    "key_message": [
      "Write context-appropriate action #1 in ${analysis.language} for ${analysis.topic} - MAXIMUM 5 words (Security topics: 'Recognise suspicious emails', Writing topics: 'Write clear subject lines', Password topics: 'Use strong passwords', Data topics: 'Protect sensitive information')",
      "Write context-appropriate action #2 in ${analysis.language} for ${analysis.topic} - MAXIMUM 8 words (Security: 'Don't click suspicious links', Writing: 'Use professional tone and format', Password: 'Don't reuse old passwords', Data: 'Don't share confidential data')",
      "Write context-appropriate action #3 in ${analysis.language} for ${analysis.topic} - MAXIMUM 5 words (Security: 'Report suspicious activity', Writing: 'Proofread before sending', Password: 'Use password manager', Data: 'Follow data policies')"
    ],
    "scene_type": "nudge"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete action steps.
2. TOPIC CONSISTENCY: Keep all nudge content focused strictly on ${analysis.topic}.`;
}