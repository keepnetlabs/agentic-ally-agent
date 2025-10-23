import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

SCENE 1 - INTRO (PATTERN-BASED GENERATION):
Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

⚠️ HIGHLIGHTS & KEY_MESSAGE:

- Highlights: Exactly 3 items, <8 words each
  • Pattern: Risk statement → Empowering action → Positive outcome

  REFERENCE EXAMPLE (Phishing):
  • "Know that phishing attacks are common"
  • "Remember that anyone can be targeted"
  • "See how simple steps reduce risk"

  FOR ${analysis.topic} (${analysis.department}):
  • Adapt pattern to your topic context (do NOT copy phishing example)
  • Focus on relevant threat → preventive action → positive outcome

- Key messages: 3 statements, max 5 words each
  • Pattern: Fact → Impact → Action

  REFERENCE EXAMPLE (Phishing):
  • "Phishing is common" (fact)
  • "Anyone can be targeted" (impact)
  • "Report quickly" (action)

  FOR ${analysis.topic} (${analysis.department}):
  • Adapt fact/impact/action pattern to your topic

- Duration: "~5 minutes" (adjust based on total scene duration), duration_seconds: 15-20.

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "1": {
    "iconName": "Choose lucide-react icon for ${analysis.topic}: phishing→'mail-warning', quishing/qr code→'qr-code', BEC/business email/spoofing→'briefcase', email security→'mail-check', deepfake→'video-off', vishing→'phone', malware→'bug', ransomware→'lock-keyhole', social engineering→'users-round', MFA→'shield-check', password→'key-round', backup→'hard-drive', encryption→'shield-lock', data privacy→'eye-off', incident response/playbooks/decision trees→'git-branch', checklists→'list-checks', general security→'shield', awareness→'brain', culture→'people', mindset→'lightbulb', compliance→'document', policy→'clipboard', best practices→'star'",
    "title": "Write simple title for ${analysis.topic}. Pattern by category: THREATS→'Stop [Threat]' (Phishing/Deepfake/Ransomware), TOOLS→'Secure with [Tool]' (MFA/Password), PROCESSES→'Follow [Protocol/Process]' (Incident Response/Security Protocols). Examples: 'Stop Phishing Attacks', 'Secure with MFA', 'Follow Security Protocols'. Keep direct and clear.",
    "subtitle": "One sentence showing ACTION + OUTCOME (≤12 words) - empowering, NOT technical. Pattern adapts by category:
- THREATS: 'Learn to [recognize] and [report/prevent]' → Examples: 'Learn to spot and report safely' | 'Spot fakes and verify before acting'
- TOOLS: 'Learn to [use/enable] and [protect/benefit]' → Examples: 'Use strong passwords to protect accounts' | 'Enable MFA and secure access'
- PROCESSES: 'Learn to [follow/apply] and [outcome]' → Examples: 'Learn to follow playbooks and respond quickly' | 'Apply decision trees and prevent mistakes'
NOT: 'Sender addresses fake' (technical) or 'Always verify' (imperative).",
    "sectionTitle": "Write 'What this training will help you with:' in ${analysis.language}. Output the translated text directly, not instructions.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "KNOW statement (≤8 words): Start with 'Know that'. Topic and Department-aware impact. Pattern: [topic fact] [impacts department outcome]. Department focus: Finance→fraud/money | Operations/IT→system/reliability | HR/General→team/safety. Examples: Phishing+Finance→'Know that phishing targets payment requests' | Ransomware+Operations→'Know that ransomware stops systems' | Password+IT→'Know that weak passwords invite attacks' | MFA+Finance→'Know that MFA protects financial access' | Incident Response+Operations→'Know that quick response saves systems' | Social Engineering+HR→'Know that verification protects colleagues'. Generate contextually for ${analysis.topic} + ${analysis.department}."
      },
      {
        "iconName": "users",
        "text": "REMEMBER statement (≤8 words): Start with 'Remember that'. Topic and Department-aware empowering action. Pattern: [action/strategy] [prevents/protects/stops] [outcome]. Department focus: Finance→fraud/money/verification | Operations/IT→system/speed/reliability | HR/General→team/safety. Examples: Phishing+Finance→'Remember that verification prevents fraud' | Phishing+IT→'Remember that quick action stops spread' | Phishing+General→'Remember that anyone can be targeted' | Password+IT→'Remember that strong passwords stop breaches'. Generate contextually for ${analysis.topic} + ${analysis.department}."
      },
      {
        "iconName": "shield-check",
        "text": "SEE statement (≤8 words): Start with 'See how'. Topic and Department-aware positive outcome. Pattern: [learner action] [leads to/enables/protects] [positive outcome]. Department focus: Finance→transaction/asset protection | Operations/IT→system/reliability | HR/General→team/colleague safety. Examples: Phishing+Finance→'See how verification protects transactions' | Ransomware+Operations→'See how backups save systems' | Password+IT→'See how strong passwords enable security' | MFA+General→'See how MFA protects access' | Incident Response+Operations→'See how quick response limits damage'. Generate contextually for ${analysis.topic} + ${analysis.department}."
      }
    ],
    "key_message": [
      "What to know (≤5 words): Topic-focused fact. Examples: Phishing→'Phishing is common threat' | Ransomware→'Ransomware encrypts systems' | Password→'Weak passwords fail fast'. Generate for ${analysis.topic}.",
      "Why it matters (≤5 words): Department-aware impact. Examples: Finance→'Fraud costs millions' | Operations→'Systems go down' | General→'Everyone gets targeted'. Generate for ${analysis.department}.",
      "What you do (≤5 words): Action-focused behavior. Examples: 'Verify payment requests' | 'Report suspicious email' | 'Use strong passwords'. Generate for ${analysis.topic}."
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
    "duration_seconds": ${Math.round((microlearning.scenes?.[0]?.metadata?.duration_seconds) || 15)},
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