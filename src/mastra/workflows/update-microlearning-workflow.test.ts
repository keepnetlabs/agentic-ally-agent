
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMicrolearningWorkflow } from './update-microlearning-workflow';

// Mocks using flattened hoisted object for reliability
const mocks = vi.hoisted(() => ({
  kvGet: vi.fn(),
  kvPut: vi.fn(),
  getWhitelabelingConfig: vi.fn(),
  resolveLogoAndBrand: vi.fn(),
  normalizeThemeBackgroundClass: vi.fn(),
  handleLogoHallucination: vi.fn(),
  waitForKVConsistency: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerDebug: vi.fn()
}));

// Mock Services and Utils
vi.mock('../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      get: mocks.kvGet,
      put: mocks.kvPut
    };
  })
}));

vi.mock('../services/product-service', () => ({
  ProductService: vi.fn().mockImplementation(function () {
    return {
      getWhitelabelingConfig: mocks.getWhitelabelingConfig
    };
  })
}));

vi.mock('../utils/phishing/brand-resolver', () => ({
  resolveLogoAndBrand: mocks.resolveLogoAndBrand
}));

vi.mock('../utils/theme/theme-color-normalizer', () => ({
  normalizeThemeBackgroundClass: mocks.normalizeThemeBackgroundClass
}));

vi.mock('../utils/microlearning/logo-utils', () => ({
  handleLogoHallucination: mocks.handleLogoHallucination
}));

vi.mock('../utils/kv-consistency', () => ({
  waitForKVConsistency: vi.fn().mockResolvedValue(true),
  buildExpectedKVKeys: vi.fn().mockReturnValue([])
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn().mockImplementation((fn) => fn())
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
    debug: mocks.loggerDebug
  })
}));

describe('UpdateMicrolearningWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mocks.kvGet.mockResolvedValue({
      version: 1,
      theme: { colors: { background: 'bg-black' } },
      microlearning_metadata: { language: 'en' }
    });
    mocks.kvPut.mockResolvedValue(true);
    mocks.getWhitelabelingConfig.mockResolvedValue({
      mainLogoUrl: 'https://whitelabel.com/logo.png'
    });
    mocks.resolveLogoAndBrand.mockResolvedValue({ logoUrl: 'https://logo.com/logo.png' });
    mocks.normalizeThemeBackgroundClass.mockResolvedValue('bg-white');
    mocks.handleLogoHallucination.mockImplementation((updates) => updates);
  });

  it('should execute successfully with valid updates', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-123',
      department: 'IT',
      updates: {
        theme: { colors: { background: 'bg-blue-500' } }
      }
    };

    const workflowResult = await run.start({ inputData: input });

    expect(mocks.kvGet).toHaveBeenCalledWith('ml:ml-123:base');
    expect(mocks.kvPut).toHaveBeenCalledTimes(2); // Base + History

    expect(workflowResult.status).toBe('success');

    // Cast to any to access 'result' property which only exists on success status
    const result = (workflowResult as any).result;
    expect(result.success).toBe(true);
    expect(result.status).toContain('updated');
    expect(result.metadata.version).toBe(2);
  });

  it('should fail if microlearning not found', async () => {
    mocks.kvGet.mockResolvedValue(null);

    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'missing-ml',
      updates: {}
    };

    try {
      await run.start({ inputData: input });
    } catch (e: any) {
      expect(e.message).toContain('Microlearning missing-ml not found');
    }
  });

  it('should handle whitelabel logo override', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-123',
      updates: {
        useWhitelabelLogo: true,
        theme: {}
      }
    };

    await run.start({ inputData: input });

    expect(mocks.getWhitelabelingConfig).toHaveBeenCalled();
  });

  it('should handle whitelabel config failure gracefully', async () => {
    mocks.getWhitelabelingConfig.mockRejectedValue(new Error('Config service down'));
    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-123',
      updates: {
        useWhitelabelLogo: true,
        theme: {}
      }
    };

    const workflowResult = await run.start({ inputData: input });
    expect(workflowResult.status).toBe('success');
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to apply whitelabel logo',
      expect.objectContaining({ message: 'Config service down' })
    );
  });

  it('should resolve and apply external brand logo', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-brand-test',
      updates: {
        brandName: 'NewBrand',
        theme: {}
      }
    };

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.success).toBe(true);
    expect(result.metadata.changes['theme.logo'].src).toBe('https://logo.com/logo.png');
  });

  it('should resolve brand from nested theme property', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-nested-brand',
      updates: {
        theme: {
          brandName: 'NestedBrand'
        }
      }
    } as any;

    await run.start({ inputData: input });
    expect(mocks.resolveLogoAndBrand).toHaveBeenCalledWith(
      'NestedBrand',
      expect.stringContaining('NestedBrand'),
      expect.anything()
    );
  });

  it('should handle KV save failure gracefully', async () => {
    mocks.kvPut.mockResolvedValue(false);

    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-save-fail',
      updates: { theme: {} }
    };

    const workflowResult = await run.start({ inputData: input });

    const result = (workflowResult as any).result;
    expect(result.success).toBe(false);
    expect(result.status).toBe('Update failed');
  });

  it('should normalize theme background color', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-color-test',
      updates: {
        theme: {
          colors: { background: 'raw-red' }
        }
      }
    };

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.success).toBe(true);
    expect(result.metadata.changes['theme.colors'].background).toBe('bg-white');
  });

  it('should warn when whitelabel logo is requested but config has no mainLogoUrl', async () => {
    mocks.getWhitelabelingConfig.mockResolvedValueOnce({});

    const run = await updateMicrolearningWorkflow.createRunAsync();
    const input = {
      microlearningId: 'ml-whitelabel-empty',
      updates: {
        useWhitelabelLogo: true,
        theme: {}
      }
    };

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.success).toBe(true);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'useWhitelabelLogo requested but no config found',
      expect.objectContaining({ microlearningId: 'ml-whitelabel-empty' })
    );
  });

  it('should warn when external brand resolution returns no logo URL', async () => {
    mocks.resolveLogoAndBrand.mockResolvedValueOnce({ logoUrl: '' });

    const run = await updateMicrolearningWorkflow.createRunAsync();
    const input = {
      microlearningId: 'ml-brand-no-logo',
      updates: {
        brandName: 'NoLogoBrand',
        theme: {}
      }
    };

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.success).toBe(true);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Brand resolution returned no logo URL',
      expect.objectContaining({ brand: 'NoLogoBrand' })
    );
  });

  it('should enter no-brand branch and emit debug log when no brand update is provided', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();
    const input = {
      microlearningId: 'ml-no-brand-update',
      updates: {
        theme: {
          colors: { background: 'bg-green-500' }
        }
      }
    };

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.success).toBe(true);
    expect(mocks.loggerDebug).toHaveBeenCalledWith(
      'No brand updates detected',
      expect.any(Object)
    );
  });

  it('should fallback language and department when missing from content and input', async () => {
    mocks.kvGet.mockResolvedValueOnce({
      version: 3,
      theme: { colors: { background: 'bg-black' } },
      microlearning_metadata: {}
    });

    const run = await updateMicrolearningWorkflow.createRunAsync();
    const input = {
      microlearningId: 'ml-lang-dept-fallback',
      updates: { theme: {} }
    } as any;

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.success).toBe(true);
    expect(result.metadata.trainingUrl).toContain('lang%2Fen');
    expect(result.metadata.trainingUrl).toContain('inbox%2Fall');
  });

  it('should perform deep merge of nested theme updates', async () => {
    mocks.kvGet.mockResolvedValue({
      version: 1,
      theme: {
        colors: { background: 'bg-black', text: 'text-white' },
        logo: { src: 'old.png' }
      },
      microlearning_metadata: { language: 'en' }
    });

    const run = await updateMicrolearningWorkflow.createRunAsync();
    const input = {
      microlearningId: 'ml-deep-merge',
      updates: {
        theme: {
          colors: { background: 'bg-red-500' }
        }
      }
    };

    const workflowResult = await run.start({ inputData: input });
    const result = (workflowResult as any).result;

    expect(result.metadata.changes['theme.colors']).toEqual({ background: 'bg-white' });
    const basePutCall = mocks.kvPut.mock.calls.find(c => c?.[0]?.endsWith(':base'));
    expect(basePutCall?.[1]?.theme?.colors?.text).toBe('text-white');
  });

  it('should track version history entry with changes', async () => {
    const run = await updateMicrolearningWorkflow.createRunAsync();
    const input = {
      microlearningId: 'ml-history-test',
      updates: { theme: { colors: { background: 'blue' } } }
    } as any;

    await run.start({ inputData: input });

    const historyPutCall = mocks.kvPut.mock.calls.find(c => c?.[0]?.includes(':history:'));
    expect(historyPutCall).toBeDefined();
    expect(historyPutCall?.[1]).toMatchObject({
      action: 'updated',
      version: 2
    });
  });
});
