import { Context } from 'hono';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import { logErrorInfo, normalizeError } from '../utils/core/error-utils';
import { trackAgentCost } from '../utils/core/tracked-generate';
import type { Agent } from '@mastra/core/agent';
import { withRetry, withTimeout } from '../utils/core/resilience-utils';
import {
  PhishingTemplateFixerInputSchema,
  type PhishingTemplateFixerOutput,
  type LandingPageClassifierOutput,
  type EmailRewriterOutput,
  type EmailClassifierOutput,
} from '../agents/phishing-template-fixer/types';
import {
  parseLandingPageOutput,
  parseRewriterOutput,
  parseClassifierOutput,
} from '../agents/phishing-template-fixer/output-parser';
import { AGENT_NAMES, TIMEOUT_VALUES, PHISHING_TEMPLATE_FIXER, API_ENDPOINTS } from '../constants';
import { getRequestContext } from '../utils/core/request-storage';
import { normalizeEmailLocalBoxes } from '../utils/content-processors/email-local-box-normalizer';
import {
  normalizeEmailButtonDivs,
  normalizeEmailButtonOnlyRowAlignment,
  normalizeEmailCtaWrapperAlignment,
  normalizeEmailButtonRowPadding,
  normalizeEmailLeadingCtaBlockAlignment,
  normalizeEmailNestedCtaTableAlignment,
  normalizeEmailButtonMarginToTdPadding,
} from '../utils/content-processors/email-button-normalizer';
import { normalizeEmailMergeTags } from '../utils/content-processors/email-merge-tag-normalizer';
import { postProcessPhishingLandingHtml } from '../utils/content-processors/phishing-html-postprocessors';
import { collapseEmptyWrappers } from '../utils/content-processors/email-wrapper-collapser';
import { cleanGrapejsStyles } from '../utils/content-processors/email-style-cleaner';
import { restoreLostPadding } from '../utils/content-processors/email-padding-restorer';
import { restoreLostFontFamilies } from '../utils/content-processors/email-font-restorer';
import { restoreLostBorders } from '../utils/content-processors/email-border-restorer';

/** Domain source for logging — distinguishes API-fetched from hardcoded fallback */
type DomainSource = 'api' | 'hardcoded';

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase();
}

function extractDomainFromEmail(emailAddress: string): string {
  const [, domain = ''] = emailAddress.trim().toLowerCase().split('@');
  return domain;
}

/**
 * Validates that AI-selected domain is from the allowed list.
 * Throws a validation error (non-retryable) if the domain is not in the list.
 */
function assertAllowedDomain(selectedDomain: string, allowedDomains: readonly string[], fieldName: string): void {
  const normalizedSelectedDomain = normalizeDomain(selectedDomain);
  const normalizedAllowedDomains = new Set(allowedDomains.map(normalizeDomain));

  if (!normalizedAllowedDomains.has(normalizedSelectedDomain)) {
    const errorInfo = errorService.validation(
      `${fieldName} must be selected from available domains. Received: ${selectedDomain}`,
      { field: fieldName, received: selectedDomain, allowedCount: allowedDomains.length }
    );
    throw new Error(errorInfo.message);
  }
}

/**
 * Fetches available phishing domains from Keepnet API.
 * Extracts `domainRecords[].domain` from the form-details endpoint.
 * Returns empty array on failure (caller falls back to hardcoded list).
 */
async function fetchDomainsFromApi(
  logger: ReturnType<typeof getLogger>,
  bodyAccessToken?: string,
): Promise<string[]> {
  const { token: headerToken, companyId, baseApiUrl } = getRequestContext();
  // Prefer header token (X-AGENTIC-ALLY-TOKEN); fall back to body accessToken
  const token = headerToken || bodyAccessToken;
  if (!token) {
    logger.warn('domain_fetch_skipped', { reason: 'no token in request context or body' });
    return [];
  }

  const url = `${baseApiUrl || API_ENDPOINTS.DEFAULT_BASE_API_URL}/api/phishing-simulator/landing-page-template/form-details`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (companyId) {
    headers['x-ir-company-id'] = companyId;
  }

  try {
    const response = await withTimeout(
      fetch(url, {
        method: 'GET',
        headers,
      }),
      TIMEOUT_VALUES.DOMAIN_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      logger.warn('domain_fetch_failed', { status: response.status, url });
      return [];
    }

    const json = (await response.json()) as {
      data?: {
        domainRecords?: Array<{ domain?: string }>;
      };
    };

    const domains = (json.data?.domainRecords ?? [])
      .map((r) => r.domain?.trim())
      .filter((d): d is string => !!d);

    logger.info('domain_fetch_success', { count: domains.length });
    return domains;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('domain_fetch_error', { error: err.message });
    return [];
  }
}

/**
 * POST /phishing/template-fixer
 *
 * Two distinct flows:
 *   - email_template: Full HTML rewrite (Outlook compat) + classification
 *     Response: { fixed_html, change_log, tags, difficulty, from_address, from_name, subject }
 *   - landing_page:   Classification only (no HTML rewrite)
 *     Response: { tags, difficulty, domain, change_log }
 *
 * Resilience: withRetry (3 attempts, exponential backoff + jitter)
 *             wrapping withTimeout (180s email / 60s landing_page).
 *
 * Payload:
 * {
 *   "html": "<html>...raw template HTML...</html>",
 *   "type": "email_template" | "landing_page"
 * }
 */
export const phishingTemplateFixerHandler = async (c: Context) => {
  const logger = getLogger('PhishingTemplateFixerRoute');
  const requestStart = Date.now();

  try {
    const body = await c.req.json();

    // Step 1: Validate input
    const validation = PhishingTemplateFixerInputSchema.safeParse(body);
    if (!validation.success) {
      const errorInfo = errorService.validation('Invalid input', {
        route: '/phishing/template-fixer',
        details: validation.error.format(),
      });
      logErrorInfo(logger, 'warn', 'phishing_template_fixer_invalid_input', errorInfo);
      return c.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.format(),
        },
        400
      );
    }

    const { html, type, accessToken } = validation.data;

    // Fetch domains from Keepnet API; fall back to hardcoded list on failure
    const apiDomains = await fetchDomainsFromApi(logger, accessToken);
    const domainSource: DomainSource = apiDomains.length > 0 ? 'api' : 'hardcoded';
    const domainList = domainSource === 'api' ? apiDomains : PHISHING_TEMPLATE_FIXER.SENDER_DOMAINS;

    // Step 2: Size guard (email only — landing pages are truncated, not rejected)
    if (type === 'email_template' && html.length > PHISHING_TEMPLATE_FIXER.MAX_HTML_SIZE_BYTES) {
      logger.warn('phishing_template_fixer_html_too_large', {
        type,
        htmlLength: html.length,
        maxAllowed: PHISHING_TEMPLATE_FIXER.MAX_HTML_SIZE_BYTES,
      });
      return c.json(
        {
          success: false,
          error: `HTML content too large (${html.length} bytes). Maximum allowed: ${PHISHING_TEMPLATE_FIXER.MAX_HTML_SIZE_BYTES} bytes.`,
        },
        413
      );
    }

    logger.info('phishing_template_fixer_started', {
      type,
      htmlLength: html.length,
      domainSource,
      domainCount: domainList.length,
    });

    // Step 3: Get agents and branch by type
    const mastra = c.get('mastra');

    if (type === 'landing_page') {
      const agent = mastra.getAgent(AGENT_NAMES.PHISHING_LANDING_CLASSIFIER);
      if (!agent) throw new Error(`${AGENT_NAMES.PHISHING_LANDING_CLASSIFIER} agent not found`);
      return await handleLandingPage(c, agent, html, domainList, logger, requestStart);
    }

    // Email template: parallel Rewriter + Classifier
    const rewriterAgent = mastra.getAgent(AGENT_NAMES.EMAIL_REWRITER);
    const classifierAgent = mastra.getAgent(AGENT_NAMES.EMAIL_CLASSIFIER);
    if (!rewriterAgent || !classifierAgent) {
      throw new Error('emailRewriter or emailClassifier agent not found');
    }
    return await handleEmailTemplate(c, rewriterAgent, classifierAgent, html, domainList, logger, requestStart);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.internal(err.message, {
      route: '/phishing/template-fixer',
      event: 'error',
    });
    logErrorInfo(logger, 'error', 'phishing_template_fixer_failed', errorInfo);
    return c.json(
      {
        success: false,
        error: err.message,
      },
      500
    );
  }
};

// ============================================
// EMAIL TEMPLATE — Full HTML rewrite + classification
// ============================================

async function handleEmailTemplate(
  c: Context,
  rewriterAgent: Agent,
  classifierAgent: Agent,
  html: string,
  domainList: readonly string[],
  logger: ReturnType<typeof getLogger>,
  requestStart: number,
) {
  // Pre-process: strip GrapeJS noise before sending to AI
  // 1. Collapse empty wrapper divs (saves ~50 tokens per nesting level)
  // 2. Clean verbose inline styles (saves 60-80% per element)
  const collapsedHtml = collapseEmptyWrappers(html);
  const cleanedHtml = cleanGrapejsStyles(collapsedHtml);
  if (cleanedHtml.length < html.length) {
    logger.info('email_pre_cleaned', {
      originalLength: html.length,
      cleanedLength: cleanedHtml.length,
      savedChars: html.length - cleanedHtml.length,
      savedPct: Math.round((1 - cleanedHtml.length / html.length) * 100),
    });
  }

  const domainListStr = domainList.join(', ');
  const rewriterMessage = `type="email_template"\n\n${cleanedHtml}`;
  const classifierMessage = `type="email_template"\n\nAvailable domains:\n${domainListStr}\n\n${cleanedHtml}`;

  // Run Rewriter and Classifier in parallel — each with its own retry/timeout
  const [rewriterData, classifierData] = await withTimeout(
    Promise.all([
      withRetry<EmailRewriterOutput>(async () => {
        const response = await rewriterAgent.generate(rewriterMessage);
        trackAgentCost('phishing-fixer-rewriter', response, rewriterAgent.model);
        const result = parseRewriterOutput(response.text);
        if (!result.success) throw new Error(`Rewriter: ${result.error}`);
        return result.data;
      }, 'email-rewriter'),

      withRetry<EmailClassifierOutput>(async () => {
        const response = await classifierAgent.generate(classifierMessage);
        trackAgentCost('phishing-fixer-classifier', response, classifierAgent.model);
        const result = parseClassifierOutput(response.text);
        if (!result.success) throw new Error(`Classifier: ${result.error}`);

        assertAllowedDomain(
          extractDomainFromEmail(result.data.from_address),
          domainList,
          'from_address domain'
        );

        return result.data;
      }, 'email-classifier'),
    ]),
    TIMEOUT_VALUES.PHISHING_EDITOR_EMAIL_TIMEOUT_MS,
  );

  // Validate AI output — content-aware + structural integrity check.
  // Size shrink is unreliable: AI legitimately strips verbose GrapeJS inline styles (50%+ reduction).
  // Content markers alone are also insufficient: AI can include all images/TRs but produce broken HTML structure.
  // We combine content marker checks with structural tag balance validation.
  const aiRawHtml = rewriterData.fixed_html;

  // --- Content marker checks ---
  const inputImgSrcs = [...(cleanedHtml.matchAll(/src=["']([^"']+)["']/gi))].map(m => m[1]);
  const inputTrCount = (cleanedHtml.match(/<tr/gi) || []).length;
  const aiTrCount = (aiRawHtml.match(/<tr/gi) || []).length;
  const aiShrinkPct = Math.round((1 - aiRawHtml.length / cleanedHtml.length) * 100);

  const missingImages = inputImgSrcs.filter(src => !aiRawHtml.includes(src));
  const hasPhishingUrl = aiRawHtml.includes('{PHISHINGURL}');
  const inputHadPhishingUrl = cleanedHtml.includes('{PHISHINGURL}');
  const trLossRatio = inputTrCount > 0 ? aiTrCount / inputTrCount : 1;

  // --- Structural integrity checks ---
  // AI sometimes generates HTML that starts mid-template or has unclosed tags,
  // causing the browser to hide content even though all markers exist in the source.
  const aiTableOpen = (aiRawHtml.match(/<table[\s>]/gi) || []).length;
  const aiTableClose = (aiRawHtml.match(/<\/table>/gi) || []).length;
  const aiTdOpen = (aiRawHtml.match(/<td[\s>]/gi) || []).length;
  const aiTdClose = (aiRawHtml.match(/<\/td>/gi) || []).length;

  const tableImbalance = Math.abs(aiTableOpen - aiTableClose);
  const tdImbalance = Math.abs(aiTdOpen - aiTdClose);
  const structurallyBroken = tableImbalance > 1 || tdImbalance > 2;

  const aiLostContent =
    missingImages.length > 0 ||
    (inputHadPhishingUrl && !hasPhishingUrl) ||
    trLossRatio < 0.7 ||
    structurallyBroken;

  logger.info('email_rewrite_validation', {
    inputLength: cleanedHtml.length,
    aiLength: aiRawHtml.length,
    shrinkPct: aiShrinkPct,
    inputTrCount,
    aiTrCount,
    trLossRatio: Math.round(trLossRatio * 100),
    inputImgCount: inputImgSrcs.length,
    missingImgCount: missingImages.length,
    hasPhishingUrl,
    tableBalance: `${aiTableOpen}/${aiTableClose}`,
    tdBalance: `${aiTdOpen}/${aiTdClose}`,
    structurallyBroken,
    passed: !aiLostContent,
    aiHead: aiRawHtml.slice(0, 200),
    aiTail: aiRawHtml.slice(-200),
  });

  // If AI output lost content or is structurally broken, fall back to original HTML.
  // Otherwise, restore padding, font-family, and border values the AI may have stripped/changed.
  let baseHtml: string;
  let fontsRestored = 0;
  let bordersRestored = 0;
  if (aiLostContent) {
    baseHtml = html;
  } else {
    baseHtml = restoreLostPadding(cleanedHtml, aiRawHtml);
    const fontResult = restoreLostFontFamilies(cleanedHtml, baseHtml);
    baseHtml = fontResult.html;
    fontsRestored = fontResult.restoredCount;
    const borderResult = restoreLostBorders(cleanedHtml, baseHtml);
    baseHtml = borderResult.html;
    bordersRestored = borderResult.restoredCount;
    if (fontsRestored > 0 || bordersRestored > 0) {
      logger.info('email_ai_properties_restored', { fontsRestored, bordersRestored });
    }
  }
  if (aiLostContent) {
    logger.warn('email_rewrite_fallback', {
      reason: structurallyBroken
        ? 'AI output has broken HTML structure (unbalanced table/td tags) — using original HTML'
        : 'AI output lost critical content — using original HTML',
      missingImages,
      hasPhishingUrl,
      trLossRatio: Math.round(trLossRatio * 100),
      tableBalance: `${aiTableOpen}/${aiTableClose}`,
      tdBalance: `${aiTdOpen}/${aiTdClose}`,
      aiLength: aiRawHtml.length,
      inputLength: cleanedHtml.length,
      shrinkPct: aiShrinkPct,
    });
  }

  // Post-process through the normalizer pipeline (same pattern as postProcessPhishingEmailHtml)
  let out = normalizeEmailLocalBoxes(baseHtml);
  out = normalizeEmailButtonDivs(out);
  out = normalizeEmailCtaWrapperAlignment(out);
  out = normalizeEmailButtonRowPadding(out);
  out = normalizeEmailButtonOnlyRowAlignment(out);
  out = normalizeEmailLeadingCtaBlockAlignment(out);
  out = normalizeEmailNestedCtaTableAlignment(out);
  out = normalizeEmailButtonMarginToTdPadding(out);

  const { html: finalHtml, corrections } = normalizeEmailMergeTags(out);
  if (corrections.length > 0) {
    logger.info('merge_tags_corrected', { corrections });
  }

  // Merge rewriter + classifier results into the same response format
  // When AI output was truncated we silently fall back — no need to expose internals to frontend
  const changeLog = aiLostContent ? [] : rewriterData.change_log;
  const data: PhishingTemplateFixerOutput = {
    fixed_html: finalHtml,
    change_log: changeLog,
    tags: classifierData.tags,
    difficulty: classifierData.difficulty,
    from_address: classifierData.from_address,
    from_name: classifierData.from_name,
    subject: classifierData.subject,
  };

  logger.info('phishing_template_fixer_completed', {
    type: 'email_template',
    mode: 'parallel',
    fallbackUsed: aiLostContent,
    fontsRestored,
    bordersRestored,
    tagsCount: data.tags.length,
    difficulty: data.difficulty,
    fromAddress: data.from_address,
    fromName: data.from_name,
    subject: data.subject,
    mergeTagCorrections: corrections.length,
    durationMs: Date.now() - requestStart,
  });

  return c.json({ success: true, data });
}

// ============================================
// LANDING PAGE — Classification only (no HTML rewrite)
// ============================================

async function handleLandingPage(
  c: Context,
  agent: Agent,
  html: string,
  domainList: readonly string[],
  logger: ReturnType<typeof getLogger>,
  requestStart: number,
) {
  // Truncate HTML — classification only needs enough to identify brand/premise/trigger
  const charLimit = PHISHING_TEMPLATE_FIXER.LANDING_PAGE_CHAR_LIMIT;
  const truncatedHtml = html.slice(0, charLimit);
  const wasTruncated = html.length > charLimit;

  if (wasTruncated) {
    logger.warn('landing_page_truncated', {
      originalLength: html.length,
      truncatedTo: truncatedHtml.length,
    });
  }

  const truncationNote = wasTruncated
    ? `\n\nNOTE: This HTML was truncated from ${html.length} to ${truncatedHtml.length} characters. Key content (forms, CTAs) may be in the truncated portion — classify based on what is visible.`
    : '';
  const userMessage = `type="landing_page"\n\nAvailable domains:\n${domainList.join(', ')}\n\n${truncatedHtml}${truncationNote}`;

  const data = await withTimeout(
    withRetry<LandingPageClassifierOutput>(async () => {
      const response = await agent.generate(userMessage);
      trackAgentCost('phishing-fixer-landing-classifier', response, agent.model);
      const result = parseLandingPageOutput(response.text);

      if (!result.success) {
        throw new Error(result.error);
      }

      assertAllowedDomain(result.data.domain, domainList, 'domain');

      return result.data;
    }, 'phishing-template-fixer-landing'),
    TIMEOUT_VALUES.PHISHING_EDITOR_LANDING_TIMEOUT_MS,
  );

  logger.info('phishing_landing_classifier_completed', {
    type: 'landing_page',
    tagsCount: data.tags.length,
    difficulty: data.difficulty,
    domain: data.domain,
    changeLogCount: data.change_log.length,
    originalHtmlLength: html.length,
    truncatedLength: truncatedHtml.length,
    durationMs: Date.now() - requestStart,
  });

  // Post-process the full (non-truncated) HTML through landing page pipeline
  // (sanitize, repair, centering, merge tag fix, full document wrapper)
  const fixedHtml = postProcessPhishingLandingHtml({ html });

  return c.json({ success: true, data: { ...data, fixed_html: fixedHtml } });
}
