/**
 * JSON structure validation and correction utilities for translation workflows
 */

import { getLogger } from '../core/logger';
import * as parse5 from 'parse5';
import { EmailSimulationInbox, SimulatedEmail, EmailAttachment } from '../../types/microlearning';

const logger = getLogger('JsonValidation');

/**
 * Validates that translated JSON maintains the same structure as the original
 * @param original - The original JSON object
 * @param translated - The translated JSON object
 * @returns boolean indicating if structure is valid
 */
export function validateInboxStructure(original: Record<string, any>, translated: Record<string, any>): boolean {
  if (!original || !translated) {
    logger.warn('Missing original or translated data for validation');
    return false;
  }

  // Check if both have the same top-level structure
  const originalKeys = Object.keys(original).sort();
  const translatedKeys = Object.keys(translated).sort();

  if (originalKeys.join(',') !== translatedKeys.join(',')) {
    logger.warn('Key mismatch detected', {
      originalKeys: originalKeys.join(', '),
      translatedKeys: translatedKeys.join(', ')
    });
    return false;
  }

  // Check if 'emails' array exists and has correct structure
  if (original.emails && Array.isArray(original.emails)) {
    if (!translated.emails || !Array.isArray(translated.emails)) {
      logger.warn('Missing or invalid emails array in translation');
      return false;
    }

    if (original.emails.length !== translated.emails.length) {
      logger.warn('Email count mismatch', {
        originalCount: original.emails.length,
        translatedCount: translated.emails.length
      });
      return false;
    }

    // Check each email structure
    for (let i = 0; i < original.emails.length; i++) {
      const origEmail = original.emails[i];
      const transEmail = translated.emails[i];

      if (!origEmail || !transEmail) {
        logger.warn('Missing email at index', { index: i });
        continue;
      }

      const origEmailKeys = Object.keys(origEmail).sort();
      const transEmailKeys = Object.keys(transEmail).sort();

      if (origEmailKeys.join(',') !== transEmailKeys.join(',')) {
        logger.warn('Email key mismatch', {
          emailIndex: i,
          originalKeys: origEmailKeys.join(', '),
          translatedKeys: transEmailKeys.join(', ')
        });
        return false;
      }

      // Check nested objects like attachments
      if (origEmail.attachments && Array.isArray(origEmail.attachments)) {
        if (!transEmail.attachments || !Array.isArray(transEmail.attachments)) {
          logger.warn('Email missing or invalid attachments array', { emailIndex: i });
          return false;
        }

        if (origEmail.attachments.length !== transEmail.attachments.length) {
          logger.warn('Email attachment count mismatch', {
            emailIndex: i,
            originalCount: origEmail.attachments.length,
            translatedCount: transEmail.attachments.length
          });
          return false;
        }
      }
    }
  }

  // Check texts object structure
  if (original.texts && typeof original.texts === 'object') {
    if (!translated.texts || typeof translated.texts !== 'object') {
      logger.warn('Missing or invalid texts object in translation');
      return false;
    }

    // Check nested modal structures
    if (original.texts.phishingReportModal) {
      if (!translated.texts.phishingReportModal) {
        logger.warn('Missing phishingReportModal in translated texts');
        return false;
      }

      const origModalKeys = Object.keys(original.texts.phishingReportModal).sort();
      const transModalKeys = Object.keys(translated.texts.phishingReportModal).sort();

      if (origModalKeys.join(',') !== transModalKeys.join(',')) {
        logger.warn('phishingReportModal key mismatch', {
          originalKeys: origModalKeys.join(', '),
          translatedKeys: transModalKeys.join(', ')
        });
        return false;
      }
    }

    if (original.texts.phishingResultModal) {
      if (!translated.texts.phishingResultModal) {
        logger.warn('Missing phishingResultModal in translated texts');
        return false;
      }

      const origResultModalKeys = Object.keys(original.texts.phishingResultModal).sort();
      const transResultModalKeys = Object.keys(translated.texts.phishingResultModal).sort();

      if (origResultModalKeys.join(',') !== transResultModalKeys.join(',')) {
        logger.warn('phishingResultModal key mismatch', {
          originalKeys: origResultModalKeys.join(', '),
          translatedKeys: transResultModalKeys.join(', ')
        });
        return false;
      }
    }
  }

  logger.info('Inbox structure validation passed');
  return true;
}

/**
 * Attempts to correct the structure of a translated JSON by comparing with the original
 * @param original - The original JSON object
 * @param translated - The translated JSON object that may have structural issues
 * @returns Corrected JSON object
 */
export function correctInboxStructure(original: Record<string, any>, translated: Record<string, any>): Record<string, any> {
  if (!original || !translated) {
    logger.warn('Cannot correct structure - missing original or translated data');
    return original;
  }

  logger.info('Attempting to correct inbox structure');

  const corrected = { ...translated };

  // Ensure all original keys exist
  Object.keys(original).forEach(key => {
    if (!(key in corrected)) {
      logger.info('Adding missing key', { key });
      corrected[key] = original[key];
    }
  });

  // Remove any extra keys that weren't in original
  Object.keys(corrected).forEach(key => {
    if (!(key in original)) {
      logger.info('Removing extra key', { key });
      delete corrected[key];
    }
  });

  // Fix emails array if needed
  if (original.emails && Array.isArray(original.emails)) {
    if (!corrected.emails || !Array.isArray(corrected.emails)) {
      logger.info('Restoring emails array from original');
      corrected.emails = original.emails;
    } else if (corrected.emails.length !== original.emails.length) {
      logger.info('Correcting emails array length');

      // Try to match emails by id or index
      const correctedEmails = [];
      for (let i = 0; i < original.emails.length; i++) {
        const origEmail = original.emails[i];
        let transEmail = corrected.emails.find((e: any) => e.id === origEmail.id) || corrected.emails[i];

        if (!transEmail) {
          logger.info('Using original email as translation failed', { emailIndex: i });
          transEmail = origEmail;
        } else {
          // Ensure email has all required keys
          Object.keys(origEmail).forEach(emailKey => {
            if (!(emailKey in transEmail)) {
              logger.info('Adding missing email key', { emailKey });
              transEmail[emailKey] = origEmail[emailKey];
            }
          });

          // Remove extra keys from email
          Object.keys(transEmail).forEach(emailKey => {
            if (!(emailKey in origEmail)) {
              logger.info('Removing extra email key', { emailKey });
              delete transEmail[emailKey];
            }
          });

          // Fix attachments array if needed
          if (origEmail.attachments && Array.isArray(origEmail.attachments)) {
            if (!transEmail.attachments || !Array.isArray(transEmail.attachments)) {
              logger.info('Restoring attachments array for email', { emailIndex: i });
              transEmail.attachments = origEmail.attachments;
            } else if (transEmail.attachments.length !== origEmail.attachments.length) {
              logger.info('Correcting attachments length for email', { emailIndex: i });
              transEmail.attachments = origEmail.attachments;
            }
          }
        }

        correctedEmails.push(transEmail);
      }

      corrected.emails = correctedEmails;
    }
  }

  // Fix texts object structure
  if (original.texts && typeof original.texts === 'object') {
    if (!corrected.texts || typeof corrected.texts !== 'object') {
      logger.info('Restoring texts object from original');
      corrected.texts = original.texts;
    } else {
      // Ensure all text keys exist
      Object.keys(original.texts).forEach(textKey => {
        if (!(textKey in corrected.texts)) {
          logger.info('Adding missing text key', { textKey });
          corrected.texts[textKey] = original.texts[textKey];
        }
      });

      // Fix modal structures
      if (original.texts.phishingReportModal && corrected.texts.phishingReportModal) {
        Object.keys(original.texts.phishingReportModal).forEach(modalKey => {
          if (!(modalKey in corrected.texts.phishingReportModal)) {
            logger.info('Adding missing phishingReportModal key', { modalKey });
            corrected.texts.phishingReportModal[modalKey] = original.texts.phishingReportModal[modalKey];
          }
        });
      }

      if (original.texts.phishingResultModal && corrected.texts.phishingResultModal) {
        Object.keys(original.texts.phishingResultModal).forEach(modalKey => {
          if (!(modalKey in corrected.texts.phishingResultModal)) {
            logger.info('Adding missing phishingResultModal key', { modalKey });
            corrected.texts.phishingResultModal[modalKey] = original.texts.phishingResultModal[modalKey];
          }
        });
      }
    }
  }

  logger.info('Inbox structure correction completed');
  return corrected;
}

/**
 * Detects common JSON corruption issues in translated content
 * @param jsonData - The JSON object to check
 * @returns Array of detected issues
 */
export function detectJsonCorruption(jsonData: EmailSimulationInbox | any): string[] {
  const issues: string[] = [];

  if (!jsonData) {
    issues.push('JSON data is null or undefined');
    return issues;
  }

  // Check for truncated content
  const jsonString = JSON.stringify(jsonData);
  if (jsonString.includes('.</p><p>If you did not ini')) {
    issues.push('Detected truncated HTML content in JSON');
  }

  // Check for malformed HTML in content fields
  if (jsonData.emails && Array.isArray(jsonData.emails)) {
    jsonData.emails.forEach((email: SimulatedEmail, index: number) => {
      if (email.content && typeof email.content === 'string') {
        // Check for unclosed HTML tags
        const openTags = (email.content.match(/<[^\/][^>]*>/g) || []).length;
        const closeTags = (email.content.match(/<\/[^>]*>/g) || []).length;

        if (openTags !== closeTags) {
          issues.push(`Email ${index + 1}: HTML tags mismatch (${openTags} open, ${closeTags} close)`);
        }

        // Check for truncated content
        if (email.content.includes('ation') && email.content.endsWith('ation')) {
          issues.push(`Email ${index + 1}: Content appears truncated`);
        }
      }

      // Check attachment content
      if (email.attachments && Array.isArray(email.attachments)) {
        email.attachments.forEach((attachment: EmailAttachment, attIndex: number) => {
          if (attachment.content && typeof attachment.content === 'string') {
            const openTags = (attachment.content.match(/<[^\/][^>]*>/g) || []).length;
            const closeTags = (attachment.content.match(/<\/[^>]*>/g) || []).length;

            if (openTags !== closeTags) {
              issues.push(`Email ${index + 1}, Attachment ${attIndex + 1}: HTML tags mismatch`);
            }
          }
        });
      }
    });
  }

  return issues;
}

/**
 * Truncate text to maximum length
 * Useful for fields with strict character limits (e.g., email descriptions limited to 300 chars)
 * @param text - The text to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return text;
  if (text.length <= maxLength) return text;

  // Truncate and optionally add ellipsis
  const truncated = text.substring(0, maxLength);
  logger.info('Text truncated', {
    originalLength: text.length,
    maxLength,
    truncatedLength: truncated.length
  });
  return truncated;
}

/**
 * Repairs HTML by auto-closing unclosed tags using parse5
 * @param html - The HTML string to repair
 * @returns Repaired HTML with properly closed tags
 */
export function repairHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // Skip if no HTML tags found
  if (!html.includes('<') || !html.includes('>')) {
    return html;
  }

  try {
    // Parse and serialize to auto-close tags
    const fragment = parse5.parseFragment(html);
    return parse5.serialize(fragment);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Failed to repair HTML, returning original', {
      error: err.message,
      htmlLength: html.length
    });
    return html; // Graceful fallback
  }
}

/**
 * Repairs HTML in all emails and attachments in an inbox object
 * @param inbox - Inbox object containing emails array
 * @returns Repaired inbox object
 */
export function repairInboxHtml(inbox: EmailSimulationInbox | any): EmailSimulationInbox | any {
  if (!inbox || typeof inbox !== 'object') {
    return inbox;
  }

  const repaired = { ...inbox };

  // Repair all emails
  if (repaired.emails && Array.isArray(repaired.emails)) {
    let totalRepairs = 0;

    repaired.emails = repaired.emails.map((email: SimulatedEmail, emailIndex: number) => {
      const repairedEmail = { ...email };

      // Repair email content
      if (repairedEmail.content && typeof repairedEmail.content === 'string') {
        const before = repairedEmail.content;
        repairedEmail.content = repairHtml(before);
        if (before !== repairedEmail.content) {
          totalRepairs++;
          logger.debug('Repaired email content HTML', { emailIndex, emailId: email.id });
        }
      }

      if (repairedEmail.attachments && Array.isArray(repairedEmail.attachments)) {
        repairedEmail.attachments = repairedEmail.attachments.map((attachment: EmailAttachment, attIndex: number) => {
          if (attachment.content && typeof attachment.content === 'string') {
            const before = attachment.content;
            const after = repairHtml(before);
            if (before !== after) {
              totalRepairs++;
              logger.debug('Repaired attachment HTML', {
                emailIndex,
                emailId: email.id,
                attachmentIndex: attIndex,
                attachmentName: attachment.name
              });
            }
            return { ...attachment, content: after };
          }
          return attachment;
        });
      }

      return repairedEmail;
    });

    if (totalRepairs > 0) {
      logger.info('Repaired HTML in inbox', {
        totalEmails: repaired.emails.length,
        totalRepairs
      });
    }
  }

  return repaired;
}

/**
 * Detects corruption in inbox and repairs if needed
 * Returns repaired inbox and indicates if repair was performed
 * @param inbox - Inbox object to check and repair
 * @returns Object with repaired inbox and metadata
 */
export function detectAndRepairInbox(inbox: EmailSimulationInbox | any): {
  inbox: EmailSimulationInbox | any;
  hadCorruption: boolean;
  issuesFound: string[];
  issuesRemaining: string[];
  wasRepaired: boolean;
} {
  // Check for corruption
  const issuesFound = detectJsonCorruption(inbox);

  if (issuesFound.length === 0) {
    return {
      inbox,
      hadCorruption: false,
      issuesFound: [],
      issuesRemaining: [],
      wasRepaired: false
    };
  }

  // Attempt repair
  logger.info('Attempting to repair HTML in inbox', { issuesCount: issuesFound.length });
  const repairedInbox = repairInboxHtml(inbox);

  // Verify repair
  const issuesRemaining = detectJsonCorruption(repairedInbox);
  const wasRepaired = issuesRemaining.length < issuesFound.length;

  if (issuesRemaining.length === 0) {
    logger.info('Successfully repaired all inbox HTML issues');
  } else {
    logger.warn('Some corruption issues remain after repair', {
      issuesFound: issuesFound.length,
      issuesRemaining: issuesRemaining.length
    });
  }

  return {
    inbox: repairedInbox,
    hadCorruption: true,
    issuesFound,
    issuesRemaining,
    wasRepaired
  };
}