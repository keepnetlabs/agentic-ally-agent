import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { PromptAnalysis } from '../types/prompt-analysis';
import { ExampleRepo } from '../services/example-repo';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../utils/language-utils';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { PROMPT_ANALYSIS_PARAMS } from '../utils/llm-generation-params';
import { MICROLEARNING, PROMPT_ANALYSIS, ROLES, CATEGORIES, THEME_COLORS, MODEL_PROVIDERS, TRAINING_LEVELS, DEFAULT_TRAINING_LEVEL } from '../constants';
import { streamReasoning } from '../utils/reasoning-stream';

// Cache formatted lists for performance
const cachedRolesList = ROLES.VALUES.map((role) => `- "${role}"`).join('\n');
const cachedCategoriesList = CATEGORIES.VALUES.map((cat) => `- "${cat}"`).join('\n');

const AnalyzeUserPromptSchema = z.object({
  userPrompt: z.string().min(1, 'User prompt is required'),
  additionalContext: z.string().optional(),
  suggestedDepartment: z.string().optional(),
  suggestedLevel: z.enum(TRAINING_LEVELS).optional().default(DEFAULT_TRAINING_LEVEL),
  customRequirements: z.string().optional(),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

const AnalyzeUserPromptOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    language: z.string(),
    topic: z.string(),
    title: z.string(),
    department: z.string(),
    level: z.string(),
    category: z.string(),
    subcategory: z.string(),
    learningObjectives: z.array(z.string()),
    duration: z.number(),
    industries: z.array(z.string()),
    roles: z.array(z.string()),
    keyTopics: z.array(z.string()),
    practicalApplications: z.array(z.string()),
    assessmentAreas: z.array(z.string()),
    regulationCompliance: z.array(z.string()).optional(),
    themeColor: z.string().optional(),
    hasRichContext: z.boolean().optional(),
    contextSummary: z.string().optional(),
    customRequirements: z.string().optional(),
    isCodeTopic: z.boolean().optional(),
  }),
  error: z.string().optional(),
});

// Helper function for language detection fallback
function detectLanguageFallback(text: string): string {
  // Basic language detection patterns
  if (/[ğüşıöçĞÜŞİÖÇ]/.test(text)) return 'tr';
  if (/[äöüßÄÖÜ]/.test(text)) return 'de';
  if (/[àáâäèéêëìíîïòóôöùúûü]/.test(text)) return 'fr';
  if (/[áéíóúñü¿¡]/.test(text)) return 'es';
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]/.test(text)) return 'pt';
  if (/[àáäèéëìíîïòóôùúûü]/.test(text)) return 'it';
  if (/[а-я]/.test(text.toLowerCase())) return 'ru';
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  return 'en'; // default
}

export const analyzeUserPromptTool = new Tool({
  id: 'analyze_user_prompt',
  description: 'AI-powered analysis of user prompt with rich context processing and semantic hints',
  inputSchema: AnalyzeUserPromptSchema,
  outputSchema: AnalyzeUserPromptOutputSchema,
  execute: async (context: any) => {
    const input = context?.inputData || context?.input || context;
    const { userPrompt, additionalContext, suggestedDepartment, customRequirements, modelProvider, model: modelOverride } = input;
    const writer = input?.writer; // Get writer for streaming

    // Use model override if provided, otherwise use default
    const model = getModelWithOverride(modelProvider, modelOverride);

    console.log(`🤖 Analyzing user prompt: "${userPrompt.substring(0, 100)}..."`);

    try {
      // Load examples and retrieve semantically relevant ones
      const repo = ExampleRepo.getInstance();
      await repo.loadExamplesOnce();

      // Try semantic search first, with multiple fallback levels
      let schemaHints: string;
      try {
        // Level 1: Smart semantic search with query context
        schemaHints = await repo.getSmartSchemaHints(userPrompt, 3);
        console.log('✨ Using semantic-enhanced schema hints');
      } catch (error) {
        console.warn('⚠️ Semantic search unavailable, trying smart sampling...', error);
        try {
          // Level 2: Smart sampling without semantic search
          schemaHints = await repo.getSmartSchemaHints(undefined, 3);
          console.log('🎯 Using smart sampling schema hints');
        } catch (fallbackError) {
          // Level 3: Basic schema hints (guaranteed to work)
          console.warn('⚠️ Smart sampling failed, using basic schema hints:', fallbackError);
          schemaHints = repo.getSchemaHints(3);
          console.log('📋 Using basic schema hints');
        }
      }

      const examplesBlock = schemaHints
        ? `\n\nSCHEMA HINTS (structure only, do not copy texts):\n${schemaHints}`
        : '';

      const analysisPrompt = `Create microlearning metadata from this request:

USER: "${userPrompt}" (LANGUAGE: ${detectLanguageFallback(userPrompt).toUpperCase()})
CONTEXT: ${additionalContext || 'none'}
DEPARTMENT: ${suggestedDepartment || 'not specified'}
SUGGESTED LEVEL: ${input.suggestedLevel || 'auto-detect'}${examplesBlock}

ROLE SELECTION OPTIONS (pick ONE based on audience):
${cachedRolesList}

CATEGORY SELECTION OPTIONS (pick ONE based on topic domain):
${cachedCategoriesList}

Return JSON:
{
  "language": "BCP-47 tag (language-lowercase + region-lowercase; prefer regional if known, e.g., en-gb/en-us/fr-ca/tr-tr; else use primary, e.g. en-gb)"
  "topic": "2-3 words max - core subject only",
  "title": "3-5 words max - professional training title",
  "description": "1-2 sentences max - professional training description",
  "department": "target department or 'All'",
  "level": "beginner/intermediate/advanced - use SUGGESTED LEVEL if provided, else detect from complexity",
  "category": "One category from the list above that matches the topic domain",
  "subcategory": "specific subcategory based on focus",
  "learningObjectives": ["specific skills learner can DO after 5-min training. Use simple action verbs (spot, check, create, report, verify, pause, enable). NOT meta-tasks (pass quiz, complete test) or unrealistic goals (teach others, become expert)"],
  "duration": ${MICROLEARNING.DURATION_MINUTES},
  "industries": ["relevant industries from context or 'General Business'"],
  "roles": ["One role from the list above that matches the target audience"],
  "themeColor": "ONLY if user mentioned a color (standard: bg-gradient-red, or simple: red/blue/green/teal/indigo/emerald/violet/amber) - convert to standard format. Otherwise null.",
  "keyTopics": ["3-5 main learning areas"],
  "practicalApplications": ["3-4 workplace situations"],
  "assessmentAreas": ["testable skills - focus on 'can they do X'"],
  "regulationCompliance": ["relevant regulations by topic/industry"],
  "isCodeTopic": false
}

RULES:
- For "roles": Pick ONE option that best matches the topic's target audience
  - Technical/IT content → "IT Department"
  - Fraud/finance content → "Finance Department"
  - HR/culture topics → "Human Resource Department"
  - Sales topics → "Sales Department"
  - Unknown audience → "All Employees"
- For "category": Pick ONE option that best matches the topic domain
  - Email phishing → "Email Security"
  - Malware/virus → "Malware"
  - Ransomware → "Ransomware & Extortion"
  - Remote work → "Remote Working Security"
  - GDPR/privacy → "GDPR"
  - Social engineering → "Social Engineering"
  - Cloud → "Cloud Security"
  - If unsure → "General"
- For "themeColor": ONLY fill if user explicitly mentioned a color
  - Accept both standard codes and simple names
  - Convert simple color names to standard codes:
    * "red" / "danger" / "risk" → "bg-gradient-red"
    * "blue" / "tech" / "technology" → "bg-gradient-blue"
    * "green" / "safe" / "safety" → "bg-gradient-green"
    * "purple" / "compliance" → "bg-gradient-purple"
    * "gray" / "grey" / "general" → "bg-gradient-gray"
    * "orange" / "innovation" → "bg-gradient-orange"
    * "yellow" / "smoke" → "bg-gradient-yellow" or "bg-gradient-yellow-smoke"
    * "light-yellow" / "light yellow" → "bg-gradient-light-yellow"
    * "light-blue" / "light blue" → "bg-gradient-light-blue"
    * "pink" / "social" → "bg-gradient-pink"
  - CRITICAL: ONLY return colors from this exact list. If user mentions any invalid color, return null.
  - Valid colors: bg-gradient-red, bg-gradient-blue, bg-gradient-green, bg-gradient-gray, bg-gradient-purple, bg-gradient-yellow-smoke, bg-gradient-yellow, bg-gradient-light-yellow, bg-gradient-orange, bg-gradient-light-blue, bg-gradient-pink, bg-gradient-teal, bg-gradient-indigo, bg-gradient-emerald, bg-gradient-violet, bg-gradient-amber
  - Otherwise leave as null/empty string
  - User must explicitly state the color - do not infer or choose colors automatically
- isCodeTopic: Set to true if topic mentions programming languages OR code-focused topics. Otherwise false.
- DON'T copy user instructions as title/topic
- CREATE professional titles from user intent
- EXTRACT core subject, not full request
- USE BCP-47 language codes only
- RESPOND in user's language for content
- isCodeTopic: **CRITICAL** - Return as boolean (true/false). Set to true IF ANY of these conditions are met:
  1. Topic mentions a PROGRAMMING LANGUAGE: JavaScript, Python, Java, C++, C#, Go, Rust, TypeScript, Kotlin, PHP, Ruby, Swift, etc.
  2. Topic mentions CODE-FOCUSED CONCEPTS: code review, secure coding, vulnerabilities, injection, XSS, SQL injection, API security, encryption, authentication, authorization, buffer overflow, memory management, testing, refactoring, debugging, legacy code, etc.
  3. Topic mentions SECURITY CODING: OWASP, CWE, CVE, secure coding, secure design, security testing, etc.
  Set to FALSE ONLY for: threat awareness, phishing, ransomware, social engineering, compliance, policy, incident response, password management, MFA, data protection (non-code).

  **EXAMPLES:**
  TRUE: "JavaScript" → true, "JavaScript Arrays" → true, "Python workshop" → true, "Java security" → true, "SQL Injection" → true, "XSS prevention" → true, "Code review" → true, "API security" → true, "Secure coding" → true
  FALSE: "Phishing" → false, "Ransomware" → false, "MFA" → false, "Password security" → false, "Data protection" → false`;

      const response = await generateText({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert instructional designer and content analyst. CRITICAL: Analyze user requests intelligently and create professional microlearning metadata. Do NOT copy user instructions as titles/topics. Extract the core learning subject and create appropriate professional titles. Learning objectives must be realistic for 5-minute training scope - focus on specific, immediately actionable skills (NOT meta-tasks like "complete quiz" or unrealistic goals like "teach others"). For roles field: select exactly ONE role from the provided list that best matches the target audience for the topic. For category field: select exactly ONE category from the provided list that best matches the topic domain. For themeColor field: ONLY fill if user explicitly mentioned a color. Convert simple color names (red, blue, green, purple, gray, orange, yellow, pink, light-blue, teal, indigo, emerald, violet, amber) to standard codes (bg-gradient-red, bg-gradient-blue, bg-gradient-teal, etc.). Never infer or auto-select colors - user must explicitly state the color. Return ONLY VALID JSON - NO markdown, NO backticks, NO formatting. Start directly with {. Use BCP-47 language codes (en-gb, tr-tr, de-de, fr-fr,fr-ca, es-es, zh-cn, ja-jp, ar-sa, etc.).' },
          { role: 'user', content: analysisPrompt }
        ],
        ...PROMPT_ANALYSIS_PARAMS
      });

      // Extract reasoning from response.response.body.reasoning
      let reasoning = (response as any).response?.body?.reasoning;
      console.log('🔍 Reasoning:', reasoning);
      if (reasoning && writer) {
        reasoning += `\n 'I will create an 8-scene code editor training module if isCodeTopic is true, otherwise I will create an 8-scene inbox-based training module.'`;
        streamReasoning(reasoning, writer);
      }
      // Use professional JSON repair library
      const cleanedText = cleanResponse(response.text, 'prompt-analysis');
      const analysis = JSON.parse(cleanedText) as PromptAnalysis;

      // Validate and normalize BCP-47 language code (includes en-* variant normalization to en-US)
      analysis.language = validateBCP47LanguageCode(analysis.language || DEFAULT_LANGUAGE);

      // Validate themeColor - only allow values from THEME_COLORS.VALUES
      if (analysis.themeColor && !THEME_COLORS.VALUES.includes(analysis.themeColor as any)) {
        console.warn(`⚠️ Invalid theme color "${analysis.themeColor}" - resetting to null`);
        analysis.themeColor = undefined;
      }

      console.log(`🎯 Enhanced Prompt Analysis Result:`, analysis);

      // Enrich analysis with context if provided
      if (additionalContext) {
        analysis.hasRichContext = true;
        analysis.contextSummary = additionalContext.substring(0, PROMPT_ANALYSIS.MAX_CONTEXT_SUMMARY_LENGTH) + '...';
        console.log(`📄 Rich context provided: ${analysis.contextSummary}`);
      }

      if (customRequirements) {
        analysis.customRequirements = customRequirements;
        console.log(`⚙️ Custom requirements: ${customRequirements}`);
      }

      return {
        success: true,
        data: {
          language: analysis.language.toLowerCase(),
          topic: analysis.topic,
          title: analysis.title,
          description: analysis.description,
          department: analysis.department,
          level: analysis.level,
          category: analysis.category,
          subcategory: analysis.subcategory,
          learningObjectives: analysis.learningObjectives,
          duration: analysis.duration,
          industries: analysis.industries,
          roles: analysis.roles,
          keyTopics: analysis.keyTopics,
          practicalApplications: analysis.practicalApplications,
          assessmentAreas: analysis.assessmentAreas,
          regulationCompliance: analysis.regulationCompliance,
          themeColor: analysis.themeColor,
          hasRichContext: analysis.hasRichContext,
          contextSummary: analysis.contextSummary,
          customRequirements: analysis.customRequirements,
          isCodeTopic: analysis.isCodeTopic,
        }
      };

    } catch (error) {
      console.error('JSON parse failed, using fallback analysis. Error:', error);

      // Enhanced fallback analysis with context
      // Detect if code-related topic based on programming languages OR security keywords
      const specificCodeSecurityKeywords = [
        'injection', 'xss', 'cross-site scripting', 'vulnerability', 'vulnerable',
        'buffer overflow', 'memory leak', 'sql injection', 'code review',
        'secure coding', 'api security', 'encryption', 'hash', 'authentication',
        'authorization', 'owasp', 'cwe', 'cvss', 'refactoring', 'debugging',
        'testing', 'legacy code', 'memory management', 'design pattern'
      ];

      const programmingLanguages = ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'go', 'rust', 'typescript', 'kotlin', 'ruby', 'swift', 'scala', 'r language'];

      const promptLower = userPrompt.toLowerCase();

      // Logic: programming language OR code security keyword
      const hasSpecificCodeSecurityKeyword = specificCodeSecurityKeywords.some(kw => promptLower.includes(kw));
      const hasProgrammingLanguage = programmingLanguages.some(lang => promptLower.includes(lang));

      // CRITICAL: If ANY programming language is mentioned, it's a code topic (regardless of other content)
      const isCodeSecurityFallback = hasProgrammingLanguage || hasSpecificCodeSecurityKeyword;

      const fallbackData = {
        language: detectLanguageFallback(userPrompt),
        topic: userPrompt.substring(0, 50),
        title: `Training: ${userPrompt.substring(0, 30)}`,
        department: suggestedDepartment || 'All',
        level: 'intermediate',
        category: CATEGORIES.DEFAULT,
        subcategory: 'Skills Training',
        learningObjectives: [`Learn about ${userPrompt.substring(0, 30)}`, 'Apply new skills', 'Improve performance'],
        duration: MICROLEARNING.DURATION_MINUTES,
        industries: ['General'],
        roles: [ROLES.DEFAULT],
        themeColor: undefined,
        keyTopics: [userPrompt.substring(0, 30)],
        practicalApplications: [`Apply ${userPrompt.substring(0, 20)} skills`],
        assessmentAreas: [`${userPrompt.substring(0, 20)} knowledge`],
        regulationCompliance: [],
        hasRichContext: !!additionalContext,
        contextSummary: additionalContext?.substring(0, PROMPT_ANALYSIS.MAX_CONTEXT_SUMMARY_LENGTH) + '...' || undefined,
        customRequirements: customRequirements,
        isCodeTopic: isCodeSecurityFallback,
      };

      return {
        success: true,
        data: fallbackData
      };
    }
  },
});

export type AnalyzeUserPromptInput = z.infer<typeof AnalyzeUserPromptSchema>;
export type AnalyzeUserPromptOutput = z.infer<typeof AnalyzeUserPromptOutputSchema>;