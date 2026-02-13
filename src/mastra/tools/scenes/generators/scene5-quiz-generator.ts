import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';

export function generateScene5Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

=== PEDAGOGICAL RULES (Apply to ANY topic: ${analysis.topic})

1. THE "REALISTIC CONTEXT" RULE:
   - NEVER start with "You see..." or "There is...".
   - ALWAYS add a "Red Herring" or "Pressure Factor".
   - BAD: "You receive a phishing email."
   - GOOD: "It's 17:55 on Friday. You're rushing to finish a report when an email arrives marked 'URGENT: Invoice Overdue'..." (Time pressure + Specific context)

2. THE "DISTRACTOR" SYSTEM (Wrong answers must be designed types):
   - Option A (THE IMPULSIVE MISTAKE): The emotional/panic reaction. (e.g., "Click immediately to fix it")
   - Option B (THE NEAR-MISS): Sounds professional/logical but is effectively wrong (e.g., "Reply to ask if it's real" - wrong channel).
   - Option C (THE FALSE SECURITY): Passing responsibility (e.g., "Ignore it, the spam filter handles it").

3. THE "COMPARATIVE FEEDBACK" RULE:
   - Explanation format: "X is correct because [reason]. Y is risky because [reason]."
   - Teach the DISTINCTION between the Near-Miss and the Correct Action.

=== QUESTION PATTERNS (Adapt structure to ${analysis.topic})

THREAT Pattern (Phishing, Social Engineering):
Template: "Context: [Situation + Pressure]. Trigger: [Suspicious sign]. Decision?"
Focus: Spotting the trap vs. reacting emotionally.

TOOL Pattern (MFA, VPN, Antivirus):
Template: "Context: [Usage scenario]. Obstacle: [Friction/Issue]. Action?"
Focus: Bypassing security for convenience (don't!) vs. following protocol.

PROCESS Pattern (Data Handling, Reporting):
Template: "Context: [Work task]. Conflict: [Rule vs. Utility]. Choice?"
Focus: Helping a colleague (risky) vs. following policy (safe).

FOR ${analysis.topic} (${analysis.department}):
- Use specific terminology relevant to ${analysis.topic}
- Apply the DISTRACTOR SYSTEM strictly to generated options
- Ensure "Correct Answer" resolves the specific pressure factor safely

Generate scene 5 (quiz):
CRITICAL:
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete quiz questions and answers.
2. TOPIC CONSISTENCY: Keep all quiz content focused strictly on ${analysis.topic}.
3. CATEGORY-BASED QUESTIONS: Use question pattern from ${analysis.category} (THREAT/TOOL/PROCESS) section
4. QUESTION FORMAT: For THREAT category ask "What is the safest response?" | For TOOL category ask "What is the correct approach?" | For PROCESS category ask "What is the appropriate action?"
5. SCALABILITY: This pattern works for unlimited topics - not hardcoded per topic
{
  "5": {
    "iconName": "brain",
    "title": "Localize 'Test Your Knowledge' into ${analysis.language}. Output localized text directly, not instructions.",
    "subtitle": "Localize 'Make the right decision when it matters most' into ${analysis.language}. Output localized text directly, not instructions.",
    "callToActionText": "Localize 'Answer to Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "quizCompletionCallToActionText": "Localize 'Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "key_message": [
      "Action message for ${analysis.topic}, max 5 words in ${analysis.language}",
      "Action message for ${analysis.topic}, max 5 words in ${analysis.language}",
      "Action message for ${analysis.topic}, max 5 words in ${analysis.language}"
    ],
    "questions": {
      "totalCount": 2,
      "maxAttempts": 2,
      "list": [
        {
          "id": "report-scenario",
          "type": "multiple_choice",
          "title": "Scenario title for ${analysis.topic} (${analysis.department}), max 8 words in ${analysis.language}",
          "description": "Realistic workplace scenario for ${analysis.topic} (${analysis.department}). Describe: [situation with observable detail]. Then ask appropriate question for ${analysis.category} category. Max 40 words in ${analysis.language}",
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
          "statement": "Common misconception or false belief about ${analysis.topic}, max 15 words in ${analysis.language}",
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
    "scientific_basis": "Active Recall: Testing enhances retention and identifies knowledge gaps.",
    "scene_type": "quiz"
  }
}`;
}
