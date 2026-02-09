/**
 * Logger utility - Mastra PinoLogger wrapper with automatic correlation ID injection
 * Creates singleton instances of PinoLogger for each module
 * Automatically injects correlation ID from request context into all logs
 *
 * Usage:
 *   import { getLogger } from '../utils/core/logger';
 *   const logger = getLogger('ModuleName');
 *   logger.info('message', { context }); // correlationId automatically added
 *   logger.error('error', { context }); // correlationId automatically added
 */

import { PinoLogger } from '@mastra/loggers';
import type { LogLevel } from '@mastra/loggers';
import { requestStorage } from './request-storage';

const loggers = new Map<string, PinoLogger>();
export function resolveLogLevel(): LogLevel {
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
  return nodeEnv === 'development' ? 'debug' : 'info';
}

const DEFAULT_LOG_LEVEL = resolveLogLevel();

/**
 * Logger wrapper that automatically injects correlation ID from request context
 */
class LoggerWithCorrelation {
  private pinoLogger: PinoLogger;

  constructor(pinoLogger: PinoLogger) {
    this.pinoLogger = pinoLogger;
  }

  private enrichContext(context?: Record<string, unknown>): Record<string, unknown> {
    const requestContext = requestStorage.getStore();
    const correlationId = requestContext?.correlationId;

    if (!correlationId) {
      // No correlation ID available (outside request context)
      return context || {};
    }

    return {
      ...context,
      correlationId,
    };
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.info(message, this.enrichContext(context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.warn(message, this.enrichContext(context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.error(message, this.enrichContext(context));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.debug(message, this.enrichContext(context));
  }
}

/**
 * Get or create a PinoLogger instance for a module with correlation ID support
 * Reuses instances to avoid recreating loggers multiple times
 * @param moduleName Name of the module (used in log output)
 * @returns Logger instance with automatic correlation ID injection
 */
export function getLogger(moduleName: string): LoggerWithCorrelation {
  if (!loggers.has(moduleName)) {
    const pinoLogger = new PinoLogger({
      name: moduleName,
      level: DEFAULT_LOG_LEVEL,
    });
    loggers.set(moduleName, pinoLogger);
  }
  const pinoLogger = loggers.get(moduleName) as PinoLogger;
  return new LoggerWithCorrelation(pinoLogger);
}

// Helper function for timer (from original logger)
export function startTimer() {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
    endMs: () => `${Date.now() - start}ms`,
  };
}
