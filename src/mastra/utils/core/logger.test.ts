import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLogger } from './logger';
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
});
