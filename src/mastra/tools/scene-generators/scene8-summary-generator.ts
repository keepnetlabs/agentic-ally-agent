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
        "title": "Write title in ${analysis.language} matching URL content: 'NCSC Security Guidance' or 'CISA Cybersecurity Resources' or 'NIST Standards' (max 4 words)",
        "type": "URL",
        "url": "Choose URL that matches your title: https://www.ncsc.gov.uk/ (for NCSC titles) OR https://www.cisa.gov/cybersecurity (for CISA titles) OR https://www.nist.gov/cybersecurity (for NIST titles)"
      },
      {
        "title": "Write DIFFERENT title in ${analysis.language} matching a different authority: 'NCSC Guidance', 'CISA Resources', or 'NIST Standards' (max 4 words)",
        "type": "URL",
        "url": "Choose URL matching your title from remaining options: https://www.ncsc.gov.uk/ OR https://www.cisa.gov/cybersecurity OR https://www.nist.gov/cybersecurity OR https://www.cisa.gov/topics"
      }
    ],
    "scene_type": "summary"
  }
}

CRITICAL:
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete takeaways and action steps.
2. TOPIC CONSISTENCY: Summarize key ${analysis.topic} concepts and provide actionable takeaways.
3. URL REQUIREMENTS: ONLY use these EXACT tested URLs (copy exactly with https://):
   - https://www.ncsc.gov.uk/
   - https://www.cisa.gov/cybersecurity
   - https://www.nist.gov/cybersecurity
   - https://www.cisa.gov/topics
   - https://www.cisa.gov/resources-tools
   Choose 2 DIFFERENT URLs. DO NOT modify URLs, copy exactly as listed.`;
}