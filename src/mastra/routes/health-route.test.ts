import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthHandler } from './health-route';

const mockPerformHealthCheck = vi.hoisted(() => vi.fn());

vi.mock('../services', () => ({
  performHealthCheck: (...args: unknown[]) => mockPerformHealthCheck(...args),
}));

describe('healthHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createContext(env: Record<string, unknown> = {}) {
    const json = vi.fn();
    return {
      get: (key: string) => {
        if (key === 'mastra') {
          return {
            listAgents: () => [{ id: 'a1' }],
            listWorkflows: () => [{ id: 'w1' }],
          };
        }
        return undefined;
      },
      env,
      json,
    } as any;
  }

  it('returns 200 and success when status is healthy', async () => {
    mockPerformHealthCheck.mockResolvedValue({
      status: 'healthy',
      latencyMs: 12,
    });
    const c = createContext({ SENTRY_DSN: 'https://example@sentry.io/1' });
    await healthHandler(c);

    expect(mockPerformHealthCheck).toHaveBeenCalledWith(
      [{ id: 'a1' }],
      [{ id: 'w1' }],
      5000,
      { SENTRY_DSN: 'https://example@sentry.io/1' }
    );
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Agentic Ally deployment successful',
        status: 'healthy',
        sentry: { configured: true },
      }),
      200
    );
  });

  it('returns 200 when degraded', async () => {
    mockPerformHealthCheck.mockResolvedValue({ status: 'degraded' });
    const c = createContext({});
    await healthHandler(c);
    expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'degraded' }), 200);
  });

  it('returns 503 when unhealthy', async () => {
    mockPerformHealthCheck.mockResolvedValue({ status: 'unhealthy', error: 'kv down' });
    const c = createContext({});
    await healthHandler(c);
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        status: 'unhealthy',
      }),
      503
    );
  });

  it('sets sentry.configured false when SENTRY_DSN absent', async () => {
    mockPerformHealthCheck.mockResolvedValue({ status: 'healthy' });
    const c = createContext({});
    await healthHandler(c);
    const [body] = c.json.mock.calls[0];
    expect(body.sentry).toEqual({ configured: false });
  });
});
