/**
 * Worker API Client Utility
 * Centralized utility for calling Cloudflare Worker APIs with service binding support
 *
 * Handles:
 * - Service binding detection (production) vs public URL fallback (local dev)
 * - Standardized error handling
 * - Request/response logging
 *
 * Usage:
 * ```typescript
 * const result = await callWorkerAPI({
 *   env,
 *   serviceBinding: env.PHISHING_CRUD_WORKER,
 *   publicUrl: getWorkerUrls(baseApiUrl).PHISHING_WORKER_URL,
 *   endpoint: 'https://worker/submit',
 *   payload: { ... },
 *   token: token, // optional
 *   errorPrefix: 'Worker failed',
 *   operationName: 'Upload phishing content'
 * });
 * ```
 */

import { getLogger } from './logger';
import { errorService } from '../../services/error-service';
import { logErrorInfo } from './error-utils';

const logger = getLogger('WorkerAPIClient');

export interface ServiceBinding {
  fetch(request: Request | string, init?: RequestInit | Request): Promise<Response>;
}

function isServiceBinding(value: unknown): value is ServiceBinding {
  if (!value || typeof value !== 'object') return false;
  return 'fetch' in value && typeof (value as { fetch?: unknown }).fetch === 'function';
}

export interface CallWorkerAPIOptions<TPayload = any> {
  /** Cloudflare environment bindings */
  env?: Record<string, unknown>;
  /** Service binding (e.g., env.PHISHING_CRUD_WORKER) */
  serviceBinding?: unknown;
  /** Public URL fallback (for local development) */
  publicUrl: string;
  /** Worker endpoint path (e.g., 'https://worker/submit') */
  endpoint: string;
  /** Request payload */
  payload: TPayload;
  /** Optional auth token */
  token?: string;
  /** Error message prefix (e.g., 'Worker failed', 'Assign API failed') */
  errorPrefix: string;
  /** Operation name for logging */
  operationName?: string;
  /** Base API URL (from X-BASE-API-URL header). If contains 'test' → bypass service binding, use publicUrl */
  baseApiUrl?: string;
}

/**
 * Calls a Cloudflare Worker API with service binding support
 * @param options - API call configuration
 * @returns Parsed JSON response
 * @throws Error with formatted error message if request fails
 */
export async function callWorkerAPI<TResponse = any, TPayload = any>(
  options: CallWorkerAPIOptions<TPayload>
): Promise<TResponse> {
  const {
    serviceBinding,
    publicUrl,
    endpoint,
    payload,
    token,
    errorPrefix,
    operationName = 'Worker API call',
    baseApiUrl,
  } = options;

  let response: Response;

  // Test env (baseApiUrl contains 'test') → skip service binding, use dev worker public URL
  const isTestEnv = !!baseApiUrl?.includes('test');
  const binding = !isTestEnv && isServiceBinding(serviceBinding) ? serviceBinding : undefined;

  if (serviceBinding && !binding && !isTestEnv) {
    logger.warn('⚠️ Invalid service binding provided; falling back to public URL', { endpoint, operationName });
  }

  if (binding) {
    // ✅ SERVICE BINDING (Production - Internal Routing)
    logger.debug('Using Service Binding', { endpoint, operationName });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Agentic-Source': 'agentic-ally',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    response = await binding.fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } else {
    // ⚠️ FALLBACK: Public URL (Local Development)
    logger.debug('Using Public URL fallback', { url: publicUrl, endpoint, operationName });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Agentic-Source': 'agentic-ally',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    response = await fetch(publicUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errorInfo = errorService.external(`${errorPrefix}: ${response.status} - ${errorText}`, {
      status: response.status,
      endpoint,
      operationName,
    });
    logErrorInfo(logger, 'error', `${operationName} failed`, errorInfo);
    throw new Error(errorInfo.message);
  }

  return await response.json();
}

// ============================================
// Agentic Activities Types
// ============================================

/** Extended payload for /api/agentic-ai/activities (proxied via CRUD Worker /send).
 *  CRUD Worker routes to:
 *  - Path A (targetUserResourceId): POST /api/agentic-ai/activities (platform handles groups)
 *  - Path B (targetGroupResourceId): Direct campaign/enrollment API (legacy)
 */
export interface AgenticActivitiesPayload {
  batchResourceId: string;
  activityType: 'phishing' | 'quishing' | 'smishing' | 'training';
  scenarioResourceId?: string;
  trainingResourceId?: string;
  /** Free-text category classifying the activity (e.g. "Social Engineering", "Phishing Awareness") */
  contentCategory?: string;
  /** AI agent's reasoning for why this activity was created */
  explanationJson?: { reasoningText: string };
  /** Original flat fields (apiUrl, accessToken, companyId, phishingId, etc.) */
  [key: string]: unknown;
}

/** Response from CRUD Worker /send — unified for both Path A and Path B */
export interface WorkerSendResponse {
  success: boolean;
  message?: string;
  /** 'autonomous' = campaign/enrollment created, 'approval_gated' = pending admin approval */
  status?: 'autonomous' | 'approval_gated';
  /** Activity resourceId (Path A — Agentic AI Activities API) */
  activityResourceId?: string;
  /** Campaign resourceId (phishing/smishing) */
  campaignResourceId?: string;
  campaignId?: string;
  /** Enrollment resourceId (training) */
  enrollmentResourceId?: string;
  /** Batch ID for this activity group */
  batchResourceId?: string;
  [key: string]: unknown;
}
