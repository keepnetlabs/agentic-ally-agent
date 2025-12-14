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
        level: (process.env.LOG_LEVEL as any) || 'info',
      })
    );
  }
  return loggers.get(moduleName)!;
}

/**
 * Legacy Logger class - DEPRECATED
 * Use getLogger() instead for better performance
 * This is kept for backward compatibility
 */
export class Logger {
  private pinoLogger: PinoLogger;

  constructor(moduleName: string) {
    this.pinoLogger = getLogger(moduleName);
  }

  debug(message: string, context?: any): void {
    this.pinoLogger.debug(message, context);
  }

  info(message: string, context?: any): void {
    this.pinoLogger.info(message, context);
  }

  warn(message: string, context?: any): void {
    this.pinoLogger.warn(message, context);
  }

  error(message: string, error?: Error | string, context?: any): void {
    const errorData = error instanceof Error
      ? { error: error.message, stack: error.stack }
      : (typeof error === 'string' ? { error } : {});

    this.pinoLogger.error({ message, ...errorData, ...context });
  }
}

// Helper function for timer (from original logger)
export function startTimer() {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
    endMs: () => `${Date.now() - start}ms`,
  };
}

/**
 * Helper to safely serialize objects for logging
 */
export function safeStringify(obj: any, maxLength: number = 500): string {
  try {
    const str = JSON.stringify(obj);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  } catch (error) {
    return `[Circular or non-serializable: ${typeof obj}]`;
  }
}
