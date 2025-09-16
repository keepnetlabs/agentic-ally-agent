import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';
import { selectVideoForTopic } from '../../utils/video-selector';
import transcriptDatabase from '../../data/transcript-database.json';


export async function generateVideoPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): Promise<string> {
  const baseContext = buildBaseContext(analysis, microlearning);

  // Dynamic job titles based on department
  const jobTitles: Record<string, string[]> = {
    'IT': ['IT Administrator', 'DevOps Manager', 'System Analyst', 'Network Engineer'],
    'HR': ['HR Manager', 'Recruitment Specialist', 'People Operations Lead', 'HR Director'],
    'Sales': ['Sales Manager', 'Account Executive', 'Business Developer', 'Sales Director'],
    'Finance': ['Finance Director', 'Accounting Manager', 'Financial Analyst', 'CFO'],
    'Operations': ['Operations Manager', 'Project Manager', 'Team Lead', 'VP Operations'],
    'Management': ['Department Head', 'Senior Manager', 'Executive', 'Director'],
    'All': ['Marketing Manager', 'Project Coordinator', 'Team Leader', 'Department Manager']
  };

  const departmentKey = analysis.department || 'All';
  const selectedTitles = jobTitles[departmentKey] || jobTitles['All'];
  const randomJobTitle = selectedTitles[Math.floor(Math.random() * selectedTitles.length)];

  // Select appropriate video using AI
  const selectedVideoUrl = await selectVideoForTopic(analysis);
  console.log(`🎬 Selected video URL: ${selectedVideoUrl}`);

  // Get base English transcript from database using selected video URL
  const baseEnglishTranscript = (transcriptDatabase as any)[selectedVideoUrl];
  console.log(`📝 Transcript found: ${baseEnglishTranscript ? 'YES' : 'NO'}`);

  const finalTranscript = baseEnglishTranscript ||
    "00:00:04.400 Default transcript content for this video is not available yet. This is a placeholder transcript for the selected security awareness video.";

  const isEnglish = analysis.language.toLowerCase() === 'english' || analysis.language === 'en';
  const transcriptContent = isEnglish ? finalTranscript : `CRITICAL: Translate ONLY the text content, NEVER modify timestamps. Use actual line breaks, NOT \\n characters.

EXAMPLE FORMAT (each line on separate line):
00:00:04.400 [translated text here]
00:00:07.919 [translated text here]
00:00:10.400 [translated text here]

TRANSLATE TO ${analysis.language.toUpperCase()}:
${finalTranscript}

RULES:
- Keep ALL timestamps exactly: 00:00:04.400 format
- Translate ONLY text after each timestamp
- Each timestamp+text must be on its own line (use actual line breaks)
- NO \\n characters - use real line breaks
- NO additional formatting or markdown
- Output must have proper line structure like the source`;

  // Transcript validation function
  const validateTranscript = (transcript: string): string => {
    // First, clean up the transcript by replacing literal \n with actual newlines
    let cleanedTranscript = transcript.replace(/\\n/g, '\n');

    const lines = cleanedTranscript.split('\n');
    const validatedLines = lines.map(line => {
      // Check if line has timestamp format (both 00:00:00 and 00:00:00.000 formats)
      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(.*)$/);
      if (timestampMatch) {
        return line; // Keep as is if properly formatted
      }
      // If line doesn't have timestamp, skip it
      return null;
    }).filter(line => line !== null);

    return validatedLines.join('\n');
  };

  return `${baseContext}

SCENARIO SCENE STANDARDIZATION (scene_id: "3"):
- Title: "Real [Topic] Story" format - translate completely to target language
- Subtitle: "[Role]'s [consequence] mistake" format - use target language entirely  
- Key messages: All in target language, no mixed languages
- CallToAction: Use target language ("Continue" → "Devam Et", "Continuar", etc.)

Generate scene 3 (video scenario). IMPORTANT: Create actual content, not placeholders or instructions. Follow this exact format:
{
  "3": {
    "iconName": "monitor-play",
    "title": "Real ${analysis.topic} Story",
    "subtitle": "A ${randomJobTitle}'s costly mistake",
    "callToActionText": "Continue",
    "key_message": [
      "Real case",
      "Spotting ${analysis.topic.toLowerCase()}",
      "Why it matters"
    ],
    "video": {
      "src": "${selectedVideoUrl}",
      "poster": null,
      "disableForwardSeek": false,
      "showTranscript": true,
      "transcriptTitle": "Transcript",
      "transcriptLanguage": "${isEnglish ? 'English' : analysis.language}",
      "transcript": "${validateTranscript(transcriptContent)}"
    },
    "texts": {
      "transcriptLoading": "Loading transcript…",
      "ctaLocked": "Watch to continue", 
      "ctaUnlocked": "Continue"
    },
    "ariaTexts": {
      "mainLabel": "Scenario video",
      "mainDescription": "Short story of a real ${analysis.topic.toLowerCase()} case",
      "loadingLabel": "Loading transcript",
      "errorLabel": "Transcript could not be loaded",
      "videoPlayerLabel": "Scenario player",
      "mobileHintLabel": "Best experienced with audio"
    },
    "scene_type": "scenario"
  }
}

CRITICAL: Use EXACTLY these keys and values. ${isEnglish ? 'Use English transcript as-is.' : 'Translate transcript content while keeping timestamps.'}`;
}