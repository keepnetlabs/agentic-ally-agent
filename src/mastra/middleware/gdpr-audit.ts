/**
 * GDPR Audit Middleware
 * Automatically logs data access events for endpoints that process personal data.
 *
 * Placed after auth middleware (needs companyId/token) but before route handlers.
 * Only triggers on paths listed in GDPR.PERSONAL_DATA_PATHS — zero overhead on other routes.
 *
 * Art. 30 compliance: creates records of processing activities automatically.
 */

import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';
import { GDPR, type GdprAuditAction, type GdprDataCategory } from '../constants';
import { logDataAccess } from '../services/gdpr-service';
import { getRequestContext } from '../utils/core/request-storage';

const logger = getLogger('GdprAudit');

/** Map HTTP methods to audit actions */
function methodToAction(method: string): GdprAuditAction {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'READ';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'READ';
  }
}

/** Infer data category from request path */
function pathToCategory(path: string): GdprDataCategory {
  if (path.includes('/user') || path.includes('/target-group')) return 'USER_PII';
  if (path.includes('/assign') || path.includes('/upload')) return 'CAMPAIGN_DATA';
  return 'USER_PII';
}

/** Check if path involves personal data processing */
function isPersonalDataPath(path: string): boolean {
  return GDPR.PERSONAL_DATA_PATHS.some((p) => path.startsWith(p));
}

/**
 * Middleware: logs audit events for personal data endpoints.
 * Non-blocking — audit write failures never affect the response.
 */
export const gdprAuditMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path;

  // Fast exit: skip non-personal-data paths
  if (!isPersonalDataPath(path)) {
    await next();
    return;
  }

  // Run the actual handler first
  await next();

  // Only audit successful responses (2xx/3xx)
  const status = c.res.status;
  if (status >= 400) return;

  // Fire-and-forget: don't await, don't block response
  try {
    const env = c.env as Record<string, unknown> | undefined;
    const ctx = getRequestContext();
    const companyId = ctx?.companyId || 'unknown';
    const method = c.req.method;

    logDataAccess(env, {
      companyId,
      action: methodToAction(method),
      resourceType: pathToCategory(path),
      details: { path, method, status },
      initiatedBy: 'user',
    }).catch((err) => {
      logger.debug('Audit log fire-and-forget failed', { error: String(err) });
    });
  } catch {
    // Swallow — audit must never break request flow
  }
};
