import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { createLogContext, loggerBehavioral, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { withRetry } from '../../utils/core/resilience-utils';
import { sanitizeEmailBody } from './email-body-sanitizer';

export const bodyBehavioralAnalysisOutputSchema = z.object({
    urgency_level: z.enum(['insufficient_data', 'none', 'low', 'medium', 'high']).describe('Degree of time pressure/urgency framing in body'),
    emotional_pressure: z.enum(['insufficient_data', 'none', 'fear', 'urgency', 'reward']).describe('Type of emotional manipulation detected'),
    social_engineering_pattern: z.enum(['insufficient_data', 'none', 'pretexting', 'extortion', 'baiting']).describe('Social engineering tactic used'),
    verification_avoidance: z.boolean().describe('True if email discourages verification/validation'),
    verification_avoidance_tactics: z.string().describe('Examples: "Don\'t call the number", "keep confidential", etc. or "insufficient_data"'),
    urgency_indicators: z.string().describe('List of urgency framing phrases found in body (e.g., "immediate action", "act now") or "insufficient_data"'),
    emotional_pressure_indicators: z.string().describe('Examples of emotional manipulation phrases or "insufficient_data"'),
    behavioral_summary: z.string().describe('1-2 sentence summary of behavioral manipulation tactics detected'),

    // Pass-through context
    original_email: EmailIREmailDataSchema,
});

export const bodyBehavioralAnalysisTool = createTool({
    id: 'email-ir-body-behavioral-analysis-tool',
    description: 'Analyzes email body for behavioral manipulation and social engineering tactics',
    inputSchema: EmailIREmailDataSchema,
    outputSchema: bodyBehavioralAnalysisOutputSchema,
    execute: async ({ context }) => {
        const email = context;
        const emailId = email.from?.split('@')[0] || 'unknown-sender';
        const ctx = createLogContext(emailId, 'behavioral-analysis');

        try {
            logStepStart(loggerBehavioral, ctx, { subject: email.subject });

            const emailBody = sanitizeEmailBody(email.htmlBody || '') || email.subject || 'No body content';
            const senderDisplay = email.senderName || email.from;

            const prompt = `
# Task: Psychological & Behavioral Analysis (Social Engineering)

Analyze the email body to decode the sender's manipulation tactics.
Your goal is to identify HOW the sender is trying to influence the recipient (Urgency, Fear, Trust, etc.).

## BEHAVIORAL ANALYSIS DIRECTIVES

### 1. Urgency Framing
Detect artificial time pressure designed to bypass critical thinking.
- **High**: "Immediate action required", "Account closing in 1 hour", "ACT NOW".
- **Medium**: "Please respond by EOD", "Offer expires soon".
- **Low/None**: Informational or standard business timelines.

### 2. Emotional Manipulation Patterns
- **Fear**: Threats of negative consequences ("Legal action", "Account suspended", "Security breach").
- **Reward/Greed**: Too-good-to-be-true offers ("Lottery winner", "Inheritance", "Free gift").
- **Curiosity/Baiting**: Vague but intriguing links ("Look at this photo", "Your document is ready").

### 3. Social Engineering Tactics
- **Pretexting**: Creating a fake scenario/identity ("I'm from IT Support", "I'm the CEO").
- **Extortion**: Explicit blackmail or sextortion threats.
- **Verification Avoidance**: Attempts to isolate the victim ("Don't call the bank", "Keep this confidential", "Reply to this email only").

## KEY PHRASES TO WATCH (Indicators)

### Urgency Indicators
- "Immediate action required", "Act now", "Limited time offer"
- "Your account will be closed if...", "Deadline: TODAY"
- "Expires in 24 hours", "Urgent: respond within 1 hour"

### Emotional Trigger Indicators
- **Fear**: "Your account has been compromised", "Legal action will be taken", "Your data will be deleted"
- **Reward**: "You've won a prize!", "Claim your bonus", "Free money transfer"

### Verification Avoidance Phrases (CRITICAL)
- "Don't call the bank, they're in on it"
- "Keep this confidential"
- "Don't forward this to anyone"
- "Don't tell your manager"
- "Don't verify through official channels"
- "Use the link in this email only"

---

## INPUT DATA

**From**: ${senderDisplay}
**Subject**: ${email.subject}

**Body Content**:
\`\`\`
${emailBody}
\`\`\`

---

## OUTPUT INSTRUCTIONS

Populate the output schema based on the behavioral signals identified:
1.  **urgency_level**: Calibrate based on the intensity of time pressure phrases.
2.  **emotional_pressure**: Identify the dominant emotional trigger (Fear/Reward/Urgency/None/Insufficient).
3.  **social_engineering_pattern**: Classify the tactic (Pretexting/Extortion/Baiting/None/Insufficient).
4.  **verification_avoidance**: Set to TRUE if the sender explicitly discourages outside checks.
5.  **behavioral_summary**: concise 1-2 sentence forensic summary of the manipulation technique.

**CRITICAL NOTES:**
- **Logic Separation**: You are analyzing **HOW** the email manipulates (Psychology), not **WHAT** it is asking for (Intent).
    - *Example*: "Verify password immediately or lose access" is High Urgency + Fear (Behavior), regardless of whether it's for Netflix or a Bank.
- **Edge Cases**: If the body is empty or too short to analyze, use "insufficient_data" for fields you cannot assess.
`;

            const result = await withRetry(
                () => emailIRAnalyst.generate(prompt, {
                    output: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
                }),
                'body-behavioral-analysis-llm'
            );

            logStepComplete(loggerBehavioral, ctx, { result: result.object });

            return {
                ...result.object,
                original_email: email,
            };
        } catch (error) {
            logStepError(loggerBehavioral, ctx, error as Error);
            throw error;
        }
    },
});
