
import { describe, it, expect } from 'vitest';
import {
    createInputSchema,
    promptAnalysisSchema,
    microlearningSchema,
    microlearningLanguageContentSchema,
    microlearningFinalResultSchema,
    saveToKVInputSchema
} from './create-microlearning-schemas';

describe('create-microlearning-schemas', () => {

    describe('createInputSchema', () => {
        it('accepts minimal input', () => {
            const input = { prompt: 'Make a phishing course' };
            const result = createInputSchema.safeParse(input);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.prompt).toBe('Make a phishing course');
                expect(result.data.department).toBe('All');
                expect(result.data.priority).toBeDefined(); // 'medium' or similar default
            }
        });

        it('accepts full input', () => {
            const input = {
                prompt: 'Make a phishing course',
                additionalContext: 'context',
                customRequirements: 'req',
                department: 'IT',
                level: 'Advanced',
                priority: 'high',
                language: 'en-US',
                modelProvider: 'OPENAI',
                model: 'gpt-4o',
                policyContext: 'policy'
            };
            const result = createInputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

    describe('promptAnalysisSchema', () => {
        it('validates analysis structure', () => {
            const valid = {
                success: true,
                data: {
                    topic: 'Phishing',
                    title: 'Phishing 101',
                    language: 'en',
                    department: 'IT',
                    level: 'beginner',
                    category: 'Security',
                    learningObjectives: ['Objective 1']
                }
            };
            const result = promptAnalysisSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('rejects invalid analysis', () => {
            const invalid = {
                success: true,
                data: {
                    // missing required fields
                }
            };
            const result = promptAnalysisSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('microlearningSchema', () => {
        it('validates structure', () => {
            const valid = {
                success: true,
                data: {},
                microlearningId: 'id',
                analysis: {}, // usually complex object but z.any allows empty
                microlearningStructure: {}
            };
            const result = microlearningSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });

    describe('microlearningLanguageContentSchema', () => {
        it('validates structure', () => {
            const valid = {
                success: true,
                data: {},
                microlearningId: 'id',
                analysis: {},
                microlearningStructure: {}
            };
            const result = microlearningLanguageContentSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });

    describe('microlearningFinalResultSchema', () => {
        it('validates output', () => {
            const valid = {
                success: true,
                message: 'Done',
                data: {},
                metadata: {
                    microlearningId: 'id',
                    title: 'Title',
                    language: 'en',
                    department: 'IT',
                    trainingUrl: 'http://url',
                    filesGenerated: []
                }
            };
            const result = microlearningFinalResultSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });

    describe('saveToKVInputSchema', () => {
        it('validates combined input', () => {
            const valid = {
                'create-inbox-assignment': {
                    success: true,
                    message: 'Done',
                    data: {},
                    metadata: {
                        microlearningId: 'id',
                        title: 'Title',
                        language: 'en',
                        department: 'IT',
                        trainingUrl: 'http://url',
                        filesGenerated: []
                    }
                },
                'generate-language-content': {
                    success: true,
                    data: {},
                    microlearningId: 'id',
                    analysis: {},
                    microlearningStructure: {}
                }
            };
            const result = saveToKVInputSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });

});
