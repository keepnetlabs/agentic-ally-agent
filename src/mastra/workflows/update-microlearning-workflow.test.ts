
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMicrolearningWorkflow } from './update-microlearning-workflow';
import { KVService } from '../services/kv-service';
import { ProductService } from '../services/product-service';

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
    // Based on the mock for resolveLogoAndBrand at top of file
    expect(result.metadata.changes['theme.logo'].src).toBe('https://logo.com/logo.png');
  });

  it('should handle KV save failure gracefully', async () => {
    // Mock save failure for this specific test
    mocks.kvPut.mockResolvedValue(false);

    const run = await updateMicrolearningWorkflow.createRunAsync();

    const input = {
      microlearningId: 'ml-save-fail',
      updates: { theme: {} }
    };

    const workflowResult = await run.start({ inputData: input });

    // The workflow itself might not throw but return specific error structure depending on implementation
    // Reading source: it returns { success: false, status: 'Update failed', error: ... }
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
    // Mock returns 'bg-white'
    expect(result.metadata.changes['theme.colors'].background).toBe('bg-white');
  });
});
