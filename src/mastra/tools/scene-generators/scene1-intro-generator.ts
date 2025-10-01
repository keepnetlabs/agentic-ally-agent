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
    "iconName": "Choose lucide-react icon for ${analysis.topic}: phishing→'mail-warning', email security→'mail-check', deepfake→'video-off', malware→'bug', ransomware→'lock-keyhole', social engineering→'users-round', MFA→'shield-check', password→'key-round', backup→'hard-drive', encryption→'shield-lock', data privacy→'eye-off', general security→'shield'",
    "title": "Write simple title for ${analysis.topic}. Examples: 'Stop Phishing Attacks', 'Stop Deepfake Attacks', 'Secure with MFA', 'Strong Password Security'. Keep direct and clear.",
    "subtitle": "Short benefit sentence (≤12 words) - natural language, no jargon.",
    "sectionTitle": "Write 'What this training will help you with:' in ${analysis.language}. Output the translated text directly, not instructions.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "MUST start with 'Know that' + state THE PROBLEM/RISK for ${analysis.topic} (≤8 words total). Pattern: 'Know that [specific threat] is common' or 'Know that [specific threat] happens often'. Examples: phishing→'Know that phishing attacks are common', deepfake→'Know that deepfakes can mislead audiences', ransomware→'Know that ransomware locks critical files'. DO NOT mention WHO is affected - only state the problem."
      },
      {
        "iconName": "users",
        "text": "MUST start with 'Remember that' + WHO is affected (≤8 words total). Pattern: 'Remember that anyone can be targeted' or 'Remember that everyone faces [risk]'. Keep universal - applies to all topics."
      },
      {
        "iconName": "shield-check",
        "text": "MUST start with 'See how' + simple solution benefit for ${analysis.topic} (≤8 words total). Pattern: 'See how simple steps reduce risk' or 'See how quick checks help'. Focus on ease and accessibility of solution."
      }
    ],
    "key_message": [
      "First: State the PROBLEM in ${analysis.language} (3-5 words). Pattern: '[Threat] is common' or '[Risk] happens daily'. Example: 'Phishing is common', 'Weak passwords fail'.",
      "Second: State WHO is affected in ${analysis.language} (3-5 words). Pattern: 'Anyone can be [risk]' or '[Group] are targets'. Example: 'Anyone can be targeted', 'Everyone faces risks'.",
      "Third: State the SOLUTION in ${analysis.language} (3-5 words). Pattern: 'Small actions [benefit]' or 'Simple steps [outcome]'. Example: 'Small actions reduce risk', 'Simple steps increase safety'."
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
    "scientific_basis": "Intro – Attention Capture + Emotional Salience: Salience theory and emotionally triggered memory formation. Emotional hooks increase attention and memory encoding for subsequent learning.",
    "icon": {
      "sparkleIconName": "alert-triangle",
      "sceneIconName": "MUST match iconName exactly - use same icon chosen above"
    }
  }
}
`;
}