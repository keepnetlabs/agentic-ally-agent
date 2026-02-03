import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';

export const bodyIntentAnalysisOutputSchema = z.object({
    intent: z.enum(['benign', 'phishing', 'sextortion', 'impersonation', 'fraud']).describe('Overall intent classification'),
    financial_request: z.boolean().describe('True if email requests money, payment, wire transfer, gift cards, etc.'),
    credential_request: z.boolean().describe('True if email requests passwords, OTPs, login links, MFA codes, etc.'),
    authority_impersonation: z.boolean().describe('True if sender claims to be CEO, executive, HR, IT, authority figure, etc.'),
    financial_request_details: z.string().describe('Specific financial requests if present (e.g., "wire $50k to account XYZ") or "none"'),
    credential_request_details: z.string().describe('Specific credential requests if present (e.g., "password reset link") or "none"'),
    authority_claimed: z.string().describe('Authority figure claimed if present (e.g., "CEO John Smith") or "none"'),
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
        const emailBody = email.htmlBody || email.subject || 'No body content';
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

## OUTPUT

Analyze purely for INTENT (what is being requested/what's the purpose):

1. **intent**: Overall classification (benign/phishing/sextortion/impersonation/fraud)
2. **financial_request**: true if any payment/transfer requested
3. **credential_request**: true if any authentication/password requested
4. **authority_impersonation**: true if sender claims authority role
5. **financial_request_details**: Specific amount/account if present, or "none"
6. **credential_request_details**: Specific system/platform if present, or "none"
7. **authority_claimed**: Specific role if claimed, or "none"
8. **intent_summary**: 1-2 sentence summary of what's being asked

**Example Analysis:**
Email: "Hi, I'm CEO John Smith. Wire \$50k to account 123-456 immediately for acquisition."
- intent: impersonation (or fraud, depending on context)
- financial_request: true
- credential_request: false
- authority_impersonation: true
- financial_request_details: "Wire \$50k to account 123-456"
- credential_request_details: "none"
- authority_claimed: "CEO John Smith"
- intent_summary: "Sender impersonates CEO and requests wire transfer of \$50k"

**Note**: You are analyzing PURPOSE/REQUESTS, not manipulation tactics.
If email is legitimate business communication with no requests, classify as benign with false for all request booleans.
`;

        const result = await emailIRAnalyst.generate(prompt, {
            output: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
        });

        return {
            ...result.object,
            original_email: email,
        };
    },
});
