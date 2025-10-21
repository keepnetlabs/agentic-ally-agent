import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';
import { getResourcesForScene8 } from '../../utils/url-resolver';

export function generateScene8Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  // Dynamically resolve topic-aware, category-aware resource URLs
  const resources = getResourcesForScene8(analysis);
  const urlsFormatted = resources
    .map((resource, index) => `${index + 1}. ${resource.title}: ${resource.url}`)
    .join('\n');

  return `${baseContext}

=== AUTHORITATIVE RESOURCE URLS (Dynamic: Topic-aware + Category-aware)

Topic: ${analysis.topic}
Category: ${analysis.category}
Resolution: NCSC (National Cyber Security Centre UK) - All verified URLs (200/301 status)

RECOMMENDED RESOURCES (Selected by url-resolver function - from database of 30+ URLs):
${urlsFormatted}

FALLBACK RESOLUTION LOGIC (3-Level Safety Net):
- Level 1: Topic-specific mapping (e.g., 'phishing' → NCSC Phishing guidance)
- Level 2: Category fallback (e.g., unknown topic + 'THREAT' → NCSC THREAT resources)
- Level 3: Generic fallback (NCSC Cyber Assessment Framework + main guidance hub)

All URLs guaranteed working (NCSC: 100% reliability)

Generate scene 8 (summary):
{
  "8": {
    "iconName": "trophy",
    "texts": {
      "downloadTrainingLogsText": "Localize 'Download Training Logs' into ${analysis.language}",
      "retryText": "Localize 'Retry' into ${analysis.language}",
      "completionTitle": "Return like 'Well done — you've completed the training' (max 8 words) in ${analysis.language}",
      "completionSubtitle": "Return like 'You've strengthened your skills' (max 8 words) in ${analysis.language}",
      "achievementsTitle": "Localize 'Your achievements' into ${analysis.language}",
      "actionPlanTitle": "Localize 'Next steps' into ${analysis.language}",
      "resourcesTitle": "Localize 'Additional resources' into ${analysis.language}",
      "motivationalTitle": "Motivational title (max 3 words, ${analysis.language})",
      "motivationalMessage": "Empowering message for ${analysis.topic} (${analysis.department}), max 12 words in ${analysis.language}",
      "saveAndFinish": "Localize 'Save and Finish' into ${analysis.language}",
      "savingText": "Localize 'Saving…' into ${analysis.language}",
      "finishedText": "Saved. You can now close this window' (max 10 words, ${analysis.language})",
      "finishErrorText": "LMS connection failed. Share the logs with your IT team (max 12 words, ${analysis.language})",
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
        "description": "Immediate action for ${analysis.topic} (${analysis.category}), topic-specific, max 12 words in ${analysis.language}"
      },
      {
        "title": "Localize 'This week' into ${analysis.language}. Output localized text directly, not instructions.",
        "description": "Team-focused action for ${analysis.topic} (${analysis.department}), max 10 words in ${analysis.language}"
      }
    ],
    "key_message": [
      "Message 1 for ${analysis.topic}, max 3 words in ${analysis.language}",
      "Message 2 for ${analysis.topic}, max 5 words in ${analysis.language}",
      "Message 3 for ${analysis.topic}, max 4 words in ${analysis.language}"
    ],
    "resources": [
      {
        "title": "Localize resource title for ${analysis.topic}, max 5 words in ${analysis.language}",
        "type": "URL",
        "url": "${resources[0]?.url}"
      },
      {
        "title": "Localize additional resources for ${analysis.topic}, max 5 words in ${analysis.language}",
        "type": "URL",
        "url": "${resources[1]?.url}"
      }
    ],
    "scene_type": "summary"
  }
}`;
}