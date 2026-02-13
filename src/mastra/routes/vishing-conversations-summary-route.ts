/**
 * POST /vishing/conversations/summary
 *
 * Receives a completed vishing call conversation and returns
 * summary (timeline, disclosed info, outcome) + next steps.
 */

import { Context } from 'hono';
import { API_ENDPOINTS, TOKEN_CACHE_INVALID_TTL_MS } from '../constants';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import { logErrorInfo, normalizeError } from '../utils/core/error-utils';
import { tokenCache } from '../utils/core/token-cache';
import { generateVishingConversationsSummary } from '../tools/vishing-call/vishing-conversations-summary-tool';
import { vishingConversationsSummaryRequestSchema } from './vishing-conversations-summary-route.schemas';

const logger = getLogger('VishingConversationsSummaryRoute');

export async function vishingConversationsSummaryHandler(c: Context) {
  const requestStart = Date.now();

  try {
    const rawBody = await c.req.json<unknown>();
    const body = rawBody || {};

    const parsedRequest = vishingConversationsSummaryRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      const errorInfo = errorService.validation('Invalid request format', {
        route: '/vishing/conversations/summary',
        details: parsedRequest.error.format(),
      });
      logErrorInfo(logger, 'warn', 'vishing_conversations_summary_invalid_input', errorInfo);
      return c.json(
        {
          success: false,
          error: 'Invalid request format',
          details: parsedRequest.error.format(),
        },
        400
      );
    }

    const { accessToken, messages } = parsedRequest.data;

    const baseApiUrl = c.req.header('X-BASE-API-URL') || API_ENDPOINTS.DEFAULT_AUTH_URL;
    const cached = tokenCache.get(accessToken);
    let tokenValid = cached;
    if (cached === null) {
      try {
        const res = await fetch(`${baseApiUrl}/auth/validate`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        tokenValid = res.ok;
        if (tokenValid) tokenCache.set(accessToken, true);
        else tokenCache.set(accessToken, false, TOKEN_CACHE_INVALID_TTL_MS);
      } catch {
        tokenValid = false;
      }
    }
    if (!tokenValid) {
      return c.json({ error: 'Unauthorized', message: 'Invalid or expired access token' }, 401);
    }

    logger.info('vishing_conversations_summary_request', {
      route: '/vishing/conversations/summary',
      messageCount: messages.length,
    });

    const result = await generateVishingConversationsSummary(messages);

    logger.info('vishing_conversations_summary_success', {
      route: '/vishing/conversations/summary',
      durationMs: Date.now() - requestStart,
      outcome: result.summary.outcome,
      nextStepsCount: result.nextSteps.length,
    });

    return c.json({
      success: true,
      summary: result.summary,
      disclosedInformation: result.summary.disclosedInfo,
      nextSteps: result.nextSteps,
      statusCard: result.statusCard,
    });
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.internal(err.message, {
      route: '/vishing/conversations/summary',
      event: 'error',
      durationMs: Date.now() - requestStart,
    });
    logErrorInfo(logger, 'error', 'vishing_conversations_summary_error', errorInfo);
    return c.json(
      {
        success: false,
        error: err.message,
      },
      500
    );
  }
}
