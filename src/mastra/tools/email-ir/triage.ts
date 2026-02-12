import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { headerAnalysisOutputSchema } from './header-analysis';
import { bodyBehavioralAnalysisOutputSchema } from './body-behavioral-analysis';
import { bodyIntentAnalysisOutputSchema } from './body-intent-analysis';
import { createLogContext, loggerTriage, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { withRetry } from '../../utils/core/resilience-utils';
import { sanitizeEmailBody } from './email-body-sanitizer';
import { EMAIL_IR_EMAIL_CATEGORIES } from '../../schemas/email-ir';

// Input is the combined analysis from the previous step
export const triageInputSchema = z.object({
    original_email: EmailIREmailDataSchema,
    header_analysis: headerAnalysisOutputSchema.omit({ original_email: true }),
    behavioral_analysis: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
    intent_analysis: bodyIntentAnalysisOutputSchema.omit({ original_email: true }),
});

export const triageOutputSchema = z.object({
    category: z.enum(EMAIL_IR_EMAIL_CATEGORIES),
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
            const emailBody = sanitizeEmailBody(original_email.htmlBody || '') || JSON.stringify(original_email.urls || []);

            const prompt = `
# Task: Enterprise Email Incident Triage & Classification

You are the **Triage Decision Engine** in an Enterprise Security Operations Center (SOC).
Your role is to **classify the email into exactly ONE category** using multi-stage analysis data.

## CLASSIFICATION HIERARCHY (Severity-Based Priority)

When multiple categories could apply, select the **highest severity** match:

| Priority | Category | Severity | Escalation |
|----------|----------|----------|------------|
| 1 | Malware | CRITICAL | Immediate quarantine |
| 2 | CEO Fraud | HIGH | Executive notification |
| 3 | Sextortion | HIGH | Legal/HR notification |
| 4 | Phishing | HIGH | User notification |
| 5 | Other Suspicious | MEDIUM | SOC review |
| 6 | Spam | LOW | Auto-filter |
| 7 | Marketing | LOW | User preference |
| 8 | Internal | INFO | No action |
| 9 | Security Awareness | INFO | Training tracking |
| 10 | Benign | INFO | No action |

## CONFLICT RESOLUTION RULES

1. **Simulation Override**: If \`security_awareness_detected == true\`, classify as **Security Awareness** regardless of other signals.
2. **Compromised Account**: If SPF/DKIM pass BUT intent is malicious (Phishing/Fraud), still classify by intent (account may be compromised).
3. **Ambiguity Fallback**: If suspicious signals exist but don't fit a defined pattern, use **Other Suspicious**.

## CATEGORY DEFINITIONS (Enterprise Standard)

### CRITICAL/HIGH RISK

| Category | Definition | Key Indicators |
|----------|------------|----------------|
| **Malware** | Malicious payload delivery via attachment or link | threat_intel = malicious, suspicious file types (.exe, .js, .scr), known malware signatures |
| **CEO Fraud** | Business Email Compromise (BEC) targeting financial transfers | authority_impersonation + financial_request + urgency + verification_avoidance |
| **Sextortion** | Extortion using intimate/embarrassing content | blackmail language, payment demands (Bitcoin/gift cards), threats to expose |
| **Phishing** | Credential harvesting attempts | fake login pages, credential_request, brand impersonation, suspicious URLs |

### MEDIUM RISK

| Category | Definition | Key Indicators |
|----------|------------|----------------|
| **Other Suspicious** | Anomalous behavior not fitting defined patterns | social_engineering detected, urgency without clear intent, mixed signals |

### LOW RISK / INFORMATIONAL

| Category | Definition | Key Indicators |
|----------|------------|----------------|
| **Spam** | Unsolicited bulk email WITHOUT consent | No List-Unsubscribe, unknown sender, SPF/DKIM often fail, generic content |
| **Marketing** | Legitimate promotional email WITH implied consent | List-Unsubscribe present, known brand, SPF/DKIM pass, professional formatting |
| **Internal** | Legitimate internal company communication | Internal domain, employee-to-employee, no manipulation signals |
| **Security Awareness** | Authorized phishing simulation/training | X-Phish-Test header, known simulation platform, security_awareness_detected = true |
| **Benign** | Legitimate NON-PROMOTIONAL content | All auth pass, no behavioral flags, transactional/personal/informational (NOT promotional) |

### SPAM vs MARKETING Decision Matrix

Use \`list_unsubscribe_present\` from header analysis as the primary differentiator:

| Signal | Spam | Marketing |
|--------|------|-----------|
| **list_unsubscribe_present** | **false** | **true** |
| SPF/DKIM/DMARC | Often FAIL | Usually PASS |
| Sender Domain | Unknown/Suspicious | Known Brand |
| User Consent | NO (unsolicited) | IMPLIED (opt-in likely) |
| Content Quality | Low/Generic | Professional/Branded |

**Decision Rule:**
- IF \`list_unsubscribe_present == true\` AND SPF/DKIM pass -> **Marketing**
- IF \`list_unsubscribe_present == false\` AND bulk promotional content -> **Spam**

### BENIGN vs MARKETING Decision Matrix

**CRITICAL**: "Benign" is for transactional/informational content, NOT promotional content.

| Signal | Benign | Marketing |
|--------|--------|-----------|
| **Content Type** | Transactional, personal, notification, reply | Promotional, event invite, newsletter, offer |
| **Primary Intent** | Informational (notify, confirm, update) | Persuasive (sell, promote, register, join) |
| **Urgency Framing** | Rare, action-required only | Common (limited time/seats, exclusive) |
| **Tracking URLs** | Rare | Common (awstrack, mailchimp, hubspot) |
| **CTA Focus** | Action-based (verify, confirm, view) | Promotion-based (register, buy, join, try) |
| **Incentives** | None | Discounts, free trials, exclusive benefits |
| **Sender Type** | System/personal | Brand/company marketing |

**Decision Rule:**
- IF promotional content (events, discounts, newsletters, webinars, community invites) -> **Marketing**
- IF transactional/personal/pure informational content (receipts, confirmations, replies) -> **Benign**
- **NOTE**: Forwarded emails may lose List-Unsubscribe header - use **content analysis** as primary signal

**Examples:**
| Email Type | Category | Why |
|------------|----------|-----|
| "Your order has shipped" | Benign | Transactional notification |
| "Join our AI webinar - limited seats!" | Marketing | Promotional event invite |
| "Password reset requested" | Benign | System notification |
| "Black Friday Sale - 50% off" | Marketing | Promotional offer |
| "Meeting notes from yesterday" | Benign | Personal/work communication |
| "Exclusive community benefits await" | Marketing | Promotional incentive |

---

## PRELIMINARY ANALYSIS FINDINGS

### 1. Header & Authentication
- **SPF Pass**: ${header_analysis.spf_pass}
- **DKIM Pass**: ${header_analysis.dkim_pass}
- **DMARC Pass**: ${header_analysis.dmarc_pass}
- **Domain Similarity**: ${header_analysis.domain_similarity}
- **Header Summary**: ${header_analysis.header_summary}
- **Security Awareness Detected**: ${header_analysis.security_awareness_detected}
- **List-Unsubscribe Present (RFC 2369)**: ${header_analysis.list_unsubscribe_present}

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

## OUTPUT REQUIREMENTS

Generate a structured triage verdict:

1. **category**: Select exactly ONE category from the defined list. Apply hierarchy rules if multiple match.

2. **reason**: Provide SOC-ready justification (2-3 sentences):
   - State the primary signal(s) that determined classification
   - Reference specific evidence from analysis data
   - Note any conflict resolution applied (e.g., "Classified as Phishing despite SPF pass due to clear credential harvesting intent")

3. **confidence**: Score between 0.0 and 1.0:
   - **0.90-1.0**: Strong match, multiple converging signals
   - **0.70-0.89**: Good match, primary signals clear
   - **0.50-0.69**: Moderate confidence, some ambiguity
   - **Below 0.50**: Low confidence, recommend human review (note in reason)

### Enterprise Compliance Note
This classification will be used for:
- SOC ticket routing and escalation
- Automated response actions
- Compliance reporting (SOC2, ISO27001)
- Executive dashboards

Accuracy is critical. When uncertain, prefer **Other Suspicious** over misclassification.
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



