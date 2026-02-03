import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { headerAnalysisOutputSchema } from './header-analysis';
import { bodyBehavioralAnalysisOutputSchema } from './body-behavioral-analysis';
import { bodyIntentAnalysisOutputSchema } from './body-intent-analysis';
import { createLogContext, loggerTriage, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { withRetry } from '../../utils/core/resilience-utils';

// Input is the combined analysis from the previous step
export const triageInputSchema = z.object({
    original_email: EmailIREmailDataSchema,
    header_analysis: headerAnalysisOutputSchema.omit({ original_email: true }),
    behavioral_analysis: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
    intent_analysis: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
});

export const triageOutputSchema = z.object({
    category: z.enum([
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
    reason: z.string().describe('Clear explanation for the category decision'),
    confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
    original_email: EmailIREmailDataSchema, // Pass-through
});

export const triageTool = createTool({
    id: 'email-ir-triage-tool',
    description: 'Classifies email into Triage categories categories using full analysis context',
    inputSchema: triageInputSchema,
    outputSchema: triageOutputSchema,
    execute: async ({ context }) => {
        const { original_email, header_analysis, behavioral_analysis, intent_analysis } = context;
        const emailId = original_email.from?.split('@')[0] || 'unknown-sender';
        const ctx = createLogContext(emailId, 'triage');

        try {
            logStepStart(loggerTriage, ctx, { subject: original_email.subject });

            // Fallbacks for display name and body
            const senderDisplay = original_email.senderName || original_email.from;
            const emailBody = original_email.htmlBody || JSON.stringify(original_email.urls || []);

            const prompt = `
# Task: Incident Triage & Classification

Your role is to **classify the email into ONE category** using the provided multi-stage analysis data.
You are the **Final Decision Maker**.

## TRIAGE DIRECTIVES

### 1. Classification Hierarchy (Severity-Based)
If multiple categories apply, prioritize the highest severity:
1.  **Malware** (Highest): Attachment/Link to payload.
2.  **CEO Fraud / BEC**: Executive impersonation + Financial/Urgency.
3.  **Extortion**: Blackmail/Sextortion threats.
4.  **Phishing**: Credential harvesting (Fake Login).
5.  **Spam/Marketing**: Unwanted but non-malicious.

### 2. Conflict Resolution Logic (How to decide)
- **Technical vs Intent**: If SPF/DKIM pass but Intent is "Phishing", classify as **Phishing** (Compromised Account scenario).
- **Simulation**: If "Security Awareness" headers/footers are found, it overrides ALL other signals -> Classify as **Security Awareness**.
- **Ambiguity**: If suspicious signals exist but don't fit a pattern, use **Other Suspicious**.

### 3. Category Definitions (Detailed Reference)

#### High-Risk Categories
- **Malware**: Presence of malicious file attachments or links leading to malware payload downloads.
- **CEO Fraud / BEC**: Executive impersonation, authority manipulation, urgency framing, financial/transfer requests, confidentiality claims.
- **Sextortion**: Extortion threats using intimate/embarrassing content, blackmail, demands for payment or action.
- **Phishing**: Credential harvesting, fake login pages, impersonation of trusted brands/services, malicious links.
- **Other Suspicious**: Unusual behavioral patterns, social engineering, manipulation tactics, or threats that don't fit other categories.

#### Low-Risk Categories
- **Spam**: Unsolicited bulk advertising, unwanted promotions, generic mass emails.
- **Marketing**: Legitimate promotional content from known vendors/partners, newsletters, subscription notifications.
- **Internal**: Internal company communications, employee-to-employee, legitimate internal notifications.
- **Security Awareness**: Authorized phishing simulation tests/training exercises. Often contains "X-Phish-Test" headers.
- **Benign**: Clearly legitimate, no risk indicators observed.

---

## PRELIMINARY ANALYSIS FINDINGS

### 1. Header & Authentication
- **SPF Pass**: ${header_analysis.spf_pass}
- **DKIM Pass**: ${header_analysis.dkim_pass}
- **DMARC Pass**: ${header_analysis.dmarc_pass}
- **Domain Similarity**: ${header_analysis.domain_similarity}
- **Header Summary**: ${header_analysis.header_summary}

### 2. Behavioral Analysis
- **Urgency Level**: ${behavioral_analysis.urgency_level}
- **Emotional Pressure**: ${behavioral_analysis.emotional_pressure}
- **Social Engineering Pattern**: ${behavioral_analysis.social_engineering_pattern}
- **Verification Avoidance**: ${behavioral_analysis.verification_avoidance}

### 3. Intent Analysis
- **Primary Intent**: ${intent_analysis.intent}
- **Financial Request**: ${intent_analysis.financial_request}
- **Credential Request**: ${intent_analysis.credential_request}
- **Authority Impersonation**: ${intent_analysis.authority_impersonation}

---

## EMAIL DATA

**Subject**: ${original_email.subject}
**Sender**: ${senderDisplay} <${original_email.from}>
**To**: ${original_email.to?.join(', ') || 'N/A'}
**Body Content**:
${emailBody.substring(0, 2000)}${emailBody.length > 2000 ? '...(truncated)' : ''}

---

## OUTPUT INSTRUCTIONS

Classify strictly into ONE category based on the logic above.
1.  **category**: Select the single most accurate category.
2.  **reason**: Explain *why* you chose this category (e.g., "Intent is Credential Theft despite valid SPF, indicating compromised account").
3.  **confidence**: 0.0 to 1.0 based on signal strength.
`;

            const result = await withRetry(
                () => emailIRAnalyst.generate(prompt, {
                    output: triageOutputSchema.omit({ original_email: true }),
                }),
                'triage-llm'
            );

            logStepComplete(loggerTriage, ctx, { result: result.object });

            return {
                ...result.object,
                original_email: original_email,
            };
        } catch (error) {
            logStepError(loggerTriage, ctx, error as Error);
            throw error;
        }
    },
});

