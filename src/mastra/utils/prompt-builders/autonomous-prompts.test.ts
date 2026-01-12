
import { describe, expect, it } from 'vitest';
import {
    buildPhishingGenerationPrompt,
    buildPhishingGenerationPromptSimplified,
    buildTrainingGenerationPrompt,
    buildTrainingGenerationPromptSimplified,
    buildUploadPrompt,
    buildUploadAndAssignPrompt,
    buildAssignPhishingWithTrainingPrompt
} from './autonomous-prompts';

describe('autonomous-prompts', () => {
    describe('buildPhishingGenerationPrompt', () => {
        it('includes goal and language requirement', () => {
            const context = {
                simulation: {
                    title: 'Test Sim',
                    vector: 'Email',
                    persuasion_tactic: 'Urgency'
                },
                toolResult: { userInfo: { department: 'Sales' } },
                department: 'Sales',
                language: 'fr-fr'
            };
            const prompt = buildPhishingGenerationPrompt(context as any);
            expect(prompt).toContain('Generate a phishing simulation');
            expect(prompt).toContain('Test Sim');
            expect(prompt).toContain('fr-fr');
            expect(prompt).toContain('CRITICAL: LANGUAGE REQUIREMENT');
        });

        it('includes department context if provided', () => {
            const context = {
                simulation: {},
                toolResult: { userInfo: { department: 'HR' } },
                department: 'HR'
            };
            const prompt = buildPhishingGenerationPrompt(context as any);
            expect(prompt).toContain('Target Department: HR');
        });
    });

    describe('buildPhishingGenerationPromptSimplified', () => {
        it('generates simplified prompt', () => {
            const context = {
                simulation: { title: 'Simple Sim' },
                toolResult: { userInfo: { department: 'IT' } },
                department: 'IT'
            };
            const prompt = buildPhishingGenerationPromptSimplified(context as any);
            expect(prompt).toContain('Generate a phishing simulation');
            expect(prompt).toContain('Simple Sim');
        });
    });

    describe('buildTrainingGenerationPrompt', () => {
        it('includes learning objective and language', () => {
            const context = {
                microlearning: {
                    title: 'Training 101',
                    objective: 'Learn safety'
                },
                department: 'Sales',
                level: 'Beginner',
                language: 'de-de'
            };
            const prompt = buildTrainingGenerationPrompt(context as any);
            expect(prompt).toContain('Generate a training module');
            expect(prompt).toContain('Training 101');
            expect(prompt).toContain('Learn safety');
            expect(prompt).toContain('de-de');
        });
    });

    describe('buildTrainingGenerationPromptSimplified', () => {
        it('generates simplified training prompt', () => {
            const context = {
                microlearning: { title: 'Simple Training' },
                department: 'Finance',
                level: 'Beginner'
            };
            const prompt = buildTrainingGenerationPromptSimplified(context as any);
            expect(prompt).toContain('Generate a training module');
            expect(prompt).toContain('Simple Training');
        });
    });

    describe('buildUploadPrompt', () => {
        it('generates upload prompt for phishing', () => {
            const prompt = buildUploadPrompt('phishing', 'id-123');
            expect(prompt).toContain('Upload the phishing simulation');
            expect(prompt).toContain('id-123');
        });

        it('generates upload prompt for training', () => {
            const prompt = buildUploadPrompt('training');
            expect(prompt).toContain('Upload the training module');
        });
    });

    describe('buildUploadAndAssignPrompt', () => {
        it('generates upload and assign prompt', () => {
            const prompt = buildUploadAndAssignPrompt('phishing', 'user-123', 'id-555');
            expect(prompt).toContain('Upload and assign the phishing simulation');
            expect(prompt).toContain('user-123');
            expect(prompt).toContain('id-555');
        });
    });

    describe('buildAssignPhishingWithTrainingPrompt', () => {
        it('generates assignment prompt with training', () => {
            const prompt = buildAssignPhishingWithTrainingPrompt('user-999', 'train-123', 'lang-456');
            expect(prompt).toContain('Assign the phishing simulation');
            expect(prompt).toContain('linking it with the training module');
            expect(prompt).toContain('trainingId: train-123');
            expect(prompt).toContain('sendTrainingLanguageId: lang-456');
        });
    });
});
