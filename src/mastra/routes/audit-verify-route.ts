/**
 * Audit Chain Verification Route
 *
 * EU AI Act Art. 12 — verifies tamper-evident hash-chain integrity.
 *
 * Security:
 *   - Auth middleware requires valid X-AGENTIC-ALLY-TOKEN
 *   - CompanyId from X-COMPANY-ID header scopes the query
 *   - Users can only verify their own company's chain
 *
 * GET /audit/verify
 *   → { success, valid, totalRows, verifiedRows, concurrentWrites, ... }
 */

import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { verifyAuditChain } from '../services/gdpr-service';

const logger = getLogger('AuditVerifyRoute');

export async function auditVerifyHandler(c: Context) {
  const companyId = c.req.header('X-COMPANY-ID');
  if (!companyId) {
    return c.json({ success: false, error: 'Company ID required' }, 401);
  }

  try {
    const env = c.env as Record<string, unknown> | undefined;
    const result = await verifyAuditChain(env, companyId);

    logger.info('audit_chain_verified', {
      companyId,
      valid: result.valid,
      totalRows: result.totalRows,
    });

    return c.json({ success: true, ...result }, 200);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.internal(err.message, {
      step: 'audit-verify',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'audit_verify_error', errorInfo);
    return c.json({ success: false, error: 'Verification failed' }, 500);
  }
}
