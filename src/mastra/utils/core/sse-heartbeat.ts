/**
 * SSE Heartbeat Utility
 *
 * Prevents Cloudflare from dropping idle SSE connections (~100s timeout)
 * by sending periodic lightweight events during long-running API calls.
 *
 * Each heartbeat emits a complete text-start → text-delta → text-end
 * sequence with a `::heartbeat::` marker.  The frontend must filter
 * these out (single-line check: `delta.includes('::heartbeat::')`).
 *
 * @see FLEET-AGENT-SSE-HEARTBEAT.md
 */

import { getLogger } from './logger';

const logger = getLogger('SSEHeartbeat');

const HEARTBEAT_INTERVAL_MS = 15_000;

type Writer = {
  write: (event: { type: string; id: string; [key: string]: unknown }) => Promise<void>;
};

let heartbeatSeq = 0;

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
    const id = `hb-${++heartbeatSeq}`;
    try {
      await writer.write({ type: 'text-start', id });
      await writer.write({ type: 'text-delta', id, delta: '::heartbeat::' });
      await writer.write({ type: 'text-end', id });
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
