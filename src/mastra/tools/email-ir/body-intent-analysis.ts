import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { createLogContext, loggerIntent, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { withRetry } from '../../utils/core/resilience-utils';
import { sanitizeEmailBody } from './email-body-sanitizer';

export const bodyIntentAnalysisOutputSchema = z.object({
    intent: z.enum(['benign', 'phishing', 'sextortion', 'impersonation', 'fraud']).describe('Overall intent classification'),
    financial_request: z.boolean().describe('True if email requests money, payment, wire transfer, gift cards, etc.'),
    credential_request: z.boolean().describe('True if email requests passwords, OTPs, login links, MFA codes, etc.'),
    authority_impersonation: z.boolean().describe('True if sender claims to be CEO, executive, HR, IT, authority figure, etc.'),
    financial_request_details: z.string().describe('Specific financial requests if present (e.g., "wire $50k to account XYZ") or "insufficient_data"'),
    credential_request_details: z.string().describe('Specific credential requests if present (e.g., "password reset link") or "insufficient_data"'),
    authority_claimed: z.string().describe('Authority figure claimed if present (e.g., "CEO John Smith") or "insufficient_data"'),
    intent_summary: z.string().describe('1-2 sentence summary of what the email is asking/attempting'),

    // Pass-through context
    original_email: EmailIREmailDataSchema,
});

export const bodyIntentAnalysisTool = createTool({
    id: 'email-ir-body-intent-analysis-tool',
    description: 'Analyzes email body for intent (what is it asking for?)',
    inputSchema: EmailIREmailDataSchema,
    outputSchema: bodyIntentAnalysisOutputSchema,
    execute: async ({ context }) => {
        const email = context;
        const emailId = email.from?.split('@')[0] || 'unknown-sender';
        const ctx = createLogContext(emailId, 'intent-analysis');

        try {
            logStepStart(loggerIntent, ctx, { subject: email.subject });

            const emailBody = sanitizeEmailBody(email.htmlBody || '') || email.subject || 'No body content';
            const senderDisplay = email.senderName || email.from;
            const prompt = `
# Task: Body Intent Analysis

Analyze the email body for its fundamental intent - WHAT is it asking the recipient to do?
Focus purely on PURPOSE and REQUESTS, NOT how it manipulates (that's Behavioral Analysis).

## INTENT SIGNALS

### Intent Type Classification

#### BENIGN (Informational, Legitimate Business)
- Newsletter, notification, status update
- Meeting invitation, calendar notification
- System alert from legitimate service
- Legitimate company communication
- No request for action/money/credentials
- Example: "Your monthly report is ready" or "Meeting rescheduled to 3pm"

#### PHISHING (Credential Harvest)
- Requests login, password, OTP, MFA code
- Requests authentication bypass
- Fake login page link
- "Verify your account"
- "Confirm your credentials"
- Example: "Click to reset password" with suspicious link

#### SEXTORTION (Extortion/Blackmail)
- Claims to have compromising content (explicit videos, photos)
- Demands payment due to threat
- "Pay or I'll send to your contacts"
- "Send Bitcoin or data goes public"
- Example: "I have video of you... pay \$500"

#### IMPERSONATION (False Authority Claiming)
- Sender impersonates CEO, executive, HR, IT, manager
- Makes demands based on false authority position
- Often combined with financial request
- "I'm the CEO, transfer funds to this account"
- "HR Director here, I need your social security number"
- Example: "John Smith, CEO: Send \$50k to this vendor immediately"

#### FRAUD (Financial Transfer/Payment)
- Requests wire transfer, payment, invoice payment
- Requests gift card purchase
- Requests bank account change
- "Wire \$100k to this account"
- "Purchase gift cards and send codes"
- Example: "Please pay this invoice: transfer \$25k to account XYZ"

---

## REQUEST DETECTION

### Financial Requests
Look for keywords:
- "Wire transfer to..."
- "Send payment to..."
- "Transfer funds to..."
- "Pay invoice"
- "Purchase gift cards"
- "Bitcoin payment"
- "Cryptocurrency transfer"
- "Bank account number"
- "Payment method"

**Evidence**: Specific account number, amount, or payment method requested

### Credential Requests
Look for keywords:
- "Reset password"
- "Verify credentials"
- "Confirm username/password"
- "Provide OTP"
- "Enter MFA code"
- "Click to authenticate"
- "Verify login"
- "Update password"
- "Social security number"
- "Employee ID"

**Evidence**: Specific system/service mentioned, login link provided

### Authority Impersonation
Look for sender claims:
- "I'm the CEO"
- "This is HR"
- "IT Security Team"
- "Your manager here"
- "Finance director"
- "Executive leadership"
- "Board member"
- "Company attorney"

**Evidence**: Specific role/title claimed, often with urgency

---

## EMAIL DATA

**From**: ${senderDisplay}
**Subject**: ${email.subject}

**Body** (full content):
\`\`\`
${emailBody}
\`\`\`

---

## OUTPUT INSTRUCTIONS

Populate the output schema based on the forensic evidence identified above:

1.  **intent**: Select the category that best fits the *primary objective* (benign/phishing/sextortion/impersonation/fraud).
2.  **Request Flags**: Set \`financial_request\`, \`credential_request\`, \`authority_impersonation\` to TRUE only if explicit evidence exists.
3.  **Details**: Extract specific artifacts (e.g., "\$50k wire", "portal login link") into detail fields. If none, use "insufficient_data".
4.  **intent_summary**: Synthesize the "Ask" in 1-2 professional sentences.

**CRITICAL NOTES:**
- **Zero Trust**: Even if the email looks polite ("Kindly..."), if it asks for money/creds without context, flag it.
- **Evidence-Based**: Do not hallucinate requests. If no financial request is present, set \`financial_request\` to false.
`;

            const result = await withRetry(
                () => emailIRAnalyst.generate(prompt, {
                    output: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
                }),
                'body-intent-analysis-llm'
            );

            logStepComplete(loggerIntent, ctx, { result: result.object });

            return {
                ...result.object,
                original_email: email,
            };
        } catch (error) {
            logStepError(loggerIntent, ctx, error as Error);
            throw error;
        }
    },
});
