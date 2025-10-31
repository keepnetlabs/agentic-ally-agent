/**
 * Global Constants for Agentic Ally
 * Centralized configuration for magic numbers, strings, and patterns
 * Updated: October 31, 2025
 */

// ============================================
// MICROLEARNING CONFIGURATION
// ============================================

export const MICROLEARNING = {
  // Training duration (always 5 minutes)
  DURATION_MINUTES: 5,

  // Scene configuration
  SCENE_COUNT: 8,
  SCENE_TYPES: [
    'intro',
    'goals',
    'video',
    'actionable',
    'quiz',
    'survey',
    'nudge',
    'summary',
  ] as const,

  // Scene timing (in seconds)
  SCENE_DURATIONS_SECONDS: {
    intro: { min: 15, max: 20 },
    goals: { fixed: 20 },
    video: { min: 60, max: 120 },
    actionable: { min: 30, max: 45 },
    quiz: { min: 45, max: 60 },
    survey: { min: 30, max: 45 },
    nudge: { min: 15, max: 25 },
    summary: { min: 20, max: 30 },
  },

  // Content constraints
  MAX_HIGHLIGHTS: 5,
  MAX_KEY_MESSAGES: 3,
  MAX_LEARNING_OBJECTIVES: 5,
  MIN_LEARNING_OBJECTIVES: 1,
  MAX_TOPICS: 8,
  MIN_TOPICS: 1,
  MAX_IMMEDIATE_ACTIONS: 5,
  MIN_IMMEDIATE_ACTIONS: 1,
  MAX_QUIZ_OPTIONS: 5,
  MIN_QUIZ_OPTIONS: 2,
  MAX_QUIZ_ATTEMPTS: 5,
  MIN_QUIZ_ATTEMPTS: 1,
} as const;

// ============================================
// PROMPT ANALYSIS CONFIGURATION
// ============================================

export const PROMPT_ANALYSIS = {
  // Input constraints
  MIN_PROMPT_LENGTH: 5,
  MAX_PROMPT_LENGTH: 5000,
  MAX_ADDITIONAL_CONTEXT_LENGTH: 2000,
  MAX_CUSTOM_REQUIREMENTS_LENGTH: 1000,
  MAX_DEPARTMENT_NAME_LENGTH: 100,

  // Context summary
  MAX_CONTEXT_SUMMARY_LENGTH: 300,

  // Language code validation
  LANGUAGE_CODE_REGEX: /^[a-z]{2}(-[a-z]{2})?$/i,

  // Supported languages (12 languages)
  SUPPORTED_LANGUAGES: [
    'en',
    'tr',
    'de',
    'fr',
    'es',
    'pt',
    'it',
    'ru',
    'zh',
    'ja',
    'ar',
    'ko',
  ] as const,

  // Default language
  DEFAULT_LANGUAGE: 'en-gb',

  // Difficulty levels
  DIFFICULTY_LEVELS: ['Beginner', 'Intermediate', 'Advanced'] as const,

  // Priority levels
  PRIORITY_LEVELS: ['low', 'medium', 'high'] as const,
} as const;

// ============================================
// CLOUDFLARE KV CONFIGURATION
// ============================================

export const CLOUDFLARE_KV = {
  // Key prefix for microlearning data
  KEY_PREFIX: 'ml:',

  // Key structure separators
  KEY_SEPARATOR: ':',

  // Key templates
  KEY_TEMPLATES: {
    base: (id: string) => `ml:${id}:base`,
    language: (id: string, lang: string) => `ml:${id}:lang:${lang}`,
    inbox: (id: string, dept: string, lang: string) =>
      `ml:${id}:inbox:${dept}:${lang}`,
    healthCheck: () => `health_check_${Date.now()}`,
  },

  // List query limits
  LIST_MAX_RESULTS: 100,
  SEMANTIC_SEARCH_MAX_RESULTS: 3,
} as const;

// ============================================
// RETRY & TIMEOUT CONFIGURATION
// ============================================

export const RETRY = {
  // KV retry attempts
  MAX_ATTEMPTS: 3,

  // Exponential backoff delays (in milliseconds)
  BACKOFF_DELAYS_MS: [1000, 2000, 4000],

  // Calculate delay: Math.pow(2, attempt) * 1000
  // Attempt 0: 1000ms
  // Attempt 1: 2000ms
  // Attempt 2: 4000ms
  getBackoffDelay(attempt: number): number {
    return Math.pow(2, attempt) * 1000;
  },

  // Semantic search retry fallback levels
  FALLBACK_LEVELS: ['semantic', 'sampling', 'basic'] as const,
} as const;

// ============================================
// EXAMPLE REPOSITORY CONFIGURATION
// ============================================

export const EXAMPLE_REPO = {
  // Max examples to load into memory
  MAX_EXAMPLES_TO_LOAD: 5,

  // Default max files for schema hints
  MAX_FILES_FOR_HINTS: 3,

  // Complexity scoring
  COMPLEXITY_MIN: 1,
  COMPLEXITY_MAX: 5,

  // D1 cache settings
  D1_CACHE: {
    VERSION: '1.0.0',
    TABLE_NAME: 'embedding_cache',
  },

  // Semantic search options
  SEMANTIC_SEARCH: {
    THRESHOLD: 0.1,
    USE_HYBRID: true,
    CONTEXT_WEIGHT: 0.7,
    MAX_RESULTS: 3,
  },

  // Query complexity detection
  COMPLEX_QUERY_KEYWORDS: [
    'advanced',
    'specific',
    'detailed',
    'custom',
  ] as const,
  COMPLEX_QUERY_MIN_LENGTH: 50,
} as const;

// ============================================
// LOGGING CONFIGURATION
// ============================================

export const LOGGING = {
  // Log levels
  LEVELS: ['debug', 'info', 'warn', 'error'] as const,

  // Emoji prefixes for console output
  EMOJIS: {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
    start: '🤖',
    semantic: '✨',
    sampling: '🎯',
    basic: '📋',
    cache: '💾',
    kv: '📦',
    database: '🗑️',
    load: '📚',
    generate: '🔄',
    clock: '⏱️',
  } as const,

  // Error text truncation
  MAX_ERROR_TEXT_LENGTH: 200,
} as const;

// ============================================
// MODEL PROVIDER CONFIGURATION
// ============================================

export const MODEL_PROVIDERS = {
  NAMES: ['OPENAI', 'WORKERS_AI', 'GOOGLE'] as const,

  // Default model per provider
  DEFAULTS: {
    OPENAI: 'OPENAI_GPT_4O_MINI',
    WORKERS_AI: 'WORKERS_AI_GPT_OSS_120B',
    GOOGLE: 'GOOGLE_GENERATIVE_AI_GEMINI_15',
  },
} as const;

// ============================================
// VALIDATION CONSTRAINTS
// ============================================

export const VALIDATION = {
  // Password patterns
  WEAK_PASSWORD_PATTERNS: [
    /^[a-z]{4,}$/i, // Only lowercase
    /^[A-Z]{4,}$/,  // Only uppercase
    /^\d{4,}$/,     // Only digits
  ] as RegExp[],

  // Email patterns
  EMAIL_DOMAIN_REGEX: /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // HTML tag validation
  HTML_TAG_REGEX: /<\/?[a-z][\w-]*>/gi,

  // Max open tags before flagging as suspicious
  MAX_OPEN_TAGS_BEFORE_CLOSE: 5,
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  ENV_VARS_MISSING: 'Missing required environment variables:',
  INVALID_LANGUAGE_CODE: 'Invalid language code format (e.g., en, en-US, en-gb)',
  PROMPT_TOO_SHORT: `Prompt must be at least ${PROMPT_ANALYSIS.MIN_PROMPT_LENGTH} characters`,
  PROMPT_TOO_LONG: `Prompt must not exceed ${PROMPT_ANALYSIS.MAX_PROMPT_LENGTH} characters`,
  MICROLEARNING_NOT_FOUND: 'Microlearning not found or invalid',
  INVALID_JSON_STRUCTURE: 'JSON structure does not match expected schema',
  EMBEDDING_GENERATION_FAILED: 'Failed to generate embeddings',
  KV_OPERATION_FAILED: 'KV operation failed',
  SEMANTIC_SEARCH_FAILED: 'Semantic search failed',
} as const;

// ============================================
// DEPARTMENTS
// ============================================

export const DEPARTMENTS = {
  VALUES: [
    'IT',
    'HR',
    'Sales',
    'Finance',
    'Operations',
    'Management',
    'All',
  ] as const,
  DEFAULT: 'All',
} as const;

// ============================================
// CACHE & PERFORMANCE
// ============================================

export const CACHE = {
  // Basic schema hints cache generation flag
  BASIC_SCHEMA_CACHE_ENABLED: true,

  // Example loading performance optimization
  SKIP_EXPENSIVE_LOADING: false, // Set to true for faster startup
} as const;
