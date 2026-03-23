/**
 * POST /phishing/editor/save - Phishing Editor Save Route Handler
 *
 * Saves edited phishing email and/or landing page templates to KV.
 * Applies HTML post-processing before saving.
 */

import { Context } from 'hono';
import { KV_NAMESPACES } from '../constants';
import { KVService } from '../services';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../utils/language/language-utils';
import {
  postProcessPhishingEmailHtml,
  postProcessPhishingLandingHtml,
} from '../utils/content-processors/phishing-html-postprocessors';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import type {
  PhishingEditorBody,
  KvPhishingLandingRecord,
  PhishingEditorLandingPage,
} from '../types';

const logger = getLogger('PhishingEditorSaveRoute');

export async function phishingEditorSaveHandler(c: Context) {
  const requestStart = Date.now();
  try {
    const body = (await c.req.json()) as PhishingEditorBody | null;
    const { phishingId, language, emailKey, landingKey, email, landing } = body ?? {};

    if (!phishingId || typeof phishingId !== 'string') {
      logger.warn('phishing_editor_save_missing_id');
      return c.json({ success: false, error: 'Missing phishingId' }, 400);
    }

    const normalizedLanguage = validateBCP47LanguageCode(
      typeof language === 'string' ? language : DEFAULT_LANGUAGE
    );
    const baseKeyPrefix = `phishing:${phishingId}`;
    const defaultEmailKey = `${baseKeyPrefix}:email:${normalizedLanguage}`;
    const defaultLandingKey = `${baseKeyPrefix}:landing:${normalizedLanguage}`;

    const effectiveEmailKey =
      typeof emailKey === 'string' && emailKey.startsWith(`${baseKeyPrefix}:email:`)
        ? emailKey
        : defaultEmailKey;

    const effectiveLandingKey =
      typeof landingKey === 'string' && landingKey.startsWith(`${baseKeyPrefix}:landing:`)
        ? landingKey
        : defaultLandingKey;

    const kvService = new KVService(KV_NAMESPACES.PHISHING);
    const saved: string[] = [];
    logger.info('phishing_editor_save_started', {
      phishingId,
      language: normalizedLanguage,
      hasEmail: !!email?.template,
      hasLanding: !!landing?.pages?.length,
    });

    if (email?.template && typeof email.template === 'string') {
      const existingEmail = await kvService.get(effectiveEmailKey);
      if (!existingEmail) {
        logger.warn('phishing_editor_save_email_not_found', { emailKey: effectiveEmailKey });
        return c.json({ success: false, error: 'Email template not found for update' }, 404);
      }
      const processedTemplate = postProcessPhishingEmailHtml({ html: email.template });
      const updatedEmail = {
        ...(existingEmail || {}),
        template: processedTemplate,
        lastModified: Date.now(),
      };
      await kvService.put(effectiveEmailKey, updatedEmail);
      saved.push('email');
      logger.info('phishing_editor_save_email_updated', { emailKey: effectiveEmailKey });
    }

    if (landing?.pages && Array.isArray(landing.pages) && landing.pages.length > 0) {
      const existingLanding = (await kvService.get(effectiveLandingKey)) as KvPhishingLandingRecord | null;
      if (!existingLanding) {
        logger.warn('phishing_editor_save_landing_not_found', { landingKey: effectiveLandingKey });
        return c.json({ success: false, error: 'Landing template not found for update' }, 404);
      }

      const landingPages = landing.pages;
      const updatedPages = landingPages
        .filter((page): page is PhishingEditorLandingPage & { template: string; type: string } =>
          !!page?.template && !!page?.type
        )
        .map(page => ({
          ...page,
          template: postProcessPhishingLandingHtml({
            html: page.template,
            title: landing?.name || existingLanding?.name || 'Secure Portal',
          }),
          edited: page.edited ?? true,
          summary: page.summary || 'Updated in UI',
        }));

      if (updatedPages.length > 0) {
        const existingPages = Array.isArray(existingLanding.pages) ? existingLanding.pages : [];
        const mergedPages = existingPages.map(page => {
          const replacement = updatedPages.find(updated => updated.type === page.type);
          return replacement || page;
        });
        const appendedPages = updatedPages.filter(
          updated => !existingPages.some(page => page.type === updated.type)
        );

        const updatedLanding = {
          ...(existingLanding || {}),
          pages: [...mergedPages, ...appendedPages],
          lastModified: Date.now(),
        };
        await kvService.put(effectiveLandingKey, updatedLanding);
        saved.push('landing');
        logger.info('phishing_editor_save_landing_updated', {
          landingKey: effectiveLandingKey,
          pageCount: updatedLanding.pages?.length,
        });
      }
    }

    if (saved.length === 0) {
      logger.warn('phishing_editor_save_no_content', { phishingId });
      return c.json({ success: false, error: 'No email or landing content provided' }, 400);
    }

    logger.info('phishing_editor_save_completed', {
      phishingId,
      saved,
      durationMs: Date.now() - requestStart,
    });
    return c.json(
      {
        success: true,
        phishingId,
        language: normalizedLanguage,
        saved,
      },
      200
    );
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'phishing-editor-save',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'phishing_editor_save_error', errorInfo);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
