/**
 * HTML validation utilities for landing pages
 * Validates required elements, CSS patterns, and structural integrity
 */

import { getLogger } from '../core/logger';

const logger = getLogger('HtmlValidator');

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LandingValidationContext {
  fromName?: string;
  scenario?: string;
  subject?: string;
  isQuishing?: boolean;
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
    {
      pattern: /bg-gradient-to-[a-z]+ from-[a-z]+-\d+ via-[a-z]+-\d+ to-/g,
      description: 'Complex 3-color gradients - use simple 2-color or solid colors',
    },
  ];

  // Patterns that suggest "card on gradient" layout (critical failures)
  const cardLayoutPatterns = [
    {
      pattern: /min-h-screen.*flex.*items-center.*justify-center/g,
      description: 'Centered card layout detected - should be normal page flow',
    },
    {
      pattern: /bg-gradient-to-[a-z]+ (?!from-white)(?!from-gray)/g,
      description: 'Colorful gradient background - normal pages use white/gray',
    },
  ];

  // Check forbidden patterns (ERRORS)
  for (const { pattern, description } of forbiddenPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      errors.push(
        `Forbidden CSS pattern "${pattern.source.replace(/\\/g, '')}": ${description} (found ${matches.length} times)`
      );
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
    warnings,
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
    warnings,
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
    warnings,
  };
}

function extractScenarioKeywords(...values: Array<string | undefined>): string[] {
  const stopWords = new Set([
    'account', 'update', 'urgent', 'required', 'request', 'secure', 'security', 'team', 'portal', 'page',
    'login', 'sign', 'your', 'with', 'from', 'into', 'that', 'this', 'have', 'will', 'please', 'review',
  ]);

  return values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4 && !stopWords.has(word))
    .slice(0, 8);
}

function extractActionLabels(html: string): string[] {
  return Array.from(html.matchAll(/<(a|button)\b[^>]*>([\s\S]{1,120}?)<\/\1>/gi))
    .map(match => match[2]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter((label): label is string => Boolean(label));
}

const SUCCESS_STATE_PATTERN = /(success|updated|received|confirmed|submitted|complete|completed|thank you)/;
const CONFLICTING_SUCCESS_CTA_PATTERN =
  /sign in|log in|login|verify|submit|confirm|complete|review|acknowledg|update|continue|retry|try again/;

export function validateSemanticQuality(
  html: string,
  pageType: string,
  context: LandingValidationContext = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lowerHtml = html.toLowerCase();
  const actionLabels = extractActionLabels(html);

  const genericPlaceholderPatterns = [
    /lorem ipsum/,
    /your company/,
    /company name/,
    /insert logo/,
    /replace this/,
    /placeholder text/,
  ];

  for (const pattern of genericPlaceholderPatterns) {
    if (pattern.test(lowerHtml)) {
      errors.push(`Generic placeholder copy detected: ${pattern.source}`);
    }
  }

  if (context.isQuishing && /(qr code|scan the qr|scan qr|verify via qr)/.test(lowerHtml)) {
    errors.push('Quishing landing page contains QR-specific wording instead of a standard form');
  }

  if (pageType === 'success') {
    if (/<form/i.test(html) || /type=['"]password['"]/i.test(html)) {
      errors.push('Success page should not contain login form fields');
    }

    if (!SUCCESS_STATE_PATTERN.test(lowerHtml)) {
      warnings.push('Success page copy looks generic and does not clearly communicate completion');
    }

    if (actionLabels.some(label => CONFLICTING_SUCCESS_CTA_PATTERN.test(label))) {
      warnings.push('Success page CTA may contradict the completed state; prefer neutral follow-up navigation or no primary CTA');
    }
  }

  if (pageType === 'info') {
    if (/<form/i.test(html) || /type=['"]password['"]/i.test(html) || /type=['"]submit['"]/i.test(html) || /<button/i.test(html)) {
      errors.push('Info page should present content directly without forms or CTA buttons');
    }
  }

  if (pageType === 'login') {
    if (/(>\s*(click here|submit|continue)\s*<)/i.test(html)) {
      warnings.push('Login CTA looks generic; use scenario-specific action wording');
    }

    if (!/(sign in|log in|login|continue|access|securely)/.test(lowerHtml)) {
      warnings.push('Login page heading/microcopy may not read like a realistic product sign-in flow');
    }
  }

  if (context.fromName && !lowerHtml.includes(context.fromName.toLowerCase()) && !lowerHtml.includes('{custommainlogo}')) {
    warnings.push('Landing page does not visibly reference the impersonated brand');
  }

  if (/(>\s*go to dashboard\s*<)/i.test(html)) {
    warnings.push('Generic "Go to dashboard" CTA detected; prefer scenario-specific completion language');
  }

  const scenarioKeywords = extractScenarioKeywords(context.scenario, context.subject);
  if (pageType !== 'login' && scenarioKeywords.length > 0 && !scenarioKeywords.some(keyword => lowerHtml.includes(keyword))) {
    warnings.push('Landing page copy appears weakly tied to the scenario context');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Comprehensive validation for landing pages
 * Runs all validation checks and aggregates results
 * @param html - HTML string to validate
 * @param pageType - Type of page (login, success, info)
 * @returns ValidationResult
 */
export function validateLandingPage(
  html: string,
  pageType: string,
  context?: LandingValidationContext
): ValidationResult {
  const results: ValidationResult[] = [];

  // Run all validations
  results.push(validateHTMLStructure(html));
  results.push(validateCSSPatterns(html));
  results.push(validateFormElements(html, pageType));
  results.push(validateSemanticQuality(html, pageType, context));

  // Aggregate results
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

export function hasRetryableLandingQualitySignals(result: ValidationResult): boolean {
  return result.errors.length > 0;
}

/**
 * Log validation results to console with pretty formatting
 * @param result - ValidationResult to log
 * @param pageType - Type of page being validated
 */
export function logValidationResults(result: ValidationResult, pageType: string): void {
  if (result.isValid && result.warnings.length === 0) {
    logger.info('Page validation passed', { pageType });
    return;
  }

  if (result.errors.length > 0) {
    logger.error('Page validation FAILED', {
      pageType,
      errors: result.errors,
    });
  }

  if (result.warnings.length > 0) {
    logger.warn('Page validation warnings', {
      pageType,
      warnings: result.warnings,
    });
  }
}
