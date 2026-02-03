import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';
import { triageOutputSchema } from './triage';
import { featureExtractionOutputSchema } from './feature-extraction';

export const riskAssessmentOutputSchema = z.object({
    risk_level: z.enum(['low', 'medium', 'high']),
    confidence: z.number().min(0).max(100),
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
        const prompt = `
You are the **Risk Assessment Agent**.

Your task is to assign a risk_level (low/medium/high) and confidence score (0-100) based on extracted email features.
Ignore technical engine indicators; focus on behavioral, intent, and manipulation signals.

## CRITICAL PRINCIPLE

**Engine-blind attacks exist**: The absence of technical indicators (clean URLs, no malware, passing SPF/DKIM) does NOT imply the email is safe.
Risk scoring must account for:
1. **Behavioral intent** (what is the email trying to do?)
2. **Social engineering patterns** (manipulation tactics, authority, urgency, coercion)
3. **Authentication anomalies** (domain spoofing, SPF/DKIM/DMARC failures)
4. **Triage classification** (already categorized threat type)

---

## RISK SCORING FRAMEWORK

### HIGH RISK (75-100 confidence)
Email exhibits one or more of:
- **Clear malicious intent**: Phishing, Sextortion, CEO Fraud, Credential Harvest
- **Authority impersonation + financial request**: Executive pretending to be C-level + wire transfer/payment demand
- **Extortion/Blackmail**: Sextortion with explicit threat + payment demand
- **Credential harvest**: Login pages, OTP requests, password prompts + spoofed domain
- **SPF/DKIM/DMARC failures** + **impersonation attempt** (domain similarity or display name abuse)
- **Verification avoidance** + **urgency framing** (e.g., "don't call the number", "keep confidential", "act now")

### MEDIUM RISK (40-74 confidence)
Email exhibits:
- **Behavioral red flags without clear malicious intent**: Urgency framing + financial request (but not from trusted authority)
- **Suspicious sender domain** but legitimate-looking content
- **Social engineering pattern detected**: Pretexting, baiting, or unusual urgency without financial/credential request
- **Unverified sender** (fails SPF/DKIM) + unusual request
- **Mixed signals**: Some indicators suggest risk, but mitigating factors exist (e.g., internal domain but unusual request)
- **Generic phishing attempt**: Low-sophistication but clear credential/financial angle

### LOW RISK (0-39 confidence)
Email exhibits:
- **Triage verdict is Benign, Internal, or Marketing**
- **No behavioral manipulation signals detected**
- **SPF/DKIM/DMARC pass** + **legitimate sender context** (known vendor, internal domain)
- **Informational content** with no financial, credential, or action requests
- **No authority impersonation**, **no urgency framing**, **no emotional pressure**

---

## CONFIDENCE SCORING RULES

**Increase confidence when:**
- Multiple risk signals converge (e.g., authority impersonation + urgency + financial request = HIGH)
- Technical indicators align with behavioral signals (e.g., malicious intent + engine flagged)
- High-risk triage category (Phishing, CEO Fraud, Sextortion, Other Suspicious)
- Clear decision rules apply (see below)

**Decrease confidence when:**
- Mixed signals (e.g., financial request but from seemingly legitimate source)
- SPF/DKIM/DMARC pass (harder to impersonate, reduces suspicion)
- Internal domain sender (more likely legitimate)
- Low technical indicator count despite suspicious intent

**Critical Rule:**
- If **confidence < 50%** and **risk_level is HIGH**, flag for human review in justification
- Always note uncertainty in justification if confidence is 40-60%

---

## DECISION RULES

Use this logic to assign risk_level:

**IF** triage_category == 'Phishing' OR triage_category == 'CEO Fraud' OR triage_category == 'Sextortion'
  **THEN** risk_level = HIGH (confidence 80-95)

**IF** triage_category == 'Other Suspicious' AND (authority_impersonation OR emotional_pressure != 'none' OR social_engineering_pattern != 'none')
  **THEN** risk_level = MEDIUM or HIGH (confidence 60-85)

**IF** triage_category == 'Other Suspicious' AND (engine_indicators_present OR unverified_sender)
  **THEN** risk_level = MEDIUM (confidence 60-75)

**IF** triage_category == 'Spam' OR triage_category == 'Marketing'
  **THEN** risk_level = LOW (confidence 85-95)

**IF** triage_category == 'Internal' AND no_red_flags
  **THEN** risk_level = LOW (confidence 90-98)

**IF** triage_category == 'Benign'
  **THEN** risk_level = LOW (confidence 95-99)

---

## JUSTIFICATION GUIDANCE

Provide 2-3 sentences explaining the risk_level decision. Include:
1. **What triggered the risk assessment** (triage verdict, key behavioral signal, authentication failure, etc.)
2. **Why this risk_level was assigned** (relates back to scoring framework)
3. **Any caveats or human review flags** (if confidence < 50%, note uncertainty; if engine-blind attack suspected, note reliance on behavioral signals)

Example:
- HIGH: "Email impersonates CEO with urgent financial request and fails DKIM verification. Confidence 92% - clear BEC pattern."
- MEDIUM: "Email requests unusual urgency but lacks clear malicious intent. Confidence 62% - recommend human review given mixed signals."
- LOW: "Email is internal marketing notification with no behavioral manipulation. Confidence 94% - fully confident in benign verdict."

---

## INPUT DATA

**Triage Result:**
${JSON.stringify(inputData.triage_result, null, 2)}

**Extracted Features:**
${JSON.stringify(inputData, null, 2)}

---

## OUTPUT

Assign risk_level (low/medium/high) and confidence (0-100) based on the framework above.
Provide clear SOC-ready justification.
`;

        const result = await emailIRAnalyst.generate(prompt, {
            output: riskAssessmentOutputSchema.omit({ original_email: true, triage_result: true, feature_result: true }),
        });

        return {
            ...result.object,
            original_email: inputData.original_email,
            triage_result: inputData.triage_result,
            feature_result: inputData,
        };
    },
});
