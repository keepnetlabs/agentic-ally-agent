import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { getLanguagePrompt } from '../language/localization-language-rules';
import { getThreatContextSync, getThreatContextSyncFiltered } from '../../services/threat-intelligence-service';

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
    conversational: '• Explain as if talking to someone completely new to the topic',
  },
  Intermediate: {
    simplification:
      '• Simplify technical jargon: if a word requires domain expertise, replace it with an everyday equivalent',
    conversational: '• Use words a non-expert would use in casual conversation',
  },
  Advanced: {
    simplification: '• Use professional technical vocabulary - audience has domain knowledge',
    conversational: '• Write for experienced practitioners who understand industry terminology',
  },
};

/**
 * Level-specific content depth guidance
 * Controls scenario complexity, quiz difficulty, and explanation detail across ALL scenes
 */
interface ContentDepthGuidance {
  goalComplexity: string;
  scenarioComplexity: string;
  quizDifficulty: string;
  explanationDepth: string;
  inboxDifficulty: string;
  nudgeDetail: string;
  summaryDepth: string;
}

const CONTENT_DEPTH_GUIDANCE: Record<LearnerLevel, ContentDepthGuidance> = {
  Beginner: {
    goalComplexity: '• Goals: Simple, concrete, single-action steps. "Do X when Y happens." No compound objectives.',
    scenarioComplexity: '• Scenarios: Simple, clear situations with obvious warning signs. One decision point. No ambiguity.',
    quizDifficulty: '• Quiz: Straightforward questions with clearly wrong distractors. Explanations should teach the basics.',
    explanationDepth: '• Explanations: Short and simple (max 20 words). Focus on WHAT to do, not WHY.',
    inboxDifficulty: '• Inbox emails: EASY difficulty — obvious red flags (external domain, failing SPF, urgent language).',
    nudgeDetail: '• Nudge: One simple action per step. Use plain language. "Next time X happens, do Y."',
    summaryDepth: '• Summary: Reinforce the 2-3 most basic takeaways. Keep resources introductory.',
  },
  Intermediate: {
    goalComplexity: '• Goals: Multi-step objectives with cause-effect reasoning. "Identify X, then verify Y to prevent Z."',
    scenarioComplexity: '• Scenarios: Realistic workplace situations with time pressure. Some ambiguity in the correct response.',
    quizDifficulty: '• Quiz: Near-miss distractors that sound reasonable. Require understanding, not just recognition.',
    explanationDepth: '• Explanations: Moderate detail (max 30 words). Explain WHY the correct action works and WHY alternatives fail.',
    inboxDifficulty: '• Inbox emails: MEDIUM to MEDIUM-HARD — mixed signals, some legitimate elements alongside red flags.',
    nudgeDetail: '• Nudge: Include context for each step. Explain the reasoning behind the action briefly.',
    summaryDepth: '• Summary: Connect learning to real workflow impact. Mix introductory and intermediate resources.',
  },
  Advanced: {
    goalComplexity: '• Goals: Complex objectives requiring judgment and prioritization. "Evaluate risk, weigh trade-offs, and decide."',
    scenarioComplexity: '• Scenarios: Complex multi-step situations with conflicting priorities. Multiple plausible responses. Require deep analysis.',
    quizDifficulty: '• Quiz: Subtle distinctions between options. All answers sound professional — only domain expertise reveals the correct one.',
    explanationDepth: '• Explanations: Detailed analysis (max 45 words). Cover risk trade-offs, compliance implications, and root cause reasoning.',
    inboxDifficulty: '• Inbox emails: HARD — near-perfect impersonation, clean headers, internal domain spoofing. Requires careful context analysis.',
    nudgeDetail: '• Nudge: Reference specific procedures/frameworks. Include escalation paths and edge cases.',
    summaryDepth: '• Summary: Emphasize strategic implications and compliance. Recommend advanced/technical resources.',
  },
};

export function getContentDepthGuidance(level: LearnerLevel): ContentDepthGuidance {
  return CONTENT_DEPTH_GUIDANCE[level] || CONTENT_DEPTH_GUIDANCE.Intermediate;
}

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
export function normalizeLevel(level?: string): LearnerLevel {
  if (!level) return 'Beginner';
  const normalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  return normalized in VOCABULARY_GUIDANCE ? (normalized as LearnerLevel) : 'Beginner';
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
• ZERO words from other languages (except email protocol acronyms: SPF, DMARC, DKIM)
• IMPORTANT: Localize security concepts like MFA, 2FA, SSO into the target language — these are user-facing terms, not protocol names
• No mixed-language fragments or translation residue

RULE 2: Native Expression (Create, Don't Translate)
• Ignore English phrasing in this prompt—they illustrate patterns only
• Express ideas naturally using authentic ${language} tone, rhythm, and idioms
• Think directly in ${language}, not English-first
• WRONG: Literal, mechanical, word-for-word phrasing
• RIGHT: Fluent, idiomatic, professional writing that feels native

NON-ENGLISH OUTPUT RULE:
If output language is NOT English, NEVER translate, mirror, or adapt English structures.
FORBIDDEN patterns in highlights, titles, and key messages:
- "Know that X" → state X directly as a fact
- "Remember that X" → state X directly as a fact
- "See how X" → express the cause-effect directly
- "Stop X" → express the action directly
- "Make sure to X" → express the action directly
Lead with the ACTION or FACT, not a meta-instruction to the reader.
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
• For each technical concept (email, password, security, download, login, etc.), choose the term a native speaker of ${language} would naturally use in a professional context. Once chosen, use that same term consistently throughout ALL scenes. Never alternate between a native term and a foreign loanword for the same concept.
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

  // Get filtered threat context based on department, level, and custom focus
  // This ensures threat intel enhances user request (department, level) rather than overriding it
  const threatContext = getThreatContextSyncFiltered(
    analysis.topic,
    analysis.department,
    analysis.level,
    analysis.customRequirements
  ) || getThreatContextSync(analysis.topic, analysis.category);

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

${analysis.mustKeepDetails?.length ? `=== MUST-KEEP DETAILS (from user — non-negotiable) ===
${analysis.mustKeepDetails.map((d, i) => `${i + 1}. ${d}`).join('\n')}
Each scene MUST incorporate these details where relevant. Do NOT drop or ignore them.

` : ''}${threatContext ? `${threatContext}

IMPORTANT: Create ORIGINAL scenarios inspired by these — do NOT copy or repeat them verbatim.

` : ''}=== CONTENT RULES ===
1. **Topic Consistency**
   • Keep all content focused strictly on ${analysis.topic}
   • Use consistent terminology and examples tied to ${analysis.topic}
   • Avoid unrelated concepts, characters, or domains

2. **Domain Guardrails**
   • Content must align with category/subcategory and key topics
   • Security terms (phishing, reporting, email) allowed ONLY if explicitly in category/key topics
   • Choose Lucide icons semantically matched to topic—never default to generic security icons

=== FINAL SELF-CHECK (before output) ===
1. Is ALL content 100% in ${analysis.language}?
2. Are ALL scenes focused on "${analysis.topic}"? No off-topic drift?
3. Are ALL placeholders replaced with real, topic-specific content?
4. Is JSON structure valid and complete?
If any fails → fix before outputting.
`;
}
