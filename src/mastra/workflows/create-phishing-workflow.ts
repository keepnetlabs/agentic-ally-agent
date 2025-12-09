import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { sanitizeHtml } from '../utils/content-processors/html-sanitizer';
import { v4 as uuidv4 } from 'uuid';
import { PHISHING, PHISHING_EMAIL, LANDING_PAGE } from '../constants';
import { KVService } from '../services/kv-service';
import { StreamWriterSchema, StreamWriter } from '../types/stream-writer';
import {
    detectIndustry,
    fixBrokenImages,
    validateLandingPage,
    logValidationResults
} from '../utils/landing-page';
import { DEFAULT_GENERIC_LOGO } from '../utils/landing-page/image-validator';

// Helper to stream text reasoning directly without LLM processing
const streamDirectReasoning = async (reasoning: string, writer: StreamWriter) => {
    if (!reasoning || !writer) return;
    const messageId = uuidv4();
    try {
        await writer.write({ type: 'reasoning-start', id: messageId });
        await writer.write({ type: 'reasoning-delta', id: messageId, delta: reasoning });
        await writer.write({ type: 'reasoning-end', id: messageId });
    } catch (e) {
        // Ignore write errors silently (e.g. if stream closed)
    }
};

// --- Configuration ---

const DIFFICULTY_CONFIG = {
    Easy: {
        sender: {
            rule: "OBVIOUS FAKE",
            examples: ["support@micr0soft.com (typo)", "service.update.team@gmail.com (public domain)", "security-alert-team@hotmail.com"]
        },
        grammar: {
            rule: "POOR",
            description: "Include 2-3 noticeable spelling or grammar mistakes. Use excessive capitalization."
        },
        urgency: {
            rule: "EXTREME",
            description: "Panic-inducing language. 'IMMEDIATE ACTION REQUIRED', 'ACCOUNT WILL BE DELETED'."
        },
        visuals: {
            rule: "BASIC",
            description: "Simple layout. Use brand logos if available, otherwise generic icons. High contrast colors."
        }
    },
    Medium: {
        sender: {
            rule: "SUSPICIOUS BUT PLAUSIBLE",
            examples: ["support@microsoft-security-updates.net (external domain)", "hr-department@company-internal-portal.org"]
        },
        grammar: {
            rule: "GOOD BUT IMPERFECT",
            description: "Generally correct, but maybe one awkward phrase or slightly robotic tone."
        },
        urgency: {
            rule: "HIGH",
            description: "Professional but pressing. 'Action required within 24 hours', 'Please verify details'."
        },
        visuals: {
            rule: "PROFESSIONAL",
            description: "Clean, modern design. USE BRAND LOGOS (from public URL). Looks legitimate at first glance."
        }
    },
    Hard: {
        sender: {
            rule: "SOPHISTICATED SPOOFING",
            examples: ["security@microsoft.com (looks legitimate)", "notifications@internal.apple.com", "ceo-office@company.com"]
        },
        grammar: {
            rule: "FLAWLESS",
            description: "Perfect corporate speak. Professional, helpful, and bureaucratic tone."
        },
        urgency: {
            rule: "SUBTLE / CURIOSITY",
            description: "Low apparent urgency. 'FYI: Updated Policy', 'Please review attached report', 'New benefits available'."
        },
        visuals: {
            rule: "PERFECT REPLICA - PROFESSIONAL",
            description: "Use official brand colors (HEX exact), fonts, and layout. It should look 100% indistinguishable from the real site."
        }
    }
} as const;

// --- Zod Schemas ---

const InputSchema = z.object({
    topic: z.string().describe('The main theme or topic of the phishing simulation'),
    targetProfile: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
        behavioralTriggers: z.array(z.string()).optional().describe('e.g. Authority, Urgency, Greed'),
        vulnerabilities: z.array(z.string()).optional(),
    }).optional(),
    difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS).default(PHISHING.DEFAULT_DIFFICULTY),
    language: z.string().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
    method: z.enum(PHISHING.ATTACK_METHODS).optional().describe('Type of phishing attack'),
    includeLandingPage: z.boolean().default(true).describe('Whether to generate a landing page'),
    includeEmail: z.boolean().default(true).describe('Whether to generate an email'),
    additionalContext: z.string().optional().describe('User behavior context / vulnerability analysis for targeted phishing'),
    modelProvider: z.string().optional(),
    model: z.string().optional(),
    writer: StreamWriterSchema.optional(),
});

// Enhanced Analysis Schema (The Blueprint)
const AnalysisSchema = z.object({
    scenario: z.string().describe('The specific scenario chosen (e.g. CEO Fraud, IT Update, HR Policy)'),
    name: z.string().describe('Short display name for the template (e.g. "Password Reset - Easy")'),
    description: z.string().describe('Brief description of the phishing scenario'),
    category: z.string().describe('Phishing category: Credential Harvesting, Malware, Financial Fraud, etc.'),
    method: z.enum(PHISHING.ATTACK_METHODS).describe('The determined attack method for this scenario'),
    psychologicalTriggers: z.array(z.string()).describe('Triggers used: Authority, Urgency, Fear, Greed, Curiosity, Helpfulness'),
    tone: z.string().describe('Email tone: Formal, Urgent, Friendly, Threatening, etc.'),
    fromAddress: z.string().describe('Spoofed sender email address'),
    fromName: z.string().describe('Spoofed sender display name'),
    keyRedFlags: z.array(z.string()).describe('List of subtle indicators (red flags) to educate the user'),
    targetAudienceAnalysis: z.string().describe('Brief explanation of why this scenario fits the target profile'),
    subjectLineStrategy: z.string().describe('Reasoning behind the subject line choice'),
    reasoning: z.string().optional().describe('AI reasoning about scenario design (if available)'),
    emailGenerationReasoning: z.string().optional().describe('AI reasoning about email content generation (if available)'),
    additionalContext: z.string().optional().describe('User behavior context / vulnerability analysis for targeted phishing'),
    // Passthrough fields
    difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS).optional(),
    language: z.string().optional(),
    includeLandingPage: z.boolean().optional(),
    includeEmail: z.boolean().optional(),
    modelProvider: z.string().optional(),
    model: z.string().optional(),
    writer: StreamWriterSchema.optional(),
});

// Email Step Output Schema
const EmailOutputSchema = z.object({
    subject: z.string().optional(),
    template: z.string().optional(),
    fromAddress: z.string(),
    fromName: z.string(),
    analysis: AnalysisSchema, // Full analysis context
    additionalContext: z.string().optional().describe('User behavior context (also available in analysis.additionalContext)'),
    includeLandingPage: z.boolean().optional(), // Pass explicit flag
});

// Final Output Schema
const OutputSchema = z.object({
    phishingId: z.string().optional(), // ID of the saved content in KV
    subject: z.string().optional(),
    template: z.string().optional(), // Renamed from bodyHtml for backend compatibility
    fromAddress: z.string(),
    fromName: z.string(),
    landingPage: z.object({
        name: z.string(),
        description: z.string(),
        method: z.enum(PHISHING.ATTACK_METHODS),
        difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS),
        pages: z.array(z.object({
            type: z.enum(LANDING_PAGE.PAGE_TYPES),
            template: z.string()
        }))
    }).optional(),
    analysis: AnalysisSchema.omit({ language: true, modelProvider: true, model: true }).optional(), // Include analysis in output for reasoning display
});

// --- Steps ---

// Step 1: Analyze Request & Design Scenario
const analyzeRequest = createStep({
    id: 'analyze-phishing-request',
    inputSchema: InputSchema,
    outputSchema: AnalysisSchema,
    execute: async ({ inputData }) => {
        const { topic, targetProfile, difficulty, language, method, includeLandingPage, includeEmail, additionalContext, modelProvider, model } = inputData;

        console.log('🎣 Starting phishing scenario analysis:', { topic, difficulty, language, method, includeLandingPage, includeEmail });

        const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

        const aiModel = getModelWithOverride(modelProvider, model);

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
   - **Auto-Detect (if missing):**
     - '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission): For scenarios requiring login, password reset, verification, payment, survey.
     - '${PHISHING.ATTACK_METHODS[0]}' (Click-Only): For scenarios requiring viewing a document, tracking a package, reading news, downloading a file.

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

**OUTPUT FORMAT:**
Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation, just JSON.

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
  "subjectLineStrategy": "Creates time pressure with 'URGENT' prefix and implies consequences for delay"
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
  "subjectLineStrategy": "Creates urgency with 'Your order is on hold' message"
}`;

        const userPrompt = `Design a phishing simulation scenario for SECURITY AWARENESS TRAINING based on this context:

**Training Topic:** ${topic || 'General Security Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language} (MUST use BCP-47 format like en-gb, tr-tr, de-de)
**Requested Method:** ${method || 'Auto-Detect'}
**Target Audience Profile:** ${JSON.stringify(targetProfile || {})}

Create a sophisticated blueprint for an educational phishing simulation email that will help employees learn to recognize and report phishing attacks.

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to protect organizations from real attackers.`;

        // Build messages array
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [
            { role: 'system', content: systemPrompt }
        ];

        // Add additionalContext as a separate message BEFORE the task prompt (index 1)
        // This way LLM sees the user behavior context first, then designs the scenario accordingly
        if (additionalContext) {
            messages.push({
                role: 'user',
                content: `🔴 USER BEHAVIOR ANALYSIS CONTEXT - Use this information to design a targeted phishing scenario:

${additionalContext}

**ACTION REQUIRED:** Use this behavioral analysis to inform your scenario design. Consider the user's risk level, strengths, growth areas, and recommended action plan when designing the phishing simulation. The scenario should be tailored to test and improve the specific vulnerabilities and behavioral patterns identified in this analysis.`
            });
        }

        // Add the main task prompt (after context, so LLM can adapt the scenario based on context)
        messages.push({ role: 'user', content: userPrompt });

        try {
            const response = await generateText({
                model: aiModel,
                messages,
                temperature: 0.7,
            });

            // Extract reasoning if available (Workers AI returns it)
            const reasoning = (response as any).response?.body?.reasoning;
            if (reasoning && inputData.writer) {
                console.log('🧠 Streaming scenario reasoning to frontend');
                // Directly stream the raw reasoning text without LLM processing
                await streamDirectReasoning(reasoning, inputData.writer);
            }

            console.log('✅ AI generated phishing scenario successfully');
            const cleanedJson = cleanResponse(response.text, 'phishing-analysis');
            const parsedResult = JSON.parse(cleanedJson);

            // Validate required fields
            if (!parsedResult.scenario || !parsedResult.category || !parsedResult.fromAddress || !parsedResult.method) {
                throw new Error('Missing required fields in analysis response');
            }

            // Log generated scenario for debugging
            console.log('🎯 Generated Scenario:');
            console.log('   Scenario:', parsedResult.scenario);
            console.log('   Category:', parsedResult.category);
            console.log('   Method:', parsedResult.method);
            console.log('   Sender:', parsedResult.fromName, `(${parsedResult.fromAddress})`);
            console.log('   Triggers:', parsedResult.psychologicalTriggers?.join(', '));

            return {
                ...parsedResult,
                additionalContext, // Pass through user behavior context
                difficulty,
                language,
                includeLandingPage,
                includeEmail,
                modelProvider,
                model,
                writer: inputData.writer,
            };
        } catch (error) {
            console.error('❌ Phishing analysis step failed:', error);
            throw new Error(`Phishing analysis workflow error: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
});

// Step 2: Generate Email Content
const generateEmail = createStep({
    id: 'generate-phishing-email',
    inputSchema: AnalysisSchema,
    outputSchema: EmailOutputSchema,
    execute: async ({ inputData }) => {
        const analysis = inputData;
        const { language, modelProvider, model, difficulty, includeEmail, includeLandingPage } = analysis;

        // If email generation is disabled, skip this step but pass context
        if (includeEmail === false) {
            console.log('🚫 Email generation disabled by user request. Skipping.');
            return {
                subject: undefined,
                template: undefined,
                fromAddress: analysis.fromAddress,
                fromName: analysis.fromName,
                analysis,
                includeLandingPage
            };
        }

        const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];

        console.log('📧 Starting phishing email content generation:', { scenario: analysis.scenario, language, method: analysis.method, difficulty });

        const aiModel = getModelWithOverride(modelProvider, model);

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
- Example: For e-commerce brands → "Your order is being prepared", package tracking, order confirmation style

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.
   - Maximum length: ${PHISHING_EMAIL.MAX_SUBJECT_LENGTH} characters.

2. **Body (HTML):**
   - MUST be fully responsive and compatible with **Outlook** and **Gmail**.
   - **CRITICAL:** Use **TABLE-BASED** layout (no <div> structure for main layout).
   - Use **INLINE CSS** for all styling (no <style> blocks).
   - Use web-safe fonts (Arial, sans-serif).
   - Avoid modern CSS like Flexbox or Grid (breaks in Outlook).
   - **MUST look professional and authentic** - like a real corporate/service email that users receive daily.
   - **MUST match the tone** specified in the blueprint exactly.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}

   - **LAYOUT STRATEGY (CHOOSE ONE BASED ON BRAND):**
     * **OPTION A: Transactional Card (Modern SaaS/Tech/Retail) - DEFAULT**
       - **DEFAULT CHOICE:** Use this format unless scenario is explicitly CEO/HR/Policy internal memo.
       - Background: Light gray (#f3f4f6) for entire email body.
       - Content: Inside a centered WHITE box (card) with rounded corners and shadow.
       - **CRITICAL:** Card format MUST have gray background (#f3f4f6) + white card box (#ffffff) with shadow.
       - Best for: "Reset Password", "Order Confirmation", "Security Alert", E-commerce, Tech brands.
     * **OPTION B: Corporate Letter (Bank/HR/Legal)**
       - Background: Full White (#ffffff).
       - Content: Left-aligned or simple centered structure. No "card" box.
       - Best for: "Policy Update", "CEO Message", "HR Announcement".

   - **PREHEADER (MANDATORY):**
     - Add a hidden <div> at the VERY TOP of the body containing a short summary (10-15 words) that appears in the inbox preview.
     - Style: display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;

   - **MOBILE OPTIMIZATION (MANDATORY):**
     - Main table width: 100% (max-width: 600px).
     - Buttons: **MUST be easily tappable on mobile** (min-height 44px) for optimal user experience.

3. **Call-to-Action (Button) Strategy - Based on Attack Method:**
   - **Method: '${analysis.method}'**
   - **If '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission):**
     - Button Text: "Verify Account", "Reset Password", "Login to View", "Update Payment".
     - Urgency: High. Imply account lockout or service interruption.
   - **If '${PHISHING.ATTACK_METHODS[0]}' (Click-Only):**
     - Button Text: "View Document", "Track Package", "Read Announcement", "See Photos".
     - Urgency: Low to Medium. Focus on curiosity or helpfulness.

4. **Dynamic Variables (Merge Tags) - STRICT PII RULES:**
   - **MANDATORY TAGS:** ${PHISHING_EMAIL.MANDATORY_TAGS.map(tag => `\`${tag}\``).join(', ')}, \`{FIRSTNAME}\` (or \`{FULLNAME}\`).
   - **ABSOLUTE BAN ON REAL NAMES:** NEVER use a real name (e.g., "Hi Gurkan", "Dear Peter") in the greeting. You MUST use \`{FIRSTNAME}\`.
   - **FORBIDDEN:** Do NOT use generic salutations like "Dear User", "Dear Employee", "Hi Team". You MUST use the merge tag.
   - **RECOMMENDED TAGS:** ${PHISHING_EMAIL.RECOMMENDED_TAGS.map(tag => `\`${tag}\``).join(', ')}
   - **CRITICAL RULES:**
     * ONLY use merge tags from the available list below - DO NOT invent new tags like {FROMTITLE} or {POSITION}
     * For links: Use {PHISHINGURL} ONLY in href attribute with ACTION TEXT (e.g. "Verify Account", "Click Here")
     * NEVER show URLs in visible text (no "Or visit: https://...", no "Go to: link.com") - ONLY use buttons/links with action text
   - **Available Tags:** ${PHISHING_EMAIL.MERGE_TAGS.map(tag => `"${tag}"`).join(', ')}

5. **Grammar & Style (${difficulty} Mode):**
   - **Grammar Rule:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}
   - **Red Flags:** **MUST embed the red flags** as defined in the blueprint. ${difficulty === 'Easy' ? 'For Easy mode, make them OBVIOUS and easily detectable. For Medium/Hard, make them subtle but detectable.' : difficulty === 'Hard' ? 'For Hard mode, make them EXTREMELY SUBTLE - only detectable by trained security professionals. They should blend naturally into the email.' : 'For Medium mode, make them MODERATELY SUBTLE - detectable with careful inspection but not immediately obvious.'}
   - **CREATIVITY RULE:** Do NOT use generic "lorem ipsum" style fillers. **MUST write specific, plausible, realistic content** directly relevant to the Scenario that feels authentic and genuine.
   - **SYNTAX RULE:** Use **SINGLE QUOTES** for HTML attributes (e.g. style='color:red') to prevent JSON escaping errors.

6. **Company Logo (MANDATORY - Always include a logo):**
   - **CRITICAL:** Every email MUST include a logo image.
   - **LOGO SELECTION RULES (STRICT):**
     * **ONLY IF impersonating a WELL-KNOWN, RECOGNIZED company with a REAL domain** (Microsoft, Google, Amazon, Apple, PayPal, Netflix, Adobe, etc.):
       - Use Clearbit API: https://logo.clearbit.com/[domain]
       - **CRITICAL:** Add an \`onerror\` handler to use Google Favicon service if Clearbit is blocked.
       - **CRITICAL:** All images MUST include \`object-fit: contain\` in style to preserve aspect ratio.
       - Example: <img src='https://logo.clearbit.com/amazon.com' onerror="this.src='https://www.google.com/s2/favicons?domain=amazon.com&sz=128'; this.onerror=null;" alt='Amazon' width='120' style='display:block; margin:0 auto 20px; object-fit: contain;'>
     * **IF NO recognized domain OR generic/internal company** (IT Support, HR Department, Finance Team, etc.):
       - **MUST USE DEFAULT GENERIC LOGO** (do NOT generate random Clearbit URLs for unknown domains):
       - Use this EXACT default logo: \`${DEFAULT_GENERIC_LOGO}\`
       - Example: <img src='${DEFAULT_GENERIC_LOGO}' alt='Company Logo' width='120' style='display:block; margin:0 auto 20px; object-fit: contain;'>
   - **FORBIDDEN:** Do NOT use Clearbit API for unknown, generic, or made-up domains. Only use it for real, well-known companies.

7. **NO DISCLAIMERS OR NOTES:**
   - **CRITICAL:** Do NOT include any footer notes, explanations, or disclaimers like "Note: This is a phishing link" or "Generated for training".
   - The output must be the RAW email content ONLY.
   - Any meta-commentary destroys the simulation.
   - The simulation platform adds these disclaimers automatically.

8. **EMAIL SIGNATURE RULES:**
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
  "template": "[Full HTML email with table layout, Clearbit logo, personalized greeting with {FIRSTNAME}, urgent message, call-to-action button with {PHISHINGURL}, and signature with department name]"
}

**CRITICAL:** Template MUST be complete HTML (not truncated). Use table-based layout with inline CSS. The email must be production-ready and fully functional.`;

        const userPrompt = `Write the phishing simulation email content based on this blueprint.
        
**🚨 CRITICAL CONTEXT (MUST FOLLOW):**
- **Language:** ${language || 'en'} (Output MUST be in this language)
- **Impersonating:** ${analysis.fromName} (Use authentic branding/tone)
- **Difficulty:** ${difficulty}

**SCENARIO BLUEPRINT (SOURCE OF TRUTH):**
${JSON.stringify(analysis, null, 2)}

**EXECUTION RULES (FOLLOW IN ORDER):**
1. **ANALYZE** the 'Blueprint' above - extract specific scenario details, exact tone, and all red flags that must be embedded.
2. **SELECT** the best **Layout Strategy** (Card vs Letter) based on the brand. **DEFAULT to Card format** unless explicitly CEO/HR/Policy scenario.
3. **GENERATE** the **Preheader** (hidden preview text) - 10-15 words that appear in inbox preview.
4. **WRITE** realistic, authentic email content that matches the brand's style and the blueprint's tone exactly.
5. **EMBED** red flags according to difficulty level (obvious for Easy, subtle for Medium/Hard).
6. **SAFETY RULE:** Do NOT use personal names (like "Emily Clarke") in the signature. Use generic Team/Department names only.
7. **OUTPUT** valid JSON with complete, production-ready HTML template.`;

        try {
            const response = await generateText({
                model: aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
            });

            // Extract reasoning if available (Workers AI returns it)
            const emailReasoning = (response as any).response?.body?.reasoning;
            if (emailReasoning && analysis.writer) {
                console.log('🧠 Streaming email generation reasoning to frontend');
                // Directly stream the raw reasoning text without LLM processing
                await streamDirectReasoning(emailReasoning, analysis.writer);
            }

            console.log('✅ AI generated phishing email content successfully');
            const cleanedJson = cleanResponse(response.text, 'phishing-email-content');
            const parsedResult = JSON.parse(cleanedJson);

            // Sanitize HTML content to fix quoting/escaping issues
            if (parsedResult.template) {
                let cleanedTemplate = sanitizeHtml(parsedResult.template);

                // Fix broken images with real HTTP validation (same as landing pages)
                cleanedTemplate = await fixBrokenImages(cleanedTemplate, analysis.fromName);

                parsedResult.template = cleanedTemplate;
            }

            // Validate required fields
            if (!parsedResult.subject || !parsedResult.template) {
                throw new Error('Missing required fields (subject or template) in email content response');
            }

            // Log generated content for debugging
            console.log('📧 Generated Email:');
            console.log('   Subject:', parsedResult.subject);
            console.log('   Template Preview (first 300 chars):', parsedResult.template);


            return {
                ...parsedResult,
                fromAddress: analysis.fromAddress,
                fromName: analysis.fromName,
                analysis: inputData, // Include the analysis in the final output for transparency
                additionalContext: analysis.additionalContext, // Also pass directly for easier access
                includeLandingPage: analysis.includeLandingPage
            };
        } catch (error) {
            console.error('❌ Phishing email generation step failed:', error);
            throw new Error(`Phishing email generation workflow error: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
});

// Step 3: Generate Landing Page
const generateLandingPage = createStep({
    id: 'generate-landing-page',
    inputSchema: EmailOutputSchema,
    outputSchema: OutputSchema,
    execute: async ({ inputData }) => {
        const { analysis, fromAddress, fromName, subject, template, includeLandingPage, additionalContext } = inputData;

        // If landing page generation is disabled, skip this step
        if (includeLandingPage === false) {
            console.log('🚫 Landing page generation disabled by user request. Skipping.');
            return {
                subject,
                template,
                fromAddress,
                fromName,
                analysis,
            };
        }

        if (!analysis) throw new Error('Analysis data missing from previous step');

        const { language, modelProvider, model, difficulty, method, scenario, name, description } = analysis;

        console.log('🌐 Starting landing page generation:', { method, difficulty });

        const aiModel = getModelWithOverride(modelProvider, model);

        // Detect industry for brand-appropriate design system
        const industryDesign = detectIndustry(fromName, scenario);
        console.log(`🎨 Detected industry: ${industryDesign.industry}`);

        // Determine required pages based on method
        const requiredPages = (LANDING_PAGE.FLOWS[method as keyof typeof LANDING_PAGE.FLOWS] || LANDING_PAGE.FLOWS['Click-Only']) as readonly string[];

        // Extract logo/brand info from email template if available
        let emailLogoInfo = '';
        let emailBrandContext = '';
        if (template) {
            // Extract first image src (usually the logo)
            const imgMatch = template.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
            if (imgMatch) {
                const logoUrl = imgMatch[1];
                emailLogoInfo = `\n**EMAIL LOGO:** Use this EXACT logo URL: ${logoUrl}\n<img src='${logoUrl}' alt='${fromName}' width='120' style='display: block; margin: 0 auto; object-fit: contain;' />`;
            }

            // Extract brand/company mentions from email
            const brandMatches = template.match(/(Microsoft|Google|Amazon|Apple|PayPal|Netflix|Spotify|Adobe|Salesforce|Stripe|Shopify|Meta|Facebook|Twitter|LinkedIn|Instagram|TikTok|YouTube|Hepsiburada|Trendyol|GittiGidiyor|N11|Amazon\.tr)/gi);
            if (brandMatches && brandMatches.length > 0) {
                const uniqueBrands = [...new Set(brandMatches.map(b => b.toLowerCase()))];
                emailBrandContext = `\n**EMAIL CONTEXT - BRAND MENTIONED:**\nThe email references: ${uniqueBrands.join(', ')}\n**CRITICAL:** Match the landing page design style to this brand's authentic look and feel.`;
            }
        }

        const systemPrompt = `You are a web developer creating realistic landing pages for ${fromName} (${industryDesign.industry} industry).${emailLogoInfo}${emailBrandContext}

Your job: generate modern, professional, trustworthy WEB PAGES (not emails) using ONLY pure HTML + inline CSS. No CSS frameworks.

**🔒 ZERO PII POLICY (STRICT):**
- **No Real Names:** Never display real user names (e.g. "Welcome, Gurkan").
- **Safe Greetings:** Use "Welcome back", "Hello", "Sign in", or show the email address (e.g. "user@company.com").

---

**CRITICAL RULES:**

1. **LOGO STRATEGY (MANDATORY - Always include a logo):**
   - **CRITICAL:** Every landing page MUST include a logo image.
   - **LOGO SELECTION RULES (STRICT):**
     * **ONLY IF impersonating a WELL-KNOWN, RECOGNIZED company with a REAL domain** (Microsoft, Google, Amazon, Apple, PayPal, Netflix, Adobe, etc.):
       - Use Clearbit Logo API: 'https://logo.clearbit.com/[domain]'
       - **MANDATORY:** Add \`onerror\` handler for reliability (Google Favicon fallback).
       - **CRITICAL:** All images MUST include \`object-fit: contain\` and \`display: block; margin: 0 auto;\` in style to preserve aspect ratio and center alignment.
       - Example: <img src='https://logo.clearbit.com/microsoft.com' onerror="this.src='https://www.google.com/s2/favicons?domain=microsoft.com&sz=128'; this.onerror=null;" alt='Microsoft' width='120' style='display: block; margin: 0 auto; object-fit: contain;' />
     * **IF NO recognized domain OR generic/internal company** (IT Support, HR Department, Finance Team, etc.):
       - **MUST USE DEFAULT GENERIC LOGO** (do NOT generate random Clearbit URLs for unknown domains):
       - Use this EXACT default logo: \`${DEFAULT_GENERIC_LOGO}\`
       - Example: <img src='${DEFAULT_GENERIC_LOGO}' alt='Company Logo' width='120' style='display: block; margin: 0 auto; object-fit: contain;' />
   - **FORBIDDEN:** 
     - Do NOT use Clearbit API for unknown, generic, or made-up domains. Only use it for real, well-known companies.
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

6. **LAYOUT STRATEGY (AI MUST CHOOSE ONE):**
   You must vary the layout structure. Choose either OPTION A (Centered) or OPTION B (Split) based on what fits the brand best.

   **OPTION A: CENTERED CARD (Classic, like Google/Apple)**
   - The body behaves as a viewport container.
   - **CRITICAL:** Use \`display: flex; align-items: center; justify-content: center;\` on the BODY tag.
   - Use this exact pattern:
     <body style='
       min-height: 100vh;
       margin: 0;
       padding: 24px;
       display: flex;
       align-items: center;
       justify-content: center;
       background: #f3f4f6;
       font-family: system-ui, -apple-system, sans-serif;
     '>
       <div style='width: 100%; max-width: 420px; margin: auto;'>
          <!-- Logo, then Card, then Footer -->
       </div>
     </body>

   **OPTION B: SPLIT SCREEN (Enterprise, like Microsoft/Adobe/SaaS)**
   - Screen is split 50/50 or 40/60.
   - One side is Brand/Color, other side is Form.
   - MUST use \`flex-wrap: wrap\` so it stacks vertically on mobile.
   - Use this pattern:
     <body style='min-height: 100vh; margin: 0; display: flex; flex-wrap: wrap; font-family: system-ui, -apple-system, sans-serif;'>
       <!-- Brand Panel (Left or Right) -->
       <div style='
         flex: 1;
         min-width: 350px; /* Stacks on mobile */
         background-color: ${industryDesign.colors.primary};
         padding: 40px;
         display: flex;
         flex-direction: column;
         justify-content: center;
         color: white;
       '>
         <!-- Big Logo, Welcome Text, or Quote here -->
       </div>

       <!-- Form Panel -->
       <div style='
         flex: 1;
         min-width: 350px; /* Stacks on mobile */
         background: white;
         display: flex;
         align-items: center;
         justify-content: center;
         padding: 24px;
       '>
         <div style='width: 100%; max-width: 400px;'>
           <!-- Logo (optional if on brand panel), Form, Footer -->
         </div>
       </div>
     </body>

   **IMPORTANT:** If you choose OPTION B (Split), the "Card" container style (\`box-shadow\`, \`border\`) is usually NOT needed around the form, as the white background serves as the container. Adjust accordingly.

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
   - Small row under the button, with an icon + text.
   - Example:
     <div style='margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #6b7280;'>
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
         <a href='#' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
         <span>•</span>
         <a href='#' style='color: #9ca3af; text-decoration: none;'>Terms</a>
         <span>•</span>
         <a href='#' style='color: #9ca3af; text-decoration: none;'>Support</a>
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

**LOGIN TEMPLATE EXAMPLE (STRUCTURE TO FOLLOW):**

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
      <img src='https://logo.clearbit.com/[domain]' alt='${fromName}' style='display: block; margin: 0 auto 16px auto; height: 48px; object-fit: contain;' />
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
        <a href='#' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
        <span>•</span>
        <a href='#' style='color: #9ca3af; text-decoration: none;'>Terms</a>
        <span>•</span>
        <a href='#' style='color: #9ca3af; text-decoration: none;'>Support</a>
      </div>
    </div>
  </div>
</body>
</html>

**LOGIN VALIDATION:**
- [ ] Body uses flex center and background.
- [ ] Wrapper uses flex-direction: column, so footer is BELOW the card.
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

**SUCCESS TEMPLATE EXAMPLE:**

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
    </div>

    <div style='
      margin-top: 32px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    '>
      <p style='margin: 0;'>© 2025 ${fromName}. All rights reserved.</p>
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

**INFO TEMPLATE EXAMPLE:**

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
          <img src='https://logo.clearbit.com/[domain]' alt='${fromName}' style='display: block; margin: 0 auto; height: 36px; object-fit: contain;' />
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
    </div>
  </div>
</body>
</html>
` : ''}

---

**TECHNICAL CONSTRAINTS:**
1. **Single File per Page:** Each \`template\` must be a complete HTML document as shown above.
2. **Assets:** Use ONLY public CDN-hosted images (Clearbit logos, neutral icons). No local files.
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




        // Build messages array with multi-message pattern for targeted context
        const messages: any[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Add user behavior context FIRST (before email context) so landing page design is informed by user analysis
        // This ensures the page is tailored to the user's vulnerabilities, risk level, and behavioral patterns
        // Use direct additionalContext if available, otherwise fall back to analysis.additionalContext
        const userContext = additionalContext || analysis.additionalContext;
        if (userContext) {
            messages.push({
                role: 'user',
                content: `🔴 USER BEHAVIOR ANALYSIS CONTEXT - Design landing page based on this user profile:

${userContext}

**ACTION REQUIRED:** Use this behavioral analysis to inform your landing page design. Consider the user's risk level, strengths, growth areas, and behavioral triggers when creating the page. The design must feel genuine, trustworthy, and specifically tailored to this user's profile. Make it look like a legitimate, professional page that this specific user would naturally trust and interact with based on their identified vulnerabilities and patterns.`
            });
        }

        // Add email context as separate message (for logo/brand consistency)
        if (template && (emailLogoInfo || emailBrandContext)) {
            messages.push({
                role: 'user',
                content: `📧 PHISHING EMAIL CONTEXT (for landing page consistency):

**Email Subject:** ${subject || 'N/A'}
**From:** ${fromName} <${fromAddress}>

**CRITICAL:** The landing pages MUST match the branding and style used in the phishing email above. Use the SAME logo, colors, and design language to maintain consistency. Users clicking from the email should see a seamless transition to the landing page.

${emailLogoInfo ? `\n${emailLogoInfo}` : ''}
${emailBrandContext ? `\n${emailBrandContext}` : ''}

**Email Preview (first 500 chars):** ${template.substring(0, 500)}...`
            });
        }

        // Add main generation request
        const userPrompt = `Design landing pages for: ${fromName} - ${scenario}

**SCENARIO:** ${scenario}
**LANGUAGE:** ${language}

Create modern, professional pages that match ${industryDesign.industry} standards. Make them look authentic and realistic for ${fromName}.

**GENERATION STEPS (Follow this order):**
1. **Plan first:** Review checklist above, decide on colors, layout, spacing
2. **Match email branding:** Use SAME logo, colors, and style from phishing email (if provided)
3. **Generate HTML:** Create complete, valid HTML with all required elements
4. **Validate:** Check output validation list before returning
5. **Ensure variation:** If multiple pages, make them related but NOT identical

**REMEMBER:**
- **LOGO IS MANDATORY:** Use Clearbit API ONLY for recognized well-known companies. For generic/internal companies, use the default generic logo. If email had a logo, match it exactly.
- Add natural design variations (don't make all pages identical)
- Ensure login page is properly centered with inline styles: \`min-height: 100vh; display: flex; align-items: center; justify-content: center;\`
- Card MUST have generous internal padding (32px+)
- Button MUST contrast with card background (NOT same color!)`;

        messages.push({
            role: 'user',
            content: userPrompt
        });

        try {
            const response = await generateText({
                model: aiModel,
                messages: messages,
                temperature: 0.8,
            });

            // Reasoning handling
            const lpReasoning = (response as any).response?.body?.reasoning;
            if (lpReasoning && analysis.writer) {
                await streamDirectReasoning(lpReasoning, analysis.writer);
            }

            const cleanedJson = cleanResponse(response.text, 'landing-page');
            const parsedResult = JSON.parse(cleanedJson);

            // Sanitize HTML, fix broken images, and validate for all pages
            if (parsedResult.pages && Array.isArray(parsedResult.pages)) {
                parsedResult.pages = await Promise.all(
                    parsedResult.pages.map(async (page: any) => {
                        // Step 1: Sanitize HTML
                        let cleanedTemplate = sanitizeHtml(page.template);

                        // Step 2: Fix broken images with real HTTP validation
                        cleanedTemplate = await fixBrokenImages(cleanedTemplate, fromName);

                        // Step 3: Validate HTML structure and required elements
                        const validationResult = validateLandingPage(cleanedTemplate, page.type);
                        logValidationResults(validationResult, page.type);

                        // If validation fails due to CSS patterns, log but continue
                        // (We've already tried our best with explicit negative examples)
                        if (!validationResult.isValid) {
                            console.error(`⚠️ ${page.type} page validation failed:`);
                            validationResult.errors.forEach(err => console.error(`   - ${err}`));
                            console.error(`   Continuing with current output (LLM ignored constraints)...`);
                        }

                        return {
                            ...page,
                            template: cleanedTemplate
                        };
                    })
                );
            }

            return {
                subject,
                template,
                fromAddress,
                fromName,
                analysis: analysis,
                landingPage: {
                    name: name,
                    description: description,
                    method: method as any,
                    difficulty: difficulty as any,
                    pages: parsedResult.pages
                }
            };
        } catch (error) {
            console.error('❌ Landing page generation failed:', error);
            throw error;
        }
    }
});

// Step 4: Save to KV
const savePhishingContent = createStep({
    id: 'save-phishing-content',
    inputSchema: OutputSchema, // Use OutputSchema directly as input
    outputSchema: OutputSchema,
    execute: async ({ inputData }) => {
        const phishingId = uuidv4();
        const language = 'en-gb'; // Default language for phishing content

        console.log(`💾 Saving phishing content to KV... (ID: ${phishingId})`);

        // Initialize KVService with Phishing Namespace ID (Hardcoded for now)
        const kvService = new KVService('f6609d79aa2642a99584b05c64ecaa9f');

        // Save Base (Meta)
        await kvService.savePhishingBase(phishingId, inputData, language);

        // Save Email Content (if exists)
        if (inputData.template) {
            await kvService.savePhishingEmail(phishingId, inputData, language);
        }

        // Save Landing Page Content (if exists)
        if (inputData.landingPage) {
            await kvService.savePhishingLandingPage(phishingId, inputData, language);
        }

        return {
            ...inputData,
            phishingId
        };
    }
});

// --- Workflow Definition ---

const createPhishingWorkflow = createWorkflow({
    id: 'create-phishing-workflow',
    description: 'Generate realistic phishing email simulations',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
})
    .then(analyzeRequest)
    .then(generateEmail)
    .then(generateLandingPage)
    .then(savePhishingContent);

createPhishingWorkflow.commit();

export { createPhishingWorkflow };
