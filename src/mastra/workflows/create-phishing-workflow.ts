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
            description: "Simple layout. Use generic icons instead of brand logos. High contrast colors."
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
        simulationLink: z.string(),
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
        const { topic, targetProfile, difficulty, language, method, includeLandingPage, includeEmail, modelProvider, model } = inputData;

        console.log('🎣 Starting phishing scenario analysis:', { topic, difficulty, language, method, includeLandingPage, includeEmail });

        const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

        const aiModel = getModelWithOverride(modelProvider, model);

        const systemPrompt = `You are an expert Social Engineering Architect and Cyber Psychologist working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are designing phishing simulations for corporate security awareness training to help employees recognize and avoid real phishing attacks. This is a defensive security measure to protect organizations from cybercrime.

**YOUR ROLE:**
Design highly realistic phishing simulation scenarios for cybersecurity training.

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

4. **Difficulty Adjustment (STRICT RULES for '${difficulty}'):**
   - **Sender Logic:** ${difficultyRules.sender.rule}. (Examples: ${difficultyRules.sender.examples.join(', ')} - **DO NOT COPY these exact examples. INVENT NEW ONES matching this pattern**).
   - **Urgency/Tone:** ${difficultyRules.urgency.rule}. ${difficultyRules.urgency.description}.
   - **Complexity:** ${difficulty === 'Easy' ? 'Simple, obvious logic.' : difficulty === 'Hard' ? 'Complex, layered social engineering.' : 'Standard business logic.'}
   - **VARIATION RULE:** Ensure every scenario is unique. Change names, company types, and pretext stories even if the Topic is the same.

5. **Red Flag Strategy:**
   - Define 3-4 specific red flags appropriate for the difficulty level (${difficulty}).

**OUTPUT FORMAT:**
Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation, just JSON.

**EXAMPLE OUTPUT:**
{
  "scenario": "CEO Urgent Wire Transfer",
  "name": "CEO Fraud - Urgent Transfer",
  "description": "Simulates a request from the CEO asking for an immediate wire transfer, testing authority bias.",
  "category": "Financial Fraud",
  "method": "Data-Submission",
  "psychologicalTriggers": ["Authority", "Urgency", "Fear"],
  "tone": "Urgent",
  "fromName": "John Smith",
  "fromAddress": "j.smith@companay.com",
  "keyRedFlags": ["Misspelled domain (companay.com)", "Unusual urgency", "Request to bypass procedures", "External email marked as internal"],
  "targetAudienceAnalysis": "Finance team members are targeted due to their access to wire transfer systems and tendency to comply with executive requests",
  "subjectLineStrategy": "Creates time pressure with 'URGENT' prefix and implies consequences for delay"
}`;

        const userPrompt = `Design a phishing simulation scenario for SECURITY AWARENESS TRAINING based on this context:

**Training Topic:** ${topic || 'General Security Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language} (MUST use BCP-47 format like en-gb, tr-tr, de-de)
**Requested Method:** ${method || 'Auto-Detect'}
**Target Audience Profile:** ${JSON.stringify(targetProfile || {})}

Create a sophisticated blueprint for an educational phishing simulation email that will help employees learn to recognize and report phishing attacks.

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to protect organizations from real attackers.`;

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
   - Make it look professional (like a real corporate/service email).
   - Match the tone specified in the blueprint.
   - **VISUAL DIFFICULTY RULE (${difficulty}):** ${difficultyRules.visuals.rule}. ${difficultyRules.visuals.description}

3. **Call-to-Action (Button) Strategy - Based on Attack Method:**
   - **Method: '${analysis.method}'**
   - **If '${PHISHING.ATTACK_METHODS[1]}' (Data-Submission):**
     - Button Text: "Verify Account", "Reset Password", "Login to View", "Update Payment".
     - Urgency: High. Imply account lockout or service interruption.
   - **If '${PHISHING.ATTACK_METHODS[0]}' (Click-Only):**
     - Button Text: "View Document", "Track Package", "Read Announcement", "See Photos".
     - Urgency: Low to Medium. Focus on curiosity or helpfulness.

4. **Dynamic Variables (Merge Tags):**
   - **MANDATORY TAGS:** ${PHISHING_EMAIL.MANDATORY_TAGS.map(tag => `\`${tag}\``).join(', ')}, \`{FIRSTNAME}\` (or \`{FULLNAME}\`) - MUST be used for salutation.
   - **FORBIDDEN:** Do NOT use generic salutations like "Dear User", "Dear Employee", "Hi Team". You MUST use the merge tag.
   - **RECOMMENDED TAGS:** ${PHISHING_EMAIL.RECOMMENDED_TAGS.map(tag => `\`${tag}\``).join(', ')}
   - **CRITICAL RULES:**
     * ONLY use merge tags from the available list below - DO NOT invent new tags like {FROMTITLE} or {POSITION}
     * For links: Use {PHISHINGURL} ONLY in href attribute with ACTION TEXT (e.g. "Verify Account", "Click Here")
     * NEVER show URLs in visible text (no "Or visit: https://...", no "Go to: link.com") - ONLY use buttons/links with action text
   - **Available Tags:** ${PHISHING_EMAIL.MERGE_TAGS.map(tag => `"${tag}"`).join(', ')}

5. **Grammar & Style (${difficulty} Mode):**
   - **Grammar Rule:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}
   - **Red Flags:** Embed the red flags subtly as defined in the blueprint.
   - **CREATIVITY RULE:** Do NOT use generic "lorem ipsum" style fillers. Write specific, plausible content relevant to the Scenario.
   - **SYNTAX RULE:** Use **SINGLE QUOTES** for HTML attributes (e.g. style='color:red') to prevent JSON escaping errors.

6. **Company Logo (OPTIONAL):**
   - If impersonating a well-known company (Microsoft, Google, Amazon, Apple, PayPal, etc.):
     * Add company logo using public CDN URL (Wikimedia Commons, official press kits)
     * Place at top of email with centered alignment
     * Use reasonable size (100-150px width)
     * Example: <img src='https://upload.wikimedia.org/wikipedia/commons/...' alt='Microsoft' width='120' style='display:block; margin:0 auto 20px;'>
   - If generic/unknown company: Skip logo (no placeholder, no fake logo)

7. **NO DISCLAIMERS OR NOTES:**
   - **CRITICAL:** Do NOT include any footer notes, explanations, or disclaimers like "Note: This is a phishing link" or "Generated for training".
   - The output must be the RAW email content ONLY.
   - Any meta-commentary destroys the simulation.
   - The simulation platform adds these disclaimers automatically.

**OUTPUT FORMAT:**
Return ONLY valid JSON with subject and template (HTML body). No markdown, no backticks, no explanation, just JSON.

**EXAMPLE OUTPUT (with Microsoft impersonation):**
{
  "subject": "Microsoft Security Alert - Verify Your Account",
  "template": "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='font-family: Arial, sans-serif; background-color:#f4f4f4;'><tr><td align='center' style='padding:20px;'><table width='600' cellpadding='0' cellspacing='0' border='0' style='background-color:#ffffff; border:1px solid #dddddd;'><tr><td style='padding:20px;'><img src='https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' alt='Microsoft' width='120' style='display:block; margin:0 auto 20px;'><p style='margin:0 0 15px 0;'>Hi {FIRSTNAME},</p><p style='margin:0 0 15px 0;'>We detected unusual activity on your Microsoft account. For your security, please verify your account within 24 hours to prevent suspension.</p><p style='margin:0 0 15px 0; text-align:center;'><a href='{PHISHINGURL}' style='background-color:#0078d4; color:#ffffff; padding:12px 20px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block;'>VERIFY ACCOUNT</a></p><p style='margin:0 0 15px 0; color:#999999; font-size:12px;'>This is an automated message from Microsoft Security.</p><p style='margin:0;'>Best regards,<br>Microsoft Account Team<br>security@microsoft.com</p></td></tr></table></td></tr></table>"
}`;

        const userPrompt = `Write the phishing simulation email content for this SECURITY AWARENESS TRAINING scenario:

**Training Language:** ${language || 'en'}
**Email Tone:** ${analysis.tone}
**Attack Method:** ${analysis.method} (Adjust Call-to-Action accordingly)
**Difficulty Level:** ${difficulty} (Apply strict Grammar and Visual rules)
**Educational Red Flags to Include:** ${analysis.keyRedFlags.join(', ')}

**Scenario Blueprint:**
${JSON.stringify(analysis, null, 2)}

Create realistic email content that will effectively teach employees how to spot phishing attempts.

Remember: This is for DEFENSIVE CYBERSECURITY TRAINING to help organizations defend against real phishing attacks.`;

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
        const { analysis, fromAddress, fromName, subject, template, includeLandingPage } = inputData;

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
        const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];

        console.log('🌐 Starting landing page generation:', { method, difficulty });

        const aiModel = getModelWithOverride(modelProvider, model);

        // Detect industry for brand-appropriate design system
        const industryDesign = detectIndustry(fromName, scenario);
        console.log(`🎨 Detected industry: ${industryDesign.industry}`);

        // Determine required pages based on method
        const requiredPages = (LANDING_PAGE.FLOWS[method as keyof typeof LANDING_PAGE.FLOWS] || LANDING_PAGE.FLOWS['Click-Only']) as readonly string[];

        const systemPrompt = `You are a web developer creating realistic landing pages for ${fromName} (${industryDesign.industry} industry).

**CRITICAL RULES:**
1. **NO BROKEN IMAGES:** Use ONLY working logo URLs or create text-based logos
   - Valid options: https://via.placeholder.com/150x50?text=LOGO or simple text/SVG
   - If using image, test URL is valid
   - Better to use text logo than broken image
2. **SINGLE QUOTES for all HTML attributes** (required for JSON)
3. **Full HTML structure:** <!DOCTYPE html>, <head>, <body>
4. **Include Tailwind CDN:** <script src='https://cdn.tailwindcss.com'></script>

**DESIGN STYLE:**
Create SIMPLE, CLEAN web pages - like real company login pages from 2020-2024.

**❌ FORBIDDEN PATTERNS (DO NOT USE):**
- ❌ \`min-h-screen flex items-center justify-center\` (centered card layout)
- ❌ \`shadow-2xl\` or \`rounded-3xl\` (overly fancy styling)
- ❌ \`bg-gradient-to-br from-blue-500 via-purple-500\` (colorful gradient backgrounds)
- ❌ \`backdrop-blur\` (glassmorphism effects)
- ❌ Floating centered cards on gradient backgrounds

**✅ CORRECT APPROACH:**
- ✅ Normal document flow (top to bottom)
- ✅ White or light gray \`bg-gray-50\` background
- ✅ Content container: \`<div class='max-w-md mx-auto py-12 px-4'>\`
- ✅ Simple shadows: \`shadow-md\` or \`shadow-lg\` max
- ✅ Normal borders: \`rounded-lg\` or \`rounded-xl\` max

**BRAND COLORS (${industryDesign.industry}):**
- Primary: ${industryDesign.colors.primary}
- Secondary: ${industryDesign.colors.secondary}
- Accent: ${industryDesign.colors.accent}

**LAYOUT:**
- Normal web page (NOT centered card on gradient)
- Centered content container (max-w-md mx-auto for forms)
- Clean white or light gray background
- Logo/brand at top, content in middle, footer at bottom
- Professional spacing (py-8, px-4)

**LOGO OPTIONS (choose best):**
1. Text-based: <div class='text-2xl font-bold text-gray-900'>${fromName}</div>
2. Placeholder: <img src='https://via.placeholder.com/150x50/4285f4/ffffff?text=${fromName.replace(/\s/g, '+')}' alt='${fromName}' />
3. SVG icon with text

**DIFFICULTY - ${difficulty}:**
${difficulty === 'Easy' ? '- Basic styling, generic look' : ''}
${difficulty === 'Medium' ? '- Professional but not perfect' : ''}
${difficulty === 'Hard' ? '- Looks exactly like real ${fromName} page' : ''}

Create each page according to requirements below.

**CRITICAL JSON SYNTAX RULE:**
- Inside the \`template\` string, use **SINGLE QUOTES** for all HTML attributes to avoid JSON escaping errors.

**PAGES TO GENERATE:**

${requiredPages.includes('login') ? `
---
### 1. LOGIN PAGE (login)

Create a simple, professional login page for ${fromName}.

**LAYOUT:**
- Logo/brand name at top (use text or valid placeholder image - NO broken images!)
- Login form centered (max-w-md mx-auto)
- Clean white/light gray background
- Footer at bottom

**FORM ELEMENTS:**
- Email input with label
- Password input with label
- "Remember me" checkbox
- "Forgot password?" link
- Submit button (use ${industryDesign.colors.primary} color)
- Hidden input: \`<input type='hidden' name='trackId' value='${LANDING_PAGE.PLACEHOLDERS.TRACK_ID}' />\`

**STYLE:**
- Clean, simple design
- Professional spacing (py-8, px-4)
- Normal web page (NOT floating card)
` : ''}

${requiredPages.includes('success') ? `
---
### 2. SUCCESS PAGE (success)

Simple success confirmation page.

**CRITICAL: Use this EXACT layout pattern:**
\`\`\`html
<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.tailwindcss.com'></script>
</head>
<body class='bg-gray-50'>
  <div class='max-w-md mx-auto py-16 px-6 text-center'>

    <!-- Success Icon -->
    <div class='w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6'>
      <svg class='w-10 h-10 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M5 13l4 4L19 7'></path>
      </svg>
    </div>

    <!-- Message -->
    <h1 class='text-2xl font-bold text-gray-900 mb-3'>Account Updated Successfully</h1>
    <p class='text-gray-600 mb-8'>Your account information has been securely updated. If you did not make this change, please contact our support immediately.</p>

    <!-- Footer -->
    <p class='text-sm text-gray-500 mt-12'>© 2025 ${fromName}. All rights reserved.</p>
  </div>
</body>
</html>
\`\`\`

**IMPORTANT:**
- Use \`bg-gray-50\` body background (NOT gradient)
- Use \`max-w-md mx-auto py-16 px-6\` for content (NOT min-h-screen flex center)
- Use simple \`bg-green-500 rounded-full\` for icon (NOT shadow-2xl or fancy effects)
` : ''}

${requiredPages.includes('info') ? `
---
### 3. INFO/DOCUMENT PAGE (info)

Information or document page for click-only scenarios.

**LAYOUT:**
- Document icon at top
- Page title (e.g., "Policy Update")
- Brief text explaining the document
- Action button(s)
- Footer with metadata

**STYLE:**
- Clean, simple page
- Center content (max-w-2xl mx-auto for wider text)
- Use ${industryDesign.colors.primary} for buttons
- Professional spacing
` : ''}

**TECHNICAL CONSTRAINTS:**
1. **Single File:** All HTML, Scripts in one string.
2. **Assets:** Use ONLY public CDN images.
3. **STRICT PAGE COUNT:** Generate ONLY the pages listed above. If only 'info' is requested, DO NOT generate 'login'.
4. **NO DISCLAIMERS:** Do NOT add any text like "Note: This link uses a look-alike domain". The output must be ONLY the mockup HTML.

**OUTPUT FORMAT:**
Return JSON:
{
  "pages": [
    { "type": "login", "template": "..." },
    { "type": "success", "template": "..." },
    { "type": "info", "template": "..." }
  ],
  "simulationLink": "${LANDING_PAGE.PLACEHOLDERS.SIMULATION_LINK}"
}
`;

        const userPrompt = `Design landing pages for: ${fromName} - ${scenario}

**SCENARIO:** ${scenario}
**LANGUAGE:** ${language}

Create modern, professional pages that match ${industryDesign.industry} standards. Make them look authentic and realistic for ${fromName}.`;

        // Build messages array with multi-message pattern for targeted context
        const messages: any[] = [
            { role: 'system', content: systemPrompt }
        ];

        // If user vulnerability context exists, add dedicated message (consistent with scenes/inbox pattern)
        if (analysis.additionalContext) {
            messages.push({
                role: 'user',
                content: `🔴 CRITICAL USER VULNERABILITY - Targeted Landing Page Context:

${analysis.additionalContext}

This context should inform the landing page design choices to make it more convincing to this specific user profile.`
            });
        }

        // Add main generation request
        messages.push({
            role: 'user',
            content: userPrompt
        });

        try {
            const response = await generateText({
                model: aiModel,
                messages: messages,
                temperature: 0.7,
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
                    simulationLink: parsedResult.simulationLink || LANDING_PAGE.PLACEHOLDERS.SIMULATION_LINK,
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
