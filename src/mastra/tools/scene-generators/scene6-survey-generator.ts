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
    "callToActionText": "Translate 'Submit Feedback' to ${analysis.language}",
    "skipCallToActionText": "Translate 'Skip' to ${analysis.language}",
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
            "low": "Translate 'Not relevant' to ${analysis.language}",
            "high": "Translate 'Very relevant' to ${analysis.language}"
          }
        },
        {
          "id": "difficulty",
          "type": "rating", 
          "question": "Write survey question in ${analysis.language} about training difficulty for ${analysis.topic}",
          "scale": 5,
          "labels": {
            "low": "Translate 'Too easy' to ${analysis.language}",
            "high": "Translate 'Too difficult' to ${analysis.language}"
          }
        },
        {
          "id": "comments",
          "type": "text",
          "question": "Write open-ended question in ${analysis.language} asking for additional feedback about ${analysis.topic} training",
          "placeholder": "Translate 'Your suggestions...' to ${analysis.language}",
          "optional": true
        }
      ]
    },
    "texts": {
      "thankYouTitle": "Translate 'Thank you!' to ${analysis.language}",
      "thankYouMessage": "Translate 'Your feedback helps us create better training.' to ${analysis.language}",
      "submitText": "Translate 'Submit' to ${analysis.language}",
      "submittingText": "Translate 'Submitting...' to ${analysis.language}",
      "submittedText": "Translate 'Submitted' to ${analysis.language}",
      "skipText": "Translate 'Skip' to ${analysis.language}",
      "requiredText": "Translate 'Required' to ${analysis.language}",
      "optionalText": "Translate 'Optional' to ${analysis.language}"
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