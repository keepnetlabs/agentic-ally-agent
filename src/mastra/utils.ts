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
