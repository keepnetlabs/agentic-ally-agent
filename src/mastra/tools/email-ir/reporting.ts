import { createTool } from '@mastra/core/tools';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIRCanvasSchema } from '../../schemas/email-ir';
import { riskAssessmentOutputSchema } from './risk-assessment';
import { createLogContext, loggerReporting, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { withRetry } from '../../utils/core/resilience-utils';

export const reportingTool = createTool({
    id: 'email-ir-reporting-tool',
    description: 'Generates Final Canvas JSON Report',
    inputSchema: riskAssessmentOutputSchema,
    outputSchema: EmailIRCanvasSchema,
    execute: async ({ context }) => {
        const inputData = context;
        const emailId = inputData.original_email.from?.split('@')[0] || 'unknown-sender';
        const ctx = createLogContext(emailId, 'reporting');

        try {
            logStepStart(loggerReporting, ctx, { risk_level: inputData.risk_level });

            const prompt = `
# Enterprise Email Incident Response Report Generation

You are a **Senior Incident Response Analyst** generating a formal investigation report for enterprise SOC operations.
This report will be used for executive briefings, compliance audits, and incident tracking.

---

## INCIDENT CONTEXT

| Field | Value |
|-------|-------|
| **Subject** | ${inputData.original_email.subject} |
| **Sender** | ${inputData.original_email.from} |
| **Category** | ${inputData.triage_result.category} |
| **Risk Level** | ${inputData.risk_level} |
| **Confidence** | ${(inputData.confidence * 100).toFixed(0)}% |

---

## ANALYSIS DATA

**Triage Result:**
${JSON.stringify(inputData.triage_result, null, 2)}

**Feature Extraction:**
${JSON.stringify(inputData.feature_result, null, 2)}

**Risk Assessment Justification:**
${inputData.justification}

---

## MANDATORY FIELD VALUES (MUST USE EXACTLY)

These values are already computed and MUST be used exactly as provided in the output:

| Field | Required Value |
|-------|----------------|
| executive_summary.email_category | "${inputData.triage_result.category}" |
| executive_summary.risk_level | "${inputData.risk_level}" |
| executive_summary.confidence | ${inputData.confidence} |
| executive_summary.reported_by | 1 |
| executive_summary.similar_emails_detected | 0 |
| executive_summary.status | "Investigation Complete" |

---

## REPORT GENERATION INSTRUCTIONS

### 1. Executive Summary
- **verdict**: Decisive, professional verdict statement
  - Critical/High: "Confirmed [Threat Type] Attack - Immediate Action Required"
  - Medium: "Suspicious Activity Detected - Review Recommended"  
  - Low: "No Threat Detected - [Category] Email"
  - Examples: "Confirmed BEC Attack Targeting Finance Department", "Legitimate Marketing Newsletter", "Authorized Security Training Exercise"

### 2. Agent Determination
Write a 3-5 sentence executive narrative:
- State the final verdict clearly
- Summarize key evidence that led to the determination
- Highlight any notable findings (e.g., "Despite passing SPF/DKIM, behavioral analysis revealed clear social engineering patterns")
- Note confidence level and any caveats

### 3. Risk Indicators
Based on feature_result, categorize indicators:
- **observed**: List all detected risk signals (e.g., "Authority impersonation detected", "Urgency framing present", "SPF authentication failed")
- **not_observed**: List checked-but-clean signals (e.g., "No malicious URLs detected", "No credential harvesting attempt", "No financial request")

### 4. Evidence Flow
Create 4-6 investigation steps showing logical progression:
- Step 1: Email received and queued for analysis
- Step 2: Header/Authentication analysis performed
- Step 3: Behavioral pattern analysis completed
- Step 4: Intent classification determined
- Step 5: Risk assessment calculated
- Step 6: Final verdict rendered

### 5. Actions Taken (Automated)
List system actions already performed:
- "Email headers extracted and analyzed"
- "Sender authentication verified (SPF/DKIM/DMARC)"
- "URL reputation checked against threat intelligence"
- "Behavioral patterns analyzed for social engineering"
- "Risk score calculated using Engine-Blind methodology"

### 6. Actions Recommended
Provide risk-appropriate remediation:
- **Critical**: "Quarantine immediately", "Block sender domain", "Notify CISO", "Check for lateral movement"
- **High**: "Remove from inbox", "Notify affected user", "Monitor for similar emails"
- **Medium**: "Flag for SOC review", "Add to watchlist", "Educate user"
- **Low**: "No action required", "Update spam filters if needed"

### 7. Technical Details
Populate from feature_result:
- sender_analysis.domain_similarity_detected: Based on header analysis
- sender_analysis.trusted_internal_alignment: Is sender from internal domain?
- delivery_pattern.targeted_delivery: true (single recipient)
- delivery_pattern.volume: "Single email" or "Bulk"
- delivery_pattern.intent: From intent_analysis
- content_characteristics: urgency_framing, authority_misuse, verification_avoidance flags

### 8. Transparency Notice
Use exactly: "This report was generated by an AI-powered Email Incident Response Analyst. All findings have been computed using multi-stage behavioral, intent, and technical analysis. Critical and High-risk findings should be validated by a human analyst before taking irreversible action."

### 9. Confidence Limitations
Based on confidence score:
- **0.90+**: "High confidence in determination. Multiple independent signals converge on this verdict."
- **0.70-0.89**: "Good confidence. Primary indicators are clear, minor ambiguity in secondary signals."
- **0.50-0.69**: "Moderate confidence. Human review recommended before taking action."
- **Below 0.50**: "Low confidence. Insufficient data or conflicting signals. Manual investigation required."

---

## COMPLIANCE NOTICE

This report format is designed for:
- SOC2 Type II audit compliance
- ISO 27001 incident documentation
- Executive security briefings
- Legal/HR escalation documentation
`;

            const result = await withRetry(
                () => emailIRAnalyst.generate(prompt, {
                    output: EmailIRCanvasSchema,
                }),
                'reporting-llm'
            );

            logStepComplete(loggerReporting, ctx, { report_generated: true });

            return result.object;
        } catch (error) {
            logStepError(loggerReporting, ctx, error as Error);
            throw error;
        }
    }
});
