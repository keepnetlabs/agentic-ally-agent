import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { triageOutputSchema } from './triage';
import { featureExtractionOutputSchema } from './feature-extraction';
import { createLogContext, loggerRiskAssessment, logStepStart, logStepComplete, logStepError } from './logger-setup';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';
import { withRetry } from '../../utils/core/resilience-utils';

export const riskAssessmentOutputSchema = z.object({
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  justification: z.string().describe('clear explanation suitable for SOC reporting'),

  // Pass-through context
  original_email: EmailIREmailDataSchema,
  triage_result: triageOutputSchema.omit({ original_email: true }),
  feature_result: featureExtractionOutputSchema.omit({ original_email: true, triage_result: true }),
});

export const riskAssessmentTool = createTool({
  id: 'email-ir-risk-assessment-tool',
  description: 'Assesses risk using Engine-Blind logic',
  inputSchema: featureExtractionOutputSchema,
  outputSchema: riskAssessmentOutputSchema,
  execute: async ({ context }) => {
    const inputData = context;
    const emailId = inputData.original_email.from?.split('@')[0] || 'unknown-sender';
    const ctx = createLogContext(emailId, 'risk-assessment');

    try {
      logStepStart(loggerRiskAssessment, ctx, { triage_category: inputData.triage_result.category });

      const prompt = `
You are the **Risk Assessment Agent** in an Enterprise Email Security Operations Center (SOC).

Your task is to assign a **risk_level** (Low/Medium/High/Critical) and **confidence score** (0.0-1.0) based on extracted email features.
Apply Engine-Blind methodology: focus on behavioral, intent, and manipulation signals rather than relying solely on technical indicators.

## CRITICAL PRINCIPLE

**Engine-blind attacks exist**: The absence of technical indicators (clean URLs, no malware, passing SPF/DKIM) does NOT imply the email is safe.
Risk scoring must account for:
1. **Behavioral intent** (what is the email trying to do?)
2. **Social engineering patterns** (manipulation tactics, authority, urgency, coercion)
3. **Authentication anomalies** (domain spoofing, SPF/DKIM/DMARC failures)
4. **Triage classification** (already categorized threat type)

---

## RISK SCORING FRAMEWORK

### CRITICAL RISK (0.95-1.0 confidence)
Email exhibits:
- **Malware**: Known malicious attachment or link detected with confirmed threat intel.
- **Active exploitation**: Evidence of ongoing attack or confirmed compromise.

### HIGH RISK (0.75-0.94 confidence)
Email exhibits one or more of:
- **Clear malicious intent**: Phishing, Sextortion, CEO Fraud, Credential Harvest
- **Authority impersonation + financial request**: Executive pretending to be C-level + wire transfer/payment demand
- **Extortion/Blackmail**: Sextortion with explicit threat + payment demand
- **Credential harvest**: Login pages, OTP requests, password prompts + spoofed domain
- **SPF/DKIM/DMARC failures** + **impersonation attempt** (domain similarity or display name abuse)
- **Verification avoidance** + **urgency framing** (e.g., "don't call the number", "keep confidential", "act now")

### MEDIUM RISK (0.40-0.74 confidence)
Email exhibits:
- **Behavioral red flags without clear malicious intent**: Urgency framing + financial request (but not from trusted authority)
- **Suspicious sender domain** but legitimate-looking content
- **Social engineering pattern detected**: Pretexting, baiting, or unusual urgency without financial/credential request
- **Unverified sender** (fails SPF/DKIM/DMARC) + unusual request
- **Mixed signals**: Some indicators suggest risk, but mitigating factors exist (e.g., internal domain but unusual request)
- **Generic phishing attempt**: Low-sophistication but clear credential/financial angle

### LOW RISK (0.0-0.39 confidence)
Email exhibits:
- **Security Awareness / Simulation**: Validated phishing test.
- **Triage verdict is Benign, Internal, or Marketing**
- **No behavioral manipulation signals detected**
- **spf_pass/dkim_pass/dmarc_pass are true** + **legitimate sender context** (known vendor, internal domain)
- **Informational content** with no financial, credential, or action requests
- **No authority impersonation**, **no urgency framing**, **no emotional pressure**

---

## CONFIDENCE SCORING RULES

**Increase confidence when:**
- Multiple risk signals converge (e.g., authority impersonation + urgency + financial request = HIGH)
- Authentication anomalies align with behavioral/intent signals (e.g., spoofed domain + credential request)
- High-risk triage category (Phishing, CEO Fraud, Sextortion, Other Suspicious)
- Clear decision rules apply (see below)

**Decrease confidence when:**
- Mixed signals (e.g., financial request but from seemingly legitimate source)
- SPF/DKIM/DMARC pass (harder to impersonate, reduces suspicion)
- Internal domain sender (more likely legitimate)
- threat_intel_findings == "none" despite suspicious intent

**Critical Rule:**
- If **confidence < 0.50** and **risk_level is High or Critical**, flag for human review in justification
- Always note uncertainty in justification if confidence is 0.40-0.60

---

## DECISION RULES

Use this logic to assign risk_level (use PascalCase: Low, Medium, High, Critical):

**IF** triage_category == 'Malware' AND threat_intel confirms malicious payload
  **THEN** risk_level = Critical (confidence 0.95-1.0)

**IF** triage_category == 'Malware' (unconfirmed but suspicious)
  **THEN** risk_level = High (confidence 0.85-0.94)

**IF** triage_category == 'Phishing' OR triage_category == 'CEO Fraud' OR triage_category == 'Sextortion'
  **THEN** risk_level = High (confidence 0.80-0.95)

**IF** triage_category == 'Other Suspicious' AND (authority_impersonation OR (emotional_pressure != 'none' AND emotional_pressure != 'insufficient_data') OR (social_engineering_pattern != 'none' AND social_engineering_pattern != 'insufficient_data'))
  **THEN** risk_level = Medium or High (confidence 0.60-0.85)

**IF** triage_category == 'Other Suspicious' AND (domain_similarity != 'none' OR spf_pass == false OR dkim_pass == false OR dmarc_pass == false)
  **THEN** risk_level = Medium (confidence 0.60-0.75)

**IF** triage_category == 'Security Awareness' (Simulation)
  **THEN** risk_level = Low (confidence 0.95-1.0) - Note "Training Exercise" in justification.

**IF** triage_category == 'Spam' OR triage_category == 'Marketing'
  **THEN** risk_level = Low (confidence 0.85-0.95)

**IF** triage_category == 'Internal' AND urgency_level IN ['none','insufficient_data'] AND emotional_pressure IN ['none','insufficient_data'] AND social_engineering_pattern IN ['none','insufficient_data'] AND financial_request == false AND credential_request == false
  **THEN** risk_level = Low (confidence 0.90-0.98)

**IF** triage_category == 'Benign'
  **THEN** risk_level = Low (confidence 0.95-0.99)

---

## JUSTIFICATION GUIDANCE

Provide 2-3 sentences explaining the risk_level decision. Include:
1. **What triggered the risk assessment** (triage verdict, key behavioral signal, authentication failure, etc.)
2. **Why this risk_level was assigned** (relates back to scoring framework)
3. **Any caveats or human review flags** (if confidence < 0.50, note uncertainty; if engine-blind attack suspected, note reliance on behavioral signals)

Example:
- Critical: "Confirmed malware payload detected in attachment with VirusTotal flagging from multiple engines. Confidence 0.98 - immediate quarantine recommended."
- High: "Email impersonates CEO with urgent financial request and fails DKIM verification. Confidence 0.92 - clear BEC pattern."
- Medium: "Email requests unusual urgency but lacks clear malicious intent. Confidence 0.62 - recommend human review given mixed signals."
- Low: "Identified as Security Awareness training exercise. Confidence 0.99 - authorized simulation."
- Low: "Email is internal marketing notification with no behavioral manipulation. Confidence 0.94 - fully confident in benign verdict."

---

## INPUT DATA

**Triage Result (verbatim):**
${JSON.stringify(inputData.triage_result, null, 2)}

**Key Risk Signals (summarized):**
- header_auth: spf_pass=${inputData.header_analysis?.spf_pass}, dkim_pass=${inputData.header_analysis?.dkim_pass}, dmarc_pass=${inputData.header_analysis?.dmarc_pass}, domain_similarity=${inputData.header_analysis?.domain_similarity}
- intent: ${inputData.intent_analysis?.intent}
- credential_request: ${inputData.intent_analysis?.credential_request}
- financial_request: ${inputData.intent_analysis?.financial_request}
- authority_impersonation: ${inputData.intent_analysis?.authority_impersonation}
- behavioral: urgency=${inputData.behavioral_analysis?.urgency_level}, emotional_pressure=${inputData.behavioral_analysis?.emotional_pressure}, social_engineering=${inputData.behavioral_analysis?.social_engineering_pattern}, verification_avoidance=${inputData.behavioral_analysis?.verification_avoidance}
- threat_intel_findings: ${inputData.header_analysis?.threat_intel_findings || 'none'}

---

## OUTPUT

Assign risk_level (Low/Medium/High/Critical - PascalCase) and confidence (0.0-1.0) based on the framework above.
Provide clear SOC-ready justification.
`;

      const result = await withRetry(
        () =>
          emailIRAnalyst.generate(prompt, {
            output: riskAssessmentOutputSchema.omit({
              original_email: true,
              triage_result: true,
              feature_result: true,
            }),
          }),
        'risk-assessment-llm'
      );

      logStepComplete(loggerRiskAssessment, ctx, { result: result.object });

      return {
        ...result.object,
        original_email: inputData.original_email,
        triage_result: inputData.triage_result,
        feature_result: {
          intent: inputData.intent,
          urgency: inputData.urgency,
          authority_impersonation: inputData.authority_impersonation,
          financial_request: inputData.financial_request,
          credential_request: inputData.credential_request,
          emotional_pressure: inputData.emotional_pressure,
          social_engineering_pattern: inputData.social_engineering_pattern,
          engine_indicators_present: inputData.engine_indicators_present,
          analysis_summary: inputData.analysis_summary,
          header_analysis: inputData.header_analysis,
          behavioral_analysis: inputData.behavioral_analysis,
          intent_analysis: inputData.intent_analysis,
        },
      };
    } catch (error) {
      const err = normalizeError(error);
      logStepError(loggerRiskAssessment, ctx, err);
      const errorInfo = errorService.aiModel(err.message, { step: 'risk-assessment', stack: err.stack });
      logErrorInfo(loggerRiskAssessment, 'error', 'Risk assessment failed', errorInfo);
      const e = new Error(err.message);
      (e as Error & { code?: string }).code = errorInfo.code;
      throw e;
    }
  },
});
