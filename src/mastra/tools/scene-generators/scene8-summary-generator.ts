import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildContextData } from '../../utils/prompt-builders/base-context-builder';
import { getResourcesForScene8 } from '../../utils/url-resolver';

export function generateScene8Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  // Dynamically resolve resources using keyTopics (more accurate) + category fallback
  console.log('🔍 Scene 8 - Resource Resolution Debug:');
  console.log('  Topic:', analysis.topic);
  console.log('  Category:', analysis.category);
  console.log('  keyTopics:', analysis.keyTopics);

  const resources = getResourcesForScene8({
    topic: analysis.topic,
    category: analysis.category,
    keyTopics: analysis.keyTopics, // Pass keyTopics for dynamic resolution
    department: analysis.department,
    language: analysis.language
  });

  console.log('  Resources found:', resources.map(r => r.title).join(', '));

  const urlsFormatted = resources
    .map((resource, index) => `${index + 1}. ${resource.title}: ${resource.url}`)
    .join('\n');

  return `${contextData}

=== AUTHORITATIVE RESOURCE URLS (Dynamic: keyTopics-based Resolution)

Topic: ${analysis.topic}
Category: ${analysis.category}
Resolution Method: Smart keyTopics matching + category fallback

CRITICAL RULES:
1. Use ONLY the URLs below - NEVER generate, invent, or suggest alternatives
2. Localize resource titles into ${analysis.language} (max 5 words)
3. Keep descriptions concise and action-focused

RECOMMENDED RESOURCES:
${urlsFormatted}

Resolution Priority:
- Level 1: Match against keyTopics database
- Level 2: Category fallback (THREAT/TOOL/PROCESS resources)
- Level 3: Generic resources (NCSC Cyber Assessment Framework)

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
    "scientific_basis": "Summary – Consolidation: Review reinforces learning and provides closure.",
    "scene_type": "summary"
  }
}`;
}