import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock dependency modules
vi.mock('ai', () => ({
  generateText: vi.fn()
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}));

vi.mock('./utils/microlearning-generator', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    generateMicrolearningJsonWithAI: vi.fn()
  };
});

// Import the tool AFTER mocks are defined
import { generateMicrolearningJsonTool } from './generate-microlearning-json-tool';
import { generateMicrolearningJsonWithAI } from './utils/microlearning-generator';

describe('generateMicrolearningJsonTool', () => {
  const mockModel = { provider: 'OPENAI', modelId: 'gpt-4o-mini' };

  const baseInput = {
    analysis: {
      title: 'Phishing Awareness',
      category: 'Cybersecurity',
      subcategory: 'Phishing',
      industries: ['IT'],
      department: 'All',
      roles: ['Employee'],
      topic: 'Email Safety',
      level: 'beginner',
      language: 'en',
      learningObjectives: ['Spot phishing emails'],
      duration: 5,
      additionalContext: 'Focus on recent trends',
      description: 'Test description',
      themeColor: 'blue'
    },
    microlearningId: 'ml-123',
    model: mockModel,
    policyContext: 'Company policy on email'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate microlearning JSON successfully', async () => {
    const mockOutput = {
      microlearning_id: 'ml-123',
      microlearning_metadata: { title: 'Enhanced Title' }
    };

    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const result = await (generateMicrolearningJsonTool as any).execute(baseInput);

    expect(generateMicrolearningJsonWithAI).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockOutput);
  });

  it('should handle AI generation error gracefully', async () => {
    // Specifically mock the utility to THROW so we hit the tool's catch block
    (generateMicrolearningJsonWithAI as any).mockRejectedValue(new Error('AI failed'));

    const result = await (generateMicrolearningJsonTool as any).execute(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should pass policy context to generator', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const inputWithPolicy = {
      ...baseInput,
      policyContext: 'Company security policy for phishing'
    };

    await (generateMicrolearningJsonTool as any).execute(inputWithPolicy);

    expect(generateMicrolearningJsonWithAI).toHaveBeenCalledWith(
      inputWithPolicy.analysis,
      inputWithPolicy.microlearningId,
      inputWithPolicy.model,
      'Company security policy for phishing'
    );
  });

  it('should handle missing optional policy context', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const inputWithoutPolicy = {
      ...baseInput,
      policyContext: undefined
    };

    const result = await (generateMicrolearningJsonTool as any).execute(inputWithoutPolicy);

    expect(result.success).toBe(true);
  });

  it('should validate model parameter', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    await (generateMicrolearningJsonTool as any).execute(baseInput);

    expect(generateMicrolearningJsonWithAI).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      mockModel,
      expect.any(String)
    );
  });

  it('should handle different languages', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const turkishInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, language: 'tr' }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(turkishInput);

    expect(result.success).toBe(true);
  });

  it('should handle different difficulty levels', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const advancedInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, level: 'advanced' }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(advancedInput);

    expect(result.success).toBe(true);
  });

  it('should handle multiple industries', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const multiIndustryInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, industries: ['IT', 'Finance', 'Healthcare'] }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(multiIndustryInput);

    expect(result.success).toBe(true);
  });

  it('should handle multiple roles', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const multiRoleInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, roles: ['Employee', 'Manager', 'Admin'] }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(multiRoleInput);

    expect(result.success).toBe(true);
  });

  it('should handle regulation compliance requirements', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const complianceInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, regulationCompliance: ['GDPR', 'HIPAA', 'SOC2'] }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(complianceInput);

    expect(result.success).toBe(true);
  });

  it('should handle empty additional context', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const noContextInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, additionalContext: undefined }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(noContextInput);

    expect(result.success).toBe(true);
  });

  it('should handle long additional context', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const longContext = 'A'.repeat(4000); // Within 5000 char limit
    const longContextInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, additionalContext: longContext }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(longContextInput);

    expect(result.success).toBe(true);
  });

  it('should return error when AI service is unavailable', async () => {
    (generateMicrolearningJsonWithAI as any).mockRejectedValue(new Error('Service unavailable'));

    const result = await (generateMicrolearningJsonTool as any).execute(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  it('should handle different duration values', async () => {
    const mockOutput = { microlearning_id: 'ml-123', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const shortDurationInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, duration: 3 }
    };

    const result = await (generateMicrolearningJsonTool as any).execute(shortDurationInput);

    expect(result.success).toBe(true);
  });

  it('should pass microlearningId correctly', async () => {
    const mockOutput = { microlearning_id: 'custom-id-456', microlearning_metadata: {} };
    (generateMicrolearningJsonWithAI as any).mockResolvedValue(mockOutput);

    const customIdInput = {
      ...baseInput,
      microlearningId: 'custom-id-456'
    };

    await (generateMicrolearningJsonTool as any).execute(customIdInput);

    expect(generateMicrolearningJsonWithAI).toHaveBeenCalledWith(
      expect.any(Object),
      'custom-id-456',
      expect.any(Object),
      expect.any(String)
    );
  });

  it('should handle network timeout errors', async () => {
    (generateMicrolearningJsonWithAI as any).mockRejectedValue(new Error('Network timeout'));

    const result = await (generateMicrolearningJsonTool as any).execute(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network timeout');
  });
});
