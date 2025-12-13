import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { buildContextData } from '../../../utils/prompt-builders/base-context-builder';
import { selectVideoForTopic, generateVideoMetadata } from '../../../utils/resolvers/video-selector';
import transcriptDatabase from '../../../data/transcript-database.json';


export async function generateVideoPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): Promise<{ prompt: string; videoUrl: string; transcript: string }> {
  const contextData = buildContextData(analysis, microlearning);


  // Select appropriate video using AI
  const selectedVideoUrl = await selectVideoForTopic(analysis);
  console.log(`🎬 Selected video URL: ${selectedVideoUrl}`);

  // Get base English transcript from database using selected video URL
  const baseEnglishTranscript = (transcriptDatabase as any)[selectedVideoUrl];
  console.log(`📝 Transcript found: ${baseEnglishTranscript ? 'YES' : 'NO'}`);

  const finalTranscript = baseEnglishTranscript ||
    "00:00:04.400 Default transcript content for this video is not available yet. This is a placeholder transcript for the selected security awareness video.";

  // Generate title and subtitle with AI awareness of topic and department
  const videoMetadata = await generateVideoMetadata(
    analysis.topic,
    analysis.language,
    analysis.department,
    finalTranscript
  );
  console.log(`📊 Video metadata generated: title="${videoMetadata.title}", subtitle="${videoMetadata.subtitle}"`);

  const prompt = `${contextData}

SCENE 3 - VIDEO SCENARIO (TOPIC-SPECIFIC PATTERNS):
Topic: ${analysis.topic} | Department: ${analysis.department || 'General'} | Language: ${analysis.language}

CRITICAL INSTRUCTIONS:
- Generate ONLY actual content in ${analysis.language}, NO placeholders, NO instructions
- **TITLE AND SUBTITLE ARE FIXED - DO NOT MODIFY OR GENERATE NEW ONES**
- Key messages follow topic-specific action patterns (NOT generic verbs)
- Aria descriptions are natural language, not templated instructions

KEY MESSAGE PATTERNS (output ONLY final text, not instructions):

THREAT topics (Phishing, Deepfake, Ransomware, Vishing, Malware, Social Engineering):
- Phishing: 'Spotting phishing' | 'Verifying sender' | 'Reporting email'
- Quishing: 'Spotting QR threats' | 'Verifying QR source' | 'Reporting QR code'
- Deepfake: 'Spotting fakes' | 'Verifying authenticity' | 'Reporting deepfake'
- Ransomware: 'Recognizing encryption' | 'Isolating systems' | 'Starting recovery'
- Vishing: 'Identifying impersonation' | 'Verifying caller identity' | 'Reporting fraud'
- Smishing: 'Spotting SMS threats' | 'Verifying message source' | 'Reporting SMS'
- Malware: 'Recognizing suspicious files' | 'Isolating infected systems' | 'Reporting malware'
- Social-Engineering: 'Recognizing manipulation' | 'Verifying requests' | 'Reporting attempts'

TOOL topics (Password, MFA, Backup, Encryption, Data Privacy):
- MFA: 'Enabling protection' or 'Testing recovery' or 'Securing access'
- Password: 'Securing accounts' or 'Using manager' or 'Enabling MFA'
- Backup: 'Verifying backup' or 'Testing restore' or 'Ensuring recovery'
- Encryption: 'Protecting data' or 'Encrypting files' or 'Securing transmission'

PROCESS topics (Incident Response, Decision Trees, Security Protocols, Playbooks, Checklists):
- Incident Response: 'Following protocol' or 'Executing response'
- Decision Trees: 'Applying framework' or 'Following procedure'
- Security Protocols: 'Implementing policy' or 'Following procedures'

For OTHER topics: action verb + object related to topic

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