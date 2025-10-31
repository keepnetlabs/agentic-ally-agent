/**
 * Structured logging utility for consistent error and info logging
 * Supports multiple log levels with JSON structured output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logger class for structured logging
 * Usage: const logger = new Logger('ModuleName');
 *        logger.error('Operation failed', { userId, action, error });
 */
export class Logger {
  private moduleName: string;
  private isProduction: boolean;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isProduction) return;
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message with error details
   */
  error(message: string, error?: Error | string, context?: LogContext): void {
    const errorObj = this.parseError(error);
    this.log('error', message, context, errorObj);
  }

  /**
   * Private method to format and output log
   */
  private log(level: LogLevel, message: string, context?: LogContext, errorObj?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `[${this.moduleName}] ${message}`,
      ...(context && { context }),
      ...(errorObj && { error: errorObj }),
    };

    // Output based on level
    switch (level) {
      case 'debug':
        console.debug(entry.message, context);
        break;
      case 'info':
        console.log(entry.message, context || '');
        break;
      case 'warn':
        console.warn(entry.message, context || '');
        break;
      case 'error':
        console.error(entry.message, context || '');
        if (errorObj) console.error('  Error:', errorObj);
        break;
    }

    // Structured JSON output for production
    if (this.isProduction) {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Parse error object into structured format
   */
  private parseError(error: Error | string | undefined) {
    if (!error) return undefined;

    if (typeof error === 'string') {
      return {
        message: error,
      };
    }

    return {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }
}

/**
 * Helper function to measure operation duration
 * Usage:
 *   const timer = startTimer();
 *   // ... do work ...
 *   const duration = timer.end();
 */
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
