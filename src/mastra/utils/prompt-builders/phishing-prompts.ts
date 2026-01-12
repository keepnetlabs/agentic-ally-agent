/**
 * Phishing Workflow Prompt Builders
 * Centralized prompt generation functions for phishing email workflow steps
 */

import { PHISHING, PHISHING_EMAIL } from '../../constants';
import { DIFFICULTY_CONFIG } from '../config/phishing-difficulty-config';
import { LAYOUT_OPTIONS, STYLE_OPTIONS } from '../config/landing-page-design-config';
import { getLoginPageSection, getSuccessPageSection, getInfoPageSection } from '../templates/landing-page-templates';
import { AnalysisSchema } from '../../schemas';
import { getLogger } from '../core/logger';
import { buildPolicyScenePrompt } from './policy-context-builder';
import {
  AUTH_CONTEXT,
  LOGO_TAG_RULE,
  NO_DISCLAIMERS_RULE,
  EMAIL_SIGNATURE_RULES,
  NO_FAKE_PERSONAL_IDENTITIES_RULES,
  TABLE_LAYOUT_RULES,
  LAYOUT_STRATEGY_RULES,
  PREHEADER_RULE,
  GREETING_RULES,
  MOBILE_OPTIMIZATION_RULES,
  getMergeTagsRules,
  BRAND_AWARENESS_RULES,
  SYNTAX_RULE,
  FOOTER_RULES,
  LANDING_PAGE_LOGO_RULE,
  QUISHING_LANDING_PAGE_RULE,
  NO_QR_CODE_LANDING_PAGE_RULE,
  GREETING_INSTRUCTION,
  JSON_OUTPUT_RULE,
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
  additionalContext?: string;
  isQuishingDetected?: boolean; // Pre-detected quishing flag (from lightweight AI check)
  policyContext?: string; // Company policy context
};

type EmailPromptParams = {
  analysis: z.infer<typeof AnalysisSchema>;
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
  isQuishing?: boolean;
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
  const { topic, difficulty, language, method, targetProfile, additionalContext, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

  const quishingSystemPrompt = `You are an expert Quishing (QR Code Phishing) Simulation Architect working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}

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
   - **Urgency:** "Scan within 24 hours", "Immediate verification required"

4. **Brand/Company Detection:**
   - **IF Topic mentions a SPECIFIC BRAND/COMPANY:** Use that brand name as "fromName"
   - **IF Topic is GENERIC:** Invent a plausible company/department (e.g., "IT Support", "HR Department", "Security Team")
   - **QR Context:** The scenario should naturally involve QR code usage for that brand/context

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
- **description:** 300 characters or less

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

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to protect organizations from real cybercriminals.`;

  const quishingAdditionalContextMessage = additionalContext
    ? `🔴 USER BEHAVIOR ANALYSIS CONTEXT - Use this information to design a targeted quishing scenario:

${additionalContext}

**ACTION REQUIRED:** Use this behavioral analysis to inform your quishing scenario design. Consider the user's risk level, strengths, growth areas, and recommended action plan when designing the QR code phishing simulation. The scenario should be tailored to test and improve the specific vulnerabilities and behavioral patterns identified in this analysis.`
    : undefined;

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
  const { topic, difficulty, language, method, targetProfile, additionalContext, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

  const systemPrompt = `You are an expert Social Engineering Architect and Cyber Psychologist working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}

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
   - **IF Topic is GENERIC** (e.g., "Create phishing email"):
     * Invent a plausible company/department (e.g., "IT Support", "HR Department", "Finance Team")
   - **Examples:**
     * Topic: "E-commerce package" → fromName: "Shopping Platform", scenario: "Package Delivery Notification"
     * Topic: "Amazon order" → fromName: "Amazon", scenario: "Order Confirmation Alert"
     * Topic: "General phishing" → fromName: "IT Support", scenario: "Password Reset Request"

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
- **description**: 300 characters or less. Keep it concise and focused on the simulation's purpose.

**EXAMPLE OUTPUT (Scenario Analysis - for EMAIL generation):**
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
  "subjectLineStrategy": "Creates time pressure with 'URGENT' prefix and implies consequences for delay",
  "isQuishing": false
}

**EXAMPLE OUTPUT (Brand-Specific Scenario - E-commerce Brand):**
{
  "scenario": "E-commerce Package Delivery Issue",
  "name": "Package Delivery - Urgent Action",
  "description": "Simulates a fake package delivery notification from an e-commerce platform requiring address verification.",
  "category": "Credential Harvesting",
  "method": "Data-Submission",
  "psychologicalTriggers": ["Urgency", "Curiosity", "Fear"],
  "tone": "Helpful but urgent",
  "fromName": "Shopping Platform",
  "fromAddress": "noreply@shopping-notifications.com",
  "keyRedFlags": ["Suspicious domain (shopping-notifications.com instead of official domain)", "Urgency to verify address", "Request for login credentials"],
  "targetAudienceAnalysis": "Online shoppers are likely to trust package delivery notifications from platforms they use",
  "subjectLineStrategy": "Creates urgency with 'Your order is on hold' message",
  "isQuishing": false
}`;

  const departmentContext = getDepartmentContext(targetProfile?.department, false);

  const userPrompt = `Design a TRADITIONAL PHISHING simulation scenario (NOT quishing - no QR codes) for SECURITY AWARENESS TRAINING based on this context:

**Training Topic:** ${topic || 'General Security Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language} (MUST use BCP-47 format like en-gb, tr-tr, de-de)
**Requested Method:** ${method || 'Auto-Detect'}
**Target Audience Profile:** ${JSON.stringify(targetProfile || {})}${departmentContext}

**IMPORTANT:** This is a traditional phishing scenario. Use email links, buttons, or attachments - NOT QR codes. Set isQuishing: false.

Create a sophisticated blueprint for an educational phishing simulation email that will help employees learn to recognize and report phishing attacks.

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to protect organizations from real attackers.`;

  const additionalContextMessage = additionalContext
    ? `🔴 USER BEHAVIOR ANALYSIS CONTEXT - Use this information to design a targeted phishing scenario:

${additionalContext}

**ACTION REQUIRED:** Use this behavioral analysis to inform your scenario design. Consider the user's risk level, strengths, growth areas, and recommended action plan when designing the phishing simulation. The scenario should be tailored to test and improve the specific vulnerabilities and behavioral patterns identified in this analysis.`
    : undefined;

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

  const quishingSystemPrompt = `You are a Quishing (QR Code Phishing) Email Generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}

**YOUR ROLE:**
Write realistic quishing (QR code phishing) email content based on provided scenario blueprints for cybersecurity training.

**QUISHING-SPECIFIC REQUIREMENTS:**
- QR code is the ONLY call-to-action in the email body
- NO buttons or clickable links in the main body (footer links allowed)
- Use convenience/mobile-friendly language
- Emphasize ease of use: "Scan QR code to verify", "Quick access via QR", "Mobile-friendly verification"
- QR code image tag: <img src="{QRCODEURLIMAGE}" alt="QR Code" style="width:200px;height:auto; margin:0 auto;">
- Place QR code prominently (center-aligned, after main message text, before signature)

${BRAND_AWARENESS_RULES}

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.
   - Maximum length: ${PHISHING_EMAIL.MAX_SUBJECT_LENGTH} characters.
   - Emphasize convenience or urgency related to QR code scanning.

2. ${TABLE_LAYOUT_RULES}
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}
   - **Psychological Triggers:** Use convenience, technology trust, mobile usage naturally.
   - ${FOOTER_RULES}

   ${LAYOUT_STRATEGY_RULES}

   ${PREHEADER_RULE}

   - **TIMING REALISM:** Reference business hours naturally.

   ${MOBILE_OPTIMIZATION_RULES}
   - QR code: Must be clearly visible and scannable on mobile devices.

3. **QR Code Placement:**
   - Must include QR code image using {QRCODEURLIMAGE} merge tag: <img src="{QRCODEURLIMAGE}" alt="QR Code" style="width:200px;height:auto; margin:0 auto;">
   - Required: Use {QRCODEURLIMAGE} tag only (never placeholder src or empty src)
   - Place QR code prominently (center-aligned, after main message text, before signature)
   - Add text around QR code: "Scan QR code to verify", "Quick access via QR", "Mobile-friendly verification"
   - No buttons or clickable links in main body (footer links allowed)

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
  "template": "[Full HTML email with table layout, logo using {CUSTOMMAINLOGO} tag, QR code with <img src='{QRCODEURLIMAGE}' alt='QR Code' style='width:200px;height:auto; margin:0 auto;'>, convenience/mobile-friendly language, NO buttons or links in main body, and signature with department name]"
}

Note: Template must be complete HTML with {QRCODEURLIMAGE} merge tag for QR code (never placeholder images). QR code is the only call-to-action. No buttons or links in main body.`;

  const quishingUserPrompt = `Write the QUISHING (QR Code Phishing) simulation email content based on this blueprint.

**Context:**
- **Language:** Must use ${language || 'en'} only (100% in ${language})${language && !language.startsWith('en') ? ` - Think as native ${language} speaker, not translator.` : ''}
- **Impersonating:** ${analysis.fromName} (Use authentic branding/tone)
- **Difficulty:** ${difficulty}
- **Quishing Confirmed:** This is a QR code phishing email. QR code is the only call-to-action. No buttons or links in main body.
${analysis.isRecognizedBrand && analysis.brandName ? `- **Recognized Brand:** ${analysis.brandName} - Include brand name in subject line or email body.` : ''}

**Blueprint:**
${JSON.stringify(analysis, null, 2)}

**Generation Steps:**
1. **ANALYZE** the 'Blueprint' above - extract quishing scenario details, exact tone, and all quishing-specific red flags.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - 10-15 words about QR code verification.
4. ${GREETING_INSTRUCTION(language)}
5. **WRITE** realistic, authentic email content that matches the brand's style and emphasizes convenience/mobile-friendly access.
6. **QR Code Merge Tag:** Must use {QRCODEURLIMAGE} merge tag for QR code. Add <img src="{QRCODEURLIMAGE}" alt="QR Code" style="width:200px;height:auto; margin:0 auto;"> prominently (center-aligned, after main message text, before signature). Required: Never use placeholder src like "qr-code.png" or empty src - always use {QRCODEURLIMAGE} tag. Add convenience text around QR code.
7. **EMBED** quishing-specific red flags according to difficulty level (unsolicited QR codes, QR codes requesting credentials, QR codes in unexpected contexts).
8. **VERIFY** NO buttons or clickable links exist in main body (footer links allowed).
9. **OUTPUT** valid JSON with complete, production-ready HTML template.`;

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
   - **MUST match the tone** specified in the blueprint exactly.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}
   - **Psychological Triggers (subtle):** Use 1-2 from analysis.psychologicalTriggers naturally (e.g., authority tone, urgency/deadline, curiosity hook). Avoid overuse.
   - **Social Engineering (Cialdini principles):** Apply naturally when fitting: reciprocity (free service, special offer), social proof (colleagues completed, trusted by X users), commitment (you previously agreed), liking (valued customer). Use fear of loss sparingly (account lockout, service suspension).
   - ${FOOTER_RULES} Keep it brief; no disclaimers.

   ${LAYOUT_STRATEGY_RULES}

   ${PREHEADER_RULE} (hidden from email body, visible in inbox preview).

   - **TIMING REALISM:** Reference business hours naturally (e.g., "by end of business day", "this morning", "before 5 PM"). Routine emails imply weekday business hours; only critical security alerts can be off-hours/weekend.

   ${MOBILE_OPTIMIZATION_RULES}

3. **Call-to-Action (Button) Strategy - Based on Attack Method:**
   - **Method: '${analysis.method}'**
   - **If '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission):**
     - Button Text: "Verify Account", "Reset Password", "Login to View", "Update Payment".
     - Urgency: High. Imply account lockout or service interruption.
   - **If '${PHISHING.ATTACK_METHODS[0]}' (Click-Only):**
     - Button Text: "View Document", "Track Package", "Read Announcement", "See Photos".
     - Urgency: Low to Medium. Focus on curiosity or helpfulness.
   ${industryDesign ? `\n   - **Brand Colors (${industryDesign.industry}):** Use primary color \`${industryDesign.colors.primary}\` for buttons/links to match brand identity.` : ''}
   - **LAYOUT RULE:** Buttons MUST be in their own \`<div>\` container with \`text-align: center\`. Do NOT overlap with lists.
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

**Blueprint:**
${JSON.stringify(analysis, null, 2)}

**Generation Steps:**
1. **ANALYZE** the 'Blueprint' above - extract specific scenario details, exact tone, and all red flags that must be embedded.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - 10-15 words that appear in inbox preview.
4. ${GREETING_INSTRUCTION(language)}
5. **WRITE** realistic, authentic email content that matches the brand's style and the blueprint's tone exactly.
6. **EMBED** red flags according to difficulty level (obvious for Easy, subtle for Medium/Hard).
7. **SAFETY RULE:** Do NOT use personal names (like "Emily Clarke") in the signature. Use generic Team/Department names only.
8. **FINAL VALIDATION:** Before outputting, check that: (a) greeting contains {FIRSTNAME} or {FULLNAME}, (b) button/link uses {PHISHINGURL} tag. Fix if missing or incorrect.
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
    isQuishing = false,
  } = params;

  // 🎲 RANDOMIZE DESIGN 🎲
  const randomLayout = LAYOUT_OPTIONS[Math.floor(Math.random() * LAYOUT_OPTIONS.length)];
  const randomStyle = STYLE_OPTIONS[Math.floor(Math.random() * STYLE_OPTIONS.length)];

  // 📝 LOG CHOSEN DESIGN FOR DEBUGGING
  // This helps us verify that randomization is working and what the agent is instructed to do
  logger.info('Design Injection:', {
    layout: randomLayout.id,
    style: randomStyle.id,
    layoutName: randomLayout.name,
    styleName: randomStyle.name
  });

  // Check if email uses {CUSTOMMAINLOGO} tag
  const emailUsesLogoTag = template && template.includes('{CUSTOMMAINLOGO}');

  const systemPrompt = `You are a web developer creating realistic landing pages for ${fromName} (${industryDesign.industry} industry).${emailBrandContext}

Your job: generate modern, professional, trustworthy WEB PAGES (not emails) using ONLY pure HTML + inline CSS. No CSS frameworks.

---

**Rules:**

**No Fake Personal Identities:**
- Do not invent or include personal names (first/last names) anywhere in landing page copy (headings, helper text, footer, support/contact)
- If a person must be referenced, use role/team labels only (e.g., "Support Team", "Security Team", "IT Helpdesk")

${isQuishing ? QUISHING_LANDING_PAGE_RULE : NO_QR_CODE_LANDING_PAGE_RULE}

1. ${LANDING_PAGE_LOGO_RULE}${emailUsesLogoTag ? `\n   Note: Email uses {CUSTOMMAINLOGO} tag - maintain consistency in landing pages.` : ''}

2. **SINGLE QUOTES for ALL HTML attributes** (required for JSON safety)
   - Good: <div style='margin: 0 auto; padding: 32px;'>
   - Bad:  <div style="margin: 0 auto;">
   - JSON keys/values can use normal double quotes. ONLY HTML attributes must use SINGLE quotes.

3. **Full HTML document required for every page:**
   - \`<!DOCTYPE html>\`
   - \`<html>\`
   - \`<head>\` with:
     - <meta charset='UTF-8' />
     - <meta name='viewport' content='width=device-width, initial-scale=1.0' />
     - <title>...</title>
   - \`<body>\` ... \`</body>\`
   - \`</html>\`

4. **NO CSS / JS FRAMEWORKS:**
   - Do NOT include Tailwind, Bootstrap, or any other library.
   - Do NOT include external CSS or JS files.
   - Styling must be done with inline \`style='...'\` attributes.

5. **INLINE CSS IS THE SOURCE OF TRUTH:**
   - You MAY use the design hints from \`industryDesign\`, but the final visual result must come from inline styles.
   - For the main card, primary button and inputs, use the provided design patterns:
     - Card: \`style='${industryDesign.patterns.cardStyle}'\`
     - Button: \`style='${industryDesign.patterns.buttonStyle}'\`
     - Input: \`style='${industryDesign.patterns.inputStyle}'\`
   - **CRITICAL FOR HERO LAYOUT:** Hero section (class='hero') MUST use \`flex-direction: column;\` in inline style:
     - ✅ Correct: \`style='display: flex; flex-direction: column; align-items: center; justify-content: center;'\`
     - ❌ Wrong: \`style='display: flex; align-items: center; justify-content: center;'\` (missing flex-direction: column)

  6. **🚨 MANDATORY DESIGN DIRECTIVE (YOU MUST FOLLOW THIS):**
     
     You act as a rendering engine. You have been assigned a specific design system for this generation.
     
     **ASSIGNED LAYOUT: ${randomLayout.name}**
     - Description: ${randomLayout.description}
     - Base CSS Requirement: \`${randomLayout.cssRule}\`
     
     **ASSIGNED VISUAL STYLE: ${randomStyle.name}**
     - Rules: ${randomStyle.rules}
     
     **CONSTRAINT:** You MUST ignore any previous "Option A/B" instructions and strictly implement the **${randomLayout.name}** layout with **${randomStyle.name}** styling.
     
     **Specific Implementation Rules for ${randomLayout.id}:**
     ${randomLayout.id === 'SPLIT' ? '- Use `display: flex; flex-wrap: wrap;` on body.\n     - Left side: Brand color background, centered logo/text.\n     - Right side: White background, form content.' : ''}
     ${randomLayout.id === 'MINIMAL' ? '- NO CARD CONTAINER. Content sits directly on background.\n     - CRITICAL: body max-width: 480px, form max-width: 400px (never full-width).\n     - Centered logo and form with generous spacing (24px gaps).\n     - Clean, minimalist, alert-like layout with breathing room.' : ''}
     ${randomLayout.id === 'CENTERED' ? '- Classic centered card with shadow.\n     - Background color surrounds the card.' : ''}
     ${randomLayout.id === 'HERO' ? '- Top full-width hero bar (brand color, ~200px height).\n     - Hero section: `display: flex; flex-direction: column;` (logo and title must stack vertically).\n     - Content card overlaps the hero bar (negative margin-top).' : ''}

  7. **INLINE CSS IS THE SOURCE OF TRUTH:**

---

**DESIGN STYLE:**
Create MODERN, PROFESSIONAL landing pages that look POLISHED, TRUSTWORTHY, and LEGITIMATE – similar in quality to Microsoft / Google / Apple / Stripe auth / account pages (2024–2025 aesthetic).

---

**BRAND COLORS (from detected industry: ${industryDesign.industry}):**
- Primary: ${industryDesign.colors.primary}
- Secondary: ${industryDesign.colors.secondary}
- Accent: ${industryDesign.colors.accent}

Use these mainly for:
- Primary buttons
- Highlights
- Icons / small accents

Always ensure **high contrast** (e.g. primary button background vs text).

---

**🎨 VISUAL VARIATION RULES (DO NOT CREATE CLONES):**

Pages for the same brand must feel related (same color palette, logo, general mood) but **must not be pixel-identical copies**.

For each new page/template, change at least **3** of the following visual aspects in a natural way:

1. Card max-width (e.g. 380–460px) via \`style='max-width: 380px;'\` vs \`420px\`.
2. Card border-radius (e.g. 14px, 18px, 22px).
3. Card shadow strength (softer or stronger \`box-shadow\`).
4. Logo size or alignment (center vs left).
5. Button shape (fully pill vs slightly rounded rectangle).
6. Vertical spacing between sections (margins between logo, card, footer).
7. Heading text and microcopy wording (same meaning, slightly different sentences).

- Do **NOT** blindly copy the same inline style values across all pages.
- Maintain consistency (same brand), but introduce subtle visual diversity like real products do.

---

**REQUIRED DESIGN ELEMENTS (Make it look PREMIUM):**

1. **Card Container (Main Panel):**
   - White background.
   - Rounded corners.
   - Soft, realistic shadow.
   - Comfortable padding (around 28–36px).
   - Example:
     <div style='${industryDesign.patterns.cardStyle}'>
       ...
     </div>
   - **🚨 IMPORTANT:** If you see \`margin: 0 auto;\` already in templates/examples above, **DO NOT change or remove it** – it's correct centering. If adding new containers, ensure they use \`margin: 0 auto;\` (never \`margin: 0 16px;\` or asymmetric margins).
   - **For wrapper divs**: Use \`display: flex; justify-content: center;\` to center content horizontally.

2. **Typography Hierarchy:**
   - Main heading: clear, strong, around 22–28px, bold.
   - Subheading: smaller, muted color (e.g. #4b5563), explaining context.
   - Helper/footer text: 11–13px, subtle.
   - **FOR QUISHING LANDING PAGES:**
     - Heading MUST be a normal login heading: "Sign In", "Log In to Your Account", "Sign In Securely", etc.
     - Do NOT use: "QR Code Verification", "Verify via QR", "Account Verification via QR", or any QR-related text.
     - Description MUST be neutral: "Enter your credentials to continue" or "Sign in with your work account" — NOT "verify your account" or "account verification required" which exposes the attack.

3. **Inputs:**
   - Use this pattern:
     <input
       type='...'
       name='...'
       placeholder='...'
       style='${industryDesign.patterns.inputStyle}'
     />
   - Each input must have a visible label above it.

4. **Primary Button:**
   - Use this pattern:
     <button
       type='submit'
       style='${industryDesign.patterns.buttonStyle}'
     >
       ...
     </button>
   - Background must use a strong brand color (e.g. ${industryDesign.colors.primary}) to stand out from the card.
   - Text must always be readable (e.g. white text on dark/strong background).

5. **Trust & Security Indicator (especially on login):**
   - Small row BELOW the button (centered), with an icon + text. Use display: flex with justify-content: center (NOT inline-flex) to ensure it appears below, not beside the button.
   - Example:
     <div style='margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #6b7280;'>
       <span aria-hidden='true'>🔒</span>
       <span>256-bit SSL encryption</span>
     </div>

6. **Footer (ALWAYS under the card):**
   - Use small text.
   - Include © YEAR BRAND
   - Include tiny links: Privacy, Terms, Support.
   - Example:

     <div style='
       margin-top: 32px;
       text-align: center;
       font-size: 12px;
       color: #9ca3af;
     '>
       <p style='margin: 0;'>© 2025 ${fromName}. All rights reserved.</p>
       <div style='
         margin-top: 10px;
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 12px;
         font-size: 12px;
       '>
         <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
         <span>•</span>
         <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Terms</a>
         <span>•</span>
         <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Support</a>
       </div>
     </div>

---

**ACCESSIBILITY:**
- Every input has a label with \`for='id'\` matching \`id='...'\`.
- Avoid extremely small text for important content (use >= 14px for main copy).
- Buttons and links should look clearly interactive (cursor changes, visual styling).

---

**PAGES TO GENERATE (depending on requiredPages):**

${requiredPages.includes('login') ? getLoginPageSection({ fromName, industryDesign }) : ''}

${requiredPages.includes('success') ? getSuccessPageSection({ fromName, industryDesign }) : ''}

${requiredPages.includes('info') ? getInfoPageSection({ fromName, industryDesign }) : ''}

---

**TECHNICAL CONSTRAINTS:**
1. **Single File per Page:** Each \`template\` must be a complete HTML document as shown above.
2. **Assets:** Use ONLY public CDN-hosted images (neutral icons). No local files.
3. **STRICT PAGE COUNT:** Generate ONLY the pages requested in \`requiredPages\`.
   - If only 'info' is requested, DO NOT generate 'login' or 'success'.
4. **NO DISCLAIMERS:** Do NOT add any security warnings like "this is a fake site" or "look-alike domain". The output is a mockup.

---

**OUTPUT FORMAT (MANDATORY):**
Return ONLY this JSON structure (no extra commentary, no markdown):

{
  "pages": [
    { "type": "login", "template": "<!DOCTYPE html><html>...</html>" },
    { "type": "success", "template": "<!DOCTYPE html><html>...</html>" },
    { "type": "info", "template": "<!DOCTYPE html><html>...</html>" }
  ]
}

- Include only the page objects that match \`requiredPages\`.
- Each \`template\` must be a COMPLETE HTML document.
- DO NOT include email-related fields (subject, fromName, fromAddress). This is a WEBSITE, not an email.
- Inside each \`template\`, ALL HTML attributes must use SINGLE QUOTES.
`;

  const userPrompt = `Design landing pages for: ${fromName} - ${scenario}

**SCENARIO:** ${scenario}
**LANGUAGE:** ${language}

Create modern, professional pages that match ${industryDesign.industry} standards. Make them look authentic and realistic for ${fromName}.

**GENERATION STEPS (Follow this order):**
1. **Plan first:** Review checklist above, decide on colors, layout, spacing
2. **Match email branding:** Use same logo, colors, and style from phishing email
3. **Generate HTML:** Create complete, valid HTML with all required elements
4. **Validate:** Check output validation list before returning
5. **Ensure variation:** If multiple pages, make them related but NOT identical. Adapt button text, messages, and content to match the specific scenario - make it look like a real ${fromName} page, not a generic template.

**KEY REMINDERS:**
${isQuishing ? `- Landing pages are standard forms (no QR codes)\n` : ''}- Add natural design variations (don't make all pages identical)
- Ensure login page is properly centered with inline styles: \`min-height: 100vh; display: flex; align-items: center; justify-content: center;\`
- Card must have generous internal padding (32px+)
- Button must contrast with card background`;

  // Build optional context messages
  const userContextMessage = additionalContext
    ? `🔴 USER BEHAVIOR ANALYSIS CONTEXT - Design landing page based on this user profile:

${additionalContext}

**ACTION REQUIRED:** Use this behavioral analysis to inform your landing page design. Consider the user's risk level, strengths, growth areas, and behavioral triggers when creating the page. The design must feel genuine, trustworthy, and specifically tailored to this user's profile. Make it look like a legitimate, professional page that this specific user would naturally trust and interact with based on their identified vulnerabilities and patterns.`
    : undefined;

  const emailContextMessage =
    template && (emailUsesLogoTag || emailBrandContext)
      ? `📧 PHISHING EMAIL CONTEXT (for landing page consistency):

**Email Subject:** ${subject || 'N/A'}
**From:** ${fromName} <${fromAddress}>

Landing pages must match the branding and style used in the phishing email. Use the same logo, colors, and design language to maintain consistency.${isQuishing ? `\nNote: Landing pages are standard forms (no QR codes).` : ''}${emailUsesLogoTag ? `\nNote: Email uses {CUSTOMMAINLOGO} tag - use the same in landing pages.` : ''}
${emailBrandContext ? `\n${emailBrandContext}` : ''}

**Email Preview (first 500 chars):** ${template.substring(0, 500)}...`
      : undefined;

  return {
    systemPrompt,
    userPrompt,
    userContextMessage,
    emailContextMessage,
  };
}

