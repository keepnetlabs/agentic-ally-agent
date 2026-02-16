/**
 * Comprehensive LLM Generation Parameters
 *
 * Centralized configuration for ALL generateText() calls across the project
 * Each parameter set is optimized for its specific use case
 *
 * PHILOSOPHY:
 * - Creative content (scenes, emails): Higher temperature for variety
 * - Analytical content (analysis, metadata): Moderate temperature for balance
 * - Precise content (translation, quiz): Lower temperature for accuracy
 * - All use: topP 0.85-0.92 for good diversity without nonsense
 */

export interface GenerationParams {
  temperature: number; // 0-2: Creativity level (0=deterministic, 1=balanced, 2=chaotic)
  topP?: number; // 0-1: Nucleus sampling (optional - when omitted, model uses default)
}

/**
 * SCENE GENERATION PARAMETERS (Ultra Creative)
 *
 * Purpose: Generate engaging, varied microlearning content
 * Priority: Engagement + Variety > Rigid consistency
 * Use: generate-language-json-tool.ts (8 scenes)
 *
 * Strategy: High temperature across all scenes for maximum freshness
 * Each training module should feel UNIQUE
 */
export const SCENE_GENERATION_PARAMS: Record<number, GenerationParams> = {
  1: {
    temperature: 0.9, // Intro (CREATIVE): HIGH - maximum varied, engaging highlights
    topP: 0.92, // High diversity - explore vocabulary variation
  },
  2: {
    temperature: 0.75, // Goals (INFO): MODERATE - SMART but natural, conversational
    topP: 0.9, // Good diversity while maintaining clarity
  },
  3: {
    temperature: 0.9, // Video (CREATIVE): HIGH - vivid, immersive, engaging scenarios
    topP: 0.92, // High diversity for varied narrative styles
  },
  4: {
    temperature: 0.8, // Actions (INFO): MODERATE - precise presentation of steps
    topP: 0.9, // Good diversity while maintaining clarity
  },
  5: {
    temperature: 0.75, // Quiz (INFO): MODERATE - accurate questions with personality
    topP: 0.9, // Diversity to avoid repetitive patterns
  },
  6: {
    temperature: 0.8, // Survey (INFO): MODERATE - natural, consistent questions
    topP: 0.9, // Good diversity in construction
  },
  7: {
    temperature: 0.9, // Nudge (CREATIVE): HIGH - memorable, engaging triggers
    topP: 0.92, // High vocabulary distribution
  },
  8: {
    temperature: 0.75, // Summary (INFO): MODERATE - clear recap with personality
    topP: 0.9, // Diversity while maintaining structure
  },
};

/**
 * INBOX EMAIL GENERATION PARAMETERS (High Creativity)
 *
 * Purpose: Generate realistic, varied phishing/legitimate emails
 * Priority: Realism + Variety > Consistency
 * Use: inbox-emails-orchestrator.ts (4 email variants)
 *
 * Strategy: High temperature for realistic phishing simulation
 * Each email should feel like a REAL email, not templated
 */
export const INBOX_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.9, // HIGH - Realistic, varied sender names, subjects, bodies
  topP: 0.92, // High diversity for natural email variations
};

/**
 * PROMPT ANALYSIS PARAMETERS (Balanced)
 *
 * Purpose: Parse user intent and extract learning objectives
 * Priority: Accuracy + Structure > Creativity
 * Use: analyze-user-prompt-tool.ts (single analysis call)
 *
 * Strategy: Moderate temperature for structured but flexible analysis
 * Need variation in interpretation but clear output format
 */
export const PROMPT_ANALYSIS_PARAMS: GenerationParams = {
  temperature: 0.7, // MODERATE - Balanced analysis with some flexibility
  topP: 0.85, // Good diversity for understanding variations
};

/**
 * METADATA GENERATION PARAMETERS (Balanced)
 *
 * Purpose: Generate titles, summaries, metadata, scientific evidence
 * Priority: Consistency + Clarity > Creativity
 * Use: generate-microlearning-json-tool.ts (metadata/evidence)
 *
 * Strategy: Moderate-low temperature for structured, coherent metadata
 * Need clear titles and consistent summaries
 */
export const METADATA_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.6, // MODERATE - Balanced between consistency and variation
  topP: 0.85, // Good diversity while maintaining clarity
};

/**
 * INBOX TEXT GENERATION PARAMETERS (High Creativity)
 *
 * Purpose: Generate SMS/text message simulations
 * Priority: Realism + Variety > Consistency
 * Use: inbox-texts-generator.ts (SMS variants)
 *
 * Strategy: High temperature for realistic text variations
 * SMS should feel natural and varied like real messages
 */
export const INBOX_TEXT_PARAMS: GenerationParams = {
  temperature: 0.85, // HIGH - Natural, varied SMS/text messages
  topP: 0.9, // High diversity for realistic text patterns
};

/**
 * LOCALIZATION PARAMETERS (Balanced Natural Translation)
 *
 * Purpose: Localize content to feel native while preserving meaning
 * Priority: Natural phrasing + Meaning preservation > Literal translation
 * Use: create-inbox-structure-tool.ts (localized UI texts)
 *
 * Strategy: Moderate temperature with penalties to encourage natural phrasing
 * - frequencyPenalty: Avoid repetitive words
 * - presencePenalty: Encourage vocabulary variety and natural expressions
 */
export const LOCALIZER_PARAMS: GenerationParams & { frequencyPenalty?: number; presencePenalty?: number } = {
  temperature: 0.15, // MODERATE - Natural phrasing + meaning preservation balance
  topP: 0.92, // Good diversity while maintaining control
  frequencyPenalty: 0.1, // Avoid repetitive words - encourages natural language
  presencePenalty: 0.0, // Encourage vocabulary variety - feels more native
};

/**
 * GENERAL DEFAULT PARAMETERS
 *
 * Purpose: Fallback for any generateText() calls not explicitly covered
 * Strategy: Balanced approach - good for most scenarios
 */
export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.7, // MODERATE - Balanced creativity and consistency
  topP: 0.85, // Good diversity
};

/**
 * PHISHING SCENARIO ANALYSIS PARAMETERS (Balanced)
 *
 * Purpose: Analyze user topic and generate phishing scenario structure
 * Use: create-phishing-workflow.ts (scenario analysis step)
 */
export const PHISHING_SCENARIO_PARAMS: GenerationParams = {
  temperature: 0.7,
};

/**
 * PHISHING CONTENT PARAMETERS (High Creativity)
 *
 * Purpose: Generate phishing email and landing page content
 * Use: create-phishing-workflow.ts, create-smishing-workflow.ts, retry-generator.ts
 */
export const PHISHING_CONTENT_PARAMS: GenerationParams = {
  temperature: 0.8,
};

/**
 * EDITOR PARAMETERS (Low - Consistency)
 *
 * Purpose: Phishing/smishing editor LLM calls - structured output, minimal variation
 * Use: phishing-editor-llm.ts, smishing-editor-llm.ts
 */
export const EDITOR_PARAMS: GenerationParams = {
  temperature: 0.3,
};

/**
 * CODE REVIEW PARAMETERS (Low - Consistency)
 *
 * Purpose: Code review validation - deterministic feedback
 * Use: code-review-check-tool.ts
 */
export const CODE_REVIEW_PARAMS: GenerationParams = {
  temperature: 0.3,
};

/**
 * LOW DETERMINISM PARAMS (Summary/Cache)
 *
 * Purpose: Summaries, policy cache - consistent, factual output
 * Use: policy-cache.ts, vishing-conversations-summary-tool.ts
 */
export const LOW_DETERMINISM_PARAMS: GenerationParams = {
  temperature: 0.2,
};

/**
 * EXTRACTION PARAMS (High Determinism)
 *
 * Purpose: Structured extraction - brand, metadata, code
 * Use: brand-resolver.ts (extraction), phishing-editor-utils.ts
 */
export const EXTRACTION_PARAMS: GenerationParams = {
  temperature: 0.1,
};

/**
 * BRAND CREATIVE PARAMS (Moderate)
 *
 * Purpose: Brand resolution creative fallback
 * Use: brand-resolver.ts (creative path)
 */
export const BRAND_CREATIVE_PARAMS: GenerationParams = {
  temperature: 0.7,
};

/**
 * CLASSIFICATION PARAMS (Low - Consistent labels)
 *
 * Purpose: Industry/domain classification
 * Use: industry-detector.ts
 */
export const CLASSIFICATION_PARAMS: GenerationParams = {
  temperature: 0.3,
};

/**
 * REASONING STREAM PARAMS (Low)
 *
 * Purpose: Reasoning/chain-of-thought - consistent structure
 * Use: reasoning-stream.ts
 */
export const REASONING_PARAMS: GenerationParams = {
  temperature: 0.3,
};

/**
 * SCENE REWRITE PARAMS (Moderate-low)
 *
 * Purpose: Scene content rewriting/localization - balanced
 * Use: scene-rewriter-base.ts
 */
export const SCENE_REWRITE_PARAMS: GenerationParams = {
  temperature: 0.4,
};

/**
 * TRANSCRIPT TRANSLATION PARAMS (Moderate)
 *
 * Purpose: Video transcript translation - natural phrasing
 * Use: transcript-translator.ts
 */
export const TRANSCRIPT_TRANSLATION_PARAMS: GenerationParams = {
  temperature: 0.3,
};

/**
 * Helper function to get parameters for any use case
 */
export function getGenerationParams(useCase: string): GenerationParams {
  const params: Record<string, GenerationParams> = {
    scene: { temperature: 0.82, topP: 0.91 }, // Balanced average: creative (0.9) + info (0.75-0.8)
    'inbox-email': INBOX_GENERATION_PARAMS,
    'inbox-text': INBOX_TEXT_PARAMS,
    localization: LOCALIZER_PARAMS,
    analysis: PROMPT_ANALYSIS_PARAMS,
    metadata: METADATA_GENERATION_PARAMS,
    'phishing-scenario': PHISHING_SCENARIO_PARAMS,
    'phishing-content': PHISHING_CONTENT_PARAMS,
    editor: EDITOR_PARAMS,
    'code-review': CODE_REVIEW_PARAMS,
    'low-determinism': LOW_DETERMINISM_PARAMS,
    extraction: EXTRACTION_PARAMS,
    'brand-creative': BRAND_CREATIVE_PARAMS,
    classification: CLASSIFICATION_PARAMS,
    reasoning: REASONING_PARAMS,
    default: DEFAULT_GENERATION_PARAMS,
  };

  return params[useCase] || DEFAULT_GENERATION_PARAMS;
}

/**
 * SUMMARY TABLE
 *
 * Use Case                     | Temp  | topP | Special Params | Philosophy
 * -----                        | ---   | ---- | -------------- | -----------
 * Scene 1,3,7 (CREATIVE)       | 0.9   | 0.92 | -              | High engagement & variety
 * Scene 2,4,5,6,8 (INFO)       | 0.75-0.8 | 0.90 | -            | Clear & accurate info
 * Inbox Emails (High Creative) | 0.9   | 0.92 | -              | Realistic variation
 * Inbox Texts (Natural SMS)    | 0.85  | 0.90 | -              | Natural messaging
 * Localization & Translation   | 0.65  | 0.92 | freq:0.2, pres:0.3 | Natural + Meaning preserved
 * Analysis (Structured)        | 0.7   | 0.85 | -              | Structured flexibility
 * Metadata (Coherent)          | 0.6   | 0.85 | -              | Coherent clarity
 *
 * KEY INSIGHTS:
 * - CREATIVE (1,3,7): temp 0.9, topP 0.92 → Maximum engagement without losing coherence
 * - INFO (2,4,5,6,8): temp 0.75-0.8, topP 0.90 → Clear, accurate, consistent
 * - HIGH temp (0.85-0.9): Emails, Texts → Realistic & natural
 * - MID temp (0.65-0.7): Localization, Analysis, Metadata → Balanced
 * - LOCALIZATION (0.65): Scene + Inbox translation → Natural + Meaning preserved
 *
 * LOCALIZATION PHILOSOPHY:
 * - Doğal, kültürel olarak yerel hissettiren çeviri
 * - Anlam koruması ama robotik değil
 * - frequencyPenalty: 0.2 → Tekrar eden kelimeleri engelle (natural phrasing)
 * - presencePenalty: 0.3 → Yeni kelimeleri teşvik et (native vocabulary)
 *
 * topP ranges 0.8-0.92 = Good diversity without hallucination
 */
