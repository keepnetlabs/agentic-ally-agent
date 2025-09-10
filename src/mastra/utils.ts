/**
 * Checks if the application is running in development mode
 * @returns {boolean} True if in development mode, false if in production
 */
export function isProduction(): boolean {
    // Check NODE_ENV environment variable
    // Default to development if not set (common for local development)
    const nodeEnv = process.env.NODE_ENV?.toLowerCase()?.trim();

    // Also check for BUILD_MODE as an alternative
    const buildMode = process.env.BUILD_MODE?.toLowerCase()?.trim();

    // Consider it production mode if either variable is explicitly set to 'production'
    const isProduction = nodeEnv === 'production' || buildMode === 'production';

    return isProduction;
}

/**
 * Checks if the application is running in production mode
 * @returns {boolean} True if in production mode, false otherwise
 */
export function isDevelopment(): boolean {
    return !isProduction();
}

/**
 * Checks if all required environment variables are set
 * @returns {boolean} True if all required environment variables are set, false otherwise
 */
export function checkEnvironmentVariables() {
    // List of required environment variables
    const requiredVars = [
        'CLOUDFLARE_API_TOKEN',
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_AI_GATEWAY_ID',
        'OPENAI_API_KEY'
    ];

    const missingVars = requiredVars.filter((key) => !process.env[key] || process.env[key].trim() === '');

    if (missingVars.length > 0) {
        return false;
    }

    return true;
}