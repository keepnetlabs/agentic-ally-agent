/**
 * POST /smishing/editor/save - Smishing Editor Save Route Handler
 *
 * Saves edited smishing SMS and/or landing page templates to KV.
 * Follows the same pattern as phishing-editor-save-route.ts.
 */

import { Context } from 'hono';
import { KV_NAMESPACES } from '../constants';
import { KVService } from '../services';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../utils/language/language-utils';
import { postProcessPhishingLandingHtml } from '../utils/content-processors/phishing-html-postprocessors';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';

const logger = getLogger('SmishingEditorSaveRoute');

interface KvLandingRecord {
  pages?: Array<{ template?: string; type?: string }>;
  name?: string;
  [key: string]: unknown;
}

interface SmishingEditorBody {
  smishingId?: string;
  language?: string;
  smsKey?: string;
  landingKey?: string;
  sms?: {
    messages?: string[];
  };
  landing?: {
    name?: string;
    pages?: Array<{ template?: string; type?: string; edited?: boolean; summary?: string }>;
  };
}

export async function smishingEditorSaveHandler(c: Context) {
  const requestStart = Date.now();
  try {
    const body = (await c.req.json()) as SmishingEditorBody | null;
    const { smishingId, language, smsKey, landingKey, sms, landing } = body ?? {};

    if (!smishingId || typeof smishingId !== 'string') {
      logger.warn('smishing_editor_save_missing_id');
      return c.json({ success: false, error: 'Missing smishingId' }, 400);
    }

    const normalizedLanguage = validateBCP47LanguageCode(
      typeof language === 'string' ? language : DEFAULT_LANGUAGE
    );
    const baseKeyPrefix = `smishing:${smishingId}`;
    const defaultSmsKey = `${baseKeyPrefix}:sms:${normalizedLanguage}`;
    const defaultLandingKey = `${baseKeyPrefix}:landing:${normalizedLanguage}`;

    const effectiveSmsKey =
      typeof smsKey === 'string' && smsKey.startsWith(`${baseKeyPrefix}:sms:`)
        ? smsKey
        : defaultSmsKey;

    const effectiveLandingKey =
      typeof landingKey === 'string' && landingKey.startsWith(`${baseKeyPrefix}:landing:`)
        ? landingKey
        : defaultLandingKey;

    const kvService = new KVService(KV_NAMESPACES.SMISHING);
    const saved: string[] = [];
    logger.info('smishing_editor_save_started', {
      smishingId,
      language: normalizedLanguage,
      hasSms: !!sms?.messages?.length,
      hasLanding: !!landing?.pages?.length,
    });

    // Save SMS messages
    if (sms?.messages && Array.isArray(sms.messages) && sms.messages.length > 0) {
      const existingSms = await kvService.get(effectiveSmsKey);
      if (!existingSms) {
        logger.warn('smishing_editor_save_sms_not_found', { smsKey: effectiveSmsKey });
        return c.json({ success: false, error: 'SMS content not found for update' }, 404);
      }
      const updatedSms = {
        ...(existingSms || {}),
        messages: sms.messages,
        lastModified: Date.now(),
      };
      await kvService.put(effectiveSmsKey, updatedSms);
      saved.push('sms');
      logger.info('smishing_editor_save_sms_updated', { smsKey: effectiveSmsKey });
    }

    // Save landing pages
    if (landing?.pages && Array.isArray(landing.pages) && landing.pages.length > 0) {
      const existingLanding = await kvService.get<KvLandingRecord>(effectiveLandingKey);
      if (!existingLanding) {
        logger.warn('smishing_editor_save_landing_not_found', { landingKey: effectiveLandingKey });
        return c.json({ success: false, error: 'Landing template not found for update' }, 404);
      }

      const updatedPages = landing.pages
        .filter((page): page is { template: string; type: string; edited?: boolean; summary?: string } =>
          !!page?.template && !!page?.type
        )
        .map(page => ({
          ...page,
          template: postProcessPhishingLandingHtml({
            html: page.template,
            title: landing?.name || existingLanding.name || 'Secure Portal',
          }),
          edited: page.edited ?? true,
          summary: page.summary || 'Updated in UI',
        }));

      if (updatedPages.length > 0) {
        const existingPages = Array.isArray(existingLanding.pages) ? existingLanding.pages : [];
        const mergedPages = existingPages.map((page) => {
          const replacement = updatedPages.find(updated => updated.type === page.type);
          return replacement || page;
        });
        const appendedPages = updatedPages.filter(
          updated => !existingPages.some((page) => page.type === updated.type)
        );

        const updatedLanding = {
          ...(existingLanding || {}),
          pages: [...mergedPages, ...appendedPages],
          lastModified: Date.now(),
        };
        await kvService.put(effectiveLandingKey, updatedLanding);
        saved.push('landing');
        logger.info('smishing_editor_save_landing_updated', {
          landingKey: effectiveLandingKey,
          pageCount: updatedLanding.pages?.length,
        });
      }
    }

    if (saved.length === 0) {
      logger.warn('smishing_editor_save_no_content', { smishingId });
      return c.json({ success: false, error: 'No SMS or landing content provided' }, 400);
    }

    logger.info('smishing_editor_save_completed', {
      smishingId,
      saved,
      durationMs: Date.now() - requestStart,
    });
    return c.json(
      {
        success: true,
        smishingId,
        language: normalizedLanguage,
        saved,
      },
      200
    );
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'smishing-editor-save',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'smishing_editor_save_error', errorInfo);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
