import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { uuidv4 } from '../../utils/core/id-utils';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES, API_ENDPOINTS, KV_NAMESPACES } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';
import { summarizeForLog } from '../../utils/core/log-redaction-utils';

interface UploadSmishingWorkerResult {
  success?: boolean;
  templateResourceId?: string;
  templateId?: number;
  landingPageResourceId?: string;
  landingPageId?: number;
  scenarioResourceId?: string;
  scenarioId?: number;
  languageId?: string;
  resourceId?: string;
  message?: string;
}

const uploadSmishingOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    resourceId: z.string(),
    templateResourceId: z.string().optional(),
    templateId: z.number().optional(),
    landingPageResourceId: z.string().nullable().optional(),
    landingPageId: z.number().nullable().optional(),
    scenarioResourceId: z.string().nullable().optional(),
    scenarioId: z.number().nullable().optional(),
    languageId: z.string().optional(),
    smishingId: z.string(),
    title: z.string().optional(),
  }).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const uploadSmishingTool = createTool({
  id: 'upload-smishing',
  description: 'Fetches smishing content by ID, prepares it, and uploads it to the platform via the smishing worker.',
  inputSchema: z.object({
    smishingId: z.string().describe('The ID of the smishing content to upload'),
  }),
  outputSchema: uploadSmishingOutputSchema,
  execute: async ({ context, writer }) => {
    const logger = getLogger('UploadSmishingTool');
    const { smishingId } = context;

    logger.info('Preparing upload for smishing content', { smishingId });

    const { token, companyId, env, baseApiUrl } = getRequestContext();
    const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    try {
      const kvService = new KVService(KV_NAMESPACES.SMISHING);
      const smishingContent = await kvService.getSmishing(smishingId);

      if (!smishingContent || !smishingContent.base) {
        const errorInfo = errorService.notFound(`Smishing content not found for ID: ${smishingId}`, { smishingId });
        logErrorInfo(logger, 'warn', 'Smishing content not found', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const smishingData = smishingContent.base;
      const smsContent = smishingContent.sms;
      const landingContent = smishingContent.landing;

      const name = smishingData.name?.trim();
      const description = smishingData.description?.trim();
      const topic = smishingData.topic?.trim();
      const difficulty = smishingData.difficulty;
      const method = smishingData.method;

      const availableLangs = smishingData.language_availability || [];
      const language = Array.isArray(availableLangs) && availableLangs.length > 0
        ? availableLangs[0]
        : 'en-gb';

      logger.debug('Language extracted for upload', {
        availableLangs,
        selectedLanguage: language,
        smishingId
      });

      const payloadData = {
        name,
        description,
        topic,
        difficulty,
        method,
        language,
        sms: smsContent ? {
          messages: smsContent.messages,
        } : undefined,
        landingPage: landingContent ? { ...landingContent } : undefined,
      };

      const payload = {
        accessToken: token,
        companyId: effectiveCompanyId,
        url: baseApiUrl,
        smishingData: payloadData
      };

      const maskedPayload = maskSensitiveField(payload, 'accessToken');
      logger.debug('Upload payload prepared (redacted)', {
        payload: summarizeForLog(maskedPayload),
        smishingData: summarizeForLog((maskedPayload as any)?.smishingData),
        smsMessages: summarizeForLog((maskedPayload as any)?.smishingData?.sms?.messages),
        landingPage: summarizeForLog((maskedPayload as any)?.smishingData?.landingPage),
      });

      const result = await withRetry<UploadSmishingWorkerResult>(
        () => callWorkerAPI({
          env,
          serviceBinding: env?.SMISHING_CRUD_WORKER,
          publicUrl: API_ENDPOINTS.SMISHING_WORKER_URL,
          endpoint: 'https://worker/submit',
          payload,
          token,
          errorPrefix: 'Worker failed',
          operationName: `Upload smishing content ${smishingId}`
        }) as Promise<UploadSmishingWorkerResult>,
        `Upload smishing content ${smishingId}`
      );

      logger.info('Smishing upload successful', { result });

      const templateResourceId = result.templateResourceId || result.resourceId;
      const scenarioResourceId = result.scenarioResourceId || null;
      const resourceIdForAssignment = scenarioResourceId || templateResourceId;

      const formattedMessage = formatToolSummary({
        prefix: result.message ? `OK ${result.message}` : 'OK Smishing uploaded',
        title: result.message ? undefined : name,
        suffix: 'Ready to assign',
        kv: [
          { key: 'scenarioName', value: name },
          { key: 'resourceId', value: resourceIdForAssignment },
          { key: 'scenarioResourceId', value: scenarioResourceId || undefined },
          { key: 'landingPageResourceId', value: result.landingPageResourceId || undefined },
          { key: 'smishingId', value: smishingId },
        ],
      });

      if (writer) {
        try {
          const messageId = uuidv4();
          const meta = { smishingId, resourceId: resourceIdForAssignment || templateResourceId, title: name };
          const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

          await writer.write({ type: 'text-start', id: messageId });
          await writer.write({
            type: 'text-delta',
            id: messageId,
            delta: `::ui:smishing_uploaded::${encoded}::/ui:smishing_uploaded::\n`
          });
          await writer.write({ type: 'text-end', id: messageId });
          } catch (emitErr) {
            const err = normalizeError(emitErr);
            const errorInfo = errorService.external(err.message, { step: 'emit-ui-signal-smishing-upload', stack: err.stack });
            logErrorInfo(logger, 'warn', 'Failed to emit UI signal for smishing upload', errorInfo);
          }
      }

      const toolResult = {
        success: true,
        data: {
          resourceId: resourceIdForAssignment,
          templateResourceId,
          templateId: result.templateId,
          landingPageResourceId: result.landingPageResourceId || null,
          landingPageId: result.landingPageId || null,
          scenarioResourceId,
          scenarioId: result.scenarioId || null,
          languageId: result.languageId,
          smishingId,
          title: name,
        },
        message: formattedMessage,
      };

      const validation = validateToolResult(toolResult, uploadSmishingOutputSchema, 'upload-smishing');
      if (!validation.success) {
        logErrorInfo(logger, 'error', 'Upload smishing result validation failed', validation.error);
        return createToolErrorResponse(validation.error);
      }

      return validation.data;
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        smishingId,
        stack: err.stack,
      });

      logErrorInfo(logger, 'error', 'Upload tool failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});
