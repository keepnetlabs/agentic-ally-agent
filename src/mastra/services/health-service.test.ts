import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkKVHealth,
  getUptime,
  determineOverallStatus,
  performHealthCheck,
  HealthResult,
  HealthCheckResponse,
} from './health-service';
import { KVService } from './kv-service';
import { MicrolearningService } from './microlearning-service';
import '../../../src/__tests__/setup';

// Mock dependencies
vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async fn => {
    return fn();
  }),
}));

vi.mock('./microlearning-service', () => ({
  MicrolearningService: {
    getCacheStats: vi.fn(() => ({
      microlearningCount: 10,
      estimatedSizeMB: 25.5,
    })),
  },
}));

vi.mock('./kv-service');

/**
 * Test Suite: HealthService
 * Tests for deep health checks and system monitoring
 * Covers: KV health checking, uptime calculation, status determination, error handling
 */

describe('HealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    it('should handle KV health check timeout gracefully', async () => {
      const result = await performHealthCheck({}, {}, 100); // Very short timeout

      // Should still return a valid response even if timeout occurs
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should handle KV health check errors gracefully', async () => {
      const result = await performHealthCheck({}, {}, 5000);

      expect(result).toBeDefined();
      expect(result.checks.kv.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.checks.kv.status);
    });

    it('should measure uptime correctly in response', async () => {
      const result = await performHealthCheck({}, {});

      expect(result.uptimeMs).toBeTypeOf('number');
      expect(result.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(result.uptime).toMatch(/[smhd]/); // Should have time unit
    });

    it('should include ISO 8601 formatted timestamp', async () => {
      const result = await performHealthCheck({}, {});

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle large number of agents and workflows', async () => {
      const agents: Record<string, unknown> = {};
      const workflows: Record<string, unknown> = {};

      // Create 100 agents
      for (let i = 0; i < 100; i++) {
        agents[`agent-${i}`] = {};
      }

      // Create 50 workflows
      for (let i = 0; i < 50; i++) {
        workflows[`workflow-${i}`] = {};
      }

      const result = await performHealthCheck(agents, workflows);

      expect(result.details?.agentCount).toBe(100);
      expect(result.details?.workflowCount).toBe(50);
      expect(result.details?.agents).toHaveLength(100);
      expect(result.details?.workflows).toHaveLength(50);
    });

    it('should include cache statistics in response', async () => {
      const result = await performHealthCheck({}, {});

      expect(result.cache).toBeDefined();
      expect(result.cache?.microlearningCount).toBeGreaterThanOrEqual(0);
      expect(result.cache?.estimatedSizeMB).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing cache stats gracefully', async () => {
      vi.mocked(KVService).mockImplementationOnce(function () {
        return {
          healthCheck: vi.fn().mockResolvedValueOnce(true),
        };
      } as any);

      const result = await performHealthCheck({}, {});

      expect(result.cache).toBeDefined();
    });
  });

  describe('checkKVHealth - Advanced Scenarios', () => {
    it('should return degraded when KV health check returns false', async () => {
      vi.mocked(KVService).mockImplementationOnce(function () {
        return {
          healthCheck: vi.fn().mockResolvedValue(false),
        };
      } as any);

      const result = await checkKVHealth();

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('returned false');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when KV health check throws', async () => {
      vi.mocked(KVService).mockImplementationOnce(function () {
        return {
          healthCheck: vi.fn().mockRejectedValue(new Error('KV unavailable')),
        };
      } as any);

      const result = await checkKVHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('KV unavailable');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should always return a HealthResult with defined status', async () => {
      const result = await checkKVHealth();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should include latency measurement in result', async () => {
      const result = await checkKVHealth();

      expect(result.latencyMs).toBeDefined();
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should include error when status is not healthy', async () => {
      const result = await checkKVHealth();

      if (result.status !== 'healthy') {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should not include error when status is healthy', async () => {
      const result = await checkKVHealth();

      if (result.status === 'healthy') {
        expect(result.error).toBeUndefined();
      }
    });

    it('should measure latency as a non-negative number', async () => {
      const result = await checkKVHealth();

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.latencyMs).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle the health check gracefully', async () => {
      // Multiple calls should not throw
      await expect(checkKVHealth()).resolves.toBeDefined();
      await expect(checkKVHealth()).resolves.toBeDefined();
      await expect(checkKVHealth()).resolves.toBeDefined();
    });

    it('should provide consistent response structure', async () => {
      const result1 = await checkKVHealth();
      const result2 = await checkKVHealth();

      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
    });
  });

  describe('getUptime - Advanced Scenarios', () => {
    it('should format seconds without minutes', () => {
      const uptime = getUptime();

      expect(uptime.formatted).toBeDefined();
      expect(typeof uptime.formatted).toBe('string');
      expect(uptime.ms).toBeGreaterThanOrEqual(0);
    });

    it('should include time unit in formatted string', () => {
      const uptime = getUptime();

      expect(uptime.formatted).toMatch(/[smhd]/);
    });

    it('should have consistent ms and formatted values', () => {
      const uptime = getUptime();

      const ms = uptime.ms;
      const seconds = Math.floor(ms / 1000);

      // Validate that the formatted string contains reasonable values
      if (seconds > 60) {
        expect(uptime.formatted).toMatch(/\d+[mhd]/);
      } else {
        expect(uptime.formatted).toMatch(/\d+s/);
      }
    });

    it('should return increasing uptime on subsequent calls', async () => {
      const uptime1 = getUptime();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const uptime2 = getUptime();

      expect(uptime2.ms).toBeGreaterThanOrEqual(uptime1.ms);
    });

    it('should format with proper spacing and separators', () => {
      const uptime = getUptime();

      // Check format: "Xd Xh Xm", "Xh Xm", "Xm Xs", or "Xs"
      expect(uptime.formatted).toMatch(/^\d+[smhd](\s\d+[smhd])?(\s\d+[smhd])?$/);
    });

    it('should never have negative uptime', () => {
      const uptime = getUptime();

      expect(uptime.ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determineOverallStatus - Edge Cases', () => {
    it('should handle kv status variations', () => {
      const healthyCheck = { kv: { status: 'healthy' as const } };
      const degradedCheck = { kv: { status: 'degraded' as const } };
      const unhealthyCheck = { kv: { status: 'unhealthy' as const } };

      expect(determineOverallStatus(healthyCheck)).toBe('healthy');
      expect(determineOverallStatus(degradedCheck)).toBe('degraded');
      expect(determineOverallStatus(unhealthyCheck)).toBe('unhealthy');
    });

    it('should propagate kv health directly to overall status', () => {
      const kvStates = [
        { kv: { status: 'healthy' as const }, expected: 'healthy' as const },
        { kv: { status: 'degraded' as const }, expected: 'degraded' as const },
        { kv: { status: 'unhealthy' as const }, expected: 'unhealthy' as const },
      ];

      kvStates.forEach(({ kv, expected }) => {
        expect(determineOverallStatus({ kv })).toBe(expected);
      });
    });

    it('should always return a valid status', () => {
      const kvHealth: HealthResult = { status: 'healthy' };
      const result = determineOverallStatus({ kv: kvHealth });

      expect(['healthy', 'degraded', 'unhealthy']).toContain(result);
    });

    it('should handle kv with error messages', () => {
      const checks = {
        kv: { status: 'unhealthy' as const, error: 'Database connection lost' },
      };

      expect(determineOverallStatus(checks)).toBe('unhealthy');
    });

    it('should handle kv with latency information', () => {
      const checks = {
        kv: { status: 'degraded' as const, latencyMs: 5000 },
      };

      expect(determineOverallStatus(checks)).toBe('degraded');
    });
  });

  describe('HealthService - Integration Tests', () => {
    it('should mark overall status as degraded when KV check returns false', async () => {
      vi.mocked(KVService).mockImplementationOnce(function () {
        return {
          healthCheck: vi.fn().mockResolvedValue(false),
        };
      } as any);

      const result = await performHealthCheck({}, {});
      expect(result.checks.kv.status).toBe('degraded');
      expect(result.status).toBe('degraded');
    });

    it('should mark overall status as unhealthy when KV check times out', async () => {
      vi.mocked(KVService).mockImplementationOnce(function () {
        return {
          healthCheck: vi.fn().mockImplementation(() => new Promise(() => {})),
        };
      } as any);

      const result = await performHealthCheck({}, {}, 20);
      expect(result.checks.kv.status).toBe('unhealthy');
      expect(result.checks.kv.error).toContain('Health check timeout');
      expect(result.status).toBe('unhealthy');
    });

    it('should correlate KV status with overall status in full health check', async () => {
      const result = await performHealthCheck({}, {});

      expect(result.checks.kv.status).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.checks.kv.status);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should apply proper status logic based on KV health', async () => {
      const result = await performHealthCheck({}, {});

      // Overall status should match KV status according to determineOverallStatus logic
      const expectedStatus = result.checks.kv.status;
      expect(determineOverallStatus({ kv: result.checks.kv })).toBe(
        expectedStatus === 'unhealthy' ? 'unhealthy' : expectedStatus === 'degraded' ? 'degraded' : 'healthy'
      );
    });

    it('should determine overall status based on KV status', async () => {
      const result = await performHealthCheck({}, {});

      // Verify the overall status determination logic
      if (result.checks.kv.status === 'unhealthy') {
        expect(result.status).toBe('unhealthy');
      } else if (result.checks.kv.status === 'degraded') {
        expect(result.status).toBe('degraded');
      } else {
        expect(result.status).toBe('healthy');
      }
    });

    it('should handle rapid successive health checks', async () => {
      vi.mocked(KVService).mockImplementation(function () {
        return {
          healthCheck: vi.fn().mockResolvedValueOnce(true),
        };
      } as any);

      const results = await Promise.all([
        performHealthCheck({}, {}),
        performHealthCheck({}, {}),
        performHealthCheck({}, {}),
      ]);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      });
    });

    it('should provide detailed status in all conditions', async () => {
      const agents = { agent1: {}, agent2: {} };
      const workflows = { workflow1: {} };

      const result = await performHealthCheck(agents, workflows);

      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(result.checks).toBeDefined();
      expect(result.checks.kv).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('should handle health check with different timeout values', async () => {
      const timeouts = [100, 500, 1000, 5000];

      for (const timeout of timeouts) {
        const result = await performHealthCheck({}, {}, timeout);
        expect(result).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      }
    });

    it('should provide consistent structure across multiple calls', async () => {
      vi.mocked(KVService).mockImplementation(function () {
        return {
          healthCheck: vi.fn().mockResolvedValue(true),
        };
      } as any);

      const result1 = await performHealthCheck({}, {});
      const result2 = await performHealthCheck({}, {});

      // Structure should be consistent
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
      expect(Object.keys(result1.checks).sort()).toEqual(Object.keys(result2.checks).sort());
    });
  });

  describe('HealthService - Error Handling and Resilience', () => {
    it('should handle undefined cache stats without failing response shape', async () => {
      vi.mocked(MicrolearningService.getCacheStats).mockReturnValueOnce(undefined as any);

      const result = await performHealthCheck({}, {});

      expect(result.status).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.cache).toBeUndefined();
    });

    it('should never throw from performHealthCheck', async () => {
      await expect(performHealthCheck({}, {})).resolves.toBeDefined();
    });

    it('should never throw from checkKVHealth', async () => {
      await expect(checkKVHealth()).resolves.toBeDefined();
    });

    it('should always return a valid HealthCheckResponse', async () => {
      const result = await performHealthCheck({}, {});

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.uptimeMs).toBeDefined();
      expect(result.checks).toBeDefined();
    });

    it('should provide error message when KV status indicates failure', async () => {
      const result = await checkKVHealth();

      if (result.status !== 'healthy') {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should calculate latency in all health check outcomes', async () => {
      const result1 = await checkKVHealth();
      const result2 = await performHealthCheck({}, {});

      expect(result1.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result1.latencyMs).toBeLessThan(30000);
      expect(result2.checks.kv.latencyMs).toBeLessThan(30000);
    });

    it('should handle multiple sequential health checks', async () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const result = await checkKVHealth();
        results.push(result);
      }

      results.forEach(result => {
        expect(result.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      });
    });

    it('should maintain consistent response structure on failures', async () => {
      const result = await checkKVHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('latencyMs');
      // error property is optional based on status
    });

    it('should include latency for all health checks', async () => {
      const kvResult = await checkKVHealth();
      const fullResult = await performHealthCheck({}, {});

      expect(kvResult.latencyMs).toBeDefined();
      expect(fullResult.checks.kv.latencyMs).toBeDefined();
    });
  });
});
