/**
 * Smishing Editor Tool
 * Allows editing and customizing existing smishing templates via natural language instructions
 * Supports: text updates, tone changes, language translation, landing page edits
 */

import { createTool } from '@mastra/core/tools';
import { getModelWithOverride } from '../../model-providers';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ProductService } from '../../services/product-service';
import { summarizeForLog } from '../../utils/core/log-redaction-utils';
import { smishingEditorSchema } from './smishing-editor-schemas';
import {
  loadSmishingContent,
  parseAndValidateSmsResponse,
  processLandingPageResults,
  streamEditResultsToUI,
  saveSmishingContent,
  StreamWriter,
} from './smishing-editor-helpers';
import { createSmsEditPromise, createLandingEditPromises, GenerateTextResult } from './smishing-editor-llm';
import { detectAndResolveBrand } from './phishing-editor-utils';

function shouldEditSmsOnly(instruction: string): boolean {
  const t = instruction.toLowerCase();
  return (
    t.includes('sms only') ||
    t.includes('text only') ||
    t.includes('message only') ||
    t.includes('only sms') ||
    t.includes('only text') ||
    t.includes('only message')
  );
}

function shouldEditLandingOnly(instruction: string): boolean {
  const t = instruction.toLowerCase();
  return (
    t.includes('landing page only') ||
    t.includes('only landing') ||
    t.includes('only landing page') ||
    t.includes('landing only')
  );
}

export const smishingEditorTool = createTool({
  id: 'smishing-editor',
  description: 'Edit and customize existing smishing templates using natural language instructions',
  inputSchema: smishingEditorSchema,

  execute: async ({ context, writer }) => {
    const { smishingId, editInstruction, mode, language: inputLanguage, modelProvider, model } = context;
    const logger = getLogger('SmishingEditor');

    try {
      logger.info('Starting smishing template edit', {
        smishingId,
        editInstruction: summarizeForLog(editInstruction),
      });

      const language = (inputLanguage || 'en-gb').toLowerCase();
      const productService = new ProductService();

      const [whitelabelConfig, loadResult] = await Promise.all([
        productService.getWhitelabelingConfig().catch(err => {
          const normalized = normalizeError(err);
          const errorInfo = errorService.external(normalized.message, { step: 'fetch-whitelabel-config', stack: normalized.stack });
          logErrorInfo(logger, 'warn', 'Failed to fetch whitelabeling config', errorInfo);
          return null;
        }),
        loadSmishingContent(smishingId, language),
      ]);

      if (!loadResult.success) {
        const errorInfo = errorService.notFound(loadResult.error, {
          resourceType: 'smishing-template',
          resourceId: smishingId,
          language,
        });
        logErrorInfo(logger, 'warn', 'Smishing template not found', errorInfo);
        return {
          ...createToolErrorResponse(errorInfo),
          message: 'ERROR Template not found. Please provide a valid smishing ID.',
        };
      }

      const { sms: existingSms, landing: existingLanding, smsKey, landingKey } = loadResult.content;
      const hasSms = !!existingSms?.messages?.length;
      const hasLanding = !!existingLanding?.pages?.length;

      const smsOnly = shouldEditSmsOnly(editInstruction);
      const landingOnly = shouldEditLandingOnly(editInstruction);

      const shouldEditSms = hasSms && !landingOnly;
      const shouldEditLanding = hasLanding && !smsOnly;

      const aiModel = getModelWithOverride(modelProvider, model);

      let brandContext = '';
      if (context.hasBrandUpdate) {
        logger.info('Brand update requested in edit instruction', {
          smishingId,
          editInstruction: summarizeForLog(editInstruction),
        });
        const brandResult = await detectAndResolveBrand(editInstruction, aiModel, whitelabelConfig);
        brandContext = brandResult.brandContext;
        logger.info('Brand resolution result', {
          brandName: brandResult.resolvedBrandInfo?.brandName,
          isRecognizedBrand: !!brandResult.resolvedBrandInfo?.isRecognizedBrand,
          hasBrandContext: brandContext.length > 0,
        });
      }

      const escapedInstruction = JSON.stringify(editInstruction).slice(1, -1);

      let smsPromise: Promise<GenerateTextResult> | null = null;
      if (shouldEditSms && existingSms) {
        smsPromise = createSmsEditPromise({
          aiModel,
          sms: existingSms,
          escapedInstruction,
          mode: mode || 'edit',
          logger,
        });
      }

      const landingPagePromises = shouldEditLanding
        ? createLandingEditPromises({
          aiModel,
          pages: existingLanding?.pages ?? [],
          mode: mode || 'edit',
          escapedInstruction,
          brandContext,
          logger,
        })
        : [];

      const allPromises: Array<Promise<GenerateTextResult>> = [
        ...(smsPromise ? [smsPromise] : []),
        ...landingPagePromises,
      ];

      const allResults = await Promise.allSettled(allPromises);

      const smsResult: PromiseSettledResult<GenerateTextResult> | null = smsPromise ? allResults[0] : null;

      let editedSms = null;
      let updatedSms: (typeof existingSms & { lastModified: number }) | null = null;

      if (smsPromise && smsResult) {
        if (smsResult.status !== 'fulfilled') {
          logger.error('SMS editing failed', { reason: smsResult.reason });
          const errorInfo = errorService.external('SMS editing failed after retries', {
            smishingId,
            step: 'sms-edit',
          });
          logErrorInfo(logger, 'error', 'SMS editing failed after retries', errorInfo);
          return {
            ...createToolErrorResponse(errorInfo),
            message: 'ERROR Failed to edit SMS template. Please try again.',
          };
        }

        logger.info('SMS response received, parsing and validating...');
        const smsText = smsResult.value.text;
        const smsParseResult = parseAndValidateSmsResponse(smsText);

        if (!smsParseResult.success) {
          const errorInfo = errorService.validation('SMS response validation failed', {
            smishingId,
            reason: smsParseResult.error,
          });
          logErrorInfo(logger, 'warn', 'SMS response validation failed', errorInfo);
          return {
            ...createToolErrorResponse(errorInfo),
            message: `ERROR SMS validation error: ${smsParseResult.error}`,
          };
        }

        editedSms = smsParseResult.sms;
        updatedSms = {
          ...(existingSms || { messages: [] }),
          messages: editedSms.messages || existingSms?.messages || [],
          lastModified: Date.now(),
        };
      }

      const landingResults = allResults.slice(smsPromise ? 1 : 0);
      const fromNameForLanding = whitelabelConfig?.brandName || 'Security Team';

      const editedLanding = shouldEditLanding
        ? await processLandingPageResults(
          landingResults,
          existingLanding || null,
          mode || 'edit',
          editInstruction,
          fromNameForLanding,
          whitelabelConfig?.mainLogoUrl
        )
        : null;

      await saveSmishingContent(smsKey, landingKey, updatedSms, existingLanding || null, editedLanding);

      if (writer) {
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
          smishingId,
          smsKey,
          landingKey,
          language,
          editedSms,
          editedLanding,
          landingMeta
        );
      }

      const updates: string[] = [];
      if (editedSms) updates.push('SMS');
      if (editedLanding?.pages) updates.push('Landing Page');

      return {
        success: true,
        status: 'success',
        data: {
          smishingId,
          summary: editedSms?.summary || editedLanding?.summary,
          message: `OK Updated: ${updates.join(' + ')}\n${editedSms?.summary || ''}${editedLanding?.summary ? '\n' + editedLanding.summary : ''}`,
        },
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        smishingId,
        editInstruction,
        step: 'smishing-template-edit',
        stack: err.stack,
      });

      logErrorInfo(logger, 'error', 'Smishing editor error', errorInfo);

      return {
        ...createToolErrorResponse(errorInfo),
        message: 'ERROR Failed to edit smishing template. Please try again or provide a different instruction.',
      };
    }
  },
});
