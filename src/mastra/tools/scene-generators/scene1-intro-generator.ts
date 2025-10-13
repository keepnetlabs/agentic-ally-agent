import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

INTRO SCENE:
- Title: For ${analysis.topic}, use simple pattern:
  • Attacks/threats (phishing, deepfake, impersonation, malware) → "Stop [Threat] Attacks"
  • Security tools (MFA, passwords) → "Secure with [Tool]"
  • Keep focused on core threat - avoid adding modifiers like "Social Media" unless topic explicitly includes them

- Subtitle: One short sentence (max 12 words) stating learner benefit.
  • Threats/incidents → verbs like "recognize", "report", "avoid".
  • Practices/tools/policies → verbs like "create", "use", "apply", "enable", "manage".
  • Choose verbs that fit the topic; never force “report”. Must sound natural when read aloud.

- Highlights: Exactly 3 (Risk → Target → Solution).
  • Each <8 words, SPECIFIC to ${analysis.topic} (not generic), actionable
  • Focus on concrete tactics/benefits rather than general awareness

- Key messages: 3 statements (max 5 words).
  • One fact, one risk, one solution.
  • Each must be distinct, slogan-like, and suitable for a slide/poster.

- Duration: "~5 minutes" (adjust based on total scene duration), duration_seconds: 15-20.

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
        "text": "Start with 'Know that' + specific risk about ${analysis.topic} (≤8 words). Examples: phishing→'Know that sender addresses can be fake', backup→'Know that ransomware targets backups first', deepfake→'Know that video quality hides manipulation'. Pattern + specific fact."
      },
      {
        "iconName": "users",
        "text": "Start with 'Remember that' + specific context about ${analysis.topic} (≤8 words). Examples: phishing→'Remember that urgent emails need verification', backup→'Remember that untested restores can fail', deepfake→'Remember that familiar faces can be faked'. Pattern + specific warning."
      },
      {
        "iconName": "shield-check",
        "text": "Start with 'See how' + specific action/solution for ${analysis.topic} (≤8 words). Examples: phishing→'See how 30 seconds prevents attacks', backup→'See how 3-2-1 rule protects data', deepfake→'See how source checking stops fakes'. Pattern + actionable benefit."
      }
    ],
    "key_message": [
      "First: State the PROBLEM for ${analysis.topic} (3-5 words). Pattern: '[Threat] is common' or '[Risk] happens often'. Examples: phishing→'Phishing is common', backup→'Backups fail often', deepfake→'Fakes spread fast'. Threat name + frequency.",
      "Second: State WHO is affected by ${analysis.topic} (3-5 words). Pattern: 'Anyone can be [outcome]' or 'Everyone [risk]'. Examples: phishing→'Anyone can be targeted', backup→'Everyone needs backups', deepfake→'All see fake videos'. Inclusive statement.",
      "Third: State the ACTION for ${analysis.topic} (3-5 words). Specific action verb + outcome. Examples: phishing→'Verify sender always', backup→'Test restores often', deepfake→'Check sources first'. NOT generic like 'reduce risk' or 'stay safe'."
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