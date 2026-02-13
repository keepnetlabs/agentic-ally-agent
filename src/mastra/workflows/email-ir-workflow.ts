import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { EmailIREmailDataSchema } from '../types/email-ir';
import { fetchEmailTool, fetchEmailInputSchema } from '../tools/email-ir/fetch-email';
import { headerAnalysisTool, headerAnalysisOutputSchema } from '../tools/email-ir/header-analysis';
import { bodyBehavioralAnalysisTool, bodyBehavioralAnalysisOutputSchema } from '../tools/email-ir/body-behavioral-analysis';
import { bodyIntentAnalysisTool, bodyIntentAnalysisOutputSchema } from '../tools/email-ir/body-intent-analysis';
import { triageTool, triageOutputSchema } from '../tools/email-ir/triage';
import { featureExtractionTool, featureExtractionOutputSchema } from '../tools/email-ir/feature-extraction';
import { riskAssessmentTool, riskAssessmentOutputSchema } from '../tools/email-ir/risk-assessment';
import { reportingTool } from '../tools/email-ir/reporting';
import { EmailIRCanvasSchema } from '../schemas/email-ir';
import { loggerWorkflow } from '../tools/email-ir/logger-setup';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';

// Combined analysis results schema for workflow passing
export const combinedAnalysisSchema = z.object({
    original_email: EmailIREmailDataSchema,
    header_analysis: headerAnalysisOutputSchema.omit({ original_email: true }),
    behavioral_analysis: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
    intent_analysis: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
});

// --- Steps using Tools ---

export const fetchStep = createStep({
    id: 'email-ir-fetch-step',
    inputSchema: fetchEmailInputSchema,
    outputSchema: EmailIREmailDataSchema,
    execute: async ({ inputData, runtimeContext }) => {
        try {
            return await fetchEmailTool.execute({ context: inputData, runtimeContext });
        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                step: 'email-ir-fetch',
                stack: err.stack,
                email_id: inputData.id,
            });
            logErrorInfo(loggerWorkflow, 'warn', 'email_ir_fetch_step_degraded', errorInfo);

            // Continue pipeline even when fetch fails. Downstream tools can classify as insufficient_data.
            return {
                from: 'unknown@unavailable.local',
                subject: `Email unavailable (${inputData.id})`,
                htmlBody: `Email fetch failed after retries: ${err.message}`,
                result: 'insufficient_data',
                headers: [
                    { key: 'x-email-ir-fetch-status', value: 'failed' },
                ],
            };
        }
    },
});

// Parallel Analyses: Run header, behavioral, and intent analyses on the fetched email
export const multiAnalysisStep = createStep({
    id: 'email-ir-multi-analysis-step',
    inputSchema: EmailIREmailDataSchema,
    outputSchema: combinedAnalysisSchema,
    execute: async ({ inputData, runtimeContext }) => {
        const email = inputData;

        // Run all three analyses in parallel
        const [headerResult, behavioralResult, intentResult] = await Promise.all([
            headerAnalysisTool.execute({ context: email, runtimeContext }),
            bodyBehavioralAnalysisTool.execute({ context: email, runtimeContext }),
            bodyIntentAnalysisTool.execute({ context: email, runtimeContext }),
        ]);

        return {
            original_email: email,
            header_analysis: {
                spf_pass: headerResult.spf_pass,
                dkim_pass: headerResult.dkim_pass,
                dmarc_pass: headerResult.dmarc_pass,
                domain_similarity: headerResult.domain_similarity,
                sender_ip_reputation: headerResult.sender_ip_reputation,
                geolocation_anomaly: headerResult.geolocation_anomaly,
                routing_anomaly: headerResult.routing_anomaly,
                threat_intel_findings: headerResult.threat_intel_findings,
                header_summary: headerResult.header_summary,
                security_awareness_detected: headerResult.security_awareness_detected,
                list_unsubscribe_present: headerResult.list_unsubscribe_present,
            },
            behavioral_analysis: {
                urgency_level: behavioralResult.urgency_level,
                emotional_pressure: behavioralResult.emotional_pressure,
                social_engineering_pattern: behavioralResult.social_engineering_pattern,
                verification_avoidance: behavioralResult.verification_avoidance,
                verification_avoidance_tactics: behavioralResult.verification_avoidance_tactics,
                urgency_indicators: behavioralResult.urgency_indicators,
                emotional_pressure_indicators: behavioralResult.emotional_pressure_indicators,
                behavioral_summary: behavioralResult.behavioral_summary,
            },
            intent_analysis: {
                intent: intentResult.intent,
                financial_request: intentResult.financial_request,
                credential_request: intentResult.credential_request,
                authority_impersonation: intentResult.authority_impersonation,
                financial_request_details: intentResult.financial_request_details,
                credential_request_details: intentResult.credential_request_details,
                authority_claimed: intentResult.authority_claimed,
                intent_summary: intentResult.intent_summary,
            },
        };
    },
});

// Combined schema to carry all data through the pipeline
export const analysisWithTriageSchema = z.object({
    original_email: EmailIREmailDataSchema,
    header_analysis: headerAnalysisOutputSchema.omit({ original_email: true }),
    behavioral_analysis: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
    intent_analysis: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
    triage_result: triageOutputSchema.omit({ original_email: true }),
});

export const triageStep = createStep({
    id: 'email-ir-triage-step',
    inputSchema: combinedAnalysisSchema,
    outputSchema: analysisWithTriageSchema,
    execute: async ({ inputData, runtimeContext }) => {
        const email = inputData.original_email;
        const triageResult = await triageTool.execute({ context: inputData, runtimeContext });

        return {
            original_email: email,
            header_analysis: inputData.header_analysis,
            behavioral_analysis: inputData.behavioral_analysis,
            intent_analysis: inputData.intent_analysis,
            triage_result: triageResult,
        };
    },
});

// Feature Extraction combines all analyses with triage
export const featureExtractionStep = createStep({
    id: 'email-ir-feature-extraction-step',
    inputSchema: analysisWithTriageSchema,
    outputSchema: featureExtractionOutputSchema,
    execute: async ({ inputData, runtimeContext }) => {
        const featureInput = {
            original_email: inputData.original_email,
            triage_result: inputData.triage_result,
            header_analysis: inputData.header_analysis,
            behavioral_analysis: inputData.behavioral_analysis,
            intent_analysis: inputData.intent_analysis,
        };

        return await featureExtractionTool.execute({ context: featureInput, runtimeContext });
    },
});

export const riskAssessmentStep = createStep({
    id: 'email-ir-risk-assessment-step',
    inputSchema: featureExtractionOutputSchema,
    outputSchema: riskAssessmentOutputSchema,
    execute: async ({ inputData, runtimeContext }) => {
        return await riskAssessmentTool.execute({ context: inputData, runtimeContext });
    },
});

export const reportingStep = createStep({
    id: 'email-ir-reporting-step',
    inputSchema: riskAssessmentOutputSchema,
    outputSchema: EmailIRCanvasSchema,
    execute: async ({ inputData, runtimeContext }) => {
        return await reportingTool.execute({ context: inputData, runtimeContext });
    },
});

// --- Workflow Definition ---
// Professional-grade Email IR pipeline:
// 1. Fetch email
// 2. Multi-Analysis (runs Header + Behavioral + Intent analyses in parallel)
// 3. Triage (categorize email)
// 4. Feature Extraction (integrate all signals from multi-analysis + triage)
// 5. Risk Assessment (determine risk level)
// 6. Reporting (generate final report)

export const emailIRWorkflow = createWorkflow({
    id: 'email-ir-workflow',
    description: 'Professional-grade Email Incident Response Analyst Workflow',
    inputSchema: fetchEmailInputSchema,
    outputSchema: EmailIRCanvasSchema,
})
    .then(fetchStep)
    .then(multiAnalysisStep)
    .then(triageStep)
    .then(featureExtractionStep)
    .then(riskAssessmentStep)
    .then(reportingStep)
    .commit();
