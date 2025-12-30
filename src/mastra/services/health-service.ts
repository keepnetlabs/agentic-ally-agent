/**
 * Health Check Service
 * 
 * Provides deep health checks for production monitoring.
 * Checks KV, OpenAI API, and system uptime.
 */

import { getLogger } from '../utils/core/logger';
import { KVService } from './kv-service';
import { withRetry } from '../utils/core/resilience-utils';
import { MicrolearningService } from './microlearning-service';

const logger = getLogger('HealthService');

// Track application start time for uptime calculation
const startTime = Date.now();

/**
 * Health check result interface
 */
export interface HealthResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs?: number;
    error?: string;
}

/**
 * Complete health check response
 */
export interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: string;
    uptimeMs: number;
    checks: {
        agents: boolean;
        workflows: boolean;
        kv: HealthResult;
    };
    details?: {
        agents: string[];
        workflows: string[];
        agentCount: number;
        workflowCount: number;
    };
    cache?: {
        microlearningCount: number;
        estimatedSizeMB: number;
    };
}

/**
 * Check KV Store health
 * Writes and reads a test key to verify connectivity
 */
export async function checkKVHealth(): Promise<HealthResult> {
    const startMs = Date.now();

    try {
        const kvService = new KVService();
        const isHealthy = await withRetry(
            () => kvService.healthCheck(),
            'KV health check'
        );
        const latencyMs = Date.now() - startMs;

        if (isHealthy) {
            return { status: 'healthy', latencyMs };
        } else {
            return { status: 'degraded', latencyMs, error: 'KV health check returned false' };
        }
    } catch (error) {
        const latencyMs = Date.now() - startMs;
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error('KV health check failed', { error: errorMessage, latencyMs });
        return { status: 'unhealthy', latencyMs, error: errorMessage };
    }
}

/**
 * Get formatted uptime string
 */
export function getUptime(): { formatted: string; ms: number } {
    const uptimeMs = Date.now() - startTime;

    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let formatted: string;
    if (days > 0) {
        formatted = `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        formatted = `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        formatted = `${minutes}m ${seconds % 60}s`;
    } else {
        formatted = `${seconds}s`;
    }

    return { formatted, ms: uptimeMs };
}

/**
 * Determine overall health status from individual checks
 */
export function determineOverallStatus(checks: { kv: HealthResult }): 'healthy' | 'degraded' | 'unhealthy' {
    const { kv } = checks;

    // If KV is unhealthy, overall is unhealthy
    if (kv.status === 'unhealthy') {
        return 'unhealthy';
    }

    // If KV is degraded, overall is degraded
    if (kv.status === 'degraded') {
        return 'degraded';
    }

    return 'healthy';
}

/**
 * Perform complete health check with timeout
 */
export async function performHealthCheck(
    agents: Record<string, unknown>,
    workflows: Record<string, unknown>,
    timeoutMs: number = 5000
): Promise<HealthCheckResponse> {
    const uptime = getUptime();

    // Run KV health check with timeout
    let kvHealth: HealthResult;
    try {
        kvHealth = await Promise.race([
            checkKVHealth(),
            new Promise<HealthResult>((_, reject) =>
                setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
            )
        ]);
    } catch (error) {
        kvHealth = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Health check timeout'
        };
    }

    const agentNames = Object.keys(agents);
    const workflowNames = Object.keys(workflows);

    const checks = {
        agents: agentNames.length > 0,
        workflows: workflowNames.length > 0,
        kv: kvHealth,
    };

    const overallStatus = determineOverallStatus(checks);

    // Get in-memory cache stats for monitoring
    const cacheStats = MicrolearningService.getCacheStats();

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: uptime.formatted,
        uptimeMs: uptime.ms,
        checks,
        details: {
            agents: agentNames,
            workflows: workflowNames,
            agentCount: agentNames.length,
            workflowCount: workflowNames.length,
        },
        cache: cacheStats,
    };
}

