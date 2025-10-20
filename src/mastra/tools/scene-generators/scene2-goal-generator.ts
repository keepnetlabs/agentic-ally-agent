import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

SCENE 2 - GOAL (TOPIC-SPECIFIC PATTERNS):
Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

⚠️ GOALS & KEY_MESSAGE INSTRUCTIONS:
- Goals follow topic-specific 3-step patterns (NOT generic Spot→Verify→Report)
- Each goal step has title, subtitle (concrete cue), description
- Key messages are slogans matching the 3 steps
- Pattern varies by topic category: Threats, Tools, Processes
- For topics not shown, analyze pattern and extrapolate

        GOAL SCENE:
        - Title: Topic-aware goal title, NOT generic. Examples: Phishing→"Your Phishing Defense" | Deepfake→"Your Verification Skill" | Ransomware→"Your Recovery Plan" | MFA→"Your Account Security" | Password→"Your Credential Strength" | Vishing→"Your Verification Habit". Pattern: "Your [Topic Area/Outcome]". NEVER: "Your Learning Goal"

        - Subtitle (ONE sentence only): Implementation intention → "Next time you [situation], you will [action]".
          • Must strictly match topic: ${analysis.topic}
          • Output ONLY the sentence (no quotes, no extra words)

        - Goals: Exactly three items. Pattern VARIES by topic category (NOT hardcoded Spot→Verify→Report).

          THREAT topics (Phishing, Deepfake, Ransomware, Vishing, Malware, Social Engineering):
          PATTERN: Recognize → Verify → Report
          - PHISHING: 1) Spot Suspicious Emails → Check email address | 2) Verify via Official Channel → Use known contact | 3) Report It Safely → Use report button
          - DEEPFAKE: 1) Detect Manipulated Media → Check quality details | 2) Verify Authenticity → Contact creator directly | 3) Report the Deepfake → Alert IT team
          - RANSOMWARE: 1) Recognize Attack Signs → Check for encryption notices | 2) Isolate Infected System → Disconnect immediately | 3) Report to IT → Start recovery process
          - VISHING: 1) Identify Caller Impersonation → Check caller identity | 2) Verify Legitimate Source → Call back official number | 3) Report Fraud Attempt → Alert security team

          TOOL topics (Password, MFA, Backup, Encryption, Data Privacy):
          PATTERN: Assess → Implement → Test
          - PASSWORD: 1) Avoid Weak Patterns → Identify weak password | 2) Use a Password Manager → Generate strong password | 3) Enable MFA → Activate second factor
          - MFA: 1) Assess Account Risks → Identify accounts without MFA | 2) Enable Multi-Factor Auth → Set up 2FA on accounts | 3) Test Recovery Access → Verify backup methods
          - BACKUP: 1) Evaluate Backup Status → Check backup frequency | 2) Create Isolated Backup → Store offline copy | 3) Test Restore Process → Verify recovery works
          - ENCRYPTION: 1) Identify Sensitive Data → Classify information | 2) Apply Encryption → Protect classified data | 3) Verify Protection → Confirm encryption active

          PROCESS topics (Incident Response, Decision Trees, Playbooks, Checklists):
          PATTERN: Identify → Follow → Validate
          - INCIDENT RESPONSE: 1) Identify the Incident → Recognize security event | 2) Follow the Playbook → Execute response steps | 3) Validate Resolution → Confirm threat eliminated
          - DECISION TREES: 1) Identify Scenario → Recognize decision point | 2) Follow Decision Tree → Apply logic systematically | 3) Validate Outcome → Confirm correct decision

          For OTHER topics: Use closest pattern structure and adapt to topice→ Identify the Incident → Follow the Playbook → Validate Resolution; leadership→ Notice Team Needs → Apply Active Listening → Reflect on Feedback

        - Key messages: Three phrases (recognition, action, escalation/resilience/verification)
          • Max 5-7 words each, topic-specific

        - Duration: 20 seconds (goal scene standard)

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "2": {
    "iconName": "target",
    "title": "Topic-aware title, NOT generic. Examples: Phishing→'Your Phishing Defense' | Deepfake→'Your Verification Skill' | Ransomware→'Your Recovery Plan' | MFA→'Your Account Security' | Password→'Your Credential Strength' | Vishing→'Your Verification Habit'",
    "subtitle": "Return ONLY one short sentence (≤18 words): Next time you [topic-appropriate situation for ${analysis.topic}], you will [concrete action]. Keep natural language. Examples: phishing→ Next time you see a suspicious email, you will verify via an official channel. | password→ Next time you set a password, you will generate a unique 12+ character password in your manager. | backup→ Next time you finish critical work, you will verify backups and test a restore. | incident response→ Next time an incident occurs, you will follow the established playbook steps. | awareness→ Next time you're in a meeting, you will share a security tip. | compliance→ Next time you access data, you will confirm you're following policy.",
    "callToActionText": "If ${analysis.language} is English, use 'Continue'. Otherwise, localize ONLY the word 'Continue' into ${analysis.language}. Output the localized word directly, not instructions.",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Step 1 goal title for ${analysis.topic} (2-5 words). Reference pattern examples above. Threats→Recognize, Tools→Assess, Processes→Identify.",
        "subtitle": "Concrete cue for Step 1 (2-4 words). Examples: 'Pause and think' | 'Check details' | 'Verify first'",
        "description": "SHORT benefit description (≤12 words). MUST include 'so [outcome]'. Pattern: 'Helps you [action] [when situation] so [positive outcome].' Examples: 'Helps you pause and think when something looks unusual' | 'Helps you catch issues before they spread' | 'Helps you recognize threats so you stay safe'"
      },
      {
        "iconName": "shield-check",
        "title": "Step 2 goal title for ${analysis.topic} (2-5 words). Reference pattern examples above. Threats→Verify, Tools→Implement, Processes→Follow.",
        "subtitle": "Specific action or behavior (2-4 words). Examples: 'Safe action' | 'Verify now' | 'Use protection'",
        "description": "SHORT benefit description (≤12 words). MUST include 'so [outcome]'. Protective guidance focus. Examples: 'Helps you avoid risky links and verify attachments so you stay safe' | 'Helps you protect sensitive data with encryption so data stays secure' | 'Helps you verify before acting so you prevent fraud'"
      },
      {
        "iconName": "flag",
        "title": "Step 3 goal title for ${analysis.topic} (2-4 words). Reference pattern examples above. Threats→Report, Tools→Test, Processes→Validate.",
        "subtitle": "Escalation or verification (2-4 words). Examples: 'Report button' | 'Test backup' | 'Validate outcome'",
        "description": "SHORT benefit description showing team impact/outcome (≤12 words). MUST include 'so' pattern. Examples: 'Helps you use the Report button so the security team can act quickly' | 'Helps you verify recovery works so you're prepared' | 'Helps you report threats so everyone stays protected'"
      }
    ],
    "key_message": [
      "Step 1 recognition (≤6 words): What to watch for. Examples: 'Recognise a suspicious email' | 'Spot manipulated media' | 'Notice account risks'",
      "Step 2 protection (≤7 words): Action to take. Can include 'DON'T' directives for threats. Phishing specific: 'Don't click links or open attachments'. Examples: 'Don't click links or open attachments' | 'Verify authenticity first' | 'Enable multi-factor auth now' | 'Avoid risky actions'",
      "Step 3 escalation (≤5 words): How to report/validate. Examples: 'Use the report button' | 'Report to IT team' | 'Test recovery works'"
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