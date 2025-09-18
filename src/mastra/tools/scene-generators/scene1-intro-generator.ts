import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

INTRO SCENE:
- Title: In ${analysis.language}, write a short, natural course-style title.
  • If threat/incident → e.g., "Stop X Attacks", "X Awareness Training".
  • If practice/tool/policy → e.g., "Password Security Basics", "Data Classification Training".
  • Avoid literal or awkward phrasing; must read like a professional course name.

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
    "iconName": "Choose an appropriate Lucide icon for ${analysis.topic}",
    "title": "Write a natural ${analysis.language} course-style title aligned with ${analysis.topic} (no literal translations, no English templates).",
    "subtitle": "Write a natural ${analysis.language} benefit sentence (≤12 words) using verbs that fit ${analysis.topic} (e.g., recognize/report for threats; create/enable/apply for practices).",
    "sectionTitle": "Translate 'What this training will help you with:' to ${analysis.language}.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "State the key RISK in ${analysis.language} (≤6 words, unique)."
      },
      {
        "iconName": "users",
        "text": "State WHO/TARGET is impacted in ${analysis.language} (≤7 words, unique)."
      },
      {
        "iconName": "shield-check",
        "text": "State the simple SOLUTION in ${analysis.language} (≤6 words, unique)."
      }
    ],
    "key_message": [
      "Write a ${analysis.topic} fact (≤4 words, ${analysis.language}).",
      "Write a risk (≤5 words, ${analysis.language}).",
      "Write a solution (≤5 words, ${analysis.language})."
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