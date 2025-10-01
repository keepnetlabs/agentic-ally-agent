import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

INTRO SCENE:
- Title: For ${analysis.topic}, use simple pattern:
  • If attack/threat (phishing, deepfake, malware) → "Stop [topic] Attacks"
  • If security tool/practice (MFA, passwords, backup) → "Secure with [tool]"
  • Keep simple, avoid colons and complex formulas

- Subtitle: One short sentence (max 12 words) stating learner benefit.
  • Threats/incidents → verbs like "recognize", "report", "avoid".
  • Practices/tools/policies → verbs like "create", "use", "apply", "enable", "manage".
  • Choose verbs that fit the topic; never force “report”. Must sound natural when read aloud.

- Highlights: Exactly 3 (Risk → Target → Solution).
  • Each <8 words, unique, and expresses a distinct idea (no repetition).

- Key messages: 3 statements (max 5 words).
  • One fact, one risk, one solution.
  • Each must be distinct, slogan-like, and suitable for a slide/poster.

- Duration: "~5 minutes", Level: "Beginner".

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "1": {
    "iconName": "video",
    "title": "Write simple title for ${analysis.topic}. Examples: 'Stop Phishing Attacks', 'Stop Deepfake Attacks', 'Secure with MFA', 'Strong Password Security'. Keep direct and clear.",
    "subtitle": "Short benefit sentence (≤12 words) - natural language, no jargon.",
    "sectionTitle": "Translate 'What this training will help you with:' to ${analysis.language}.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "Write educational risk statement in ${analysis.language} (≤8 words). Use teaching phrases like 'Know that...', 'Understand that...', 'Realize that...'. Example: 'Know that weak passwords invite attacks'."
      },
      {
        "iconName": "users",
        "text": "Write impact awareness statement in ${analysis.language} (≤8 words). Use reminder phrases like 'Remember that...', 'Be aware that...'. Example: 'Remember that everyone can be targeted'."
      },
      {
        "iconName": "shield-check",
        "text": "Write solution awareness statement in ${analysis.language} (≤8 words). Use insight phrases like 'See how...', 'Learn how...', 'Discover how...'. Example: 'See how simple steps reduce risk'."
      }
    ],
    "key_message": [
      "Write a simple user benefit in ${analysis.language} (≤4 words). Use direct, positive language like 'Stay secure online', 'Protect your data', 'Keep accounts safe'. Avoid awkward technical combinations.",
      "Write a clear problem statement in ${analysis.language} (≤5 words). Use natural language like 'Weak passwords get hacked', 'Fake emails fool people', 'Threats target everyone'. Avoid technical jargon combinations.",
      "Write a simple action in ${analysis.language} (≤5 words). Use clear verbs like 'Use strong passwords', 'Report suspicious emails', 'Enable extra security'. Avoid awkward phrasing."
    ],
    "duration": "~${Math.max(2, Math.round((microlearning.scenes?.reduce((total, scene) => total + (scene?.metadata?.duration_seconds || 30), 0) || 300) / 60))} minutes",
    "level": "Localize '${analysis.level}' into ${analysis.language} with proper capitalization (e.g., 'Beginner', 'Intermediate', 'Advanced')",
    "callToActionText": {
      "mobile": "If ${analysis.language} is English, use 'Swipe to get started'. Otherwise, translate to ${analysis.language} with natural phrasing.",
      "desktop": "If ${analysis.language} is English, use 'Click to get started'. Otherwise, translate to ${analysis.language} with natural phrasing."
    },
    "texts": {
      "sceneLabel": "Intro scene",
      "sceneDescription": "${analysis.topic} introduction focused on awareness and practical benefits.",
      "iconLabel": "Training icon",
      "titleLabel": "Training title",
      "subtitleLabel": "Training introduction",
      "cardLabel": "Learning overview card",
      "cardDescription": "Translate 'What this training will help you with' into ${analysis.language} (natural phrasing; do not expand).",
      "highlightItemLabel": "Learning goal",
      "statsLabel": "Training details",
      "durationLabel": "Completion time",
      "levelLabel": "Difficulty level",
      "ctaLabel": "Start training",
      "sparkleLabel": "Decorative animation"
    },
    "scene_type": "intro",
    "points": 5,
    "duration_seconds": ${Math.round(microlearning.scenes[0]?.metadata.duration_seconds || 15)},
    "hasAchievementNotification": false,
    "scientific_basis": "Attention & salience: concise, relevant cues improve focus and memory.",
    "icon": {
      "sparkleIconName": "alert-triangle",
      "sceneIconName": "Set this to the same value as iconName"
    }
  }
}
`;
}