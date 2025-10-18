import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

        GOAL SCENE:
        - Title: "Your Learning Goal" (simple, universal)

        - Subtitle (ONE sentence only): Implementation intention → "Next time you [situation], you will [action]".
          • Must strictly match topic: ${analysis.topic}
          • Output ONLY the sentence (no quotes, no extra words)

        - Goals: Exactly three items with tight templates.
          • Titles: 2-5 words, action verb + object
          • Subtitles: 2-4 words, concrete cue
          • Descriptions: "Helps you ..." max 10-12 words
          • Topic clusters:
            - Threats (phishing, deepfake, malware, ransomware, impersonation, social engineering):
              1) Recognition (Spot/Check ...), 2) Action (Verify/Use ...), 3) Escalation (Report/Alert ...)
            - Hygiene/Controls (password, MFA, backup, encryption, data privacy):
              1) Recognition (Avoid/Assess ...), 2) Action (Use/Enable/Apply ...), 3) Resilience (Recover/Protect ...)
            - Processes/Frameworks (incident response, decision trees, playbooks, checklists):
              1) Recognition (Identify/Review ...), 2) Application (Follow/Apply ...), 3) Verification (Check/Validate ...)
            - Soft Skills (leadership, communication, decision-making, time management):
              1) Observation (Notice/Recognize ...), 2) Practice (Apply/Use ...), 3) Feedback (Reflect/Improve ...)
          • Examples: phishing→ Spot Suspicious Emails → Verify via Official Channel → Report It Safely; password→ Avoid Weak Patterns → Use a Password Manager → Enable MFA; incident response→ Identify the Incident → Follow the Playbook → Validate Resolution; leadership→ Notice Team Needs → Apply Active Listening → Reflect on Feedback

        - Key messages: Three phrases (recognition, action, escalation/resilience/verification)
          • Max 5-7 words each, topic-specific

        - Duration: 20 seconds (goal scene standard)

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "2": {
    "iconName": "target",
    "title": "Your Learning Goal",
    "subtitle": "Return ONLY one short sentence (≤18 words): Next time you [topic-appropriate situation for ${analysis.topic}], you will [concrete action]. Keep natural language. Examples: phishing→ Next time you see a suspicious email, you will verify via an official channel. | password→ Next time you set a password, you will generate a unique 12+ character password in your manager. | backup→ Next time you finish critical work, you will verify backups and test a restore. | incident response→ Next time an incident occurs, you will follow the established playbook steps. | awareness→ Next time you're in a meeting, you will share a security tip. | compliance→ Next time you access data, you will confirm you're following policy.",
    "callToActionText": "If ${analysis.language} is English, use 'Continue'. Otherwise, localize ONLY the word 'Continue' into ${analysis.language}. Output the localized word directly, not instructions.",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Recognition for ${analysis.topic} (2-5 words). THREATS→'Spot Suspicious [Item]'. TOOLS→'Avoid Weak [Item]' (assess vulnerability). PROCESSES→'Identify/Review [Item]'. SOFT SKILLS→'Notice [Item]'. AWARENESS→'Recognize [Opportunity]' | COMPLIANCE→'Review [Area]'. Examples: phishing→'Spot Suspicious Emails' | MFA→'Assess Account Risks' | password→'Avoid Weak Patterns' | incident response→'Identify the Incident' | awareness→'Recognize Security Moments' | compliance→'Review Policy Requirements'.",
        "subtitle": "Concrete cue (2-4 words)",
        "description": "Helps you identify risk or situation quickly (≤12 words).",
      },
      {
        "iconName": "shield-check",
        "title": "Action for ${analysis.topic} (2-5 words). THREATS→'Verify Before Acting'. TOOLS→'Use/Enable [Solution]' (take protective action). PROCESSES→'Follow [Framework]'. SOFT SKILLS→'Apply [Skill]'. AWARENESS→'Share/Practice [Action]' | COMPLIANCE→'Implement [Requirement]'. Examples: phishing→'Verify via Channel' | MFA→'Enable MFA Now' | password→'Use a Password Manager' | incident response→'Follow the Playbook' | awareness→'Share Best Practices' | compliance→'Implement Policy Requirement'.",
        "subtitle": "Specific step",
        "description": "Helps you apply the safe behavior or skill (≤12 words).",
      },
      {
        "iconName": "flag",
        "title": "Escalate/Resilience/Verify (2-4 words). THREATS→'Report It Safely'. TOOLS→'Test/Verify [Protection]' (build resilience). PROCESSES→'Validate [Action]'. SOFT SKILLS→'Reflect on [Action]'. AWARENESS→'Share Your [Impact]' | COMPLIANCE→'Verify [Adherence]'. Examples: phishing→'Report It Safely' | MFA→'Test Recovery Access' | backup→'Test Restores' | incident response→'Validate Resolution' | awareness→'Share Your Wins' | compliance→'Verify Compliance Status'.",
        "subtitle": "Trigger/cue",
        "description": "Helps you escalate, add resilience, or improve (≤12 words).",
      }
    ],
    "key_message": [
      "Step 1 phrase (≤6 words). Recognition action for ${analysis.topic}. NO LABEL PREFIX - output only the phrase. Examples: phishing→'Spot suspicious email' | password→'Avoid weak patterns' | incident response→'Identify incident quickly' | awareness→'Recognize security moments' | compliance→'Review requirements regularly'.",
      "Step 2 phrase (≤7 words). Action step for ${analysis.topic}. NO LABEL PREFIX - output only the phrase. Examples: phishing→'Verify via official channel' | password→'Use a password manager' | incident response→'Follow established playbook' | awareness→'Share knowledge with colleagues' | compliance→'Follow all policy guidelines'.",
      "Step 3 phrase (≤5 words). Escalation/resilience/verification for ${analysis.topic}. NO LABEL PREFIX - output only the phrase. Examples: phishing→'Use report button' | backup→'Test restores often' | incident response→'Validate resolution' | awareness→'Celebrate team wins' | compliance→'Verify compliance quarterly'."
    ],
    "texts": {},
    "scene_type": "goal",
    "points": 5,
    "duration_seconds": ${Math.round(microlearning.scenes[1]?.metadata.duration_seconds || 20)},
    "hasAchievementNotification": false,
    "scientific_basis": "Goal – Goal Activation + Relevance: Implementation intention language and goal priming. 'Next time X happens, you will Y' format bridges intention–action gap.",
    "icon": {
      "sceneIconName": "target"
    }
  }
}
`;
}