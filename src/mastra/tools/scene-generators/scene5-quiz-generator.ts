import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene5Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

=== GENERIC QUESTION PATTERNS (Category-Based, works for ANY topic)

THREAT Category (Phishing, Ransomware, Deepfake, Vishing, Malware, Social Engineering, etc):
- "What is the safest response?" (recommended)
- "What should you do immediately?"
- "What is the correct action?"

TOOL Category (MFA, Password, Backup, Encryption, Data Privacy, etc):
- "What is the correct approach?" (recommended)
- "What should you do first?"
- "What is best practice?"

PROCESS Category (Incident Response, Security Protocols, Decision Frameworks, Compliance, etc):
- "What is the appropriate action?" (recommended)
- "What should be done?"
- "What is the procedure?"

=== GENERIC DESCRIPTION PATTERN (Works for ANY topic + department combination)

Template: "You encounter [specific situation with observable detail]. [Category-based question]? Max 40 words in ${analysis.language}"

Examples (to show pattern, not hardcoded):
- Phishing: "You receive an email about urgent payment. The sender address looks official but the link shows a mismatched domain. What is the safest response?"
- MFA: "A login screen requests two-factor setup for the first time. What is the correct approach?"
- Ransomware: "Your files show unusual extensions and a message appears demanding payment. What is the safest response?"
- Incident Response: "An employee reports suspicious account activity. What is the appropriate action?"

Generate scene 5 (quiz):
CRITICAL:
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete quiz questions and answers.
2. TOPIC CONSISTENCY: Keep all quiz content focused strictly on ${analysis.topic}.
3. CATEGORY-BASED QUESTIONS: Use question pattern from ${analysis.category} (THREAT/TOOL/PROCESS) section
4. ALWAYS END WITH: Generic category-based question: THREAT→"What is the safest response?" | TOOL→"What is the correct approach?" | PROCESS→"What is the appropriate action?"
5. SCALABILITY: This pattern works for unlimited topics - not hardcoded per topic
{
  "5": {
    "iconName": "brain",
    "title": "Test Your Knowledge",
    "subtitle": "Make the right decision when it matters most",
    "callToActionText": "Localize 'Answer to Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "quizCompletionCallToActionText": "Localize 'Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "key_message": [
      "Action message (${analysis.category}) for ${analysis.topic} (${analysis.department}), max 5 words in ${analysis.language}",
      "Action message (${analysis.category}) for ${analysis.topic} (${analysis.department}), max 5 words in ${analysis.language}",
      "Action message (${analysis.category}) for ${analysis.topic} (${analysis.department}), max 5 words in ${analysis.language}"
    ],
    "questions": {
      "totalCount": 2,
      "maxAttempts": 2,
      "list": [
        {
          "id": "report-scenario",
          "type": "multiple_choice",
          "title": "Scenario title for ${analysis.topic} (${analysis.department}), max 8 words in ${analysis.language}",
          "description": "Scenario for ${analysis.topic} (${analysis.department}). Pattern: You encounter [specific situation with observable detail]. Question: THREAT→'What is the safest response?' | TOOL→'What is the correct approach?' | PROCESS→'What is the appropriate action?'. Max 40 words in ${analysis.language}",
          "options": [
            {
              "id": "mistake1",
              "text": "Common mistake for ${analysis.topic} (${analysis.department}), max 8 words in ${analysis.language}",
              "isCorrect": false
            },
            {
              "id": "mistake2",
              "text": "Another mistake for ${analysis.topic} (${analysis.department}), max 8 words in ${analysis.language}",
              "isCorrect": false
            },
            {
              "id": "correct",
              "text": "Correct action for ${analysis.topic}, max 8 words in ${analysis.language}",
              "isCorrect": true
            },
            {
              "id": "mistake3",
              "text": "Another mistake for ${analysis.topic} (${analysis.department}), max 8 words in ${analysis.language}",
              "isCorrect": false
            }
          ],
          "explanation": "Why correct + benefit for ${analysis.topic} (${analysis.department}). Max 25 words in ${analysis.language}"
        },
        {
          "id": "belief-test",
          "type": "true_false",
          "title": "Assessment for ${analysis.topic} (${analysis.department}), max 5 words in ${analysis.language}",
          "statement": "Common misconception about ${analysis.topic}, max 15 words in ${analysis.language}. Examples: Phishing→'Official-looking emails are always safe' | MFA→'Setting it up is optional' | Ransomware→'Files from colleagues are always safe'",
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
          "explanation": "Why FALSE + correct action for ${analysis.topic} (${analysis.department}). Max 25 words in ${analysis.language}"
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