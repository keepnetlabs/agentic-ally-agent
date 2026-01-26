import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { getLanguagePrompt } from '../language/localization-language-rules';

/**
 * Learner proficiency levels for vocabulary adaptation
 * @description Controls technical depth and language complexity
 */
export type LearnerLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * Vocabulary guidance configuration for each level
 */
interface VocabularyGuidance {
   simplification: string;
   conversational: string;
}

/**
 * Level-specific vocabulary rules mapping
 */
const VOCABULARY_GUIDANCE: Record<LearnerLevel, VocabularyGuidance> = {
   Beginner: {
      simplification: '• Avoid ALL technical jargon - use only everyday words that anyone would understand',
      conversational: '• Explain as if talking to someone completely new to the topic'
   },
   Intermediate: {
      simplification: '• Simplify technical jargon: if a word requires domain expertise, replace it with an everyday equivalent',
      conversational: '• Use words a non-expert would use in casual conversation'
   },
   Advanced: {
      simplification: '• Use professional technical vocabulary - audience has domain knowledge',
      conversational: '• Write for experienced practitioners who understand industry terminology'
   }
};

/**
 * Get level-specific vocabulary guidance for content generation
 * @param level - Learner proficiency level
 * @returns Vocabulary guidance rules for simplification and conversational tone
 */
function getVocabularyGuidance(level: LearnerLevel): VocabularyGuidance {
   return VOCABULARY_GUIDANCE[level] || VOCABULARY_GUIDANCE.Beginner;
}

/**
 * Normalize level string to valid LearnerLevel type
 * @param level - Raw level string from input
 * @returns Validated LearnerLevel, defaults to 'Beginner'
 */
function normalizeLevel(level?: string): LearnerLevel {
   if (!level) return 'Beginner';
   const normalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
   return (normalized in VOCABULARY_GUIDANCE) ? normalized as LearnerLevel : 'Beginner';
}

/**
 * Build system prompt for AI identity and behavior configuration
 *
 * @description Creates a comprehensive system prompt that:
 * - Establishes AI as native language content creator
 * - Enforces language purity and natural expression
 * - Adapts vocabulary complexity based on learner level
 * - Includes language-specific style rules from localization config
 *
 * @param language - Target language code (e.g., 'en', 'tr', 'de')
 * @param level - Optional learner level for vocabulary adaptation
 * @returns Complete system prompt string
 *
 * @example
 * ```typescript
 * const systemPrompt = buildSystemPrompt('tr', 'Intermediate');
 * ```
 */
export function buildSystemPrompt(language: string, level?: string): string {
   const validLevel = normalizeLevel(level);
   const vocabularyGuidance = getVocabularyGuidance(validLevel);
   const languageRules = getLanguagePrompt(language);

   return `You are a native ${language} microlearning content generator.

=== YOUR IDENTITY ===
You are a native professional educator and Pedagogical Specialist in ${language}, skilled in creating clear, engaging, and action-oriented learning content.

=== LANGUAGE & STYLE - CRITICAL ===
GOAL: Produce original microlearning content directly in ${language}.
The writing must sound as if originally created by a native professional—not translated or adapted.

OUTPUT: ${language} ONLY. No other languages. No meta commentary.

RULE 1: Language Purity
• Every JSON field written entirely in ${language} (100% native fluency)
• ZERO words from other languages (except global acronyms: MFA, SPF, DMARC, DKIM)
• No mixed-language fragments or translation residue

RULE 2: Native Expression (Create, Don't Translate)
• Ignore English phrasing in this prompt—they illustrate patterns only
• Express ideas naturally using authentic ${language} tone, rhythm, and idioms
• Think directly in ${language}, not English-first
• WRONG: Literal, mechanical, word-for-word phrasing
• RIGHT: Fluent, idiomatic, professional writing that feels native

NON-ENGLISH OUTPUT RULE:
If output language is NOT English, NEVER translate, mirror, or adapt English structures
(e.g., "Know that", "Remember that", "See how", "Stop X").
Write as a native professional would—following meaning and intent.

RULE 3: Quality & Readability
• Professional, confident, approachable tone (colleague-to-colleague)
• Address the learner directly ("You") to create personal connection
• Adapt examples and complexity to the Target Role specified in context
• Clear, active verbs (Bloom's Taxonomy) with smooth sentence flow
• Short sentences (8–18 words), one idea per line
• Plain, concrete vocabulary; avoid academic or bureaucratic style
${vocabularyGuidance.simplification}
${vocabularyGuidance.conversational}
• Consistent terminology, voice, and perspective throughout
• Avoid machine-translation artifacts, awkward constructions, or stiff formal tone

RULE 4: Pedagogical Quality
• PHILOSOPHY: Focus on actionable takeaways that change behavior.
• DIRECTIVE: Ensure content answers "What should I DO?" rather than just "What is this?".

${languageRules}

FINAL SELF-CHECK:
"Would a native ${language} professional naturally write this?"
If NO → rewrite before output.

=== CONTENT BEHAVIOR ===
• Replace ALL placeholders with real, topic-specific content
• Use short sentences, plain language, memory-friendly phrasing
• Never leave template placeholders (e.g., "clear benefit statement")
• Keep scene_type values unchanged: intro, goal, scenario, actionable_content, code_review, vishing_simulation, quiz, survey, nudge, summary

=== LEARNING SCIENCE ===
• Memory-friendly patterns: repeat key points, chunk info (3-5 items max)
• Link actions to outcomes: "When you [action], you [benefit]"
• Low cognitive load: one concept per screen, simple language
• Leverage specific Learning Theories provided in the context

=== OUTPUT FORMAT (STRICT) ===
• Return ONLY valid JSON (no markdown, no backticks)
• Start directly with {
• Keep JSON structure EXACTLY as provided
• No extra keys, no omissions
`;
}

/**
 * Build context data for task-specific content generation
 *
 * @description Creates contextual prompt containing:
 * - Topic, department, and level information
 * - Learning objectives and custom requirements
 * - Scientific context from microlearning metadata
 * - Content guardrails for topic consistency
 *
 * @param analysis - Parsed prompt analysis with user requirements
 * @param microlearning - Microlearning content structure with metadata
 * @returns Context data string for content generation
 *
 * @example
 * ```typescript
 * const context = buildContextData(promptAnalysis, microlearningContent);
 * ```
 */
export function buildContextData(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
   // Safe access helpers for optional nested properties
   const metadata = microlearning?.microlearning_metadata;
   const evidence = microlearning?.scientific_evidence;

   const category = metadata?.category || 'General';
   const subcategory = metadata?.subcategory || '';
   const riskArea = metadata?.risk_area || 'General';
   const learningTheories = evidence?.learning_theories
      ? Object.keys(evidence.learning_theories).slice(0, 2).join(', ')
      : 'Cognitive Load Theory';

   // Safe array joins with fallbacks
   const objectives = analysis.learningObjectives?.join(', ') || 'General awareness';
   const roles = analysis.roles?.join(', ') || 'All Roles';
   const industries = analysis.industries?.join(', ') || 'General';
   const keyTopics = analysis.keyTopics?.join(', ') || analysis.topic;
   const practicalApps = analysis.practicalApplications?.join(', ') || '';
   const assessmentAreas = analysis.assessmentAreas?.join(', ') || '';
   const compliance = analysis.regulationCompliance?.join(', ') || 'General';

   return `
Generate ${analysis.language} training content for "${analysis.topic}" in STRICT JSON only.

=== CONTEXT ===
Level: ${analysis.level} | Department: ${analysis.department}
Category: ${analysis.category}${analysis.subcategory ? ` / ${analysis.subcategory}` : ''}
Objectives: ${objectives}
Custom Requirements: ${analysis.customRequirements || 'None'}
Roles: ${roles}
Industries: ${industries}
Key Topics: ${keyTopics}
${practicalApps ? `Practical Applications: ${practicalApps}` : ''}
${assessmentAreas ? `Assessment Areas: ${assessmentAreas}` : ''}
Compliance: ${compliance}

SCIENTIFIC CONTEXT:
Category: ${category}${subcategory ? `/${subcategory}` : ''}
Risk Area: ${riskArea}
Learning Theories: ${learningTheories}

=== CONTENT RULES ===
1. **Topic Consistency**
   • Keep all content focused strictly on ${analysis.topic}
   • Use consistent terminology and examples tied to ${analysis.topic}
   • Avoid unrelated concepts, characters, or domains

2. **Domain Guardrails**
   • Content must align with category/subcategory and key topics
   • Security terms (phishing, reporting, email) allowed ONLY if explicitly in category/key topics
   • Choose Lucide icons semantically matched to topic—never default to generic security icons
`;
}
