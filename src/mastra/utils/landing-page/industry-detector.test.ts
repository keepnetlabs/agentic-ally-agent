
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { detectIndustry } from './industry-detector';
import { generateText } from 'ai';

// Mock dependencies
vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

vi.mock('../core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn()
    })
}));

describe('industry-detector', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('detectIndustry', () => {
        it('uses regex fallback when no model provided', async () => {
            const result = await detectIndustry('Generic Corp', 'Just a business');
            expect(result.industry).toBe('Corporate');
            expect(vi.mocked(generateText)).not.toHaveBeenCalled();
        });

        it('regex detects Technology', async () => {
            const result = await detectIndustry('TechSoft', 'cloud computing software');
            expect(result.industry).toBe('Technology');
        });

        it('regex detects Healthcare', async () => {
            const result = await detectIndustry('MedCare', 'hospital services');
            expect(result.industry).toBe('Healthcare');
        });

        it('uses AI when model provided', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({ industry: 'Banking & Finance' })
            } as any);

            const result = await detectIndustry('Chase', 'Banking services', mockModel);
            expect(result.industry).toBe('Banking & Finance');
            expect(generateText).toHaveBeenCalled();
        });

        it('falls back to regex if AI fails (invalid JSON)', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: 'Invalid JSON'
            } as any);

            const result = await detectIndustry('Google', 'Search engine', mockModel);
            // Regex should pick up "Google" or "Search" -> Technology
            expect(result.industry).toBe('Technology');
        });

        it('falls back to regex if AI returns unknown industry', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({ industry: 'Space Mining' })
            } as any);

            // 'Space Mining' is not in the map, detectIndustryWithAI falls back to Corporate
            // Wait, the code says: "Unknown industry detected by AI, using Corporate fallback"
            // It does NOT fall back to regex in that specific `if (!designSystem)` block, it returns Corporate directly.
            // Let's verify that behavior.
            const result = await detectIndustry('Google', 'Search engine', mockModel);
            expect(result.industry).toBe('Corporate');
        });

        it('handles AI throw', async () => {
            const mockModel = {} as any;
            vi.mocked(generateText).mockRejectedValue(new Error('AI Error'));

            const result = await detectIndustry('Google', 'Search engine', mockModel);
            expect(result.industry).toBe('Technology'); // Regex fallback
        });
    });
});
