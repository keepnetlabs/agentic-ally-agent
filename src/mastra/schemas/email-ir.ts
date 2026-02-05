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
        verdict: z.string().describe('Short, decisive verdict like "Confirmed Social Engineering Attack"'),
        risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
        confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
        reported_by: z.number().describe('Number of users who reported this email'),
        similar_emails_detected: z.number().describe('Number of similar emails found in the organization'),
        status: z.string().describe('Current status of the investigation'),
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
    blast_radius: z.object({
        total_similar_emails: z.number(),
        opened_by_users: z.number(),
        action_taken_before_response: z.string(),
        confirmed_compromise: z.boolean(),
    }),
    actions_taken: z.array(z.string()).describe('List of automated actions taken by the agent'),
    actions_recommended: z.array(z.string()).describe('List of recommended follow-up actions for the SOC/User'),
    technical_details: z.object({
        sender_analysis: z.object({
            domain_similarity_detected: z.boolean(),
            trusted_internal_alignment: z.boolean(),
        }).optional(),
        delivery_pattern: z.object({
            targeted_delivery: z.boolean(),
            volume: z.string(),
            intent: z.string(),
        }).optional(),
        content_characteristics: z.object({
            urgency_framing: z.boolean(),
            authority_misuse: z.boolean(),
            verification_avoidance: z.boolean(),
        }).optional(),
    }).describe('Collapsed technical details for audit'),
    transparency_notice: z.string().describe('Disclaimer about AI usage and privacy'),
    confidence_limitations: z.string().describe('Statement about confidence levels and need for human review'),
});
