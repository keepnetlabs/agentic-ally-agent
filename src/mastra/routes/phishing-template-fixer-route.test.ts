import { beforeEach, describe, expect, it, vi } from 'vitest';
import { phishingTemplateFixerHandler } from './phishing-template-fixer-route';

// ============================================
// MOCKS
// ============================================

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    name: (err as Error)?.name ?? 'Error',
    message: (err as Error)?.message ?? 'Unknown error',
    stack: (err as Error)?.stack,
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    validation: vi.fn((message: string, context?: object) => ({ message, ...context })),
    internal: vi.fn((message: string, context?: object) => ({ message, ...context })),
  },
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  withTimeout: vi.fn(async (promise: Promise<unknown>) => promise),
}));

// Mock getRequestContext — returns token for domain fetch
vi.mock('../utils/core/request-storage', () => ({
  getRequestContext: vi.fn().mockReturnValue({
    token: 'mock-token',
    companyId: 'mock-company',
    baseApiUrl: 'https://test-api.devkeepnet.com',
  }),
}));

// Mock global fetch for domain API call
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ============================================
// HELPERS
// ============================================

/** Default domain API response matching Keepnet form-details endpoint */
const MOCK_DOMAIN_API_RESPONSE = {
  data: {
    domainRecords: [
      { id: 13, domain: 'sirketiciduyuruonline.com' },
      { id: 12, domain: 'getsaccess.com' },
      { id: 11, domain: 'verificationslogin.com' },
    ],
  },
  status: 'SUCCESS',
};

function mockDomainFetchSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(MOCK_DOMAIN_API_RESPONSE),
  });
}

function mockDomainFetchFailure() {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
}

/**
 * Creates a mock Hono context.
 *
 * For email_template (parallel flow), pass `agentResponseText` as an object
 * with `rewriter` and `classifier` keys so each agent returns different text.
 * For landing_page (single agent), pass a plain string.
 */
function createMockContext(
  body: unknown,
  agentResponseText: string | { rewriter: string; classifier: string } = '',
) {
  const json = vi.fn();

  // Build per-agent generate mocks
  const rewriterGenerate = vi.fn();
  const classifierGenerate = vi.fn();
  const singleGenerate = vi.fn();

  if (typeof agentResponseText === 'string') {
    // Single-agent mode (landing page or legacy)
    singleGenerate.mockResolvedValue({ text: agentResponseText });
    rewriterGenerate.mockResolvedValue({ text: agentResponseText });
    classifierGenerate.mockResolvedValue({ text: agentResponseText });
  } else {
    rewriterGenerate.mockResolvedValue({ text: agentResponseText.rewriter });
    classifierGenerate.mockResolvedValue({ text: agentResponseText.classifier });
    singleGenerate.mockResolvedValue({ text: '' });
  }

  const getAgent = vi.fn((name: string) => {
    if (name === 'emailRewriter') return { generate: rewriterGenerate };
    if (name === 'emailClassifier') return { generate: classifierGenerate };
    return { generate: singleGenerate };
  });

  const ctx = {
    req: {
      json: vi.fn().mockResolvedValue(body),
    },
    get: vi.fn((key: string) => {
      if (key === 'mastra') {
        return { getAgent };
      }
      return undefined;
    }),
    json,
  } as any;

  return { ctx, json, rewriterGenerate, classifierGenerate, generate: singleGenerate, getAgent };
}

// ============================================
// TESTS
// ============================================

describe('phishingTemplateFixerHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- EMAIL TEMPLATE ----------

  it('returns 200 for valid email_template output (parallel rewriter + classifier)', async () => {
    mockDomainFetchSuccess();

    const rewriterText = JSON.stringify({
      fixed_html: '<!DOCTYPE html><html><head></head><body>Email</body></html>',
      change_log: [
        'FIXED: normalized wrapper table',
        'BUTTONS: rebuilt CTA button',
      ],
    });

    const classifierText = JSON.stringify({
      tags: ['MICROSOFT', 'CREDENTIAL_HARVEST', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_HIGH',
      from_address: 'info@getsaccess.com',
      from_name: 'Microsoft Account Team',
      subject: 'Action Required: Verify Your Account',
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ctx, json, rewriterGenerate, classifierGenerate, getAgent } = createMockContext(
      { html: '<html>Email</html>', type: 'email_template' },
      { rewriter: rewriterText, classifier: classifierText },
    );

    await phishingTemplateFixerHandler(ctx);

    expect(getAgent).toHaveBeenCalledWith('emailRewriter');
    expect(getAgent).toHaveBeenCalledWith('emailClassifier');
    expect(classifierGenerate).toHaveBeenCalledWith(
      expect.stringContaining('Available domains:'),
    );
    expect(classifierGenerate).toHaveBeenCalledWith(
      expect.stringContaining('sirketiciduyuruonline.com'),
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          from_address: 'info@getsaccess.com',
          from_name: 'Microsoft Account Team',
          subject: 'Action Required: Verify Your Account',
          tags: ['MICROSOFT', 'CREDENTIAL_HARVEST', 'TRIGGER_URGENCY'],
        }),
      }),
    );
  });

  it('post-processes email_template HTML to keep spacing email-safe', async () => {
    mockDomainFetchSuccess();

    const rewriterText = JSON.stringify({
      fixed_html:
        '<!DOCTYPE html><html><body><table width="600"><tr><td style="margin-bottom: 30px; padding: 0;"><img src="logo.png" width="200" alt="logo"></td></tr></table></body></html>',
      change_log: ['FIXED: normalized wrapper table'],
    });

    const classifierText = JSON.stringify({
      tags: ['MICROSOFT', 'CREDENTIAL_HARVEST', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_HIGH',
      from_address: 'info@getsaccess.com',
      from_name: 'Microsoft Account Team',
      subject: 'Action Required: Verify Your Account',
    });

    const { ctx, json } = createMockContext(
      { html: '<html>Email</html>', type: 'email_template' },
      { rewriter: rewriterText, classifier: classifierText },
    );

    await phishingTemplateFixerHandler(ctx);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          fixed_html: expect.stringContaining('padding-bottom: 30px'),
        }),
      }),
    );
  });

  // ---------- LANDING PAGE ----------

  it('returns 200 for valid landing_page classification output', async () => {
    mockDomainFetchSuccess();

    const agentText = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      domain: 'getsaccess.com',
      change_log: ['BRAND: HR portal', 'DOMAIN: Selected getsaccess.com'],
    });

    const { ctx, json, getAgent } = createMockContext(
      { html: '<html>Landing</html>', type: 'landing_page' },
      agentText,
    );

    await phishingTemplateFixerHandler(ctx);

    expect(getAgent).toHaveBeenCalledWith('phishingLandingPageClassifier');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
          difficulty: 'DIFFICULTY_MEDIUM',
          domain: 'getsaccess.com',
          change_log: expect.arrayContaining([expect.any(String)]),
        }),
      }),
    );
  });

  it('returns 500 when landing_page output is missing domain', async () => {
    mockDomainFetchSuccess();

    const invalidAgentText = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      change_log: ['Some change_log'],
      // domain is missing
    });

    const { ctx, json } = createMockContext(
      { html: '<html>Landing</html>', type: 'landing_page' },
      invalidAgentText,
    );

    await phishingTemplateFixerHandler(ctx);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('domain'),
      }),
      500,
    );
  });

  it('returns 500 when landing_page output selects a domain outside the allowed list', async () => {
    mockDomainFetchSuccess();

    const invalidAgentText = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      domain: 'not-in-list.com',
      change_log: ['DOMAIN: Selected not-in-list.com'],
    });

    const { ctx, json } = createMockContext(
      { html: '<html>Landing</html>', type: 'landing_page' },
      invalidAgentText,
    );

    await phishingTemplateFixerHandler(ctx);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('domain must be selected from available domains'),
      }),
      500,
    );
  });

  it('returns 500 when email_template output selects from_address outside the allowed list', async () => {
    mockDomainFetchSuccess();

    const rewriterText = JSON.stringify({
      fixed_html: '<!DOCTYPE html><html><head></head><body>Email</body></html>',
      change_log: ['FIXED: normalized wrapper table'],
    });

    const classifierText = JSON.stringify({
      tags: ['MICROSOFT', 'CREDENTIAL_HARVEST', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_HIGH',
      from_address: 'info@not-in-list.com',
      from_name: 'Microsoft Account Team',
      subject: 'Action Required: Verify Your Account',
    });

    const { ctx, json } = createMockContext(
      { html: '<html>Email</html>', type: 'email_template' },
      { rewriter: rewriterText, classifier: classifierText },
    );

    await phishingTemplateFixerHandler(ctx);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('from_address domain must be selected from available domains'),
      }),
      500,
    );
  });

  // ---------- VALIDATION ----------

  it('returns 400 when input validation fails (empty html)', async () => {
    const { ctx, json } = createMockContext({
      html: '',
      type: 'email_template',
    });

    await phishingTemplateFixerHandler(ctx);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid input',
      }),
      400,
    );
  });

  // ---------- DOMAIN FETCH FALLBACK ----------

  it('falls back to hardcoded domains when API fetch fails', async () => {
    mockDomainFetchFailure();

    const agentText = JSON.stringify({
      tags: ['DHL', 'DELIVERY', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_LOW',
      domain: 'signin-authzone.com',
      change_log: ['BRAND: DHL tracking page'],
    });

    const { ctx, json, generate } = createMockContext(
      { html: '<html>Landing</html>', type: 'landing_page' },
      agentText,
    );

    await phishingTemplateFixerHandler(ctx);

    // Should still succeed with fallback domains
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    // Agent should still receive "Available domains:" (from hardcoded fallback)
    expect(generate).toHaveBeenCalledWith(
      expect.stringContaining('Available domains:'),
    );
  });

  // ---------- BACKWARD COMPAT ----------

  it('accepts request with deprecated accessToken field', async () => {
    mockDomainFetchSuccess();

    const agentText = JSON.stringify({
      tags: ['NETFLIX', 'CREDENTIAL_HARVEST', 'TRIGGER_FEAR'],
      difficulty: 'DIFFICULTY_HIGH',
      domain: 'verificationslogin.com',
      change_log: ['BRAND: Netflix login clone'],
    });

    const { ctx, json } = createMockContext(
      { html: '<html>LP</html>', type: 'landing_page', accessToken: 'old-token' },
      agentText,
    );

    await phishingTemplateFixerHandler(ctx);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
