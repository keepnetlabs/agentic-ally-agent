import { createTool } from '@mastra/core/tools';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIRCanvasSchema, EMAIL_IR_EMAIL_CATEGORIES } from '../../schemas/email-ir';
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
        const emailCategoryList = EMAIL_IR_EMAIL_CATEGORIES.join(', ');
        const evidenceStrength =
            inputData.confidence >= 0.8 ? 'Strong' :
            inputData.confidence >= 0.55 ? 'Moderate' : 'Limited';
        const confidenceBasis = 'Based on behavioral and contextual indicators.';

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
| **Evidence Strength** | ${evidenceStrength} |
| **Confidence Basis** | ${confidenceBasis} |

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
| executive_summary.evidence_strength | "${evidenceStrength}" |
| executive_summary.confidence_basis | "${confidenceBasis}" |
| executive_summary.status | "Analysis Complete" |

---

## REPORT GENERATION INSTRUCTIONS

### 0. Evidence Grounding (STRICT)
- Use only facts explicitly present in the provided analysis inputs:
  - triage_result
  - feature_result
  - risk assessment justification
- Do NOT invent new technical artifacts (URL paths, domains, file names, hashes, IPs, sender aliases) that are not explicitly present in those inputs.
- Prefer conclusion-level wording such as:
  - "malicious URL indicators were observed"
  - "threat intelligence flagged embedded links"
  - "behavioral and intent signals converged on phishing"
- If concrete IOC detail is not explicitly provided, state the reason at summary level instead of guessing specifics.

### 1. Executive Summary
- **verdict**: Decisive, professional verdict statement
  - Critical/High: "[Threat Type] Confirmed - Immediate Action Required"
  - Medium: "Suspicious Activity Detected - Review Recommended"  
  - Low: "No Threat Detected - [Category] Email"
- **why_this_matters**: One concise line explaining business impact for executive decision-making.
  - Example: "This pattern indicates elevated account-compromise and payment-diversion risk, requiring immediate containment."
  - Examples: "BEC Pattern Targeting Finance Department", "Legitimate Marketing Newsletter", "Authorized Security Training Exercise"

### 2. Agent Determination
Write a 3-5 sentence executive narrative:
- State the final verdict clearly
- Summarize key evidence that led to the determination
- Highlight any notable findings (e.g., "Despite passing SPF/DKIM, behavioral analysis revealed clear social engineering patterns")
- Note evidence strength (Strong/Moderate/Limited) and any caveats

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
For each step, include:
- finding_label: short badge (PASS, FLAG, ALERT, HIGH) for non-final steps
- Final step finding_label MUST exactly match executive_summary.email_category
  (one of: ${emailCategoryList})

### 5. Actions Recommended (P1/P2/P3 Structure - REQUIRED)
Return **actions_recommended** as an object with this exact shape:
- p1_immediate: actions to execute now (containment / blocking / urgent response)
- p2_follow_up: actions to complete within 24 hours (user notification, scoped validation, monitoring follow-up)
- p3_hardening: actions for this week (awareness, policy/rule tuning, controls hardening)

Risk-to-priority guidance:
- **Critical/High**: Populate all 3 buckets. P1 should contain 2-5 concrete actions.
- **Medium**: Populate P2 and P3, include P1 only when immediate containment is justified.
- **Low**: Keep P1 empty unless truly needed; focus on P2/P3 hygiene actions.

### 6. Confidence Limitations
Use evidence strength wording, not percentages:
- **Strong**: "Strong evidence support. Multiple independent signals converge on this verdict."
- **Moderate**: "Moderate evidence support. Human review recommended before taking action."
- **Limited**: "Limited evidence support. Insufficient data or conflicting signals. Manual investigation required."

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
