import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildContextData } from '../../utils/prompt-builders/base-context-builder';

export function generateScene6Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

Generate scene 6 (survey):
{
  "6": {
    "iconName": "list-checks",
    "title": "Localize 'Share Your Experience' into ${analysis.language}. Output localized text directly, not instructions.",
    "subtitle": "Localize 'Help us improve your training experience' into ${analysis.language}. Output localized text directly, not instructions.",
    "texts": {
      "ratingQuestion": "Confidence question for ${analysis.topic} (${analysis.department}), max 12 words in ${analysis.language}",
      "topicsQuestion": "Practice areas question for ${analysis.topic} (${analysis.department}), max 10 words in ${analysis.language}",
      "feedbackQuestion": "Feedback question for ${analysis.topic} (${analysis.department}), max 8 words in ${analysis.language}",
      "feedbackPlaceholder": "Localize 'Type your thoughts here…' into ${analysis.language}",
      "submitButton": "Localize 'Submit' into ${analysis.language}",
      "submittingText": "Localize 'Submitting…' into ${analysis.language}",
      "submittedText": "Localize 'Submitted' into ${analysis.language}",
      "ratingRequiredText": "Localize 'Please select a rating before you submit.' into ${analysis.language}",
      "dataSecurityNotice": "Localize 'Your responses are anonymous and protected.' into ${analysis.language}",
      "successTitle": "Localize 'Thank you' into ${analysis.language}",
      "successMessage1": "Localize 'Thanks for your feedback.' into ${analysis.language}",
      "successMessage2": "Outcome message for ${analysis.topic}, max 8 words in ${analysis.language}",
      "successMessage3": "Team-focused message for ${analysis.topic}, max 8 words in ${analysis.language}",
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
      "ratingDescription": "Confidence rating description, max 8 words in ${analysis.language}",
      "starLabel": "star",
      "topicsDescription": "Practice areas description, max 8 words in ${analysis.language}",
      "topicLabel": "Topic checkbox",
      "feedbackDescription": "Text area for additional comments",
      "feedbackLabel": "Feedback field",
      "submitSectionLabel": "Submission section",
      "submittingLabel": "Submitting status",
      "submitLabel": "Submit button",
      "securityNoticeLabel": "Data privacy note"
    },
    "topics": [
      "Skill for ${analysis.topic} (${analysis.category}), 3-5 words in ${analysis.language}",
      "Another skill for ${analysis.topic} (${analysis.category}), 3-5 words in ${analysis.language}"
    ],
    "scene_type": "survey"
  }
}

CRITICAL:
1. iconName MUST be "list-checks" - NEVER use topic-specific icons
2. title MUST be "Share Your Experience" - NEVER include topic name
3. Questions (ratingQuestion, topicsQuestion, feedbackQuestion) must be generic, applicable to any topic
4. ONLY topics array should be topic-specific (2 skills/areas for ${analysis.topic})
5. Where you see "Return like 'example'" - output text SIMILAR to example, NOT the instruction itself
6. SCENE_TYPE MUST ALWAYS BE "survey" - NEVER "summary" or anything else`;
}