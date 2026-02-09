import { z } from 'zod';

export const EmailIRCanvasSchema = z.object({
    executive_summary: z.object({
        email_category: z.enum([
            'Spam',
            'Marketing',
            'Internal',
            'CEO Fraud',
            'Phishing',
            'Sextortion',
            'Malware',
            'Security Awareness',
            'Other Suspicious',
            'Benign',
        ]),
        verdict: z.string().describe('Short, decisive verdict like "High-Risk Phishing - Immediate Action Required"'),
        risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
        confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
        confidence_level: z.enum(['Low', 'Moderate', 'Good', 'High']).optional().describe('Text confidence label for UI display'),
        confidence_basis: z.string().optional().describe('Short explanation for how confidence level was determined'),
        status: z.string().describe('Current status of the analysis'),
        why_this_matters: z.string().optional().describe('Single-line business impact explanation for executives'),
    }),
    agent_determination: z.string().describe('Human-readable narrative explaining the determination in non-technical language'),
    risk_indicators: z.object({
        observed: z.array(z.string()).describe('List of observed risk indicators'),
        not_observed: z.array(z.string()).describe('List of risk indicators that were checked but not found'),
    }),
    evidence_flow: z.array(
        z.object({
            step: z.number(),
            title: z.string(),
            description: z.string(),
        })
    ).describe('Story-based flow of evidence/analysis'),
    actions_recommended: z.array(z.string()).describe('List of recommended follow-up actions for the SOC/User'),
    confidence_limitations: z.string().describe('Statement about confidence levels and need for human review'),
});
