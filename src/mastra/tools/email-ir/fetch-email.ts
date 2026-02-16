import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { createLogContext, loggerFetch, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { withRetry } from '../../utils/core/resilience-utils';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';

export const fetchEmailInputSchema = z.object({
  id: z.string().trim().min(1).max(128),
  accessToken: z.string().trim().min(1).max(4096),
  apiBaseUrl: z.string().trim().url().max(2048).optional().default('https://test-api.devkeepnet.com'),
});

export const fetchEmailTool = createTool({
  id: 'email-ir-fetch-email-tool',
  description: 'Fetches email data from the Keepnet API using an ID',
  inputSchema: fetchEmailInputSchema,
  outputSchema: EmailIREmailDataSchema,
  execute: async ({ context }) => {
    const { id, accessToken, apiBaseUrl } = context;
    const ctx = createLogContext(id, 'fetch-email');

    return await withRetry(async () => {
      try {
        logStepStart(loggerFetch, ctx, { api_endpoint: apiBaseUrl });

        const url = `${apiBaseUrl}/notified-emails/${id}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to fetch email [${response.status}]: ${errorBody}`);
        }

        const data = await response.json();

        // The API returns { data: { ...emailFields } } structure
        // We need to extract the 'data' property
        const emailData = data.data || data;

        logStepComplete(loggerFetch, ctx, {
          status: 'success',
          data_size: JSON.stringify(emailData).length,
        });

        return emailData;
      } catch (error) {
        const err = normalizeError(error);
        logStepError(loggerFetch, ctx, err);
        const errorInfo = errorService.external(err.message, { step: 'fetch-email', stack: err.stack });
        logErrorInfo(loggerFetch, 'error', 'Fetch email failed', errorInfo);
        const e = new Error(err.message);
        (e as Error & { code?: string }).code = errorInfo.code;
        throw e;
      }
    }, 'fetch-email-api');
  },
});
