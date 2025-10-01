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

  return `${baseContext}

Generate scene 3 (video scenario). IMPORTANT: Create actual content in ${analysis.language}, not placeholders or instructions. Follow this exact format:
{
  "3": {
    "iconName": "monitor-play",
    "title": "Write title (3-5 words) using pattern 'Real [Threat/Topic] Story' or 'Real [Topic] Case'. MUST use correct terminology for ${analysis.topic}. Examples: Phishing→'Real Phishing Attack', Deepfake→'Real Deepfake Incident', Malware→'Real Malware Attack', Backup/Ransomware→'Real Ransomware Attack' or 'Real Data Recovery Story' (NOT 'Real Ransomware Backups Story'). Use proper grammar.",
    "subtitle": "A ${randomJobTitle}'s costly mistake",
    "callToActionText": "Continue",
    "key_message": [
      "Real case",
      "Write action phrase (2-3 words) for ${analysis.topic}. Pattern: '[Action] [object]'. Examples: Phishing→'Recognising threats', Deepfake→'Detecting fakes', Malware→'Spotting dangers', Password→'Securing accounts', Backup/Ransomware→'Protecting data' or 'Recovering systems' (NOT 'Spotting backups'). Use action verbs.",
      "Why it matters"
    ],
    "video": {
      "src": "${selectedVideoUrl}",
      "poster": null,
      "disableForwardSeek": false,
      "showTranscript": true,
      "transcriptTitle": "Transcript",
      "transcriptLanguage": "English",
      "transcript": "${finalTranscript}"
    },
    "texts": {
      "transcriptLoading": "Loading transcript…",
      "ctaLocked": "Watch to continue",
      "ctaUnlocked": "Continue"
    },
    "ariaTexts": {
      "mainLabel": "Scenario video",
      "mainDescription": "Write description (5-8 words) for ${analysis.topic}. Pattern: 'Short story of a real [threat/incident]'. Examples: Phishing→'Short story of a real phishing attack', Deepfake→'Short story of a real deepfake incident', Backup/Ransomware→'Short story of a real ransomware attack' or 'real data recovery case' (NOT 'real backups case'). Use proper grammar.",
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
4. Do NOT output instructions or placeholders - output final content directly
5. TERMINOLOGY: Use correct grammar for compound topics (e.g., 'Real Ransomware Attack' NOT 'Real Ransomware Backups Story')`;
}