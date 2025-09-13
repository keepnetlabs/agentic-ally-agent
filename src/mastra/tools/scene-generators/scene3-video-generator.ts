import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateVideoPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
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

  const baseEnglishTranscript = `00:00:04.400 security is always a top priority but an
00:00:07.919 experience I had last month made me
00:00:10.400 change my behavior one day during my
00:00:13.120 lunch break I received an email that
00:00:15.639 looked like it was from the finance
00:00:17.439 department it asked me to approve an
00:00:20.039 invoice something felt off the invoice
00:00:23.320 number was strange and there were a few
00:00:25.519 grammar mistakes thanks to my cyber
00:00:28.279 security training I quickly realized it
00:00:30.679 was a phishing attempt I thought someone
00:00:33.879 might fall for this but instead of
00:00:36.239 reporting it I moved on with my work
00:00:38.760 assuming it will catch it anyway a week
00:00:42.079 later our company announced a phishing
00:00:44.840 attack has led to a data breach exposing
00:00:47.680 customer information the email I had ignored was
00:00:51.559 part of that attack if I had reported it
00:00:54.719 the whole crisis might have been avoided
00:00:57.600 after the breach the company held a
00:00:59.600 meeting the IT team explained how the attack
00:01:03.199 happened and the damage it caused not
00:01:05.880 just reputational harm but also
00:01:08.320 financial loss I was shocked and felt
00:01:11.280 guilty a simple secure reporting
00:01:14.119 behavior could have made all the
00:01:16.439 difference here's what I learned from
00:01:18.439 this experience don't assume someone
00:01:21.320 else will report it just do it if
00:01:24.119 everyone thinks the same way nothing
00:01:26.439 gets done we all share the
00:01:28.560 responsibility know your company's
00:01:30.960 reporting process if you're unsure ask it there are always tools to make
00:01:37.439 reporting easier never underestimate
00:01:40.399 phishing attacks even one fake email can
00:01:43.439 put the entire company at risk after
00:01:46.560 this incident I realized that combating
00:01:49.079 cyber attacks is only possible when
00:01:51.439 everyone practices secure
00:01:53.640 behaviors identifying a phishing email
00:01:56.520 isn't enough you have to take action
00:02:00.000 but`;

  const isEnglish = analysis.language.toLowerCase() === 'english' || analysis.language === 'en';
  const transcriptContent = isEnglish ? baseEnglishTranscript : `CRITICAL: Translate ONLY the text content, NEVER modify timestamps. Use actual line breaks, NOT \\n characters.

EXAMPLE FORMAT (each line on separate line):
00:00:04.400 [translated text here]
00:00:07.919 [translated text here]
00:00:10.400 [translated text here]

TRANSLATE TO ${analysis.language.toUpperCase()}:
${baseEnglishTranscript}

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
      // Check if line has timestamp format
      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+(.*)$/);
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
      "src": "https://customer-0lll6yc8omc23rbm.cloudflarestream.com/5fdb12ff1436c991f50b698a02e2faa1/manifest/video.m3u8",
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