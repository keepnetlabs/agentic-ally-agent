/**
 * JSON structure validation and correction utilities for translation workflows
 */

/**
 * Validates that translated JSON maintains the same structure as the original
 * @param original - The original JSON object
 * @param translated - The translated JSON object
 * @returns boolean indicating if structure is valid
 */
export function validateInboxStructure(original: any, translated: any): boolean {
  if (!original || !translated) {
    console.warn('❌ Missing original or translated data for validation');
    return false;
  }

  // Check if both have the same top-level structure
  const originalKeys = Object.keys(original).sort();
  const translatedKeys = Object.keys(translated).sort();

  if (originalKeys.join(',') !== translatedKeys.join(',')) {
    console.warn(`❌ Key mismatch - Original: [${originalKeys.join(', ')}], Translated: [${translatedKeys.join(', ')}]`);
    return false;
  }

  // Check if 'emails' array exists and has correct structure
  if (original.emails && Array.isArray(original.emails)) {
    if (!translated.emails || !Array.isArray(translated.emails)) {
      console.warn('❌ Missing or invalid emails array in translation');
      return false;
    }

    if (original.emails.length !== translated.emails.length) {
      console.warn(`❌ Email count mismatch - Original: ${original.emails.length}, Translated: ${translated.emails.length}`);
      return false;
    }

    // Check each email structure
    for (let i = 0; i < original.emails.length; i++) {
      const origEmail = original.emails[i];
      const transEmail = translated.emails[i];

      if (!origEmail || !transEmail) {
        console.warn(`❌ Missing email at index ${i}`);
        continue;
      }

      const origEmailKeys = Object.keys(origEmail).sort();
      const transEmailKeys = Object.keys(transEmail).sort();

      if (origEmailKeys.join(',') !== transEmailKeys.join(',')) {
        console.warn(`❌ Email ${i} key mismatch - Original: [${origEmailKeys.join(', ')}], Translated: [${transEmailKeys.join(', ')}]`);
        return false;
      }

      // Check nested objects like attachments
      if (origEmail.attachments && Array.isArray(origEmail.attachments)) {
        if (!transEmail.attachments || !Array.isArray(transEmail.attachments)) {
          console.warn(`❌ Email ${i} missing or invalid attachments array`);
          return false;
        }

        if (origEmail.attachments.length !== transEmail.attachments.length) {
          console.warn(`❌ Email ${i} attachment count mismatch - Original: ${origEmail.attachments.length}, Translated: ${transEmail.attachments.length}`);
          return false;
        }
      }
    }
  }

  // Check texts object structure
  if (original.texts && typeof original.texts === 'object') {
    if (!translated.texts || typeof translated.texts !== 'object') {
      console.warn('❌ Missing or invalid texts object in translation');
      return false;
    }

    // Check nested modal structures
    if (original.texts.phishingReportModal) {
      if (!translated.texts.phishingReportModal) {
        console.warn('❌ Missing phishingReportModal in translated texts');
        return false;
      }

      const origModalKeys = Object.keys(original.texts.phishingReportModal).sort();
      const transModalKeys = Object.keys(translated.texts.phishingReportModal).sort();

      if (origModalKeys.join(',') !== transModalKeys.join(',')) {
        console.warn(`❌ phishingReportModal key mismatch - Original: [${origModalKeys.join(', ')}], Translated: [${transModalKeys.join(', ')}]`);
        return false;
      }
    }

    if (original.texts.phishingResultModal) {
      if (!translated.texts.phishingResultModal) {
        console.warn('❌ Missing phishingResultModal in translated texts');
        return false;
      }

      const origResultModalKeys = Object.keys(original.texts.phishingResultModal).sort();
      const transResultModalKeys = Object.keys(translated.texts.phishingResultModal).sort();

      if (origResultModalKeys.join(',') !== transResultModalKeys.join(',')) {
        console.warn(`❌ phishingResultModal key mismatch - Original: [${origResultModalKeys.join(', ')}], Translated: [${transResultModalKeys.join(', ')}]`);
        return false;
      }
    }
  }

  console.log('✅ Inbox structure validation passed');
  return true;
}

/**
 * Attempts to correct the structure of a translated JSON by comparing with the original
 * @param original - The original JSON object
 * @param translated - The translated JSON object that may have structural issues
 * @returns Corrected JSON object
 */
export function correctInboxStructure(original: any, translated: any): any {
  if (!original || !translated) {
    console.warn('❌ Cannot correct structure - missing original or translated data');
    return original;
  }

  console.log('🔧 Attempting to correct inbox structure...');

  const corrected = { ...translated };

  // Ensure all original keys exist
  Object.keys(original).forEach(key => {
    if (!(key in corrected)) {
      console.log(`🔧 Adding missing key: ${key}`);
      corrected[key] = original[key];
    }
  });

  // Remove any extra keys that weren't in original
  Object.keys(corrected).forEach(key => {
    if (!(key in original)) {
      console.log(`🔧 Removing extra key: ${key}`);
      delete corrected[key];
    }
  });

  // Fix emails array if needed
  if (original.emails && Array.isArray(original.emails)) {
    if (!corrected.emails || !Array.isArray(corrected.emails)) {
      console.log('🔧 Restoring emails array from original');
      corrected.emails = original.emails;
    } else if (corrected.emails.length !== original.emails.length) {
      console.log('🔧 Correcting emails array length');

      // Try to match emails by id or index
      const correctedEmails = [];
      for (let i = 0; i < original.emails.length; i++) {
        const origEmail = original.emails[i];
        let transEmail = corrected.emails.find((e: any) => e.id === origEmail.id) || corrected.emails[i];

        if (!transEmail) {
          console.log(`🔧 Using original email ${i} as translation failed`);
          transEmail = origEmail;
        } else {
          // Ensure email has all required keys
          Object.keys(origEmail).forEach(emailKey => {
            if (!(emailKey in transEmail)) {
              console.log(`🔧 Adding missing email key: ${emailKey}`);
              transEmail[emailKey] = origEmail[emailKey];
            }
          });

          // Remove extra keys from email
          Object.keys(transEmail).forEach(emailKey => {
            if (!(emailKey in origEmail)) {
              console.log(`🔧 Removing extra email key: ${emailKey}`);
              delete transEmail[emailKey];
            }
          });

          // Fix attachments array if needed
          if (origEmail.attachments && Array.isArray(origEmail.attachments)) {
            if (!transEmail.attachments || !Array.isArray(transEmail.attachments)) {
              console.log(`🔧 Restoring attachments array for email ${i}`);
              transEmail.attachments = origEmail.attachments;
            } else if (transEmail.attachments.length !== origEmail.attachments.length) {
              console.log(`🔧 Correcting attachments length for email ${i}`);
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
      console.log('🔧 Restoring texts object from original');
      corrected.texts = original.texts;
    } else {
      // Ensure all text keys exist
      Object.keys(original.texts).forEach(textKey => {
        if (!(textKey in corrected.texts)) {
          console.log(`🔧 Adding missing text key: ${textKey}`);
          corrected.texts[textKey] = original.texts[textKey];
        }
      });

      // Fix modal structures
      if (original.texts.phishingReportModal && corrected.texts.phishingReportModal) {
        Object.keys(original.texts.phishingReportModal).forEach(modalKey => {
          if (!(modalKey in corrected.texts.phishingReportModal)) {
            console.log(`🔧 Adding missing phishingReportModal key: ${modalKey}`);
            corrected.texts.phishingReportModal[modalKey] = original.texts.phishingReportModal[modalKey];
          }
        });
      }

      if (original.texts.phishingResultModal && corrected.texts.phishingResultModal) {
        Object.keys(original.texts.phishingResultModal).forEach(modalKey => {
          if (!(modalKey in corrected.texts.phishingResultModal)) {
            console.log(`🔧 Adding missing phishingResultModal key: ${modalKey}`);
            corrected.texts.phishingResultModal[modalKey] = original.texts.phishingResultModal[modalKey];
          }
        });
      }
    }
  }

  console.log('✅ Inbox structure correction completed');
  return corrected;
}

/**
 * Detects common JSON corruption issues in translated content
 * @param jsonData - The JSON object to check
 * @returns Array of detected issues
 */
export function detectJsonCorruption(jsonData: any): string[] {
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
    jsonData.emails.forEach((email: any, index: number) => {
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
        email.attachments.forEach((attachment: any, attIndex: number) => {
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