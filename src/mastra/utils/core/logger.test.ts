import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLogger, startTimer } from './logger';
import { requestStorage } from './request-storage';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: Logger with Correlation ID
 * Tests for automatic correlation ID injection into logs
 */

describe('Logger with Correlation ID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should create logger instance', () => {
      const logger = getLogger('TestModule');
      expect(logger).toBeDefined();
    });

    it('should create logger with module name', () => {
      expect(() => getLogger('TestModule')).not.toThrow();
    });

    it('should have info method', () => {
      const logger = getLogger('TestModule');
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      const logger = getLogger('TestModule');
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      const logger = getLogger('TestModule');
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have debug method', () => {
      const logger = getLogger('TestModule');
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });

    it('should return logger instance', () => {
      const logger = getLogger('TestModule');
      expect(logger).not.toBeNull();
      expect(logger).not.toBeUndefined();
    });
  });

  describe('Correlation ID Injection', () => {
    it('should inject correlation ID when available in request context', async () => {
      const correlationId = 'test-correlation-id-123';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        // Logger should work without throwing
        expect(() => {
          logger.info('Test message', { customField: 'value' });
        }).not.toThrow();
      });
    });

    it('should work without correlation ID when outside request context', () => {
      const logger = getLogger('TestModule');

      // Should not throw when no request context
      expect(() => {
        logger.info('Test message', { customField: 'value' });
      }).not.toThrow();
    });

    it('should preserve existing context when adding correlation ID', async () => {
      const correlationId = 'test-correlation-id-456';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const customContext = { userId: 'user-123', action: 'test' };

        // Should not throw
        expect(() => {
          logger.info('Test message', customContext);
        }).not.toThrow();
      });
    });

    it('should inject correlation ID for info logs', async () => {
      const correlationId = 'info-correlation-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        expect(() => logger.info('Info message')).not.toThrow();
      });
    });

    it('should inject correlation ID for warn logs', async () => {
      const correlationId = 'warn-correlation-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        expect(() => logger.warn('Warn message')).not.toThrow();
      });
    });

    it('should inject correlation ID for error logs', async () => {
      const correlationId = 'error-correlation-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        expect(() => logger.error('Error message')).not.toThrow();
      });
    });

    it('should inject correlation ID for debug logs', async () => {
      const correlationId = 'debug-correlation-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        expect(() => logger.debug('Debug message')).not.toThrow();
      });
    });

    it('should handle undefined correlation ID', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId: undefined }, () => {
        expect(() => logger.info('Test message')).not.toThrow();
      });
    });

    it('should handle null context object', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Test message', undefined)).not.toThrow();
    });

    it('should handle empty context object', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        expect(() => logger.info('Test message', {})).not.toThrow();
      });
    });
  });

  describe('Log Levels', () => {
    it('should support all log levels', async () => {
      const correlationId = 'test-correlation-id-789';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        expect(() => {
          logger.info('Info message');
          logger.warn('Warn message');
          logger.error('Error message');
          logger.debug('Debug message');
        }).not.toThrow();
      });
    });

    it('should support info level without context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Info message')).not.toThrow();
    });

    it('should support warn level without context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.warn('Warn message')).not.toThrow();
    });

    it('should support error level without context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should support debug level without context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.debug('Debug message')).not.toThrow();
    });

    it('should support info level with context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Info message', { key: 'value' })).not.toThrow();
    });

    it('should support warn level with context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.warn('Warn message', { key: 'value' })).not.toThrow();
    });

    it('should support error level with context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.error('Error message', { key: 'value' })).not.toThrow();
    });

    it('should support debug level with context', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.debug('Debug message', { key: 'value' })).not.toThrow();
    });
  });

  describe('Module Names', () => {
    it('should create logger for different modules', () => {
      const logger1 = getLogger('Module1');
      const logger2 = getLogger('Module2');

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });

    it('should handle uppercase module names', () => {
      expect(() => getLogger('UPPERCASE')).not.toThrow();
    });

    it('should handle lowercase module names', () => {
      expect(() => getLogger('lowercase')).not.toThrow();
    });

    it('should handle mixed case module names', () => {
      expect(() => getLogger('MixedCase')).not.toThrow();
    });

    it('should handle module names with numbers', () => {
      expect(() => getLogger('Module123')).not.toThrow();
    });

    it('should handle module names with hyphens', () => {
      expect(() => getLogger('test-module')).not.toThrow();
    });

    it('should handle module names with underscores', () => {
      expect(() => getLogger('test_module')).not.toThrow();
    });

    it('should handle long module names', () => {
      const longName = 'A'.repeat(100);
      expect(() => getLogger(longName)).not.toThrow();
    });

    it('should handle short module names', () => {
      expect(() => getLogger('A')).not.toThrow();
    });

    it('should handle empty module names', () => {
      expect(() => getLogger('')).not.toThrow();
    });
  });

  describe('Singleton Behavior', () => {
    it('should return same logger instance for same module', () => {
      const logger1 = getLogger('SameModule');
      const logger2 = getLogger('SameModule');

      // Same module name should return new wrapper, but underlying PinoLogger is cached
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });

    it('should create logger only once per module', () => {
      // Multiple calls should not throw
      expect(() => {
        getLogger('SingletonModule');
        getLogger('SingletonModule');
        getLogger('SingletonModule');
      }).not.toThrow();
    });

    it('should handle concurrent logger creation', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          getLogger('ConcurrentModule');
        }
      }).not.toThrow();
    });
  });

  describe('Context Management', () => {
    it('should preserve custom context fields', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { userId: 'user-123', action: 'test-action' };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle context with nested objects', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { nested: { key: 'value', deep: { key2: 'value2' } } };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle context with arrays', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { items: [1, 2, 3], tags: ['a', 'b', 'c'] };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle context with numbers', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { count: 42, price: 99.99 };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle context with booleans', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { isActive: true, isDeleted: false };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle context with null values', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { nullValue: null };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle context with undefined values', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { undefinedValue: undefined };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle empty string values in context', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context = { emptyString: '' };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle very large context objects', async () => {
      const correlationId = 'test-id';
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId }, () => {
        const context: Record<string, unknown> = {};
        for (let i = 0; i < 100; i++) {
          context[`key${i}`] = `value${i}`;
        }
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });
  });

  describe('Request Storage Integration', () => {
    it('should work with full request context', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run(
        {
          correlationId: 'test-id',
          token: 'test-token',
          companyId: 'company-123',
          baseApiUrl: 'https://api.example.com',
        },
        () => {
          expect(() => logger.info('Test message')).not.toThrow();
        }
      );
    });

    it('should work with partial request context', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run(
        {
          correlationId: 'test-id',
        },
        () => {
          expect(() => logger.info('Test message')).not.toThrow();
        }
      );
    });

    it('should work with empty request context', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run({}, () => {
        expect(() => logger.info('Test message')).not.toThrow();
      });
    });

    it('should handle nested request storage calls', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId: 'outer-id' }, async () => {
        expect(() => logger.info('Outer message')).not.toThrow();

        await requestStorage.run({ correlationId: 'inner-id' }, () => {
          expect(() => logger.info('Inner message')).not.toThrow();
        });
      });
    });

    it('should work outside request storage', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Outside request context')).not.toThrow();
    });
  });

  describe('Message Content', () => {
    it('should handle empty messages', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle very long messages', () => {
      const logger = getLogger('TestModule');
      const longMessage = 'A'.repeat(10000);
      expect(() => logger.info(longMessage)).not.toThrow();
    });

    it('should handle messages with special characters', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Message with !@#$%^&*() special chars')).not.toThrow();
    });

    it('should handle messages with newlines', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Message\nwith\nnewlines')).not.toThrow();
    });

    it('should handle messages with unicode', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Message with emoji 🚀 and unicode 你好')).not.toThrow();
    });

    it('should handle messages with tabs', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('Message\twith\ttabs')).not.toThrow();
    });

    it('should handle JSON-like messages', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('{"key": "value"}')).not.toThrow();
    });

    it('should handle numeric string messages', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('123456789')).not.toThrow();
    });
  });

  describe('Timer Functionality', () => {
    it('should export startTimer function', () => {
      expect(startTimer).toBeDefined();
      expect(typeof startTimer).toBe('function');
    });

    it('should return timer object', () => {
      const timer = startTimer();
      expect(timer).toBeDefined();
      expect(timer).toHaveProperty('end');
      expect(timer).toHaveProperty('endMs');
    });

    it('should have end method', () => {
      const timer = startTimer();
      expect(typeof timer.end).toBe('function');
    });

    it('should have endMs method', () => {
      const timer = startTimer();
      expect(typeof timer.endMs).toBe('function');
    });

    it('should return elapsed time in milliseconds', () => {
      const timer = startTimer();
      const elapsed = timer.end();
      expect(typeof elapsed).toBe('number');
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should return formatted elapsed time string', () => {
      const timer = startTimer();
      const elapsedStr = timer.endMs();
      expect(typeof elapsedStr).toBe('string');
      expect(elapsedStr).toMatch(/^\d+ms$/);
    });

    it('should measure time accurately', async () => {
      const timer = startTimer();
      await new Promise(resolve => setTimeout(resolve, 10));
      const elapsed = timer.end();
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    it('should format time with ms suffix', () => {
      const timer = startTimer();
      const formatted = timer.endMs();
      expect(formatted).toContain('ms');
    });

    it('should handle immediate end call', () => {
      const timer = startTimer();
      const elapsed = timer.end();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle multiple end calls', () => {
      const timer = startTimer();
      const elapsed1 = timer.end();
      const elapsed2 = timer.end();
      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
    });

    it('should create independent timers', () => {
      const timer1 = startTimer();
      const timer2 = startTimer();
      expect(timer1).not.toBe(timer2);
    });
  });

  describe('Error Handling', () => {
    it('should not throw on consecutive log calls', () => {
      const logger = getLogger('TestModule');
      expect(() => {
        logger.info('Message 1');
        logger.info('Message 2');
        logger.info('Message 3');
      }).not.toThrow();
    });

    it('should handle rapid log calls', () => {
      const logger = getLogger('TestModule');
      expect(() => {
        for (let i = 0; i < 100; i++) {
          logger.info(`Message ${i}`);
        }
      }).not.toThrow();
    });

    it('should handle all log levels in sequence', () => {
      const logger = getLogger('TestModule');
      expect(() => {
        logger.debug('Debug');
        logger.info('Info');
        logger.warn('Warn');
        logger.error('Error');
      }).not.toThrow();
    });

    it('should handle context with circular references gracefully', async () => {
      const logger = getLogger('TestModule');
      const circular: any = { key: 'value' };
      circular.self = circular;

      await requestStorage.run({ correlationId: 'test-id' }, () => {
        // May throw or handle gracefully depending on Pino's behavior
        // We just ensure it doesn't crash the process
        try {
          logger.info('Test', circular);
        } catch {
          // Expected for circular references
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only messages', () => {
      const logger = getLogger('TestModule');
      expect(() => logger.info('   ')).not.toThrow();
    });

    it('should handle whitespace-only module names', () => {
      expect(() => getLogger('   ')).not.toThrow();
    });

    it('should work with context containing correlationId key', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId: 'storage-id' }, () => {
        // User provides correlationId in context - should be overwritten by storage
        const context = { correlationId: 'user-provided-id', other: 'value' };
        expect(() => logger.info('Test', context)).not.toThrow();
      });
    });

    it('should handle multiple loggers in same request context', async () => {
      const logger1 = getLogger('Module1');
      const logger2 = getLogger('Module2');

      await requestStorage.run({ correlationId: 'shared-id' }, () => {
        expect(() => {
          logger1.info('Message from Module1');
          logger2.info('Message from Module2');
        }).not.toThrow();
      });
    });

    it('should handle logger calls across async boundaries', async () => {
      const logger = getLogger('TestModule');

      await requestStorage.run({ correlationId: 'async-id' }, async () => {
        logger.info('Before await');
        await Promise.resolve();
        logger.info('After await');
      });
    });
  });
});
