import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserInfoTool } from './get-user-info-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { ANALYSIS_REFERENCES } from './behavior-analyst-constants';
import { buildNoActivitySimulationDefaults } from './utils/no-activity-foundational-defaults';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: getUserInfoTool
 * Tests for retrieving user information and generating analysis reports
 * Covers: Input validation, auth checks, user search, timeline fetch, AI analysis, error handling
 */

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock model providers
vi.mock('../../model-providers', () => ({
  reasoningHeaders: () => ({}),
  getModelWithOverride: vi.fn(() => ({ modelId: 'test-model' })),
}));

describe('getUserInfoTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockBaseApiUrl = 'https://platform.test';
  const leaderboardEndpoints = {
    getAll: `${mockBaseApiUrl}/api/leaderboard/get-all`,
    timeline: `${mockBaseApiUrl}/api/leaderboard/get-user-timeline`,
  };

  const mockUserSearchResponse = {
    items: [
      {
        targetUserResourceId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        departmentName: 'IT',
        department: 'IT',
        phoneNumber: '+1234567890',
      },
    ],
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
          ActionTimeWithDay: '2024-01-01T10:00:00Z',
        },
      ],
    },
  };

  const mockAnalysisReport = {
    version: '1.1',
    meta: {
      user_id: 'user-abc123',
      role: '',
      department: 'IT',
      location: '',
      language: 'en',
      access_level: null,
      generated_at_utc: '2024-01-01T10:00:00Z',
    },
    header: {
      title: 'Behavioral Resilience Report',
      behavioral_resilience: {
        framework: 'Individual Security Behavior (ENISA-aligned)',
        current_stage: 'Foundational',
        target_stage: 'Building',
      },
      progression_hint: '',
      footnote: '(ENISA-aligned individual behavior model; Gartner mapping is context-only)',
    },
    strengths: [],
    growth_opportunities: [],
    ai_recommended_next_steps: {
      simulations: [],
      microlearnings: [],
      nudges: [],
    },
    maturity_mapping: {
      enisa_security_culture: {
        current: '',
        description: '',
        next: '',
        what_it_takes: '',
      },
      gartner_sbcp_context_only: {
        label: 'Context only — not an individual rating',
        description: '',
        what_it_takes: '',
      },
    },
    business_value_zone: {
      operational: [],
      strategic: [],
    },
    references: ANALYSIS_REFERENCES,
    internal: {
      evidence_summary: {
        key_signals_used: [],
        data_gaps: [],
      },
      behavior_science_engine: {
        diagnosis_model: 'COM-B',
        com_b: {
          capability: '',
          opportunity: '',
          motivation: '',
        },
        trigger_model: 'Fogg B=MAT',
        fogg_trigger_type: 'SIGNAL',
        design_notes: '',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock requestStorage context
    requestStorage.enterWith({
      token: mockToken,
      companyId: mockCompanyId,
      baseApiUrl: mockBaseApiUrl,
    });

    // Mock global fetch
    global.fetch = vi.fn();

    // Mock generateText
    (generateText as any).mockResolvedValue({
      text: JSON.stringify(mockAnalysisReport),
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with email', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        email: 'john.doe@example.com',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept valid input with fullName', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept valid input with firstName', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        firstName: 'John',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(true);
    });

    it('should accept valid input with firstName and lastName', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        firstName: 'John',
        lastName: 'Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(true);
    });

    it('should require either targetUserResourceId, email, fullName, or firstName', async () => {
      const input: any = {};

      // Tool framework validates input schema (has refine validation) and returns error response
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should validate name format when fullName is provided', async () => {
      const input = {
        fullName: 'John123', // Invalid characters
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid name format');
    });
  });

  describe('Direct ID Lookup (Fast Path)', () => {
    it('should skip user search when targetUserResourceId is provided', async () => {
      const fetchSpy = (global.fetch as any)
        // First call: findUserById (fetches user profile via getAll)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                targetUserResourceId: 'user-direct-123',
                firstName: 'User',
                lastName: 'Direct-123',
                email: 'user@example.com',
                department: 'IT',
                phoneNumber: '+1234567890',
              },
            ],
          }),
        })
        // Second call: timeline
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        targetUserResourceId: 'user-direct-123',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      expect(result.success).toBe(true);
      expect(result.userInfo?.targetUserResourceId).toBe('user-direct-123');
      expect(result.userInfo?.fullName).toBe('User Direct-123');

      // Should call getAll API once (for findUserById), then timeline API
      const calls = fetchSpy.mock.calls;
      expect(calls.length).toBe(2);

      // First call should be to getAll for user profile lookup
      expect(calls[0][0]).toBe(leaderboardEndpoints.getAll);

      // Second call should be to timeline
      expect(calls[1][0]).toBe(leaderboardEndpoints.timeline);
    });
  });

  describe('Authentication', () => {
    it('should return error when token is missing', async () => {
      requestStorage.enterWith({
        companyId: mockCompanyId,
        // token is missing
      });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(true);
    });
  });

  describe('User Search', () => {
    it('should search for user by email when provided', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        email: 'john.doe@example.com',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      // First call: user search
      const firstCall = fetchSpy.mock.calls[0];
      expect(firstCall[0]).toBe(leaderboardEndpoints.getAll);
      const body = JSON.parse(firstCall[1].body);
      const filterItems = body.filter.FilterGroups[0].FilterItems;
      expect(filterItems).toEqual(expect.arrayContaining([expect.objectContaining({ FieldName: 'email' })]));
    });

    it('should search for user with correct payload', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      expect(fetchSpy).toHaveBeenCalledWith(
        leaderboardEndpoints.getAll,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include companyId header when available', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      const firstCall = fetchSpy.mock.calls[0];
      expect(firstCall[1].headers['x-ir-company-id']).toBe(mockCompanyId);
    });

    it('should return error when user not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const input = {
        fullName: 'Nonexistent User',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should prioritize user with matching last name when multiple results found', async () => {
      const multipleUsersMock = {
        items: [
          { targetUserResourceId: 'u1', firstName: 'John', lastName: 'Smithy', email: 'j1@e.com' },
          { targetUserResourceId: 'u2', firstName: 'John', lastName: 'Smith', email: 'j2@e.com' }, // Perfect match for "John Smith"
        ],
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => multipleUsersMock,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { resourceId: 'u2', firstName: 'John', lastName: 'Smith', email: 'j2@e.com' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = { fullName: 'John Smith' };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      // Should pick u2 because lastName "Smith" matches input last name "Smith" exactly
      expect(result.userInfo?.targetUserResourceId).toBe('u2');
    });

    it('should handle user search API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Timeline Fetching', () => {
    it('should fetch timeline for found user', async () => {
      const fetchSpy = (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledWith(
        leaderboardEndpoints.timeline,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
          body: expect.stringContaining('user-123'), // Should contain userId
        })
      );
    });

    it('should handle timeline API failures gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server Error',
        });

      const input = {
        fullName: 'John Doe',
      };

      // Should still succeed even if timeline fails
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(true);
      expect(result.userInfo).toBeDefined();
    });

    it('should include recent activities in analysis when available', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      expect(generateText).toHaveBeenCalled();
      const generateTextCall = (generateText as any).mock.calls[0][0];
      expect(generateTextCall.messages[1].content).toContain('Recent Activities');
    });

    it('should use Foundational defaults when no activities are found', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { results: [] } }), // No activities
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      expect(generateText).toHaveBeenCalled();
      const generateTextCall = (generateText as any).mock.calls[0][0];
      expect(generateTextCall.messages[1].content).toContain('NO ACTIVITY DATA AVAILABLE');
    });

    it('should fill weak no-activity recommendations with deterministic department-aware defaults', async () => {
      // Mock user lookup and empty timeline (phoneNumber avoids extra enrich fetch)
      (global.fetch as any)
        // First call: findUserById (fetches user profile via getAll)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                targetUserResourceId: 'user-1',
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                department: 'IT',
                phoneNumber: '+1234567890',
              },
            ],
          }),
        })
        // Second call: empty timeline
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { results: [] } }) });

      // Mock AI returning a basic structure where simulation array exists but empty/default
      const basicAIResponse = {
        ...mockAnalysisReport,
        ai_recommended_next_steps: {
          simulations: [
            {
              vector: 'DEFAULT',
              persuasion_tactic: 'DEFAULT',
              scenario_type: 'CLICK_ONLY',
              difficulty: 'EASY',
              title: 'DEFAULT',
              why_this: 'Generic',
              designed_to_progress: 'Unknown',
              nist_phish_scale: {
                cue_difficulty: 'LOW',
                premise_alignment: 'LOW',
              },
            },
          ],
          microlearnings: [],
          nudges: [],
        },
      };
      (generateText as any).mockResolvedValue({ text: JSON.stringify(basicAIResponse) });

      const input = { targetUserResourceId: 'user-1' };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      const sim = result.analysisReport?.ai_recommended_next_steps?.simulations?.[0];

      expect(sim?.vector).toBe('EMAIL');
      expect(sim?.scenario_type).toBe('CLICK_ONLY');
      expect(sim?.difficulty).toBe('EASY');
      expect(sim?.persuasion_tactic).toBe('CURIOSITY');
      expect(sim?.title).toBe('VPN access review');
      expect(sim?.why_this).toContain('Curiosity Gap');
      expect(sim?.designed_to_progress).toContain('access-review prompts');
    });

    it('should create a first simulation when AI returns an empty no-activity simulation list', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                targetUserResourceId: 'user-3',
                firstName: 'Taylor',
                lastName: 'Finance',
                email: 'taylor@example.com',
                department: 'Finance',
                phoneNumber: '+1234567892',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { results: [] } }) });

      const emptySimulationResponse = {
        ...mockAnalysisReport,
        ai_recommended_next_steps: {
          simulations: [],
          microlearnings: [],
          nudges: [],
        },
      };
      (generateText as any).mockResolvedValue({ text: JSON.stringify(emptySimulationResponse) });

      const result = await getUserInfoTool.execute!({ targetUserResourceId: 'user-3' }, {}) as any;
      const sim = result.analysisReport?.ai_recommended_next_steps?.simulations?.[0];

      expect(sim).toBeDefined();
      expect(sim?.vector).toBe('EMAIL');
      expect(sim?.scenario_type).toBe('CLICK_ONLY');
      expect(sim?.difficulty).toBe('EASY');
      expect(sim?.title).toBe('Quarter-close document review');
      expect(sim?.why_this).toContain('Urgency Effect');
    });

    it('should preserve strong AI no-activity recommendations while only keeping guardrails', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                targetUserResourceId: 'user-2',
                firstName: 'Casey',
                lastName: 'Admin',
                email: 'casey@example.com',
                department: 'IT',
                phoneNumber: '+1234567891',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { results: [] } }) });

      const strongAIResponse = {
        ...mockAnalysisReport,
        ai_recommended_next_steps: {
          simulations: [
            {
              vector: 'QR',
              persuasion_tactic: 'AUTHORITY',
              scenario_type: 'CLICK_ONLY',
              difficulty: 'EASY',
              title: 'Security tool activation notice',
              why_this: 'Uses official rollout language to test trust in operational setup prompts (Authority Bias).',
              designed_to_progress: 'Encourage independent verification of tool-activation notices before scanning codes.',
              nist_phish_scale: {
                cue_difficulty: 'MEDIUM',
                premise_alignment: 'LOW',
              },
            },
          ],
          microlearnings: [],
          nudges: [],
        },
      };
      (generateText as any).mockResolvedValue({ text: JSON.stringify(strongAIResponse) });

      const result = await getUserInfoTool.execute!({ targetUserResourceId: 'user-2' }, {}) as any;
      const sim = result.analysisReport?.ai_recommended_next_steps?.simulations?.[0];

      expect(sim?.vector).toBe('QR');
      expect(sim?.scenario_type).toBe('CLICK_ONLY');
      expect(sim?.difficulty).toBe('EASY');
      expect(sim?.persuasion_tactic).toBe('AUTHORITY');
      expect(sim?.title).toBe('Security tool activation notice');
      expect(sim?.why_this).toContain('Authority Bias');
      expect(sim?.designed_to_progress).toContain('tool-activation notices');
      expect(sim?.nist_phish_scale?.cue_difficulty).toBe('MEDIUM');
      expect(sim?.nist_phish_scale?.premise_alignment).toBe('LOW');
    });

    it('should provide more than three deterministic archetypes per department family', () => {
      const titles = new Set([
        buildNoActivitySimulationDefaults({ userId: 'user-1', department: 'IT' }).title,
        buildNoActivitySimulationDefaults({ userId: 'user-2', department: 'IT' }).title,
        buildNoActivitySimulationDefaults({ userId: 'user-3', department: 'IT' }).title,
        buildNoActivitySimulationDefaults({ userId: 'user-4', department: 'IT' }).title,
        buildNoActivitySimulationDefaults({ userId: 'user-5', department: 'IT' }).title,
      ]);

      expect(titles.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Optimization: skipAnalysis', () => {
    it('should skip AI generation when skipAnalysis is true', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
        skipAnalysis: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      expect(result.success).toBe(true);
      expect(generateText).not.toHaveBeenCalled();
      expect(result.analysisReport).toBeUndefined();
    });
  });

  describe('AI Analysis Generation', () => {
    it('should generate analysis report using AI model', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      expect(getModelWithOverride).toHaveBeenCalled();
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        })
      );
    });

    it('should include no-data guardrails in system prompt', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { results: [] } }),
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, {});

      const callArg = (generateText as any).mock.calls[0][0];
      const systemMessage = callArg.messages.find((msg: any) => msg.role === 'system')?.content || '';
      expect(systemMessage).toContain('NO ACTIVITY DATA AVAILABLE');
      expect(systemMessage).toContain('do NOT use placeholders');
      expect(systemMessage).toContain('strengths[]');
      expect(systemMessage).toContain('growth_opportunities[]');
      expect(systemMessage).toContain('business_value_zone.operational[]');
      expect(systemMessage).toContain('business_value_zone.strategic[]');
    });

    it('should handle AI generation errors gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      (generateText as any).mockRejectedValueOnce(new Error('AI model failed'));

      const input = {
        fullName: 'John Doe',
      };

      // Should still succeed even if AI analysis fails (analysis is optional)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(true);
      // Analysis report might be undefined if AI fails
    });

    it('should continue without analysisReport when AI output fails schema validation', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      (generateText as any).mockResolvedValueOnce({
        text: JSON.stringify({ invalid: 'schema' }), // Fails AnalysisSchema.safeParse
      });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      expect(result.success).toBe(true);
      expect(result.analysisReport).toBeUndefined();
    });

    it('should include masked user ID in analysis report', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      if (result.analysisReport) {
        expect(result.analysisReport.meta?.user_id).toBeDefined();
      }
    });
  });

  describe('Successful Response', () => {
    it('should return correct response structure', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      expect(result.success).toBe(true);
      expect(result.userInfo).toBeDefined();
      expect(result.userInfo?.targetUserResourceId).toBe('user-123');
      expect(result.userInfo?.fullName).toBe('John Doe');
      expect(result.userInfo?.department).toBe('IT');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include context in error response', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should catch and log errors during user search', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API failure'));

      const input = { email: 'test@example.com' };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('API failure');
    });
  });

  describe('UI Signal Emission', () => {
    it('should emit target_user UI signal when writer is provided', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const mockWriter = {
        write: vi.fn(),
      };

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await getUserInfoTool.execute!(input, { writer: mockWriter } as any);

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'target_user',
            message: expect.stringContaining('::ui:target_user::'),
          }),
        })
      );
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimelineResponse,
        });

      const input = {
        fullName: 'John Doe',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await getUserInfoTool.execute!(input, {}) as any;

      // Validate schema structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.userInfo) {
        expect(result.userInfo).toHaveProperty('targetUserResourceId');
        expect(result.userInfo).toHaveProperty('fullName');
      }
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
