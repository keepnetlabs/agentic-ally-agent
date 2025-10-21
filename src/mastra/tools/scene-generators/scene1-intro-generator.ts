import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene1Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

SCENE 1 - INTRO (PATTERN-BASED GENERATION):
Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

⚠️ HIGHLIGHTS & KEY_MESSAGE INSTRUCTIONS:
- These are GENERATION INSTRUCTIONS, not placeholders
- READ the Pattern Examples below
- GENERATE NEW, ORIGINAL content following the pattern structure
- DO NOT copy examples - adapt the STYLE/PATTERN to your topic+department
- For any topic not shown, analyze pattern structure and extrapolate

INTRO SCENE:
- Title: For ${analysis.topic}, use simple pattern based on category:
  • Attacks/threats (phishing, deepfake, impersonation, malware) → "Stop [Threat] Attacks"
  • Security tools (MFA, passwords) → "Secure with [Tool]"
  • Processes/frameworks (incident response, decision trees, playbooks, checklists) → "Follow [Framework]"
  • General awareness/culture/mindset topics → "[Action] for [Topic]" or "Build [Habit]"
  • Compliance/policy topics → "Understand [Policy]" or "Master [Topic]"
  • Keep focused on core theme - avoid adding modifiers like "Social Media" unless topic explicitly includes them

- Subtitle: One short sentence (max 12 words). Show ACTION + OUTCOME/BENEFIT together.
  Examples (empowering pattern, NOT fearful):
  • "Learn to spot and report suspicious emails safely" (phishing)
  • "Spot fake videos and verify before acting" (deepfake)
  • "Identify caller impersonation and verify through official channels" (vishing)
  • "Use strong unique passwords to protect your accounts" (password)
  • Not: "Sender addresses can be fake" - Too technical
  • Not: "Verify sender always" - Too imperative

- Highlights: Exactly 3 (Risk → Target → Solution), <8 words each, department-specific, actionable.
  • Pattern Examples (ADAPT to topic+department, do NOT copy):

    PHISHING examples (PRODUCTION QUALITY - Learner-centric, empowering):
    - Generic/All: 'Know that phishing attacks are evolving tactics' | 'Remember that one mistake can compromise accounts' | 'See how your caution protects everyone' | Alternative: 'Know that phishing is common threat' | 'Remember that anyone can be targeted' | 'See how simple steps reduce risk'
    - Finance: 'Know that payment fraud starts with vendor email impersonation' | 'Remember that asking one colleague saves thousands in loss' | 'See how simple verification steps protect company finances'
    - HR: 'Know that employee data is high-value to attackers' | 'Remember that a quick callback stops credential theft' | 'See how your caution protects entire teams'
    - IT: 'Know that phishing is entry point for most breaches' | 'Remember that legitimate senders expect security questions' | 'See how reporting strengthens organizational defense'

    MFA examples by department (PRODUCTION QUALITY):
    - Finance: 'Know that protecting payment systems starts with your login' | 'Remember that 2FA makes unauthorized transactions nearly impossible' | 'See how your second factor stops fraud before millions lost'
    - HR: 'Know that employee records hold identity theft targets' | 'Remember that MFA adds protection layer attackers cannot bypass' | 'See how your security habits protect sensitive data'
    - IT: 'Know that compromised admin credentials enable full infrastructure breach' | 'Remember that MFA is fastest way to stop takeover' | 'See how your multi-factor approach prevents system access'

    DEEPFAKE examples by department (VIDEO/IMAGE manipulation, NOT phone calls - PRODUCTION QUALITY):
    - Executive: 'Know that deepfake videos of leaders trigger costly decisions' | 'Remember that asking one question prevents fraudulent transfers' | 'See how verification before acting stops video fraud'
    - HR: 'Know that deepfake videos impersonating executives bypass hesitation' | 'Remember that familiar faces in videos can still be faked' | 'See how your skepticism prevents malicious impersonation'
    - IT: 'Know that AI-generated videos fool most initial viewers' | 'Remember that source verification catches 99% of attempts' | 'See how your detection prevents organization-wide misinformation'
    - Finance: 'Know that deepfake videos of executives authorize fake payments' | 'Remember that verification through known channels stops instant transfers' | 'See how your caution prevents million-dollar fraud'

    RANSOMWARE examples by department (PRODUCTION QUALITY):
    - IT: 'Know that ransomware takes critical systems offline within minutes' | 'Remember that isolated tested backups are your recovery insurance' | 'See how your backup discipline prevents weeks of paralysis'
    - Finance: 'Know that ransomware targets payment and accounting systems first' | 'Remember that recovery from good backups saves millions' | 'See how your data protection restores business continuity'
    - Operations: 'Know that ransomware attackers profit from organizational desperation' | 'Remember that continuity planning reduces ransom leverage' | 'See how your preparation minimizes impact across teams'

    PASSWORD examples by department (PRODUCTION QUALITY):
    - HR: 'Know that reused passwords across sites risk employee data' | 'Remember that unique passwords in manager make breaches unrecoverable' | 'See how your password habits protect security culture'
    - Finance: 'Know that weak passwords are fastest path to fraud' | 'Remember that strong unique passwords cost attackers thousands' | 'See how your credential strength protects financial integrity'
    - IT: 'Know that admin password compromise means full infrastructure access' | 'Remember that password managers enforce security across teams' | 'See how your password discipline prevents admin takeover'

    VISHING examples by department (VOICE phone calls, NOT video - PRODUCTION QUALITY):
    - Operations: 'Know that attackers impersonate authority to bypass caution' | 'Remember that hanging up and calling back stops vishing' | 'See how your verification habit protects everyone'
    - HR: 'Know that social engineers mimic trusted contacts perfectly' | 'Remember that one callback confirms identity faster than rush' | 'See how your caution prevents employee data theft'
    - IT: 'Know that vishing targets IT channels as system access' | 'Remember that credential requests over phone are never legitimate' | 'See how your verification prevents attacker access'

    For ANY OTHER TOPIC: Pattern is Risk → Warning → Action. Apply to your topic+department.

- Key messages: 3 statements (max 5 words, slogan-like, memorable), specific to department. Use same pattern as Highlights (Fact/Risk/Action). Reference examples above for style.

- Duration: "~5 minutes" (adjust based on total scene duration), duration_seconds: 15-20.

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "1": {
    "iconName": "Choose lucide-react icon for ${analysis.topic}: phishing→'mail-warning', BEC/business email/spoofing→'briefcase', email security→'mail-check', deepfake→'video-off', vishing→'phone', malware→'bug', ransomware→'lock-keyhole', social engineering→'users-round', MFA→'shield-check', password→'key-round', backup→'hard-drive', encryption→'shield-lock', data privacy→'eye-off', incident response/playbooks/decision trees→'git-branch', checklists→'list-checks', general security→'shield', awareness→'brain', culture→'people', mindset→'lightbulb', compliance→'document', policy→'clipboard', best practices→'star'",
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
        "text": "KNOW statement (≤8 words): Start with 'Know that'. Emphasize threat IMPACT/CONSEQUENCE/SEVERITY, NOT technical details. Threat-focused. Examples: 'Know that phishing attacks are evolving tactics' | 'Know that phishing is common threat' | 'Know that payment fraud starts with email impersonation'. NOT: 'Know that sender addresses can be forged' (too technical)"
      },
      {
        "iconName": "users",
        "text": "REMEMBER statement (≤8 words): Start with 'Remember that'. Universal benefit + topic-aware action phrasing. Empowering, NO fear language. Generate dynamically per ${analysis.topic}. Examples: Phishing→'Remember that anyone can be targeted' | Finance+Phishing→'Remember that verification prevents fraud' | Tools→'Remember that verification takes seconds' | Processes→'Remember that speed saves systems'"
      },
      {
        "iconName": "shield-check",
        "text": "SEE statement (≤8 words): Start with 'See how'. Positive outcome of learner's action. Personal/relatable. Examples: 'See how your caution protects entire teams' or 'See how simple steps reduce risk'"
      }
    ],
    "key_message": [
      "What to know (≤5 words): Key insight about topic. Memorable fact. Examples: 'Phishing is common', 'Deepfakes are evolving', 'Passwords matter'",
      "Why it matters (≤5 words): Universal consequence or impact. Empowering perspective. Examples: 'Anyone can be targeted', 'Your action protects all', 'Small steps make difference'",
      "What you do (≤5 words): Positive action or behavior. Empowering, achievable. Examples: 'Small actions make difference' | 'Your action protects all' | 'Spot and report safely' | 'Anyone can report' | 'Report quickly' | 'Use strong passwords'. NOT: 'Always verify' (too imperative) or 'Verify sender always' (directive-based)"
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