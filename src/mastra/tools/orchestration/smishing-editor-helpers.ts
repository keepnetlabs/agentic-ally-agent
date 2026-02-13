import { z } from 'zod';
import { uuidv4 } from '../../utils/core/id-utils';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { KVService } from '../../services/kv-service';
import { getLogger } from '../../utils/core/logger';
import { KV_NAMESPACES } from '../../constants';
import { smsResponseSchema, landingPageResponseSchema } from './smishing-editor-schemas';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';
import { processLandingPageResults } from './phishing-editor-helpers';

export interface ExistingSms {
  messages: string[];
  lastModified?: number;
}

export interface ExistingLanding {
  name?: string;
  description?: string;
  method?: string;
  difficulty?: string;
  pages: Array<{ type: 'login' | 'success' | 'info'; template: string }>;
  lastModified?: number;
}

export interface SmishingContent {
  sms: ExistingSms | null;
  landing: ExistingLanding | null;
  smsKey: string;
  landingKey: string;
}

export interface EditedSms {
  messages: string[];
  summary: string;
}

export interface EditedLanding {
  pages: z.infer<typeof landingPageResponseSchema>[];
  summary: string;
}

export interface StreamWriter {
  write: (data: Record<string, unknown>) => Promise<void>;
}

const logger = getLogger('SmishingEditorHelpers');

export async function loadSmishingContent(
  smishingId: string,
  language: string
): Promise<{ success: true; content: SmishingContent } | { success: false; error: string }> {
  const kvService = new KVService(KV_NAMESPACES.SMISHING);
  const normalizedLanguage = language.toLowerCase();
  const smsKey = `smishing:${smishingId}:sms:${normalizedLanguage}`;
  const landingKey = `smishing:${smishingId}:landing:${normalizedLanguage}`;

  const [smsResult, landingResult] = await Promise.allSettled([kvService.get(smsKey), kvService.get(landingKey)]);

  const rawSms = smsResult.status === 'fulfilled' ? smsResult.value : null;
  const rawLanding = landingResult.status === 'fulfilled' ? landingResult.value : null;

  const hasSms = Array.isArray(rawSms?.messages) && rawSms.messages.length > 0;
  const hasLanding = !!rawLanding?.pages?.length;

  if (!hasSms && !hasLanding) {
    logger.error('Smishing SMS and landing page not found', { smishingId, smsKey, landingKey });
    return {
      success: false,
      error: `Smishing template with ID ${smishingId} not found`,
    };
  }

  if (!hasSms) {
    logger.warn('Smishing SMS not found (landing-only template)', { smishingId, smsKey });
  } else {
    logger.info('Loaded existing smishing SMS', {
      smishingId,
      messageCount: rawSms.messages.length,
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
      sms: hasSms ? (rawSms as ExistingSms) : null,
      landing: existingLanding,
      smsKey,
      landingKey,
    },
  };
}

export function parseAndValidateSmsResponse(
  responseText: string
): { success: true; sms: EditedSms } | { success: false; error: string } {
  try {
    const cleanedJson = cleanResponse(responseText, 'smishing-edit-sms');
    const parsed = JSON.parse(cleanedJson);
    const validated = smsResponseSchema.parse(parsed);

    logger.debug('SMS response validated successfully', { messageCount: validated.messages.length });
    return { success: true, sms: validated };
  } catch (parseErr) {
    const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    logger.error('SMS response parsing or validation failed', {
      error: errMsg,
      responsePreview: responseText.substring(0, 200),
    });
    return { success: false, error: errMsg };
  }
}

export async function streamEditResultsToUI(
  writer: StreamWriter,
  smishingId: string,
  smsKey: string | null,
  landingKey: string | null,
  language: string,
  editedSms: EditedSms | null,
  editedLanding: EditedLanding | null,
  landingMeta: Pick<ExistingLanding, 'name' | 'description' | 'method' | 'difficulty'> | null
): Promise<void> {
  try {
    const messageId = uuidv4();
    await writer.write({ type: 'text-start', id: messageId });

    if (editedSms) {
      const smsObject = {
        smishingId,
        smsKey,
        language,
        messages: editedSms.messages,
      };
      const smsJson = JSON.stringify(smsObject);
      const encodedSms = Buffer.from(smsJson).toString('base64');

      await writer.write({
        type: 'text-delta',
        id: messageId,
        delta: `::ui:smishing_sms::${encodedSms}::/ui:smishing_sms::\n`,
      });
    }

    if (editedLanding && editedLanding.pages.length > 0) {
      const landingObject = {
        smishingId,
        landingKey,
        language,
        ...(landingMeta || {}),
        pages: editedLanding.pages,
      };
      const landingJson = JSON.stringify(landingObject);
      const encodedLanding = Buffer.from(landingJson).toString('base64');

      await writer.write({
        type: 'text-delta',
        id: messageId,
        delta: `::ui:smishing_landing_page::${encodedLanding}::/ui:smishing_landing_page::\n`,
      });
    }

    await writer.write({ type: 'text-end', id: messageId });
  } catch (err) {
    const error = normalizeError(err);
    const errorInfo = errorService.external(error.message, {
      step: 'stream-smishing-components',
      stack: error.stack,
    });
    logErrorInfo(logger, 'warn', 'Failed to stream updated components to UI', errorInfo);
  }
}

export async function saveSmishingContent(
  smsKey: string,
  landingKey: string,
  updatedSms: (ExistingSms & { lastModified: number }) | null,
  existingLanding: ExistingLanding | null,
  editedLanding: EditedLanding | null
): Promise<void> {
  const kvService = new KVService(KV_NAMESPACES.SMISHING);

  if (updatedSms) {
    await kvService.put(smsKey, updatedSms);
    logger.info('Smishing SMS updated successfully', { smsKey });
  }

  if (editedLanding && editedLanding.pages.length > 0) {
    const updatedLanding = {
      ...existingLanding,
      pages: editedLanding.pages,
      lastModified: Date.now(),
    };
    await kvService.put(landingKey, updatedLanding);
    logger.info('Smishing landing page updated successfully', { landingKey });
  }
}

export { processLandingPageResults };
