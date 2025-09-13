import { MicrolearningContent } from '../../types/microlearning';

export function generateInboxTextsPrompt(
  topic: string,
  languageCode: string,
  microlearning: MicrolearningContent
): string {
  return `Create inbox UI texts for "${topic}" training in ${languageCode}. 

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON without explanation or markdown
- Include ALL required fields, especially phishingResultModal.legitimateExplanationTitle
- No missing fields allowed - validation will fail

Generate the following structure:
- Replace TOPIC with "${topic}" 
- Replace LANGUAGE with "${languageCode}"
- Replace TRANSLATE_PHISHING_REPORT with "Phishing Reporter" translated to ${languageCode}
- Keep mobileTitle as "${topic} Training" (use actual topic)
- MUST include phishingResultModal.legitimateExplanationTitle field

{
  "title": "TOPIC Training",
  "description": "Learn to identify and handle TOPIC scenarios",
  "instructions": "Review emails and report suspicious content",
  "selectEmailMessage": "Select an email to view its content",
  "reportButtonText": "Report as Suspicious",
  "nextButtonText": "Continue",
  "phishingReportLabel": "TRANSLATE_PHISHING_REPORT", 
  "inboxLabel": "Inbox",
  "reportsLabel": "Reports",
  "accuracyLabel": "Accuracy",
  "emailReportedMessage": "Email has been reported",
  "emailHeadersTitle": "Email Headers",
  "ctaButtonText": "Improve Your Behavior",
  "mobileTitle": "${topic} Training",
  "backToInboxText": "Back to Inbox", 
  "headersButtonText": "Headers",
  "correctReportMessage": "Well done identifying the issue",
  "cautiousReportMessage": "Good caution with suspicious content",
  "phishingReportModal": {
    "title": "${topic} Reporter",
    "subtitle": "Report this email for analysis?",
    "question": "Why are you reporting this email?",
    "options": ["Received spam email.", "Received suspicious email.", "Not sure if legitimate."],
    "reportButton": "Report", 
    "cancelButton": "Cancel"
  },
  "phishingResultModal": {
    "correctTitle": "Excellent catch!",
    "correctSubtitle": "You correctly identified this ${topic} issue",
    "incorrectTitle": "Good security thinking!",
    "incorrectSubtitle": "Being cautious is always wise",
    "difficultyLabel": "MEDIUM",
    "emailInfoTitle": "Email Analysis",
    "phishingExplanationTitle": "Why this was suspicious",
    "legitimateExplanationTitle": "Why this was legitimate",
    "continueButton": "Continue Learning"
  },
  "mobileHint": "💡 Open email. If suspicious, press Report.",
  "feedbackCorrect": "✅ Good job — reporting helps protect everyone.",
  "feedbackWrong": "⚠️ Not quite right — this email looks safe. Try again."
}`;
}