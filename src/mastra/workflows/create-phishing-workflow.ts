import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { v4 as uuidv4 } from 'uuid';
import { PHISHING } from '../constants';

// Helper to stream text reasoning directly without LLM processing
const streamDirectReasoning = async (reasoning: string, writer: any) => {
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
    language: z.string().default('en'),
    // Landing Page param removed for now to focus on Email first
    modelProvider: z.string().optional(),
    model: z.string().optional(),
    writer: z.any().optional().describe('Stream writer for reasoning updates'),
});

// Enhanced Analysis Schema (The Blueprint)
const AnalysisSchema = z.object({
    scenario: z.string().describe('The specific scenario chosen (e.g. CEO Fraud, IT Update, HR Policy)'),
    category: z.string().describe('Phishing category: Credential Harvesting, Malware, Financial Fraud, etc.'),
    psychologicalTriggers: z.array(z.string()).describe('Triggers used: Authority, Urgency, Fear, Greed, Curiosity, Helpfulness'),
    tone: z.string().describe('Email tone: Formal, Urgent, Friendly, Threatening, etc.'),
    senderPersona: z.object({
        name: z.string(),
        title: z.string(),
        email: z.string(),
        organization: z.string().optional(),
    }),
    keyRedFlags: z.array(z.string()).describe('List of subtle indicators (red flags) to educate the user'),
    targetAudienceAnalysis: z.string().describe('Brief explanation of why this scenario fits the target profile'),
    subjectLineStrategy: z.string().describe('Reasoning behind the subject line choice'),
    reasoning: z.string().optional().describe('AI reasoning about scenario design (if available)'),
    emailGenerationReasoning: z.string().optional().describe('AI reasoning about email content generation (if available)'),
    // Passthrough fields
    language: z.string().optional(),
    modelProvider: z.string().optional(),
    model: z.string().optional(),
    writer: z.any().optional(),
});

// Final Output Schema
const OutputSchema = z.object({
    subject: z.string(),
    bodyHtml: z.string(),
    analysis: AnalysisSchema.omit({ language: true, modelProvider: true, model: true }).optional(), // Include analysis in output for reasoning display
});

// --- Steps ---

// Step 1: Analyze Request & Design Scenario
const analyzeRequest = createStep({
    id: 'analyze-phishing-request',
    inputSchema: InputSchema,
    outputSchema: AnalysisSchema,
    execute: async ({ inputData }) => {
        const { topic, targetProfile, difficulty, language, modelProvider, model } = inputData;

        console.log('🎣 Starting phishing scenario analysis:', { topic, difficulty, language });

        const aiModel = getModelWithOverride(modelProvider, model);

        const systemPrompt = `You are an expert Social Engineering Architect and Cyber Psychologist working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are designing phishing simulations for corporate security awareness training to help employees recognize and avoid real phishing attacks. This is a defensive security measure to protect organizations from cybercrime.

**YOUR ROLE:**
Design highly realistic phishing simulation scenarios for cybersecurity training.

**DECISION LOGIC (ADAPTIVE MODE):**

1. **Profile Analysis (IF Profile Exists):**
   - Use known 'behavioralTriggers' (e.g. Authority -> CEO Fraud).
   - Use 'department' context (Finance -> Invoice Fraud, IT -> VPN Update).

2. **Creative Invention (IF Profile is MISSING/EMPTY):**
   - **INVENT a plausible target persona** based on the Topic.
   - Example: If Topic is "Payroll", assume Target is an Employee, trigger is "Greed/Curiosity".
   - Example: If Topic is "General", pick a universal theme like "Password Expiry" or "Storage Full".
   - **Do NOT fail** if profile is missing. Create the most effective scenario for the given Topic/Difficulty.

3. **Difficulty Adjustment:**
   - **Easy:** Obvious errors, generic greeting, public domain email (gmail.com), high urgency.
   - **Medium:** Spoofed internal domain (typo-squatting), specific context, moderate urgency.
   - **Hard:** Contextually accurate, personalized (Spear Phishing), subtle domain mismatch, low urgency/high importance.

4. **Red Flag Strategy:**
   - Define 3-4 specific red flags appropriate for the difficulty level.

**OUTPUT FORMAT:**
Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation, just JSON.

**EXAMPLE OUTPUT:**
{
  "scenario": "CEO Urgent Wire Transfer",
  "category": "Financial Fraud",
  "psychologicalTriggers": ["Authority", "Urgency", "Fear"],
  "tone": "Urgent",
  "senderPersona": {
    "name": "John Smith",
    "title": "CEO",
    "email": "j.smith@companay.com",
    "organization": "TechCorp"
  },
  "keyRedFlags": ["Misspelled domain (companay.com)", "Unusual urgency", "Request to bypass procedures", "External email marked as internal"],
  "targetAudienceAnalysis": "Finance team members are targeted due to their access to wire transfer systems and tendency to comply with executive requests",
  "subjectLineStrategy": "Creates time pressure with 'URGENT' prefix and implies consequences for delay"
}`;

        const userPrompt = `Design a phishing simulation scenario for SECURITY AWARENESS TRAINING based on this context:

**Training Topic:** ${topic || 'General Security Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language}
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
            if (!parsedResult.scenario || !parsedResult.category || !parsedResult.senderPersona) {
                throw new Error('Missing required fields in analysis response');
            }

            // Log generated scenario for debugging
            console.log('🎯 Generated Scenario:');
            console.log('   Scenario:', parsedResult.scenario);
            console.log('   Category:', parsedResult.category);
            console.log('   Sender:', parsedResult.senderPersona?.name, `(${parsedResult.senderPersona?.email})`);
            console.log('   Triggers:', parsedResult.psychologicalTriggers?.join(', '));

            return {
                ...parsedResult,
                language,
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
    outputSchema: OutputSchema,
    execute: async ({ inputData }) => {
        const analysis = inputData;
        const { language, modelProvider, model } = analysis;

        console.log('📧 Starting phishing email content generation:', { scenario: analysis.scenario, language });

        const aiModel = getModelWithOverride(modelProvider, model);

        const systemPrompt = `You are a Phishing Content Generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise. You are creating phishing simulation emails for corporate security awareness training programs. These emails are used in controlled environments to teach employees how to identify and report phishing attempts. This is a defensive security tool to protect organizations from real cybercriminals.

**YOUR ROLE:**
Write realistic phishing email content based on provided scenario blueprints for cybersecurity training.

**CONTENT REQUIREMENTS:**

1. **Subject Line:**
   - Catchy and relevant to the blueprint strategy.

2. **Body (HTML):**
   - MUST be fully responsive and compatible with **Outlook** and **Gmail**.
   - **CRITICAL:** Use **TABLE-BASED** layout (no <div> structure for main layout).
   - Use **INLINE CSS** for all styling (no <style> blocks).
   - Use web-safe fonts (Arial, sans-serif).
   - Avoid modern CSS like Flexbox or Grid (breaks in Outlook).
   - Make it look professional (like a real corporate/service email).
   - Match the tone specified in the blueprint.

3. **Dynamic Variables (Merge Tags):**
   - **MANDATORY:** You MUST use \`{PHISHINGURL}\` for the main Call-to-Action (Link/Button).
   - **HIGHLY RECOMMENDED:** Use \`{FIRSTNAME}\` for greetings (e.g. "Hi {FIRSTNAME},") to increase realism.
   - **CONTEXTUAL:** Use \`{COMPANYNAME}\` if it's an internal email or \`{CURRENT_DATE}\` for timestamps.
   - **CRITICAL RULES:**
     * ONLY use merge tags from the available list below - DO NOT invent new tags like {FROMTITLE} or {POSITION}
     * For links: Use {PHISHINGURL} ONLY in href attribute with ACTION TEXT (e.g. "Verify Account", "Click Here")
     * NEVER show URLs in visible text (no "Or visit: https://...", no "Go to: link.com") - ONLY use buttons/links with action text
   - **Available Tags:** "{FULLNAME}", "{FIRSTNAME}", "{LASTNAME}", "{EMAIL}", "{PHISHINGURL}", "{FROMNAME}", "{FROMEMAIL}", "{SUBJECT}", "{DATEEMAILSENT}", "{COMPANYNAME}", "{DATE_SENT}", "{CURRENT_DATE}", "{CURRENT_DATE_PLUS_10_DAYS}", "{CURRENT_DATE_MINUS_10_DAYS}", "{RANDOM_NUMBER_1_DIGIT}", "{RANDOM_NUMBER_2_DIGITS}", "{RANDOM_NUMBER_3_DIGITS}"

4. **Red Flags:**
   - Embed the red flags subtly as defined in the blueprint.

5. **Company Logo (OPTIONAL):**
   - If impersonating a well-known company (Microsoft, Google, Amazon, Apple, PayPal, etc.):
     * Add company logo using public CDN URL (Wikimedia Commons, official press kits)
     * Place at top of email with centered alignment
     * Use reasonable size (100-150px width)
     * Example: <img src="https://upload.wikimedia.org/wikipedia/commons/..." alt="Microsoft" width="120" style="display:block; margin:0 auto 20px;">
   - If generic/unknown company: Skip logo (no placeholder, no fake logo)

**OUTPUT FORMAT:**
Return ONLY valid JSON with subject and bodyHtml. No markdown, no backticks, no explanation, just JSON.

**EXAMPLE OUTPUT (with Microsoft impersonation):**
{
  "subject": "Microsoft Security Alert - Verify Your Account",
  "bodyHtml": "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='font-family: Arial, sans-serif; background-color:#f4f4f4;'><tr><td align='center' style='padding:20px;'><table width='600' cellpadding='0' cellspacing='0' border='0' style='background-color:#ffffff; border:1px solid #dddddd;'><tr><td style='padding:20px;'><img src='https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' alt='Microsoft' width='120' style='display:block; margin:0 auto 20px;'><p style='margin:0 0 15px 0;'>Hi {FIRSTNAME},</p><p style='margin:0 0 15px 0;'>We detected unusual activity on your Microsoft account. For your security, please verify your account within 24 hours to prevent suspension.</p><p style='margin:0 0 15px 0; text-align:center;'><a href='{PHISHINGURL}' style='background-color:#0078d4; color:#ffffff; padding:12px 20px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block;'>VERIFY ACCOUNT</a></p><p style='margin:0 0 15px 0; color:#999999; font-size:12px;'>This is an automated message from Microsoft Security.</p><p style='margin:0;'>Best regards,<br>Microsoft Account Team<br>security@microsoft.com</p></td></tr></table></td></tr></table>"
}`;

        const userPrompt = `Write the phishing simulation email content for this SECURITY AWARENESS TRAINING scenario:

**Training Language:** ${language || 'en'}
**Email Tone:** ${analysis.tone}
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

            // Validate required fields
            if (!parsedResult.subject || !parsedResult.bodyHtml) {
                throw new Error('Missing required fields (subject or bodyHtml) in email content response');
            }

            // Log generated content for debugging
            console.log('📧 Generated Email:');
            console.log('   Subject:', parsedResult.subject);
            console.log('   HTML Preview (first 300 chars):', parsedResult.bodyHtml);


            return {
                ...parsedResult,
                analysis: inputData // Include the analysis in the final output for transparency
            };
        } catch (error) {
            console.error('❌ Phishing email generation step failed:', error);
            throw new Error(`Phishing email generation workflow error: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
});

// --- Workflow Definition ---

const createPhishingWorkflow = createWorkflow({
    id: 'create-phishing-workflow',
    description: 'Generate realistic phishing email simulations',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
})
    .then(analyzeRequest)
    .then(generateEmail);

createPhishingWorkflow.commit();

export { createPhishingWorkflow };
