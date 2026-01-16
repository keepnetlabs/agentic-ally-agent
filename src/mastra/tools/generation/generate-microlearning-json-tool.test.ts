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
});
