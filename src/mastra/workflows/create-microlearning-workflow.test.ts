
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMicrolearningWorkflow } from './create-microlearning-workflow';
import { analyzeUserPromptTool } from '../tools/analysis';
import { generateMicrolearningJsonTool, generateLanguageJsonTool } from '../tools/generation';
import { createInboxStructureTool } from '../tools/inbox';
import { KVService } from '../services/kv-service';
import { MicrolearningService } from '../services/microlearning-service';

// Mock Tools
vi.mock('../constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../constants')>();
  return {
    ...actual,
    MODEL_PROVIDERS: {
      NAMES: ['OPENAI', 'WORKERS_AI', 'GOOGLE'] as const,
      DEFAULTS: {
        OPENAI: 'OPENAI_GPT_4O',
        WORKERS_AI: 'WORKERS_AI_GPT_OSS_120B',
        GOOGLE: 'GOOGLE_GENERATIVE_AI_GEMINI_15',
      },
    }
  };
});

vi.mock('../tools/analysis', () => ({
  analyzeUserPromptTool: {
    execute: vi.fn()
  }
}));

vi.mock('../tools/generation', () => ({
  generateMicrolearningJsonTool: {
    execute: vi.fn()
  },
  generateLanguageJsonTool: {
    execute: vi.fn()
  }
}));

vi.mock('../tools/inbox', () => ({
  createInboxStructureTool: {
    execute: vi.fn()
  }
}));

// Mock Services
vi.mock('../services/kv-service');
vi.mock('../services/microlearning-service'); // Keeps prototype mocking available if needed
vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}));

// Mock consistency utils to avoid delays
vi.mock('../utils/kv-consistency', () => ({
  waitForKVConsistency: vi.fn().mockResolvedValue(true),
  buildExpectedKVKeys: vi.fn().mockReturnValue([])
}));

describe('CreateMicrolearningWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup success mocks
    (analyzeUserPromptTool.execute as any).mockResolvedValue({
      success: true,
      data: {
        topic: 'Phishing Awareness',
        title: 'Phishing Awareness', // Corrected: Added title
        learningObjectives: ['Objective 1'],
        keyTopics: ['Topic 1'],
        category: 'Security',
        subCategory: 'Email',
        language: 'en-us'
      }
    });

    (generateMicrolearningJsonTool.execute as any).mockResolvedValue({
      success: true,
      data: {
        scenes: [
          { id: '1', type: 'intro', content: {} },
          { id: '2', type: 'goals', content: {} }
        ],
        metadata: {
          title: 'Phishing Awareness',
          learningObjectives: ['Objective 1']
        }
      }
    });

    (generateLanguageJsonTool.execute as any).mockResolvedValue({
      success: true,
      data: {
        scenes: [
          { id: '1', type: 'intro', content: { text: 'Intro' } }
        ]
      }
    });

    // Mock createInboxStructureTool to return array of inboxes
    (createInboxStructureTool.execute as any).mockResolvedValue({
      success: true,
      data: {
        inboxes: [
          { id: 'inbox-1', address: 'test@example.com' }
        ]
      }
    });

    // Mock Service calls
    (KVService.prototype.saveMicrolearning as any).mockResolvedValue(true);
    (MicrolearningService.prototype.storeMicrolearning as any).mockResolvedValue(true);
    (MicrolearningService.prototype.storeLanguageContent as any).mockResolvedValue(true);
  });

  it('should execute successfully with valid input', async () => {
    const run = await createMicrolearningWorkflow.createRunAsync();

    const input = {
      prompt: 'Create phishing training',
      department: 'IT',
      writer: { write: vi.fn() }
    };

    const result = await run.start({ inputData: input });

    if (result.status !== 'success') {
      console.log('Workflow failed:', JSON.stringify(result, null, 2));
    }

    expect(analyzeUserPromptTool.execute).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: 'Create phishing training',
      suggestedDepartment: 'IT'
    }));

    expect(generateMicrolearningJsonTool.execute).toHaveBeenCalled();
    expect(generateLanguageJsonTool.execute).toHaveBeenCalled();
    expect(createInboxStructureTool.execute).toHaveBeenCalled();

    expect(result.status).toBe('success');

    const output = (result as any).result;
    expect(output).toBeDefined();
    expect(output.metadata.title).toBe('Phishing Awareness');
  });

  it('should fail if prompt is missing', async () => {
    const run = await createMicrolearningWorkflow.createRunAsync();

    // Pass empty prompt
    const result = await run.start({ inputData: { prompt: '' } });
    expect(result.status).toBe('failed');
  });

  it('should handle analysis failure', async () => {
    (analyzeUserPromptTool.execute as any).mockResolvedValue({
      success: false,
      error: 'Analysis failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();

    const result = await run.start({ inputData: { prompt: 'fail me' } });
    expect(result.status).toBe('failed');
  });

  it('should handle microlearning generation failure', async () => {
    (generateMicrolearningJsonTool.execute as any).mockResolvedValue({
      success: false,
      error: 'Generation failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail generation' } });
    expect(result.status).toBe('failed');
  });

  it('should handle language content generation failure', async () => {
    (generateLanguageJsonTool.execute as any).mockResolvedValue({
      success: false,
      error: 'Language gen failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail language' } });
    expect(result.status).toBe('failed');
  });

  it('should handle inbox creation failure', async () => {
    (createInboxStructureTool.execute as any).mockResolvedValue({
      success: false,
      error: 'Inbox failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail inbox' } });
    expect(result.status).toBe('failed');
  });
});
