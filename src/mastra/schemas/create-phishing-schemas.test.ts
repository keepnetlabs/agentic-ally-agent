import { describe, it, expect } from 'vitest';
import { createPhishingInputSchema, createPhishingAnalysisSchema, createPhishingOutputSchema } from './create-phishing-schemas';

describe('Phishing Workflow Schemas', () => {
    describe('createPhishingInputSchema', () => {
        it('should validate a complete valid input', () => {
            const validInput = {
                topic: 'Password Reset',
                difficulty: 'Easy',
                language: 'en-gb',
                includeLandingPage: true,
                includeEmail: true,
            };

            const result = createPhishingInputSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });

        it('should fail when required fields are missing', () => {
            const invalidInput = {
                // topic is missing
                language: 'en-gb',
            };
            const result = createPhishingInputSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });

        it('should use default values for optional fields', () => {
            const minimalInput = {
                topic: 'Urgent Action',
            };
            const result = createPhishingInputSchema.safeParse(minimalInput);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.language).toBe('en-gb');
                expect(result.data.includeLandingPage).toBe(true);
            }
        });
    });

    describe('createPhishingAnalysisSchema', () => {
        const validAnalysis = {
            scenario: 'CEO Fraud',
            name: 'CEO Fraud - Urgent Wire',
            description: 'A classic CEO fraud scenario asking for urgent wire transfer.',
            category: 'Financial Fraud',
            method: 'Click-Only',
            psychologicalTriggers: ['Urgency', 'Authority'],
            tone: 'Urgent',
            fromAddress: 'ceo@example.com',
            fromName: 'The CEO',
            keyRedFlags: ['Urgency', 'Strange URL'],
            targetAudienceAnalysis: 'Finance department employees',
            subjectLineStrategy: 'Action Required',
            isQuishing: false,
        };

        it('should validate a valid analysis object', () => {
            const result = createPhishingAnalysisSchema.safeParse(validAnalysis);
            expect(result.success).toBe(true);
        });

        it('should validate nested industryDesign object', () => {
            const analysisWithDesign = {
                ...validAnalysis,
                industryDesign: {
                    industry: 'Finance',
                    colors: {
                        primary: '#000000',
                        secondary: '#ffffff',
                        accent: '#ff0000',
                        gradient: 'linear-gradient(...)',
                    },
                    typography: {
                        headingClass: 'text-xl',
                        bodyClass: 'text-base',
                    },
                    patterns: {
                        cardStyle: 'shadow-lg',
                        buttonStyle: 'rounded',
                        inputStyle: 'border',
                    },
                    logoExample: 'https://example.com/logo.png',
                },
            };
            const result = createPhishingAnalysisSchema.safeParse(analysisWithDesign);
            expect(result.success).toBe(true);
        });

        it('should fail on invalid nested Types', () => {
            const invalidDesign = {
                ...validAnalysis,
                industryDesign: {
                    industry: 'Finance',
                    colors: 'Not an object', // Invalid type
                },
            };
            const result = createPhishingAnalysisSchema.safeParse(invalidDesign);
            expect(result.success).toBe(false);
        });
    });

    describe('createPhishingOutputSchema', () => {
        it('should validate a minimal output', () => {
            const validOutput = {
                fromAddress: 'test@example.com',
                fromName: 'Test Sender',
            };
            const result = createPhishingOutputSchema.safeParse(validOutput);
            expect(result.success).toBe(true);
        });

        it('should validate a complete output with landing page', () => {
            const completeOutput = {
                phishingId: '123',
                subject: 'Hello',
                template: '<html>...</html>',
                fromAddress: 'test@example.com',
                fromName: 'Test Sender',
                landingPage: {
                    name: 'Login Page',
                    description: 'Fake login page',
                    method: 'Click-Only',
                    difficulty: 'Easy',
                    pages: [
                        { type: 'login', template: '<html>...</html>' }
                    ]
                }
            };
            const result = createPhishingOutputSchema.safeParse(completeOutput);
            expect(result.success).toBe(true);
        });
    });
});
