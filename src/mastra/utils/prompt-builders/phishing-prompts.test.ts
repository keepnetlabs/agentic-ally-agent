
import { describe, expect, it, vi } from 'vitest';
import {
    buildAnalysisPrompts,
    buildEmailPrompts,
    buildLandingPagePrompts
} from './phishing-prompts';
import * as policyContextBuilder from './policy-context-builder';


// Mock dependencies
vi.mock('./policy-context-builder', () => ({
    buildPolicyScenePrompt: vi.fn().mockReturnValue('\n[Policy Block]\n')
}));

describe('phishing-prompts', () => {
    describe('buildAnalysisPrompts', () => {
        it('builds normal phishing analysis prompts', () => {
            const params = {
                difficulty: 'Medium',
                language: 'en-us',
                targetProfile: { department: 'Sales' },
                isQuishingDetected: false
            };
            const result = buildAnalysisPrompts(params as any);
            expect(result.systemPrompt).toContain('You are an expert Social Engineering Architect');
            expect(result.userPrompt).toContain('Design a TRADITIONAL PHISHING simulation scenario');
            expect(result.userPrompt).toContain('NOT quishing');
            expect(result.userPrompt).toContain('en-us');
        });

        it('builds quishing analysis prompts if detected', () => {
            const params = {
                difficulty: 'Hard',
                language: 'de-de',
                isQuishingDetected: true
            };
            const result = buildAnalysisPrompts(params as any);
            expect(result.systemPrompt).toContain('You are an expert Quishing (QR Code Phishing) Simulation Architect');
            expect(result.userPrompt).toContain('Design a QUISHING (QR Code Phishing) simulation scenario');
            expect(result.userPrompt).toContain('QUISHING CONFIRMED');
            expect(result.userPrompt).toContain('de-de');
        });

        it('includes policy block', () => {
            const params = {
                difficulty: 'Easy',
                language: 'en',
                policyContext: 'Some policy'
            };
            const result = buildAnalysisPrompts(params as any);
            expect(result.systemPrompt).toContain('[Policy Block]');
            expect(policyContextBuilder.buildPolicyScenePrompt).toHaveBeenCalledWith('Some policy');
        });
    });

    describe('buildEmailPrompts', () => {
        it('builds normal phishing email prompts', () => {
            const params = {
                analysis: {
                    isQuishing: false,
                    fromName: 'CEO',
                    method: 'Data-Submission',
                    isRecognizedBrand: false
                },
                language: 'en',
                difficulty: 'Medium',
                industryDesign: {
                    industry: 'Tech',
                    colors: { primary: '#000', secondary: '#fff', accent: '#red' }
                }
            };
            const result = buildEmailPrompts(params as any);
            expect(result.systemPrompt).toContain('You are a Phishing Content Generator');
            expect(result.userPrompt).toContain('Write the phishing simulation email content');
            expect(result.userPrompt).toContain('**Impersonating:** CEO');
        });

        it('builds quishing email prompts', () => {
            const params = {
                analysis: {
                    isQuishing: true,
                    fromName: 'IT Support'
                },
                language: 'fr',
                difficulty: 'Hard'
            };
            const result = buildEmailPrompts(params as any);
            expect(result.systemPrompt).toContain('You are a Quishing (QR Code Phishing) Email Generator');
            expect(result.userPrompt).toContain('Write the QUISHING (QR Code Phishing) simulation email content');
            expect(result.userPrompt).toContain('QUISHING CONFIRMED');
        });
    });

    describe('buildLandingPagePrompts', () => {
        it('builds landing page prompt with correct context', () => {
            const params = {
                fromName: 'Service',
                fromAddress: 'service@test.com',
                scenario: 'Login',
                language: 'es',
                industryDesign: {
                    industry: 'Finance',
                    colors: { primary: '#111', secondary: '#222', accent: '#333' },
                    patterns: { cardStyle: 'card', buttonStyle: 'btn', inputStyle: 'input' }
                },
                requiredPages: ['login'],
                isQuishing: false
            };
            const result = buildLandingPagePrompts(params as any);
            expect(result.systemPrompt).toContain('You are a web developer creating realistic landing pages');
            expect(result.systemPrompt).toContain('Finance industry');
            expect(result.systemPrompt).toContain('NO QR CODES IN LANDING PAGES');
            expect(result.systemPrompt).toContain('Finance');
        });

        it('includes quishing warnings for landing pages if isQuishing is true', () => {
            const params = {
                fromName: 'Service',
                industryDesign: {
                    industry: 'Tech',
                    colors: { primary: '#111', secondary: '#222', accent: '#333' },
                    patterns: { cardStyle: 'card', buttonStyle: 'btn', inputStyle: 'input' }
                },
                requiredPages: ['login'],
                isQuishing: true
            };
            const result = buildLandingPagePrompts(params as any);
            expect(result.systemPrompt).toContain('QUISHING LANDING PAGE - NO QR CODE REFERENCES');
        });
    });
});
