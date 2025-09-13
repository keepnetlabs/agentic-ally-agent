import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene5Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 5 (quiz):
{
  "5": {
    "iconName": "brain",
    "title": "Test Your Knowledge",
    "subtitle": "Make the right decision when it matters most",
    "callToActionText": "Translate 'Answer to Continue' to ${analysis.language}",
    "quizCompletionCallToActionText": "Translate 'Continue' to ${analysis.language}",
    "key_message": [
      "Write quiz topic message 1 in ${analysis.language} about ${analysis.topic}",
      "Write quiz topic message 2 in ${analysis.language} about ${analysis.topic}",
      "Write quiz topic message 3 in ${analysis.language} about ${analysis.topic}"
    ],
    "quizConfig": {
      "question": "Write quiz question in ${analysis.language} specific to ${analysis.topic} scenario (Security example: 'You receive an urgent email from HR asking for your login details. What do you do?', Writing example: 'Your colleague sends a poorly formatted report. How do you provide feedback?', Password example: 'You notice a colleague writing down passwords. What action should you take?', Data example: 'A client asks you to share sensitive data via personal email. What is your response?')",
      "options": [
        {
          "text": "Write CORRECT answer option in ${analysis.language} for ${analysis.topic}",
          "isCorrect": true,
          "feedback": "Write positive feedback in ${analysis.language} explaining why this is correct for ${analysis.topic}"
        },
        {
          "text": "Write WRONG answer option in ${analysis.language} for ${analysis.topic}", 
          "isCorrect": false,
          "feedback": "Write corrective feedback in ${analysis.language} explaining why this is wrong for ${analysis.topic}"
        },
        {
          "text": "Write WRONG answer option in ${analysis.language} for ${analysis.topic}",
          "isCorrect": false,
          "feedback": "Write corrective feedback in ${analysis.language} explaining why this is wrong for ${analysis.topic}"
        }
      ]
    },
    "texts": {
      "loadingText": "Translate 'Loading question...' to ${analysis.language}",
      "submitText": "Translate 'Submit Answer' to ${analysis.language}",
      "nextText": "Translate 'Next Question' to ${analysis.language}",
      "retryText": "Translate 'Try Again' to ${analysis.language}",
      "completeText": "Translate 'Quiz Complete!' to ${analysis.language}",
      "scoreText": "Translate 'Your Score:' to ${analysis.language}",
      "correctText": "Translate 'Correct!' to ${analysis.language}",
      "incorrectText": "Translate 'Incorrect' to ${analysis.language}",
      "explanationText": "Translate 'Explanation:' to ${analysis.language}"
    },
    "ariaTexts": {
      "mainLabel": "Quiz section",
      "questionLabel": "Quiz question",
      "optionLabel": "Answer option",
      "feedbackLabel": "Answer feedback",
      "progressLabel": "Quiz progress"
    },
    "scene_type": "quiz"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete quiz questions and answers.
2. TOPIC CONSISTENCY: Keep all quiz content focused strictly on ${analysis.topic}.`;
}