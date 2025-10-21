import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene7Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

=== GENERIC IMPLEMENTATION INTENTION PATTERNS (Category-Based, works for ANY topic)

THREAT Category (Phishing, Ransomware, Deepfake, Vishing, Malware, Social Engineering, etc):
Template: "Next time you [perceive/encounter threat], you will [verify/isolate/report]"
Examples:
- "Next time you see suspicious email, verify sender"
- "Next time you see video of leader, verify authenticity"
- "Next time files look encrypted, isolate system"
- "Next time someone calls requesting access, verify through official channels"

TOOL Category (MFA, Password, Backup, Encryption, Data Privacy, etc):
Template: "Next time you [use/need feature], you will [enable/setup/test]"
Examples:
- "Next time you see login prompt, enable MFA"
- "Next time you create password, use password manager"
- "Next time you finish critical work, verify backup"
- "Next time you handle sensitive data, encrypt before sharing"

PROCESS Category (Incident Response, Security Protocols, Decision Frameworks, Compliance, etc):
Template: "Next time you [encounter situation], you will [follow procedure]"
Examples:
- "Next time incident occurs, follow response playbook"
- "Next time you face choice, apply security framework"
- "Next time policy applies, validate compliance"
- "Next time procedure needed, follow guidelines"

=== GENERIC KEY MESSAGE PATTERNS (3-Step Framework: Recognize → Avoid/Do → Report/Enable)

THREAT Category (ANY threat topic):
Step 1 - RECOGNIZE: [Perceive indicator] - Max 6 words
  Examples: "Check sender carefully" | "Spot encrypted files" | "Identify video signs"
Step 2 - AVOID/PROTECT: [Don't/Protective action] - Max 8 words
  Examples: "Don't click links or open attachments" | "Don't open suspicious files" | "Don't trust without verification"
Step 3 - REPORT/ISOLATE: [Escalate] - Max 5 words
  Examples: "Report to IT" | "Isolate system immediately" | "Report the finding"

TOOL Category (ANY tool topic):
Step 1 - RECOGNIZE: [Perceive need/opportunity] - Max 6 words
  Examples: "See login request" | "Create new password" | "Finish critical work"
Step 2 - AVOID/DO: [Protective setup action] - Max 8 words
  Examples: "Don't skip setup" | "Don't use weak passwords" | "Don't forget to backup"
Step 3 - ENABLE/TEST: [Confirm/verify] - Max 5 words
  Examples: "Enable immediately" | "Use password manager" | "Verify works"

PROCESS Category (ANY process topic):
Step 1 - RECOGNIZE: [Spot situation] - Max 6 words
  Examples: "Notice unusual activity" | "Face policy decision" | "See compliance gap"
Step 2 - AVOID/FOLLOW: [Don't deviate] - Max 8 words
  Examples: "Don't investigate alone" | "Don't skip procedures" | "Don't assume optional"
Step 3 - REPORT/VALIDATE: [Confirm adherence] - Max 5 words
  Examples: "Report to team" | "Follow guidelines always" | "Validate compliance"

{
  "7": {
    "iconName": "repeat",
    "subtitle": "Your action plan to stay safe from ${analysis.topic}",
    "callToActionText": "Localize 'Continue' into ${analysis.language}",
    "texts": {
      "title": "Localize 'Action Plan' into ${analysis.language}",
      "subtitle": "Next time [situation for ${analysis.topic}], you will [action]. Max 15 words in ${analysis.language}",
      "actionsTitle": "Localize 'Your next steps' into ${analysis.language}"
    },
    "key_message": [
      "Perceive indicator for ${analysis.topic} (${analysis.category} pattern). Max 6 words in ${analysis.language}",
      "Protective action for ${analysis.topic} (${analysis.category} pattern). Max 8 words in ${analysis.language}",
      "Escalate per ${analysis.category} pattern for ${analysis.topic}. Max 5 words in ${analysis.language}"
    ],
    "scene_type": "nudge"
  }
}`;
}