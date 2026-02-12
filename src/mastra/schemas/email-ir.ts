import { z } from 'zod';

export const EMAIL_IR_EMAIL_CATEGORIES = [
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
] as const;

export const EMAIL_IR_EVIDENCE_FINDING_LABELS = [
    'PASS',
    'FLAG',
    'ALERT',
    'HIGH',
    ...EMAIL_IR_EMAIL_CATEGORIES,
] as const;

export const EmailIRCanvasSchema = z.object({
    executive_summary: z.object({
        email_category: z.enum(EMAIL_IR_EMAIL_CATEGORIES),
        verdict: z.string().describe('Short, decisive verdict like "High-Risk Phishing - Immediate Action Required"'),
        risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
        confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
        evidence_strength: z.enum(['Strong', 'Moderate', 'Limited']).optional().describe('Text evidence quality label for UI display'),
        confidence_basis: z.string().optional().describe('Short explanation for how evidence strength was determined'),
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
            finding_label: z.enum(EMAIL_IR_EVIDENCE_FINDING_LABELS).optional().describe('Short UI badge label for step status or final category'),
        })
    ).describe('Story-based flow of evidence/analysis'),
    actions_recommended: z.object({
        p1_immediate: z.array(z.string()).describe('Immediate containment actions to execute now'),
        p2_follow_up: z.array(z.string()).describe('Follow-up actions to complete within 24 hours'),
        p3_hardening: z.array(z.string()).describe('Hardening actions for long-term resilience'),
    }).describe('Priority-bucketed remediation plan (P1/P2/P3)'),
    confidence_limitations: z.string().describe('Statement about confidence levels and need for human review'),
}).superRefine((data, ctx) => {
    if (data.evidence_flow.length === 0) {
        return;
    }

    const lastStep = data.evidence_flow[data.evidence_flow.length - 1];
    if (!lastStep.finding_label) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Final evidence_flow step must include finding_label.',
            path: ['evidence_flow', data.evidence_flow.length - 1, 'finding_label'],
        });
        return;
    }

    if (lastStep.finding_label !== data.executive_summary.email_category) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Final evidence_flow finding_label must match executive_summary.email_category.',
            path: ['evidence_flow', data.evidence_flow.length - 1, 'finding_label'],
        });
    }
});
