/**
 * Phishing Workflow Executor – input and output schemas
 *
 * Input: topic, isQuishing, targetProfile, difficulty, language, method, etc.
 * Output: success, status, message, data (phishingId, subject, …), error.
 */

import { z } from 'zod';
import { PHISHING, MODEL_PROVIDERS } from '../../constants';
import { normalizeDifficultyValue } from '../../utils/difficulty-level-mapper';

const normalizeTargetProfile = (value: unknown) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        return { name: trimmed };
    }
    return value;
};

export const phishingWorkflowSchema = z.object({
    workflowType: z.literal(PHISHING.WORKFLOW_TYPE).describe('Workflow to execute'),
    topic: z.string().describe('Topic for phishing simulation (e.g. "Reset Password")'),
    isQuishing: z.boolean().optional().describe('Whether this is a quishing (QR code phishing) simulation. Set to true if user explicitly requests quishing/QR code phishing.'),
    targetProfile: z.preprocess(
        normalizeTargetProfile,
        z.object({
            name: z.string().optional(),
            department: z.string().optional(),
            behavioralTriggers: z.array(z.string()).optional(),
            vulnerabilities: z.array(z.string()).optional(),
        }).optional()
    ).describe('Target user profile for personalization'),
    difficulty: z
        .preprocess((value) => normalizeDifficultyValue(value) ?? value, z.enum(PHISHING.DIFFICULTY_LEVELS))
        .optional()
        .default(PHISHING.DEFAULT_DIFFICULTY),
    language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
    method: z.enum(PHISHING.ATTACK_METHODS).optional().describe('Type of phishing attack'),
    includeEmail: z.boolean().optional().default(true).describe('Whether to generate an email'),
    includeLandingPage: z.boolean().optional().default(true).describe('Whether to generate a landing page'),
    additionalContext: z
        .string()
        .optional()
        .default('')
        .describe('Strategic context from Agent reasoning (e.g. "Use Authority trigger", "Focus on Fear", "Simulate CEO"). Also used for vulnerability analysis details.'),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
});

// Output schema for phishing workflow executor tool
export const phishingWorkflowOutputSchema = z.object({
    success: z.boolean(),
    status: z.string().optional(),
    message: z.string().optional(),
    data: z.object({
        phishingId: z.string(),
        topic: z.string().optional(),
        language: z.string().optional(),
        difficulty: z.string().optional(),
        method: z.string().optional(),
        subject: z.string().optional(),
        fromAddress: z.string().optional(),
        fromName: z.string().optional(),
        scenario: z.string().optional(),
        category: z.string().optional(),
        psychologicalTriggers: z.array(z.string()).optional(),
        keyRedFlags: z.array(z.string()).optional(),
        targetAudience: z.any().optional(),
    }).optional(),
    error: z.string().optional(),
});
