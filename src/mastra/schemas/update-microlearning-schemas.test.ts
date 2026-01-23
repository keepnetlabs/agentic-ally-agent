
import { describe, it, expect } from 'vitest';
import {
    updatesSchema,
    updateInputSchema,
    updateOutputSchema,
    loadMicrolearningOutputSchema,
    mergeUpdatesInputSchema,
    mergeUpdatesOutputSchema,
    saveUpdatesInputSchema
} from './update-microlearning-schemas';

describe('update-microlearning-schemas', () => {

    describe('updatesSchema', () => {
        it('accepts valid input', () => {
            const input = {
                theme: {
                    fontFamily: { primary: 'Inter' },
                    colors: { background: '#fff' },
                    logo: { src: 'http://exa.mp/le' }
                },
                useWhitelabelLogo: true,
                brandName: 'Test'
            };
            const result = updatesSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('accepts empty input', () => {
            const result = updatesSchema.safeParse({});
            expect(result.success).toBe(true);
        });
    });

    describe('updateInputSchema', () => {
        it('accepts valid input', () => {
            const input = {
                microlearningId: '123',
                department: 'HR',
                updates: { brandName: 'Brand' }
            };
            const result = updateInputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('validates required fields', () => {
            const result = updateInputSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe('updateOutputSchema', () => {
        it('validates success output', () => {
            const input = {
                success: true,
                status: 'updated',
                metadata: {
                    microlearningId: '123',
                    version: 2,
                    changes: { brand: 'New' },
                    timestamp: 'now'
                }
            };
            const result = updateOutputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

    describe('loadMicrolearningOutputSchema', () => {
        it('validates valid structure', () => {
            const input = {
                microlearningId: '123',
                department: 'All',
                currentContent: {},
                currentVersion: 1,
                updates: {}
            };
            const result = loadMicrolearningOutputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

    describe('mergeUpdatesInputSchema', () => {
        it('validates valid structure', () => {
            const input = {
                microlearningId: '123',
                department: 'All',
                currentContent: {},
                currentVersion: 1,
                updates: {}
            };
            const result = mergeUpdatesInputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

    describe('mergeUpdatesOutputSchema', () => {
        it('validates valid structure', () => {
            const input = {
                microlearningId: '123',
                department: 'All',
                updatedContent: {},
                newVersion: 2,
                changes: {}
            };
            const result = mergeUpdatesOutputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

    describe('saveUpdatesInputSchema', () => {
        it('validates valid structure', () => {
            const input = {
                microlearningId: '123',
                department: 'All',
                updatedContent: {},
                newVersion: 2,
                changes: {}
            };
            const result = saveUpdatesInputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

});
