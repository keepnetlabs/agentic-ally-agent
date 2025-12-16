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
// TRAINING CONFIGURATION
// ============================================

export const TRAINING_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const DEFAULT_TRAINING_LEVEL = 'Intermediate' as const;

export const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const;
export const DEFAULT_PRIORITY = 'medium' as const;

// ============================================
// PROMPT ANALYSIS CONFIGURATION
// ============================================

export const PROMPT_ANALYSIS = {
  // Input constraints
  MIN_PROMPT_LENGTH: 5,
  MAX_PROMPT_LENGTH: 5000,
  MAX_ADDITIONAL_CONTEXT_LENGTH: 5000,
  MAX_CUSTOM_REQUIREMENTS_LENGTH: 1000,
  MAX_DEPARTMENT_NAME_LENGTH: 100,

  // Language code validation
  LANGUAGE_CODE_REGEX: /^[a-z]{2}(-[a-z]{2})?$/i,

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

  // Consistency check configuration
  // Note: 1 second interval to avoid Cloudflare rate limiting
  CONSISTENCY_CHECK: {
    ENABLED: true,
    MAX_WAIT_MS: 10000, // 10 seconds
    CHECK_INTERVAL_MS: 1000, // 1 second (safe for rate limits)
  },
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
// TIMEOUT CONFIGURATION
// ============================================

/**
 * Default timeout for agent calls (600s - extended to 10 mins for long-running generation tasks)
 * Can be overridden per operation if needed
 */
export const AGENT_CALL_TIMEOUT_MS = 600000;

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
    OPENAI: 'OPENAI_GPT_4O',
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
  // System errors
  ENV_VARS_MISSING: 'Missing required environment variables:',
  INVALID_LANGUAGE_CODE: 'Invalid language code format (e.g., en, en-US, en-gb)',
  PROMPT_TOO_SHORT: `Prompt must be at least ${PROMPT_ANALYSIS.MIN_PROMPT_LENGTH} characters`,
  PROMPT_TOO_LONG: `Prompt must not exceed ${PROMPT_ANALYSIS.MAX_PROMPT_LENGTH} characters`,
  MICROLEARNING_NOT_FOUND: 'Microlearning not found or invalid',
  INVALID_JSON_STRUCTURE: 'JSON structure does not match expected schema',
  EMBEDDING_GENERATION_FAILED: 'Failed to generate embeddings',
  KV_OPERATION_FAILED: 'KV operation failed',
  SEMANTIC_SEARCH_FAILED: 'Semantic search failed',

  // Phishing workflow errors
  PHISHING: {
    NO_OUTPUT: 'Unable to generate phishing email. Please try again or simplify your request.',
    ANALYSIS_FAILED: 'Failed to analyze your request. Please provide more details about the phishing scenario.',
    GENERATION_FAILED: 'Failed to generate email content. Please try again with a simpler scenario.',
    GENERIC: 'Unable to generate phishing email. Please try again or contact support if the issue persists.'
  },

  // Workflow execution errors
  WORKFLOW: {
    EXECUTION_FAILED: 'Workflow execution failed. Please try again.',
    UNKNOWN_ERROR: 'Unknown error occurred during workflow execution.'
  },

  // Authentication errors
  AUTH: {
    TOKEN_MISSING: 'Authentication token missing.',
    UNAUTHORIZED: 'Unauthorized access.'
  },

  // Platform integration errors
  PLATFORM: {
    UPLOAD_FAILED: 'Failed to upload training to platform.',
    ASSIGN_FAILED: 'Failed to assign training to user.',
    UPLOAD_TOKEN_MISSING: 'Authentication token missing. Cannot upload training.',
    ASSIGN_TOKEN_MISSING: 'Authentication token missing. Cannot assign training.',
    UNKNOWN_UPLOAD_ERROR: 'Unknown upload error occurred.',
    UNKNOWN_ASSIGN_ERROR: 'Unknown assignment error occurred.'
  },

  // User info errors
  USER_INFO: {
    TOKEN_MISSING: 'Authentication token missing.',
    FETCH_FAILED: 'Failed to fetch user information.',
    UNKNOWN_ERROR: 'Unknown error occurred while fetching user info.'
  },

  // Search errors
  SEARCH: {
    FAILED: 'Search failed. Please try again.'
  }
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
// ROLES
// ============================================

export const ROLES = {
  VALUES: [
    'All Employees',
    'IT Department',
    'Executives',
    'New Employees',
    'Finance Department',
    'Human Resource Department',
    'Marketing Department',
    'Sales Department',
    'Production Department',
    'Purchase Department',
    'Customer Service Support Department',
    'General',
    'Board Members',
  ] as const,
  DEFAULT: 'All Employees',
} as const;

// ============================================
// CATEGORIES
// ============================================

export const CATEGORIES = {
  VALUES: [
    'Remote Working Security',
    'Travel Security',
    'Mobile Device Security',
    'Email Security',
    'Social Media Security',
    'Safe Online Shopping',
    'Malware',
    'Physical Security',
    'Cyber Spying',
    'Password Security',
    'GDPR',
    'Social Engineering',
    'Removable Media',
    'Wi-Fi Security',
    'General',
    'Cloud Security',
    'Insider Threats',
    'Incident Response',
    'AI/ML Security',
    'IoT Security',
    'Deepfake & Synthetic Media',
    'AI-Powered Threats',
    'Ransomware & Extortion',
    'Zero Trust Architecture',
    'Biometric Security',
    'Supply Chain Attacks',
    'Hospitality',
  ] as const,
  DEFAULT: 'General',
} as const;

// ============================================
// THEME COLORS
// ============================================

export const THEME_COLORS = {
  VALUES: [
    'bg-gradient-red',
    'bg-gradient-blue',
    'bg-gradient-green',
    'bg-gradient-gray',
    'bg-gradient-purple',
    'bg-gradient-yellow-smoke',
    'bg-gradient-yellow',
    'bg-gradient-light-yellow',
    'bg-gradient-orange',
    'bg-gradient-light-blue',
    'bg-gradient-pink',
    'bg-gradient-teal',
    'bg-gradient-indigo',
    'bg-gradient-emerald',
    'bg-gradient-violet',
    'bg-gradient-amber',
  ] as const,
  DEFAULT: 'bg-gradient-gray',
  COLOR_MAPPING: {
    // Risk/Security threats → Red
    malware: 'bg-gradient-red',
    ransomware: 'bg-gradient-red',
    phishing: 'bg-gradient-red',
    'cyber spying': 'bg-gradient-red',
    'insider threats': 'bg-gradient-red',

    // Trust/Safety → Green
    'physical security': 'bg-gradient-green',
    'safe online shopping': 'bg-gradient-green',

    // Technology/Cloud → Blue
    'cloud security': 'bg-gradient-blue',
    'iot security': 'bg-gradient-blue',
    'wi-fi security': 'bg-gradient-blue',

    // Compliance/Legal → Purple
    gdpr: 'bg-gradient-purple',
    'incident response': 'bg-gradient-purple',

    // AI/Innovation → Orange/Yellow
    'ai/ml security': 'bg-gradient-orange',
    'ai-powered threats': 'bg-gradient-orange',
    'deepfake & synthetic media': 'bg-gradient-yellow',

    // People/HR → Pink/Light Blue
    'social engineering': 'bg-gradient-pink',
    'social media security': 'bg-gradient-light-blue',

    // Default
    general: 'bg-gradient-gray',
  } as const,
} as const;

// ============================================
// AGENT NAMES
// ============================================

export const AGENT_NAMES = {
  PHISHING: 'phishingEmailAssistant',
  MICROLEARNING: 'microlearningAgent',
  USER_INFO: 'userInfoAssistant',
  ORCHESTRATOR: 'orchestrator'
} as const;

// ============================================
// PHISHING SIMULATION CONFIGURATION
// ============================================

export const PHISHING = {
  // Difficulty levels
  DIFFICULTY_LEVELS: ['Easy', 'Medium', 'Hard'] as const,
  DEFAULT_DIFFICULTY: 'Medium',

  // Attack methods
  ATTACK_METHODS: ['Click-Only', 'Data-Submission'] as const,
  DEFAULT_ATTACK_METHOD: 'Data-Submission',

  // Workflow configuration
  WORKFLOW_TYPE: 'create-phishing',

  // Timing estimates (includes 3s delay + AI generation + reasoning stream)
  TIMING: {
    GENERATION_SECONDS_MIN: 20,
    GENERATION_SECONDS_MAX: 30
  },

  // Input validation
  MIN_TOPIC_LENGTH: 3,
  MAX_TOPIC_LENGTH: 200
} as const;

// ============================================
// PHISHING EMAIL CONFIGURATION
// ============================================

export const PHISHING_EMAIL = {
  // Dynamic merge tags available in phishing email templates
  MERGE_TAGS: [
    '{FULLNAME}',
    '{FIRSTNAME}',
    '{LASTNAME}',
    '{EMAIL}',
    '{PHISHINGURL}',
    '{FROMNAME}',
    '{FROMEMAIL}',
    '{SUBJECT}',
    '{DATEEMAILSENT}',
    '{COMPANYNAME}',
    '{CUSTOMMAINLOGO}',
    '{DATE_SENT}',
    '{CURRENT_DATE}',
    '{CURRENT_DATE_PLUS_10_DAYS}',
    '{CURRENT_DATE_MINUS_10_DAYS}',
    '{RANDOM_NUMBER_1_DIGIT}',
    '{RANDOM_NUMBER_2_DIGITS}',
    '{RANDOM_NUMBER_3_DIGITS}'
  ] as const,

  // Content constraints
  MAX_SUBJECT_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 300,

  // Mandatory tags for valid phishing emails
  MANDATORY_TAGS: ['{PHISHINGURL}'] as const,

  // Recommended tags for better realism
  RECOMMENDED_TAGS: ['{FIRSTNAME}', '{COMPANYNAME}', '{CURRENT_DATE}'] as const
} as const;

// ============================================
// LANDING PAGE CONFIGURATION
// ============================================

export const LANDING_PAGE = {
  // Page types for templates
  PAGE_TYPES: ['login', 'success', 'info'] as const,

  // Flow definitions based on attack method
  FLOWS: {
    'Data-Submission': ['login', 'success'],
    'Click-Only': ['info']
  },

  // Dynamic placeholders for landing pages
  PLACEHOLDERS: {
    SIMULATION_LINK: '{SIMULATION_LINK}',
    TRACK_ID: '{TRACK_ID}',
    EMAIL: '{EMAIL}'
  }
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

// ============================================
// ORCHESTRATOR ROUTING CONFIGURATION
// ============================================

export const ROUTING = {
  // User confirmation triggers
  CONFIRMATION_TRIGGERS: ['Yes', 'Proceed', 'Do it', 'Oluştur', 'Tamam'] as const,

  // Microlearning triggers
  MICROLEARNING_TRIGGERS: [
    'Create training',
    'Build module',
    'Teach phishing',
    'Upload training',
    'Translate',
  ] as const,

  // Phishing triggers
  PHISHING_TRIGGERS: [
    'Phishing email',
    'Draft template',
    'Simulate attack',
    'Fake landing page',
    'Upload simulation',
  ] as const,

  // Platform actions
  PLATFORM_ACTIONS: ['Upload', 'Assign', 'Send', 'Deploy', 'Yükle', 'Gönder'] as const,

  // Training keywords
  TRAINING_KEYWORDS: ['Training', 'Module', 'Course', 'Microlearning', 'Learn'] as const,

  // Phishing keywords
  PHISHING_KEYWORDS: ['Simulation', 'Attack', 'Template', 'Fake Email', 'Test'] as const,

  // User analysis triggers
  USER_ANALYSIS_TRIGGERS: ['Who is', 'Find', 'Analyze'] as const,
} as const;

// ============================================
// API ENDPOINTS & AUTHENTICATION
// ============================================

export const API_ENDPOINTS = {
  // Phishing worker endpoints
  PHISHING_WORKER_URL: process.env.PHISHING_WORKER_URL || 'https://crud-phishing-worker.keepnet-labs-ltd-business-profile4086.workers.dev/submit',
  PHISHING_WORKER_SUBMIT: process.env.PHISHING_WORKER_URL || 'https://crud-phishing-worker.keepnet-labs-ltd-business-profile4086.workers.dev/submit',
  PHISHING_WORKER_SEND: process.env.PHISHING_WORKER_SEND || 'https://crud-phishing-worker.keepnet-labs-ltd-business-profile4086.workers.dev/send',

  // Training worker endpoints
  TRAINING_WORKER_URL: process.env.TRAINING_WORKER_URL || 'https://crud-training-worker.keepnet-labs-ltd-business-profile4086.workers.dev/submit',
  TRAINING_WORKER_SEND: process.env.TRAINING_WORKER_SEND || 'https://crud-training-worker.keepnet-labs-ltd-business-profile4086.workers.dev/send',

  // Platform API endpoints
  PLATFORM_API_URL: process.env.PLATFORM_API_URL || 'https://test-api.devkeepnet.com',

  // Microlearning API endpoints
  MICROLEARNING_API_URL: process.env.MICROLEARNING_API_URL || 'https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/',

  // Product backend endpoints
  PRODUCT_API_URL: process.env.PRODUCT_API_URL || '',
  PRODUCT_WHITELABELING_ENDPOINT: '/whitelabeling',
} as const;

// API Keys and authentication
export const API_KEYS = {
  // Product API key (from environment or default placeholder)
  PRODUCT_API_KEY: process.env.PRODUCT_API_KEY || 'apikey',
} as const;
