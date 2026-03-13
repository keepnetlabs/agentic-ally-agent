/**
 * Shared helper for emitting UI signal events through the Mastra stream writer.
 *
 * Reduces boilerplate: writer null-check, base64 encoding, data-ui-signal
 * emission, and structured error logging are all handled here.
 */

import { normalizeError, logErrorInfo } from './error-utils';
import { errorService } from '../../services/error-service';
import type { Logger } from './logger';

interface StreamWriter {
  write: (event: Record<string, unknown>) => Promise<void>;
}

interface EmitUISignalOptions {
  writer: StreamWriter | undefined;
  signalName: string;
  meta: Record<string, unknown>;
  logger: Logger;
  /** Used in error context, e.g. 'training-assignment' */
  stepLabel: string;
}

/**
 * Emit a UI signal through the stream writer.
 * No-ops silently when writer is undefined. Errors are caught and logged
 * (fire-and-forget) so they never break the calling tool.
 */
export async function emitUISignal({ writer, signalName, meta, logger, stepLabel }: EmitUISignalOptions): Promise<void> {
  if (!writer) return;

  try {
    const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

    await writer.write({
      type: 'data-ui-signal',
      data: {
        signal: signalName,
        message: `::ui:${signalName}::${encoded}::/ui:${signalName}::\n`,
      },
    });
  } catch (emitErr) {
    const err = normalizeError(emitErr);
    const errorInfo = errorService.external(err.message, {
      step: `emit-ui-signal-${stepLabel}`,
      stack: err.stack,
    });
    logErrorInfo(logger, 'warn', `Failed to emit UI signal for ${stepLabel}`, errorInfo);
  }
}
