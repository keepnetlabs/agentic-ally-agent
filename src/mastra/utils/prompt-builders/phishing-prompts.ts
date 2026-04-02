/**
 * Phishing Workflow Prompt Builders
 * Centralized prompt generation functions for phishing email workflow steps
 */

import { PHISHING, PHISHING_EMAIL } from '../../constants';
import { DIFFICULTY_CONFIG } from '../config/phishing-difficulty-config';
import { getLoginPageSection, getSuccessPageSection, getInfoPageSection } from '../templates/landing-page-templates';
import { createPhishingAnalysisSchema } from '../../schemas';
import { getLogger } from '../core/logger';
import { buildPolicyScenePrompt } from './policy-context-builder';
import { DEFAULT_PHISHING_ETHICAL_POLICY } from './prompt-analysis-policies';
import { buildLandingPageSystemPrompt } from './landing-page-prompts';
import { buildActionFamilyPromptBlock } from './journey-copy-guidance';
import { buildLandingContinuityGuidance, selectLandingDesign } from './phishing-landing-design';
import { buildLandingEmailSummary } from './phishing-landing-context';
import {
  AUTH_CONTEXT,
  CLARITY_ACCESSIBILITY_POLICY,
  LOGO_TAG_RULE,
  NO_DISCLAIMERS_RULE,
  EMAIL_SIGNATURE_RULES,
  NO_FAKE_PERSONAL_IDENTITIES_RULES,
  TABLE_LAYOUT_RULES,
  LAYOUT_STRATEGY_RULES,
  PREHEADER_RULE,
  GREETING_RULES,
  MOBILE_OPTIMIZATION_RULES,
  buildDateRealismRule,
  getMergeTagsRules,
  BRAND_AWARENESS_RULES,
  SYNTAX_RULE,
  FOOTER_RULES,
  GREETING_INSTRUCTION,
  JSON_OUTPUT_RULE,
  QR_CODE_IMG_TAG,
} from './shared-email-rules';
import { z } from 'zod';

const logger = getLogger('PhishingPromptBuilder');

/**
 * Helper function to generate department context (DRY)
 */
function getDepartmentContext(department?: string, isQuishing = false): string {
  if (!department || department === 'All') return '';
  const scenarioType = isQuishing ? 'quishing scenario' : 'scenario';
  return `\n**Target Department:** ${department} - Tailor ${scenarioType} to department workflows, vulnerabilities, and attack vectors.`;
}

function buildCoherencePromptBlock(params: {
  audienceMode?: string;
  journeyType?: string;
  offerMechanic?: string;
}): string {
  const audienceMode = params.audienceMode || 'general';
  const journeyType = params.journeyType || 'generic';
  const offerMechanic = params.offerMechanic || 'generic';

  return `**Coherence Fields:**
- Audience Frame: ${audienceMode}
- Primary Journey: ${journeyType}
- Primary Mechanic: ${offerMechanic}
- Treat these as soft source-of-truth. If any field is "general" or "generic", preserve the most plausible scenario-consistent default behavior instead of forcing a narrow frame.
- Do NOT introduce a second audience frame, primary journey, or offer mechanic unless the blueprint explicitly requires it.`;
}

function buildBehavioralProfilePromptBlock(params?: {
  currentStage?: string;
  targetStage?: string;
  progressionHint?: string;
  foggTriggerType?: string;
  keySignalsUsed?: string[];
  dataGaps?: string[];
}): string {
  if (!params) return '';

  const lines: string[] = [];
  if (params.currentStage) lines.push(`- Current Stage: ${params.currentStage}`);
  if (params.targetStage) lines.push(`- Target Stage: ${params.targetStage}`);
  if (params.progressionHint) lines.push(`- Progression Hint: ${params.progressionHint}`);
  if (params.foggTriggerType) lines.push(`- Trigger Type: ${params.foggTriggerType}`);
  if (params.keySignalsUsed?.length) lines.push(`- Key Signals: ${params.keySignalsUsed.slice(0, 3).join(' | ')}`);
  if (params.dataGaps?.length) lines.push(`- Data Gaps: ${params.dataGaps.slice(0, 2).join(' | ')}`);

  if (lines.length === 0) return '';

  return `**Structured Behavioral Signals:**
${lines.join('\n')}
- Treat these as higher-signal than generic narrative context.
- Use them to tune friction, persuasion style, and the user's likely trust path.
- Do NOT let them contradict the chosen scenario blueprint.`;
}

function buildBehavioralContextMessage(params: {
  additionalContext?: string;
  behavioralProfile?: {
    currentStage?: string;
    targetStage?: string;
    progressionHint?: string;
    foggTriggerType?: string;
    keySignalsUsed?: string[];
    dataGaps?: string[];
  };
  label: string;
  actionInstruction: string;
}): string | undefined {
  const behavioralBlock = buildBehavioralProfilePromptBlock(params.behavioralProfile);
  const narrativeBlock = params.additionalContext
    ? `**Behavioral Narrative Context:**\n${params.additionalContext}`
    : '';
  const combined = [behavioralBlock, narrativeBlock].filter(Boolean).join('\n\n');

  if (!combined) return undefined;

  return `🔴 USER BEHAVIOR ANALYSIS CONTEXT - Use this information to design a targeted ${params.label}:

${combined}

**ACTION REQUIRED:** ${params.actionInstruction}`;
}

// Type definitions for prompt parameters
type AnalysisPromptParams = {
  topic?: string;
  difficulty: string;
  language: string;
  method?: string;
  targetProfile?: {
    name?: string;
    department?: string;
    behavioralTriggers?: string[];
    vulnerabilities?: string[];
  };
  behavioralProfile?: {
    currentStage?: string;
    targetStage?: string;
    progressionHint?: string;
    foggTriggerType?: string;
    keySignalsUsed?: string[];
    dataGaps?: string[];
  };
  additionalContext?: string;
  isQuishingDetected?: boolean; // Pre-detected quishing flag (from lightweight AI check)
  policyContext?: string; // Company policy context
};

type EmailPromptParams = {
  analysis: z.infer<typeof createPhishingAnalysisSchema>;
  language: string;
  difficulty: string;
  industryDesign?: {
    industry: string;
    colors: { primary: string; secondary: string; accent: string };
  };
  policyContext?: string; // Company policy context
};

type LandingPagePromptParams = {
  fromName: string;
  fromAddress: string;
  scenario: string;
  language: string;
  industryDesign: {
    industry: string;
    colors: { primary: string; secondary: string; accent: string };
    patterns: { cardStyle: string; buttonStyle: string; inputStyle: string };
  };
  requiredPages: readonly string[];
  emailBrandContext?: string;
  subject?: string;
  template?: string;
  additionalContext?: string;
  behavioralProfile?: {
    currentStage?: string;
    targetStage?: string;
    progressionHint?: string;
    foggTriggerType?: string;
    keySignalsUsed?: string[];
    dataGaps?: string[];
  };
  isQuishing?: boolean;
  audienceMode?: string;
  journeyType?: string;
  offerMechanic?: string;
  method?: string;
  policyContext?: string; // Company policy context
};

/**
 * Build system and user prompts for quishing analysis step
 */
function buildQuishingAnalysisPrompts(params: AnalysisPromptParams): {
  systemPrompt: string;
  userPrompt: string;
  additionalContextMessage?: string;
} {
  const { topic, difficulty, language, method, targetProfile, behavioralProfile, additionalContext, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

  const quishingSystemPrompt = `You are an expert Quishing (QR Code Phishing) Simulation Architect working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}
${DEFAULT_PHISHING_ETHICAL_POLICY}
${CLARITY_ACCESSIBILITY_POLICY}

**YOUR ROLE:**
Design highly realistic quishing (QR code phishing) simulation scenarios for cybersecurity training.

**QUISHING-SPECIFIC DECISION LOGIC:**

1. **Attack Method:** Quishing always uses QR codes, so method is typically "Data-Submission" (QR code leads to credential harvesting or data input forms).

2. **Creative Scenario Design:**
   - **IF Topic is PROVIDED:** Use the topic to design an appropriate quishing scenario that naturally involves QR codes.
   - **IF Topic is GENERIC or MISSING:** INVENT a realistic quishing scenario. Examples of quishing scenario types include:
     * WiFi Access: QR code to connect to "guest network" or "secure WiFi"
     * Event Check-in: QR code for event/conference registration or check-in
     * Payment Verification: QR code to verify/complete a payment transaction
     * Visitor Registration: QR code for building access or visitor registration
     * MFA Setup: QR code to set up multi-factor authentication
     * Delivery Tracking: QR code to track a package or delivery
     * Parking Access: QR code for parking payment or access
     * Policy Acknowledgement: QR code to acknowledge/confirm a company policy
   - **DO NOT COPY these exact examples.** Use them as inspiration to create a unique, realistic quishing scenario that matches the topic or invent one that fits the context.

3. **Psychological Triggers (apply at least 2):**
   - **Convenience:** "Quick access via QR code", "Scan and go", "Mobile-friendly"
   - **Technology Trust:** "Secure QR verification", "Encrypted connection"
   - **Mobile Usage:** "Perfect for mobile devices", "Scan with your phone"
   - **Authority:** Combine with urgency (e.g., "IT Department requires immediate QR scan")
   - **Urgency:** "Scan within ${PHISHING_EMAIL.QR_CODE_TIMEOUT_HOURS} hours", "Immediate verification required"

4. **Brand/Company Detection:**
   - **IF Topic mentions a SPECIFIC BRAND/COMPANY:** Use that brand name as "fromName"
   - **IF Topic is GENERIC:** Invent a plausible company/department (e.g., "IT Support", "HR Department", "Security Team")
   - **QR Context:** The scenario should naturally involve QR code usage for that brand/context

4a. **Coherence Layer (MANDATORY):**
   - Select exactly ONE audienceMode: consumer, employee, partner, student, citizen, or general.
   - Select exactly ONE journeyType: login, claim, register, review, pay, track, acknowledge, download, or generic.
   - Select exactly ONE offerMechanic: account-access, discount, giveaway, presale, document-review, payment-fix, delivery-update, policy-ack, survey, or generic.
   - If the topic is ambiguous, use "general" / "generic" rather than forcing a narrow frame.
   - Keep sender identity, copy style, CTA logic, and landing-page logic aligned with those choices.
   - Do NOT mix multiple primary mechanics in one flow unless the topic explicitly requires it.

5. **Difficulty Adjustment (STRICT RULES for '${difficulty}'):**
   - **Sender Logic:** ${difficultyRules.sender.rule}. (Examples: ${difficultyRules.sender.examples.join(', ')} - **DO NOT COPY these exact examples. INVENT NEW ONES matching this pattern**).
   - **Urgency/Tone:** ${difficultyRules.urgency.rule}. ${difficultyRules.urgency.description}.
   - **Complexity:** ${difficulty === 'Easy' ? 'Simple, obvious logic with clear QR code red flags.' : difficulty === 'Hard' ? 'Complex, layered social engineering with subtle QR code placement.' : 'Standard business logic with moderate QR code red flags.'}

6. **Quishing-Specific Red Flags (include 3-4):**
   - Unsolicited QR code in email (QR codes are rarely sent via email)
   - QR code requesting login credentials or sensitive information
   - QR code in unexpected contexts (e.g., policy acknowledgement via QR instead of portal)
   - Requests to scan QR code for sensitive actions (wire transfers, password changes, account access)
   - QR codes that bypass normal security procedures
   - Urgency around QR code scanning ("Scan within X hours")
   - QR code sent from non-official or suspicious email addresses

${JSON_OUTPUT_RULE}

**Field Requirements:**
- **isQuishing:** Must be true (required for quishing scenarios)
- **scenario:** Must involve QR code scanning/phishing
- **psychologicalTriggers:** Must include at least "Convenience" or "Technology Trust" or "Mobile Usage"
- **keyRedFlags:** Must include quishing-specific red flags (see section 6)
- **description:** ${PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH} characters or less
- **name, scenario:** MUST be written entirely in the output language. Do NOT mix English prefixes with translated text.
- **reasoning:** REQUIRED. 1-2 sentences explaining why this scenario was chosen for this target audience. Write in clear, fluent ${language}. A non-technical manager should understand it easily.
- **audienceMode / journeyType / offerMechanic:** REQUIRED coherence fields. Use "general" / "generic" only when the topic truly lacks strong signals.

**EXAMPLE OUTPUT (Quishing Scenario):**
{
  "scenario": "Payment Verification QR Code",
  "name": "Payment QR Code - Urgent Verification",
  "description": "Simulates a payment verification request requiring QR code scan.",
  "category": "Financial Fraud",
  "method": "Data-Submission",
  "psychologicalTriggers": ["Urgency", "Convenience", "Technology Trust"],
  "tone": "Urgent but convenient",
  "fromName": "Payment Security Team",
  "fromAddress": "security@payment-verify.com",
  "keyRedFlags": ["Unsolicited QR code in email", "Urgency to scan QR code", "Request for payment verification via QR"],
  "targetAudienceAnalysis": "Users are likely to trust QR codes as convenient and legitimate technology",
  "subjectLineStrategy": "Creates urgency with 'Action Required' and emphasizes quick QR code verification",
  "audienceMode": "employee",
  "journeyType": "login",
  "offerMechanic": "account-access",
  "reasoning": "Employees regularly interact with QR codes for convenience, making them susceptible to QR-based phishing that exploits trust in mobile-friendly technology.",
  "isQuishing": true
}`;

  const departmentContext = getDepartmentContext(targetProfile?.department, true);

  const quishingUserPrompt = `Design a QUISHING (QR Code Phishing) simulation scenario for SECURITY AWARENESS TRAINING based on this context:

**Training Topic:** ${topic || 'General Quishing Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language} (MUST use BCP-47 format like en-gb, tr-tr, de-de)
**Requested Method:** ${method || 'Auto-Detect'}
**Target Audience Profile:** ${JSON.stringify(targetProfile || {})}${departmentContext}

**🔴 QUISHING CONFIRMED:** This is a quishing (QR code phishing) scenario. You MUST set isQuishing: true in your output. Design the scenario around QR code-based phishing attacks.

Create a sophisticated blueprint for an educational quishing simulation that will help employees learn to recognize and report QR code phishing attempts.

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to protect organizations from real cybercriminals.

**FINAL SELF-CHECK (before output):**
1. Are "name" and "scenario" 100% in ${language}? No English mixing?
2. Is isQuishing set to true?
3. Is "method" consistent with the scenario logic?
4. Are psychologicalTriggers contextually matched to the scenario?
5. Is there exactly one audience frame, one primary journey, and one primary offer mechanic?
If any fails → fix before outputting.`;

  const quishingAdditionalContextMessage = buildBehavioralContextMessage({
    additionalContext,
    behavioralProfile,
    label: 'quishing scenario',
    actionInstruction:
      "Use this behavioral analysis to inform your quishing scenario design. Consider the user's risk level, strengths, growth areas, recommended next-step logic, and structured behavioral signals when designing the QR code phishing simulation. The scenario should be tailored to test and improve the specific vulnerabilities and behavioral patterns identified in this analysis.",
  });

  // Add policy context if available
  const policyBlock = buildPolicyScenePrompt(policyContext);
  const finalSystemPrompt = quishingSystemPrompt + policyBlock;

  return {
    systemPrompt: finalSystemPrompt,
    userPrompt: quishingUserPrompt,
    additionalContextMessage: quishingAdditionalContextMessage,
  };
}

/**
 * Build system and user prompts for normal phishing analysis step
 */
function buildNormalPhishingAnalysisPrompts(params: AnalysisPromptParams): {
  systemPrompt: string;
  userPrompt: string;
  additionalContextMessage?: string;
} {
  const { topic, difficulty, language, method, targetProfile, behavioralProfile, additionalContext, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

  const systemPrompt = `You are an expert Social Engineering Architect and Cyber Psychologist working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}
${DEFAULT_PHISHING_ETHICAL_POLICY}
${CLARITY_ACCESSIBILITY_POLICY}

**YOUR ROLE:**
Design highly realistic phishing simulation scenarios for cybersecurity training.

**DECISION LOGIC (ADAPTIVE MODE):**

1. **Attack Method Determination:**
   - **User Choice:** If '${method}' is provided, YOU MUST USE IT.
   - **Auto-Detect (if missing) DEFAULT -- '${PHISHING.DEFAULT_ATTACK_METHOD}'**:
     - '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission): For scenarios requiring login, password reset, verification, payment, survey.
     - '${PHISHING.ATTACK_METHODS[0]}' (Click-Only): For scenarios requiring viewing a document, tracking a package, reading news, downloading a file.

1a. **Traditional Phishing Only:**
   - isQuishing must be false (required: no QR codes, use buttons/links only)

1b. **Psychological Strategy (Cialdini Principles):**
   - Must select and apply at least 2 of Cialdini's 6 Principles (Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity).
   - **Contextual Match:**
     * Finance/Legal → **Authority** ("CEO Request") + **Urgency/Scarcity** ("Immediate action required")
     * HR/Internal → **Social Proof** ("Everyone has completed") + **Commitment** ("As agreed in meeting")
     * Marketing/Perks → **Reciprocity** ("Gift for you") + **Liking** ("Valued employee")
   - **Goal:** Create realistic cognitive dissonance. The target should feel a psychological urge to click, beyond just curiosity.


2. **Profile Analysis (IF Profile Exists):**
   - Use known 'behavioralTriggers' (e.g. Authority -> CEO Fraud).
   - Use 'department' context (Finance -> Invoice Fraud, IT -> VPN Update).

3. **Creative Invention (IF Profile is MISSING/EMPTY):**
   - **INVENT a plausible target persona** based on the Topic (role/team-based only; DO NOT invent personal names).
   - Example: If Topic is "Payroll", assume Target is an Employee, trigger is "Greed/Curiosity".
   - Example: If Topic is "General", pick a universal theme like "Password Expiry" or "Storage Full".
   - **Do NOT fail** if profile is missing. Create the most effective scenario for the given Topic/Difficulty.

3a. **Brand/Company Detection:**
   - **IF Topic mentions a SPECIFIC BRAND/COMPANY** (e.g., "Shopping platform", "Amazon", "Microsoft", "PayPal"):
     * Set "fromName" to that BRAND NAME (e.g., "Amazon")
     * Create scenarios matching that brand's context (e.g., E-commerce → package delivery, order confirmation)
     * Use brand-appropriate email address (e.g., "noreply@shopping-notifications.com" for Medium difficulty)
     * If the brand is public and consumer-facing or promotional (e.g., NBA, Amazon, Netflix), keep that public brand visible in sender identity. Do NOT replace it with a generic internal department unless the scenario explicitly requires a sub-brand or department sender.
   - **IF Topic is GENERIC** (e.g., "Create phishing email"):
     * Invent a plausible company/department (e.g., "IT Support", "HR Department", "Finance Team")
   - **Examples:**
     * Topic: "E-commerce package" → fromName: "Shopping Platform", scenario: "Package Delivery Notification"
     * Topic: "Amazon order" → fromName: "Amazon", scenario: "Order Confirmation Alert"
     * Topic: "General phishing" → fromName: "IT Support", scenario: "Password Reset Request"

3b. **Coherence Layer (MANDATORY):**
   - Select exactly ONE audienceMode: consumer, employee, partner, student, citizen, or general.
   - Select exactly ONE journeyType: login, claim, register, review, pay, track, acknowledge, download, or generic.
   - Select exactly ONE offerMechanic: account-access, discount, giveaway, presale, document-review, payment-fix, delivery-update, policy-ack, survey, or generic.
   - If the topic is ambiguous, use "general" / "generic" rather than forcing a narrow frame.
   - Keep sender identity, copy style, CTA logic, and landing-page logic aligned with those choices.
   - Do NOT mix multiple primary mechanics in one flow unless the topic explicitly requires it.

4. **Difficulty Adjustment (STRICT RULES for '${difficulty}'):**
   - **Sender Logic:** ${difficultyRules.sender.rule}. (Examples: ${difficultyRules.sender.examples.join(', ')} - **DO NOT COPY these exact examples. INVENT NEW ONES matching this pattern**).
   - **Urgency/Tone:** ${difficultyRules.urgency.rule}. ${difficultyRules.urgency.description}.
   - **Complexity:** ${difficulty === 'Easy' ? 'Simple, obvious logic.' : difficulty === 'Hard' ? 'Complex, layered social engineering.' : 'Standard business logic.'}
   - **VARIATION RULE:** Ensure every scenario is unique. Change company types, departments, and pretext stories even if the Topic is the same. **Do NOT invent personal names**; use role/team labels.

5. **Red Flag Strategy:**
   - Define 3-4 specific red flags appropriate for the difficulty level (${difficulty}).
   - Traditional phishing red flags: Suspicious sender addresses, urgency tactics, requests for credentials, suspicious links, grammatical errors, mismatched branding, unexpected attachments

${JSON_OUTPUT_RULE}

**Field Limits:**
- **description**: ${PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH} characters or less. Keep it concise and focused on the simulation's purpose.
- **name, scenario**: MUST be written entirely in the output language (${language}). Do NOT prefix with English attack categories. Write the full name in ${language}.
- **reasoning:** REQUIRED. 1-2 sentences explaining why this scenario was chosen for this target audience. Write in clear, fluent ${language}. A non-technical manager should understand it easily.
- **audienceMode / journeyType / offerMechanic:** REQUIRED coherence fields. Use "general" / "generic" only when the topic truly lacks strong signals.

**EXAMPLE OUTPUT:**
{
  "scenario": "CEO Urgent Wire Transfer",
  "name": "CEO Fraud - Urgent Transfer",
  "description": "Simulates a request from the CEO asking for an immediate wire transfer, testing authority bias.",
  "category": "Financial Fraud",
  "method": "Data-Submission",
  "psychologicalTriggers": ["Authority", "Urgency", "Fear"],
  "tone": "Urgent",
  "fromName": "Finance Department",
  "fromAddress": "finance@companay.com",
  "keyRedFlags": ["Misspelled domain (companay.com)", "Unusual urgency", "Request to bypass procedures", "External email marked as internal"],
  "targetAudienceAnalysis": "Finance team members are targeted due to their access to wire transfer systems and tendency to comply with executive requests",
  "reasoning": "Finance team handles wire transfers daily and tends to comply with executive requests without question, making authority-based phishing highly effective.",
  "subjectLineStrategy": "Creates time pressure with 'URGENT' prefix and implies consequences for delay",
  "audienceMode": "employee",
  "journeyType": "pay",
  "offerMechanic": "payment-fix",
  "isQuishing": false
}

Note: For brand-specific topics (e.g., "Amazon", "Microsoft"), use the brand as fromName and match their notification style.`;

  const departmentContext = getDepartmentContext(targetProfile?.department, false);

  const userPrompt = `Design a TRADITIONAL PHISHING simulation scenario (NOT quishing - no QR codes) for SECURITY AWARENESS TRAINING based on this context:

**Training Topic:** ${topic || 'General Security Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language} (MUST use BCP-47 format like en-gb, tr-tr, de-de)
**Requested Method:** ${method || 'Auto-Detect'}
**Target Audience Profile:** ${JSON.stringify(targetProfile || {})}${departmentContext}

**IMPORTANT:** This is a traditional phishing scenario. Use email links, buttons, or attachments - NOT QR codes. Set isQuishing: false.

Create a sophisticated blueprint for an educational phishing simulation email that will help employees learn to recognize and report phishing attacks.

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to protect organizations from real attackers.

**FINAL SELF-CHECK (before output):**
1. Are "name" and "scenario" 100% in ${language}? No English mixing?
2. Is isQuishing set to false?
3. Is "method" consistent with the scenario? (Data-Submission needs login/form; Click-Only needs view/read)
4. Are psychologicalTriggers contextually matched to the department/scenario?
5. Is there exactly one audience frame, one primary journey, and one primary offer mechanic?
If any fails → fix before outputting.`;

  const additionalContextMessage = buildBehavioralContextMessage({
    additionalContext,
    behavioralProfile,
    label: 'phishing scenario',
    actionInstruction:
      "Use this behavioral analysis to inform your scenario design. Consider the user's risk level, strengths, growth areas, recommended action plan, and structured behavioral signals when designing the phishing simulation. The scenario should be tailored to test and improve the specific vulnerabilities and behavioral patterns identified in this analysis.",
  });

  // Add policy context if available
  const policyBlock = buildPolicyScenePrompt(policyContext);
  const finalSystemPrompt = systemPrompt + policyBlock;

  return {
    systemPrompt: finalSystemPrompt,
    userPrompt,
    additionalContextMessage,
  };
}

/**
 * Build system and user prompts for analysis step (Step 1)
 * Routes to quishing or normal phishing prompts based on isQuishingDetected
 */
export function buildAnalysisPrompts(params: AnalysisPromptParams): {
  systemPrompt: string;
  userPrompt: string;
  additionalContextMessage?: string;
} {
  const { isQuishingDetected = false } = params;

  if (isQuishingDetected) {
    return buildQuishingAnalysisPrompts(params);
  } else {
    return buildNormalPhishingAnalysisPrompts(params);
  }
}

/**
 * Build system and user prompts for quishing email generation
 */
function buildQuishingEmailPrompts(params: EmailPromptParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { analysis, language, difficulty } = params;
  const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];
  const dateRealismRule = buildDateRealismRule();
  const coherencePromptBlock = buildCoherencePromptBlock(analysis);
  const actionFamilyPromptBlock = buildActionFamilyPromptBlock({
    journeyType: analysis.journeyType,
    offerMechanic: analysis.offerMechanic,
    method: analysis.method,
    isQuishing: true,
  });

  const quishingSystemPrompt = `You are a Quishing (QR Code Phishing) Email Generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}

**YOUR ROLE:**
Write realistic quishing (QR code phishing) email content based on provided scenario blueprints for cybersecurity training.

**QUISHING-SPECIFIC REQUIREMENTS:**
- QR code is the ONLY call-to-action — NO buttons or clickable links in the main body (footer links allowed)
- QR code image tag: ${QR_CODE_IMG_TAG}
- Place QR code prominently (center-aligned, after main message text, before signature)
- Use convenience/mobile-friendly language: "Scan QR code to verify", "Quick access via QR", "Mobile-friendly verification"

${BRAND_AWARENESS_RULES}

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.
   - Maximum length: ${PHISHING_EMAIL.MAX_SUBJECT_LENGTH} characters.
   - Emphasize convenience or urgency related to QR code scanning.

2. ${TABLE_LAYOUT_RULES}
   - **MUST match the tone** specified in the blueprint. Urgent → deadline language; Helpful → calm support; Formal → professional throughout.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}
   - **Psychological Triggers:** Use convenience, technology trust, mobile usage naturally.
   - ${FOOTER_RULES}

   ${LAYOUT_STRATEGY_RULES}

   ${PREHEADER_RULE}

   - **TIMING REALISM:** Reference business hours naturally.
   - ${dateRealismRule}

   ${MOBILE_OPTIMIZATION_RULES}
   - QR code: Must be clearly visible and scannable on mobile devices.

3. **QR Code Placement:**
   - Use the QR code image tag from QUISHING-SPECIFIC REQUIREMENTS above. Never use placeholder src or empty src.
   - **QR text rule:** Text around QR code MUST be scenario-specific (e.g., "Scan to verify payment", "Scan to access WiFi"). Never generic "Scan QR code".

4. ${GREETING_RULES}

5. ${getMergeTagsRules(true)}

6. ${NO_FAKE_PERSONAL_IDENTITIES_RULES}

7. **Grammar & Style (${difficulty} Mode):**
   - **Grammar Rule:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}
   - **Red Flags:** **MUST embed quishing-specific red flags** as defined in the blueprint. ${difficulty === 'Easy' ? 'For Easy mode, make them OBVIOUS and easily detectable.' : difficulty === 'Hard' ? 'For Hard mode, make them EXTREMELY SUBTLE - only detectable by trained security professionals.' : 'For Medium mode, make them MODERATELY SUBTLE - detectable with careful inspection but not immediately obvious.'}
   - **Quishing Red Flags:** Unsolicited QR code in email, QR code requesting credentials, QR code in unexpected contexts, urgency around QR scanning.
   ${SYNTAX_RULE}

8. ${LOGO_TAG_RULE}

9. ${NO_DISCLAIMERS_RULE}

10. ${EMAIL_SIGNATURE_RULES}

${JSON_OUTPUT_RULE}

**EXAMPLE OUTPUT:**
{
  "subject": "Action Required: Scan QR Code to Verify Your Payment",
  "template": "[Full HTML email with table layout, {CUSTOMMAINLOGO} logo, QR code using ${QR_CODE_IMG_TAG}, convenience language, NO buttons in body, signature with team name]"
}

Note: Template must be complete HTML. QR code is the only call-to-action.`;

  const quishingUserPrompt = `Write the QUISHING (QR Code Phishing) simulation email content based on this blueprint.

**Context:**
- **Language:** Must use ${language || 'en'} only (100% in ${language})${language && !language.startsWith('en') ? ` - Think as native ${language} speaker, not translator.` : ''}
- **Impersonating:** ${analysis.fromName} (Use authentic branding/tone)
- **Difficulty:** ${difficulty}
- **Quishing Confirmed:** This is a QR code phishing email. QR code is the only call-to-action. No buttons or links in main body.
${analysis.isRecognizedBrand && analysis.brandName ? `- **Recognized Brand:** ${analysis.brandName} - Include brand name in subject line or email body.` : ''}

${coherencePromptBlock}

${actionFamilyPromptBlock}

**Blueprint:**
${JSON.stringify(analysis, null, 2)}

**Generation Steps:**
1. **ANALYZE** the 'Blueprint' above - extract quishing scenario details, exact tone, and all quishing-specific red flags.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - ${PHISHING_EMAIL.PREHEADER_WORD_COUNT.min}-${PHISHING_EMAIL.PREHEADER_WORD_COUNT.max} words about QR code verification.
4. ${GREETING_INSTRUCTION(language)}
5. **WRITE** realistic, authentic email content that matches the brand's style, the blueprint's tone exactly, and emphasizes convenience/mobile-friendly access.
6. **QR Code:** Insert ${QR_CODE_IMG_TAG} prominently (center-aligned, after main text, before signature). Never use placeholder src. Add scenario-specific convenience text around it.
7. **EMBED** quishing-specific red flags according to difficulty level.
8. **VERIFY** no buttons or links in main body and ensure visible dates/years are current and plausible, then **OUTPUT** valid JSON with complete HTML template.`;

  return {
    systemPrompt: quishingSystemPrompt,
    userPrompt: quishingUserPrompt,
  };
}

/**
 * Build system and user prompts for normal phishing email generation
 */
function buildNormalPhishingEmailPrompts(params: EmailPromptParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { analysis, language, difficulty, industryDesign } = params;
  const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];
  const dateRealismRule = buildDateRealismRule();
  const coherencePromptBlock = buildCoherencePromptBlock(analysis);
  const actionFamilyPromptBlock = buildActionFamilyPromptBlock({
    journeyType: analysis.journeyType,
    offerMechanic: analysis.offerMechanic,
    method: analysis.method,
    isQuishing: false,
  });

  const systemPrompt = `You are a Phishing Content Generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}

**YOUR ROLE:**
Write realistic phishing email content based on provided scenario blueprints for cybersecurity training.

${BRAND_AWARENESS_RULES}
- Example: For e-commerce brands → "Your order is being prepared", package tracking, order confirmation style

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.
   - Maximum length: ${PHISHING_EMAIL.MAX_SUBJECT_LENGTH} characters.
   - **Social Engineering (subtle):** Use 1-2 soft cues that fit the scenario (e.g., authority, urgency/deadline, scarcity/limited time, social proof). Keep it natural; no hard rules.

2. ${TABLE_LAYOUT_RULES}
   - **MUST match the tone** specified in the blueprint exactly. Urgent → deadline language; Helpful → calm support; Formal → professional throughout.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}
   - **Psychological Triggers (subtle):** Use 1-2 from analysis.psychologicalTriggers naturally (e.g., authority tone, urgency/deadline, curiosity hook). Avoid overuse.
   - **Social Engineering (Cialdini principles):** Apply naturally when fitting: reciprocity (free service, special offer), social proof (colleagues completed, trusted by X users), commitment (you previously agreed), liking (valued customer). Use fear of loss sparingly (account lockout, service suspension).
   - ${FOOTER_RULES} Keep it brief; no disclaimers.

   ${LAYOUT_STRATEGY_RULES}

   ${PREHEADER_RULE} (hidden from email body, visible in inbox preview).

   - **TIMING REALISM:** Reference business hours naturally (e.g., "by end of business day", "this morning", "before 5 PM"). Routine emails imply weekday business hours; only critical security alerts can be off-hours/weekend.
   - ${dateRealismRule}

   ${MOBILE_OPTIMIZATION_RULES}

3. **Call-to-Action (Button) Strategy - Based on Attack Method:**
   - **Method: '${analysis.method}'**
   - **If '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission):**
     - Button Text: "Verify Account", "Reset Password", "Login to View", "Update Payment".
     - Urgency: High. Imply account lockout or service interruption.
   - **If '${PHISHING.ATTACK_METHODS[0]}' (Click-Only):**
     - Button Text: "View Document", "Track Package", "Read Announcement", "See Photos".
     - Urgency: Low to Medium. Focus on curiosity or helpfulness.
   - **CTA rule:** Button text MUST be scenario-specific. Never use generic "Click Here", "Submit", or "Continue".
   ${industryDesign ? `\n   - **Brand Colors (${industryDesign.industry}):** Use primary color \`${industryDesign.colors.primary}\` for buttons/links to match brand identity.` : ''}
   - **LAYOUT RULE:** Button CTA MUST live in its own dedicated \`<tr><td>\` row — NEVER inside a \`<div>\` within a content \`<td>\`. A \`<div>\` inside a \`<td>\` that also contains text nodes creates invalid mixed block/inline HTML that breaks email clients and the visual editor. Correct pattern: \`<tr><td align='center' style='padding-bottom:16px;'><a href='{PHISHINGURL}' style='...'>Button Text</a></td></tr>\`
   - **NO INLINE-BLOCK ADJACENCY:** Do NOT place buttons immediately next to lists or text using \`display: inline-block\`. Always ensure the button starts on a NEW line below previous content.

4. ${GREETING_RULES}
   - **NO DOUBLE GREETINGS:** Never use "Dear X... Dear Colleague...". Use exactly ONE greeting. If {FIRSTNAME} is used, do not add "Dear User" or "Dear Colleague" afterwards.

5. ${getMergeTagsRules(false)}

6. ${NO_FAKE_PERSONAL_IDENTITIES_RULES}

7. **Grammar & Style (${difficulty} Mode):**
   - **Grammar Rule:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}
   - **Red Flags:** **MUST embed the red flags** as defined in the blueprint. ${difficulty === 'Easy' ? 'For Easy mode, make them OBVIOUS and easily detectable. For Medium/Hard, make them subtle but detectable.' : difficulty === 'Hard' ? 'For Hard mode, make them EXTREMELY SUBTLE - only detectable by trained security professionals. They should blend naturally into the email.' : 'For Medium mode, make them MODERATELY SUBTLE - detectable with careful inspection but not immediately obvious.'}
   - **CREATIVITY RULE:** Do NOT use generic "lorem ipsum" style fillers. **MUST write specific, plausible, realistic content** directly relevant to the Scenario that feels authentic and genuine.
   ${SYNTAX_RULE}

8. ${LOGO_TAG_RULE}

9. ${NO_DISCLAIMERS_RULE}

10. ${EMAIL_SIGNATURE_RULES}

${JSON_OUTPUT_RULE}

**EXAMPLE OUTPUT:**
{
  "subject": "Microsoft Security Alert - Verify Your Account",
  "template": "[Full HTML email with table layout, logo using {CUSTOMMAINLOGO} tag, urgent message, call-to-action button with {PHISHINGURL}, and signature with department name]"
}

Note: Template must be complete HTML (not truncated). Use table-based layout with inline CSS. The email must be production-ready and fully functional.`;

  const userPrompt = `Write the phishing simulation email content based on this blueprint.

**Context:**
- **Language:** Must use ${language || 'en'} only (100% in ${language})${language && !language.startsWith('en') ? ` - Think as native ${language} speaker, not translator.` : ''}
- **Impersonating:** ${analysis.fromName} (Use authentic branding/tone)
- **Difficulty:** ${difficulty}
${analysis.isRecognizedBrand && analysis.brandName ? `- **Recognized Brand:** ${analysis.brandName} - Include brand name in subject line or email body. Example: "Your ${analysis.brandName} account" or "${analysis.brandName} Security Alert"` : ''}

${coherencePromptBlock}

${actionFamilyPromptBlock}

**Blueprint:**
${JSON.stringify(analysis, null, 2)}

**Generation Steps:**
1. **ANALYZE** the 'Blueprint' above - extract specific scenario details, exact tone, and all red flags that must be embedded.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - ${PHISHING_EMAIL.PREHEADER_WORD_COUNT.min}-${PHISHING_EMAIL.PREHEADER_WORD_COUNT.max} words that appear in inbox preview.
4. ${GREETING_INSTRUCTION(language)}
5. **WRITE** realistic, authentic email content that matches the brand's style and the blueprint's tone exactly.
6. **EMBED** red flags according to difficulty level (obvious for Easy, subtle for Medium/Hard).
7. **SAFETY RULE:** Do NOT use personal names (like "Emily Clarke") in the signature. Use generic Team/Department names only.
8. **FINAL VALIDATION:** Before outputting, check that: (a) greeting contains {FIRSTNAME} or {FULLNAME}, (b) button/link uses {PHISHINGURL} tag, (c) visible dates/years are current and not stale, (d) there is no disclaimer-like softening copy such as "ignore this email" or "delete this message". Fix if missing or incorrect.
9. **OUTPUT** valid JSON with complete, production-ready HTML template.`;

  return {
    systemPrompt,
    userPrompt,
  };
}

/**
 * Build system and user prompts for email generation step (Step 2)
 * Routes to quishing or normal phishing prompts based on analysis.isQuishing
 */
export function buildEmailPrompts(params: EmailPromptParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { analysis } = params;

  if (analysis.isQuishing) {
    return buildQuishingEmailPrompts(params);
  } else {
    return buildNormalPhishingEmailPrompts(params);
  }
}

/**
 * Build system and user prompts for landing page generation step (Step 3)
 * Returns messages array with system prompt and optional context messages
 */
export function buildLandingPagePrompts(params: LandingPagePromptParams): {
  systemPrompt: string;
  userPrompt: string;
  userContextMessage?: string;
  emailContextMessage?: string;
} {
  const {
    fromName,
    fromAddress,
    scenario,
    language,
    industryDesign,
    requiredPages,
    emailBrandContext,
    subject,
    template,
    additionalContext,
    behavioralProfile,
    isQuishing = false,
    audienceMode,
    journeyType,
    offerMechanic,
    method,
  } = params;

  const hasFormPages = requiredPages.includes('login') || requiredPages.includes('success');

  const { layout: randomLayout, style: randomStyle, bucket: landingBucket } = selectLandingDesign({
    scenario,
    subject,
    fromName,
    requiredPages,
    isQuishing,
  });

  // 📝 LOG CHOSEN DESIGN FOR DEBUGGING
  // This helps us verify that randomization is working and what the agent is instructed to do
  logger.info('Design Injection:', {
    scenarioBucket: landingBucket,
    layout: randomLayout.id,
    style: randomStyle.id,
    layoutName: randomLayout.name,
    styleName: randomStyle.name,
  });

  // Check if email uses {CUSTOMMAINLOGO} tag
  const emailUsesLogoTag = !!(template && template.includes('{CUSTOMMAINLOGO}'));

  const systemPrompt = buildLandingPageSystemPrompt(
    fromName,
    emailBrandContext,
    emailUsesLogoTag,
    industryDesign,
    randomLayout,
    randomStyle,
    requiredPages,
    isQuishing,
    getLoginPageSection,
    getSuccessPageSection,
    getInfoPageSection
  );

  const layoutReminders: Record<string, string> = {
    HERO: '- Keep the assigned HERO structure (top hero + overlapping card)\n- Keep the main container centered and preserve the assigned overlap rules',
    MINIMAL: '- Keep the MINIMAL structure: no outer card, generous spacing, constrained form width\n- Do not reintroduce a centered card wrapper',
    SPLIT: '- Keep the SPLIT structure with distinct left/right panels\n- Do not collapse the page into a single centered card',
    CENTERED: '- Keep the single centered card structure with vertical centering (min-height: 100vh + flex center)\n- Preserve comfortable card padding and clear visual hierarchy',
  };
  const layoutSpecificReminders = layoutReminders[randomLayout.id] || layoutReminders.CENTERED;

  const pageList = [...requiredPages].map(p => `'${p}'`).join(', ');
  const pageCountReminder = requiredPages.length === 2
    ? `**REQUIRED: Generate EXACTLY 2 pages — a '${requiredPages[0]}' page AND a '${requiredPages[1]}' page. Do NOT stop after the first page.**`
    : `**REQUIRED: Generate EXACTLY ${requiredPages.length} page(s): [${pageList}].**`;
  const continuityGuidance = buildLandingContinuityGuidance(landingBucket);
  const coherencePromptBlock = buildCoherencePromptBlock({ audienceMode, journeyType, offerMechanic });
  const actionFamilyPromptBlock = buildActionFamilyPromptBlock({
    journeyType,
    offerMechanic,
    method,
    isQuishing,
  });

  const userPrompt = `Design landing pages for: ${fromName} - ${scenario}

${pageCountReminder}

**SCENARIO:** ${scenario}
**LANGUAGE:** ${language}

${coherencePromptBlock}

${actionFamilyPromptBlock}

Create modern, professional pages that match ${industryDesign.industry} standards. Make them look authentic and realistic for ${fromName}.

**GENERATION STEPS (Follow this order):**
1. **Plan first:** Use the system prompt and email context to decide layout, spacing, and the exact user journey
2. **Generate HTML:** Create complete, valid HTML with all required elements${requiredPages.length > 1 ? ` for ALL ${requiredPages.length} pages` : ''}
3. **Keep copy realistic:** Make headings, helper text, form labels, and button text concise, native, and product-like
4. **Validate:** Check against the structure requirements and template examples before returning
5. **Ensure variation:** If multiple pages, make them related but NOT identical while keeping the same scenario and brand logic

**KEY REMINDERS:**
${isQuishing ? `- Landing pages are standard forms (no QR codes)\n` : ''}- Add natural design variations (don't make all pages identical)
- ${layoutSpecificReminders.replace(/\n/g, '\n- ').replace(/^- /, '')}
- ${continuityGuidance.replace(/\n/g, '\n- ').replace(/^- /, '')}
- ${requiredPages.includes('success') ? 'On success/confirmation pages, the heading, helper text, and main CTA must agree on the completed state' : 'Keep the page state and main CTA logically aligned'}
- ${requiredPages.includes('success') ? 'On success/confirmation pages, use scenario-specific completion microcopy that states what was completed and what happens next; avoid generic "Thank you" copy with no task context' : 'Keep follow-up microcopy tied to the exact scenario task'}
- Avoid placeholder-style UI text such as "Click here", "Submit", "Continue", "Your Company", or "Lorem ipsum"
${hasFormPages ? '- Button must contrast with the surrounding background' : '- **No buttons or CTA links** — show content directly (lists, highlighted boxes, metadata)'}`;

  // Build optional context messages
  const userContextMessage = buildBehavioralContextMessage({
    additionalContext,
    behavioralProfile,
    label: 'landing page flow',
    actionInstruction:
      "Use this behavioral analysis to inform your landing page design. Consider the user's current stage, progression goal, key evidence signals, data gaps, and behavioral triggers when creating the page. The design must feel genuine, trustworthy, and specifically tailored to this user's likely trust path without contradicting the scenario blueprint.",
  });

  const emailContextMessage =
    template
      ? `PHISHING EMAIL CONTEXT (for landing page consistency):

${buildLandingEmailSummary({
  subject,
  fromName,
  fromAddress,
  template,
  isQuishing,
  emailUsesLogoTag,
})}

Landing pages must match the branding and style used in the phishing email.${isQuishing ? `\nNote: Landing pages are standard forms (no QR codes).` : ''}${emailUsesLogoTag ? `\nNote: Email uses {CUSTOMMAINLOGO} tag - use the same in landing pages.` : ''}
${emailBrandContext ? `\n${emailBrandContext}` : ''}
\nThe landing page must preserve the same user journey implied by the email. Match the promised task, tone, and level of friction.
`
      : undefined;

  return {
    systemPrompt,
    userPrompt,
    userContextMessage,
    emailContextMessage,
  };
}
