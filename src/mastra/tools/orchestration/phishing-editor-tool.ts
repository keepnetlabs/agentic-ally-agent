/**
 * Phishing Editor Tool
 * Allows editing and customizing existing phishing templates via natural language instructions
 * Supports: text updates, tone changes, language translation, element removal, etc.
 */

import { createTool } from '@mastra/core/tools';
import { getModelWithOverride } from '../../model-providers';
import { sanitizeHtml } from '../../utils/content-processors/html-sanitizer';
import { normalizeEmailNestedTablePadding } from '../../utils/content-processors/email-table-padding-normalizer';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ProductService } from '../../services/product-service';
import { fixBrokenImages } from '../../utils/landing-page/image-validator';
import { detectAndResolveBrand } from './phishing-editor-utils';
import { summarizeForLog } from '../../utils/core/log-redaction-utils';
import { phishingEditorSchema } from './phishing-editor-schemas';
import {
  loadPhishingContent,
  ExistingEmail,
  EditedEmail,
  parseAndValidateEmailResponse,
  processLandingPageResults,
  streamEditResultsToUI,
  savePhishingContent,
  StreamWriter,
} from './phishing-editor-helpers';
import { createEmailEditPromise, createLandingEditPromises, GenerateTextResult } from './phishing-editor-llm';

export const phishingEditorTool = createTool({
  id: 'phishing-editor',
  description: 'Edit and customize existing phishing templates using natural language instructions',
  inputSchema: phishingEditorSchema,

  execute: async ({ context, writer }) => {
    const { phishingId, editInstruction, mode, language: inputLanguage, modelProvider, model } = context;
    const logger = getLogger('PhishingEditor');

    try {
      logger.info('Starting phishing template edit', {
        phishingId,
        editInstruction: summarizeForLog(editInstruction),
      });

      // 1. Load whitelabel config + phishing content (parallel)
      const language = (inputLanguage || 'en-gb').toLowerCase();
      const productService = new ProductService();

      const [whitelabelConfig, loadResult] = await Promise.all([
        productService.getWhitelabelingConfig().catch(err => {
          logger.warn('Failed to fetch whitelabeling config', { error: err });
          return null;
        }),
        loadPhishingContent(phishingId, language),
      ]);

      if (!loadResult.success) {
        return {
          success: false,
          error: loadResult.error,
          message: `❌ Template not found. Please provide a valid phishing ID.`,
        };
      }

      const { base, email: existingEmail, landing: existingLanding, emailKey, landingKey } = loadResult.content;
      const hasEmail = !!existingEmail?.template;

      // 2. Prepare LLM (model, brand context, prompts)
      const aiModel = getModelWithOverride(modelProvider, model);

      let brandContext = '';
      if (context.hasBrandUpdate) {
        logger.info('🔍 Brand update requested in edit instruction', {
          phishingId,
          editInstruction: summarizeForLog(editInstruction),
        });
        const brandResult = await detectAndResolveBrand(editInstruction, aiModel, whitelabelConfig);
        brandContext = brandResult.brandContext;
        logger.info('🔍 Brand resolution result', {
          brandName: brandResult.resolvedBrandInfo?.brandName,
          isRecognizedBrand: !!brandResult.resolvedBrandInfo?.isRecognizedBrand,
          hasBrandContext: brandContext.length > 0,
        });
      } else {
        logger.info('🔍 Brand update not requested, skipping brand resolution', {
          phishingId,
        });
      }

      const escapedInstruction = JSON.stringify(editInstruction).slice(1, -1);

      // 3. Execute LLM calls (parallel)
      let emailPromise: Promise<GenerateTextResult> | null = null;
      if (hasEmail && existingEmail) {
        emailPromise = createEmailEditPromise({
          aiModel,
          email: existingEmail,
          escapedInstruction,
          brandContext,
          logger,
        });
      }

      const landingPagePromises = createLandingEditPromises({
        aiModel,
        pages: existingLanding?.pages ?? [],
        mode: mode || 'edit',
        escapedInstruction,
        brandContext,
        logger,
      });

      const allPromises: Array<Promise<GenerateTextResult>> = [
        ...(emailPromise ? [emailPromise] : []),
        ...landingPagePromises,
      ];
      const allResults = await Promise.allSettled(allPromises);

      // 4. Process LLM responses
      const emailResult: PromiseSettledResult<GenerateTextResult> | null = hasEmail ? allResults[0] : null;

      let editedEmail: EditedEmail | null = null;
      let updatedEmail: (ExistingEmail & { lastModified: number }) | null = null;
      let updatedEmailTemplate: string | null = null;

      if (hasEmail) {
        if (!emailResult || emailResult.status !== 'fulfilled') {
          logger.error('Email editing failed', { reason: emailResult ? emailResult.reason : 'missing-result' });
          return {
            success: false,
            error: 'Email editing failed after retries',
            message: '❌ Failed to edit email template. Please try again.',
          };
        }

        logger.info('Email response received, parsing and validating...');
        const emailText = emailResult.value.text;
        const emailParseResult = parseAndValidateEmailResponse(emailText);

        if (!emailParseResult.success) {
          return {
            success: false,
            error: 'Email response validation failed',
            message: `❌ Email validation error: ${emailParseResult.error}`,
          };
        }

        editedEmail = emailParseResult.email;
        const sanitizedTemplate = normalizeEmailNestedTablePadding(sanitizeHtml(editedEmail.template));

        updatedEmail = {
          ...(existingEmail as ExistingEmail),
          subject: editedEmail.subject || (existingEmail as ExistingEmail).subject,
          template: sanitizedTemplate,
          lastModified: Date.now(),
        };

        const finalFixedTemplate = await fixBrokenImages(
          sanitizedTemplate,
          updatedEmail.fromName || 'Security Team',
          whitelabelConfig?.mainLogoUrl
        );
        updatedEmail.template = finalFixedTemplate;
        updatedEmailTemplate = finalFixedTemplate;
      }

      const landingResults = allResults.slice(hasEmail ? 1 : 0);

      const fromNameForLanding = updatedEmail?.fromName ?? existingEmail?.fromName ?? 'Security Team';

      const editedLanding = await processLandingPageResults(
        landingResults,
        existingLanding,
        mode,
        editInstruction,
        fromNameForLanding,
        whitelabelConfig?.mainLogoUrl
      );

      // 5. Save to KV
      await savePhishingContent(emailKey, landingKey, updatedEmail, existingLanding, editedLanding);

      // 6. Stream to UI
      if (writer) {
        const method = base?.method ?? existingLanding?.method;
        const isQuishing = base?.isQuishing ?? false;
        const landingMeta = existingLanding
          ? {
            name: existingLanding.name,
            description: existingLanding.description,
            method: existingLanding.method,
            difficulty: existingLanding.difficulty,
          }
          : null;

        await streamEditResultsToUI(
          writer as StreamWriter,
          phishingId,
          emailKey,
          landingKey,
          language,
          hasEmail ? editedEmail : null,
          updatedEmailTemplate,
          updatedEmail?.fromAddress || existingEmail?.fromAddress,
          updatedEmail?.fromName || existingEmail?.fromName,
          editedLanding,
          landingMeta,
          method,
          isQuishing
        );
      }

      // 7. Return success response
      const updates: string[] = [];
      if (hasEmail) updates.push('Email');
      if (editedLanding?.pages) updates.push('Landing Page');

      return {
        success: true,
        status: 'success',
        data: {
          phishingId,
          subject: hasEmail ? editedEmail?.subject : undefined,
          summary: (hasEmail ? editedEmail?.summary || '' : '') || editedLanding?.summary,
          message: `✅ Updated: ${updates.join(' + ')}\n${hasEmail ? editedEmail?.summary || '' : ''}${editedLanding?.summary ? '\n' + editedLanding.summary : ''}`,
        },
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        phishingId,
        editInstruction,
        step: 'phishing-template-edit',
        stack: err.stack,
      });

      logErrorInfo(logger, 'error', 'Phishing editor error', errorInfo);

      return {
        ...createToolErrorResponse(errorInfo),
        message: '❌ Failed to edit phishing template. Please try again or provide a different instruction.',
      };
    }
  },
});
