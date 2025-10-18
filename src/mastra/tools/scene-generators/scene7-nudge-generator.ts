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
    "subtitle": "Return like 'Your action plan to stay safe' (max 8 words)",
    "callToActionText": "Localize 'Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "texts": {
      "title": "Localize 'Action Plan' into ${analysis.language}. Output localized text directly, not instructions.",
      "subtitle": "Return like 'Next time you face this situation' (max 10 words)",
      "actionsTitle": "Localize 'Your next steps' into ${analysis.language}. Output localized text directly, not instructions."
    },
    "key_message": [
      "Return like 'Check sender address carefully' (max 6 words) for ${analysis.topic}",
      "Return like 'Verify through official channels' (max 8 words) for ${analysis.topic}",
      "Return like 'Report if suspicious' (max 5 words) for ${analysis.topic}"
    ],
    "scene_type": "nudge"
  }
}

CRITICAL:
1. iconName MUST be "repeat" - NEVER use topic-specific icons
2. subtitle and texts.subtitle must be generic - NEVER include topic name
3. texts.title MUST be "Action Plan" - NEVER include topic name
4. key_message MUST be topic-specific actionable steps (3 concrete actions for ${analysis.topic})
5. Where you see "Return like 'example'" - output text SIMILAR to example, NOT the instruction itself`;
}