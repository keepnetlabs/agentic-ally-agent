import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene7Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

SCENE 7 - NUDGE (REINFORCEMENT WITH TOPIC-SPECIFIC CONTEXT):
Topic: ${analysis.topic} | Language: ${analysis.language}

⚠️ NUDGE INSTRUCTIONS:
- This is LIGHTWEIGHT REINFORCEMENT of key behaviors from prior scenes
- UI text (title, subtitle) appears generic but implementation subtitle MUST be topic-specific
- key_message is always 3 concrete actions for ${analysis.topic}
- Use IMPLEMENTATION INTENTION format: "Next time you [situation], you will [action]"

IMPLEMENTATION INTENTION PATTERNS (for texts.subtitle):

THREAT topics (Phishing, Deepfake, Ransomware, Vishing, Malware, Social Engineering):
- PHISHING: "Next time you see a suspicious email, you will verify the sender"
- DEEPFAKE: "Next time you see video of a leader, you will verify authenticity"
- RANSOMWARE: "Next time your files look encrypted, you will isolate the system"
- VISHING: "Next time someone calls requesting access, you will verify through official channels"

TOOL topics (Password, MFA, Backup, Encryption, Data Privacy):
- MFA: "Next time you see a login prompt, you will enable multi-factor authentication"
- PASSWORD: "Next time you create a password, you will use a password manager"
- BACKUP: "Next time you finish critical work, you will verify your backup"
- ENCRYPTION: "Next time you handle sensitive data, you will encrypt before sharing"

PROCESS topics (Incident Response, Decision Trees, Playbooks, Checklists):
- INCIDENT RESPONSE: "Next time an incident occurs, you will follow the response playbook"
- DECISION TREES: "Next time you face a choice, you will apply the decision framework"

For OTHER topics: Adapt pattern to: "Next time you [situation specific to ${analysis.topic}], you will [action]"

USE EXACTLY THESE KEYS WITH DYNAMIC CONTENT:
{
  "7": {
    "iconName": "repeat",
    "subtitle": "Return like 'Your action plan to stay safe' (max 8 words, GENERIC - never include topic name)",
    "callToActionText": "Localize 'Continue' into ${analysis.language}. Output localized text directly, not instructions.",
    "texts": {
      "title": "Localize 'Action Plan' into ${analysis.language}. Output localized text directly, not instructions.",
      "subtitle": "Topic-specific implementation intention (max 15 words). Pattern: 'Next time you [situation for ${analysis.topic}], you will [concrete action]'. Examples: phishing→'Next time you see a suspicious email, you will verify the sender' | MFA→'Next time you see a login prompt, you will enable multi-factor authentication' | vishing→'Next time someone calls requesting access, you will verify through official channels'",
      "actionsTitle": "Localize 'Your next steps' into ${analysis.language}. Output localized text directly, not instructions."
    },
    "key_message": [
      "Action 1 (max 6 words, concrete and specific to ${analysis.topic}). Examples: phishing→'Check sender address carefully' | MFA→'Enable MFA on all accounts' | password→'Use password manager always'",
      "Action 2 (max 8 words, protective or verification focused). Examples: phishing→'Don't click suspicious links' | deepfake→'Verify video authenticity first' | MFA→'Use approved authenticator apps'",
      "Action 3 (max 5 words, escalation or validation). Examples: phishing→'Report if suspicious' | ransomware→'Isolate immediately' | vishing→'Report fraud attempt'"
    ],
    "scene_type": "nudge"
  }
}

CRITICAL:
1. iconName MUST be "repeat" - NEVER topic-specific
2. Main subtitle (first one) must be generic - NEVER include topic name
3. texts.title MUST be "Action Plan" translation - NEVER include topic name
4. texts.subtitle MUST be topic-specific implementation intention - shows learner WHEN+WHAT they will do
5. key_message MUST be 3 concrete topic-specific actions (NOT generic steps)
6. Where you see "Return like 'example'" - output text SIMILAR to example, NOT the instruction itself`;
}