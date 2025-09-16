import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene6Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 6 (survey):
{
  "6": {
    "iconName": "message-circle",
    "title": "Quick Feedback",
    "subtitle": "Help us improve this training",
    "callToActionText": "Submit Feedback (localize to ${analysis.language})",
    "skipCallToActionText": "Skip (localize to ${analysis.language})",
    "key_message": [
      "Your feedback matters",
      "Help us improve",
      "Quick and anonymous"
    ],
    "survey": {
      "questions": [
        {
          "id": "relevance",
          "type": "rating",
          "question": "Write survey question in ${analysis.language} about training relevance for ${analysis.topic}",
          "scale": 5,
          "labels": {
            "low": "Not relevant (localize to ${analysis.language})",
            "high": "Very relevant (localize to ${analysis.language})"
          }
        },
        {
          "id": "difficulty",
          "type": "rating", 
          "question": "Write survey question in ${analysis.language} about training difficulty for ${analysis.topic}",
          "scale": 5,
          "labels": {
            "low": "Too easy (localize to ${analysis.language})",
            "high": "Too difficult (localize to ${analysis.language})"
          }
        },
        {
          "id": "comments",
          "type": "text",
          "question": "Write open-ended question in ${analysis.language} asking for additional feedback about ${analysis.topic} training",
          "placeholder": "Your suggestions... (localize to ${analysis.language})",
          "optional": true
        }
      ]
    },
    "texts": {
      "thankYouTitle": "Thank you! (translate to ${analysis.language})",
      "thankYouMessage": "Your feedback helps us create better training. (translate to ${analysis.language})",
      "submitText": "Submit (translate to ${analysis.language})",
      "submittingText": "Submitting... (translate to ${analysis.language})",
      "submittedText": "Submitted (translate to ${analysis.language})",
      "skipText": "Skip (translate to ${analysis.language})",
      "requiredText": "Required (translate to ${analysis.language})",
      "optionalText": "Optional (translate to ${analysis.language})"
    },
    "ariaTexts": {
      "mainLabel": "Feedback survey",
      "questionLabel": "Survey question",
      "ratingLabel": "Rating scale",
      "textInputLabel": "Text input field"
    },
    "scene_type": "survey"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete survey questions.
2. TOPIC CONSISTENCY: Keep all survey content focused strictly on ${analysis.topic}.`;
}