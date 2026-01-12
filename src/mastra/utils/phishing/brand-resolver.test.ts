
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveLogoAndBrand, generateContextualBrand } from './brand-resolver';
import { generateText } from 'ai';
import { getLogoUrl } from '../landing-page/logo-resolver';

vi.mock('ai', () => ({
    generateText: vi.fn()
}));

vi.mock('../landing-page/logo-resolver', () => ({
    getLogoUrl: vi.fn().mockReturnValue('http://mock-logo.com')
}));

vi.mock('../core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

describe('brand-resolver', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getLogoUrl).mockReturnValue('http://mock-logo.com');
    });

    describe('resolveLogoAndBrand', () => {
        it('resolves recognized brand', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({
                    isRecognizedBrand: true,
                    domain: 'microsoft.com',
                    brandName: 'Microsoft',
                    brandColors: { primary: '#000' }
                })
            } as any);

            const result = await resolveLogoAndBrand('Microsoft', 'Login', mockModel);

            expect(result.isRecognizedBrand).toBe(true);
            expect(result.brandName).toBe('Microsoft');
            expect(result.logoUrl).toBe('http://mock-logo.com');
            expect(getLogoUrl).toHaveBeenCalledWith('microsoft.com');
        });

        it('handles unrecognized brand', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({
                    isRecognizedBrand: false,
                    domain: null
                })
            } as any);

            const result = await resolveLogoAndBrand('Generic', 'Context', mockModel);
            expect(result.isRecognizedBrand).toBe(false);
            expect(result.logoUrl).toBe('http://mock-logo.com');
            // Should generate placeholder domain
            expect(getLogoUrl).toHaveBeenCalledWith('generic.local');
        });

        it('handles AI failure', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockRejectedValue(new Error('AI fail'));

            const result = await resolveLogoAndBrand('FailCorp', 'Context', mockModel);
            expect(result.isRecognizedBrand).toBe(false);
            expect(result.logoUrl).toBe('http://mock-logo.com');
        });
    });

    describe('generateContextualBrand', () => {
        it('generates brand with domain', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({
                    suggestedBrandName: 'SecurePay',
                    domain: 'securepay.com'
                })
            } as any);

            const result = await generateContextualBrand('scenario', 'cat', 'from', mockModel);
            expect(result.brandName).toBe('SecurePay');
            expect(getLogoUrl).toHaveBeenCalledWith('securepay.com');
        });

        it('generates brand without domain (uses placeholder)', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({
                    suggestedBrandName: 'LocalShop',
                    domain: null
                })
            } as any);

            const result = await generateContextualBrand('scenario', 'cat', 'from', mockModel);
            expect(result.brandName).toBe('LocalShop');
            expect(getLogoUrl).toHaveBeenCalledWith('localshop.local');
        });
    });
});
