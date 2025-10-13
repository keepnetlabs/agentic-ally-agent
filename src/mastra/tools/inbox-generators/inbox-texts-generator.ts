import { MicrolearningContent } from '../../types/microlearning';

export function generateInboxTextsPrompt(
  topic: string,
  languageCode: string,
  microlearning: MicrolearningContent
): string {
  return `Create inbox UI texts for "${topic}" training in ${languageCode}. 

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON without explanation or markdown
- Include ALL required fields: phishingReportModal AND phishingResultModal
- MUST include phishingReportModal.title, phishingReportModal.subtitle, phishingReportModal.question, etc.
- MUST include phishingResultModal.legitimateExplanationTitle
- No missing fields allowed - validation will fail if ANY field is missing

Generate the following structure:
- Replace TOPIC with "${topic}"
- Replace LANGUAGE with "${languageCode}"
- Localize all "Localize 'text' into ${languageCode}" instructions to actual ${languageCode} text
- Keep mobileTitle as "${topic} Training" (use actual topic)
- CRITICAL: MUST include both phishingReportModal AND phishingResultModal objects with ALL their fields

{
  "title": "Localize 'TOPIC Training' into ${languageCode}",
  "description": "Localize 'Learn to identify and handle TOPIC scenarios' into ${languageCode}",
  "instructions": "Localize 'Review emails and report suspicious content' into ${languageCode}",
  "selectEmailMessage": "Localize 'Select an email to view its content' into ${languageCode}",
  "reportButtonText": "Localize 'Report as Suspicious' into ${languageCode}",
  "nextButtonText": "Localize 'Continue' into ${languageCode}",
  "phishingReportLabel": "Keep 'Phishing' in English. Localize 'Reporter' to ${languageCode}", 
  "inboxLabel": "Localize 'Inbox' into ${languageCode}",
  "reportsLabel": "Localize 'Reports' into ${languageCode}",
  "accuracyLabel": "Localize 'Accuracy' into ${languageCode}",
  "emailReportedMessage": "Localize 'Email has been reported' into ${languageCode}",
  "emailHeadersTitle": "Localize 'Email Headers' into ${languageCode}",
  "ctaButtonText": "Localize 'Improve Your Behavior' into ${languageCode}",
  "mobileTitle": "${topic} Training",
  "backToInboxText": "Localize 'Back to Inbox' into ${languageCode}",
  "headersButtonText": "Localize 'Headers' into ${languageCode}",
  "correctReportMessage": "Localize 'Well done identifying the issue' into ${languageCode}",
  "cautiousReportMessage": "Localize 'Good caution with suspicious content' into ${languageCode}",
  "phishingReportModal": {
    "title": "Keep 'Phishing' in English. Localize 'Reporter' to ${languageCode}",
    "subtitle": "Localize 'Report this email for analysis?' into ${languageCode}",
    "question": "Localize 'Why are you reporting this email?' into ${languageCode}",
    "options": [
      "Localize 'Received spam email.' into ${languageCode}",
      "Localize 'Received suspicious email.' into ${languageCode}",
      "Localize 'Not sure if legitimate.' into ${languageCode}"
    ],
    "reportButton": "Localize 'Report' into ${languageCode}",
    "cancelButton": "Localize 'Cancel' into ${languageCode}"
  },
  "phishingResultModal": {
    "correctTitle": "Localize 'Excellent catch!' into ${languageCode}",
    "correctSubtitle": "Localize 'You correctly identified this ${topic} issue' into ${languageCode}",
    "incorrectTitle": "Localize 'Good security thinking!' into ${languageCode}",
    "incorrectSubtitle": "Localize 'Being cautious is always wise' into ${languageCode}",
    "difficultyLabel": "Localize 'MEDIUM' into ${languageCode}",
    "emailInfoTitle": "Localize 'Email Analysis' into ${languageCode}",
    "phishingExplanationTitle": "Localize 'Why this was suspicious' into ${languageCode}",
    "legitimateExplanationTitle": "Localize 'Why this was legitimate' into ${languageCode}",
    "continueButton": "Localize 'Continue Learning' into ${languageCode}"
  },
  "mobileHint": "Localize '💡 Open email. If suspicious, press Report.' into ${languageCode}",
  "feedbackCorrect": "Localize '✅ Good job — reporting helps protect everyone.' into ${languageCode}",
  "feedbackWrong": "Localize '⚠️ Not quite right — this email looks safe. Try again.' into ${languageCode}"
}`;
}