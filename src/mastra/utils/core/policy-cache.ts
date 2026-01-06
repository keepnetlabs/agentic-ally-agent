import { getPolicyContext } from './policy-fetcher';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { getLogger } from './logger';
import { normalizeError } from './error-utils';

const logger = getLogger('PolicyCache');

// Cache interface
interface CachedPolicy {
  summary: string;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache (company-level, shared across all requests)
const policyCache = new Map<string, CachedPolicy>();

// TTL: 1 hour (3600000 ms)
const CACHE_TTL_MS = 3600000;

/**
 * Get company policy summary (cached).
 * Fetches full policy once, summarizes it, and caches for 1 hour.
 * @returns Policy summary string or empty string if unavailable
 */
export async function getPolicySummary(): Promise<string> {
  const cacheKey = 'company-policy-summary';
  const now = Date.now();

  // Check cache validity
  if (policyCache.has(cacheKey)) {
    const cached = policyCache.get(cacheKey) as CachedPolicy;
    if (now < cached.expiresAt) {
      logger.debug('Returning cached policy summary', { cacheAge: now - cached.timestamp });
      return cached.summary;
    } else {
      logger.debug('Policy cache expired, refreshing');
      policyCache.delete(cacheKey);
    }
  }

  try {
    logger.info('Fetching and summarizing company policy');

    // Fetch full policy
    const fullPolicy = await getPolicyContext();

    if (!fullPolicy || fullPolicy.trim().length === 0) {
      logger.warn('No company policy available');
      return '';
    }

    logger.debug('Policy fetched, summarizing with AI');

    // Summarize policy with AI
    const systemPrompt = `You are a Security Policy Summarizer. Your task is to:
1. Read the full company security policy
2. Extract the most important sections and guidance
3. Create a comprehensive yet concise summary that covers all major policy areas

IMPORTANT:
- Include all major policy sections (phishing, passwords, data, incident response, etc.)
- Focus on actionable guidance
- Keep language clear and professional
- Return ONLY plain text summary, no JSON, no markdown formatting
- Make it comprehensive but digestible (2-4 pages equivalent)`;

    const userPrompt = `COMPANY POLICY (full):

${fullPolicy}

---

TASK: Create a comprehensive summary of this entire policy that covers all major areas and guidance. The summary will be used to provide context to other AI systems.`;

    const model = getModelWithOverride();

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5, // Consistent summarization
    });

    const summary = text.trim();

    // Cache the summary
    const cacheEntry: CachedPolicy = {
      summary,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    };

    policyCache.set(cacheKey, cacheEntry);

    logger.info('Policy summary cached', {
      summaryLength: summary.length,
      expiresIn: '1 hour',
    });

    return summary;
  } catch (error) {
    const err = normalizeError(error);
    logger.error('Failed to fetch/summarize policy', {
      error: err.message,
      stack: err.stack,
    });
    return '';
  }
}

/**
 * Clear policy cache (useful for testing or manual refresh)
 */
export function clearPolicyCache(): void {
  policyCache.clear();
  logger.info('Policy cache cleared');
}

/**
 * Get cache stats (for debugging)
 */
export function getPolicyCacheStats() {
  const cached = policyCache.get('company-policy-summary');
  if (!cached) {
    return { cached: false, size: 0 };
  }

  const now = Date.now();
  const isValid = now < cached.expiresAt;
  const ageMs = now - cached.timestamp;
  const ageMin = Math.round(ageMs / 60000);

  return {
    cached: true,
    isValid,
    ageMinutes: ageMin,
    expiresInMinutes: Math.round((cached.expiresAt - now) / 60000),
    summaryLength: cached.summary.length,
  };
}
