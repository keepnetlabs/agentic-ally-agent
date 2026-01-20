/**
 * Phishing Editor Helper Functions
 * Extracted from phishing-editor-tool.ts for better maintainability
 */

import { z } from 'zod';
import { uuidv4 } from '../../utils/core/id-utils';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { KVService } from '../../services/kv-service';
import { getLogger } from '../../utils/core/logger';
import { fixBrokenImages } from '../../utils/landing-page/image-validator';
import {
  preserveLandingFormControlStyles,
  preserveMissingLandingFormControlStyles,
  repairBrokenLandingFormControlAttrs,
} from '../../utils/content-processors/landing-form-style-preserver';
import { postProcessPhishingLandingHtml } from '../../utils/content-processors/phishing-html-postprocessors';
import { KV_NAMESPACES } from '../../constants';
import { emailResponseSchema, landingPageResponseSchema, LandingPageInput } from './phishing-editor-schemas';

// ============================================================================
// Types
// ============================================================================

export interface ExistingEmail {
  subject: string;
  template: string;
  fromAddress?: string;
  fromName?: string;
}

export interface ExistingLanding {
  name?: string;
  description?: string;
  method?: string;
  difficulty?: string;
  pages: LandingPageInput[];
  lastModified?: number;
}

export interface ExistingPhishingBase {
  method?: string;
  isQuishing?: boolean;
}

export interface PhishingContent {
  base: ExistingPhishingBase | null;
  email: ExistingEmail | null;
  landing: ExistingLanding | null;
  emailKey: string;
  landingKey: string;
}

export interface EditedEmail {
  subject: string;
  template: string;
  summary: string;
}

export interface EditedLanding {
  pages: z.infer<typeof landingPageResponseSchema>[];
  summary: string;
}

export interface StreamWriter {
  write: (data: Record<string, unknown>) => Promise<void>;
}

// ============================================================================
// Helper Functions
// ============================================================================

const logger = getLogger('PhishingEditorHelpers');

/**
 * Load phishing content (email + landing page) from KV
 */
export async function loadPhishingContent(
  phishingId: string,
  language: string
): Promise<{ success: true; content: PhishingContent } | { success: false; error: string }> {
  const kvService = new KVService(KV_NAMESPACES.PHISHING);
  const normalizedLanguage = language.toLowerCase();
  const baseKey = `phishing:${phishingId}:base`;
  const emailKey = `phishing:${phishingId}:email:${normalizedLanguage}`;
  const landingKey = `phishing:${phishingId}:landing:${normalizedLanguage}`;

  // Load email + landing page (either may exist)
  const [baseResult, emailResult, landingResult] = await Promise.allSettled([
    kvService.get(baseKey),
    kvService.get(emailKey),
    kvService.get(landingKey),
  ]);

  const rawBase = baseResult.status === 'fulfilled' ? baseResult.value : null;
  const rawEmail = emailResult.status === 'fulfilled' ? emailResult.value : null;
  const rawLanding = landingResult.status === 'fulfilled' ? landingResult.value : null;

  const hasEmail = !!rawEmail?.template;
  const hasLanding = !!rawLanding?.pages?.length;

  if (!hasEmail && !hasLanding) {
    logger.error('Phishing email and landing page not found', { phishingId, emailKey, landingKey });
    return {
      success: false,
      error: `Phishing template with ID ${phishingId} not found`,
    };
  }

  if (!hasEmail) {
    // Landing-only templates are valid; editor should still work.
    logger.warn('Phishing email not found (landing-only template)', { phishingId, emailKey });
  } else {
    logger.info('Loaded existing phishing email', {
      phishingId,
      templateLength: rawEmail.template.length,
    });
  }

  const existingLanding: ExistingLanding | null = hasLanding ? (rawLanding as ExistingLanding) : null;
  if (existingLanding) {
    logger.debug('Landing page loaded', {
      landingKey,
      pagesCount: existingLanding.pages.length,
    });
  }

  return {
    success: true,
    content: {
      base: rawBase as ExistingPhishingBase | null,
      email: hasEmail ? (rawEmail as ExistingEmail) : null,
      landing: existingLanding,
      emailKey,
      landingKey,
    },
  };
}

/**
 * Parse and validate LLM email response
 */
export function parseAndValidateEmailResponse(
  responseText: string
): { success: true; email: EditedEmail } | { success: false; error: string } {
  try {
    const cleanedJson = cleanResponse(responseText, 'phishing-edit-email');
    const parsed = JSON.parse(cleanedJson);
    const validated = emailResponseSchema.parse(parsed);

    // Log image sources for debugging
    const imgSources = (validated.template.match(/src=['"]([^'"]*)['"]/g) || []).map(s =>
      s.replace(/src=['"]|['"]/g, '')
    );
    logger.info('Email edited template images', {
      imgCount: imgSources.length,
      sources: imgSources,
    });

    logger.debug('Email response validated successfully', { subject: validated.subject });

    return { success: true, email: validated };
  } catch (parseErr) {
    const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    logger.error('Email response parsing or validation failed', {
      error: errMsg,
      responsePreview: responseText.substring(0, 200),
    });
    return { success: false, error: errMsg };
  }
}

/**
 * Process landing page LLM results
 */
export async function processLandingPageResults<T extends { text: string }>(
  landingResults: PromiseSettledResult<T>[],
  existingLanding: ExistingLanding | null,
  mode: string,
  editInstruction: string,
  fromName: string,
  whitelabelLogoUrl?: string
): Promise<EditedLanding | null> {
  if (landingResults.length === 0) {
    return null;
  }

  logger.info(`Processing ${landingResults.length} landing page results...`);

  const shouldPreserveFormStyles = (() => {
    if (mode === 'translate') return true;

    // In edit mode, preserve by default UNLESS user asks to change form control styling.
    // (Still repaired via repairBrokenLandingFormControlAttrs.)
    const t = (editInstruction || '').toLowerCase();
    return !(
      t.includes('input') ||
      t.includes('button') ||
      t.includes('form') ||
      t.includes('field') ||
      t.includes('textbox') ||
      t.includes('css') ||
      t.includes('style') ||
      t.includes('color') ||
      t.includes('renk') ||
      t.includes('buton') ||
      t.includes('formu') ||
      t.includes('inputu') ||
      t.includes('butonu')
    );
  })();

  const processedPages = await Promise.all(
    landingResults.map(async (result, idx) => {
      if (result.status !== 'fulfilled') {
        logger.warn(`Landing page ${idx + 1} editing failed, skipping`, {
          reason: result.reason,
        });
        return null;
      }

      try {
        const response = result.value;
        const cleanedJson = cleanResponse(response.text, `phishing-edit-landing-${idx}`);
        const parsed = JSON.parse(cleanedJson);
        const validated = landingPageResponseSchema.parse(parsed);

        // Post-process HTML
        let repaired = postProcessPhishingLandingHtml({
          html: validated.template,
          title: 'Secure Portal',
        });

        // Fix broken images
        repaired = await fixBrokenImages(repaired, fromName, whitelabelLogoUrl);

        // Repair broken attrs like: required=" style="... (keeps HTML valid even without style preservation)
        repaired = repairBrokenLandingFormControlAttrs(repaired);

        // Preserve original form-control styles when appropriate.
        const originalTemplate = existingLanding?.pages?.[idx]?.template;
        validated.template =
          originalTemplate && shouldPreserveFormStyles
            ? preserveLandingFormControlStyles(originalTemplate, repaired)
            : originalTemplate
              ? preserveMissingLandingFormControlStyles(originalTemplate, repaired)
              : repaired;

        logger.debug(`Landing page ${idx + 1} validated successfully`, {
          type: validated.type,
        });
        return validated;
      } catch (parseErr) {
        const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        logger.warn(`Landing page ${idx + 1} parsing or validation error, skipping`, {
          error: errMsg,
        });
        return null;
      }
    })
  );

  const validPages = processedPages.filter((page): page is z.infer<typeof landingPageResponseSchema> => page !== null);

  if (validPages.length === 0) {
    return null;
  }

  return {
    pages: validPages,
    summary: validPages
      .map(p => p.summary)
      .filter(Boolean)
      .join('; '),
  };
}

/**
 * Stream edit results to UI
 */
export async function streamEditResultsToUI(
  writer: StreamWriter,
  phishingId: string,
  editedEmail: EditedEmail | null,
  updatedEmailTemplate: string | null,
  fromAddress: string | undefined,
  fromName: string | undefined,
  editedLanding: EditedLanding | null,
  landingMeta: Pick<ExistingLanding, 'name' | 'description' | 'method' | 'difficulty'> | null,
  method: string | undefined,
  isQuishing: boolean
): Promise<void> {
  try {
    const messageId = uuidv4();
    await writer.write({ type: 'text-start', id: messageId });

    // Stream email
    if (editedEmail?.template && updatedEmailTemplate) {
      const emailObject = {
        phishingId,
        subject: editedEmail.subject,
        template: updatedEmailTemplate,
        fromAddress,
        fromName,
        method,
        isQuishing,
      };
      const emailJson = JSON.stringify(emailObject);
      const encodedEmail = Buffer.from(emailJson).toString('base64');

      await writer.write({
        type: 'text-delta',
        id: messageId,
        delta: `::ui:phishing_email::${encodedEmail}::/ui:phishing_email::\n`,
      });
    }

    // Stream landing pages
    if (editedLanding && editedLanding.pages.length > 0) {
      const landingObject = {
        phishingId,
        ...(landingMeta || {}),
        pages: editedLanding.pages,
        isQuishing,
      };
      const landingJson = JSON.stringify(landingObject);
      const encodedLanding = Buffer.from(landingJson).toString('base64');

      await writer.write({
        type: 'text-delta',
        id: messageId,
        delta: `::ui:landing_page::${encodedLanding}::/ui:landing_page::\n`,
      });
    }

    await writer.write({ type: 'text-end', id: messageId });
  } catch (err) {
    logger.warn('Failed to stream updated components to UI', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Save phishing content to KV
 */
export async function savePhishingContent(
  emailKey: string,
  landingKey: string,
  updatedEmail: (ExistingEmail & { lastModified: number }) | null,
  existingLanding: ExistingLanding | null,
  editedLanding: EditedLanding | null
): Promise<void> {
  const kvService = new KVService(KV_NAMESPACES.PHISHING);

  // Save email
  if (updatedEmail) {
    await kvService.put(emailKey, updatedEmail);
    logger.info('Phishing email updated successfully', { emailKey });
  }

  // Save landing page if edited
  if (editedLanding && editedLanding.pages.length > 0) {
    const updatedLanding = {
      ...existingLanding,
      pages: editedLanding.pages,
      lastModified: Date.now(),
    };
    await kvService.put(landingKey, updatedLanding);
    logger.info('Phishing landing page updated successfully', { landingKey });
  }
}
