import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { PromptAnalysis } from '../types/prompt-analysis';
import { ExampleRepo } from '../services/example-repo';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../utils/language-utils';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { PROMPT_ANALYSIS_PARAMS } from '../utils/llm-generation-params';
import { MICROLEARNING, PROMPT_ANALYSIS } from '../constants';

const AnalyzeUserPromptSchema = z.object({
  userPrompt: z.string().min(1, 'User prompt is required'),
  additionalContext: z.string().optional(),
  suggestedDepartment: z.string().optional(),
  suggestedLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional().default('Intermediate'),
  customRequirements: z.string().optional(),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional().describe('Model provider'),
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

Return JSON:
{
  "language": "BCP-47 tag (language-lowercase + region-lowercase; prefer regional if known, e.g., en-gb/en-us/fr-ca/tr-tr; else use primary, e.g. en-gb)"
  "topic": "2-3 words max - core subject only",
  "title": "3-5 words max - professional training title",
  "department": "target department or 'All'",
  "level": "beginner/intermediate/advanced - use SUGGESTED LEVEL if provided, else detect from complexity",
  "category": "main category - Security Awareness, Leadership, Data Protection, Technical Skills, etc.",
  "subcategory": "specific subcategory based on focus",
  "learningObjectives": ["specific skills learner can DO after 5-min training. Use simple action verbs (spot, check, create, report, verify, pause, enable). NOT meta-tasks (pass quiz, complete test) or unrealistic goals (teach others, become expert)"],
  "duration": ${MICROLEARNING.DURATION_MINUTES},
  "industries": ["relevant industries from context or 'General Business'"],
  "roles": ["target audience roles"],
  "keyTopics": ["3-5 main learning areas"],
  "practicalApplications": ["3-4 workplace situations"],
  "assessmentAreas": ["testable skills - focus on 'can they do X'"],
  "regulationCompliance": ["relevant regulations by topic/industry"],
  "isCodeTopic": false
}

// isCodeTopic rules: Set to true ONLY if topic is about code/software security (vulnerabilities, secure coding, code review, injection attacks, XSS, SQL injection, etc). Otherwise false.

RULES:
- DON'T copy user instructions as title/topic
- CREATE professional titles from user intent
- EXTRACT core subject, not full request
- USE BCP-47 language codes only
- RESPOND in user's language for content
- isCodeTopic: CRITICAL - Return as boolean (true/false). Set true if topic is about code/software/programming (programming languages like JavaScript, Python, Java, C++, Go, Rust, TypeScript, etc. OR code-focused topics like code review, vulnerabilities, injection, XSS, SQL injection, secure coding, API security, encryption, etc). False for all threat awareness (phishing, ransomware, social engineering, etc). Examples: "Create JavaScript microlearning" → true, "Python workshop" → true, "Java training" → true, "SQL Injection" → true, "JavaScript XSS" → true, "Phishing Detection" → false, "Ransomware" → false, "Secure API Design" → true, "Authentication Bypass" → true`;

      const response = await generateText({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert instructional designer and content analyst. CRITICAL: Analyze user requests intelligently and create professional microlearning metadata. Do NOT copy user instructions as titles/topics. Extract the core learning subject and create appropriate professional titles. Learning objectives must be realistic for 5-minute training scope - focus on specific, immediately actionable skills (NOT meta-tasks like "complete quiz" or unrealistic goals like "teach others"). Return ONLY VALID JSON - NO markdown, NO backticks, NO formatting. Start directly with {. Use BCP-47 language codes (en, tr, de, fr, es, zh, ja, ar, etc.).' },
          { role: 'user', content: analysisPrompt }
        ],
        ...PROMPT_ANALYSIS_PARAMS,
      });

      // Use professional JSON repair library
      const cleanedText = cleanResponse(response.text, 'prompt-analysis');
      const analysis = JSON.parse(cleanedText) as PromptAnalysis;

      // Validate and normalize BCP-47 language code (includes en-* variant normalization to en-US)
      analysis.language = validateBCP47LanguageCode(analysis.language || DEFAULT_LANGUAGE);

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
        'authorization', 'owasp', 'cwe', 'cvss'
      ];

      const programmingLanguages = ['javascript', 'python', 'java', 'c++', 'php', 'go', 'rust', 'typescript', 'kotlin', 'csharp', 'c#'];

      const promptLower = userPrompt.toLowerCase();

      // Stricter logic: require specific code security keyword OR programming language
      const hasSpecificCodeSecurityKeyword = specificCodeSecurityKeywords.some(kw => promptLower.includes(kw));
      const hasProgrammingLanguage = programmingLanguages.some(lang => promptLower.includes(lang));
      const hasCodeAndLanguage = promptLower.includes('code') && hasProgrammingLanguage;

      const isCodeSecurityFallback = hasSpecificCodeSecurityKeyword || hasCodeAndLanguage || hasProgrammingLanguage;

      const fallbackData = {
        language: detectLanguageFallback(userPrompt),
        topic: userPrompt.substring(0, 50),
        title: `Training: ${userPrompt.substring(0, 30)}`,
        department: suggestedDepartment || 'All',
        level: 'intermediate',
        category: 'Professional Development',
        subcategory: 'Skills Training',
        learningObjectives: [`Learn about ${userPrompt.substring(0, 30)}`, 'Apply new skills', 'Improve performance'],
        duration: MICROLEARNING.DURATION_MINUTES,
        industries: ['General'],
        roles: ['All Roles'],
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