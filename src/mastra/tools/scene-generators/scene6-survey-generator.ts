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
    "title": "Localize 'Share Your Experience' into ${analysis.language}. Output localized text directly, not instructions.",
    "subtitle": "Localize 'Help us improve your training experience' into ${analysis.language}. Output localized text directly, not instructions.",
    "texts": {
      "ratingQuestion": "Return like 'How confident are you in spotting threats?' (max 12 words)",
      "topicsQuestion": "Return like 'Which areas need more practice?' (max 10 words)",
      "feedbackQuestion": "Return like 'What tips helped you most?' (max 8 words)",
      "feedbackPlaceholder": "Localize 'Type your thoughts here…' into ${analysis.language}",
      "submitButton": "Localize 'Submit' into ${analysis.language}",
      "submittingText": "Localize 'Submitting…' into ${analysis.language}",
      "submittedText": "Localize 'Submitted' into ${analysis.language}",
      "ratingRequiredText": "Localize 'Please select a rating before you submit.' into ${analysis.language}",
      "dataSecurityNotice": "Localize 'Your responses are anonymous and protected.' into ${analysis.language}",
      "successTitle": "Localize 'Thank you' into ${analysis.language}",
      "successMessage1": "Localize 'Thanks for your feedback.' into ${analysis.language}",
      "successMessage2": "Return like 'Your feedback helps improve training' (max 8 words)",
      "successMessage3": "Return like 'Awareness improves with your input' (max 8 words)",
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
      "ratingDescription": "Return like 'Rate your confidence level' (max 8 words)",
      "starLabel": "star",
      "topicsDescription": "Return like 'Select areas to improve' (max 8 words)",
      "topicLabel": "Topic checkbox",
      "feedbackDescription": "Text area for additional comments",
      "feedbackLabel": "Feedback field",
      "submitSectionLabel": "Submission section",
      "submittingLabel": "Submitting status",
      "submitLabel": "Submit button",
      "securityNoticeLabel": "Data privacy note"
    },
    "topics": [
      "Write a topic-specific skill (3-5 words) for ${analysis.topic}. Output ONLY the final phrase.",
      "Write another topic-specific skill (3-5 words) for ${analysis.topic}. Output ONLY the final phrase."
    ],
    "scene_type": "survey"
  }
}

CRITICAL:
1. iconName MUST be "list-checks" - NEVER use topic-specific icons
2. title MUST be "Share Your Experience" - NEVER include topic name
3. Questions (ratingQuestion, topicsQuestion, feedbackQuestion) must be generic, applicable to any topic
4. ONLY topics array should be topic-specific (2 skills/areas for ${analysis.topic})
5. Where you see "Return like 'example'" - output text SIMILAR to example, NOT the instruction itself`;
}