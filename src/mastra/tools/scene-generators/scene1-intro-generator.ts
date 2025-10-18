import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

INTRO SCENE:
- Title: For ${analysis.topic}, use simple pattern based on category:
  • Attacks/threats (phishing, deepfake, impersonation, malware) → "Stop [Threat] Attacks"
  • Security tools (MFA, passwords) → "Secure with [Tool]"
  • Processes/frameworks (incident response, decision trees, playbooks, checklists) → "Follow [Framework]"
  • General awareness/culture/mindset topics → "[Action] for [Topic]" or "Build [Habit]"
  • Compliance/policy topics → "Understand [Policy]" or "Master [Topic]"
  • Keep focused on core theme - avoid adding modifiers like "Social Media" unless topic explicitly includes them

- Subtitle: One short sentence (max 12 words) stating learner benefit.
  • Threats/incidents → verbs like "recognize", "report", "avoid", "spot", "detect".
  • Practices/tools/policies → verbs like "create", "use", "apply", "enable", "manage".
  • Awareness/culture/mindset → verbs like "understand", "build", "develop", "foster", "cultivate".
  • Compliance/policy → verbs like "comply", "follow", "understand", "implement", "maintain".
  • CRITICAL: Deepfake = VIDEO/IMAGE manipulation (NOT phone calls). Vishing = VOICE phone calls.
  • Choose verbs that fit the topic; never force generic words. Must sound natural when read aloud.

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
    "iconName": "Choose lucide-react icon for ${analysis.topic}: phishing→'mail-warning', BEC/business email/spoofing→'briefcase', email security→'mail-check', deepfake→'video-off', vishing→'phone', malware→'bug', ransomware→'lock-keyhole', social engineering→'users-round', MFA→'shield-check', password→'key-round', backup→'hard-drive', encryption→'shield-lock', data privacy→'eye-off', incident response/playbooks/decision trees→'git-branch', checklists→'list-checks', general security→'shield', awareness→'brain', culture→'people', mindset→'lightbulb', compliance→'document', policy→'clipboard', best practices→'star'",
    "title": "Write simple title for ${analysis.topic}. Examples: 'Stop Phishing Attacks', 'Stop BEC Attacks', 'Stop Email Spoofing', 'Stop Deepfake Attacks', 'Stop Vishing Attacks', 'Secure with MFA', 'Strong Password Security', 'Follow Incident Response', 'Follow Decision Trees'. Keep direct and clear.",
    "subtitle": "Short benefit sentence (≤12 words) - natural language, no jargon. For deepfake: mention VIDEO/visual (e.g., 'spot fake videos', 'recognize manipulated media'), NOT phone calls. For vishing: mention PHONE/voice calls. For MFA/passwords: benefit of protection (e.g., 'Protect accounts with extra security layer').",
    "sectionTitle": "Write 'What this training will help you with:' in ${analysis.language}. Output the translated text directly, not instructions.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "Start with 'Know that' or 'Understand that' (≤8 words).
        THREATS: specific risk. Examples: phishing→'Know that sender addresses can be fake', deepfake→'Know that video quality hides manipulation' (VIDEO), vishing→'Know that voices on phone can be fake' (PHONE).
        TOOLS: specific weakness/vulnerability. Examples: MFA→'Know that single password protection is insufficient', password→'Know that passwords can be compromised', backup→'Know that ransomware targets backups first'.
        AWARENESS/CULTURE: foundational understanding. Examples: 'Understand that security is everyone's responsibility', 'Know that awareness prevents most incidents', 'Recognize that culture shapes behavior'."
      },
      {
        "iconName": "users",
        "text": "Start with 'Remember that' or 'Consider that' (≤8 words).
        THREATS: specific warning/context. Examples: phishing→'Remember that urgent emails need verification', deepfake→'Remember that familiar faces can be faked', vishing→'Remember that urgent calls need verification'.
        TOOLS: specific benefit/importance. Examples: MFA→'Remember that MFA adds verification layer', password→'Remember that strong passwords protect accounts', backup→'Remember that untested restores can fail'.
        AWARENESS/CULTURE: behavioral insight. Examples: 'Remember that habits take time to form', 'Consider that peer influence shapes choices', 'Remember that questions strengthen security'."
      },
      {
        "iconName": "shield-check",
        "text": "Start with 'See how' + -ING action (≤8 words).
        THREATS: solution/action. Examples: phishing→'See how reporting stops attacks', deepfake→'See how verifying stops fakes' (verify VIDEO), vishing→'See how verifying caller stops fraud' (verify PHONE).
        TOOLS: enablement/benefit. Examples: MFA→'See how enabling MFA protects access', password→'See how strong passwords stop hacks', backup→'See how checking saves data'.
        AWARENESS/CULTURE: capability building. Examples: 'See how asking questions improves decisions', 'See how small actions reduce risk', 'See how you protect your team'."
      }
    ],
    "key_message": [
      "First (3-5 words): THREATS→'[Threat] is common' | TOOLS→'[Tool] is essential' | AWARENESS→'[Topic] matters now'. Examples: phishing→'Phishing is common' | MFA→'MFA is essential' | awareness→'Security culture matters' | compliance→'Compliance is mandatory'",
      "Second (3-5 words): THREATS→'Anyone can be [outcome]' | TOOLS→'All accounts need [tool]' | AWARENESS→'Everyone has role'. Examples: phishing→'Anyone can be targeted' | MFA→'All accounts need MFA' | awareness→'Everyone has responsibility' | compliance→'Everyone must comply'",
      "Third (3-5 words): THREATS→Verify/Detect/Report | TOOLS→Enable/Use/Apply | AWARENESS→Start/Build/Practice. Examples: phishing→'Verify sender always' | MFA→'Enable MFA today' | awareness→'Start with questions' | compliance→'Practice makes perfect'"
    ],
    "duration": "~${Math.max(2, Math.round((microlearning.scenes?.reduce((total, scene) => total + (scene?.metadata?.duration_seconds || 30), 0) || 300) / 60))} minutes",
    "level": "Localize '${analysis.level}' into ${analysis.language} with proper capitalization (e.g., 'Beginner', 'Intermediate', 'Advanced')",
    "callToActionText": {
      "mobile": "If ${analysis.language} is English, use 'Swipe to get started'. Otherwise, localize to ${analysis.language} with natural phrasing. Output the localized text directly, not instructions.",
      "desktop": "If ${analysis.language} is English, use 'Click to get started'. Otherwise, localize to ${analysis.language} with natural phrasing. Output the localized text directly, not instructions."
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