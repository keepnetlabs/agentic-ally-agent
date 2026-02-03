import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { headerAnalysisOutputSchema } from './header-analysis';
import { bodyBehavioralAnalysisOutputSchema } from './body-behavioral-analysis';
import { bodyIntentAnalysisOutputSchema } from './body-intent-analysis';

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

        // Fallbacks for display name and body
        const senderDisplay = original_email.senderName || original_email.from;
        const emailBody = original_email.htmlBody || JSON.stringify(original_email.urls || []);

        const prompt = `
# Task: Incident Triage & Classification

Your role is to **classify the email into ONE category** based on content, intent, and behavioral signals.
You have access to preliminary analysis which you MUST use.

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

## CRITICAL PRINCIPLE
**The absence of technical indicators (clean URLs, no malware, passing SPF/DKIM) does NOT imply the email is safe.**
Behavioral signals, intent, and social engineering patterns are valid risk indicators even when engines report "clean".

## CATEGORY DEFINITIONS

### Low-Risk Categories
- **Spam**: Unsolicited bulk advertising, unwanted promotions, generic mass emails
- **Marketing**: Legitimate promotional content from known vendors/partners, newsletters, subscription notifications
- **Internal**: Internal company communications, employee-to-employee, legitimate internal notifications (reports, meetings, updates)
- **Security Awareness**: Authorized phishing simulation tests/training exercises. Often contains "X-Phish-Test" headers or footer disclaimers.
- **Benign**: Clearly legitimate, no risk indicators observed

### High-Risk Categories
- **Phishing**: Credential harvesting, fake login pages, impersonation of trusted brands/services, malicious links with deceptive content
- **Malware**: Presence of malicious file attachments or links leading to malware payload downloads
- **CEO Fraud / BEC**: Executive impersonation, authority manipulation, urgency framing, financial/transfer requests, confidentiality claims
- **Sextortion**: Extortion threats using intimate/embarrassing content, blackmail, demands for payment or action
- **Other Suspicious**: Unusual behavioral patterns, social engineering, manipulation tactics, or threats that don't fit other categories

## DECISION RULES

- If **malicious attachment hash detected** → **Malware**
- If **simulation headers/footers found** → **Security Awareness**
- If **CEO/executive impersonation + financial/urgency request** → **CEO Fraud**
- If **credential/login request + fake or spoofed domain** → **Phishing**
- If **blackmail/extortion threat + payment demand** → **Sextortion**
- If **internal domain + legitimate notification + no red flags** → **Internal** or **Benign**
- If **legitimate vendor + promotional** → **Marketing**
- If **unknown sender + no clear intent + generic spam indicators** → **Spam**
- If **behavioral red flags present but no clear category match** → **Other Suspicious**

## EMAIL DATA

**Subject**: ${original_email.subject}
**Sender**: ${senderDisplay} <${original_email.from}>
**To**: ${original_email.to?.join(', ') || 'N/A'}
**Body Content**:
${emailBody.substring(0, 2000)}${emailBody.length > 2000 ? '...(truncated)' : ''}

## OUTPUT

Classify strictly into ONE category above.
Explain your reasoning in 2-3 sentences, referencing specific signals from the analysis.
Provide confidence score (0.0-1.0).
`;

        const result = await emailIRAnalyst.generate(prompt, {
            output: triageOutputSchema.omit({ original_email: true }),
        });

        return {
            ...result.object,
            original_email: original_email,
        };
    },
});

