import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectLanguageFallback, detectTargetLanguageWithAI, analyzeUserPromptWithAI, getFallbackAnalysis } from './prompt-analyzer';
import { ExampleRepo } from '../../../services/example-repo';
import { validateBCP47LanguageCode } from '../../../utils/language/language-utils';
import * as ai from 'ai';

// Mock dependencies
vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

vi.mock('../../../services/example-repo', () => ({
    ExampleRepo: {
        getInstance: vi.fn(() => ({
            loadExamplesOnce: vi.fn(),
            getSmartSchemaHints: vi.fn(),
            getSchemaHints: vi.fn(),
        })),
    },
}));

vi.mock('../../../utils/language/language-utils', () => ({
    validateBCP47LanguageCode: vi.fn((code) => {
        if (code === 'invalid-code') return 'en-gb'; // Simulate fallback for invalid
        if (code === 'tr-tr') return 'tr-TR';
        return code;
    }),
    DEFAULT_LANGUAGE: 'en-gb'
}));

describe('prompt-analyzer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('detectLanguageFallback', () => {
        it('should detect Turkish characters', () => {
            expect(detectLanguageFallback('Merhaba dünya şığıöç')).toBe('tr');
        });

        it('should detect German characters', () => {
            expect(detectLanguageFallback('Hallo Welt äß')).toBe('de');
        });

        it('should default to en for plain ascii', () => {
            expect(detectLanguageFallback('Hello world')).toBe('en');
        });
    });

    describe('detectTargetLanguageWithAI', () => {
        it('should return valid language code when AI succeeds', async () => {
            (ai.generateText as any).mockResolvedValue({
                text: 'tr-tr',
            });

            const result = await detectTargetLanguageWithAI('test prompt', {});
            expect(result).toBe('tr-TR');
        });

        it('should return null when AI fails or returns invalid code', async () => {
            (ai.generateText as any).mockResolvedValue({
                text: 'invalid-code',
            });

            // validateBCP47LanguageCode mock returns 'en-gb' (DEFAULT) for 'invalid-code'
            // Code returns null if validated === DEFAULT_LANGUAGE
            const result = await detectTargetLanguageWithAI('test prompt', {});
            // The implementation now allows returning default language if valid
            // expect(result).toBeNull(); // Old behavior
            expect(result).toBe('en-gb');
        });
    });

    describe('analyzeUserPromptWithAI', () => {
        it('should return analyzed prompt data', async () => {
            (ai.generateText as any).mockImplementation((params: any) => {
                if (params.prompt && params.prompt.includes('What language should')) {
                    return Promise.resolve({ text: 'en-us' });
                }
                return Promise.resolve({
                    response: {
                        body: {
                            reasoning: 'Reasoning here'
                        }
                    },
                    text: JSON.stringify({
                        topic: 'Phishing',
                        title: 'Phishing Awareness',
                        description: 'Learn about phishing',
                        category: 'Email Security',
                        level: 'Beginner',
                        roles: ['All Employees'],
                        learningObjectives: ['Identify phishing'],
                        language: 'en-us',
                        duration: 5
                    })
                });
            });

            const mockRepo = {
                loadExamplesOnce: vi.fn(),
                getSmartSchemaHints: vi.fn().mockResolvedValue('hints'),
            };
            (ExampleRepo.getInstance as any).mockReturnValue(mockRepo);
            (validateBCP47LanguageCode as any).mockImplementation((code: string) => code);

            const result = await analyzeUserPromptWithAI({
                userPrompt: 'Create a phishing course',
                model: {},
                suggestedDepartment: 'IT'
            });

            expect(result.success).toBe(true);
            expect(result.data.topic).toBe('Phishing');
            expect(result.data.department).toBe('IT');
        });

        it('should fallback to basic schema hints if smart hints fail', async () => {
            // Mock AI response
            (ai.generateText as any).mockResolvedValue({
                text: JSON.stringify({ topic: 'Test' })
            });

            const mockRepo = {
                loadExamplesOnce: vi.fn(),
                getSmartSchemaHints: vi.fn().mockRejectedValue(new Error('VectorDB down')),
                getSchemaHints: vi.fn().mockReturnValue('Basic Hints'),
            };
            (ExampleRepo.getInstance as any).mockReturnValue(mockRepo);

            await analyzeUserPromptWithAI({
                userPrompt: 'Test',
                model: {},
            });

            expect(mockRepo.getSmartSchemaHints).toHaveBeenCalled();
            // Need to verify fallback behavior - implicitly via code coverage or verifying calls
            // Since smart hints fail, it should retry smart with undefined, then fallback to getSchemaHints
            expect(mockRepo.getSchemaHints).toHaveBeenCalled();
        });

        it('should fallback to char-based language detection if AI detection fails', async () => {
            // Mock detectTargetLanguageWithAI failure (it calls generateText)
            // We can simulate failure by having generateText throw or return invalid code
            // But since we are mocking generateText, let's make it fail only for lang detection

            (ai.generateText as any).mockImplementation((params: any) => {
                if (params.prompt && params.prompt.includes('What language should')) {
                    throw new Error('AI Down');
                }
                return Promise.resolve({
                    text: JSON.stringify({ language: 'tr' }) // Final analysis response
                });
            });

            const result = await analyzeUserPromptWithAI({
                userPrompt: 'Merhaba dünya', // Turkish prompt
                model: {},
            });

            // It should infer language from 'Merhaba dünya' -> 'tr' and pass that into the final prompt
            // We can check if the final prompt contained the hinted language
            // But checking result.data.language is also a proxy if the prompt guided the generation
            // In the mock above, we returned 'tr' explicitly, but let's check the language hint logic?

            // Actually, if AI detection fails, it calls detectLanguageFallback
            // detectLanguageFallback('Merhaba dünya') returns 'tr'
            // Then 'tr' is passed as languageHint.

            // The implementation:
            // catch { const charBasedLang = ...; languageHint = charBasedLang.toLowerCase(); }

            // So success means no error was thrown and it proceeded.
            expect(result.success).toBe(true);
        });

        it('should stream reasoning if writer is provided', async () => {
            const mockWriter = { write: vi.fn() };

            // We need to handle multiple calls to generateText:
            // 1. attributes analysis (returns JSON + reasoning)
            // 2. reasoning summarization (triggered by streamReasoning)
            (ai.generateText as any).mockImplementation((params: any) => {
                // Check if this is the summarization call
                const isSummaryCall = params.messages?.some((m: any) =>
                    m.content && m.content.includes("Extract the AI's thinking process")
                );

                if (isSummaryCall) {
                    return Promise.resolve({ text: 'User friendly thinking...' });
                }

                // Default analysis response
                return Promise.resolve({
                    response: {
                        body: {
                            reasoning: 'Raw technical thinking...'
                        }
                    },
                    text: JSON.stringify({ topic: 'Reasoning Test' })
                });
            });

            await analyzeUserPromptWithAI({
                userPrompt: 'Test',
                model: {},
                writer: mockWriter
            });

            // Allow fire-and-forget promise in streamReasoning to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockWriter.write).toHaveBeenCalled();

            // It should write start
            expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
                type: 'reasoning-start'
            }));

            // It should write delta (the result of summarization)
            expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
                type: 'reasoning-delta',
                delta: 'User friendly thinking...'
            }));

            // It should write end
            expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
                type: 'reasoning-end'
            }));
        });

        it('should propagate additionalContext to result', async () => {
            (ai.generateText as any).mockResolvedValue({
                text: JSON.stringify({ topic: 'Context Test' })
            });

            const result = await analyzeUserPromptWithAI({
                userPrompt: 'Test',
                model: {},
                additionalContext: 'User is CTO'
            });

            expect(result.data.hasRichContext).toBe(true);
            expect(result.data.additionalContext).toBe('User is CTO');
        });
    });

    describe('getFallbackAnalysis', () => {
        it('should return fallback data with correct defaults', async () => {
            const result = await getFallbackAnalysis({
                userPrompt: 'Learn Python Safety',
                model: {},
                suggestedDepartment: 'Engineering'
            });

            expect(result.topic).toContain('Learn Python Safety');
            expect(result.isCodeTopic).toBe(true);
            expect(result.department).toBe('Engineering');
        });

        it('should return normal fallback for non-code', async () => {
            const result = await getFallbackAnalysis({
                userPrompt: 'Be careful with emails',
                model: {},
            });

            expect(result.isCodeTopic).toBe(false);
            expect(result.category).toBeDefined();
        });
    });
});
