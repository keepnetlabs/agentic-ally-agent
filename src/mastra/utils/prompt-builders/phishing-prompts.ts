/**
 * Phishing Workflow Prompt Builders
 * Centralized prompt generation functions for phishing email workflow steps
 */

import { PHISHING, PHISHING_EMAIL, LANDING_PAGE } from '../../constants';
import { DIFFICULTY_CONFIG } from '../config/phishing-difficulty-config';
import { AnalysisSchema } from '../../schemas/phishing-workflow-schemas';
import { getLogger } from '../core/logger';
import { buildPolicyScenePrompt } from './policy-context-builder';
import { z } from 'zod';

const logger = getLogger('PhishingPromptBuilder');

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

// Layout and Style Options for Dynamic Generation
const LAYOUT_OPTIONS = [
  {
    id: 'CENTERED',
    name: 'CENTERED CARD (Classic)',
    description: 'A centered white card on a colored background. Best for generic login.',
    cssRule: 'body { display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; } .card { max-width: 420px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }'
  },
  {
    id: 'SPLIT',
    name: 'SPLIT SCREEN (Enterprise)',
    description: 'Split screen 50/50. Left side is brand color/image, Right side is the form. Best for corporate/SaaS.',
    cssRule: 'body { display: flex; flex-wrap: wrap; min-height: 100vh; margin: 0; } .brand-side { flex: 1; min-width: 300px; background-color: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; } .form-side { flex: 1; min-width: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; padding: 24px; }'
  },
  {
    id: 'MINIMAL',
    name: 'MINIMAL / URGENT (Alert)',
    description: 'No card container. Content sits directly on a plain white or very light background. Centered, well-spaced layout. Best for simple alerts.',
    cssRule: 'body { padding: 40px 20px; max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: system-ui, sans-serif; } .content { display: flex; flex-direction: column; gap: 24px; padding: 20px; text-align: center; }'
  },
  {
    id: 'HERO',
    name: 'HERO HEADER (Marketing/Promo)',
    description: 'Top colored hero section with logo, content card overlapping the header. Looks like a modern promo or announcement page.',
    cssRule: 'body { margin: 0; background: #f3f4f6; min-height: 100vh; font-family: system-ui, sans-serif; } .hero { height: 220px; background-color: var(--primary-color); width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; } .main-container { margin-top: -48px; padding: 0 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }'
  }
];

const STYLE_OPTIONS = [
  {
    id: 'SOFT',
    name: 'Soft & Modern',
    rules: 'Border-radius: 12px to 16px. Box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1). Padding: Spacious (32px+). Buttons: Fully rounded (pill shape) or soft rounded.'
  },
  {
    id: 'SHARP',
    name: 'Sharp & Corporate',
    rules: 'Border-radius: 2px to 4px. Box-shadow: 0 1px 3px rgba(0,0,0,0.1). Border: 1px solid #e5e7eb. Padding: Compact (20-24px). Buttons: Slightly rounded (4px).'
  },
  {
    id: 'FLAT',
    name: 'Flat & High Contrast',
    rules: 'Border-radius: 6px. No shadow. Border: 2px solid #e5e7eb. Inputs have strong borders. Buttons: No shadow, strong flat color.'
  }
];

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

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are designing quishing (QR code phishing) simulations for corporate security awareness training to help employees recognize and avoid QR code-based phishing attacks. This is a defensive security measure to protect organizations from cybercrime.

**YOUR ROLE:**
Design highly realistic quishing (QR code phishing) simulation scenarios for cybersecurity training.

**🔒 ZERO PII POLICY (STRICT):**
- **Target:** Always refer to the target as "The User", "The Employee", or "Target".
- **Input Data:** Even if the input contains real names, do NOT output them in your analysis description or target audience profile.
- **Persona:** Invent generic personas (e.g., "Finance Manager") instead of using real names.

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

3. **Psychological Triggers (MANDATORY - Apply at least 2):**
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

6. **Quishing-Specific Red Flags (MANDATORY - Include 3-4):**
   - Unsolicited QR code in email (QR codes are rarely sent via email)
   - QR code requesting login credentials or sensitive information
   - QR code in unexpected contexts (e.g., policy acknowledgement via QR instead of portal)
   - Requests to scan QR code for sensitive actions (wire transfers, password changes, account access)
   - QR codes that bypass normal security procedures
   - Urgency around QR code scanning ("Scan within X hours")
   - QR code sent from non-official or suspicious email addresses

**OUTPUT FORMAT:**
Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation, just JSON.

**CRITICAL FIELD REQUIREMENTS:**
- **isQuishing:** MUST be true (MANDATORY - this is a quishing scenario)
- **scenario:** Must involve QR code scanning/phishing
- **psychologicalTriggers:** MUST include at least "Convenience" or "Technology Trust" or "Mobile Usage"
- **keyRedFlags:** MUST include quishing-specific red flags (see section 6)
- **description:** MUST be 300 characters or less

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

  // Add department context ONLY if provided and not 'All'
  let departmentContext = '';
  if (targetProfile?.department && targetProfile.department !== 'All') {
    departmentContext = `\n**TARGET DEPARTMENT:** ${targetProfile.department}
Tailor the quishing scenario specifically for this department's typical workflows, vulnerabilities, and attack vectors.`;
  }

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

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are designing phishing simulations for corporate security awareness training to help employees recognize and avoid real phishing attacks. This is a defensive security measure to protect organizations from cybercrime.

**YOUR ROLE:**
Design highly realistic phishing simulation scenarios for cybersecurity training.

**🔒 ZERO PII POLICY (STRICT):**
- **Target:** Always refer to the target as "The User", "The Employee", or "Target".
- **Input Data:** Even if the input contains real names (e.g. "Gurkan Ugurlu"), do NOT output them in your analysis description or target audience profile.
- **Persona:** Invent generic personas (e.g. "Finance Manager") instead of using real names.

**DECISION LOGIC (ADAPTIVE MODE):**

1. **Attack Method Determination:**
   - **User Choice:** If '${method}' is provided, YOU MUST USE IT.
   - **Auto-Detect (if missing) DEFAULT -- '${PHISHING.DEFAULT_ATTACK_METHOD}'**:
     - '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission): For scenarios requiring login, password reset, verification, payment, survey.
     - '${PHISHING.ATTACK_METHODS[0]}' (Click-Only): For scenarios requiring viewing a document, tracking a package, reading news, downloading a file.

1a. **PSYCHOLOGICAL STRATEGY (Cialdini Principles):**
   - **MANDATORY:** You MUST select and apply at least 2 of Cialdini's 6 Principles (Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity).
   - **Contextual Match:**
     * Finance/Legal → **Authority** ("CEO Request") + **Urgency/Scarcity** ("Immediate action required")
     * HR/Internal → **Social Proof** ("Everyone has completed") + **Commitment** ("As agreed in meeting")
     * Marketing/Perks → **Reciprocity** ("Gift for you") + **Liking** ("Valued employee")
   - **Goal:** Create realistic cognitive dissonance. The target should feel a psychological urge to click, beyond just curiosity.


2. **Profile Analysis (IF Profile Exists):**
   - Use known 'behavioralTriggers' (e.g. Authority -> CEO Fraud).
   - Use 'department' context (Finance -> Invoice Fraud, IT -> VPN Update).

3. **Creative Invention (IF Profile is MISSING/EMPTY):**
   - **INVENT a plausible target persona** based on the Topic.
   - Example: If Topic is "Payroll", assume Target is an Employee, trigger is "Greed/Curiosity".
   - Example: If Topic is "General", pick a universal theme like "Password Expiry" or "Storage Full".
   - **Do NOT fail** if profile is missing. Create the most effective scenario for the given Topic/Difficulty.

3a. **BRAND/COMPANY DETECTION (CRITICAL):**
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
   - **VARIATION RULE:** Ensure every scenario is unique. Change names, company types, and pretext stories even if the Topic is the same.

5. **Red Flag Strategy:**
   - Define 3-4 specific red flags appropriate for the difficulty level (${difficulty}).
   - Traditional phishing red flags: Suspicious sender addresses, urgency tactics, requests for credentials, suspicious links, grammatical errors, mismatched branding, unexpected attachments

**OUTPUT FORMAT:**
Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation, just JSON.

**CRITICAL FIELD LIMITS:**
- **description**: MUST be 300 characters or less. Keep it concise and focused on the simulation's purpose.

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

  // Add department context ONLY if provided and not 'All'
  let departmentContext = '';
  if (targetProfile?.department && targetProfile.department !== 'All') {
    departmentContext = `\n**TARGET DEPARTMENT:** ${targetProfile.department}
Tailor the scenario specifically for this department's typical workflows, vulnerabilities, and attack vectors.`;
  }

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
  const { isQuishingDetected = false, policyContext } = params;

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
  const { analysis, language, difficulty, industryDesign, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];

  const quishingSystemPrompt = `You are a Quishing (QR Code Phishing) Email Generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are creating quishing (QR code phishing) simulation emails for corporate security awareness training programs. These emails teach employees how to identify and report QR code-based phishing attempts. This is a defensive security tool.

**YOUR ROLE:**
Write realistic quishing (QR code phishing) email content based on provided scenario blueprints for cybersecurity training.

**QUISHING-SPECIFIC REQUIREMENTS:**
- QR code is the ONLY call-to-action in the email body
- NO buttons or clickable links in the main body (footer links allowed)
- Use convenience/mobile-friendly language
- Emphasize ease of use: "Scan QR code to verify", "Quick access via QR", "Mobile-friendly verification"
- QR code image tag: <img src="{QRCODEURLIMAGE}" alt="QR Code" style="width:200px;height:auto; margin:0 auto;">
- Place QR code prominently (center-aligned, after main message text, before signature)

**BRAND AWARENESS (CRITICAL):**
- **IF the scenario mentions a specific brand/company** (e.g., "Hepsiburada", "Amazon", "Microsoft"), **MUST:**
  - **EXACTLY MATCH** their authentic email tone, language, and communication style
  - **USE ONLY** appropriate terminology for that specific brand
  - **REFERENCE** their actual services/products that users would recognize
  - **MIMIC** their real notification patterns and email structure
  - **MANDATORY BRAND NAME USAGE:** If a recognized brand is detected (brandName is provided), the brand name **MUST appear at least once** in either the subject line OR the email body.

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.
   - Maximum length: ${PHISHING_EMAIL.MAX_SUBJECT_LENGTH} characters.
   - Emphasize convenience or urgency related to QR code scanning.

2. **Body (HTML):**
   - MUST be fully responsive and compatible with **Outlook** and **Gmail**.
   - **CRITICAL:** Use **TABLE-BASED** layout (no div structure for main layout).
   - **Table width constraint:** Main wrapper table MUST use width='100%' with style='max-width: 600px; margin: 0 auto;'.
   - **PADDING RULE (CRITICAL for Outlook compatibility):** NEVER apply padding to table elements. ALWAYS apply padding to td elements instead.
   - Use **INLINE CSS** for all styling (no style blocks).
   - Use web-safe fonts (Arial, sans-serif).
   - Avoid modern CSS like Flexbox or Grid (breaks in Outlook).
   - **MUST look professional and authentic** - like a real corporate/service email.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}
   - **Psychological Triggers:** Use convenience, technology trust, mobile usage naturally.
   - **Footer (authentic):** Add a short support line and one legal link. **CRITICAL:** ALL footer links MUST use {PHISHINGURL} in href attribute.

   - **LAYOUT STRATEGY (CHOOSE ONE BASED ON BRAND):**
     * **OPTION A: Transactional Card (Modern SaaS/Tech/Retail) - DEFAULT**
       - Background: Light gray (#f3f4f6) for entire email body.
       - Outer td MUST have padding: 20px;
       - Content: Inside a centered WHITE box (card) with rounded corners and shadow.
       - **TEXT ALIGNMENT:** Body content should use text-align: center for professional, modern look.
       - Best for: Payment verification, delivery tracking, event check-in.
     * **OPTION B: Corporate Letter (Bank/HR/Legal)**
       - Background: Full White (#ffffff).
       - Content: Left-aligned structure. No "card" box.
       - **TEXT ALIGNMENT:** Body content should use text-align: left for formal corporate communications.
       - Best for: Policy acknowledgement, HR announcements.

   - **PREHEADER (MANDATORY):**
     - Add a hidden <div> at the VERY TOP of the body containing a short summary (10-15 words) that appears in the inbox preview. Style: display:none;.
   
   - **TIMING REALISM:** Reference business hours naturally.

   - **MOBILE OPTIMIZATION (MANDATORY):**
     - Main table width: 100% (max-width: 600px).
     - QR code: Must be clearly visible and scannable on mobile devices.

3. **QR CODE PLACEMENT (CRITICAL):**
   - **MANDATORY:** Include QR code image using: <img src="{QRCODEURLIMAGE}" alt="QR Code" style="width:200px;height:auto; margin:0 auto;">
   - Place QR code prominently (center-aligned, after main message text, before signature).
   - Add text around QR code: "Scan QR code to verify", "Quick access via QR", "Mobile-friendly verification"
   - **FORBIDDEN:** NO buttons, NO clickable links in main body (footer links allowed).

4. **GREETING & PERSONALIZATION (CRITICAL - MANDATORY):**
   - **MANDATORY FORMAT:** Start the email body with "Dear {FIRSTNAME}," or "Hello {FIRSTNAME}," or similar pattern WITH merge tag.
   - **FORBIDDEN:** Do NOT use generic greetings like "Dear Employee," "Dear User," or "Hi Team". You MUST use {FIRSTNAME} or {FULLNAME} tag.

5. **Dynamic Variables (Merge Tags) - STRICT PII RULES:**
   - **MANDATORY TAGS:** ${PHISHING_EMAIL.MANDATORY_TAGS.map(tag => `\`${tag}\``).join(', ')}, \`{FIRSTNAME}\` (or \`{FULLNAME}\`), \`{QRCODEURLIMAGE}\`.
   - **ABSOLUTE BAN ON REAL NAMES:** NEVER use a real name in the greeting. You MUST use \`{FIRSTNAME}\` or \`{FULLNAME}\`.
   - **Available Tags:** ${PHISHING_EMAIL.MERGE_TAGS.map(tag => `"${tag}"`).join(', ')}

6. **Grammar & Style (${difficulty} Mode):**
   - **Grammar Rule:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}
   - **Red Flags:** **MUST embed quishing-specific red flags** as defined in the blueprint. ${difficulty === 'Easy' ? 'For Easy mode, make them OBVIOUS and easily detectable.' : difficulty === 'Hard' ? 'For Hard mode, make them EXTREMELY SUBTLE - only detectable by trained security professionals.' : 'For Medium mode, make them MODERATELY SUBTLE - detectable with careful inspection but not immediately obvious.'}
   - **Quishing Red Flags:** Unsolicited QR code in email, QR code requesting credentials, QR code in unexpected contexts, urgency around QR scanning.
   - **SYNTAX RULE:** Use **SINGLE QUOTES** for HTML attributes.

7. **Company Logo (MANDATORY - Always include a logo):**
   - **CRITICAL:** Every email MUST include a logo image.
   - **LOGO TAG RULE (STRICT):**
     * **ALWAYS use the merge tag:** \`{CUSTOMMAINLOGO}\`
     * **DO NOT generate logo URLs directly** (no URLs in the email template)
     * **DO NOT use** any logo service URLs or direct image URLs
     * **MUST use:** \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' width='64' height='64' style='display:block; margin:0 auto; object-fit: contain;'>\`
     * The \`{CUSTOMMAINLOGO}\` tag will be automatically replaced with the appropriate logo URL during post-processing
     * This applies to ALL emails, regardless of brand recognition

8. **NO DISCLAIMERS OR NOTES:**
   - **CRITICAL:** Do NOT include any footer notes, explanations, or disclaimers.

9. **EMAIL SIGNATURE RULES:**
   - **FORBIDDEN:** Do NOT use personal names in signature.
   - **REQUIRED:** Use ONLY department/team/system names.

**OUTPUT FORMAT:**
Return ONLY valid JSON with subject and template (HTML body). No markdown, no backticks, no explanation, just JSON.

**EXAMPLE OUTPUT:**
{
  "subject": "Action Required: Scan QR Code to Verify Your Payment",
  "template": "[Full HTML email with table layout, logo using {CUSTOMMAINLOGO} tag, QR code using {QRCODEURLIMAGE} tag, convenience/mobile-friendly language, NO buttons or links in main body, and signature with department name]"
}

**CRITICAL:** Template MUST be complete HTML. QR code is the ONLY call-to-action. No buttons. No links in main body.`;

  const quishingUserPrompt = `Write the QUISHING (QR Code Phishing) simulation email content based on this blueprint.
        
**🚨 CRITICAL CONTEXT (MUST FOLLOW):**
- **Language:** 🔴 **${language || 'en'} ONLY** (100% in ${language})
- **Impersonating:** ${analysis.fromName} (Use authentic branding/tone)
- **Difficulty:** ${difficulty}
- **🔴 QUISHING CONFIRMED:** This is a QR code phishing email. QR code is the ONLY call-to-action. NO buttons or links in main body.
${analysis.isRecognizedBrand && analysis.brandName ? `- **🚨 RECOGNIZED BRAND DETECTED:** ${analysis.brandName} - The brand name MUST appear at least once in either the subject line OR email body.` : ''}

**SCENARIO BLUEPRINT (SOURCE OF TRUTH):**
${JSON.stringify(analysis, null, 2)}

**EXECUTION RULES (FOLLOW IN ORDER):**
1. **ANALYZE** the 'Blueprint' above - extract quishing scenario details, exact tone, and all quishing-specific red flags.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - 10-15 words about QR code verification.
4. **WRITE** the **GREETING FIRST** - MUST start with "Dear {FIRSTNAME}," or "Hello {FIRSTNAME}," WITH the merge tag.
5. **WRITE** realistic, authentic email content that matches the brand's style and emphasizes convenience/mobile-friendly access. **Write ONLY in ${language}.**${language && !language.startsWith('en') ? ` Think as native ${language} speaker, do NOT translate from English.` : ''}
6. **INCLUDE QR CODE** - Add <img src="{QRCODEURLIMAGE}" alt="QR Code" style="width:200px;height:auto; margin:0 auto;"> prominently (center-aligned, after main message text, before signature). Add convenience text around it.
7. **EMBED** quishing-specific red flags according to difficulty level (unsolicited QR codes, QR codes requesting credentials, QR codes in unexpected contexts).
8. **VERIFY** NO buttons or clickable links exist in main body (footer links allowed).
9. **OUTPUT** valid JSON with complete, production-ready HTML template.`;

  // Add policy context if available
  const policyBlock = buildPolicyScenePrompt(policyContext);
  const finalSystemPrompt = quishingSystemPrompt + policyBlock;

  return {
    systemPrompt: finalSystemPrompt,
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
  const { analysis, language, difficulty, industryDesign, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];

  const systemPrompt = `You are a Phishing Content Generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are creating phishing simulation emails for corporate security awareness training programs. These emails are used in controlled environments to teach employees how to identify and report phishing attempts. This is a defensive security tool to protect organizations from real cybercriminals.

**YOUR ROLE:**
Write realistic phishing email content based on provided scenario blueprints for cybersecurity training.

**BRAND AWARENESS (CRITICAL):**
- **IF the scenario mentions a specific brand/company** (e.g., "Hepsiburada", "Amazon", "Microsoft"), **MUST:**
  - **EXACTLY MATCH** their authentic email tone, language, and communication style
  - **USE ONLY** appropriate terminology for that specific brand (e.g., "order", "package", "delivery" for e-commerce)
  - **REFERENCE** their actual services/products that users would recognize
  - **MIMIC** their real notification patterns and email structure
  - **CONSIDER** their typical email format (transactional vs. marketing vs. security alerts) based on the scenario type
  - **MANDATORY BRAND NAME USAGE:** If a recognized brand is detected (brandName is provided), the brand name **MUST appear at least once** in either the subject line OR the email body. This makes the email more authentic and realistic. Examples: "Your Amazon order", "Microsoft Account Security", "PayPal Verification Required"
- Example: For e-commerce brands → "Your order is being prepared", package tracking, order confirmation style

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.
   - Maximum length: ${PHISHING_EMAIL.MAX_SUBJECT_LENGTH} characters.
   - **Social Engineering (subtle):** Use 1-2 soft cues that fit the scenario (e.g., authority, urgency/deadline, scarcity/limited time, social proof). Keep it natural; no hard rules.

2. **Body (HTML):**
   - MUST be fully responsive and compatible with **Outlook** and **Gmail**.
   - **CRITICAL:** Use **TABLE-BASED** layout (no div structure for main layout).
   - **Table width constraint:** Main wrapper table MUST use width='100%' with style='max-width: 600px; margin: 0 auto;' to prevent emails from stretching too wide on large screens.
   - **PADDING RULE (CRITICAL for Outlook compatibility):** NEVER apply padding to table elements. ALWAYS apply padding to td elements instead. Example: td with style='padding: 20px;' NOT table with style='padding: 20px;'. For card layouts, use outer td with padding (e.g., padding: 20px 0;) and inner td with content padding (e.g., padding: 20px;).
   - Use **INLINE CSS** for all styling (no style blocks).
   - Use web-safe fonts (Arial, sans-serif).
   - Avoid modern CSS like Flexbox or Grid (breaks in Outlook).
   - **MUST look professional and authentic** - like a real corporate/service email that users receive daily.
   - **MUST match the tone** specified in the blueprint exactly.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}
   - **Psychological Triggers (subtle):** Use 1-2 from analysis.psychologicalTriggers naturally (e.g., authority tone, urgency/deadline, curiosity hook). Avoid overuse.
   - **Social Engineering (Cialdini principles):** Apply naturally when fitting: reciprocity (free service, special offer), social proof (colleagues completed, trusted by X users), commitment (you previously agreed), liking (valued customer). Use fear of loss sparingly (account lockout, service suspension).
   - **Footer (authentic):** Add a short support line (e.g., support@company.com) and one legal link (Privacy Policy or Manage Notifications). **CRITICAL:** ALL footer links MUST use {PHISHINGURL} in href attribute (e.g., href='{PHISHINGURL}'). Keep it brief; no disclaimers.

   - **LAYOUT STRATEGY (CHOOSE ONE BASED ON BRAND):**
     * **OPTION A: Transactional Card (Modern SaaS/Tech/Retail) - DEFAULT**
       - **DEFAULT CHOICE:** Use this format unless scenario is explicitly CEO/HR/Policy internal memo.
       - Background: Light gray (#f3f4f6) for entire email body.
       - **CRITICAL:** Outer td (with background color) MUST have padding: 20px; (all sides) to prevent content from touching edges on mobile and desktop.
       - Content: Inside a centered WHITE box (card) with rounded corners and shadow.
       - **CRITICAL:** Card format MUST have gray background (#f3f4f6) + white card box (#ffffff) with shadow.
       - **TEXT ALIGNMENT:** Body content should use text-align: center for a professional, modern look (especially for SaaS/Tech brands).
       - Best for: "Reset Password", "Order Confirmation", "Security Alert", E-commerce, Tech brands.
     * **OPTION B: Corporate Letter (Bank/HR/Legal)**
       - Background: Full White (#ffffff).
       - Content: Left-aligned structure. No "card" box.
       - **TEXT ALIGNMENT:** Body content should use text-align: left for formal corporate communications.
       - Best for: "Policy Update", "CEO Message", "HR Announcement".

   - **PREHEADER (MANDATORY):**
     - Add a hidden <div> at the VERY TOP of the body containing a short summary (10-15 words) that appears in the inbox preview. Style: display:none; (hidden from email body, visible in inbox preview).
   
   - **TIMING REALISM:** Reference business hours naturally (e.g., "by end of business day", "this morning", "before 5 PM"). Routine emails imply weekday business hours; only critical security alerts can be off-hours/weekend.

   - **MOBILE OPTIMIZATION (MANDATORY):**
     - Main table width: 100% (max-width: 600px).
     - Buttons: **MUST be easily tappable on mobile** (min-height 32px) for optimal user experience.

3. **Call-to-Action (Button) Strategy - Based on Attack Method:**
   - **Method: '${analysis.method}'**
   - **If '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission):**
     - Button Text: "Verify Account", "Reset Password", "Login to View", "Update Payment".
     - Urgency: High. Imply account lockout or service interruption.
   - **If '${PHISHING.ATTACK_METHODS[0]}' (Click-Only):**
     - Button Text: "View Document", "Track Package", "Read Announcement", "See Photos".
     - Urgency: Low to Medium. Focus on curiosity or helpfulness.
   ${industryDesign ? `\n   - **Brand Colors (${industryDesign.industry}):** Use primary color \`${industryDesign.colors.primary}\` for buttons/links to match brand identity.` : ''}

4. **GREETING & PERSONALIZATION (CRITICAL - MANDATORY):**
   - **🚨 ABSOLUTE REQUIREMENT:** The greeting MUST use personalization merge tags. This is NON-NEGOTIABLE.
   - **MANDATORY FORMAT:** Start the email body with "Dear {FIRSTNAME}," or "Hello {FIRSTNAME}," or similar pattern WITH merge tag.
   - **FORBIDDEN:** Do NOT use generic greetings like "Dear Employee," "Dear User," or "Hi Team". You MUST use {FIRSTNAME} or {FULLNAME} tag.
   - **VALIDATION CHECK:** Before outputting, verify the greeting contains either \`{FIRSTNAME}\` or \`{FULLNAME}\`. If it doesn't, you MUST fix it.

5. **Dynamic Variables (Merge Tags) - STRICT PII RULES:**
   - **MANDATORY TAGS:** ${PHISHING_EMAIL.MANDATORY_TAGS.map(tag => `\`${tag}\``).join(', ')}, \`{FIRSTNAME}\` (or \`{FULLNAME}\`).
   - **ABSOLUTE BAN ON REAL NAMES:** NEVER use a real name (e.g., "Hi Gurkan", "Dear Peter") in the greeting. You MUST use \`{FIRSTNAME}\` or \`{FULLNAME}\`.
   - **FORBIDDEN:** Do NOT use generic salutations like "Dear User", "Dear Employee", "Hi Team". You MUST use the merge tag.
   - **RECOMMENDED TAGS:** ${PHISHING_EMAIL.RECOMMENDED_TAGS.map(tag => `\`${tag}\``).join(', ')}
   - **CRITICAL RULES:**
     * ONLY use merge tags from the available list below - DO NOT invent new tags like {FROMTITLE} or {POSITION}
     * For links/buttons: Use {PHISHINGURL} ONLY in href attribute with ACTION TEXT (e.g. "Verify Account", "Click Here")
     * **CRITICAL:** ALL links/buttons MUST use {PHISHINGURL} merge tag - NEVER hardcode URLs like https://example.com
     * NEVER show URLs in visible text (no "Or visit: https://...", no "Go to: link.com") - ONLY use buttons/links with action text
     * Buttons must be \`<button>\` or \`<a href='{PHISHINGURL}'>\` elements, NEVER contain raw URLs
   - **Available Tags:** ${PHISHING_EMAIL.MERGE_TAGS.map(tag => `"${tag}"`).join(', ')}

6. **Grammar & Style (${difficulty} Mode):**
   - **Grammar Rule:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}
   - **Red Flags:** **MUST embed the red flags** as defined in the blueprint. ${difficulty === 'Easy' ? 'For Easy mode, make them OBVIOUS and easily detectable. For Medium/Hard, make them subtle but detectable.' : difficulty === 'Hard' ? 'For Hard mode, make them EXTREMELY SUBTLE - only detectable by trained security professionals. They should blend naturally into the email.' : 'For Medium mode, make them MODERATELY SUBTLE - detectable with careful inspection but not immediately obvious.'}
   - **CREATIVITY RULE:** Do NOT use generic "lorem ipsum" style fillers. **MUST write specific, plausible, realistic content** directly relevant to the Scenario that feels authentic and genuine.
   - **SYNTAX RULE:** Use **SINGLE QUOTES** for HTML attributes (e.g. style='color:red') to prevent JSON escaping errors.

7. **Company Logo (MANDATORY - Always include a logo):**
   - **CRITICAL:** Every email MUST include a logo image.
   - **LOGO TAG RULE (STRICT):**
     * **ALWAYS use the merge tag:** \`{CUSTOMMAINLOGO}\`
     * **DO NOT generate logo URLs directly** (no URLs in the email template)
     * **DO NOT use** any logo service URLs or direct image URLs
     * **MUST use:** \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' width='64' height='64' style='display:block; margin:0 auto 20px; object-fit: contain;'>\`
     * The \`{CUSTOMMAINLOGO}\` tag will be automatically replaced with the appropriate logo URL during post-processing
     * This applies to ALL emails, regardless of brand recognition

8. **NO DISCLAIMERS OR NOTES:**
   - **CRITICAL:** Do NOT include any footer notes, explanations, or disclaimers like "Note: This is a phishing link" or "Generated for training".
   - The output must be the RAW email content ONLY.
   - Any meta-commentary destroys the simulation.
   - The simulation platform adds these disclaimers automatically.

9. **EMAIL SIGNATURE RULES:**
   - **FORBIDDEN:** Do NOT use personal names in signature (like "Emily Clarke", "John Smith", "Sarah Johnson").
   - **REQUIRED:** Use ONLY department/team/system names:
     ✅ Correct: "Security Notifications Team", "IT Support Team", "Customer Service", "Microsoft Account Team", "Automated System"
     ❌ Wrong: "Emily Clarke", "John from IT", "Sarah - Support"
   - Signature format: Team Name + Email Address
   - Example: "Best regards,<br>Security Notifications Team<br>security@company.com"

**OUTPUT FORMAT:**
Return ONLY valid JSON with subject and template (HTML body). No markdown, no backticks, no explanation, just JSON.

**EXAMPLE OUTPUT:**
{
  "subject": "Microsoft Security Alert - Verify Your Account",
  "template": "[Full HTML email with table layout, logo using {CUSTOMMAINLOGO} tag, urgent message, call-to-action button with {PHISHINGURL}, and signature with department name]"
}

**CRITICAL:** Template MUST be complete HTML (not truncated). Use table-based layout with inline CSS. The email must be production-ready and fully functional.`;

  const userPrompt = `Write the phishing simulation email content based on this blueprint.
        
**🚨 CRITICAL CONTEXT (MUST FOLLOW):**
- **Language:** 🔴 **${language || 'en'} ONLY** (100% in ${language})
- **Impersonating:** ${analysis.fromName} (Use authentic branding/tone)
- **Difficulty:** ${difficulty}
${analysis.isRecognizedBrand && analysis.brandName ? `- **🚨 RECOGNIZED BRAND DETECTED:** ${analysis.brandName} - The brand name MUST appear at least once in either the subject line OR email body to ensure authenticity. Example: "Your ${analysis.brandName} account" or "${analysis.brandName} Security Alert"` : ''}

**SCENARIO BLUEPRINT (SOURCE OF TRUTH):**
${JSON.stringify(analysis, null, 2)}

**EXECUTION RULES (FOLLOW IN ORDER):**
1. **ANALYZE** the 'Blueprint' above - extract specific scenario details, exact tone, and all red flags that must be embedded.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - 10-15 words that appear in inbox preview.
4. **WRITE** the **GREETING FIRST** - MUST start with "Dear {FIRSTNAME}," or "Hello {FIRSTNAME}," or similar pattern WITH the merge tag. NEVER use "Dear Employee" or generic greetings.
5. **WRITE** realistic, authentic email content that matches the brand's style and the blueprint's tone exactly. **Write ONLY in ${language}.**${language && !language.startsWith('en') ? ` Think as native ${language} speaker, do NOT translate from English.` : ''}
6. **EMBED** red flags according to difficulty level (obvious for Easy, subtle for Medium/Hard).
7. **SAFETY RULE:** Do NOT use personal names (like "Emily Clarke") in the signature. Use generic Team/Department names only.
8. **FINAL VALIDATION:** Before outputting, check that: (a) greeting contains {FIRSTNAME} or {FULLNAME}, (b) button/link uses {PHISHINGURL} tag. Fix if missing or incorrect.
9. **OUTPUT** valid JSON with complete, production-ready HTML template.`;

  // Add policy context if available
  const policyBlock = buildPolicyScenePrompt(policyContext);
  const finalSystemPrompt = systemPrompt + policyBlock;

  return {
    systemPrompt: finalSystemPrompt,
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
    policyContext,
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

**🔒 ZERO PII POLICY (STRICT):**
- **No Real Names:** Never display real user names (e.g. "Welcome, Gurkan").
- **Safe Greetings:** Use "Welcome back", "Hello", "Sign in", or show the email address (e.g. "user@company.com").

---

**CRITICAL RULES:**

${isQuishing ? `**🚫 QUISHING LANDING PAGE - NO QR CODES:**
   - This is a quishing scenario. Landing pages must NOT contain QR codes. QR codes are only in the email. Landing pages are standard forms (login, success, info).` : `**🚫 NO QR CODES IN LANDING PAGES:**
   - Do NOT add QR codes to landing pages. Landing pages are standard web forms (login, success, info pages).`}

1. **LOGO STRATEGY (MANDATORY - Always include a logo):**
   ${template && template.includes('{CUSTOMMAINLOGO}') ? `🚨 **HIGHEST PRIORITY - EMAIL USES LOGO TAG:**\n   - **ABSOLUTE REQUIREMENT:** The phishing email uses the \`{CUSTOMMAINLOGO}\` merge tag for the logo.\n   - **YOU MUST USE THE SAME TAG IN ALL LANDING PAGES:** \`<img src='{CUSTOMMAINLOGO}' alt='${fromName}' width='64' height='64' style='display: block; margin: 0 auto; object-fit: contain;' />\`\n   - **DO NOT** generate a different logo URL.\n   - **DO NOT** use any logo service or direct image URLs.\n   - **CRITICAL:** Landing page logo MUST use the same \`{CUSTOMMAINLOGO}\` tag as the email for brand consistency.\n   - The tag will be automatically replaced with the appropriate logo URL during post-processing.\n\n   **IF YOU SEE {CUSTOMMAINLOGO} TAG ABOVE, IGNORE ALL OTHER LOGO RULES BELOW AND USE ONLY THAT TAG.**\n\n   ---\n\n   **FALLBACK RULES (ONLY IF NO {CUSTOMMAINLOGO} TAG IN EMAIL):**` : `   - **CRITICAL:** Every landing page MUST include a logo image.`}
   - **LOGO TAG RULE (STRICT):**
     * **ALWAYS use the merge tag:** \`{CUSTOMMAINLOGO}\`
     * **DO NOT generate logo URLs directly** (no URLs in the landing page template)
     * **DO NOT use** any logo service URLs or direct image URLs
     * **MUST use:** \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' width='64' height='64' style='display: block; margin: 0 auto; object-fit: contain;' />\`
     * The \`{CUSTOMMAINLOGO}\` tag will be automatically replaced with the appropriate logo URL during post-processing
     * This applies to ALL landing pages, regardless of brand recognition
   - **FORBIDDEN:** 
     - Do NOT use any logo service or direct image URLs in templates. Only use the \`{CUSTOMMAINLOGO}\` tag.
     - Never use placeholder services (via.placeholder.com) – looks fake.

2. **SINGLE QUOTES for ALL HTML attributes** (required for JSON safety)
   - Good: <div style='margin: 0 auto; padding: 32px;'>
   - Bad:  <div style="margin: 0 auto;">
   - JSON keys/values can use normal double quotes. ONLY HTML attributes must use SINGLE quotes.

3. **Full HTML document is MANDATORY for every page:**
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
     ${randomLayout.id === 'MINIMAL' ? '- NO CARD CONTAINER. Content sits directly on background.\n     - Centered logo and form with generous spacing (24px gaps).\n     - Clean, minimalist, alert-like layout with breathing room.' : ''}
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

${requiredPages.includes('login') ? `
=====================================================
### 1. LOGIN PAGE (type: 'login')

Goal: A secure, polished login screen for ${fromName}.

**STRUCTURE:**

- BODY: centered layout with background.
- WRAPPER: column layout (logo section, card, footer).
- CARD: login form.

**LOGIN TEMPLATE EXAMPLE (STRUCTURE TO FOLLOW - ADAPT TO SCENARIO, DON'T COPY VERBATIM):**

<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>Sign in to ${fromName}</title>
</head>
<body style='
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
'>
  <div style='
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  '>

    <!-- Logo + Title -->
    <div style='text-align: center; margin-bottom: 24px;'>
      <img src='{CUSTOMMAINLOGO}' alt='${fromName}' style='display: block; margin: 0 auto 16px auto; height: 64px; object-fit: contain;' />
      <h1 style='font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.02em;'>Sign in to ${fromName}</h1>
      <p style='margin: 8px 0 0 0; font-size: 14px; color: #4b5563;'>
        Use your work credentials to securely access your account.
      </p>
    </div>

    <!-- Card -->
    <div style='${industryDesign.patterns.cardStyle}'>
      <form>
        <!-- Email -->
        <div style='margin-bottom: 16px;'>
          <label for='email' style='display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;'>
            Email address
          </label>
          <input
            id='email'
            type='email'
            name='email'
            placeholder='you@example.com'
            autocomplete='email'
            required
            style='${industryDesign.patterns.inputStyle}'
          />
        </div>

        <!-- Password -->
        <div style='margin-bottom: 16px;'>
          <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;'>
            <label for='password' style='font-size: 12px; font-weight: 600; color: #374151;'>
              Password
            </label>
            <a href='#' style='font-size: 12px; color: ${industryDesign.colors.primary}; text-decoration: none;'>
              Forgot?
            </a>
          </div>
          <input
            id='password'
            type='password'
            name='password'
            placeholder='Enter your password'
            autocomplete='current-password'
            required
            style='${industryDesign.patterns.inputStyle}'
          />
        </div>

        <!-- Remember Me -->
        <div style='display: flex; align-items: center; gap: 8px; margin-bottom: 16px;'>
          <input
            id='remember'
            type='checkbox'
            name='remember'
            style='width: 14px; height: 14px; border-radius: 4px; border: 1px solid #d1d5db;'
          />
          <label for='remember' style='font-size: 12px; color: #4b5563;'>
            Keep me signed in
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type='submit'
          style='${industryDesign.patterns.buttonStyle}'
        >
          Sign in
        </button>

        <!-- Security Indicator -->
        <div style='margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #6b7280;'>
          <span aria-hidden='true'>🔒</span>
          <span>256-bit SSL encryption</span>
        </div>

        <!-- Hidden Tracking -->
        <input type='hidden' name='trackId' value='${LANDING_PAGE.PLACEHOLDERS.TRACK_ID}' />
      </form>
    </div>

    <!-- Footer (ALWAYS under the card) -->
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
      '>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
        <span>•</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Terms</a>
        <span>•</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Support</a>
      </div>
    </div>
  </div>
</body>
</html>

**LOGIN VALIDATION:**
- [ ] Body uses flex center and background.
- [ ] Wrapper uses flex-direction: column, so footer is BELOW the card.
- [ ] Wrapper has margin: 0 auto to ensure centering.
- [ ] Card has generous padding and clean shadow.
- [ ] Button has strong contrast using brand primary.
- [ ] All HTML attributes use SINGLE QUOTES.
- [ ] Hidden trackId field is present.
` : ''}

${requiredPages.includes('success') ? `
=====================================================
### 2. SUCCESS PAGE (type: 'success')

Purpose: confirmation after a successful action (e.g. login verification, profile update).

**STRUCTURE:**
- Same body + wrapper pattern as login.
- Single centered card with:
  - Success icon (checkmark).
  - Title and short message.
  - Optional primary button.
  - No form.

**SUCCESS TEMPLATE EXAMPLE (ADAPT TO SCENARIO, DON'T COPY VERBATIM):**

<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>${fromName} – Success</title>
</head>
<body style='
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
'>
  <div style='
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  '>

    <div style='${industryDesign.patterns.cardStyle}; text-align: center;'>
      <div style='margin-bottom: 16px;'>
        <div style='
          width: 64px;
          height: 64px;
          border-radius: 999px;
          margin: 0 auto 16px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #22c55e;
        '>
          <span style='color: #ffffff; font-size: 32px;'>✓</span>
        </div>
        <h1 style='font-size: 22px; font-weight: 700; margin: 0 0 8px 0;'>Account updated</h1>
        <p style='margin: 0; font-size: 14px; color: #4b5563;'>
          Your account information has been updated successfully.
        </p>
      </div>

      <button
        type='button'
        style='${industryDesign.patterns.buttonStyle}; width: auto; padding-left: 24px; padding-right: 24px; margin-top: 16px;'
      >
        Go to dashboard
      </button>

      <!-- Security Indicator (BELOW button, centered) -->
      <div style='margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #6b7280;'>
        <span aria-hidden='true'>🔒</span>
        <span>Secure portal</span>
      </div>
    </div>

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
      '>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
        <span>•</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Terms</a>
        <span>•</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Support</a>
      </div>
    </div>
  </div>
</body>
</html>
` : ''}

${requiredPages.includes('info') ? `
=====================================================
### 3. INFO/DOCUMENT PAGE (type: 'info')

Purpose: display information (policy update, document notice, summary, etc.) for click-only flows.

**STRUCTURE:**
- Body: simple vertical layout.
- Main content in a wider card (e.g. 640–760px max-width).
- Logo + brand at top.
- Title + intro.
- 1–3 short paragraphs of text.
- Primary action button + metadata (e.g. "Last updated: ...").
- Footer ©.

**INFO TEMPLATE EXAMPLE (ADAPT TO SCENARIO, DON'T COPY VERBATIM):**

<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>${fromName} – Policy update</title>
</head>
<body style='
  min-height: 100vh;
  margin: 0;
  padding: 40px 16px;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
'>
  <div style='max-width: 720px; margin: 0 auto;'>

    <div style='${industryDesign.patterns.cardStyle}; max-width: 720px; margin: 0 auto;'>
      <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;'>
        <div style='display: flex; align-items: center; gap: 8px;'>
          <img src='{CUSTOMMAINLOGO}' alt='${fromName}' style='display: block; margin: 0 auto; height: 36px; object-fit: contain;' />
        </div>
        <span style='font-size: 12px; color: #6b7280;'>${fromName}</span>
      </div>

      <div style='margin-bottom: 16px;'>
        <h1 style='font-size: 24px; font-weight: 700; margin: 0 0 8px 0;'>Policy update</h1>
        <p style='margin: 0; font-size: 14px; color: #4b5563;'>
          We have updated our account policy to improve security and transparency.
        </p>
      </div>

      <div style='font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;'>
        <p style='margin: 0 0 12px 0;'>
          Please review the updated terms to stay informed about how your information is used and protected.
        </p>
        <p style='margin: 0;'>
          By continuing, you confirm that you have read and understood these changes.
        </p>
      </div>

      <div style='display: flex; align-items: center; gap: 12px; flex-wrap: wrap;'>
        <button
          type='button'
          style='${industryDesign.patterns.buttonStyle}; width: auto; padding-left: 20px; padding-right: 20px;'
        >
          View full policy
        </button>
        <span style='font-size: 12px; color: #6b7280;'>Last updated: Jan 5, 2025</span>
      </div>
    </div>

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
      '>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
        <span>•</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Terms</a>
        <span>•</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Support</a>
      </div>
    </div>
  </div>
</body>
</html>
` : ''}

---

**TECHNICAL CONSTRAINTS:**
1. **Single File per Page:** Each \`template\` must be a complete HTML document as shown above.
2. **Assets:** Use ONLY public CDN-hosted images (neutral icons). No local files. For logos, use the \`{CUSTOMMAINLOGO}\` tag.
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
2. **Match email branding:** Use SAME logo, colors, and style from phishing email${emailUsesLogoTag ? ' - EMAIL USES {CUSTOMMAINLOGO} TAG (MUST USE SAME TAG)' : ''}
3. **Generate HTML:** Create complete, valid HTML with all required elements
4. **Validate:** Check output validation list before returning
5. **Ensure variation:** If multiple pages, make them related but NOT identical. Adapt button text, messages, and content to match the specific scenario - make it look like a real ${fromName} page, not a generic template.

**REMEMBER:**
${emailUsesLogoTag ? `- 🚨 **LOGO CRITICAL:** The phishing email uses \`{CUSTOMMAINLOGO}\` tag. YOU MUST USE THE SAME TAG IN ALL LANDING PAGES. DO NOT generate a different logo URL.` : `- **LOGO IS MANDATORY:** Use \`{CUSTOMMAINLOGO}\` tag in all landing pages. The tag will be automatically replaced with the appropriate logo URL during post-processing.`}
${isQuishing ? `- 🚫 **QUISHING:** Landing page must NOT contain QR codes. Email has QR codes, landing page is standard form.` : `- 🚫 **NO QR CODES:** Do NOT add QR codes to landing pages. Landing pages are standard web forms only.`}
- Add natural design variations (don't make all pages identical)
- Ensure login page is properly centered with inline styles: \`min-height: 100vh; display: flex; align-items: center; justify-content: center;\`
- Card MUST have generous internal padding (32px+)
- Button MUST contrast with card background (NOT same color!)`;

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

**CRITICAL:** The landing pages MUST match the branding and style used in the phishing email above. Use the SAME logo, colors, and design language to maintain consistency. Users clicking from the email should see a seamless transition to the landing page.

${isQuishing ? `**🚫 QUISHING:** Landing pages must NOT contain QR codes. Email has QR codes, landing pages are standard forms.` : `**🚫 IMPORTANT:** If the email contains QR codes, DO NOT include QR codes in landing pages. Landing pages are standard web forms.`}

${emailUsesLogoTag ? `\n🚨 **LOGO REQUIREMENT (MANDATORY):**\nThe phishing email uses the \`{CUSTOMMAINLOGO}\` merge tag for the logo.\n\n**YOU MUST USE THE SAME TAG IN ALL LANDING PAGES.**\n\n**DO NOT:**\n- Generate a different logo URL\n- Use any logo service or direct image URLs\n- Create any other logo\n\n**YOU MUST:**\n- Use the same \`{CUSTOMMAINLOGO}\` tag\n- Include it in ALL pages (login, success, info, etc.)\n- Match the exact same logo tag that appears in the email\n\n**Example usage:**\n<img src='{CUSTOMMAINLOGO}' alt='${fromName}' width='64' height='64' style='display: block; margin: 0 auto; object-fit: contain;' />` : ''}
${emailBrandContext ? `\n${emailBrandContext}` : ''}

**Email Preview (first 500 chars):** ${template.substring(0, 500)}...`
      : undefined;

  // Add policy context if available
  const policyBlock = buildPolicyScenePrompt(policyContext);
  const finalSystemPrompt = systemPrompt + policyBlock;

  return {
    systemPrompt: finalSystemPrompt,
    userPrompt,
    userContextMessage,
    emailContextMessage,
  };
}

