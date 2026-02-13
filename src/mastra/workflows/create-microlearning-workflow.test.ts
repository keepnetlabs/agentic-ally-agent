import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMicrolearningWorkflow, analyzePromptStep, generateMicrolearningStep, generateLanguageStep, createInboxStep, saveToKVStep } from './create-microlearning-workflow';
import { analyzeUserPromptTool } from '../tools/analysis';
import { generateMicrolearningJsonTool } from '../tools/generation';
import { createInboxStructureTool } from '../tools/inbox';

// Mocks using flattened hoisted object for reliability
const mocks = vi.hoisted(() => ({
  analyzeExecute: vi.fn(),
  genMicrolearningExecute: vi.fn(),
  genLanguageExecute: vi.fn(),
  createInboxExecute: vi.fn(),
  saveMicrolearning: vi.fn(),
  storeMicrolearning: vi.fn(),
  storeLanguageContent: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerDebug: vi.fn()
}));

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
        GOOGLE: 'GOOGLE_GEMINI_2_5_PRO',
      },
      getProvider: (name: string) => name
    }
  };
});

vi.mock('../tools/analysis', () => ({
  analyzeUserPromptTool: {
    execute: mocks.analyzeExecute
  }
}));

vi.mock('../tools/generation', () => ({
  generateMicrolearningJsonTool: {
    execute: mocks.genMicrolearningExecute
  },
  generateLanguageJsonTool: {
    execute: mocks.genLanguageExecute
  }
}));

vi.mock('../tools/inbox', () => ({
  createInboxStructureTool: {
    execute: mocks.createInboxExecute
  }
}));

// Mock Services
vi.mock('../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      saveMicrolearning: mocks.saveMicrolearning
    };
  })
}));

vi.mock('../services/microlearning-service', () => ({
  MicrolearningService: vi.fn().mockImplementation(function () {
    return {
      storeMicrolearning: mocks.storeMicrolearning,
      storeLanguageContent: mocks.storeLanguageContent
    };
  })
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
    debug: mocks.loggerDebug
  })
}));

// Mock consistency utils to avoid delays
vi.mock('../utils/kv-consistency', () => ({
  waitForKVConsistency: vi.fn().mockResolvedValue(true),
  buildExpectedKVKeys: vi.fn().mockReturnValue([])
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn) => fn())
}));

describe('CreateMicrolearningWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup success mocks
    mocks.analyzeExecute.mockResolvedValue({
      success: true,
      data: {
        topic: 'Phishing Awareness',
        title: 'Phishing Awareness',
        learningObjectives: ['Objective 1'],
        keyTopics: ['Topic 1'],
        category: 'Security',
        subCategory: 'Email',
        language: 'en-us'
      }
    });

    mocks.genMicrolearningExecute.mockResolvedValue({
      success: true,
      data: {
        scenes: [
          { id: '1', type: 'intro', content: {} },
          { id: '2', type: 'goals', content: {} }
        ],
        metadata: {
          title: 'Phishing Awareness',
          learningObjectives: ['Objective 1']
        },
        microlearning_metadata: {
          department_relevance: ['IT']
        }
      }
    });

    mocks.genLanguageExecute.mockResolvedValue({
      success: true,
      data: {
        scenes: [
          { id: '1', type: 'intro', content: { text: 'Intro' } }
        ]
      }
    });

    mocks.createInboxExecute.mockResolvedValue({
      success: true,
      data: {
        inboxes: [
          { id: 'inbox-1', address: 'test@example.com' }
        ]
      }
    });

    mocks.saveMicrolearning.mockResolvedValue(true);
    mocks.storeMicrolearning.mockResolvedValue(true);
    mocks.storeLanguageContent.mockResolvedValue(true);
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

    expect(mocks.analyzeExecute).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: 'Create phishing training',
      suggestedDepartment: 'IT'
    }));

    expect(mocks.genMicrolearningExecute).toHaveBeenCalled();
    expect(mocks.genLanguageExecute).toHaveBeenCalled();
    expect(mocks.createInboxExecute).toHaveBeenCalled();

    expect(result.status).toBe('success');

    const output = (result as any).result;
    expect(output).toBeDefined();
    expect(output.metadata.title).toBe('Phishing Awareness');
  });

  it('should skip inbox creation for vishing training', async () => {
    mocks.genMicrolearningExecute.mockResolvedValueOnce({
      success: true,
      data: {
        scenes: [
          { scene_id: '4', metadata: { scene_type: 'vishing_simulation' } }
        ],
        microlearning_metadata: {
          department_relevance: ['IT']
        }
      }
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'Create vishing training', department: 'IT' } });

    expect(mocks.createInboxExecute).not.toHaveBeenCalled();
    expect(mocks.saveMicrolearning).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ inboxContent: undefined }),
      expect.any(String),
      expect.any(String)
    );
    expect(result.status).toBe('success');
  });

  it('should fail if prompt is missing', async () => {
    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: '' } });
    expect(result.status).toBe('failed');
  });

  it('should handle analysis failure', async () => {
    mocks.analyzeExecute.mockResolvedValue({
      success: false,
      error: 'Analysis failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail me' } });
    expect(result.status).toBe('failed');
  });

  it('should handle microlearning generation failure', async () => {
    mocks.genMicrolearningExecute.mockResolvedValue({
      success: false,
      error: 'Generation failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail generation' } });
    expect(result.status).toBe('failed');
  });

  it('should handle language content generation failure', async () => {
    mocks.genLanguageExecute.mockResolvedValue({
      success: false,
      error: 'Language gen failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail language' } });
    expect(result.status).toBe('failed');
  });

  it('should handle inbox creation failure', async () => {
    mocks.createInboxExecute.mockResolvedValue({
      success: false,
      error: 'Inbox failed'
    });

    const run = await createMicrolearningWorkflow.createRunAsync();
    const result = await run.start({ inputData: { prompt: 'fail inbox' } });
    expect(result.status).toBe('failed');
  });
});

describe('Step Execution Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzePromptStep', () => {
    it('should pass correct arguments to analysis tool', async () => {
      mocks.analyzeExecute.mockResolvedValue({ success: true, data: { topic: 'test' } });
      const input = { prompt: 'training', department: 'HR' };
      const result = await (analyzePromptStep as any).execute({ inputData: input });
      expect(mocks.analyzeExecute).toHaveBeenCalledWith(expect.objectContaining({
        userPrompt: 'training',
        suggestedDepartment: 'HR'
      }));
      expect(result.success).toBe(true);
    });

    it('should throw error if analyze tool is not executable', async () => {
      vi.mocked(analyzeUserPromptTool).execute = undefined as any;
      const input = { prompt: 'test' };
      await expect((analyzePromptStep as any).execute({ inputData: input }))
        .rejects.toThrow('Analyze user prompt tool is not executable');
    });
  });

  describe('generateMicrolearningStep', () => {
    it('should generate and enrich microlearning metadata', async () => {
      mocks.genMicrolearningExecute.mockResolvedValue({
        success: true,
        data: {
          microlearning_metadata: { department_relevance: ['Sales'] }
        }
      });
      mocks.storeMicrolearning.mockResolvedValue(true);

      const input = {
        data: { topic: 'test', department: 'IT' },
        modelProvider: 'OPENAI',
        model: 'GPT4'
      };

      const result = await (generateMicrolearningStep as any).execute({ inputData: input });

      expect(mocks.genMicrolearningExecute).toHaveBeenCalled();
      expect(mocks.storeMicrolearning).toHaveBeenCalled();
      // Enriched to include IT (normalized)
      expect(result.data.microlearning_metadata.department_relevance).toContain('it');
    });

    it('should handle "all" department normalization', async () => {
      mocks.genMicrolearningExecute.mockResolvedValue({
        success: true,
        data: { microlearning_metadata: {} }
      });
      const input = {
        data: { topic: 'test', department: 'ALL' },
        modelProvider: 'OPENAI'
      };
      const result = await (generateMicrolearningStep as any).execute({ inputData: input });
      expect(result.data.microlearning_metadata.department_relevance).toContain('all');
    });

    it('should default to "all" if department is missing', async () => {
      mocks.genMicrolearningExecute.mockResolvedValue({
        success: true,
        data: { microlearning_metadata: {} }
      });
      const input = {
        data: { topic: 'test' },
        modelProvider: 'OPENAI'
      };
      const result = await (generateMicrolearningStep as any).execute({ inputData: input });
      expect(result.data.microlearning_metadata.department_relevance).toContain('all');
    });

    it('should throw error if generation tool is not executable', async () => {
      vi.mocked(generateMicrolearningJsonTool).execute = undefined as any;
      const input = { data: { topic: 'test' } };
      await expect((generateMicrolearningStep as any).execute({ inputData: input }))
        .rejects.toThrow('Generate microlearning JSON tool is not executable');
    });
  });

  describe('createInboxStep', () => {
    it('should generate training URL correctly', async () => {
      mocks.createInboxExecute.mockResolvedValue({
        success: true,
        data: { inboxes: [] }
      });

      const input = {
        analysis: { language: 'en-us', department: 'IT', title: 'Test' },
        microlearningStructure: {},
        microlearningId: '123'
      };

      const result = await (createInboxStep as any).execute({ inputData: input });

      expect(result.success).toBe(true);
      expect(result.metadata.trainingUrl).toContain('courseId=123');
      expect(result.metadata.trainingUrl).toContain('langUrl=lang%2Fen-us');
    });

    it('should throw error if inbox tool is not executable', async () => {
      vi.mocked(createInboxStructureTool).execute = undefined as any;
      const input = {
        analysis: { language: 'en-us', department: 'IT', title: 'Test' },
        microlearningStructure: {},
        microlearningId: '123'
      };
      await expect((createInboxStep as any).execute({ inputData: input }))
        .rejects.toThrow('Create inbox structure tool is not executable');
    });

    it('should skip inbox generation when hasInbox is false', async () => {
      const input = {
        analysis: { language: 'en-us', department: 'IT', title: 'No Inbox' },
        microlearningStructure: {},
        microlearningId: 'ml-no-inbox',
        hasInbox: false
      };

      const result = await (createInboxStep as any).execute({ inputData: input });

      expect(mocks.createInboxExecute).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.metadata.trainingUrl).toContain('courseId=ml-no-inbox');
      expect(result.metadata.trainingUrl).not.toContain('inboxUrl=');
    });
  });

  describe('saveToKVStep', () => {
    const languageResult = {
      microlearningId: 'ml-123',
      analysis: { language: 'en', department: 'IT' },
      microlearningStructure: { id: 'ml-123' },
      data: { scenes: [] }
    };
    const inboxResult = {
      data: { inboxes: [] }
    };

    it('should save to KV and verify consistency', async () => {
      const input = {
        'generate-language-content': languageResult,
        'create-inbox-assignment': inboxResult
      };

      const result = await (saveToKVStep as any).execute({ inputData: input });

      expect(mocks.saveMicrolearning).toHaveBeenCalledWith(
        'ml-123',
        expect.objectContaining({
          microlearning: languageResult.microlearningStructure,
          languageContent: languageResult.data,
          inboxContent: inboxResult.data
        }),
        'en',
        'it'
      );
      expect(result).toEqual(inboxResult);
    });

    it('should swallow KV save errors and continue', async () => {
      mocks.saveMicrolearning.mockRejectedValue(new Error('KV connection lost'));
      const input = {
        'generate-language-content': languageResult,
        'create-inbox-assignment': inboxResult
      };

      const result = await (saveToKVStep as any).execute({ inputData: input });

      expect(mocks.loggerWarn).toHaveBeenCalledWith(
        'KV save failed but continuing',
        expect.objectContaining({ message: 'KV connection lost' })
      );
      expect(result).toEqual(inboxResult);
    });

    it('should save without inbox content when hasInbox is false', async () => {
      const input = {
        'generate-language-content': {
          ...languageResult,
          hasInbox: false
        },
        'create-inbox-assignment': { success: true, data: null }
      };

      const result = await (saveToKVStep as any).execute({ inputData: input });

      expect(mocks.saveMicrolearning).toHaveBeenCalledWith(
        'ml-123',
        expect.objectContaining({
          inboxContent: undefined
        }),
        'en',
        'it'
      );
      expect(result).toEqual({ success: true, data: null });
    });

    it('should swallow KV initialization errors and continue', async () => {
      const kvModule = await import('../services/kv-service');
      vi.mocked(kvModule.KVService).mockImplementationOnce(function () {
        throw new Error('KV init failed');
      } as any);

      const input = {
        'generate-language-content': languageResult,
        'create-inbox-assignment': inboxResult
      };

      const result = await (saveToKVStep as any).execute({ inputData: input });

      expect(mocks.loggerWarn).toHaveBeenCalledWith(
        'KV initialization error',
        expect.objectContaining({ message: 'KV init failed' })
      );
      expect(result).toEqual(inboxResult);
    });
  });
});
