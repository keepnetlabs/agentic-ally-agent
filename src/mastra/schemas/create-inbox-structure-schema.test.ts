
import { describe, it, expect } from 'vitest';
import { CreateInboxStructureSchema, CreateInboxStructureOutputSchema } from './create-inbox-structure-schema';

describe('create-inbox-structure-schema', () => {
    describe('CreateInboxStructureSchema', () => {
        it('accepts valid input', () => {
            const valid = {
                department: 'IT',
                languageCode: 'en-GB',
                microlearningId: '123',
                microlearning: {},
                languageContent: {},
                remote: {}
            };
            const result = CreateInboxStructureSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('validates optional fields', () => {
            const valid = {
                department: 'IT',
                languageCode: 'en-GB',
                microlearningId: '123',
                microlearning: {},
                languageContent: {},
                remote: {},
                additionalContext: 'context',
                modelProvider: 'OPENAI',
                model: 'gpt-4'
            };
            const result = CreateInboxStructureSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('rejects missing required fields', () => {
            const invalid = {
                department: 'IT'
            };
            const result = CreateInboxStructureSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('CreateInboxStructureOutputSchema', () => {
        it('validates success output', () => {
            const valid = {
                success: true,
                data: {},
                metadata: {
                    department: 'IT',
                    languageCode: 'en',
                    microlearningId: '123',
                    inboxPath: '/path',
                    itemsGenerated: 5,
                    estimatedDuration: '5m'
                }
            };
            const result = CreateInboxStructureOutputSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('validates error output', () => {
            const valid = {
                success: false,
                data: null,
                error: 'Failure'
            };
            const result = CreateInboxStructureOutputSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });
});
