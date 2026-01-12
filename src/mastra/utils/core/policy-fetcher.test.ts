import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPolicyContext, extractCompanyIdFromTokenExport } from './policy-fetcher';
import { getRequestContext } from './request-storage';
import { getLogger } from './logger';

// Mock modules
vi.mock('./request-storage', () => ({
  getRequestContext: vi.fn(),
}));

vi.mock('./logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe.skip('policy-fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ==================== JWT PARSING TESTS ====================
  describe('extractCompanyIdFromTokenExport (JWT Parsing)', () => {
    it('should extract companyId from valid JWT token', () => {
      // Create a valid JWT token with company ID
      const payload = {
        idp: 'auth0',
        user_company_resourceid: 'company-123',
        sub: 'user@example.com',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);

      expect(companyId).toBe('company-123');
    });

    it('should return undefined for malformed token (no dots)', () => {
      const token = 'invalid-token';
      const companyId = extractCompanyIdFromTokenExport(token);

      expect(companyId).toBeUndefined();
    });

    it('should return undefined for token with missing payload', () => {
      const token = 'header..signature'; // Missing payload
      const companyId = extractCompanyIdFromTokenExport(token);

      expect(companyId).toBeUndefined();
    });

    it('should return undefined for invalid base64 payload', () => {
      const token = 'header.!!!invalid-base64!!!.signature';
      const companyId = extractCompanyIdFromTokenExport(token);

      expect(companyId).toBeUndefined();
    });

    it('should return undefined for invalid JSON in payload', () => {
      const invalidPayload = 'aW52YWxpZCBqc29u'; // 'invalid json' in base64
      const token = `header.${invalidPayload}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);

      expect(companyId).toBeUndefined();
    });

    it('should return undefined when user_company_resourceid is missing', () => {
      const payload = {
        idp: 'auth0',
        sub: 'user@example.com',
        // Missing user_company_resourceid
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);

      expect(companyId).toBeUndefined();
    });

    it('should handle base64 padding edge cases', () => {
      // Test different padding scenarios
      const testCases = [
        { length: 1, expectedPadding: 3 },
        { length: 2, expectedPadding: 2 },
        { length: 3, expectedPadding: 1 },
        { length: 4, expectedPadding: 0 }, // Multiple of 4
        { length: 5, expectedPadding: 3 },
      ];

      for (const testCase of testCases) {
        const payload = {
          user_company_resourceid: 'test-company',
          // Create payload that requires padding
          data: 'x'.repeat(testCase.length),
        };

        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
        const token = `header.${payloadBase64}.signature`;

        const companyId = extractCompanyIdFromTokenExport(token);
        expect(companyId).toBe('test-company');
      }
    });

    it('should handle tokens with unusual characters in company ID', () => {
      const companyIds = [
        'company-123-abc',
        'company_with_underscores',
        'company.with.dots',
        'company:with:colons',
        '12345',
        'UPPERCASE',
        'lowercase',
      ];

      for (const companyId of companyIds) {
        const payload = {
          user_company_resourceid: companyId,
        };

        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
        const token = `header.${payloadBase64}.signature`;

        const result = extractCompanyIdFromTokenExport(token);
        expect(result).toBe(companyId);
      }
    });

    it('should handle very long company IDs', () => {
      const longCompanyId = 'x'.repeat(1000);
      const payload = {
        user_company_resourceid: longCompanyId,
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBe(longCompanyId);
    });

    it('should handle empty string company ID', () => {
      const payload = {
        user_company_resourceid: '',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBe('');
    });

    it('should handle null company ID gracefully', () => {
      const payload = {
        user_company_resourceid: null,
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBeNull();
    });

    it('should ignore extra fields in JWT payload', () => {
      const payload = {
        idp: 'auth0',
        user_company_resourceid: 'company-123',
        sub: 'user@example.com',
        email: 'user@example.com',
        name: 'John Doe',
        aud: 'aud-value',
        iss: 'iss-value',
        exp: 1234567890,
        iat: 1234567890,
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBe('company-123');
    });

    it('should handle unicode characters in company ID', () => {
      const payload = {
        user_company_resourceid: 'company-公司-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBe('company-公司-123');
    });

    it('should handle token with more than 3 segments', () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature.extra.segments`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBe('company-123');
    });
  });

  // ==================== GET POLICY CONTEXT TESTS ====================
  describe('getPolicyContext', () => {
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    beforeEach(() => {
      vi.mocked(getLogger).mockReturnValue(mockLogger as any);
    });

    it('should return empty string when no token in request context', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        token: undefined,
      } as any);

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.debug).toHaveBeenCalledWith('No companyId found in token, skipping policy context');
    });

    it('should return empty string when token has no company ID', async () => {
      const payload = {
        idp: 'auth0',
        // Missing user_company_resourceid
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.debug).toHaveBeenCalledWith('No companyId found in token, skipping policy context');
    });

    it('should fetch and return policy context', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Security Policy',
          blobUrl: 'policies/company-123/security-policy.md',
        },
        {
          name: 'Privacy Policy',
          blobUrl: 'policies/company-123/privacy-policy.md',
        },
      ];

      const mockSecurityContent = {
        policyId: 'sec-123',
        text: 'All employees must follow security guidelines...',
      };

      const mockPrivacyContent = {
        policyId: 'priv-123',
        text: 'We protect user data according to GDPR...',
      };

      // Mock fetch calls
      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          // List policies call
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else if (callCount === 2) {
          // Security policy fetch
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSecurityContent),
          } as any);
        } else if (callCount === 3) {
          // Privacy policy fetch
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPrivacyContent),
          } as any);
        }

        return Promise.reject(new Error('Unexpected fetch call'));
      });

      const context = await getPolicyContext();

      expect(context).toContain('**Policy: Security Policy**');
      expect(context).toContain('All employees must follow security guidelines...');
      expect(context).toContain('**Policy: Privacy Policy**');
      expect(context).toContain('We protect user data according to GDPR...');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching company policies',
        expect.objectContaining({ companyId: 'company-123' })
      );
    });

    it('should return empty string when no policies found', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as any);

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'No policies found for company',
        expect.objectContaining({ companyId: 'company-123' })
      );
    });

    it('should handle policy list fetch failure', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to list policies',
        expect.objectContaining({ status: 500 })
      );
    });

    it('should handle individual policy fetch failures', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Good Policy',
          blobUrl: 'policies/company-123/good.md',
        },
        {
          name: 'Bad Policy',
          blobUrl: 'policies/company-123/bad.md',
        },
      ];

      const mockGoodContent = {
        policyId: 'good-123',
        text: 'Good policy content',
      };

      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          // List policies
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else if (callCount === 2) {
          // Good policy fetch
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGoodContent),
          } as any);
        } else if (callCount === 3) {
          // Bad policy fetch - fails
          return Promise.resolve({
            ok: false,
            status: 404,
          } as any);
        }

        return Promise.reject(new Error('Unexpected fetch call'));
      });

      const context = await getPolicyContext();

      expect(context).toContain('**Policy: Good Policy**');
      expect(context).toContain('Good policy content');
      expect(context).not.toContain('Bad Policy');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to read policy',
        expect.objectContaining({ policyName: 'Bad Policy', status: 404 })
      );
    });

    it('should skip policies that throw errors during fetch', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Valid Policy',
          blobUrl: 'policies/company-123/valid.md',
        },
        {
          name: 'Error Policy',
          blobUrl: 'policies/company-123/error.md',
        },
      ];

      const mockValidContent = {
        policyId: 'valid-123',
        text: 'Valid policy content',
      };

      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          // List policies
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else if (callCount === 2) {
          // Valid policy
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockValidContent),
          } as any);
        } else if (callCount === 3) {
          // Error policy - throws
          return Promise.reject(new Error('Network error'));
        }

        return Promise.reject(new Error('Unexpected fetch call'));
      });

      const context = await getPolicyContext();

      expect(context).toContain('**Policy: Valid Policy**');
      expect(context).not.toContain('Error Policy');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error reading policy',
        expect.objectContaining({ policyName: 'Error Policy', error: 'Network error' })
      );
    });

    it('should return empty string when all policies fail', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Policy 1',
          blobUrl: 'policies/company-123/policy1.md',
        },
        {
          name: 'Policy 2',
          blobUrl: 'policies/company-123/policy2.md',
        },
      ];

      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          // List policies
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else {
          // All policy fetches fail
          return Promise.resolve({
            ok: false,
            status: 500,
          } as any);
        }
      });

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith('No valid policies could be read');
    });

    it('should handle top-level error in getPolicyContext', async () => {
      vi.mocked(getRequestContext).mockImplementation(() => {
        throw new Error('Request context error');
      });

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching policy context',
        expect.objectContaining({ error: 'Request context error' })
      );
    });

    it('should handle invalid JSON in policy response', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Bad JSON Policy',
          blobUrl: 'policies/company-123/bad.md',
        },
      ];

      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          // List policies
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else if (callCount === 2) {
          // Invalid JSON response
          return Promise.resolve({
            ok: true,
            json: () => Promise.reject(new Error('Invalid JSON')),
          } as any);
        }

        return Promise.reject(new Error('Unexpected fetch call'));
      });

      const context = await getPolicyContext();

      expect(context).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error reading policy',
        expect.objectContaining({ policyName: 'Bad JSON Policy' })
      );
    });

    it('should set correct headers with company ID', async () => {
      const payload = {
        user_company_resourceid: 'company-456',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as any);

      await getPolicyContext();

      const firstCall = vi.mocked(global.fetch).mock.calls[0];
      expect(firstCall[1]).toEqual(
        expect.objectContaining({
          headers: {
            'X-COMPANY-ID': 'company-456',
          },
        })
      );
    });

    it('should join multiple policies with separator', async () => {
      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Policy 1',
          blobUrl: 'policies/company-123/policy1.md',
        },
        {
          name: 'Policy 2',
          blobUrl: 'policies/company-123/policy2.md',
        },
        {
          name: 'Policy 3',
          blobUrl: 'policies/company-123/policy3.md',
        },
      ];

      const mockContent = (index: number) => ({
        policyId: `policy-${index}`,
        text: `Content ${index}`,
      });

      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else {
          const policyIndex = callCount - 1;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockContent(policyIndex)),
          } as any);
        }
      });

      const context = await getPolicyContext();

      expect(context).toContain('---');
      expect(context).toContain('**Policy: Policy 1**');
      expect(context).toContain('**Policy: Policy 2**');
      expect(context).toContain('**Policy: Policy 3**');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge cases', () => {
    it('should handle empty token string', () => {
      const companyId = extractCompanyIdFromTokenExport('');
      expect(companyId).toBeUndefined();
    });

    it('should handle whitespace in token', () => {
      const companyId = extractCompanyIdFromTokenExport('   ');
      expect(companyId).toBeUndefined();
    });

    it('should handle extremely long token', () => {
      const payload = {
        user_company_resourceid: 'company-123',
        largeData: 'x'.repeat(10000),
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      const companyId = extractCompanyIdFromTokenExport(token);
      expect(companyId).toBe('company-123');
    });

    it('should handle special characters in blob URL', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      vi.mocked(getLogger).mockReturnValue(mockLogger as any);

      const payload = {
        user_company_resourceid: 'company-123',
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${payloadBase64}.signature`;

      vi.mocked(getRequestContext).mockReturnValue({
        token,
      } as any);

      const mockPolicies = [
        {
          name: 'Policy with spaces',
          blobUrl: 'policies/company-123/policy%20with%20spaces.md',
        },
      ];

      const mockContent = {
        policyId: 'policy-123',
        text: 'Content',
      };

      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation((_url: any) => {
        callCount++;

        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPolicies),
          } as any);
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockContent),
          } as any);
        }
      });

      const context = await getPolicyContext();
      expect(context).toContain('Policy with spaces');
    });
  });
});
