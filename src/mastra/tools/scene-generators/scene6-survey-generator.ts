import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene6Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 6 (survey):
{
  "6": {
    "iconName": "list-checks",
    "title": "Localize 'Share Your Experience' into ${analysis.language}",
    "subtitle": "Localize 'Help us improve your training experience' into ${analysis.language}",
    "texts": {
      "ratingQuestion": "Write short confidence question in ${analysis.language} about ${analysis.topic} (max 12 words)",
      "topicsQuestion": "Write short question in ${analysis.language} about areas needing more practice (max 10 words)",
      "feedbackQuestion": "Write short feedback question in ${analysis.language} (max 8 words)",
      "feedbackPlaceholder": "Localize 'Type your thoughts here…' into ${analysis.language}",
      "submitButton": "Localize 'Submit' into ${analysis.language}",
      "submittingText": "Localize 'Submitting…' into ${analysis.language}",
      "submittedText": "Localize 'Submitted' into ${analysis.language}",
      "ratingRequiredText": "Localize 'Please select a rating before you submit.' into ${analysis.language}",
      "dataSecurityNotice": "Localize 'Your responses are anonymous and protected.' into ${analysis.language}",
      "successTitle": "Localize 'Thank you' into ${analysis.language}",
      "successMessage1": "Localize 'Thanks for your feedback.' into ${analysis.language}",
      "successMessage2": "Write short message in ${analysis.language} about feedback improving training (max 8 words)",
      "successMessage3": "Write short message in ${analysis.language} about security awareness (max 8 words)",
      "thankYouMessage": "Localize 'Stay safe.' into ${analysis.language}"
    },
    "ariaTexts": {
      "mainLabel": "Confidence and feedback form",
      "successDescription": "Form submitted successfully. Thank you for your input.",
      "successRegionLabel": "Success message",
      "successIconLabel": "Checkmark icon",
      "formDescription": "Confidence rating, topics to improve and a free text area.",
      "headerLabel": "Form title",
      "formContentDescription": "Star rating, topic selections and text entry",
      "ratingDescription": "Write short rating description in ${analysis.language} about confidence (max 8 words)",
      "starLabel": "star",
      "topicsDescription": "Write short topics description in ${analysis.language} (max 8 words)",
      "topicLabel": "Topic checkbox",
      "feedbackDescription": "Text area for additional comments",
      "feedbackLabel": "Feedback field",
      "submitSectionLabel": "Submission section",
      "submittingLabel": "Submitting status",
      "submitLabel": "Submit button",
      "securityNoticeLabel": "Data privacy note"
    },
    "topics": [
      "Write short ${analysis.topic} topic in ${analysis.language} (max 6 words)",
      "Write short ${analysis.topic} topic in ${analysis.language} (max 6 words)"
    ],
    "scene_type": "survey"
  }
}

CRITICAL:
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete survey content.
2. TOPIC CONSISTENCY: Keep all survey content focused strictly on ${analysis.topic}.`;
}