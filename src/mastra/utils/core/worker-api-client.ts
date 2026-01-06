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
 *   publicUrl: API_ENDPOINTS.PHISHING_WORKER_URL,
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

export interface CallWorkerAPIOptions {
  /** Cloudflare environment bindings */
  env: any;
  /** Service binding (e.g., env.PHISHING_CRUD_WORKER) */
  serviceBinding?: any;
  /** Public URL fallback (for local development) */
  publicUrl: string;
  /** Worker endpoint path (e.g., 'https://worker/submit') */
  endpoint: string;
  /** Request payload */
  payload: any;
  /** Optional auth token */
  token?: string;
  /** Error message prefix (e.g., 'Worker failed', 'Assign API failed') */
  errorPrefix: string;
  /** Operation name for logging */
  operationName?: string;
}

/**
 * Calls a Cloudflare Worker API with service binding support
 * @param options - API call configuration
 * @returns Parsed JSON response
 * @throws Error with formatted error message if request fails
 */
export async function callWorkerAPI<T = any>(options: CallWorkerAPIOptions): Promise<T> {
  const {
    serviceBinding,
    publicUrl,
    endpoint,
    payload,
    token,
    errorPrefix,
    operationName = 'Worker API call'
  } = options;

  let response: Response;

  if (serviceBinding) {
    // ✅ SERVICE BINDING (Production - Internal Routing)
    logger.debug('Using Service Binding', { endpoint, operationName });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    response = await serviceBinding.fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } else {
    // ⚠️ FALLBACK: Public URL (Local Development)
    logger.debug('Using Public URL fallback', { url: publicUrl, endpoint, operationName });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    response = await fetch(publicUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errorInfo = errorService.external(
      `${errorPrefix}: ${response.status} - ${errorText}`,
      { status: response.status, endpoint, operationName }
    );
    logErrorInfo(logger, 'error', `${operationName} failed`, errorInfo);
    throw new Error(errorInfo.message);
  }

  return await response.json();
}
