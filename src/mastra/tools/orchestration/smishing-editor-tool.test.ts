import { describe, it, expect, beforeEach, vi } from 'vitest';
import { smishingEditorTool } from './smishing-editor-tool';
import '../../../../src/__tests__/setup';
import { detectAndResolveBrand } from './phishing-editor-utils';

const executeTool = (smishingEditorTool as any).execute;
const mockGetWhitelabelingConfig = vi.hoisted(() => vi.fn());

vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(() => ({ modelId: 'test-model' })),
}));

vi.mock('../../services/product-service', () => ({
  ProductService: class {
    getWhitelabelingConfig = mockGetWhitelabelingConfig;
  },
}));

vi.mock('./phishing-editor-utils', () => ({
  detectAndResolveBrand: vi.fn().mockResolvedValue({
    brandContext: '',
    resolvedBrandInfo: null,
  }),
}));

vi.mock('./smishing-editor-llm', () => ({
  createSmsEditPromise: vi.fn().mockResolvedValue({ text: '{"messages":["m1"],"summary":"ok"}' }),
  createLandingEditPromises: vi
    .fn()
    .mockReturnValue([
      Promise.resolve({ text: '{"type":"login","template":"<html>ok</html>","edited":true,"summary":"lp"}' }),
    ]),
}));

vi.mock('./smishing-editor-helpers', () => ({
  loadSmishingContent: vi.fn().mockResolvedValue({
    success: true,
    content: {
      sms: { messages: ['old'] },
      landing: { pages: [{ type: 'login', template: '<html>old</html>' }] },
      smsKey: 'smishing:smishing-123:sms:en-gb',
      landingKey: 'smishing:smishing-123:landing:en-gb',
    },
  }),
  parseAndValidateSmsResponse: vi.fn().mockReturnValue({
    success: true,
    sms: { messages: ['m1'], summary: 'ok' },
  }),
  processLandingPageResults: vi.fn().mockResolvedValue({
    pages: [{ type: 'login', template: '<html>new</html>', summary: 'lp' }],
    summary: 'lp',
  }),
  streamEditResultsToUI: vi.fn().mockResolvedValue(undefined),
  saveSmishingContent: vi.fn().mockResolvedValue(undefined),
}));

describe('smishingEditorTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWhitelabelingConfig.mockResolvedValue({ mainLogoUrl: '' });
  });

  it('should accept valid input and return success', async () => {
    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Make it shorter',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
  });

  it('should return error when content not found', async () => {
    const helpers = await import('./smishing-editor-helpers');
    (helpers.loadSmishingContent as any).mockResolvedValueOnce({
      success: false,
      error: 'not found',
    });

    const input = {
      smishingId: 'missing',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Template not found');
  });

  it('should edit SMS only when instruction says sms only', async () => {
    const llm = await import('./smishing-editor-llm');

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'sms only update tone',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
    expect(llm.createSmsEditPromise).toHaveBeenCalled();
    expect(llm.createLandingEditPromises).not.toHaveBeenCalled();
  });

  it('should edit landing only when instruction says landing only', async () => {
    const llm = await import('./smishing-editor-llm');

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'landing page only update text',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
    expect(llm.createSmsEditPromise).not.toHaveBeenCalled();
    expect(llm.createLandingEditPromises).toHaveBeenCalled();
  });

  it('should stream edits when writer is provided', async () => {
    const helpers = await import('./smishing-editor-helpers');
    const writer = { write: vi.fn().mockResolvedValue(undefined) };

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input, writer } as any);
    expect(result.success).toBe(true);
    expect(helpers.streamEditResultsToUI).toHaveBeenCalled();
  });

  it('should handle SMS parse errors', async () => {
    const helpers = await import('./smishing-editor-helpers');
    (helpers.parseAndValidateSmsResponse as any).mockReturnValueOnce({
      success: false,
      error: 'bad sms',
    });

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain('SMS validation error');
  });

  it('should handle SMS edit promise rejection', async () => {
    const llm = await import('./smishing-editor-llm');
    (llm.createSmsEditPromise as any).mockRejectedValueOnce(new Error('LLM failed'));

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(false);
  });

  it('should include update summary in response', async () => {
    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
    expect(result.data?.message).toContain('Updated');
  });

  it('should pass translate mode to sms and landing editors', async () => {
    const llm = await import('./smishing-editor-llm');

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Translate to Turkish',
      mode: 'translate' as const,
      language: 'tr-tr',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
    expect(llm.createSmsEditPromise).toHaveBeenCalledWith(expect.objectContaining({ mode: 'translate' }));
    expect(llm.createLandingEditPromises).toHaveBeenCalledWith(expect.objectContaining({ mode: 'translate' }));
  });

  it('should resolve brand when hasBrandUpdate is true', async () => {
    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update logo to Acme',
      hasBrandUpdate: true,
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
    expect(vi.mocked(detectAndResolveBrand)).toHaveBeenCalled();
  });

  it('should continue when whitelabel config fetch fails', async () => {
    mockGetWhitelabelingConfig.mockRejectedValueOnce(new Error('whitelabel down'));

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update text',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
  });

  it('should return generic tool error when unexpected exception happens', async () => {
    const helpers = await import('./smishing-editor-helpers');
    (helpers.loadSmishingContent as any).mockRejectedValueOnce(new Error('unexpected failure'));

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to edit smishing template');
  });

  it('should fallback to existing sms messages when parsed sms messages are missing', async () => {
    const helpers = await import('./smishing-editor-helpers');
    (helpers.parseAndValidateSmsResponse as any).mockReturnValueOnce({
      success: true,
      sms: { messages: undefined, summary: 'fallback' },
    });

    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update',
    };

    const result = await executeTool({ context: input } as any);
    expect(result.success).toBe(true);
    expect(helpers.saveSmishingContent).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ messages: ['old'] }),
      expect.anything(),
      expect.anything()
    );
  });

  it('should stream with null landing meta when landing content is absent', async () => {
    const helpers = await import('./smishing-editor-helpers');
    (helpers.loadSmishingContent as any).mockResolvedValueOnce({
      success: true,
      content: {
        sms: { messages: ['sms-only'] },
        landing: null,
        smsKey: 'smishing:smishing-123:sms:en-gb',
        landingKey: 'smishing:smishing-123:landing:en-gb',
      },
    });

    const writer = { write: vi.fn().mockResolvedValue(undefined) };
    const input = {
      smishingId: 'smishing-123',
      editInstruction: 'Update sms',
    };

    const result = await executeTool({ context: input, writer } as any);
    expect(result.success).toBe(true);
    expect(helpers.streamEditResultsToUI).toHaveBeenCalledWith(
      expect.anything(),
      'smishing-123',
      'smishing:smishing-123:sms:en-gb',
      'smishing:smishing-123:landing:en-gb',
      'en-gb',
      expect.anything(),
      null,
      null
    );
  });
});
