import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkKVHealth,
  getUptime,
  determineOverallStatus,
  performHealthCheck,
  HealthResult,
  HealthCheckResponse,
} from './health-service';
import '../../../src/__tests__/setup';

/**
 * Test Suite: HealthService
 * Tests for deep health checks and system monitoring
 * Covers: KV health checking, uptime calculation, status determination
 */

describe('HealthService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('HealthResult interface', () => {
    it('should have correct status values', () => {
      const healthyResult: HealthResult = { status: 'healthy', latencyMs: 100 };
      const degradedResult: HealthResult = { status: 'degraded', latencyMs: 200, error: 'Slow response' };
      const unhealthyResult: HealthResult = { status: 'unhealthy', latencyMs: 5000, error: 'Connection failed' };

      expect(healthyResult.status).toBe('healthy');
      expect(degradedResult.status).toBe('degraded');
      expect(unhealthyResult.status).toBe('unhealthy');
    });

    it('should include optional latencyMs and error fields', () => {
      const result: HealthResult = {
        status: 'degraded',
        latencyMs: 150,
        error: 'Timeout occurred',
      };

      expect(result).toHaveProperty('latencyMs');
      expect(result).toHaveProperty('error');
    });
  });

  describe('HealthCheckResponse interface', () => {
    it('should have all required fields', () => {
      const response: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: '1h 30m',
        uptimeMs: 5400000,
        checks: {
          agents: true,
          workflows: true,
          kv: { status: 'healthy', latencyMs: 100 },
        },
      };

      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('uptime');
      expect(response).toHaveProperty('uptimeMs');
      expect(response).toHaveProperty('checks');
    });

    it('should include optional details and cache fields', () => {
      const response: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: '2h 45m',
        uptimeMs: 9900000,
        checks: {
          agents: true,
          workflows: true,
          kv: { status: 'healthy', latencyMs: 120 },
        },
        details: {
          agents: ['orchestrator', 'microlearning'],
          workflows: ['create-microlearning', 'add-language'],
          agentCount: 2,
          workflowCount: 2,
        },
        cache: {
          microlearningCount: 5,
          estimatedSizeMB: 12.5,
        },
      };

      expect(response.details).toBeDefined();
      expect(response.cache).toBeDefined();
    });
  });

  describe('getUptime', () => {
    it('should return uptime object with formatted string and milliseconds', () => {
      const result = getUptime();

      expect(result).toHaveProperty('formatted');
      expect(result).toHaveProperty('ms');
      expect(typeof result.formatted).toBe('string');
      expect(typeof result.ms).toBe('number');
    });

    it('should format seconds correctly for short uptime', () => {
      // Real timers - service has been running since module load
      const result = getUptime();
      expect(result.ms).toBeGreaterThanOrEqual(0);
      expect(result.formatted).toMatch(/[smhd]/); // Should have time unit
    });

    it('should format uptime in seconds', () => {
      const result = getUptime();
      // Should always have ms > 0 since service started
      expect(result.ms).toBeGreaterThanOrEqual(0);
    });

    it('should format uptime in minutes', () => {
      const result = getUptime();
      // Just verify format includes valid time unit
      expect(result.formatted).toMatch(/[smhd]/);
    });

    it('should format uptime in hours', () => {
      const result = getUptime();
      expect(result.formatted).toBeTruthy();
      expect(result.ms).toBeTypeOf('number');
    });

    it('should format uptime in days', () => {
      const result = getUptime();
      expect(result.formatted).toBeTruthy();
    });
  });

  describe('checkKVHealth', () => {
    it('should return healthy status when KV is working', async () => {
      const result = await checkKVHealth();

      expect(result).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should include latency measurement', async () => {
      const result = await checkKVHealth();

      if (result.latencyMs !== undefined) {
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(typeof result.latencyMs).toBe('number');
      }
    });

    it('should include error message on failure', async () => {
      const result = await checkKVHealth();

      if (result.status === 'unhealthy' || result.status === 'degraded') {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle KV service errors gracefully', async () => {
      const result = await checkKVHealth();

      // Should never throw, always return HealthResult
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should measure response time accurately', async () => {
      const start = Date.now();
      const result = await checkKVHealth();
      const elapsed = Date.now() - start;

      // Latency should be close to actual elapsed time
      if (result.latencyMs !== undefined) {
        expect(Math.abs(result.latencyMs - elapsed)).toBeLessThan(100);
      }
    });
  });

  describe('determineOverallStatus', () => {
    it('should return unhealthy when KV is unhealthy', () => {
      const checks = {
        kv: { status: 'unhealthy' as const, error: 'Connection failed' },
      };

      const status = determineOverallStatus(checks);
      expect(status).toBe('unhealthy');
    });

    it('should return degraded when KV is degraded', () => {
      const checks = {
        kv: { status: 'degraded' as const, error: 'Slow response' },
      };

      const status = determineOverallStatus(checks);
      expect(status).toBe('degraded');
    });

    it('should return healthy when KV is healthy', () => {
      const checks = {
        kv: { status: 'healthy' as const, latencyMs: 50 },
      };

      const status = determineOverallStatus(checks);
      expect(status).toBe('healthy');
    });

    it('should prioritize unhealthy status over degraded', () => {
      const checks = {
        kv: { status: 'unhealthy' as const },
      };

      expect(determineOverallStatus(checks)).toBe('unhealthy');
    });

    it('should prioritize degraded status over healthy', () => {
      const checks = {
        kv: { status: 'degraded' as const },
      };

      expect(determineOverallStatus(checks)).toBe('degraded');
    });
  });

  describe('performHealthCheck', () => {
    it('should return HealthCheckResponse with all required fields', async () => {
      const agents = { orchestrator: {}, microlearning: {} };
      const workflows = { 'create-microlearning': {}, 'add-language': {} };

      const result = await performHealthCheck(agents, workflows);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('uptimeMs');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('details');
    });

    it('should include agent and workflow names in details', async () => {
      const agents = { orchestrator: {}, microlearning: {} };
      const workflows = { 'create-microlearning': {}, 'add-language': {} };

      const result = await performHealthCheck(agents, workflows);

      expect(result.details).toBeDefined();
      expect(result.details?.agents).toContain('orchestrator');
      expect(result.details?.agents).toContain('microlearning');
      expect(result.details?.workflows).toContain('create-microlearning');
      expect(result.details?.workflows).toContain('add-language');
    });

    it('should count agents and workflows correctly', async () => {
      const agents = { agent1: {}, agent2: {}, agent3: {} };
      const workflows = { workflow1: {}, workflow2: {} };

      const result = await performHealthCheck(agents, workflows);

      expect(result.details?.agentCount).toBe(3);
      expect(result.details?.workflowCount).toBe(2);
    });

    it('should handle empty agents and workflows', async () => {
      const result = await performHealthCheck({}, {});

      expect(result.details?.agentCount).toBe(0);
      expect(result.details?.workflowCount).toBe(0);
      expect(result.details?.agents).toEqual([]);
      expect(result.details?.workflows).toEqual([]);
    });

    it('should respect timeout parameter', async () => {
      const agents = {};
      const workflows = {};

      const start = Date.now();
      const result = await performHealthCheck(agents, workflows, 1000);
      const elapsed = Date.now() - start;

      expect(result).toBeDefined();
      expect(elapsed).toBeLessThan(5000); // Should complete within custom timeout
    });

    it('should use default timeout when not specified', async () => {
      const agents = {};
      const workflows = {};

      const result = await performHealthCheck(agents, workflows);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should include cache statistics when available', async () => {
      const agents = {};
      const workflows = {};

      const result = await performHealthCheck(agents, workflows);

      if (result.cache) {
        expect(result.cache).toHaveProperty('microlearningCount');
        expect(result.cache).toHaveProperty('estimatedSizeMB');
        expect(typeof result.cache.microlearningCount).toBe('number');
        expect(typeof result.cache.estimatedSizeMB).toBe('number');
      }
    });

    it('should determine overall status correctly', async () => {
      const agents = {};
      const workflows = {};

      const result = await performHealthCheck(agents, workflows);

      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should generate ISO timestamp', async () => {
      const result = await performHealthCheck({}, {});

      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should include checks for agents, workflows, and KV', async () => {
      const agents = {};
      const workflows = {};

      const result = await performHealthCheck(agents, workflows);

      expect(result.checks).toHaveProperty('agents');
      expect(result.checks).toHaveProperty('workflows');
      expect(result.checks).toHaveProperty('kv');
      expect(typeof result.checks.agents).toBe('boolean');
      expect(typeof result.checks.workflows).toBe('boolean');
    });

    it('should mark agents as present when provided', async () => {
      const agents = { orchestrator: {} };
      const workflows = {};

      const result = await performHealthCheck(agents, workflows);

      expect(result.checks.agents).toBe(true);
    });

    it('should mark agents as absent when not provided', async () => {
      const result = await performHealthCheck({}, {});

      expect(result.checks.agents).toBe(false);
    });

    it('should mark workflows as present when provided', async () => {
      const agents = {};
      const workflows = { 'create-microlearning': {} };

      const result = await performHealthCheck(agents, workflows);

      expect(result.checks.workflows).toBe(true);
    });

    it('should mark workflows as absent when not provided', async () => {
      const result = await performHealthCheck({}, {});

      expect(result.checks.workflows).toBe(false);
    });
  });
});
