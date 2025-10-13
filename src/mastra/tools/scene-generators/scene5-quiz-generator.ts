import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene5Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 5 (quiz):
CRITICAL:
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete quiz questions and answers.
2. TOPIC CONSISTENCY: Keep all quiz content focused strictly on ${analysis.topic}.
{
  "5": {
    "iconName": "brain",
    "title": "Test Your Knowledge",
    "subtitle": "Make the right decision when it matters most",
    "callToActionText": "Localize 'Answer to Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "quizCompletionCallToActionText": "Localize 'Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "key_message": [
      "Write actionable message 1 in ${analysis.language} for ${analysis.topic}: pause and verify suspicious content (max 8 words)",
      "Write actionable message 2 in ${analysis.language} for ${analysis.topic}: report concerns to IT security immediately (max 7 words)",
      "Write actionable message 3 in ${analysis.language} for ${analysis.topic}: always verify through proper channels (max 6 words)"
    ],
    "questions": {
      "totalCount": 2,
      "maxAttempts": 10,
      "list": [
        {
          "id": "report-scenario",
          "type": "multiple_choice",
          "title": "Write specific ${analysis.topic} scenario title in ${analysis.language} (max 8 words)",
          "description": "Write realistic ${analysis.topic} scenario in ${analysis.language}: Create a specific situation where someone might encounter ${analysis.topic.toLowerCase()} (e.g., for deepfake: CEO video request, for phishing: urgent email, for malware: suspicious download). Ask what is the safest next step? (max 40 words)",
          "options": [
            {
              "id": "engage",
              "text": "Write wrong answer 1 in ${analysis.language} for ${analysis.topic}: engage or interact with suspicious content (max 8 words)",
              "isCorrect": false
            },
            {
              "id": "reply",
              "text": "Write wrong answer 2 in ${analysis.language} for ${analysis.topic}: reply or respond to verify authenticity (max 8 words)",
              "isCorrect": false
            },
            {
              "id": "report",
              "text": "Write correct answer in ${analysis.language} for ${analysis.topic}: use Report button for IT investigation (max 8 words)",
              "isCorrect": true
            },
            {
              "id": "ignore",
              "text": "Write wrong answer 3 in ${analysis.language} for ${analysis.topic}: ignore and delete without reporting (max 8 words)",
              "isCorrect": false
            }
          ],
          "explanation": "Write explanation in ${analysis.language} for ${analysis.topic}: explain why reporting is correct and why other actions are risky (max 25 words)"
        },
        {
          "id": "delete-vs-report", 
          "type": "true_false",
          "title": "Write true/false question title in ${analysis.language} for ${analysis.topic} (max 5 words)",
          "statement": "Write true/false statement in ${analysis.language} for ${analysis.topic}: Create a statement about safe behavior that is FALSE (e.g., for deepfake: 'If video looks authentic, safe to share', for phishing: 'If email from known sender, always safe', for malware: 'If file from colleague, always safe') (max 15 words)",
          "correctAnswer": false,
          "options": {
            "true": {
              "label": "True",
              "icon": "check"
            },
            "false": {
              "label": "False", 
              "icon": "x"
            }
          },
          "explanation": "Write explanation in ${analysis.language} for ${analysis.topic}: explain why the statement is false and what the correct behavior should be (max 25 words)"
        }
      ]
    },
    "texts": {
      "question": "Localize 'Question' into ${analysis.language}",
      "nextQuestion": "Localize 'Next question' into ${analysis.language}",
      "nextSlide": "Localize 'Next slide' into ${analysis.language}",
      "retryQuestion": "Localize 'Try again' into ${analysis.language}",
      "quizCompleted": "Localize 'Quiz completed' into ${analysis.language}",
      "correctAnswer": "Localize 'Correct — well done' into ${analysis.language}",
      "wrongAnswer": "Localize 'Not quite right' into ${analysis.language}",
      "attemptsLeft": "Localize 'attempts left' into ${analysis.language}",
      "noAttemptsLeft": "Localize 'no attempts left' into ${analysis.language}",
      "checkAnswer": "Localize 'Check answer' into ${analysis.language}",
      "evaluating": "Localize 'Checking…' into ${analysis.language}",
      "completeEvaluation": "Localize 'Finish review' into ${analysis.language}",
      "mobileInstructions": "Localize 'Mobile: select the item, then tap a category' into ${analysis.language}",
      "desktopInstructions": "Localize 'Desktop: drag items into categories' into ${analysis.language}",
      "options": "Localize 'Options' into ${analysis.language}",
      "categories": "Localize 'Categories' into ${analysis.language}",
      "tapHere": "Localize 'Tap here' into ${analysis.language}",
      "checkAnswerButton": "Localize 'Check answer' into ${analysis.language}",
      "explanation": "Localize 'Explanation' into ${analysis.language}",
      "tips": "Localize 'Tips' into ${analysis.language}",
      "mobileHint": "Localize 'Read the question carefully before you answer' into ${analysis.language}",
      "previousQuestion": "Localize 'Previous question' into ${analysis.language}",
      "quizCompletionHint": "Localize 'Complete the quiz to continue' into ${analysis.language}",
      "achievementNotification": "Localize 'Achievement unlocked' into ${analysis.language}",
      "scrollHint": "Localize 'Scroll down' into ${analysis.language}",
      "nextSection": "Localize 'Next section' into ${analysis.language}",
      "loading": "Localize 'Loading…' into ${analysis.language}",
      "questionLoading": "Localize 'Loading question…' into ${analysis.language}",
      "transcriptLoading": "Localize 'Loading transcript…' into ${analysis.language}",
      "closeNotification": "Localize 'Close notification' into ${analysis.language}",
      "languageNotFound": "Localize 'Language not found' into ${analysis.language}"
    },
    "ariaTexts": {
      "mainLabel": "Quiz interface",
      "mainDescription": "Interactive quiz with multiple question types and real-time feedback",
      "headerLabel": "Quiz title",
      "questionLabel": "Question content",
      "questionDescription": "Current question with answer options",
      "multipleChoiceLabel": "Multiple-choice options",
      "multipleChoiceDescription": "Select one answer from the available options",
      "trueFalseLabel": "True or false options",
      "trueFalseDescription": "Select true or false for the statement",
      "multiSelectLabel": "Multi-select options",
      "multiSelectDescription": "Select more than one correct answer",
      "sliderLabel": "Slider scale question",
      "sliderDescription": "Rate your answer using the slider",
      "dragDropLabel": "Drag-and-drop categories",
      "dragDropDescription": "Drag items into categories or tap to select",
      "optionsLabel": "Available options",
      "categoriesLabel": "Categories",
      "resultPanelLabel": "Result and explanation",
      "resultPanelDescription": "Feedback on your answer with explanation and tips",
      "explanationLabel": "Explanation section",
      "tipsLabel": "Helpful tips",
      "navigationLabel": "Question navigation",
      "previousQuestionLabel": "Go to previous question",
      "nextQuestionLabel": "Go to next question",
      "retryQuestionLabel": "Retry this question",
      "checkAnswerLabel": "Check your answer",
      "correctAnswerLabel": "Correct answer",
      "incorrectAnswerLabel": "Not quite right",
      "attemptsLeftLabel": "Remaining attempts",
      "noAttemptsLeftLabel": "No attempts left",
      "quizCompletedLabel": "Quiz successfully completed",
      "mobileHintLabel": "Mobile usage hint",
      "mobileInstructionsLabel": "Mobile instructions",
      "desktopInstructionsLabel": "Desktop instructions",
      "tapHereLabel": "Tap here to place the item",
      "clearCategoryLabel": "Clear category",
      "removeItemLabel": "Remove item"
    },
    "scene_type": "quiz"
  }
}`;
}