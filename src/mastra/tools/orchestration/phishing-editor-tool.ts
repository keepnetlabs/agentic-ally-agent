/**
 * Phishing Editor Tool
 * Allows editing and customizing existing phishing templates via natural language instructions
 * Supports: text updates, tone changes, language translation, element removal, etc.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { getModelWithOverride } from '../../model-providers';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { sanitizeHtml } from '../../utils/content-processors/html-sanitizer';
import { normalizeEmailNestedTablePadding } from '../../utils/content-processors/email-table-padding-normalizer';
import { KVService } from '../../services/kv-service';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import { ProductService } from '../../services/product-service';
import { fixBrokenImages } from '../../utils/landing-page/image-validator';
import { detectAndResolveBrand } from './phishing-editor-utils';
import { preserveLandingFormControlStyles } from '../../utils/content-processors/landing-form-style-preserver';
import { postProcessPhishingLandingHtml } from '../../utils/content-processors/phishing-html-postprocessors';
import { summarizeForLog } from '../../utils/core/log-redaction-utils';
import { KV_NAMESPACES } from '../../constants';
import {
  phishingEditorSchema,
  emailResponseSchema,
  landingPageResponseSchema,
  LandingPageInput
} from './phishing-editor-schemas';
import {
  getPhishingEditorSystemPrompt,
  getPhishingEmailUserPrompt,
  getLandingPageSystemPrompt,
  getLandingPageUserPrompt
} from './phishing-editor-prompts';



export const phishingEditorTool = createTool({
  id: 'phishing-editor',
  description: 'Edit and customize existing phishing templates using natural language instructions',
  inputSchema: phishingEditorSchema,

  execute: async ({ context, writer }) => {
    const { phishingId, editInstruction, mode, language: inputLanguage, modelProvider, model } = context;
    const logger = getLogger('PhishingEditor');

    // Fetch whitelabeling config for potential logo fallback
    const productService = new ProductService();
    let whitelabelConfig: { mainLogoUrl?: string } | null = null;
    try {
      whitelabelConfig = await productService.getWhitelabelingConfig();
    } catch (err) {
      logger.warn('Failed to fetch whitelabeling config', { error: err });
    }

    try {
      logger.info('Starting phishing template edit', {
        phishingId,
        editInstruction: summarizeForLog(editInstruction),
      });

      // 1. Load existing phishing email from KV
      const kvServicePhishing = new KVService(KV_NAMESPACES.PHISHING);
      const language = inputLanguage || 'en-gb';
      const emailKey = `phishing:${phishingId}:email:${language}`;
      const existingEmail = await kvServicePhishing.get(emailKey);

      if (!existingEmail || !existingEmail.template) {
        logger.error('Phishing email not found', { phishingId, emailKey });
        return {
          success: false,
          error: `Phishing template with ID ${phishingId} not found`,
          message: `❌ Template not found. Please provide a valid phishing ID.`
        };
      }

      logger.info('Loaded existing phishing email', { phishingId, templateLength: existingEmail.template.length });

      // 2. Try to load landing page (optional)
      let existingLanding = null;
      const landingKey = `phishing:${phishingId}:landing:${language}`;
      try {
        existingLanding = await kvServicePhishing.get(landingKey);
        logger.debug('Landing page loaded', { landingKey, hasPagesLength: existingLanding?.pages?.length });
      } catch {
        logger.debug('Landing page not found or error loading', { landingKey });
      }

      // 3. Prepare LLM prompts
      const aiModel = getModelWithOverride(modelProvider, model);

      // ENHANCEMENT: Analyze instruction for brand/logo requests
      // If user asks for "Amazon logo", we resolve the real logo URL and force LLM to use it
      // This prevents hallucinated URLs like "example.com/amazon.png"
      let brandContext = '';

      // Only run expensive brand resolution if Agent flagged this as a brand update
      if (context.hasBrandUpdate) {
        const brandResult = await detectAndResolveBrand(editInstruction, aiModel, whitelabelConfig);
        brandContext = brandResult.brandContext;
      }

      const systemPrompt = getPhishingEditorSystemPrompt();

      // 3. Parallel LLM calls - Email and Landing Page separate

      // 3a. Email edit
      // Escape user input to prevent prompt injection
      const escapedInstruction = JSON.stringify(editInstruction).slice(1, -1);  // Remove outer quotes
      const emailUserPrompt = getPhishingEmailUserPrompt(existingEmail, escapedInstruction, brandContext);

      logger.info('Calling LLM for email editing');
      const emailPromise = withRetry(
        () => withTimeout(
          generateText({
            model: aiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: emailUserPrompt }
            ],
            temperature: 0.3,  // Lower temperature for more consistent JSON output
          }),
          30000  // 30 second timeout
        ),
        'Phishing email editing'
      );

      // 3b. Landing page edit (if exists) - each page separate
      let landingPagePromises: ReturnType<typeof generateText>[] = [];
      if (existingLanding?.pages?.length > 0) {
        landingPagePromises = existingLanding.pages.map((page: LandingPageInput, idx: number) => {
          const landingSystemPrompt = getLandingPageSystemPrompt(mode);
          const landingUserPrompt = getLandingPageUserPrompt(page, escapedInstruction, brandContext);

          logger.info(`Calling LLM for landing page ${idx + 1} editing`);
          return withRetry(
            () => withTimeout(
              generateText({
                model: aiModel,
                messages: [
                  { role: 'system', content: landingSystemPrompt },
                  { role: 'user', content: landingUserPrompt }
                ],
                temperature: 0.3,  // Lower temperature for more consistent JSON output
              }),
              30000  // 30 second timeout
            ),
            `Phishing landing page ${idx + 1} editing`
          );
        });
      }

      // 3c. Parallel execution - email + all landing pages
      const allResults = await Promise.allSettled([
        emailPromise,
        ...landingPagePromises
      ]);

      // Extract email result
      const emailResult = allResults[0];
      if (emailResult.status !== 'fulfilled') {
        logger.error('Email editing failed', { reason: emailResult.reason });
        return {
          success: false,
          error: 'Email editing failed after retries',
          message: '❌ Failed to edit email template. Please try again.'
        };
      }

      const emailResponse = emailResult.value;

      // 3d. Parse and validate email response
      logger.info('Email response received, parsing and validating...');
      let editedEmail: z.infer<typeof emailResponseSchema>;
      try {
        const emailCleanedJson = cleanResponse(emailResponse.text, 'phishing-edit-email');
        const parsed = JSON.parse(emailCleanedJson);
        editedEmail = emailResponseSchema.parse(parsed);  // Validate against schema

        // Log image sources for debugging hallucinated URLs
        const imgSources = (editedEmail.template.match(/src=['"]([^'"]*)['"]/g) || []).map(s => s.replace(/src=['"]|['"]/g, ''));
        logger.info('Email edited template images', { imgCount: imgSources.length, sources: imgSources });

        logger.debug('Email response validated successfully', { subject: editedEmail.subject });
      } catch (parseErr) {
        const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        logger.error('Email response parsing or validation failed', {
          error: errMsg,
          responsePreview: emailResponse.text.substring(0, 200)
        });
        return {
          success: false,
          error: 'Email response validation failed',
          message: `❌ Email validation error: ${errMsg}`
        };
      }

      // 3e. Create updated email object structure FIRST (needed for landing page processing)
      const finalTemplate = editedEmail.template;
      const sanitizedTemplate = normalizeEmailNestedTablePadding(sanitizeHtml(finalTemplate));

      const updatedEmail = {
        ...existingEmail,
        subject: editedEmail.subject || existingEmail.subject,
        template: sanitizedTemplate, // Will update this after fixing images
        lastModified: Date.now()
      };

      // 3f. Fix Broken Images & Enforce Single Logo in Email
      const finalFixedTemplate = await fixBrokenImages(
        sanitizedTemplate,
        updatedEmail.fromName || 'Security Team',
        whitelabelConfig?.mainLogoUrl
      );
      updatedEmail.template = finalFixedTemplate;

      // 3g. Parse and validate landing page responses (now that updatedEmail is ready)
      const editedLandingPages: z.infer<typeof landingPageResponseSchema>[] = [];
      const landingResults = allResults.slice(1);

      if (landingResults.length > 0) {
        logger.info(`Landing page responses received, parsing and validating ${landingResults.length} pages...`);
        const landingPageResults = await Promise.all(landingResults
          .map(async (result, idx) => {
            if (result.status !== 'fulfilled') {
              logger.warn(`Landing page ${idx + 1} editing failed, skipping`, { reason: result.reason });
              return null;
            }
            try {
              const response = result.value;
              const pageCleanedJson = cleanResponse(response.text, `phishing-edit-landing-${idx}`);
              const parsed = JSON.parse(pageCleanedJson);

              const validated = landingPageResponseSchema.parse(parsed);

              let repaired = postProcessPhishingLandingHtml({ html: validated.template, title: 'Secure Portal' });

              // Use updatedEmail context for landing page image fixing
              repaired = await fixBrokenImages(
                repaired,
                updatedEmail.fromName || 'Security Team',
                whitelabelConfig?.mainLogoUrl
              );

              // Translate mode: enforce original form-control styles (LLM localization can rewrite input CSS)
              if (mode === 'translate') {
                const originalTemplate = existingLanding?.pages?.[idx]?.template;
                validated.template = originalTemplate
                  ? preserveLandingFormControlStyles(originalTemplate, repaired)
                  : repaired;
              } else {
                validated.template = repaired;
              }
              logger.debug(`Landing page ${idx + 1} validated successfully`, { type: validated.type });
              return validated;
            } catch (parseErr) {
              const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
              logger.warn(`Landing page ${idx + 1} parsing or validation error, skipping`, { error: errMsg });
              return null;
            }
          }));

        const validLandingPages = landingPageResults
          .filter((page): page is z.infer<typeof landingPageResponseSchema> => page !== null);

        editedLandingPages.push(...validLandingPages);
      }

      // 3h. Combine landing pages
      let editedLanding = null;
      if (editedLandingPages.length > 0) {
        editedLanding = {
          pages: editedLandingPages,
          summary: editedLandingPages.map(p => p.summary).filter(Boolean).join('; ')
        };
      }

      // Rename for compatibility (legacy code usage)
      const editedContent = editedEmail;

      // 4a. Save email
      await kvServicePhishing.put(emailKey, updatedEmail);
      logger.info('Phishing email updated successfully', { phishingId, emailKey });

      // 4b. Save landing page if edited
      if (editedLanding && editedLanding.pages) {
        const updatedLanding = {
          ...existingLanding,
          pages: editedLanding.pages,
          lastModified: Date.now()
        };
        await kvServicePhishing.put(landingKey, updatedLanding);
        logger.info('Phishing landing page updated successfully', { phishingId, landingKey });
      }

      // 5. Stream updated components to UI
      if (writer) {
        try {
          const messageId = uuidv4();
          await writer.write({ type: 'text-start', id: messageId });

          // Stream email
          if (editedContent.template) {
            const emailObject = {
              phishingId,
              subject: editedContent.subject,
              template: sanitizedTemplate,
              fromAddress: updatedEmail.fromAddress,
              fromName: updatedEmail.fromName,
            };
            const emailJson = JSON.stringify(emailObject);
            const encodedEmail = Buffer.from(emailJson).toString('base64');

            await writer.write({
              type: 'text-delta',
              id: messageId,
              delta: `::ui:phishing_email::${encodedEmail}::/ui:phishing_email::\n`
            });
          }

          // Stream landing pages
          if (editedLanding && editedLanding.pages && editedLanding.pages.length > 0) {
            const landingObject = { phishingId, pages: editedLanding.pages };
            const landingJson = JSON.stringify(landingObject);
            const encodedLanding = Buffer.from(landingJson).toString('base64');

            await writer.write({
              type: 'text-delta',
              id: messageId,
              delta: `::ui:landing_page::${encodedLanding}::/ui:landing_page::\n`
            });
          }

          await writer.write({ type: 'text-end', id: messageId });
        } catch (err) {
          logger.warn('Failed to stream updated components to UI', { error: err instanceof Error ? err.message : String(err) });
        }
      }

      // 6. Return success response
      const updates = ['Email'];
      if (editedLanding?.pages) updates.push('Landing Page');

      return {
        success: true,
        status: 'success',
        data: {
          phishingId,
          subject: editedContent.subject,
          summary: editedContent.summary || editedLanding?.summary,
          message: `✅ Updated: ${updates.join(' + ')}\n${editedContent.summary || ''}${editedLanding?.summary ? '\n' + editedLanding.summary : ''}`
        }
      };

    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        phishingId,
        editInstruction,
        step: 'phishing-template-edit',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Phishing editor error', errorInfo);

      return {
        ...createToolErrorResponse(errorInfo),
        message: '❌ Failed to edit phishing template. Please try again or provide a different instruction.'
      };
    }
  }
});
