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
      "completionTitle": "Write short title in ${analysis.language}: 'Well done — you've completed the training' (max 8 words)",
      "completionSubtitle": "Write short subtitle in ${analysis.language} about completing ${analysis.topic} training, like 'You've strengthened your security awareness' or 'You're now better protected against threats' (max 8 words)",
      "achievementsTitle": "Localize 'Your achievements' into ${analysis.language}",
      "actionPlanTitle": "Localize 'Next steps' into ${analysis.language}",
      "resourcesTitle": "Localize 'Additional resources' into ${analysis.language}",
      "motivationalTitle": "Write short motivational title in ${analysis.language} like 'Stay alert' (max 3 words)",
      "motivationalMessage": "Write short message in ${analysis.language}: 'Completing this training helps keep your organisation safer.' (max 12 words)",
      "saveAndFinish": "Localize 'Save and Finish' into ${analysis.language}",
      "savingText": "Localize 'Saving…' into ${analysis.language}",
      "finishedText": "Write short message in ${analysis.language}: 'Saved. You can now close this window.' (max 10 words)",
      "finishErrorText": "Write short error message in ${analysis.language}: 'LMS connection failed. Share the logs with your IT team.' (max 12 words)",
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
        "title": "Localize 'Do now' into ${analysis.language}",
        "description": "Write short actionable step in ${analysis.language} for ${analysis.topic} (max 12 words, like 'Use the Report button the next time something looks suspicious')"
      },
      {
        "title": "Localize 'This week' into ${analysis.language}",
        "description": "Write short weekly goal in ${analysis.language} for ${analysis.topic} (max 10 words, like 'Encourage your team to report suspicious emails')"
      }
    ],
    "key_message": [
      "Write short message in ${analysis.language} like 'Training completed' (max 3 words)",
      "Write short message in ${analysis.language} like 'Apply what you've practised' (max 5 words)",
      "Write short message in ${analysis.language} like 'Share and encourage others' (max 4 words)"
    ],
    "resources": [
      {
        "title": "Write topic-specific resource title in ${analysis.language} for ${analysis.topic} (max 5 words). Examples: Phishing→'CISA Phishing Guidance', Deepfake→'NCSC AI Threats Guide', Password→'NIST Password Guidelines', MFA→'CISA MFA Best Practices'. Make it specific to the topic, not generic.",
        "type": "URL",
        "url": "Choose topic-relevant URL from approved list. Match URL to topic: Phishing/Email→https://www.cisa.gov/secure-our-world/recognize-and-report-phishing OR https://www.cisa.gov/resources-tools/resources/phishing-guidance-stopping-attack-cycle-phase-one, Deepfake/AI→https://www.cisa.gov/ai, Password→https://www.cisa.gov/secure-our-world/use-strong-passwords, MFA→https://www.cisa.gov/secure-our-world/turn-mfa, Ransomware→https://www.cisa.gov/stopransomware, General→https://www.cisa.gov/secure-our-world OR https://www.cisa.gov/cybersecurity. Pick MOST SPECIFIC URL for ${analysis.topic}."
      },
      {
        "title": "Write second resource title in ${analysis.language} for ${analysis.topic} (max 5 words). Must be different URL than first resource.",
        "type": "URL",
        "url": "Choose second URL for ${analysis.topic}. RULES: 1) Must be DIFFERENT from first URL. 2) Must match ${analysis.topic} (e.g., if topic is Deepfake, use AI or general URLs - NEVER use phishing/password URLs). 3) If only 1 specific URL exists for topic, use general URL: https://www.cisa.gov/secure-our-world OR https://www.cisa.gov/cybersecurity. Available URLs: Phishing→https://www.cisa.gov/secure-our-world/recognize-and-report-phishing OR https://www.cisa.gov/resources-tools/resources/phishing-guidance-stopping-attack-cycle-phase-one, Deepfake/AI→https://www.cisa.gov/ai OR general, Password→https://www.cisa.gov/secure-our-world/use-strong-passwords OR general, MFA→https://www.cisa.gov/secure-our-world/turn-mfa OR general, Ransomware→https://www.cisa.gov/stopransomware OR general, General→https://www.cisa.gov/secure-our-world OR https://www.cisa.gov/cybersecurity."
      }
    ],
    "scene_type": "summary"
  }
}

CRITICAL:
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete takeaways and action steps.
2. TOPIC CONSISTENCY: Summarize key ${analysis.topic} concepts and provide actionable takeaways.
3. RESOURCE URL REQUIREMENTS:
   - Choose 2 DIFFERENT URLs (not same URL twice)
   - BOTH URLs must match ${analysis.topic} OR be general cybersecurity
   - NEVER mix topics (e.g., NEVER use phishing URL for deepfake training)
   - If topic has only 1 specific URL, second URL must be general
   - APPROVED URLs (copy EXACTLY with https://):
     * Phishing: https://www.cisa.gov/secure-our-world/recognize-and-report-phishing
     * Phishing (technical): https://www.cisa.gov/resources-tools/resources/phishing-guidance-stopping-attack-cycle-phase-one
     * Deepfake/AI: https://www.cisa.gov/ai
     * Password: https://www.cisa.gov/secure-our-world/use-strong-passwords
     * MFA: https://www.cisa.gov/secure-our-world/turn-mfa
     * Ransomware: https://www.cisa.gov/stopransomware
     * General: https://www.cisa.gov/secure-our-world
     * General: https://www.cisa.gov/cybersecurity
   - Match title to URL content
   - DO NOT modify URLs, copy exactly`;
}