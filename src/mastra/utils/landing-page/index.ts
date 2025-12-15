/**
 * Landing Page Utilities
 * Centralized export for all landing page generation utilities
 */

// Image validation and fixing
export {
    validateImageUrl,
    validateImageUrlCached,
    fixBrokenImages,
    clearImageValidationCache
} from './image-validator';

// Industry detection and design systems
export {
    detectIndustry,
    type IndustryDesign
} from './industry-detector';

// HTML validation
export {
    validateLandingPage,
    validateCSSPatterns,
    validateFormElements,
    validateHTMLStructure,
    logValidationResults,
    type ValidationResult
} from './html-validator';
