
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { normalizeThemeBackgroundClass } from './theme-color-normalizer';
import { generateText } from 'ai';
import { THEME_COLORS } from '../../constants';

// Mock AI
vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

// Mock logger
vi.mock('../core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    })
}));

describe('theme-color-normalizer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns input if valid theme class', async () => {
        const validClass = THEME_COLORS.VALUES[0];
        const result = await normalizeThemeBackgroundClass(validClass);
        expect(result).toBe(validClass);
    });

    it('uses brand presets deterministically (Level 1)', async () => {
        const result = await normalizeThemeBackgroundClass("amazon colors");
        expect(result).toBe('bg-gradient-orange'); // Preset for amazon
    });

    it('uses AI for unknown inputs (Level 2)', async () => {
        vi.mocked(generateText).mockResolvedValue({
            text: 'bg-gradient-purple'
        } as any);

        const result = await normalizeThemeBackgroundClass("royal purple vibe");
        expect(result).toBe('bg-gradient-purple');
        expect(generateText).toHaveBeenCalled();
    });

    it('handles AI returning regex match (fallback in Level 2)', async () => {
        vi.mocked(generateText).mockResolvedValue({
            text: 'Result: bg-gradient-blue'
        } as any);

        const result = await normalizeThemeBackgroundClass("something blue");
        expect(result).toBe('bg-gradient-blue');
    });

    it('falls back to DEFAULT if AI fails (Level 3)', async () => {
        vi.mocked(generateText).mockRejectedValue(new Error('AI invalid'));

        const result = await normalizeThemeBackgroundClass("colors of chaos");
        expect(result).toBe(THEME_COLORS.DEFAULT);
    });
});
