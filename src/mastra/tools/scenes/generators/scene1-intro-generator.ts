import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';
import { getHighlightExamples } from '../../../utils/language/localization-language-rules';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);
  const examples = getHighlightExamples(analysis.language);

  return `${contextData}

SCENE 1 - INTRO (PATTERN-BASED GENERATION):

Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

⚠️ HIGHLIGHTS & KEY_MESSAGE:

- Highlights: Exactly 3 items, <8 words each
  • Pattern: Risk statement → Empowering action → Positive outcome

  REFERENCE EXAMPLES in ${analysis.language}:
  • "${examples.risk}"
  • "${examples.action}"
  • "${examples.outcome}"

  FOR ${analysis.topic} (${analysis.department}):
  • Adapt pattern to your topic context (do NOT copy the examples above)
  • Focus on relevant threat → preventive action → positive outcome

- Duration: "~5 minutes" (adjust based on total scene duration), duration_seconds: 15-20.

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "1": {
    "iconName": "Choose lucide-react icon for ${analysis.topic}: phishing→'mail-warning', quishing/qr code→'qr-code', BEC/business email/spoofing→'briefcase', email security→'mail-check', deepfake→'video-off', vishing→'phone', malware→'bug', ransomware→'lock-keyhole', social engineering→'users-round', MFA→'shield-check', password→'key-round', backup→'hard-drive', encryption→'shield-lock', data privacy→'eye-off', incident response/playbooks/decision trees→'git-branch', checklists→'list-checks', general security→'shield', awareness→'brain', culture→'people', mindset→'lightbulb', compliance→'document', policy→'clipboard', best practices→'star'",
    "title": "Write simple title for ${analysis.topic}. Pattern by category: THREATS→'Stop [Threat]' (Phishing/Deepfake/Ransomware), TOOLS→'Secure with [Tool]' (MFA/Password), PROCESSES→'Follow [Protocol/Process]' (Incident Response/Security Protocols). Examples: 'Stop Phishing Attacks', 'Secure with MFA'. Keep it direct and clear in ${analysis.language}.",
    "subtitle": "One sentence showing ACTION + OUTCOME (≤12 words) - empowering, NOT technical. Adapt to ${analysis.roles}. Pattern adapts by category:
- THREATS: 'Learn to [recognize] and [report/prevent]' → Examples: 'Learn to spot and report safely' | 'Spot fakes and verify before acting'
- TOOLS: 'Learn to [use/enable] and [protect/benefit]' → Examples: 'Use strong passwords to protect accounts' | 'Enable MFA and secure access'
- PROCESSES: 'Learn to [follow/apply] and [outcome]' → Examples: 'Learn to follow playbooks and respond quickly' | 'Apply decision trees and prevent mistakes'
NOT: 'Sender addresses fake' (technical) or 'Always verify' (imperative).",
    "sectionTitle": "Write 'What this training will help you with:' in ${analysis.language}. Output the translated text directly, not instructions.",
    "highlights": [
      {
        "iconName": "alert-triangle",
        "text": "KNOW statement (≤8 words): Topic and Department-aware impact. Pattern: [topic fact] [impacts department outcome]. Department focus: Finance→fraud/money | Operations/IT→system/reliability | HR/General→team/safety. CRITICAL LANGUAGE RULES: If ${analysis.language} is English, MUST start with 'Know that...' (e.g., 'Know that phishing targets payment requests'). If ${analysis.language} is NOT English, DO NOT use 'Know that' pattern at all - write naturally as a native ${analysis.language} speaker would express this idea. DO NOT translate 'Know that' literally. Think directly in ${analysis.language}. STYLE REFERENCE in ${analysis.language}: '${examples.risk}'. Generate contextually for ${analysis.topic} + ${analysis.department} in ${analysis.language}."
      },
      {
        "iconName": "users",
        "text": "REMEMBER statement (≤8 words): Topic and Department-aware empowering action. Pattern: [action/strategy] [prevents/protects/stops] [outcome]. Department focus: Finance→fraud/money/verification | Operations/IT→system/speed/reliability | HR/General→team/safety. CRITICAL LANGUAGE RULES: If ${analysis.language} is English, MUST start with 'Remember that...' (e.g., 'Remember that verification prevents fraud'). If ${analysis.language} is NOT English, DO NOT use 'Remember that' pattern at all - write naturally as a native ${analysis.language} speaker would express this idea. DO NOT translate 'Remember that' literally. Think directly in ${analysis.language}. STYLE REFERENCE in ${analysis.language}: '${examples.action}'. Generate contextually for ${analysis.topic} + ${analysis.department} in ${analysis.language}."
      },
      {
        "iconName": "shield-check",
        "text": "SEE statement (≤8 words): Topic and Department-aware positive outcome. Pattern: [learner action] [leads to/enables/protects] [positive outcome]. Department focus: Finance→transaction/asset protection | Operations/IT→system/reliability | HR/General→team/colleague safety. CRITICAL LANGUAGE RULES: If ${analysis.language} is English, MUST start with 'See how...' (e.g., 'See how verification protects transactions'). If ${analysis.language} is NOT English, DO NOT use 'See how' pattern at all - write naturally as a native ${analysis.language} speaker would express this idea. DO NOT translate 'See how' literally. Think directly in ${analysis.language}. STYLE REFERENCE in ${analysis.language}: '${examples.outcome}'. Generate contextually for ${analysis.topic} + ${analysis.department} in ${analysis.language}."
      }
    ],
    "key_message": [
      "What to know (≤5 words): Fact about ${analysis.topic}.",
      "Why it matters (≤5 words): Impact on ${analysis.department}.",
      "What you do (≤5 words): Action to take."
    ],
    "duration": "~${Math.max(2, Math.round((microlearning.scenes?.reduce((total, scene) => total + (scene?.metadata?.duration_seconds || 30), 0) || 300) / 60))} minutes",
    "level": "Localize '${analysis.level}' into ${analysis.language} (e.g., 'Beginner', 'Intermediate')",
    "callToActionText": {
      "mobile": "Localize 'Swipe to get started' naturally.",
      "desktop": "Localize 'Click to get started' naturally."
    },
    "texts": {
      "sceneLabel": "Intro scene",
      "sceneDescription": "${analysis.topic} introduction.",
      "iconLabel": "Training icon",
      "titleLabel": "Training title",
      "subtitleLabel": "Training introduction",
      "cardLabel": "Learning overview card",
      "cardDescription": "Translate 'What this training will help you with' into ${analysis.language}.",
      "highlightItemLabel": "Learning goal",
      "statsLabel": "Training details",
      "durationLabel": "Completion time",
      "levelLabel": "Difficulty level",
      "ctaLabel": "Start training",
      "sparkleLabel": "Decorative animation"
    },
    "scene_type": "intro",
    "points": 5,
    "duration_seconds": ${Math.round(microlearning.scenes?.[0]?.metadata?.duration_seconds || 15)},
    "hasAchievementNotification": false,
    "scientific_basis": "Intro – Attention Capture + Emotional Salience: Salience theory and emotionally triggered memory formation. Emotional hooks increase attention and memory encoding for subsequent learning.",
    "icon": {
      "sparkleIconName": "alert-triangle",
      "sceneIconName": "MUST match iconName exactly - use same icon chosen above"
    }
  }
}
⚠️ QUALITY CHECK: Verify all sentences are natural in ${analysis.language}. No literal translations.
`;
}
