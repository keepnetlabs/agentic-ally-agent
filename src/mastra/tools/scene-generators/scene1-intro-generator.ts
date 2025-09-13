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
          • Avoid literal or awkward phrasing. Must sound like a professional training course name.  

        - Subtitle: One short sentence (max 12 words) stating learner benefit.  
          • Threats/incidents → verbs like "recognize", "report", "avoid".  
          • Practices/tools/policies → verbs like "create", "use", "apply", "enable", "manage".  
          • Always choose verbs that fit the topic; never force "report".  

        - Highlights: Exactly 3 (Risk → Target → Solution).  
          • Each <8 words, unique and natural.  

        - Key messages: 3 short statements (max 5 words).  
          • One fact, one risk, one solution.  
          • Must be distinct, memorable, slogan-like.  

        - Duration: "~5 minutes", Level: "Beginner".

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
    "1": {
    "iconName": "Choose appropriate Lucide icon for ${analysis.topic}",
    "title": "If ${analysis.language} is English, provide a natural English title. Otherwise, provide a fully localized, natural ${analysis.language} title that conveys 'Prevent ${analysis.topic} incidents' (no English words or templates).",
    "subtitle": "If ${analysis.language} is English, output a natural English subtitle. Otherwise, output a fully localized ${analysis.language} subtitle that conveys 'Learn to recognize and safely report ${analysis.topic}' (ideally under 10 words, no English words).",
    "sectionTitle": "Translate 'What this training will help you with:' to ${analysis.language}.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "Provide '${analysis.topic} is a common issue' in ${analysis.language} (max 6 words)."
      },
      {
        "iconName": "users",
        "text": "Provide 'Anyone can be affected' in ${analysis.language} (max 7 words)."
      },
      {
        "iconName": "shield-check",
        "text": "Provide 'Simple steps help reduce risk' in ${analysis.language} (max 6 words)."
      }
    ],
    "key_message": [
      "Output a short ${analysis.topic} fact in ${analysis.language} (max 4 words).",
      "Output a short vulnerability statement in ${analysis.language} (max 5 words).",
      "Output a short solution statement in ${analysis.language} (max 5 words)."
    ],
    "duration": "~${Math.max(2, Math.round((microlearning.scenes?.reduce((total, scene) => total + (scene?.metadata?.duration_seconds || 30), 0) || 300) / 60))} minutes",
    "level": "Provide the level name in ${analysis.language} for ${analysis.level}.",
    "callToActionText": {
      "mobile": "Translate 'Swipe to get started' to ${analysis.language} using natural phrasing.",
      "desktop": "Translate 'Click to get started' to ${analysis.language} using natural phrasing."
    },
    "texts": {
      "sceneLabel": "Intro scene",
      "sceneDescription": "${analysis.topic} introduction focused on awareness and practical benefits.",
      "iconLabel": "Training icon",
      "titleLabel": "Training title",
      "subtitleLabel": "Training introduction",
      "cardLabel": "Learning overview card",
      "cardDescription": "Translate the static phrase 'What this training will help you with' into ${analysis.language} (natural phrasing only, do not expand or customize).",
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
      "sceneIconName": "Use the same value as iconName"
    }
  }
}
`;
}