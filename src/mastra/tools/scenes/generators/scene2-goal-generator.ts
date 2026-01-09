import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';

export function generateScene2Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

SCENE 2 - GOAL (TOPIC-SPECIFIC PATTERNS):
Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

GOAL PATTERNS (By Category):
- THREATS (Phishing, Malware, Social Eng): Recognize → Verify → Report
- TOOLS (MFA, Password, Backup): Assess → Implement → Test
- PROCESSES (Incident Response, Policy): Identify → Follow → Validate
- OTHER: Adapt closest pattern to ${analysis.topic}.

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "2": {
    "iconName": "target",
    "title": "Topic-aware title (e.g., 'Your Phishing Defense', 'Your Account Security'). Pattern: 'Your [Topic Area/Outcome]'. NEVER: 'Your Learning Goal'.",
    "subtitle": "Implementation intention (≤18 words): 'Next time you [situation], you will pause and [action]'. Adapt to ${analysis.roles}. (e.g., 'Next time see suspicious email, you will pause and report it').",
    "callToActionText": "Localize 'Continue' to ${analysis.language}.",
    "goals": [
      {
        "iconName": "alert-triangle",
        "title": "Step 1 Title (2-5 words). Pattern: Recognize/Assess/Identify.",
        "subtitle": "Concrete cue for Step 1 (2-4 words). (e.g., 'Pause and think', 'Assess risks').",
        "description": "Short benefit (≤12 words). Pattern: 'Helps you [spot/notice] when [situation].' Adapt to ${analysis.roles}. (e.g., 'Helps you spot phishing red flags like sender urgency')."
      },
      {
        "iconName": "shield-check",
        "title": "Step 2 Title (2-5 words). Pattern: Verify/Implement/Follow.",
        "subtitle": "Specific action (2-4 words). (e.g., 'Verify source', 'Enable MFA').",
        "description": "Short benefit (≤12 words). Pattern: 'Helps you [action] when [situation] so [outcome].' Adapt to ${analysis.roles}. (e.g., 'Helps you verify sender so you protect sensitive data')."
      },
      {
        "iconName": "flag",
        "title": "Step 3 Title (2-4 words). Pattern: Report/Test/Validate.",
        "subtitle": "Escalation cue (2-4 words). (e.g., 'Report it', 'Test recovery').",
        "description": "Short benefit (≤12 words). Pattern: 'Helps you [action] when [situation] so [team benefit].' Adapt to ${analysis.roles}. (e.g., 'Helps you report threats so security team responds fast')."
      }
    ],
    "key_message": [
      "Step 1 recognition (≤6 words): What to watch for. (e.g., 'Spot suspicious emails').",
      "Step 2 protection (≤7 words): Action to take. (e.g., 'Verify source first').",
      "Step 3 escalation (≤5 words): Reporting/Validation. (e.g., 'Report to IT team')."
    ],
    "texts": {},
    "scene_type": "goal",
    "points": 5,
    "duration_seconds": ${Math.round(microlearning.scenes[1]?.metadata.duration_seconds || 20)},
    "hasAchievementNotification": false,
    "scientific_basis": "Goal – Goal Activation: Implementation intention language ('Next time X, I will Y') bridges intention–action gap.",
    "icon": {
      "sceneIconName": "target"
    }
  }
}
`;
}