/**
 * GET /health - Health Check Route Handler
 *
 * Returns system health status including agents, workflows, D1, and Sentry.
 */

import { Context } from 'hono';
import { performHealthCheck } from '../services';

export async function healthHandler(c: Context) {
  const mastra = c.get('mastra');
  const agents = mastra.listAgents();
  const workflows = mastra.listWorkflows();

  // Perform deep health check with 5s timeout (includes D1 when env available)
  const env = c.env as Record<string, unknown> | undefined;
  const healthResponse = await performHealthCheck(agents, workflows, 5000, env);

  // Sentry status (observability)
  const sentryDsn = env?.SENTRY_DSN ?? (typeof process !== 'undefined' ? process.env?.SENTRY_DSN : undefined);
  const sentry = { configured: !!sentryDsn };

  // Return appropriate HTTP status based on health
  const httpStatus =
    healthResponse.status === 'healthy' ? 200 : healthResponse.status === 'degraded' ? 200 : 503;

  return c.json(
    {
      success: healthResponse.status !== 'unhealthy',
      message: 'Agentic Ally deployment successful',
      ...healthResponse,
      sentry,
    },
    httpStatus
  );
}
