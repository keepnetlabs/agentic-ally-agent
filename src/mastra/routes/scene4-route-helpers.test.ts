import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadScene4RouteData } from './scene4-route-helpers';
import { validateBCP47LanguageCode } from '../utils/language/language-utils';

vi.mock('../services/kv-service', () => ({
  KVService: vi.fn(),
}));

vi.mock('../utils/language/language-utils', () => ({
  validateBCP47LanguageCode: vi.fn((lang) => lang),
}));

describe('scene4-route-helpers', () => {
  let mockKVService: { getMicrolearning: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(validateBCP47LanguageCode).mockImplementation((lang) => lang);

    mockKVService = {
      getMicrolearning: vi.fn(),
    };

    const { KVService } = await import('../services/kv-service');
    vi.mocked(KVService).mockImplementation(function (this: any) {
      return mockKVService;
    } as any);
  });

  it('normalizes language and returns scene4 prompt/firstMessage', async () => {
    vi.mocked(validateBCP47LanguageCode).mockReturnValue('EN-GB' as any);
    mockKVService.getMicrolearning.mockResolvedValue({
      language: {
        '4': {
          prompt: 'Prompt',
          firstMessage: 'First message',
        },
      },
    });

    const result = await loadScene4RouteData({
      microlearningId: 'ml-123',
      language: 'en-gb',
    });

    expect(result).toEqual({
      hasLanguageContent: true,
      normalizedLanguage: 'en-gb',
      prompt: 'Prompt',
      firstMessage: 'First message',
    });
    expect(mockKVService.getMicrolearning).toHaveBeenCalledWith('ml-123', 'en-gb');
  });

  it('returns empty scene4 fields when language content does not exist', async () => {
    mockKVService.getMicrolearning.mockResolvedValue(null);

    const result = await loadScene4RouteData({
      microlearningId: 'ml-missing',
      language: 'en',
    });

    expect(result).toEqual({
      hasLanguageContent: false,
      normalizedLanguage: 'en',
      prompt: undefined,
      firstMessage: undefined,
    });
  });

  it('returns hasLanguageContent true even when scene4 is missing', async () => {
    mockKVService.getMicrolearning.mockResolvedValue({
      language: {},
    });

    const result = await loadScene4RouteData({
      microlearningId: 'ml-123',
      language: 'en',
    });

    expect(result).toEqual({
      hasLanguageContent: true,
      normalizedLanguage: 'en',
      prompt: undefined,
      firstMessage: undefined,
    });
  });
});
