import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';
import { selectVideoForTopic, generateVideoMetadata } from '../../../utils/resolvers/video-selector';
import transcriptDatabase from '../../../data/transcript-database.json';
import { getLogger } from '../../../utils/core/logger';


export async function generateVideoPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): Promise<{ prompt: string; videoUrl: string; transcript: string }> {
  const logger = getLogger('Scene3VideoGenerator');
  const contextData = buildContextData(analysis, microlearning);


  // Select appropriate video using AI
  const selectedVideoUrl = await selectVideoForTopic(analysis);
  logger.info('Selected video URL', { selectedVideoUrl });

  // Get base English transcript from database using selected video URL
  const baseEnglishTranscript = (transcriptDatabase as any)[selectedVideoUrl];
  logger.info('Transcript found', { found: baseEnglishTranscript ? 'YES' : 'NO' });

  const finalTranscript = baseEnglishTranscript ||
    "00:00:04.400 Default transcript content for this video is not available yet. This is a placeholder transcript for the selected security awareness video.";

  // Generate title and subtitle with AI awareness of topic and department
  const videoMetadata = await generateVideoMetadata(
    analysis.topic,
    analysis.language,
    analysis.department,
    finalTranscript
  );
  logger.info('Video metadata generated', { title: videoMetadata.title, subtitle: videoMetadata.subtitle });

  const prompt = `${contextData}

SCENE 3 - VIDEO SCENARIO (TOPIC-SPECIFIC PATTERNS):
Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

CRITICAL INSTRUCTIONS:
- Generate ONLY actual content in ${analysis.language}, NO placeholders, NO instructions
- **TITLE AND SUBTITLE ARE FIXED - DO NOT MODIFY OR GENERATE NEW ONES**
- Aria descriptions are natural language, not templated instructions

Generate scene 3 (video scenario). IMPORTANT: Create actual content in ${analysis.language}, not placeholders or instructions. **USE THESE EXACT VALUES FOR TITLE AND SUBTITLE - THEY ARE PRE-GENERATED AND FINAL:**

Title: "${videoMetadata.title}"
Subtitle: "${videoMetadata.subtitle}"

Follow this exact format:
{
  "3": {
    "iconName": "monitor-play",
    "title": "${videoMetadata.title}",
    "subtitle": "${videoMetadata.subtitle}",
    "callToActionText": "Continue",
    "key_message": [
      "Real case",
      "Action phrase (2-3 words, -ING verb). Topic: ${analysis.topic}. Examples from patterns above. Reference: Phishing→'Spotting threats' | Deepfake→'Spotting fakes' | Ransomware→'Recognizing signs' | MFA→'Enabling protection' | Password→'Securing accounts' | Vishing→'Identifying impersonation' | Incident Response→'Following protocol' | Security Protocols→'Implementing policy'",
      "Why it matters"
    ],
    "video": {
      "src": "PLACEHOLDER_VIDEO_URL",
      "poster": null,
      "disableForwardSeek": false,
      "showTranscript": true,
      "transcriptTitle": "Transcript",
      "transcriptLanguage": "English",
      "transcript": "PLACEHOLDER_TRANSCRIPT"
    },
    "texts": {
      "transcriptLoading": "Loading transcript…",
      "ctaLocked": "Watch to continue",
      "ctaUnlocked": "Continue"
    },
    "ariaTexts": {
      "mainLabel": "Scenario video",
      "mainDescription": "Scenario description (5-8 words) for ${analysis.topic}. Pattern by category: THREATS→'Short story of real [threat] attack' | TOOLS→'Short story of real [tool] implementation' | PROCESS→'Short story of real [process] execution'. Examples: Phishing→'Short story of real phishing attack' | Deepfake→'Short story of real deepfake incident' | MFA→'Short story of account security breach' | Incident Response→'Short story of real incident response' | Security Protocols→'Short story of real protocol implementation'",
      "loadingLabel": "Loading transcript",
      "errorLabel": "Transcript could not be loaded",
      "videoPlayerLabel": "Scenario player",
      "mobileHintLabel": "Best experienced with audio"
    },
    "scientific_basis": "Contextual Learning: Real-world context improves knowledge transfer.",
    "scene_type": "scenario"
  }
}

CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any
2. Output all text fields in ${analysis.language} (translate English template values)
3. Keep transcript in English (transcriptLanguage: "English")
4. Where you see "Output ONLY..." - return ONLY the final text, NO instructions, NO patterns, NO "Write..." directives
5. TERMINOLOGY: Use correct grammar for compound topics (e.g., 'Real Ransomware Attack' NOT 'Real Ransomware Backups Story')`;


  return {
    prompt,
    videoUrl: selectedVideoUrl,
    transcript: finalTranscript
  };
}