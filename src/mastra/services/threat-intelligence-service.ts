/**
 * Threat Intelligence Service
 *
 * Provides current threat landscape context to content generators.
 * Makes AI-generated training content realistic and up-to-date.
 *
 * V1: Static JSON fallback (threat-intelligence.json, updated quarterly)
 * V2 (planned): Weekly cron + Jina web search → KV cache with TTL
 *
 * Usage:
 *   const context = await getThreatContext('Phishing');
 *   // Returns formatted prompt section or undefined
 */

import { getLogger } from '../utils/core/logger';
import staticIntelligence from '../data/threat-intelligence.json';

const logger = getLogger('ThreatIntelligenceService');

// ============================================================================
// Types
// ============================================================================

export interface ThreatIntelEntry {
  currentTechniques: string[];
  realisticScenarios: string[];
}

// ============================================================================
// Role & Difficulty Mapping
// ============================================================================

/** Map department/role to relevant threat keywords */
const ROLE_THREAT_KEYWORDS: Record<string, string[]> = {
  'Finance': ['vendor', 'payment', 'invoice', 'wire', 'account', 'transfer'],
  'HR': ['onboarding', 'benefits', 'enrollment', 'hiring', 'salary', 'compensation'],
  'IT': ['github', 'oauth', 'vpn', 'credential', 'password', 'mfa', 'ssh', 'api', 'firmware'],
  'Sales': ['customer', 'deal', 'contract', 'proposal', 'client', 'prospect'],
  'Executive': ['ceo', 'cfо', 'executive', 'board', 'confidential', 'strategic'],
  'All': [], // No filtering
};

/** Difficulty signals in threat scenarios */
const DIFFICULTY_SIGNALS: Record<string, string[]> = {
  'Beginner': ['urgent', 'click', 'verify', 'confirm', 'act now', 'immediate', 'external domain', 'obvious'],
  'Advanced': ['legitimate', 'spoofed', 'analysis', 'firmware', 'header', 'impersonation', 'subtle', 'internal domain'],
};

/**
 * Related category mapping for cross-category technique blending
 * Pulls 1 extra technique from a related category for variety
 */
const RELATED_CATEGORIES: Record<string, string[]> = {
  'phishing': ['email_security', 'social_engineering'],
  'smishing': ['mobile_security', 'social_engineering'],
  'vishing': ['social_engineering', 'deepfake'],
  'quishing': ['phishing', 'mobile_security'],
  'ransomware': ['incident_response', 'business_continuity'],
  'social_engineering': ['phishing', 'vishing'],
  'deepfake': ['vishing', 'social_engineering'],
  'password': ['mfa', 'zero_trust'],
  'mfa': ['password', 'zero_trust'],
  'data_privacy': ['compliance', 'insider_threat'],
  'insider_threat': ['data_privacy', 'zero_trust'],
  'remote_work': ['mobile_security', 'cloud_security'],
  'cloud_security': ['remote_work', 'zero_trust'],
  'supply_chain': ['cloud_security', 'compliance'],
  'mobile_security': ['remote_work', 'smishing'],
  'email_security': ['phishing', 'social_engineering'],
  'secure_coding': ['cloud_security', 'supply_chain'],
  'zero_trust': ['mfa', 'cloud_security'],
  'compliance': ['data_privacy', 'supply_chain'],
  'incident_response': ['ransomware', 'business_continuity'],
  'business_continuity': ['ransomware', 'incident_response'],
  'usb_security': ['insider_threat', 'data_privacy'],
  'tailgating': ['insider_threat', 'social_engineering'],
  'secure_browsing': ['phishing', 'mobile_security'],
  'iot_security': ['mobile_security', 'zero_trust'],
  'encryption': ['data_privacy', 'compliance'],
};

/**
 * Adaptive technique count based on learner level
 * Beginner: simple, obvious techniques
 * Intermediate: moderate depth
 * Advanced: comprehensive, subtle techniques
 */
const TECHNIQUE_COUNT_BY_LEVEL: Record<string, number> = {
  'Beginner': 2,
  'Intermediate': 3,
  'Advanced': 5,
};

/**
 * Tone variants for threat context (minimal)
 * Affects framing without inflating token count
 */
const TONE_VARIANTS: Record<string, { prefix: string; style: string }> = {
  'formal': {
    prefix: 'Current threats (2026):',
    style: 'analytical',
  },
  'casual': {
    prefix: 'Real attacks now:',
    style: 'practical',
  },
  'urgent': {
    prefix: '⚠️ ACTIVE NOW:',
    style: 'urgent',
  },
};

/**
 * Pick tone based on learner level
 * Beginner: Always casual (friendly, accessible)
 * Intermediate: Always casual (easy to understand)
 * Advanced: Formal or urgent (structured analysis or high stakes)
 */
function selectTone(level?: string): string {
  if (level === 'Beginner') return 'casual';
  if (level === 'Intermediate') return 'casual';
  if (level === 'Advanced') return Math.random() > 0.5 ? 'formal' : 'urgent';
  return 'casual'; // Default
}

/**
 * Scenario difficulty scoring (1-5 scale)
 * 1: Obvious red flags (Beginner)
 * 3: Mixed signals (Intermediate)
 * 5: Subtle/sophisticated (Advanced)
 */
function scoreScenarioDifficulty(scenario: string): number {
  const beginnerSignals = DIFFICULTY_SIGNALS['Beginner'];
  const advancedSignals = DIFFICULTY_SIGNALS['Advanced'];

  const beginnerMatches = beginnerSignals.filter(s =>
    scenario.toLowerCase().includes(s.toLowerCase())
  ).length;

  const advancedMatches = advancedSignals.filter(s =>
    scenario.toLowerCase().includes(s.toLowerCase())
  ).length;

  // Score: 1-5 based on signal distribution
  if (beginnerMatches >= 2) return 1; // Obvious
  if (beginnerMatches === 1) return 2; // Clear warnings
  if (advancedMatches >= 2) return 5; // Subtle/Advanced
  if (advancedMatches === 1) return 4; // Sophisticated
  return 3; // Neutral/Mixed
}

// ============================================================================
// Topic Resolution
// ============================================================================

/** Keyword → threat-intelligence key mapping. Order matters — first match wins. */
const TOPIC_KEYWORDS: [string, string][] = [
  // Order matters — more specific keywords first to avoid false matches
  // Specific attack vectors
  ['quishing', 'quishing'],
  ['qr code', 'quishing'],
  ['vishing', 'vishing'],
  ['voice phishing', 'vishing'],
  ['smishing', 'smishing'],
  ['sms phishing', 'smishing'],
  ['business email compromise', 'phishing'],
  ['bec', 'phishing'],
  ['ceo fraud', 'phishing'],
  ['spear phishing', 'phishing'],
  ['phishing', 'phishing'],
  ['ransomware', 'ransomware'],
  ['malware', 'ransomware'],
  ['backup', 'business_continuity'],
  // Social / human attacks
  ['social engineering', 'social_engineering'],
  ['pretexting', 'social_engineering'],
  ['deepfake', 'deepfake'],
  ['voice cloning', 'deepfake'],
  // Authentication & access
  ['multi-factor', 'mfa'],
  ['two-factor', 'mfa'],
  ['2fa', 'mfa'],
  ['mfa', 'mfa'],
  ['password', 'password'],
  ['credential', 'password'],
  ['passkey', 'password'],
  // Privacy & compliance
  ['data privacy', 'data_privacy'],
  ['data protection', 'data_privacy'],
  ['gdpr', 'data_privacy'],
  ['kvkk', 'data_privacy'],
  ['pii', 'data_privacy'],
  // Incident & process
  ['incident response', 'incident_response'],
  ['incident management', 'incident_response'],
  ['breach response', 'incident_response'],
  // Physical & device
  ['usb', 'usb_security'],
  ['removable media', 'usb_security'],
  ['tailgating', 'tailgating'],
  ['piggybacking', 'tailgating'],
  ['physical security', 'tailgating'],
  ['badge', 'tailgating'],
  // Insider
  ['insider threat', 'insider_threat'],
  ['insider risk', 'insider_threat'],
  ['data leakage', 'insider_threat'],
  // Web & browsing
  ['browsing', 'secure_browsing'],
  ['web security', 'secure_browsing'],
  ['malvertising', 'secure_browsing'],
  ['safe browsing', 'secure_browsing'],
  // Remote & network
  ['remote work', 'remote_work'],
  ['work from home', 'remote_work'],
  ['hybrid work', 'remote_work'],
  ['vpn', 'remote_work'],
  ['wi-fi', 'remote_work'],
  ['wifi', 'remote_work'],
  ['byod', 'remote_work'],
  // Encryption
  ['encryption', 'encryption'],
  ['cryptography', 'encryption'],
  // Supply chain
  ['supply chain', 'supply_chain'],
  ['third-party risk', 'supply_chain'],
  ['vendor risk', 'supply_chain'],
  ['third party', 'supply_chain'],
  // Cloud
  ['cloud security', 'cloud_security'],
  ['cloud misconfiguration', 'cloud_security'],
  ['saas security', 'cloud_security'],
  ['aws', 'cloud_security'],
  ['azure', 'cloud_security'],
  ['s3 bucket', 'cloud_security'],
  // Mobile
  ['mobile security', 'mobile_security'],
  ['mobile device', 'mobile_security'],
  ['smartphone', 'mobile_security'],
  ['mdm', 'mobile_security'],
  // IoT
  ['iot', 'iot_security'],
  ['internet of things', 'iot_security'],
  ['smart device', 'iot_security'],
  ['connected device', 'iot_security'],
  // Zero trust
  ['zero trust', 'zero_trust'],
  ['least privilege', 'zero_trust'],
  ['micro-segmentation', 'zero_trust'],
  // Email security (general)
  ['email security', 'email_security'],
  ['dmarc', 'email_security'],
  ['dkim', 'email_security'],
  ['spf', 'email_security'],
  ['email authentication', 'email_security'],
  // Compliance
  ['compliance', 'compliance'],
  ['regulatory', 'compliance'],
  ['audit', 'compliance'],
  ['eu ai act', 'compliance'],
  ['sox', 'compliance'],
  ['hipaa', 'compliance'],
  ['pci', 'compliance'],
  ['iso 27001', 'compliance'],
  ['nist', 'compliance'],
  // Secure coding
  ['secure coding', 'secure_coding'],
  ['code review', 'secure_coding'],
  ['owasp', 'secure_coding'],
  ['sql injection', 'secure_coding'],
  ['api security', 'secure_coding'],
  ['prompt injection', 'secure_coding'],
  // Business continuity
  ['business continuity', 'business_continuity'],
  ['disaster recovery', 'business_continuity'],
  ['backup strategy', 'business_continuity'],
  ['recovery plan', 'business_continuity'],
];

/**
 * Resolve the intelligence key for a given topic string.
 * Checks topic first, then category as fallback.
 */
function resolveIntelKey(topic: string, category?: string): string | undefined {
  const topicLower = topic.toLowerCase();
  for (const [keyword, key] of TOPIC_KEYWORDS) {
    if (topicLower.includes(keyword)) return key;
  }
  if (category) {
    const catLower = category.toLowerCase();
    for (const [keyword, key] of TOPIC_KEYWORDS) {
      if (catLower.includes(keyword)) return key;
    }
  }
  return undefined;
}

// ============================================================================
// Filtering Helpers
// ============================================================================

/**
 * Filter scenarios by role relevance
 * Returns scenarios matching role-specific keywords
 */
function filterScenariosByRole(scenarios: string[], department?: string): string[] {
  if (!department || department === 'All') return scenarios;

  const keywords = ROLE_THREAT_KEYWORDS[department] || [];
  if (keywords.length === 0) return scenarios;

  return scenarios.filter(scenario =>
    keywords.some(kw => scenario.toLowerCase().includes(kw.toLowerCase()))
  );
}

/**
 * Filter scenarios by difficulty level
 * Beginner (score 1-2): obvious red flags
 * Intermediate (score 2-4): mixed signals
 * Advanced (score 4-5): subtle, legitimate-looking
 */
function filterScenariosByDifficulty(scenarios: string[], level?: string): string[] {
  if (!level) return scenarios;

  // Score each scenario and filter by level-appropriate difficulty
  const scoredScenarios = scenarios.map(scenario => ({
    scenario,
    score: scoreScenarioDifficulty(scenario),
  }));

  if (level === 'Beginner') {
    // Keep 1-2 difficulty (obvious red flags)
    return scoredScenarios
      .filter(s => s.score <= 2)
      .map(s => s.scenario);
  }

  if (level === 'Intermediate') {
    // Keep 2-4 difficulty (mixed signals)
    return scoredScenarios
      .filter(s => s.score >= 2 && s.score <= 4)
      .map(s => s.scenario);
  }

  if (level === 'Advanced') {
    // Keep 4-5 difficulty (subtle/sophisticated)
    return scoredScenarios
      .filter(s => s.score >= 4)
      .map(s => s.scenario);
  }

  return scenarios;
}

/**
 * Filter scenarios by custom focus keywords
 * E.g., "vendor invoice" → pick vendor-related scenarios
 */
/** Common stop words to exclude from keyword matching */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'if', 'while', 'that', 'this', 'these', 'those', 'it', 'its',
  'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who',
  'whom', 'up', 'also', 'like', 'use', 'make', 'focus', 'based', 'create',
  'include', 'ensure', 'related', 'specific', 'realistic', 'real',
]);

function filterScenariosByKeywords(scenarios: string[], customRequirements?: string): string[] {
  if (!customRequirements) return scenarios;

  // Extract meaningful keywords (exclude stop words)
  const keywords = (customRequirements.toLowerCase().match(/\b[a-z]+\b/g) || [])
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (keywords.length === 0) return scenarios;

  // Filter scenarios that match any custom keyword
  const filtered = scenarios.filter(scenario =>
    keywords.some(kw => scenario.toLowerCase().includes(kw))
  );

  // If filtering is too strict (removes all), return original
  return filtered.length > 0 ? filtered : scenarios;
}

// ============================================================================
// Data Source: Static Fallback
// ============================================================================

const staticData = staticIntelligence as unknown as Record<string, ThreatIntelEntry>;

function getStaticIntel(key: string): ThreatIntelEntry | undefined {
  const entry = staticData[key];
  if (!entry?.currentTechniques?.length) return undefined;
  return entry;
}

// ============================================================================
// Data Source: KV (V2 — future cron-populated cache)
// ============================================================================

// V2: Uncomment when cron job is implemented
// const KV_PREFIX = 'threat-intel:';
// const KV_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
//
// async function getKVIntel(key: string): Promise<ThreatIntelEntry | undefined> {
//   try {
//     const kvService = new KVService();
//     const data = await kvService.get<ThreatIntelEntry>(`${KV_PREFIX}${key}`);
//     return data || undefined;
//   } catch {
//     return undefined;
//   }
// }

// ============================================================================
// Public API
// ============================================================================

/**
 * Get formatted threat intelligence context for a topic.
 *
 * Returns a prompt-ready string with current techniques and realistic scenarios,
 * or undefined if no intelligence is available for the topic.
 *
 * @param topic - The training topic (e.g., "Phishing", "Ransomware Prevention")
 * @param category - Optional category fallback (e.g., "THREAT", "TOOL")
 * @returns Formatted context string for prompt injection, or undefined
 *
 * @example
 * ```typescript
 * const context = await getThreatContext('Phishing Awareness');
 * if (context) {
 *   prompt += `\n${context}\n`;
 * }
 * ```
 */
export async function getThreatContext(topic: string, category?: string): Promise<string | undefined> {
  const intelKey = resolveIntelKey(topic, category);
  if (!intelKey) {
    logger.debug('No threat intel match', { topic, category });
    return undefined;
  }

  // V2: Try KV first (cron-populated), fall back to static
  // const entry = await getKVIntel(intelKey) || getStaticIntel(intelKey);
  const entry = getStaticIntel(intelKey);

  if (!entry) {
    logger.debug('No threat intel data for key', { intelKey });
    return undefined;
  }

  logger.info('Threat intel context resolved', { topic, intelKey, techniques: entry.currentTechniques.length });

  return formatThreatContext(topic, entry, undefined, intelKey);
}

/**
 * Synchronous variant — uses static data only (no KV).
 * Use this when you cannot await (e.g., inside synchronous prompt builders).
 */
export function getThreatContextSync(topic: string, category?: string): string | undefined {
  const intelKey = resolveIntelKey(topic, category);
  if (!intelKey) return undefined;

  const entry = getStaticIntel(intelKey);
  if (!entry) return undefined;

  return formatThreatContext(topic, entry, undefined, intelKey);
}

/**
 * Get filtered threat intelligence based on department, level, and custom focus
 * Returns role-specific and difficulty-appropriate scenarios
 * Falls back to unfiltered if filtering is too strict
 *
 * @param topic - The training topic
 * @param department - Department/role (Finance, IT, HR, etc.)
 * @param level - Difficulty level (Beginner, Intermediate, Advanced)
 * @param customRequirements - User's custom focus (e.g., "vendor invoice" or "realistic threats")
 * @returns Formatted threat context with filtered scenarios, or undefined
 */
export function getThreatContextSyncFiltered(
  topic: string,
  department?: string,
  level?: string,
  customRequirements?: string
): string | undefined {
  const intelKey = resolveIntelKey(topic);
  if (!intelKey) {
    logger.debug('No threat intel match', { topic, department });
    return undefined;
  }

  const entry = getStaticIntel(intelKey);
  if (!entry) {
    logger.debug('No threat intel data for key', { intelKey });
    return undefined;
  }

  // Apply filters in order
  let filteredScenarios = entry.realisticScenarios || [];
  const filteredTechniques = entry.currentTechniques;

  // Filter 1: By department/role
  filteredScenarios = filterScenariosByRole(filteredScenarios, department);

  // Filter 2: By difficulty level (uses difficulty scoring)
  filteredScenarios = filterScenariosByDifficulty(filteredScenarios, level);

  // Filter 3: By custom focus keywords
  filteredScenarios = filterScenariosByKeywords(filteredScenarios, customRequirements);

  // If no scenarios matched, fall back to unfiltered (better than nothing)
  if (filteredScenarios.length === 0) {
    logger.debug('Filtered scenarios too strict, falling back to unfiltered', {
      topic,
      department,
      level,
    });
    filteredScenarios = entry.realisticScenarios || [];
  }


  // Create filtered entry
  const filteredEntry: ThreatIntelEntry = {
    currentTechniques: filteredTechniques,
    realisticScenarios: filteredScenarios,
  };

  logger.info('Threat intel context resolved (filtered)', {
    topic,
    department,
    level,
    techniques: filteredEntry.currentTechniques.length,
    scenarios: filteredEntry.realisticScenarios.length,
  });

  return formatThreatContext(topic, filteredEntry, level, intelKey);
}

// ============================================================================
// Formatting
// ============================================================================

/** Shuffle array and return first N items — ensures variety across generations */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get 1 bonus technique from a related category for cross-topic variety
 * Returns undefined if no related category has techniques
 */
function getRelatedTechnique(intelKey: string, existingTechniques: string[]): string | undefined {
  const related = RELATED_CATEGORIES[intelKey];
  if (!related) return undefined;

  // Pick a random related category
  const relatedKey = related[Math.floor(Math.random() * related.length)];
  const relatedEntry = getStaticIntel(relatedKey);
  if (!relatedEntry?.currentTechniques?.length) return undefined;

  // Pick 1 technique that's not already in the main set
  const unique = relatedEntry.currentTechniques.filter(t => !existingTechniques.includes(t));
  if (unique.length === 0) return undefined;

  return unique[Math.floor(Math.random() * unique.length)];
}

/**
 * Format threat context for prompt injection (COMPRESSED)
 * Picks varied random samples to prevent repetitive output
 * Minimal formatting for gpt-oss-120b token efficiency
 *
 * @param topic - Training topic
 * @param entry - Threat intelligence entry with techniques and scenarios
 * @param level - Optional learner level (adapts technique count and tone)
 * @param intelKey - Optional intel key for cross-category blending
 */
function formatThreatContext(topic: string, entry: ThreatIntelEntry, level?: string, intelKey?: string): string {
  // Adaptive technique count based on level
  const baseTechniqueCount = TECHNIQUE_COUNT_BY_LEVEL[level || 'Intermediate'] || 3;
  const techniqueCount = Math.min(entry.currentTechniques.length, baseTechniqueCount);
  const selectedTechniques = pickRandom(entry.currentTechniques, techniqueCount);

  // Blend: add 1 technique from related category (Intermediate+ only, saves tokens for Beginner)
  if (intelKey && level !== 'Beginner') {
    const bonus = getRelatedTechnique(intelKey, selectedTechniques);
    if (bonus) selectedTechniques.push(bonus);
  }

  const techniques = selectedTechniques
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n');

  // Pick up to 2-3 scenarios based on level
  const baseScenarioCount = level === 'Beginner' ? 1 : level === 'Advanced' ? 3 : 2;
  const scenarioCount = Math.min(entry.realisticScenarios?.length || 0, baseScenarioCount);
  const scenarios = scenarioCount > 0
    ? pickRandom(entry.realisticScenarios || [], scenarioCount)
      .map(s => `${s}`)
      .join('\n- ')
    : '';

  // Select tone based on level (minimal preamble)
  const tone = selectTone(level);
  const toneConfig = TONE_VARIANTS[tone];

  // COMPRESSED FORMAT: minimal headers, essential info only
  return `THREAT CONTEXT (${topic}):
${toneConfig.prefix}

TECHNIQUES:
${techniques}${scenarios ? `\nSCENARIOS:\n- ${scenarios}` : ''}

Create ORIGINAL variations — adapt & localize, don't copy verbatim.`;
}
