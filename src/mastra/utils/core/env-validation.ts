/**
 * Environment Validation Utility
 * Validates required environment variables at startup using Zod schema
 * Fails fast if critical configuration is missing or invalid
 */

import { z } from 'zod';
import { getLogger } from './logger';

const logger = getLogger('EnvValidation');

/**
 * Zod schema for environment variables
 * Defines both required and optional variables with validation rules
 */
const EnvSchema = z.object({
    // --- REQUIRED VARIABLES ---
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1, 'Cloudflare Account ID is required'),
    CLOUDFLARE_API_KEY: z.string().min(1, 'Cloudflare API Key is required for KV operations'),
    CLOUDFLARE_KV_TOKEN: z.string().min(1, 'Cloudflare KV Token is required'),
    CLOUDFLARE_D1_DATABASE_ID: z.string().min(1, 'Cloudflare D1 Database ID is required'),
    CLOUDFLARE_AI_GATEWAY_ID: z.string().min(1, 'Cloudflare AI Gateway ID is required'),
    CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY: z.string().min(1, 'Cloudflare Gateway Auth Key is required'),
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key is required'),

    // --- OPTIONAL VARIABLES ---
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    MASTRA_MEMORY_URL: z.string().url().optional(),
    MASTRA_MEMORY_TOKEN: z.string().optional(),
    LOGO_DEV_TOKEN: z.string().optional(),
});

// Infer type from schema
export type EnvConfig = z.infer<typeof EnvSchema>;

export interface EnvValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
    config?: EnvConfig;
}

/**
 * Validates environment variables at startup
 * @returns EnvValidationResult with validation status and parsed config
 */
export function validateEnvironment(): EnvValidationResult {
    const result = EnvSchema.safeParse(process.env);

    if (!result.success) {
        const missing: string[] = [];
        const formattedErrors: string[] = [];

        result.error.issues.forEach(issue => {
            const path = issue.path.join('.');
            missing.push(path);
            formattedErrors.push(`${path}: ${issue.message}`);
        });

        logger.error('Environment validation failed', {
            missing,
            errors: formattedErrors,
        });

        return {
            valid: false,
            missing,
            warnings: [],
        };
    }

    // Check for optional variables specifically to log warnings (Zod parses them as success even if undefined)
    // We manually check if specific useful optionals are missing for visibility
    const warnings: string[] = [];
    const optionalToCheck = [
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'MASTRA_MEMORY_URL'
    ];

    optionalToCheck.forEach(key => {
        if (!process.env[key]) {
            warnings.push(key);
        }
    });

    if (warnings.length > 0) {
        logger.warn('Optional environment variables not set', {
            warnings,
            count: warnings.length,
        });
    }

    logger.info('Environment validation passed', {
        requiredVars: Object.keys(EnvSchema.shape).length,
    });

    return {
        valid: true,
        missing: [],
        warnings,
        config: result.data as EnvConfig
    };
}

/**
 * Validates environment and throws if invalid
 * Use this at application startup for fail-fast behavior
 * @throws Error if required environment variables are missing
 */
export function validateEnvironmentOrThrow(): EnvConfig {
    const result = validateEnvironment();

    if (!result.valid || !result.config) {
        throw new Error(
            `Invalid environment configuration:\n${result.missing.join('\n')}\n` +
            `Please check your .env file or environment configuration.`
        );
    }

    return result.config;
}


