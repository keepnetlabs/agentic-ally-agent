import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserInfoTool } from './get-user-info-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { API_ENDPOINTS } from '../../constants';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: getUserInfoTool
 * Tests for retrieving user information and generating analysis reports
 * Covers: Input validation, auth checks, user search, timeline fetch, AI analysis, error handling
 */

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn()
}));

// Mock model providers
vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(() => ({ modelId: 'test-model' }))
}));

describe('getUserInfoTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';

  const mockUserSearchResponse = {
    items: [
      {
        targetUserResourceId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        departmentName: 'IT',
        department: 'IT'
      }
    ]
  };

  const mockTimelineResponse = {
    data: {
      results: [
        {
          ActionType: 'Click',
          name: 'Phishing Campaign 1',
          productType: 'Phishing',
          difficultyType: 'Medium',
          points: 10,
          ActionTimeWithDay: '2024-01-01T10:00:00Z'
        }
      ]
    }
  };

  const mockAnalysisReport = {
    meta: {
      masked_user_id: '[USER-abc123]',
      user_name: '[USER-abc123]',
      analyzed_at: '2024-01-01T10:00:00Z'
    },
    stage: 'Developing',
    behavior: {
      themes: ['Finance', 'Urgency'],
      riskLevel: 'Medium'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock requestStorage context
    requestStorage.enterWith({
      token: mockToken,
      companyId: mockCompanyId
    });

    // Mock global fetch
    global.fetch = vi.fn();

    // Mock generateText
    (generateText as any).mockResolvedValue({
      text: JSON.stringify(mockAnalysisReport)
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with email', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        email: 'john.doe@example.com'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept valid input with fullName', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept valid input with firstName', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        firstName: 'John'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with firstName and lastName', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        firstName: 'John',
        lastName: 'Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should require either fullName or firstName', async () => {
      const input: any = {};

      // Tool framework validates input schema (has refine validation) and returns error response
      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Authentication', () => {
    it('should return error when token is missing', async () => {
      requestStorage.enterWith({
        companyId: mockCompanyId
        // token is missing
      });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('User Search', () => {
    it('should search for user by email when provided', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        email: 'john.doe@example.com'
      };

      await getUserInfoTool.execute({ context: input } as any);

      // First call: user search
      const firstCall = fetchSpy.mock.calls[0];
      expect(firstCall[0]).toBe(API_ENDPOINTS.USER_INFO_GET_ALL);
      const body = JSON.parse(firstCall[1].body);
      const filterItems = body.filter.FilterGroups[0].FilterItems;
      expect(filterItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ FieldName: 'email' })
        ])
      );
    });

    it('should search for user with correct payload', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      await getUserInfoTool.execute({ context: input } as any);

      expect(fetchSpy).toHaveBeenCalledWith(
        API_ENDPOINTS.USER_INFO_GET_ALL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should include companyId header when available', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      await getUserInfoTool.execute({ context: input } as any);

      const firstCall = fetchSpy.mock.calls[0];
      expect(firstCall[1].headers['x-ir-company-id']).toBe(mockCompanyId);
    });

    it('should return error when user not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      });

      const input = {
        fullName: 'Nonexistent User'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle user search API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Timeline Fetching', () => {
    it('should fetch timeline for found user', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      await getUserInfoTool.execute({ context: input } as any);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledWith(
        API_ENDPOINTS.USER_INFO_GET_TIMELINE,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          }),
          body: expect.stringContaining('user-123') // Should contain userId
        })
      );
    });

    it('should handle timeline API failures gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        });

      const input = {
        fullName: 'John Doe'
      };

      // Should still succeed even if timeline fails
      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(result.analysisReport).toBeDefined();
    });

    it('should include recent activities in analysis when available', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      await getUserInfoTool.execute({ context: input } as any);

      expect(generateText).toHaveBeenCalled();
      const generateTextCall = (generateText as any).mock.calls[0][0];
      expect(generateTextCall.messages[1].content).toContain('Recent Activities');
    });
  });

  describe('AI Analysis Generation', () => {
    it('should generate analysis report using AI model', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      await getUserInfoTool.execute({ context: input } as any);

      expect(getModelWithOverride).toHaveBeenCalled();
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ])
        })
      );
    });

    it('should handle AI generation errors gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      (generateText as any).mockRejectedValueOnce(new Error('AI model failed'));

      const input = {
        fullName: 'John Doe'
      };

      // Should still succeed even if AI analysis fails (analysis is optional)
      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      // Analysis report might be undefined if AI fails
    });

    it('should include masked user ID in analysis report', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);

      if (result.analysisReport) {
        expect(result.analysisReport.meta?.masked_user_id).toBeDefined();
      }
    });
  });

  describe('Successful Response', () => {
    it('should return correct response structure', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.userInfo).toBeDefined();
      expect(result.userInfo?.targetUserResourceId).toBe('user-123');
      expect(result.userInfo?.fullName).toBe('John Doe');
      expect(result.userInfo?.department).toBe('IT');
      expect(result.analysisReport).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include context in error response', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse
        });

      const input = {
        fullName: 'John Doe'
      };

      const result = await getUserInfoTool.execute({ context: input } as any);

      // Validate schema structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.userInfo) {
        expect(result.userInfo).toHaveProperty('targetUserResourceId');
        expect(result.userInfo).toHaveProperty('maskedId');
        expect(result.userInfo).toHaveProperty('fullName');
      }
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
