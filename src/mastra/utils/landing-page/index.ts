/**
 * Landing Page Utilities
 * Centralized export for all landing page generation utilities
 */

// Image validation and fixing
export { validateImageUrl, validateImageUrlCached, fixBrokenImages } from './image-validator';

// Industry detection and design systems
export { detectIndustry, type IndustryDesign } from './industry-detector';

// HTML validation
export {
  validateLandingPage,
  validateCSSPatterns,
  validateFormElements,
  validateHTMLStructure,
  logValidationResults,
  type ValidationResult,
} from './html-validator';

// HTML normalization
export {
  normalizeLandingFormCentering,
  normalizeLandingMaxWidthCentering,
  normalizeLandingCentering,
} from './form-centering-normalizer';

export { normalizeLandingLogoCentering } from './logo-centering-normalizer';

export { ensureLandingFullHtmlDocument } from './full-document-normalizer';
