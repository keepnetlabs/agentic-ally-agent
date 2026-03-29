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

  return formatThreatContext(topic, entry);
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

  return formatThreatContext(topic, entry);
}

// ============================================================================
// Formatting
// ============================================================================

/** Shuffle array and return first N items — ensures variety across generations */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatThreatContext(topic: string, entry: ThreatIntelEntry): string {
  // Pick random subset each time → prevents repetitive output across generations
  const techniques = pickRandom(entry.currentTechniques, 2)
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n');

  const scenarios = pickRandom(entry.realisticScenarios || [], 1)
    .map(s => `- ${s}`)
    .join('\n');

  return `=== CURRENT THREAT LANDSCAPE (${topic}) ===
Use these real-world techniques as inspiration for realistic, current content:
${techniques}${scenarios ? `\n\nScenario inspiration:\n${scenarios}` : ''}
IMPORTANT: Create ORIGINAL scenarios inspired by these — do NOT copy or repeat them verbatim.`;
}
