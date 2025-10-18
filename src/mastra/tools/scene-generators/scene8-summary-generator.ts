import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene8Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  return `${baseContext}

Generate scene 8 (summary):
{
  "8": {
    "iconName": "trophy",
    "texts": {
      "downloadTrainingLogsText": "Localize 'Download Training Logs' into ${analysis.language}",
      "retryText": "Localize 'Retry' into ${analysis.language}",
      "completionTitle": "Return like 'Well done — you've completed the training' (max 8 words)",
      "completionSubtitle": "Return like 'You've strengthened your skills' (max 8 words)",
      "achievementsTitle": "Localize 'Your achievements' into ${analysis.language}",
      "actionPlanTitle": "Localize 'Next steps' into ${analysis.language}",
      "resourcesTitle": "Localize 'Additional resources' into ${analysis.language}",
      "motivationalTitle": "Return like 'Stay alert' (max 3 words)",
      "motivationalMessage": "Return like 'Completing this training helps keep your organisation safer' (max 12 words)",
      "saveAndFinish": "Localize 'Save and Finish' into ${analysis.language}",
      "savingText": "Localize 'Saving…' into ${analysis.language}",
      "finishedText": "Return like 'Saved. You can now close this window' (max 10 words)",
      "finishErrorText": "Return like 'LMS connection failed. Share the logs with your IT team' (max 12 words)",
      "downloadButton": "Localize 'Download certificate' into ${analysis.language}",
      "downloadingText": "Localize 'Downloading…' into ${analysis.language}",
      "downloadedText": "Localize 'Downloaded' into ${analysis.language}",
      "urgentLabel": "Localize 'Urgent' into ${analysis.language}",
      "pointsLabel": "Localize 'Points' into ${analysis.language}",
      "timeLabel": "Localize 'Time' into ${analysis.language}",
      "completionLabel": "Localize 'Completion' into ${analysis.language}"
    },
    "immediateActions": [
      {
        "title": "Localize 'Do now' into ${analysis.language}. Output localized text directly, not instructions.",
        "description": "Return like 'Apply what you learned the next time you encounter this' (max 12 words) for ${analysis.topic}"
      },
      {
        "title": "Localize 'This week' into ${analysis.language}. Output localized text directly, not instructions.",
        "description": "Return like 'Share your knowledge with your team' (max 10 words) for ${analysis.topic}"
      }
    ],
    "key_message": [
      "Return like 'Training completed' (max 3 words)",
      "Return like 'Apply what you learned' (max 5 words)",
      "Return like 'Share with others' (max 4 words)"
    ],
    "resources": [
      {
        "title": "Return like 'Official Security Guidance' (max 5 words) for ${analysis.topic}",
        "type": "URL",
        "url": "Return topic-specific CISA URL. Phishing→https://www.cisa.gov/secure-our-world/recognize-and-report-phishing | Password→https://www.cisa.gov/secure-our-world/use-strong-passwords | MFA→https://www.cisa.gov/secure-our-world/turn-mfa | Ransomware→https://www.cisa.gov/stopransomware | AI/Deepfake→https://www.cisa.gov/ai | General→https://www.cisa.gov/secure-our-world"
      },
      {
        "title": "Return like 'Cybersecurity Resources' (max 5 words) for ${analysis.topic}",
        "type": "URL",
        "url": "Return DIFFERENT URL from first. If topic has specific URL, use https://www.cisa.gov/cybersecurity as second. If topic is general, use https://www.cisa.gov/secure-our-world"
      }
    ],
    "scene_type": "summary"
  }
}

CRITICAL:
1. iconName MUST be "trophy" - NEVER use topic-specific icons
2. completionSubtitle must be generic - NEVER mention specific topic name (use "skills" not "security awareness")
3. immediateActions descriptions must be topic-adaptable, NOT security-specific only
4. resources: MUST use 2 DIFFERENT CISA URLs that match ${analysis.topic}
5. Where you see "Return like 'example'" - output text SIMILAR to example, NOT the instruction itself`;
}