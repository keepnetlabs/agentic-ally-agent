
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateTranscript } from './transcript-translator';

// Mock dependencies
const mockGenerateText = vi.fn();
vi.mock('ai', () => ({
    generateText: (...args: any[]) => mockGenerateText(...args),
    LanguageModel: {} // Mock type
}));

vi.mock('../language/localization-language-rules', () => ({
    getLanguagePrompt: (lang: string) => `Rules for ${lang}`
}));

vi.mock('../core/resilience-utils', () => ({
    withRetry: (fn: any) => fn()
}));

describe('Transcript Translator', () => {
    const mockModel: any = {};

    beforeEach(() => {
        mockGenerateText.mockReset();
    });

    it('should return original text if target language is English', async () => {
        const transcript = "Hello world";
        const result = await translateTranscript(transcript, 'en-us', mockModel);
        expect(result).toBe(transcript);
        expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should call generateText for non-English languages', async () => {
        const transcript = "00:01 Hello";
        const translated = "00:01 Merhaba";

        mockGenerateText.mockResolvedValue({ text: translated });

        const result = await translateTranscript(transcript, 'tr-tr', mockModel);

        expect(result).toBe(translated);
        expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
            model: mockModel,
            messages: expect.arrayContaining([
                expect.objectContaining({ role: 'system' }),
                expect.objectContaining({ role: 'user', content: expect.stringContaining(transcript) })
            ])
        }));
    });

    it('should handle errors gracefully and return original transcript', async () => {
        mockGenerateText.mockRejectedValue(new Error('AI invalid'));
        const transcript = "00:01 Hello";

        const result = await translateTranscript(transcript, 'es', mockModel);

        expect(result).toBe(transcript);
    });
});
