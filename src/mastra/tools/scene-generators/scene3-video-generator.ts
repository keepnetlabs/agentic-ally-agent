import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';
import { selectVideoForTopic, generateVideoMetadata } from '../../utils/video-selector';
import transcriptDatabase from '../../data/transcript-database.json';


export async function generateVideoPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): Promise<{ prompt: string; videoUrl: string; transcript: string }> {
  const baseContext = buildBaseContext(analysis, microlearning);


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

  const prompt = `${baseContext}

Generate scene 3 (video scenario). IMPORTANT: Create actual content in ${analysis.language}, not placeholders or instructions. Follow this exact format:
{
  "3": {
    "iconName": "monitor-play",
    "title": "${videoMetadata.title}",
    "subtitle": "${videoMetadata.subtitle}",
    "callToActionText": "Continue",
    "key_message": [
      "Real case",
      "Output ONLY action phrase (2-3 words with -ING verb). Pattern: '[Verb-ing] [object]'. Match ${analysis.topic}. Examples: phishing→'Spotting threats' | deepfake→'Spotting fakes' | malware→'Spotting dangers' | password→'Securing accounts' | pretexting→'Spotting impersonators' | impersonation→'Verifying identities' | backup→'Protecting data' | incident response→'Following playbooks'.",
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
      "mainDescription": "Output ONLY description (5-8 words). Pattern: 'Short story of a real [threat/incident]'. Match ${analysis.topic}. Examples: phishing→'Short story of a real phishing attack' | deepfake→'Short story of a real deepfake incident' | pretexting→'Short story of a real pretexting attack' | impersonation→'Short story of a real impersonation incident' | backup→'Short story of a real data recovery case' | ransomware→'Short story of a real ransomware attack'.",
      "loadingLabel": "Loading transcript",
      "errorLabel": "Transcript could not be loaded",
      "videoPlayerLabel": "Scenario player",
      "mobileHintLabel": "Best experienced with audio"
    },
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