import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';
import { getResourcesForScene8 } from '../../../utils/resolvers/url-resolver';
import { getLogger } from '../../../utils/core/logger';

export function generateScene8Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const logger = getLogger('Scene8SummaryGenerator');
  const contextData = buildContextData(analysis, microlearning);

  // Dynamically resolve resources using keyTopics (more accurate) + category fallback
  logger.info('Scene 8 - Resource Resolution Debug', {
    topic: analysis.topic,
    category: analysis.category,
    keyTopics: analysis.keyTopics
  });

  // Use isCodeTopic from analyze-user-prompt-tool (source of truth)
  const isCodeTopic = analysis.isCodeTopic === true;

  logger.info('isCode detection', { isCodeTopic, source: 'prompt analysis' });

  const resources = getResourcesForScene8({
    topic: analysis.topic,
    category: analysis.category,
    keyTopics: analysis.keyTopics, // Pass keyTopics for dynamic resolution
    department: analysis.department,
    language: analysis.language
  }, isCodeTopic); // Pass isCode flag to ensure DEVELOPMENT resources

  logger.info('Resources found', { resources: resources.map(r => r.title).join(', ') });

  // Embed resources as JSON (not instructions) - AI cannot modify URLs
  const resourcesJson = JSON.stringify(
    resources.slice(0, 2).map(r => ({
      title: r.title,
      type: "URL",
      url: r.url
    }))
  );

  return `${contextData}

CRITICAL RULES:
1. Use ONLY the resources provided below - NEVER generate, invent, or suggest alternatives
2. Translate resource "title" values to ${analysis.language} naturally (max 5 words, keep concise)
3. NEVER change "type" (keep as "URL") or "url" values - only translate titles
4. Resource titles must be topic-specific and natural in ${analysis.language}

Topic: ${analysis.topic}
Language: ${analysis.language}
isCodeTopic: ${analysis.isCodeTopic}

⚠️ RESOURCES TRANSLATION (CRITICAL):
- The "resources" array below contains resource objects with "title", "type", and "url" fields
${analysis.language.toLowerCase().startsWith('en')
      ? '- If language is English, keep resource "title" values EXACTLY as provided - do NOT translate or modify'
      : `- Translate each resource "title" to ${analysis.language} naturally (max 5 words, keep concise and topic-specific)
- Write titles naturally in ${analysis.language} as a native speaker would - do NOT literally translate word-by-word
- Example: English "Phishing Detection Guide" → Turkish "Oltalama Tespit Rehberi" (natural, not literal)`}
- NEVER change "type" (keep as "URL") or "url" values - only translate titles if language is NOT English

Generate scene 8 (summary):
{
  "8": {
    "iconName": "trophy",
    "texts": {
      "downloadTrainingLogsText": "Localize 'Download Training Logs' into ${analysis.language}",
      "retryText": "Localize 'Retry' into ${analysis.language}",
      "completionTitle": "Return like 'Well done — you've completed the training' (max 8 words) in ${analysis.language}",
      "completionSubtitle": "Topic-specific awareness completion. REFERENCE: Phishing='You've refreshed your phishing awareness' | Quishing='You've sharpened your QR code detection' | Ransomware='You've learned recovery procedures' | Deepfake='You've strengthened your verification skills' | MFA='You've secured your account protection'. Generate: 'You've [verb] your ${analysis.topic} [awareness/skills/knowledge]' (max 8 words) in ${analysis.language}",
      "achievementsTitle": "Localize 'Your achievements' into ${analysis.language}",
      "actionPlanTitle": "Localize 'Next steps' into ${analysis.language}",
      "resourcesTitle": "Localize 'Additional resources' into ${analysis.language}",
      "motivationalTitle": "Motivational title (max 3 words). REFERENCE: 'Stay alert' | 'Stay vigilant' | 'Keep safe' in ${analysis.language}",
      "motivationalMessage": "Organizational benefit message (generic, works for ANY topic). Pattern: '[Action/Training] helps keep your organisation [safer/secure/protected]'. Max 12 words in ${analysis.language}. Example: 'Completing this training helps keep your organisation safer.'",
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
      "completionLabel": "Localize 'Completion' into ${analysis.language}",
      "certificateTitle": "Localize 'Certificate of Completion' into ${analysis.language}",
      "certificateAwardedText": "Localize 'This certificate is awarded to' into ${analysis.language}",
      "certificateCompletionText": "Localize 'for successful completion of' into ${analysis.language}",
      "certificateDateText": "Localize 'on' into ${analysis.language}",
      "downloadTrainingLogsText": "Localize 'Download Training Logs' into ${analysis.language}",
    },
    "immediateActions": [
      {
        "title": "Localize 'Do now' into ${analysis.language}. Output localized text directly, not instructions.",
        "description": "Tool-specific immediate action. Pattern: 'Use [tool/button] the next time [situation]'. REFERENCE: Phishing='Use the Report button the next time something looks suspicious' | Quishing='Use the Report button when you see a suspicious QR' | Ransomware='Isolate the system the next time encryption signs appear'. Max 12 words in ${analysis.language}"
      },
      {
        "title": "Localize 'This week' into ${analysis.language}. Output localized text directly, not instructions.",
        "description": "Social/behavioral action. Pattern: 'Encourage [audience] to [action]'. REFERENCE: Phishing='Encourage your team to report suspicious emails' | Quishing='Teach colleagues to verify QR codes' | Ransomware='Share recovery procedures with your team'. Max 10 words in ${analysis.language}"
      }
    ],
    "key_message": [
      "Meta-level completion message (generic, same for ALL topics). Max 3 words in ${analysis.language}. REFERENCE: 'Training completed'",
      "Meta-level application message (generic, same for ALL topics). Max 5 words in ${analysis.language}. REFERENCE: 'Apply what you've practised'",
      "Meta-level social message (generic, same for ALL topics). Max 4 words in ${analysis.language}. REFERENCE: 'Share and encourage others'"
    ],
    "resources": ${resourcesJson},
    "scientific_basis": "Summary – Consolidation: Review reinforces learning and provides closure.",
    "scene_type": "summary"
  }
}`;
}