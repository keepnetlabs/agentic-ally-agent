/**
 * Environment Validation Utility
 * Validates required environment variables at startup
 * Fails fast if critical configuration is missing
 */

import { getLogger } from './logger';

const logger = getLogger('EnvValidation');

/**
 * Required environment variables for the application to function
 * These are absolutely necessary and will cause startup failure if missing
 */
const REQUIRED_ENV_VARS = [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_KV_TOKEN',
    'OPENAI_API_KEY',
] as const;

/**
 * Optional environment variables that enhance functionality
 * Application will work without these but some features may be limited
 */
const OPTIONAL_ENV_VARS = [
    'CLOUDFLARE_D1_DATABASE_ID',
    'CLOUDFLARE_AI_GATEWAY_ID',
    'CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'MASTRA_MEMORY_URL',
    'MASTRA_MEMORY_TOKEN',
    // Note: RATE_LIMIT_* moved to constants.ts (RATE_LIMIT_CONFIG)
] as const;

export interface EnvValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
}

/**
 * Validates environment variables at startup
 * @returns EnvValidationResult with validation status
 * @throws Error if required environment variables are missing (in production mode)
 */
export function validateEnvironment(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    for (const envVar of REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    // Check optional variables and warn if missing
    for (const envVar of OPTIONAL_ENV_VARS) {
        if (!process.env[envVar]) {
            warnings.push(envVar);
        }
    }

    const valid = missing.length === 0;

    // Log results
    if (!valid) {
        logger.error('Missing required environment variables', {
            missing,
            count: missing.length,
        });
    }

    if (warnings.length > 0) {
        logger.warn('Optional environment variables not set', {
            warnings,
            count: warnings.length,
        });
    }

    if (valid) {
        logger.info('Environment validation passed', {
            requiredCount: REQUIRED_ENV_VARS.length,
            optionalMissing: warnings.length,
        });
    }

    return { valid, missing, warnings };
}

/**
 * Validates environment and throws if invalid
 * Use this at application startup for fail-fast behavior
 * @throws Error if required environment variables are missing
 */
export function validateEnvironmentOrThrow(): void {
    const result = validateEnvironment();

    if (!result.valid) {
        throw new Error(
            `Missing required environment variables: ${result.missing.join(', ')}. ` +
            `Please check your .env file or environment configuration.`
        );
    }
}

