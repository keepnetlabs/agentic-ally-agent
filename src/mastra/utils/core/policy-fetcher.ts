import { getRequestContext } from './request-storage';
import { getLogger } from './logger';
import { withRetry } from './resilience-utils';
import { API_ENDPOINTS } from '../../constants';

const logger = getLogger('PolicyFetcher');

/**
 * Extract companyId from JWT token
 * Token format: header.payload.signature
 * Payload contains: { idp, user_company_resourceid, ... }
 */
function extractCompanyIdFromToken(token: string): string | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return undefined;
    }

    // Add padding if needed for base64 decode
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));

    // companyId is stored as user_company_resourceid in JWT
    return decoded.user_company_resourceid;
  } catch {
    return undefined;
  }
}

interface PolicyFile {
  name: string;
  blobUrl: string;
  [key: string]: unknown; // Allow other properties
}

interface PolicyContent {
  policyId: string;
  text: string;
  [key: string]: unknown;
}

/**
 * Fetch and prepare company policies as context string
 * Automatically extracts companyId from JWT token
 * Called once at workflow start to avoid repeated API calls
 */
export async function getPolicyContext(): Promise<string> {
  try {
    const { token } = getRequestContext();

    // Extract companyId from JWT token
    const companyId = token ? extractCompanyIdFromToken(token) : undefined;

    if (!companyId) {
      logger.debug('No companyId found in token, skipping policy context');
      return '';
    }

    logger.info('Fetching company policies', { companyId });

    // 1. List all policies
    const apiBaseUrl = API_ENDPOINTS.AGENTIC_AI_CHAT_URL;
    const listResponse = await withRetry(
      () =>
        fetch(`${apiBaseUrl}/api/files`, {
          headers: {
            'X-COMPANY-ID': companyId,
          },
        }),
      'policy-list-fetch',
      { maxAttempts: 1 }
    );

    if (!listResponse.ok) {
      logger.warn('Failed to list policies', { status: listResponse.status });
      return '';
    }

    const policies = (await listResponse.json()) as PolicyFile[];

    if (!Array.isArray(policies) || policies.length === 0) {
      logger.info('No policies found for company', { companyId });
      return '';
    }

    // IMPORTANT: Do not log full policy objects or content (sensitive).
    logger.info('Found policies', {
      companyId,
      count: policies.length,
      policyNames: policies.map((p) => p?.name).filter(Boolean),
    });
    // 2. Read each policy content in parallel
    const policyContents = await Promise.all(
      policies.map(async (policy) => {
        try {
          // Remove "policies/{companyId}/" prefix from blobUrl
          const cleanBlobUrl = policy.blobUrl.replace(/^policies\/[^\/]+\//, '');
          const policyUrl = `/api/policies/policies/${encodeURIComponent(cleanBlobUrl)}`;
          const fullUrl = policyUrl.startsWith('http')
            ? policyUrl
            : `${apiBaseUrl}${policyUrl}`;
          const response = await withRetry(
            () =>
              fetch(fullUrl, {
                headers: {
                  'X-COMPANY-ID': companyId,
                },
              }),
            'policy-read-fetch',
            { maxAttempts: 1 }
          );

          if (!response.ok) {
            logger.info('Failed to read policy (skipping)', { policyName: policy.name, status: response.status });
            return null;
          }

          const policyData = (await response.json()) as PolicyContent;
          logger.info('Policy data received', {
            policyName: policy.name,
            policyId: policyData.policyId,
            textLength: policyData.text?.length || 0
          });

          const content = policyData.text;
          return `**Policy: ${policy.name}**\n${content}`;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.warn('Error reading policy', { policyName: policy.name, error: err.message });
          return null;
        }
      })
    );

    // 3. Filter out failures and join
    const validPolicies = policyContents.filter((p) => p !== null);

    if (validPolicies.length === 0) {
      logger.warn('No valid policies could be read');
      return '';
    }

    const context = validPolicies.join('\n\n---\n\n');
    logger.info('Policy context prepared', { totalPolicies: validPolicies.length, contextLength: context.length });

    return context;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching policy context', { error: err.message, stack: err.stack });
    return ''; // Graceful fallback
  }
}

/**
 * Extract companyId from JWT token (can be used independently if needed)
 * @param token JWT token string
 * @returns companyId if found, undefined otherwise
 */
export function extractCompanyIdFromTokenExport(token: string): string | undefined {
  return extractCompanyIdFromToken(token);
}
