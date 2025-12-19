/**
 * Logger utility - Mastra PinoLogger wrapper
 * Creates singleton instances of PinoLogger for each module
 *
 * Usage:
 *   import { getLogger } from '../utils/core/logger';
 *   const logger = getLogger('ModuleName');
 *   logger.info('message', { context });
 *   logger.error('error', { context });
 */

import { PinoLogger } from '@mastra/loggers';

const loggers = new Map<string, PinoLogger>();
const DEFAULT_LOG_LEVEL = 'info';

/**
 * Get or create a PinoLogger instance for a module
 * Reuses instances to avoid recreating loggers multiple times
 * @param moduleName Name of the module (used in log output)
 * @returns PinoLogger instance
 */
export function getLogger(moduleName: string): PinoLogger {
  if (!loggers.has(moduleName)) {
    loggers.set(
      moduleName,
      new PinoLogger({
        name: moduleName,
        level: DEFAULT_LOG_LEVEL,
      })
    );
  }
  return loggers.get(moduleName)!;
}

// Helper function for timer (from original logger)
export function startTimer() {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
    endMs: () => `${Date.now() - start}ms`,
  };
}
