import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { PromptAnalysis } from '../types/prompt-analysis';
import { MicrolearningContent, LanguageContent } from '../types/microlearning';
import { GenerateLanguageJsonSchema, GenerateLanguageJsonOutputSchema } from '../schemas/generate-language-json-schema';
import { getAppTexts, getAppAriaTexts } from '../utils/app-texts';


export const generateLanguageJsonTool = new Tool({
  id: 'generate_language_json',
  description: 'Generate language-specific training content from microlearning.json metadata with rich context',
  inputSchema: GenerateLanguageJsonSchema,
  outputSchema: GenerateLanguageJsonOutputSchema,
  execute: async (context: any) => {
    const input = context?.inputData || context?.input || context;
    const { analysis, microlearning, model } = input;

    try {
      const languageContent = await generateLanguageJsonWithAI(analysis, microlearning, model);

      return {
        success: true,
        data: languageContent
      };

    } catch (error) {
      console.error('Language JSON generation failed:', error);

      return {
        success: false,
        error: (error as Error).message
      };
    }
  },
});

// Generate language-specific training content from microlearning.json metadata with rich context
async function generateLanguageJsonWithAI(analysis: PromptAnalysis, microlearning: MicrolearningContent, model: any): Promise<LanguageContent> {

  // Create 3 optimized prompts for parallel processing
  const analysisContext = JSON.stringify({
    language: analysis.language,
    topic: analysis.topic,
    title: analysis.title,
    department: analysis.department,
    level: analysis.level,
    category: analysis.category,
    subcategory: analysis.subcategory,
    learningObjectives: analysis.learningObjectives,
    industries: analysis.industries,
    roles: analysis.roles,
    keyTopics: analysis.keyTopics,
    practicalApplications: analysis.practicalApplications,
    assessmentAreas: analysis.assessmentAreas,
    customRequirements: analysis.customRequirements
  }, null, 2);

  const baseContext = `
Generate ${analysis.language} training content for "${analysis.topic}" in STRICT JSON only.

=== CONTEXT ===
- Level: ${analysis.level} | Department: ${analysis.department}
- Category: ${analysis.category}${analysis.subcategory ? ` / ${analysis.subcategory}` : ''}
- Objectives: ${analysis.learningObjectives.join(', ')}
- Rich Context: ${analysis.contextSummary || 'Standard training'}
- Custom Requirements: ${analysis.customRequirements || 'None'}
- Roles: ${(analysis.roles || []).join(', ') || 'All Roles'}
- Industries: ${(analysis.industries || []).join(', ') || 'General'}
- Key Topics: ${(analysis.keyTopics || []).join(', ')}
- Practical Applications: ${(analysis.practicalApplications || []).join(', ')}
- Assessment Areas: ${(analysis.assessmentAreas || []).join(', ')}

ANALYSIS CONTEXT (JSON):
${analysisContext}

SCIENTIFIC CONTEXT:
- Category: ${microlearning.microlearning_metadata.category}/${microlearning.microlearning_metadata.subcategory}
- Risk Area: ${microlearning.microlearning_metadata.risk_area}
- Learning Theories: ${Object.keys(microlearning.scientific_evidence?.learning_theories || {}).slice(0, 2).join(', ')}

=== GLOBAL RULES ===
1. **Topic Consistency**
   - Keep all content focused strictly on ${analysis.topic}.
   - Use consistent terminology and examples directly tied to ${analysis.topic}.
   - Avoid unrelated concepts, characters, or domains.

2. **Domain Guardrails**
   - Content must align with the given category/subcategory and key topics.
   - Security-specific terms (phishing, reporting, email) are allowed **only** if category/key topics explicitly mention them.
   - Choose Lucide icons semantically matched to topic/category. Never default to generic security icons unless explicitly relevant.

3. **Language & Style**
   - Write ALL text in \${analysis.language} with natural grammar and fluent phrasing.
   - Avoid literal/machine-like translation. Must sound native.
   - No brand/tool names unless explicitly present in analysis context.
   - Style: professional, concise, expert instructional designer tone. Behavior-focused, clear, and actionable.

4. **Structure & Quality**
   - Replace ALL placeholders with real, topic-specific content.
   - Keep JSON structure EXACTLY as provided (no extra keys, no omissions).
   - Each field must deliver practical, realistic learning content aligned with objectives.
   - Use short sentences, plain language, memory-friendly phrasing.

5. **Learning Science**
   - Integrate the listed learning theories into explanations (e.g., attention, memory, practice, reflection).
   - Show links between practical actions and durable learning.

=== CRITICAL ===
- Never leave placeholders like “clear benefit statement” or “concise point”.
- Never change scene_type values (must remain: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary).
- Output must be STRICT JSON only.
`;

  const introPrompt = `${baseContext}

SCENE STANDARDIZATION:

INTRO SCENE (scene_id: "1"):
- Title format: "Stop [Topic] Attacks" or similar action-oriented phrase
- Subtitle: "Learn to spot and report [topic] safely" format
- Highlights: Risk → Target → Solution structure with simple language
- Key messages: 3-4 word statements ("Topic is common", "Anyone can be targeted", "Simple steps help")
- Duration: "~5 minutes", Level: "Beginner"

GOAL SCENE (scene_id: "2"):
- Title: "Your Security Goal" (keep simple)
- Subtitle: "Next time you see a [topic situation], you will pause and report it" (max 12 words)
- Goals descriptions: Start with "Helps you..." format, keep benefit-focused and simple
- Key messages: Short, memorable phrases (max 6-7 words each)
- Avoid technical jargon, use plain language

LANGUAGE QUALITY:
- Write naturally in target language - avoid literal translations
- Level field: Use proper capitalization for the target language
- Key messages: Use complete, natural phrases (not fragments or keywords)
- Grammar: Follow native language patterns, not English word order
Generate scenes 1-2 (intro, goal) using ONLY these exact keys:

USE EXACTLY THESE KEYS BUT REPLACE PLACEHOLDERS WITH REAL CONTENT:
{
  "1": {
    "iconName": "Choose appropriate Lucide icon for ${analysis.topic}",
    "title": "Write 'Stop [${analysis.topic}] [issue-type]' format in ${analysis.language} (e.g., 'Stop Phishing Attacks', 'Stop Data Leaks', 'Improve Communication')",
    "subtitle": "Write 'Learn to [action] [${analysis.topic}] safely' format in ${analysis.language} (max 10 words)",
    "sectionTitle": "Translate 'What this training will help you with:' to ${analysis.language}",
    "highlights": [
      {"iconName": "alert-triangle", "text": "Write 'Know that [${analysis.topic}] [common-issue]' in ${analysis.language} (max 6 words)"},
      {"iconName": "users", "text": "Write 'Remember that anyone can be [affected]' in ${analysis.language} (max 7 words)"},
      {"iconName": "shield-check", "text": "Write 'See how simple steps [help]' in ${analysis.language} (max 6 words)"}
    ],
    "key_message": [
      "Write short ${analysis.topic} fact in ${analysis.language} (max 4 words)",
      "Write short vulnerability statement in ${analysis.language} (max 5 words)",
      "Write short solution statement in ${analysis.language} (max 5 words)"
    ],
    "duration": "~${Math.max(2, Math.round((microlearning.scenes?.reduce((total, scene) => total + (scene?.metadata?.duration_seconds || 30), 0) || 300) / 60))} minutes",
    "level": "Write the level name in ${analysis.language} for ${analysis.level}",
    "callToActionText": {
      "mobile": "Translate 'Swipe to get started' to ${analysis.language} using natural phrasing",
      "desktop": "Translate 'Click to get started' to ${analysis.language} using natural phrasing"
    },
    "texts": {
      "sceneLabel": "Intro scene",
      "sceneDescription": "${analysis.topic} introduction focused on awareness and practical benefits",
      "iconLabel": "Training icon",
      "titleLabel": "Training title",
      "subtitleLabel": "Training introduction",
      "cardLabel": "Learning overview card",
      "cardDescription": "Translate the static phrase 'What this training will help you with' into ${analysis.language} (natural phrasing only, do not expand or customize)",
      "highlightItemLabel": "Learning goal",
      "statsLabel": "Training details",
      "durationLabel": "Completion time",
      "levelLabel": "Difficulty level",
      "ctaLabel": "Start training",
      "sparkleLabel": "Decorative animation"
    },
    "scene_type": "intro",
    "points": 5,
    "duration_seconds": ${Math.round(microlearning.scenes[0]?.metadata.duration_seconds || 15)},
    "hasAchievementNotification": false,
    "scientific_basis": "Attention & salience: concise, relevant cues improve focus and memory.",
    "icon": {
      "sparkleIconName": "alert-triangle",
      "sceneIconName": "Use the same value as iconName"
    }
  },
  "2":  {
  "iconName": "target",
  "title": "Your ${analysis.topic} Goal",
  "subtitle": "In ${analysis.language}, write one short sentence in this format: 'Next time you see/encounter [${analysis.topic}-related situation], you will [specific safe action]'"
  "callToActionText": "Translate 'Continue' to ${analysis.language}",
  "goals": [
    {
      "iconName": "alert-triangle",
      "title": "Write simple recognition title for ${analysis.topic} in ${analysis.language}",
      "subtitle": "Pause and think",
      "description": "Write ONE short 'Helps you...' sentence in ${analysis.language} for recognizing ${analysis.topic} issues (keep under 12 words)"
    },
    {
      "iconName": "shield-check",
      "title": "Make the Right Decision",
      "subtitle": "Safe action",
      "description": "Write ONE short 'Helps you...' sentence in ${analysis.language} for safe ${analysis.topic} behavior (keep under 12 words)"
    },
    {
      "iconName": "flag",
      "title": "Write simple escalation title for ${analysis.topic} in ${analysis.language}",
      "subtitle": "Report button",
      "description": "Write ONE short 'Helps you...' sentence in ${analysis.language} for ${analysis.topic} escalation (keep under 12 words)"
    }
  ],
  "key_message": [
    "Write 3-5 word ${analysis.topic} recognition behavior in ${analysis.language}",
    "Write 5-7 word ${analysis.topic} safe action in ${analysis.language}",
    "Write 3-5 word ${analysis.topic} escalation behavior in ${analysis.language}"
  ],
  "texts": {},
  "scene_type": "goal",
  "points": 5,
  "duration_seconds": ${Math.round(microlearning.scenes[1]?.metadata.duration_seconds || 20)},
  "hasAchievementNotification": false,
  "scientific_basis": "Goal – Goal Activation + Relevance: Implementation intention language and goal priming. 'Next time X happens, you will Y' format bridges intention-action gap.",
  "icon": {
    "sceneIconName": "target"
  }
}
}

CRITICAL:
1. Use EXACTLY these keys. DO NOT add or remove keys. Keep the shown keys only (duration_seconds, points, hasAchievementNotification, scientific_basis, icon are allowed in Scene 1 as shown).
2. Replace ALL placeholders with real, ${analysis.topic}-specific content in ${analysis.language}. No generic filler.
3. Keep ALL content focused on ${analysis.topic}. Do not introduce unrelated concepts or characters.
4. SECURITY LANGUAGE: Use 'phishing', 'report', 'email security' and similar ONLY if the category/subcategory or key topics explicitly indicate Security; otherwise avoid them.
5. ICONS: Choose a Lucide icon that semantically matches the topic/category. Do not default to security icons unless Security is in scope.
6. STYLE: Professional, concise, behavior-focused. Highlights max 4–5 words each; use awareness language (“Know…”, “Remember…”, “See how…”). Avoid dramatic words (“instantly”, “danger strikes”, “lightning-fast”, “superpower”).
7. Match ${analysis.level} complexity for ${(analysis.roles || []).join('/') || 'all roles'} audience. Keep realistic and achievable, not action-movie style.

Return STRICT JSON ONLY.
`;

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

  // Topic-based resource URL mapping
  const getTopicResources = (topic: string, category: string) => {
    const topicKey = topic.toLowerCase();
    const categoryKey = category.toLowerCase();
    
    const resourceMap: Record<string, Array<{title: string, url: string}>> = {
      // Security topics
      phishing: [
        { title: "CISA Anti-Phishing Guide", url: "https://www.cisa.gov/cybersecurity" },
        { title: "NCSC Phishing Guidance", url: "https://www.ncsc.gov.uk/cyber-security" }
      ],
      smishing: [
        { title: "FTC SMS Scam Protection", url: "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams" },
        { title: "CISA Mobile Security", url: "https://www.cisa.gov/cybersecurity" }
      ],
      vishing: [
        { title: "FCC Phone Scam Guide", url: "https://www.fcc.gov/consumers/guides/spoofing-and-caller-id" },
        { title: "CISA Voice Security", url: "https://www.cisa.gov/cybersecurity" }
      ],
      ransomware: [
        { title: "CISA Ransomware Guide", url: "https://www.cisa.gov/cybersecurity" },
        { title: "NCSC Ransomware Response", url: "https://www.ncsc.gov.uk/cyber-security" }
      ],
      password: [
        { title: "NIST Password Guidelines", url: "https://www.nist.gov/cybersecurity" },
        { title: "CISA Password Security", url: "https://www.cisa.gov/cybersecurity" }
      ],
      "data protection": [
        { title: "NIST Data Security Framework", url: "https://www.nist.gov/cybersecurity" },
        { title: "CISA Data Protection", url: "https://www.cisa.gov/cybersecurity" }
      ],
      malware: [
        { title: "CISA Malware Prevention", url: "https://www.cisa.gov/cybersecurity" },
        { title: "NCSC Malware Guide", url: "https://www.ncsc.gov.uk/cyber-security" }
      ],
      
      // Business topics
      communication: [
        { title: "Harvard Business Communication", url: "https://hbr.org" },
        { title: "SHRM Communication Skills", url: "https://www.shrm.org" }
      ],
      leadership: [
        { title: "Harvard Leadership Guide", url: "https://hbr.org" },
        { title: "SHRM Leadership Development", url: "https://www.shrm.org" }
      ],
      "team management": [
        { title: "SHRM Team Management", url: "https://www.shrm.org" },
        { title: "Harvard Team Leadership", url: "https://hbr.org" }
      ],
      "project management": [
        { title: "PMI Best Practices", url: "https://www.pmi.org" },
        { title: "Harvard Project Leadership", url: "https://hbr.org" }
      ],
      
      // Finance topics
      compliance: [
        { title: "SEC Compliance Guide", url: "https://www.sec.gov" },
        { title: "Investopedia Compliance", url: "https://www.investopedia.com" }
      ],
      "financial reporting": [
        { title: "SEC Reporting Standards", url: "https://www.sec.gov" },
        { title: "Investopedia Financial Reports", url: "https://www.investopedia.com" }
      ],
      
      // Tech topics
      "software security": [
        { title: "OWASP Security Guide", url: "https://owasp.org" },
        { title: "NIST Cybersecurity Framework", url: "https://www.nist.gov/cybersecurity" }
      ],
      "web security": [
        { title: "OWASP Top 10", url: "https://owasp.org" },
        { title: "CISA Web Security", url: "https://www.cisa.gov/cybersecurity" }
      ]
    };
    
    // Try exact topic match first
    if (resourceMap[topicKey]) {
      return resourceMap[topicKey];
    }
    
    // Try partial matches
    const partialMatch = Object.keys(resourceMap).find(key => 
      topicKey.includes(key) || key.includes(topicKey)
    );
    if (partialMatch) {
      return resourceMap[partialMatch];
    }
    
    // Category-based fallback
    if (categoryKey.includes('security') || categoryKey.includes('cyber')) {
      return [
        { title: "CISA Cybersecurity Resources", url: "https://www.cisa.gov/cybersecurity" },
        { title: "NCSC Security Guidance", url: "https://www.ncsc.gov.uk/cyber-security" }
      ];
    }
    
    if (categoryKey.includes('business') || categoryKey.includes('management')) {
      return [
        { title: "Harvard Business Resources", url: "https://hbr.org" },
        { title: "SHRM Professional Development", url: "https://www.shrm.org" }
      ];
    }
    
    if (categoryKey.includes('finance') || categoryKey.includes('compliance')) {
      return [
        { title: "SEC Resources", url: "https://www.sec.gov" },
        { title: "Investopedia Education", url: "https://www.investopedia.com" }
      ];
    }
    
    if (categoryKey.includes('tech') || categoryKey.includes('development')) {
      return [
        { title: "OWASP Security Resources", url: "https://owasp.org" },
        { title: "NIST Technology Guidelines", url: "https://www.nist.gov/cybersecurity" }
      ];
    }
    
    // Default fallback
    return [
      { title: "Professional Development Resources", url: "https://www.coursera.org" },
      { title: "Industry Best Practices", url: "https://www.skillsoft.com" }
    ];
  };

  const departmentKey = analysis.department || 'All';
  const selectedTitles = jobTitles[departmentKey] || jobTitles['All'];
  const randomJobTitle = selectedTitles[Math.floor(Math.random() * selectedTitles.length)];

  const videoPrompt = `${baseContext}

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

  const mainPrompt = `${baseContext}

Generate scenes 4-6 (actionable, quiz, survey):
{
  "4": {
    "iconName": "mail-check", 
    "title": "Practice ${analysis.topic} Detection",
    "subtitle": "Write short, action-oriented subtitle in ${analysis.language} using simple verbs (example: 'Check emails, spot threats, and report safely', 'Review messages, find risks, stay protected')",
    "callToActionText": "Translate 'Start Practice' to ${analysis.language}",
    "successCallToActionText": "Translate 'Continue' to ${analysis.language}",
    "key_message": [
      "Write key action 1 in ${analysis.language} specific to ${analysis.topic}",
      "Write key action 2 in ${analysis.language} specific to ${analysis.topic}", 
      "Write key action 3 in ${analysis.language} specific to ${analysis.topic}"
    ],
    "actions": [
      {
        "iconName": "mail",
        "title": "Write action title in ${analysis.language} for ${analysis.topic} step 1",
        "description": "Write description in ${analysis.language} for first ${analysis.topic} action",
        "tip": "Write tip in ${analysis.language} specific to ${analysis.topic} warning signs"
      },
      {
        "iconName": "alert-triangle", 
        "title": "Write action title in ${analysis.language} for ${analysis.topic} step 2",
        "description": "Write description in ${analysis.language} for second ${analysis.topic} action",
        "tip": "Write tip in ${analysis.language} for ${analysis.topic} prevention"
      },
      {
        "iconName": "flag",
        "title": "Write action title in ${analysis.language} for ${analysis.topic} step 3",
        "description": "Write description in ${analysis.language} for third ${analysis.topic} action",
        "tip": "Write tip in ${analysis.language} for ${analysis.topic} reporting process"
      }
    ],
    "tipConfig": {
      "iconName": "info"
    },
    "texts": {
      "mobileHint": "💡 Open the email. If it looks suspicious, press Report.",
      "feedbackCorrect": "✅ Good job — reporting helps protect everyone.",
      "feedbackWrong": "⚠️ Not quite right — this email looks safe. Try again."
    },
    "scene_type": "actionable_content"
  },
  "5": {
    "iconName": "brain",
    "title": "Test Your Knowledge",
    "subtitle": "Make the right decision when it matters most",
    "callToActionText": "Translate 'Answer to Continue' to ${analysis.language}",
    "quizCompletionCallToActionText": "Translate 'Continue' to ${analysis.language}",
    "key_message": [
      "Answer the questions",
      "Check your knowledge", 
      "Build the right habit"
    ],
    "questions": {
      "totalCount": 2,
      "maxAttempts": 10,
      "list": [
        {
          "id": "report-scenario",
          "type": "multiple_choice",
          "title": "${analysis.topic} scenario with suspicious communication",
          "description": "You receive an unexpected ${analysis.topic.toLowerCase()} attempt. The sender name looks legitimate, but something feels suspicious. What is the safest next step?",
          "options": [
            {
              "id": "engage",
              "text": "Engage with the suspicious communication",
              "isCorrect": false
            },
            {
              "id": "reply",
              "text": "Reply to the sender to ask if it's genuine", 
              "isCorrect": false
            },
            {
              "id": "report",
              "text": "Use the Report button so IT can investigate",
              "isCorrect": true
            },
            {
              "id": "ignore",
              "text": "Ignore and delete the message",
              "isCorrect": false
            }
          ],
          "explanation": "Using the Report button helps the security team act quickly and protect others. Avoid engaging with suspicious communications."
        },
        {
          "id": "delete-vs-report", 
          "type": "true_false",
          "title": "Delete or report?",
          "statement": "If a communication looks suspicious, deleting it is enough.",
          "correctAnswer": false,
          "options": {
            "true": {
              "label": "True",
              "icon": "check"
            },
            "false": {
              "label": "False", 
              "icon": "x"
            }
          },
          "explanation": "Reporting helps IT spot wider attacks, warn colleagues and remove similar threats. Deleting only helps you."
        }
      ]
    },
    "texts": {
      "question": "Question",
      "nextQuestion": "Next question",
      "nextSlide": "Next slide", 
      "retryQuestion": "Try again",
      "quizCompleted": "Quiz completed 🎉",
      "correctAnswer": "Correct — well done 🎉",
      "wrongAnswer": "✖ Not quite right",
      "attemptsLeft": "attempts left",
      "noAttemptsLeft": "no attempts left",
      "checkAnswer": "Check answer",
      "evaluating": "Checking…",
      "completeEvaluation": "Finish review",
      "mobileInstructions": "📱 Mobile: select the option that best answers the question",
      "desktopInstructions": "🖥️ Desktop: click the option that best answers the question",
      "options": "Options",
      "explanation": "Explanation",
      "tips": "💡 Tips",
      "mobileHint": "💡 Read the question carefully before you answer",
      "quizCompletionHint": "Complete the quiz to continue"
    },
    "ariaTexts": {
      "mainLabel": "Quiz interface",
      "mainDescription": "Interactive quiz with multiple question types and real-time feedback",
      "headerLabel": "Quiz title", 
      "questionLabel": "Question content",
      "questionDescription": "Current question with answer options",
      "multipleChoiceLabel": "Multiple-choice options",
      "multipleChoiceDescription": "Select one answer from the available options",
      "trueFalseLabel": "True or false options",
      "trueFalseDescription": "Select true or false for the statement",
      "resultPanelLabel": "Result and explanation",
      "resultPanelDescription": "Feedback on your answer with explanation and tips",
      "explanationLabel": "Explanation section",
      "navigationLabel": "Question navigation",
      "nextQuestionLabel": "Go to next question",
      "retryQuestionLabel": "Retry this question",
      "checkAnswerLabel": "Check your answer",
      "correctAnswerLabel": "Correct answer",
      "incorrectAnswerLabel": "Not quite right",
      "attemptsLeftLabel": "Remaining attempts",
      "quizCompletedLabel": "Quiz successfully completed"
    },
    "scene_type": "quiz"
  },
  "6": {
    "iconName": "list-checks",
    "title": "Share Your Experience",
    "subtitle": "Help us improve your training experience",
    "texts": {
      "ratingQuestion": "How confident do you feel about ${analysis.topic.toLowerCase()} security now?",
      "topicsQuestion": "Which areas would you like more practice or examples on?",
      "feedbackQuestion": "Any other feedback to help us improve?",
      "feedbackPlaceholder": "Type your thoughts here…",
      "submitButton": "Submit",
      "submittingText": "Submitting…",
      "submittedText": "Submitted", 
      "ratingRequiredText": "Please select a rating before you submit.",
      "dataSecurityNotice": "Your responses are anonymous and protected.",
      "successTitle": "Thank you",
      "successMessage1": "Thanks for your feedback.",
      "successMessage2": "Your rating will help us improve this training.",
      "successMessage3": "Keep building your security awareness.",
      "thankYouMessage": "Stay safe."
    },
    "ariaTexts": {
      "mainLabel": "Confidence and feedback form",
      "successDescription": "Form submitted successfully. Thank you for your input.",
      "successRegionLabel": "Success message",
      "successIconLabel": "Checkmark icon",
      "formDescription": "Confidence rating, topics to improve and a free text area.",
      "headerLabel": "Form title",
      "formContentDescription": "Star rating, topic selections and text entry",
      "ratingDescription": "Select your confidence level about ${analysis.topic.toLowerCase()} security",
      "starLabel": "star",
      "topicsDescription": "Choose topics for additional practice",
      "submitLabel": "Submit button",
      "securityNoticeLabel": "Data privacy note"
    },
    "topics": [
      "Suspicious ${analysis.topic.toLowerCase()} indicators",
      "Using the Report button",
      "Verifying sender authenticity",
      "Safe response procedures"
    ],
    "scene_type": "survey"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Use actual quiz questions and survey items.
2. TOPIC CONSISTENCY: Keep all quiz content focused on ${analysis.topic} learning objectives.`;

  const closingPrompt = `${baseContext}

Generate scenes 7-8 (nudge, summary):
{
  "7": {
    "iconName": "repeat",
    "subtitle": "Your action plan to stay safe from ${analysis.topic.toLowerCase()}",
    "callToActionText": "Translate 'Continue' to ${analysis.language}",
    "texts": {
      "title": "Action Plan",
      "subtitle": "Next time you encounter ${analysis.topic.toLowerCase()} situation, you will do this:",
      "actionsTitle": "Your next steps"
    },
    "key_message": [
      "Write context-appropriate action #1 in ${analysis.language} for ${analysis.topic} - MAXIMUM 5 words (Security topics: 'Recognise suspicious emails', Writing topics: 'Write clear subject lines', Password topics: 'Use strong passwords', Data topics: 'Protect sensitive information')",
      "Write context-appropriate action #2 in ${analysis.language} for ${analysis.topic} - MAXIMUM 8 words (Security: 'Don't click suspicious links', Writing: 'Use professional tone and format', Password: 'Don't reuse old passwords', Data: 'Don't share confidential data')",
      "Write context-appropriate action #3 in ${analysis.language} for ${analysis.topic} - MAXIMUM 5 words (Security: 'Report suspicious activity', Writing: 'Proofread before sending', Password: 'Use password manager', Data: 'Follow data policies')"
    ],
    "scene_type": "nudge"
  },
  "8": {
    "iconName": "trophy",
    "texts": {
      "downloadTrainingLogsText": "Download Training Logs",
      "retryText": "Retry",
      "completionTitle": "Well done — you've completed the training",
      "completionSubtitle": "You've refreshed your ${analysis.topic.toLowerCase()} awareness",
      "achievementsTitle": "Your achievements",
      "actionPlanTitle": "Next steps",
      "resourcesTitle": "Additional resources",
      "motivationalTitle": "Stay alert",
      "motivationalMessage": "Completing this training helps keep your organisation safer.",
      "saveAndFinish": "Save and Finish",
      "savingText": "Saving…",
      "finishedText": "Saved. You can now close this window.",
      "finishErrorText": "LMS connection failed. Share the logs with your IT team.",
      "downloadButton": "Download certificate",
      "downloadingText": "Downloading…",
      "downloadedText": "Downloaded",
      "urgentLabel": "Urgent",
      "pointsLabel": "Points",
      "timeLabel": "Time",
      "completionLabel": "Completion"
    },
    "immediateActions": [
      {
        "title": "Do now",
        "description": "Write immediate next step in ${analysis.language} for ${analysis.topic} (Security topics: 'Report suspicious activity immediately', Writing topics: 'Apply professional writing standards', Password topics: 'Update weak passwords now', Data topics: 'Review data access permissions')"
      },
      {
        "title": "This week", 
        "description": "Write weekly goal in ${analysis.language} for ${analysis.topic} (Security: 'Share awareness with your team', Writing: 'Practice clear communication daily', Password: 'Enable two-factor authentication', Data: 'Complete data handling review')"
      }
    ],
    "key_message": [
      "Training completed",
      "Apply what you've practised", 
      "Share and encourage others"
    ],
    "resources": [
      {
        "title": "Write resource title in ${analysis.language} about ${analysis.topic} guidance", 
        "type": "URL",
        "url": "${getTopicResources(analysis.topic, analysis.category)[0]?.url || 'https://www.cisa.gov/cybersecurity'}"
        },
      {
        "title": "Write second resource title in ${analysis.language} about ${analysis.topic} best practices",
        "type": "URL", 
        "url": "${getTopicResources(analysis.topic, analysis.category)[1]?.url || 'https://www.ncsc.gov.uk/cyber-security'}"
      }
    ],
    "scene_type": "summary"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete takeaways and action steps.
2. TOPIC CONSISTENCY: Summarize key ${analysis.topic} concepts and provide actionable takeaways.`;


  try {
    console.log('🚀 Starting parallel content generation with model:', model?.constructor?.name || 'unknown');
    // Generate content in parallel for better performance and reliability
    const [introResponse, videoResponse, mainResponse, closingResponse] = await Promise.all([
      generateText({
        model: model,
        messages: [
          { role: 'system', content: `Generate professional ${analysis.language} training content. Return ONLY VALID JSON - NO markdown, NO backticks, NO formatting. Start directly with {. CRITICAL: Use EXACTLY the fields shown in the example - NO EXTRA FIELDS. Do NOT add ANY additional keys beyond what is explicitly shown in the template. Follow the template structure PRECISELY. Use specific React Lucide icon names (from lucide-react library), not placeholders.` },
          { role: 'user', content: introPrompt }
        ]
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: `Generate professional ${analysis.language} training content. Return ONLY VALID JSON - NO markdown, NO backticks, NO formatting. Start directly with {. CRITICAL: Use EXACTLY the fields shown in the example - NO EXTRA FIELDS. Do NOT add ANY additional keys beyond what is explicitly shown in the template. Follow the template structure PRECISELY. Use specific React Lucide icon names (from lucide-react library), not placeholders.` },
          { role: 'user', content: videoPrompt }
        ]
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: `Generate professional ${analysis.language} training content. Return ONLY VALID JSON - NO markdown, NO backticks, NO formatting. Start directly with {. CRITICAL: Use EXACTLY the fields shown in the example - NO EXTRA FIELDS. Do NOT add ANY additional keys beyond what is explicitly shown in the template. Follow the template structure PRECISELY. Use specific React Lucide icon names (from lucide-react library), not placeholders.` },
          { role: 'user', content: mainPrompt }
        ]
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: `Generate professional ${analysis.language} training content. Return ONLY VALID JSON - NO markdown, NO backticks, NO formatting. Start directly with {. CRITICAL: Use EXACTLY the fields shown in the example - NO EXTRA FIELDS. Do NOT add ANY additional keys beyond what is explicitly shown in the template. Follow the template structure PRECISELY. Use specific React Lucide icon names (from lucide-react library), not placeholders.` },
          { role: 'user', content: closingPrompt }
        ]
      })
    ]);

    // Clean and parse the three responses (remove markdown formatting if present)
    const cleanResponse = (text: string) => {
      let clean = text.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      // Additional cleaning - remove control characters that can break JSON
      clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      // Fix common JSON issues
      clean = clean.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
      return clean;
    };

    const introScenes = JSON.parse(cleanResponse(introResponse.text));
    const videoScenes = JSON.parse(cleanResponse(videoResponse.text));
    const mainScenes = JSON.parse(cleanResponse(mainResponse.text));
    const closingScenes = JSON.parse(cleanResponse(closingResponse.text));

    // Combine all scenes into final content
    const combinedContent = {
      ...introScenes,
      ...videoScenes,
      ...mainScenes,
      ...closingScenes,
      app: {
        texts: getAppTexts(analysis.language),
        ariaTexts: getAppAriaTexts(analysis.language, analysis.topic)
      }
    };

    return combinedContent as LanguageContent;

  } catch (err) {
    // If any parsing fails, fall back to deterministic generator
    console.error('Parallel content generation failed, using fallback:', err);
    return err as LanguageContent;
  }
}

