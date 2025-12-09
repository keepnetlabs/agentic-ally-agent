/**
 * HTML validation utilities for landing pages
 * Validates required elements, CSS patterns, and structural integrity
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate that login page contains required trackId input
 * @param html - HTML string to validate
 * @returns ValidationResult
 */
export function validateTrackIdInput(html: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for trackId hidden input
    const trackIdPatterns = [
        /name=['"]trackId['"]/i,
        /id=['"]trackId['"]/i
    ];

    const hasTrackId = trackIdPatterns.some(pattern => pattern.test(html));

    if (!hasTrackId) {
        errors.push('Missing required trackId hidden input field');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate that page doesn't contain unwanted CSS patterns
 * (e.g., overly complex styling that doesn't match "normal web page" requirement)
 * @param html - HTML string to validate
 * @returns ValidationResult
 */
export function validateCSSPatterns(html: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // CRITICAL: These patterns indicate "fancy card" design instead of normal page
    // Using these is now an ERROR, not just a warning
    const forbiddenPatterns = [
        { pattern: /shadow-2xl/g, description: 'Overly dramatic shadows - use shadow-md or shadow-lg for normal pages' },
        { pattern: /rounded-3xl/g, description: 'Excessive border radius - use rounded-lg or rounded-xl max' },
        { pattern: /backdrop-blur/g, description: 'Glassmorphism not suitable for normal web pages' },
        { pattern: /bg-gradient-to-[a-z]+ from-[a-z]+-\d+ via-[a-z]+-\d+ to-/g, description: 'Complex 3-color gradients - use simple 2-color or solid colors' }
    ];

    // Patterns that suggest "card on gradient" layout (critical failures)
    const cardLayoutPatterns = [
        { pattern: /min-h-screen.*flex.*items-center.*justify-center/g, description: 'Centered card layout detected - should be normal page flow' },
        { pattern: /bg-gradient-to-[a-z]+ (?!from-white)(?!from-gray)/g, description: 'Colorful gradient background - normal pages use white/gray' }
    ];

    // Check forbidden patterns (ERRORS)
    for (const { pattern, description } of forbiddenPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
            errors.push(`Forbidden CSS pattern "${pattern.source.replace(/\\/g, '')}": ${description} (found ${matches.length} times)`);
        }
    }

    // Check card layout patterns (ERRORS)
    for (const { pattern, description } of cardLayoutPatterns) {
        if (pattern.test(html)) {
            errors.push(`Card layout pattern detected: ${description}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate that login page has required form elements
 * @param html - HTML string to validate
 * @param pageType - Type of page (login, success, info)
 * @returns ValidationResult
 */
export function validateFormElements(html: string, pageType: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (pageType === 'login') {
        // Check for form tag
        if (!/<form/i.test(html)) {
            errors.push('Missing <form> element');
        }

        // Check for email/username input
        if (!/type=['"]email['"]|type=['"]text['"].*@/i.test(html)) {
            warnings.push('Missing email/username input field');
        }

        // Check for password input
        if (!/type=['"]password['"]/i.test(html)) {
            warnings.push('Missing password input field');
        }

        // Check for submit button
        if (!/type=['"]submit['"]|<button/i.test(html)) {
            warnings.push('Missing submit button');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate basic HTML structure
 * @param html - HTML string to validate
 * @returns ValidationResult
 */
export function validateHTMLStructure(html: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for DOCTYPE
    if (!/<!DOCTYPE html>/i.test(html)) {
        warnings.push('Missing DOCTYPE declaration');
    }

    // Check for html tag
    if (!/<html/i.test(html)) {
        errors.push('Missing <html> tag');
    }

    // Check for head tag
    if (!/<head/i.test(html)) {
        errors.push('Missing <head> tag');
    }

    // Check for body tag
    if (!/<body/i.test(html)) {
        errors.push('Missing <body> tag');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Comprehensive validation for landing pages
 * Runs all validation checks and aggregates results
 * @param html - HTML string to validate
 * @param pageType - Type of page (login, success, info)
 * @returns ValidationResult
 */
export function validateLandingPage(html: string, pageType: string): ValidationResult {
    const results: ValidationResult[] = [];

    // Run all validations
    results.push(validateHTMLStructure(html));
    results.push(validateCSSPatterns(html));
    results.push(validateFormElements(html, pageType));

    if (pageType === 'login') {
        results.push(validateTrackIdInput(html));
    }

    // Aggregate results
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings
    };
}

/**
 * Log validation results to console with pretty formatting
 * @param result - ValidationResult to log
 * @param pageType - Type of page being validated
 */
export function logValidationResults(result: ValidationResult, pageType: string): void {
    if (result.isValid && result.warnings.length === 0) {
        console.log(`✅ ${pageType} page validation passed`);
        return;
    }

    if (result.errors.length > 0) {
        console.error(`❌ ${pageType} page validation FAILED:`);
        result.errors.forEach(error => console.error(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
        console.warn(`⚠️ ${pageType} page validation warnings:`);
        result.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
}
