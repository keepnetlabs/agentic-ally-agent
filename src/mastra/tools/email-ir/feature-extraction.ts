import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { triageOutputSchema } from './triage';
import { headerAnalysisOutputSchema } from './header-analysis';
import { bodyBehavioralAnalysisOutputSchema } from './body-behavioral-analysis';
import { bodyIntentAnalysisOutputSchema } from './body-intent-analysis';

export const featureExtractionOutputSchema = z.object({
    intent: z.enum(['benign', 'phishing', 'sextortion', 'impersonation', 'fraud']),
    urgency: z.enum(['insufficient_data', 'none', 'low', 'medium', 'high']),
    authority_impersonation: z.boolean(),
    financial_request: z.boolean(),
    credential_request: z.boolean(),
    emotional_pressure: z.enum(['insufficient_data', 'none', 'fear', 'urgency', 'reward']),
    social_engineering_pattern: z.enum(['insufficient_data', 'none', 'pretexting', 'extortion', 'baiting']),
    engine_indicators_present: z.boolean(),
    analysis_summary: z.string().describe('plain language, max 3 sentences'),

    // Pass-through context
    original_email: EmailIREmailDataSchema,
    triage_result: triageOutputSchema.omit({ original_email: true }),
    header_analysis: headerAnalysisOutputSchema.omit({ original_email: true }),
    behavioral_analysis: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
    intent_analysis: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
});

// Input schema: combination of all three analyses
export const featureExtractionInputSchema = z.object({
    original_email: EmailIREmailDataSchema,
    triage_result: triageOutputSchema.omit({ original_email: true }),
    header_analysis: headerAnalysisOutputSchema.omit({ original_email: true }),
    behavioral_analysis: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
    intent_analysis: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
});

export const featureExtractionTool = createTool({
    id: 'email-ir-feature-extraction-tool',
    description: 'Integrates header, behavioral, and intent analyses into comprehensive feature set',
    inputSchema: featureExtractionInputSchema,
    outputSchema: featureExtractionOutputSchema,
    execute: async ({ context }) => {
        const inputData = context;
        const email = inputData.original_email;
        const header = inputData.header_analysis;
        const behavioral = inputData.behavioral_analysis;
        const intent = inputData.intent_analysis;

        // Determine engine_indicators_present by checking URL and attachment analysis results
        let engine_indicators_present = false;
        if (email.urls) {
            engine_indicators_present = email.urls.some(u => u.result && u.result !== 'clean');
        }
        if (!engine_indicators_present && email.attachments) {
            engine_indicators_present = email.attachments.some(a => a.result && a.result !== 'clean');
        }

        // Build comprehensive analysis summary from all three sources
        const analysis_summary = `
Header authentication: ${header.header_summary}
Body behavioral signals: ${behavioral.behavioral_summary}
Intent analysis: ${intent.intent_summary}
`.trim();

        return {
            // From intent analysis
            intent: intent.intent,
            authority_impersonation: intent.authority_impersonation,
            financial_request: intent.financial_request,
            credential_request: intent.credential_request,

            // From behavioral analysis
            urgency: behavioral.urgency_level,
            emotional_pressure: behavioral.emotional_pressure,
            social_engineering_pattern: behavioral.social_engineering_pattern,

            // From technical check
            engine_indicators_present,

            // Summary combining all three
            analysis_summary,

            // Pass-through all analyses and context
            original_email: email,
            triage_result: inputData.triage_result,
            header_analysis: header,
            behavioral_analysis: behavioral,
            intent_analysis: intent,
        };
    },
});
