/**
 * SSE Heartbeat Utility
 *
 * Prevents Cloudflare from dropping idle SSE connections (~100s timeout)
 * by sending periodic lightweight data-ui-signal events with a heartbeat marker.
 * The frontend must filter these out (check `signal === 'heartbeat'`).
 *
 * @see FLEET-AGENT-SSE-HEARTBEAT.md
 */

import { getLogger } from './logger';

const logger = getLogger('SSEHeartbeat');

const HEARTBEAT_INTERVAL_MS = 15_000;

type Writer = {
  write: (event: Record<string, unknown>) => Promise<void>;
};

/**
 * Wraps a long-running async operation with periodic SSE heartbeat events.
 * Sends a keepalive every 15s to prevent Cloudflare idle disconnect.
 * Safe to call with a null/undefined writer — falls back to a plain await.
 */
export async function withHeartbeat<T>(
  writer: Writer | null | undefined,
  operation: () => Promise<T>,
  intervalMs = HEARTBEAT_INTERVAL_MS,
): Promise<T> {
  if (!writer) return operation();

  let stopped = false;
  const interval = setInterval(async () => {
    if (stopped) return;
    try {
      await writer.write({
        type: 'data-ui-signal',
        data: { signal: 'heartbeat', message: '::heartbeat::' },
      });
    } catch {
      stopped = true;
      clearInterval(interval);
      logger.debug('heartbeat_stream_closed');
    }
  }, intervalMs);

  try {
    return await operation();
  } finally {
    stopped = true;
    clearInterval(interval);
  }
}
