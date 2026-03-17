/**
 * Customer Service Agent Swarm - Constants
 *
 * Ayrı dosya: Main constants.ts ile karışmaz.
 * CS agent'lara özel tüm config tek yerde.
 */

// ============================================
// CUSTOMER SERVICE AGENT NAMES & IDS
// ============================================

export const CS_AGENT_NAMES = {
  CS_ORCHESTRATOR: 'csOrchestrator',
  COMPANY_SEARCH: 'companySearchAssistant',
  TRAINING_STATS: 'trainingStatsAssistant',
  REPORT: 'reportAgent',
} as const;

export const CS_AGENT_IDS = {
  CS_ORCHESTRATOR: 'cs-orchestrator-agent',
  COMPANY_SEARCH: 'company-search-agent',
  TRAINING_STATS: 'training-stats-agent',
} as const;

// CS agent names type
export type CSAgentName = (typeof CS_AGENT_NAMES)[keyof typeof CS_AGENT_NAMES];

// CS agent'lar arası valid routing targets (orchestrator hariç)
export const CS_VALID_AGENTS: readonly CSAgentName[] = [
  CS_AGENT_NAMES.COMPANY_SEARCH,
  CS_AGENT_NAMES.TRAINING_STATS,
  CS_AGENT_NAMES.REPORT,
] as const;

// Fallback agent (routing başarısız olursa)
export const CS_DEFAULT_AGENT: CSAgentName = CS_AGENT_NAMES.COMPANY_SEARCH;

// ============================================
// COMPANY SEARCH CONFIGURATION
// ============================================

export const COMPANY_SEARCH = {
  API_TIMEOUT_MS: 15000,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_ORDER_BY: 'CreateTime',
} as const;

// ============================================
// TRAINING SEARCH CONFIGURATION
// ============================================

export const TRAINING_SEARCH = {
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_ORDER_BY: 'createTime',
} as const;

export const TRAINING_SEARCH_TYPES = {
  ALL: 1,
  MOST_POPULAR: 2,
  FAVOURITES: 3,
  CREATED_BY_ME: 4,
} as const;

export const TRAINING_TYPES = {
  LEARNING_PATH: 'Learning Path',
  SCORM: 'SCORM',
  POSTER: 'Poster',
  INFOGRAPHIC: 'Infographic',
  SCREENSAVER: 'Screensaver',
  SURVEY: 'Survey',
} as const;

export const TRAINING_LEVELS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
} as const;

// ============================================
// LOOKUP CONFIGURATION
// ============================================

export const LOOKUP_TYPE_IDS = {
  INDUSTRY: 2,
  LICENSE_TYPE: 3,
} as const;

// ============================================
// CS ERROR MESSAGES
// ============================================

export const CS_ERROR_MESSAGES = {
  TOKEN_MISSING: 'Authentication token missing for customer service request.',
  COMPANY_SEARCH_FAILED: 'Failed to search companies.',
  COMPANY_DETAIL_FAILED: 'Failed to fetch company details.',
  LOOKUP_FAILED: 'Failed to fetch lookup data.',
  ROUTING_FAILED: 'Customer service routing failed.',
  TRAINING_SEARCH_FAILED: 'Failed to search trainings.',
  TRAINING_LANGUAGES_FAILED: 'Failed to fetch training languages.',
  TRAINING_CATEGORIES_FAILED: 'Failed to fetch training categories.',
} as const;
