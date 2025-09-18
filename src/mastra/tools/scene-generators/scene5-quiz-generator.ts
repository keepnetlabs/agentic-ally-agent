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
    "callToActionText": "If ${analysis.language} is English, use 'Answer to Continue'. Otherwise, localize 'Answer to Continue' into ${analysis.language} (keep meaning, adapt tone & punctuation)",
    "quizCompletionCallToActionText": "If ${analysis.language} is English, use 'Continue'. Otherwise, localize 'Continue' into ${analysis.language}",
    "key_message": [
      "Write quiz topic message 1 in ${analysis.language} about ${analysis.topic}",
      "Write quiz topic message 2 in ${analysis.language} about ${analysis.topic}",
      "Write quiz topic message 3 in ${analysis.language} about ${analysis.topic}"
    ],
    "questions": {
      "totalCount": 2,
      "maxAttempts": 10,
      "list": [
        {
          "id": "report-scenario",
          "type": "multiple_choice",
          "title": "${analysis.topic} scenario with suspicious communication",
          "description": "You receive an unexpected ${analysis.topic.toLowerCase()} attempt. The sender name looks legitimate, but something feels suspicious. What is the safest next step?",
          "options": [
            {
              "id": "engage",
              "text": "Engage with the suspicious communication",
              "isCorrect": false
            },
            {
              "id": "reply",
              "text": "Reply to the sender to ask if it's genuine", 
              "isCorrect": false
            },
            {
              "id": "report",
              "text": "Use the Report button so IT can investigate",
              "isCorrect": true
            },
            {
              "id": "ignore",
              "text": "Ignore and delete the message",
              "isCorrect": false
            }
          ],
          "explanation": "Using the Report button helps the security team act quickly and protect others. Avoid engaging with suspicious communications."
        },
        {
          "id": "delete-vs-report", 
          "type": "true_false",
          "title": "Delete or report?",
          "statement": "If a communication looks suspicious, deleting it is enough.",
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
          "explanation": "Reporting helps IT spot wider attacks, warn colleagues and remove similar threats. Deleting only helps you."
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