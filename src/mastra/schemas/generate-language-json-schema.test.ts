import { describe, it, expect } from 'vitest';
import { GenerateLanguageJsonSchema, GenerateLanguageJsonOutputSchema } from './generate-language-json-schema';

describe('GenerateLanguageJsonSchema', () => {
    const validAnalysis = {
        language: 'en',
        topic: 'Security',
        title: 'Phishing 101',
        department: 'IT',
        level: 'Beginner',
        category: 'Security',
        subcategory: 'Email',
        learningObjectives: ['Identify phishing'],
        duration: 5,
        industries: ['Tech'],
        roles: ['All'],
        keyTopics: ['Phishing'],
        practicalApplications: ['Check sender'],
        assessmentAreas: ['Quiz'],
    };

    // Mocking the structure expected by LanguageModelSchema (z.custom checks for provider and modelId)
    const validModel = {
        provider: 'OPENAI',
        modelId: 'gpt-4o',
        // AI SDK models usually have more methods like doGenerate etc, but the schema only checks structure
    };

    const validMicrolearning = {
        id: '123',
        content: 'Some content'
    };

    it('should validate a complete valid input', () => {
        const input = {
            analysis: validAnalysis,
            microlearning: validMicrolearning,
            model: validModel,
        };
        const result = GenerateLanguageJsonSchema.safeParse(input);
        if (!result.success) {
            console.error(result.error);
        }
        expect(result.success).toBe(true);
    });

    it('should fail if required analysis fields are missing', () => {
        const invalidAnalysis = { ...validAnalysis };
        // @ts-ignore
        delete invalidAnalysis.language;

        const input = {
            analysis: invalidAnalysis,
            microlearning: validMicrolearning,
            model: validModel,
        };
        const result = GenerateLanguageJsonSchema.safeParse(input);
        expect(result.success).toBe(false);
    });

    it('should fail if model is missing required fields', () => {
        const invalidModel = {
            provider: 'OPENAI'
            // Missing modelId
        };
        const input = {
            analysis: validAnalysis,
            microlearning: validMicrolearning,
            model: invalidModel,
        };
        const result = GenerateLanguageJsonSchema.safeParse(input);
        expect(result.success).toBe(false);
    });

    it('should validate with optional writer', () => {
        const input = {
            analysis: validAnalysis,
            microlearning: validMicrolearning,
            model: validModel,
            writer: {
                write: async () => { }, // Mock valid writer structure
            },
        };
        const result = GenerateLanguageJsonSchema.safeParse(input);
        expect(result.success).toBe(true);
    });

    it('should fail with invalid writer', () => {
        const input = {
            analysis: validAnalysis,
            microlearning: validMicrolearning,
            model: validModel,
            writer: {
                // Missing write method
                foo: 'bar'
            },
        };
        const result = GenerateLanguageJsonSchema.safeParse(input);
        expect(result.success).toBe(false);
    });
});

describe('GenerateLanguageJsonOutputSchema', () => {
    it('should validate success output', () => {
        const output = {
            success: true,
            data: { foo: 'bar' }
        };
        const result = GenerateLanguageJsonOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
    });

    it('should validate failure output', () => {
        const output = {
            success: false,
            error: 'Something went wrong'
        };
        const result = GenerateLanguageJsonOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
    });
});
