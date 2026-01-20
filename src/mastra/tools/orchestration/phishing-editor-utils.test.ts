
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAndResolveBrand } from './phishing-editor-utils';
import { generateText } from 'ai';
import { resolveLogoAndBrand } from '../../utils/phishing/brand-resolver';

// Mocks
vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

vi.mock('../../utils/core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

vi.mock('../../utils/content-processors/json-cleaner', () => ({
    cleanResponse: vi.fn((text) => text),
}));

vi.mock('../../utils/phishing/brand-resolver', () => ({
    resolveLogoAndBrand: vi.fn(),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
    withTimeout: vi.fn((promise) => promise),
}));

describe('detectAndResolveBrand', () => {
    const mockModel = { id: 'test-model', provider: 'test' } as any;
    const mockWhitelabelConfig = { mainLogoUrl: 'https://whitelabel.com/logo.png' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should resolve internal brand request when whitelabel config is present', async () => {
        // Mock intent classification to return internal brand request
        (generateText as any).mockResolvedValue({
            text: JSON.stringify({ isInternalBrandRequest: true }),
        });

        const result = await detectAndResolveBrand(
            'Use our company logo',
            mockModel,
            mockWhitelabelConfig
        );

        expect(result.resolvedBrandInfo).toEqual({
            brandName: 'Organization Brand',
            logoUrl: mockWhitelabelConfig.mainLogoUrl,
            isRecognizedBrand: true
        });
        expect(result.brandContext).toContain(mockWhitelabelConfig.mainLogoUrl);
        expect(resolveLogoAndBrand).not.toHaveBeenCalled();
    });

    it('should fallback to external resolution when internal request but no config', async () => {
        // Mock intent classification: Internal request
        (generateText as any).mockResolvedValue({
            text: JSON.stringify({ isInternalBrandRequest: true }),
        });

        // Mock external resolution fallback
        (resolveLogoAndBrand as any).mockResolvedValue({
            brandName: 'Fallback Brand',
            logoUrl: 'https://fallback.com/logo.png',
            isRecognizedBrand: true
        });

        const result = await detectAndResolveBrand(
            'Use company logo',
            mockModel,
            null // No whitelabel config
        );

        expect(resolveLogoAndBrand).toHaveBeenCalled();
        expect(result.resolvedBrandInfo).toEqual({
            brandName: 'Fallback Brand',
            logoUrl: 'https://fallback.com/logo.png',
            isRecognizedBrand: true
        });
    });

    it('should resolve external brand request', async () => {
        // Mock intent classification: External request
        (generateText as any).mockResolvedValue({
            text: JSON.stringify({ isInternalBrandRequest: false }),
        });

        // Mock external resolution
        (resolveLogoAndBrand as any).mockResolvedValue({
            brandName: 'Amazon',
            logoUrl: 'https://amazon.com/logo.png',
            isRecognizedBrand: true
        });

        const result = await detectAndResolveBrand(
            'Make it look like Amazon',
            mockModel,
            mockWhitelabelConfig
        );

        expect(resolveLogoAndBrand).toHaveBeenCalledWith(
            'Make it look like Amazon',
            'Make it look like Amazon',
            mockModel
        );
        expect(result.resolvedBrandInfo?.brandName).toBe('Amazon');
        expect(result.brandContext).toContain('Amazon');
    });

    it('should handle unrecognized brand gracefully', async () => {
        (generateText as any).mockResolvedValue({
            text: JSON.stringify({ isInternalBrandRequest: false }),
        });

        // Mock external resolution returning null/undefined
        (resolveLogoAndBrand as any).mockResolvedValue(null);

        const result = await detectAndResolveBrand(
            'Some unknown brand',
            mockModel,
            mockWhitelabelConfig
        );

        expect(result.resolvedBrandInfo).toBeNull();
        expect(result.brandContext).toBe('');
    });

    it('should handle errors gracefully and return empty Context', async () => {
        (generateText as any).mockRejectedValue(new Error('AI Error'));

        const result = await detectAndResolveBrand(
            'Instruction',
            mockModel,
            mockWhitelabelConfig
        );

        expect(result.brandContext).toBe('');
        expect(result.resolvedBrandInfo).toBeNull();
    });
});
