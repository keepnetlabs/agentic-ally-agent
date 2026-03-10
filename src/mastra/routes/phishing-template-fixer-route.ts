import { Context } from 'hono';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import { logErrorInfo, normalizeError } from '../utils/core/error-utils';
import { withRetry, withTimeout } from '../utils/core/resilience-utils';
import {
  PhishingTemplateFixerInputSchema,
  type PhishingTemplateFixerOutput,
  type LandingPageClassifierOutput,
} from '../agents/phishing-template-fixer/types';
import { parseEmailTemplateOutput, parseLandingPageOutput } from '../agents/phishing-template-fixer/output-parser';
import { AGENT_NAMES, TIMEOUT_VALUES, PHISHING_TEMPLATE_FIXER, API_ENDPOINTS } from '../constants';
import { getRequestContext } from '../utils/core/request-storage';
import { normalizeEmailLocalBoxes } from '../utils/content-processors/email-local-box-normalizer';
import {
  normalizeEmailButtonDivs,
  normalizeEmailButtonOnlyRowAlignment,
  normalizeEmailCtaWrapperAlignment,
} from '../utils/content-processors/email-button-normalizer';

/**
 * Maximum HTML characters sent to LLM for landing page classification.
 * Landing pages only need enough content to identify brand, premise, and trigger.
 * Full HTML is NOT rewritten — only classified.
 */
const LANDING_PAGE_CLASSIFICATION_CHAR_LIMIT = 5000;

/** Timeout for the Keepnet domain fetch call (10s) */
const DOMAIN_FETCH_TIMEOUT_MS = 10_000;

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase();
}

function extractDomainFromEmail(emailAddress: string): string {
  const [, domain = ''] = emailAddress.trim().toLowerCase().split('@');
  return domain;
}

function assertAllowedDomain(selectedDomain: string, allowedDomains: readonly string[], fieldName: string): void {
  const normalizedSelectedDomain = normalizeDomain(selectedDomain);
  const normalizedAllowedDomains = new Set(allowedDomains.map(normalizeDomain));

  if (!normalizedAllowedDomains.has(normalizedSelectedDomain)) {
    throw new Error(
      `${fieldName} must be selected from available domains. Received: ${selectedDomain}`
    );
  }
}

function getFixerAgentName(type: 'email_template' | 'landing_page') {
  return type === 'landing_page'
    ? AGENT_NAMES.PHISHING_LANDING_CLASSIFIER
    : AGENT_NAMES.PHISHING_TEMPLATE_FIXER;
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
      DOMAIN_FETCH_TIMEOUT_MS,
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
    const domainList = apiDomains.length > 0
      ? apiDomains
      : PHISHING_TEMPLATE_FIXER.SENDER_DOMAINS;

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
    });

    // Step 3: Get agent
    const mastra = c.get('mastra');
    const agentName = getFixerAgentName(type);
    const agent = mastra.getAgent(agentName);
    if (!agent) {
      throw new Error(`${agentName} agent not found`);
    }

    // Step 4: Branch by type
    if (type === 'landing_page') {
      return await handleLandingPage(c, agent, html, domainList, logger, requestStart);
    }
    return await handleEmailTemplate(c, agent, html, domainList, logger, requestStart);
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
  agent: { generate: (msg: string) => Promise<{ text: string }> },
  html: string,
  domainList: readonly string[],
  logger: ReturnType<typeof getLogger>,
  requestStart: number,
) {
  const userMessage = `type="email_template"\n\nAvailable domains:\n${domainList.join(', ')}\n\n${html}`;

  const data = await withTimeout(
    withRetry<PhishingTemplateFixerOutput>(async () => {
      const response = await agent.generate(userMessage);
      const result = parseEmailTemplateOutput(response.text);

      if (!result.success) {
        throw new Error(result.error);
      }

      assertAllowedDomain(
        extractDomainFromEmail(result.data.from_address),
        domainList,
        'from_address domain'
      );

      return {
        ...result.data,
        fixed_html: normalizeEmailButtonOnlyRowAlignment(
          normalizeEmailCtaWrapperAlignment(
            normalizeEmailButtonDivs(
              normalizeEmailLocalBoxes(result.data.fixed_html)
            )
          )
        ),
      };
    }, 'phishing-template-fixer-email'),
    TIMEOUT_VALUES.PHISHING_EDITOR_EMAIL_TIMEOUT_MS,
  );

  logger.info('phishing_template_fixer_completed', {
    type: 'email_template',
    tagsCount: data.tags.length,
    difficulty: data.difficulty,
    fromAddress: data.from_address,
    fromName: data.from_name,
    subject: data.subject,
    durationMs: Date.now() - requestStart,
  });

  return c.json({ success: true, data });
}

// ============================================
// LANDING PAGE — Classification only (no HTML rewrite)
// ============================================

async function handleLandingPage(
  c: Context,
  agent: { generate: (msg: string) => Promise<{ text: string }> },
  html: string,
  domainList: readonly string[],
  logger: ReturnType<typeof getLogger>,
  requestStart: number,
) {
  // Truncate HTML — classification only needs enough to identify brand/premise/trigger
  const truncatedHtml = html.slice(0, LANDING_PAGE_CLASSIFICATION_CHAR_LIMIT);
  const userMessage = `type="landing_page"\n\nAvailable domains:\n${domainList.join(', ')}\n\n${truncatedHtml}`;

  const data = await withTimeout(
    withRetry<LandingPageClassifierOutput>(async () => {
      const response = await agent.generate(userMessage);
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

  return c.json({ success: true, data });
}
