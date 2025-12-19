/**
 * Test Factory for Context Types
 * Provides reusable factory functions for creating test context data
 */

import { Context } from 'hono';
import { RequestContext } from '../../mastra/utils/core/request-storage';

/**
 * Creates a mock Hono Context for testing
 */
export function createMockContext(overrides?: Partial<Context>): Context {
  const mockReq = {
    header: () => undefined,
    ...overrides?.req
  } as unknown as Context['req'];

  return {
    req: mockReq,
    env: {
      KV: {},
      D1: {},
      ...overrides?.env
    },
    ...overrides
  } as unknown as Context;
}

/**
 * Creates a test RequestContext
 */
export function createRequestContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    correlationId: 'test-correlation-id',
    token: 'test-token',
    env: {},
    ...overrides
  };
}
