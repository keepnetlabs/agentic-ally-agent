import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { MicrolearningContent } from '../types/microlearning';
import { RemoteStorageService } from '../services/remote-storage-service';
import { MicrolearningService } from '../services/microlearning-service';
import { getModel, Model, ModelProvider } from '../model-providers';
import { InboxContentSchema } from '../schemas/microlearning-schema';
import { ExampleRepo } from '../services/example-repo';
import { CreateInboxStructureSchema, CreateInboxStructureOutputSchema } from '../schemas/create-inbox-structure-schema';

const microlearningService = new MicrolearningService();

export const createInboxStructureTool = new Tool({
  id: 'create_inbox_structure',
  description: 'Create inbox structure and persist examples/all/inbox/{language}.json',
  inputSchema: CreateInboxStructureSchema,
  outputSchema: CreateInboxStructureOutputSchema,
  execute: async (context: any) => {
    const input = context?.inputData || context?.input || context;
    const { department, languageCode, microlearningId, microlearning, remote } = input;

    try {
      const inboxContent = await createInboxStructure(department, languageCode, microlearningId, microlearning, remote);

      console.log(`📦 Tool returning inbox content:`, typeof inboxContent, Object.keys(inboxContent || {}));

      return {
        success: true,
        data: inboxContent, // Return actual inbox content instead of metadata
        metadata: {
          department: department || 'all',
          languageCode,
          microlearningId,
          inboxPath: `inbox/${department || 'all'}/${languageCode}.json`,
          itemsGenerated: 1,
          estimatedDuration: '20 minutes max'
        }
      };

    } catch (error) {
      console.error('Inbox structure creation failed:', error);

      return {
        success: false,
        error: (error as Error).message
      };
    }
  },
});

// Main inbox structure creation function
async function createInboxStructure(
  department: string,
  languageCode: string,
  microlearningId: string,
  microlearning: MicrolearningContent,
  remote: RemoteStorageService
) {
  // Maintain in-memory assignment for analytics and tools
  await microlearningService.assignMicrolearningToDepartment(
    department || 'all',
    languageCode,
    microlearningId,
    'medium',
    undefined
  );

  // Build inbox payload in memory shape and upsert remotely
  const dept = department || 'all';

  // Generate dynamic inbox content with AI based on training topic and content
  try {
    const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);
    const dynamicInboxData = await generateDynamicInboxWithAI(
      microlearning,
      languageCode,
      model
    );

    await remote.upsertInbox(dept, languageCode, microlearningId, dynamicInboxData);
    return dynamicInboxData; // Return the generated content

  } catch (firstError) {
    console.warn('First attempt to generate dynamic inbox failed, retrying once:', firstError);

    try {
      const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);
      const dynamicInboxData = await generateDynamicInboxWithAI(
        microlearning,
        languageCode,
        model
      );

      await remote.upsertInbox(dept, languageCode, microlearningId, dynamicInboxData);
      return dynamicInboxData; // Return the generated content after retry

    } catch (secondError) {
      console.warn('Second attempt failed, using fallback:', secondError);
      // Fallback to basic structure
      const fallbackPayload = { texts: {}, emails: [] };
      await remote.upsertInbox(dept, languageCode, microlearningId, fallbackPayload);
      return fallbackPayload; // Return the fallback content
    }
  }
}

async function generateDynamicInboxWithAI(
  microlearning: MicrolearningContent,
  languageCode: string,
  model: any
) {
  const topic = microlearning.microlearning_metadata.title;
  const category = microlearning.microlearning_metadata.category;
  const riskArea = microlearning.microlearning_metadata.risk_area;
  const level = microlearning.microlearning_metadata.level;


  // Get inbox examples from ExampleRepo for better AI learning
  const repo = ExampleRepo.getInstance();
  let inboxHints: string;
  try {
    inboxHints = await repo.getSmartSchemaHints(`inbox simulation ${topic} ${category}`, 2);
    console.log('✨ Using inbox examples for AI guidance');
  } catch (error) {
    inboxHints = 'No specific inbox examples found';
  }

  // Phase 1: Generate UI texts (simplified prompt)
  const textsPrompt = `Create inbox UI texts for "${topic}" training in ${languageCode}. 

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON without explanation or markdown
- Include ALL required fields, especially phishingResultModal.legitimateExplanationTitle
- No missing fields allowed - validation will fail

Generate the following structure:
- Replace TOPIC with "${topic}" 
- Replace LANGUAGE with "${languageCode}"
- Replace TRANSLATE_PHISHING_REPORT with "Phishing Reporter" translated to ${languageCode}
- Keep mobileTitle as "${topic} Training" (use actual topic)
- MUST include phishingResultModal.legitimateExplanationTitle field

{
  "title": "TOPIC Training",
  "description": "Learn to identify and handle TOPIC scenarios",
  "instructions": "Review emails and report suspicious content",
  "selectEmailMessage": "Select an email to view its content",
  "reportButtonText": "Report as Suspicious",
  "nextButtonText": "Continue",
  "phishingReportLabel": "TRANSLATE_PHISHING_REPORT", 
  "inboxLabel": "Inbox",
  "reportsLabel": "Reports",
  "accuracyLabel": "Accuracy",
  "emailReportedMessage": "Email has been reported",
  "emailHeadersTitle": "Email Headers",
  "ctaButtonText": "Improve Your Behavior",
  "mobileTitle": "${topic} Training",
  "backToInboxText": "Back to Inbox", 
  "headersButtonText": "Headers",
  "correctReportMessage": "Well done identifying the issue",
  "cautiousReportMessage": "Good caution with suspicious content",
  "phishingReportModal": {
    "title": "${topic} Reporter",
    "subtitle": "Report this email for analysis?",
    "question": "Why are you reporting this email?",
    "options": ["Received spam email.", "Received suspicious email.", "Not sure if legitimate."],
    "reportButton": "Report", 
    "cancelButton": "Cancel"
  },
  "phishingResultModal": {
    "correctTitle": "Excellent catch!",
    "correctSubtitle": "You correctly identified this ${topic} issue",
    "incorrectTitle": "Good security thinking!",
    "incorrectSubtitle": "Being cautious is always wise",
    "difficultyLabel": "MEDIUM",
    "emailInfoTitle": "Email Analysis",
    "phishingExplanationTitle": "Why this was suspicious",
    "legitimateExplanationTitle": "Why this was legitimate",
    "continueButton": "Continue Learning"
  },
  "mobileHint": "💡 Open email. If suspicious, press Report.",
  "feedbackCorrect": "✅ Good job — reporting helps protect everyone.",
  "feedbackWrong": "⚠️ Not quite right — this email looks safe. Try again."
}`;



  // Phase 2: Generate emails with realistic behavior patterns
  const emailsPrompt = `Generate exactly 4 ${topic} training emails in ${languageCode} language. Return ONLY valid JSON array - no explanations or markdown.

Topic: ${topic} (${category}, ${riskArea}, ${level} level)

Make emails naturally relate to ${topic} - use relevant scenarios, terminology, and workplace situations that fit this specific security topic.

SUBJECTS (MUST):
- Realistic and varied; do not repeat literal "${topic}" across subjects; ≤ 90 chars.

BODY (MUST):
- Operational tone, not educational. Do not comment on "benefits" or "awareness". Avoid meta phrases like "this is an example" or "scenario to learn".
- DO NOT include tips, best practices, or explanations of why the message is (not) phishing inside the body.
- Keep literal "${topic}" usage minimal (0–1x). Convey the theme via details (systems, tickets, locations, timings).
- Include plausible specifics (team/person, ticket/PO, date/time, room/tool name). Vary greeting/sign-off. Simple readable HTML.

LINKS & DOMAINS:
- PHISHING: look‑alike or external domains; NEVER the exact company primary domain.
- LEGITIMATE: company domain and internal links; NEVER ask for credentials/sensitive data.

VARIETY:
- 1) urgent alert, 2) subtle professional request, 3) casual team note, 4) formal HR update.

LENGTH:
- preview: 8–14 words; body: 120–220 words.

ATTACHMENTS:
- 0–1 per email; realistic names (e.g., invoice_4721.pdf, meeting-agenda_Q3.docx).
- Types allowed: pdf, doc, xlsx, jpg, png, zip, txt.
- Size label realistic (50KB–2MB). Content uses simple HTML with very light inline styling (paragraphs, bold, small info box). No scripts/external assets.
- Phishing: prefer doc/xlsx/zip; imply risky behavior indirectly (e.g., instructions to enable editing/content), never label the file as suspicious.
- Legitimate: prefer pdf/jpg/png with concrete, benign info (e.g., line items, time slots, receipt totals). NEVER ask for credentials in the attachment.

ATTACHMENT VARIETY (ACROSS 4 EMAILS):
- If attachments are used, vary both type AND presentation. Do not reuse the same HTML structure/design for all attachments.
- Mix formats (e.g., one invoice table, one agenda bullets, one short paragraph receipt, one image caption). Avoid identical layout/styling across emails.

ATTACHMENT CONTENT EXAMPLES (match type):
- invoice (pdf/doc/xlsx): 2–3 line items (description, qty, amount), subtotal, tax, total.
- agenda/meeting (doc/pdf): date, room, time slots with topics.
- receipt/report (pdf): reference no, date, amount, contact.
- image (jpg/png): brief caption/alt consistent with body.

CRITICAL JSON REQUIREMENTS:
- Use double quotes for all strings
- No trailing commas
- No comments in JSON
- Escape quotes properly in content
- "type" must be: pdf, doc, xlsx, jpg, png, zip, txt
- "difficulty" must be: EASY, MEDIUM, MEDIUM-EASY, MEDIUM-HARD, HARD
- "isPhishing" must be: true or false
- "sender" must be valid email format (e.g., "user@domain.com")

BEHAVIORAL REQUIREMENTS - CRITICAL FOR REALISM:

FOR PHISHING EMAILS (isPhishing: true) - 2 emails:
Create ONE obvious phishing and ONE sophisticated phishing:

EMAIL 1 - Obvious Phishing:
- URGENT language and time pressure ("expires in 24 hours", "immediate action")
- SUSPICIOUS domains (typos, external services like "security-center.net", "account-help.org")
- GENERIC greetings ("Dear User", "Account Holder")
- OBVIOUS red flags in headers (SPF: fail, DMARC: fail)
- PUSHY call-to-action with suspicious links

EMAIL 2 - Sophisticated Phishing:
- PROFESSIONAL and SUBTLE approach (sounds legitimate but has subtle red flags)
- ALMOST-CORRECT domains (like "company-security.com" instead of "company.com")
- PERSONALIZED but SLIGHTLY off ("Hi there", "Valued employee" instead of actual name)
- MIXED headers (some pass, some fail - making it harder to detect)
- HELPFUL tone that slowly asks for information or action

FOR LEGITIMATE EMAILS (isPhishing: false) - 2 emails:
Mix casual and formal legitimate communication:

EMAIL 3 - Casual Legitimate:
- NATURAL workplace communication from manager/colleague
- COMPANY domain (@company.com, @yourorg.com)
- PERSONAL greetings with names or casual tone ("Hey team", "Hi everyone")
- CONVERSATIONAL language with contractions and friendly touches
- CLEAN headers (SPF: pass, DMARC: pass)

EMAIL 4 - Formal Legitimate:
- PROFESSIONAL communication from HR/compliance/official department
- COMPANY domain with appropriate department sender
- FORMAL but WARM tone (professional without being cold)
- PROPER business language (no contractions, structured content)
- LEGITIMATE business context (policy updates, announcements, procedures)
- CLEAN headers (SPF: pass, DMARC: pass)

PHISHING SOPHISTICATION LEVELS:
1. "Obviously Suspicious" - Clear red flags, easy to spot
2. "Cleverly Disguised" - Professional appearance with subtle inconsistencies

LEGITIMATE VARIETY:
3. "Workplace Casual" - Manager/colleague informal communication
4. "Corporate Professional" - HR/official department formal communication

REALISTIC WORKPLACE ELEMENTS:
- Meeting room names (Conference Room B, Boardroom A)
- Company-specific language (our portal, company policy, team update)
- Natural timing (tomorrow at 2pm, by end of week, quick reminder)
- Personal touches (I'll bring coffee, looking forward to seeing everyone)
- Proper context (training session, policy update, team announcement)

Make each email sound like real workplace communication - phishing should feel "off" but professional, legitimate should feel natural and human.

JSON FORMAT:
[
  {
    "id": "1",
    "sender": "security@company.com",
    "subject": "Unusual sign-in detected — please review",
    "preview": "Your account shows unusual activity",
    "timestamp": "2 hours ago",
    "isPhishing": true,
    "content": "<div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>Professional email content here without quotes issues</div>",
    "headers": ["Return-Path: <security@company.com>", "SPF: fail", "DMARC: fail"],
    "difficulty": "MEDIUM",
    "explanation": "This email shows red flags like urgent language and suspicious domain",
     "attachments": [
       {
         "id": "att-1",
         "name": "security_report.pdf",
         "size": "156KB",
         "type": "pdf",
         "content": "<div class='bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-6 shadow-lg'><div class='flex items-center gap-3 mb-4'><div class='w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center'><svg class='w-5 h-5 text-white' fill='currentColor' viewBox='0 0 20 20'><path d='M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z'/></svg></div><div><h3 class='font-bold text-lg text-gray-900 dark:text-white'>Security Report</h3><p class='text-sm text-gray-600 dark:text-gray-300'>PDF Document</p></div></div><div class='space-y-2'><div class='flex justify-between text-sm'><span class='text-gray-600 dark:text-gray-400'>Threat Level:</span><span class='font-semibold text-red-600 dark:text-red-400'>HIGH</span></div><div class='flex justify-between text-sm'><span class='text-gray-600 dark:text-gray-400'>Status:</span><span class='font-semibold text-orange-600 dark:text-orange-400'>Action Required</span></div></div></div>"
       }
     ]
  }
]

Generate 4 completely different emails with unique scenarios, subjects, and content following this exact format.

EMAIL VARIETY EXAMPLES:
- Email 1: Urgent security alert with red warning styling
- Email 2: Casual team update with friendly tone  
- Email 3: Formal policy notification with corporate language
- Email 4: Personal reminder with conversational style

Each should feel like it came from a different person with different communication style while staying focused on ${topic}.`;

  // Execute both phases
  const [textsResponse, emailsResponse] = await Promise.all([
    generateText({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Generate ${topic} UI texts. Return only valid JSON - no markdown, no backticks. Use exact format shown in user prompt.`
        },
        { role: 'user', content: textsPrompt }
      ]
    }),
    generateText({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Generate ${topic} training emails. Return only valid JSON array - no markdown, no backticks. CRITICAL: Every email object MUST have ALL required fields including "explanation" - never leave any field undefined or missing. Use exact format shown in user prompt.`
        },
        { role: 'user', content: emailsPrompt }
      ]
    })
  ]);

  // Parse responses with simplified error handling
  let textsData, emailsData;

  try {
    const cleanJson = (text: string) => {
      // First, try to extract JSON from the response
      let cleaned = text.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .replace(/^```\s*/, '')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\n\s*\n/g, '\n')
        .replace(/\s+$/gm, '');

      // Enhanced JSON cleaning with repair
      try {
        // First attempt: Handle common issues
        cleaned = cleaned
          .replace(/\\\\/g, '\\')  // Fix double backslashes
          .replace(/\\"/g, '\\"')  // Keep escaped quotes as valid JSON
          .replace(/\\'/g, "'")    // Convert escaped single quotes
          .replace(/\\n/g, '\\n')  // Keep escaped newlines as valid JSON
          .replace(/\\t/g, '\\t')  // Keep escaped tabs as valid JSON
          .replace(/\\r/g, '\\r')  // Keep escaped carriage returns
          .replace(/[\u0000-\u001f\u007f-\u009f]/g, ''); // Remove control characters

        // Try parsing to see if it's valid
        JSON.parse(cleaned);
        return cleaned;
      } catch (e) {
        // More aggressive repair
        console.warn('First JSON clean failed, applying repairs:', e instanceof Error ? e.message : 'Unknown error');

        // Fix common JSON structure issues
        cleaned = text.trim()
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '')
          .replace(/^```\s*/, '')
          // Fix missing commas
          .replace(/}(\s*)"/g, '},$1"')  // Add comma between objects
          .replace(/](\s*)"/g, '],$1"')  // Add comma after arrays
          .replace(/"(\s*)}/g, '"$1}')   // Remove trailing commas before }
          .replace(/"(\s*)]/g, '"$1]')   // Remove trailing commas before ]
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          // Fix quotes and escaping
          .replace(/\\n/g, ' ')          // Replace newlines with spaces
          .replace(/\\t/g, ' ')          // Replace tabs with spaces
          .replace(/\\r/g, ' ')          // Replace carriage returns
          .replace(/\\(?!["\\\/bfnrtu])/g, '\\\\') // Escape stray backslashes
          .replace(/[\u0000-\u001f\u007f-\u009f]/g, ''); // Remove control chars

        try {
          // Test the repaired JSON
          JSON.parse(cleaned);
          console.log('✅ JSON repair successful');
          return cleaned;
        } catch (repairError) {
          console.warn('⚠️ JSON repair failed, returning cleaned version');
          return cleaned;
        }
      }
    };

    // Try to find JSON array/object boundaries
    const findJsonBoundaries = (text: string) => {
      const jsonStart = text.indexOf('[');
      const objStart = text.indexOf('{');

      if (jsonStart !== -1 && (objStart === -1 || jsonStart < objStart)) {
        const lastBracket = text.lastIndexOf(']');
        return text.substring(jsonStart, lastBracket + 1);
      } else if (objStart !== -1) {
        const lastBrace = text.lastIndexOf('}');
        return text.substring(objStart, lastBrace + 1);
      }
      return text;
    };

    const cleanedTexts = cleanJson(textsResponse.text);
    const cleanedEmails = cleanJson(emailsResponse.text);

    try {
      textsData = JSON.parse(findJsonBoundaries(cleanedTexts));
    } catch (textsError) {
      console.warn('Texts JSON parse failed, using fallback:', textsError);
      throw textsError; // This will trigger the outer catch block
    }

    try {
      emailsData = JSON.parse(findJsonBoundaries(cleanedEmails));
    } catch (emailsError) {
      console.warn('Emails JSON parse failed, using fallback:', emailsError);
      throw emailsError; // This will trigger the outer catch block
    }

  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);

    // Fallback structure matching expected format
    textsData = {
      title: `${topic} Training`,
      description: `Learn to identify and handle ${topic} scenarios`,
      instructions: "Review emails and report suspicious content",
      selectEmailMessage: "Select an email to view its content",
      reportButtonText: "Report as Suspicious",
      nextButtonText: "Continue",
      phishingReportLabel: `${topic} Reporter`,
      inboxLabel: "Inbox",
      reportsLabel: "Reports",
      accuracyLabel: "Accuracy",
      emailReportedMessage: "Email has been reported",
      emailHeadersTitle: "Email Headers",
      ctaButtonText: "Improve Your Behavior",
      mobileTitle: `${topic} Training`,
      backToInboxText: "Back to Inbox",
      headersButtonText: "Headers",
      correctReportMessage: "Well done identifying the issue",
      cautiousReportMessage: "Good caution with suspicious content",
      phishingReportModal: {
        title: `${topic} Reporter`,
        subtitle: "Report this email for analysis?",
        question: "Why are you reporting this email?",
        options: ["Received spam email.", "Received suspicious email.", "Not sure if legitimate."],
        reportButton: "Report",
        cancelButton: "Cancel"
      },
      phishingResultModal: {
        correctTitle: "Excellent catch!",
        correctSubtitle: `You correctly identified this ${topic} issue`,
        incorrectTitle: "Good security thinking!",
        incorrectSubtitle: "Being cautious is always wise",
        difficultyLabel: "MEDIUM",
        emailInfoTitle: "Email Analysis",
        phishingExplanationTitle: "Why this was suspicious",
        legitimateExplanationTitle: "Why this was legitimate",
        continueButton: "Continue Learning"
      },
      mobileHint: "💡 Open email. If suspicious, press Report.",
      feedbackCorrect: "✅ Good job — reporting helps protect everyone.",
      feedbackWrong: "⚠️ Not quite right — this email looks safe. Try again."
    };

    emailsData = [
      {
        "id": "1",
        "sender": "security@company-alerts.com",
        "subject": `${topic} Security Alert`,
        "preview": "Important security notification requiring immediate attention...",
        "timestamp": "2 hours ago",
        "isPhishing": true,
        "content": `<div class=\\"text-[#1C1C1E] dark:text-[#F2F2F7]\\"><div class=\\"bg-red-600 p-4 text-white mb-4\\"><h2 class=\\"font-bold text-lg\\">🚨 URGENT ${topic.toUpperCase()} SECURITY ALERT</h2></div><p><strong>Dear Valued Employee,</strong></p><p>Our security systems have detected <strong>critical ${topic} activity</strong> on your corporate account that requires immediate action. Failure to respond within the next 2 hours may result in account suspension.</p><div class=\\"bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4\\"><h3 class=\\"font-semibold text-yellow-800\\">⚠️ Security Breach Details:</h3><ul class=\\"mt-2 text-yellow-700\\"><li>• Unauthorized login attempts from foreign IP addresses</li><li>• Suspicious ${topic} patterns detected in your account</li><li>• Multiple failed authentication events logged</li><li>• Potential data compromise risk: <span class=\\"font-bold text-red-600\\">HIGH</span></li></ul></div><p>To immediately secure your account and prevent data loss, please verify your identity using our secure portal:</p><div class=\\"text-center my-6\\"><a href=\\"https://secure-${topic.toLowerCase()}-verification.net/urgent\\" class=\\"bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg\\">🔒 VERIFY ACCOUNT NOW</a></div><p class=\\"text-sm text-gray-600\\">This verification link will expire in 2 hours for security purposes. Do not ignore this critical security notice.</p><div class=\\"mt-6 pt-4 border-t border-gray-200\\"><p class=\\"text-sm\\"><strong>IT Security Department</strong><br>${topic} Protection Services<br>security@company-systems.com<br>📞 Emergency Line: 1-800-SECURITY</p></div></div>`,
        "headers": [`Return-Path: <security@company-alerts.com>`, "SPF: fail", "DMARC: fail"],
        "difficulty": "MEDIUM",
        "explanation": `This email uses ${topic} urgency tactics to trick users into clicking suspicious links`,
        "attachments": [
          {
            "id": "att-fallback",
            "name": "security-report.pdf",
            "size": "156KB",
            "type": "pdf",
            "content": `<div class=\\"text-[#1C1C1E] dark:text-[#F2F2F7] bg-white dark:bg-[#1C1C1E] max-w-2xl mx-auto shadow-xl dark:shadow-2xl rounded-xl overflow-hidden\\"><div class=\\"bg-gradient-to-br from-red-600 via-red-700 to-red-800 p-5 text-white\\"><div class=\\"flex items-center gap-4\\"><div class=\\"w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center\\"><svg class=\\"w-6 h-6\\" fill=\\"currentColor\\" viewBox=\\"0 0 20 20\\"><path fill-rule=\\"evenodd\\" d=\\"M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z\\"/></svg></div><div><h3 class=\\"font-bold text-xl\\">SECURITY ALERT</h3><p class=\\"text-red-100 text-sm\\">Generated: \${new Date().toLocaleDateString()}</p></div></div></div><div class=\\"p-6\\"><div class=\\"bg-red-50 dark:bg-red-950/20 border-l-4 border-red-400 p-4 mb-6\\"><h2 class=\\"text-xl font-bold text-red-900 dark:text-red-300 mb-2\\">⚠️ IMMEDIATE ACTION REQUIRED</h2><p class=\\"text-red-700 dark:text-red-400\\">Suspicious ${topic} activity detected on your account</p></div><div class=\\"bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4\\"><table class=\\"w-full text-sm\\"><tbody><tr class=\\"border-b border-gray-200 dark:border-gray-600\\"><td class=\\"py-2 text-gray-600 dark:text-gray-400\\">Account Status:</td><td class=\\"py-2 text-right\\"><span class=\\"bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded-full text-xs\\">COMPROMISED</span></td></tr><tr class=\\"border-b border-gray-200 dark:border-gray-600\\"><td class=\\"py-2 text-gray-600 dark:text-gray-400\\">Risk Level:</td><td class=\\"py-2 text-right font-bold text-red-600 dark:text-red-400\\">HIGH</td></tr><tr><td class=\\"py-2 text-gray-600 dark:text-gray-400\\">Action Required:</td><td class=\\"py-2 text-right font-semibold text-gray-900 dark:text-gray-100\\">VERIFY NOW</td></tr></tbody></table></div><div class=\\"text-center py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg\\"><p class=\\"text-xs text-gray-500 dark:text-gray-400\\">Security Department • Confidential Report • ID: SEC-2024-\${Math.floor(Math.random()*1000)}</p></div></div></div>`
          }
        ]
      },
      {
        "id": "2",
        "sender": `hr@company.com`,
        "subject": `${topic} Policy Update - Action Required`,
        "preview": "Please review and acknowledge the updated policy...",
        "timestamp": "4 hours ago",
        "isPhishing": false,
        "content": `<div class=\\"text-[#1C1C1E] dark:text-[#F2F2F7]\\"><h2 class=\\"font-bold text-lg mb-4\\">Policy Update Notification</h2><p>Dear Employee,</p><p>We have updated our ${topic} policy to ensure better protection and compliance. Please review the changes and acknowledge your understanding.</p><div class=\\"bg-blue-50 border-l-4 border-blue-400 p-4 my-4\\"><h3 class=\\"font-semibold text-blue-800\\">Key Changes:</h3><ul class=\\"mt-2 text-blue-700\\"><li>• Enhanced security protocols</li><li>• Updated reporting procedures</li><li>• New compliance requirements</li></ul></div><p>Please access the updated policy through our official company portal and complete the acknowledgment by end of week.</p><div class=\\"mt-6\\"><p class=\\"text-sm\\">Best regards,<br><strong>Human Resources</strong><br>Company Policy Team</p></div></div>`,
        "headers": [`Return-Path: <hr@company.com>`, "SPF: pass", "DMARC: pass"],
        "difficulty": "EASY",
        "explanation": "This is a legitimate policy update from HR department",
        "attachments": []
      },
      {
        "id": "3",
        "sender": `support@external-service.com`,
        "subject": `Urgent: Your ${topic} Account Needs Verification`,
        "preview": "We detected unusual activity on your account...",
        "timestamp": "1 day ago",
        "isPhishing": true,
        "content": `<div class=\\"text-[#1C1C1E] dark:text-[#F2F2F7]\\"><h2 class=\\"font-bold text-lg mb-4\\">Account Verification Required</h2><p>Hello,</p><p>We have detected unusual activity on your ${topic} account. For your security, please verify your account immediately.</p><div class=\\"bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4\\"><p class=\\"text-yellow-800\\">Click here to verify: <a href=\\"https://fake-verification-site.net\\" class=\\"text-blue-600 underline\\">Verify Account</a></p></div><p>If you do not verify within 24 hours, your account may be suspended.</p><p>Thank you,<br>Security Team</p></div>`,
        "headers": [`Return-Path: <support@external-service.com>`, "SPF: fail", "DMARC: fail"],
        "difficulty": "MEDIUM",
        "explanation": "Suspicious verification request from external domain with failed authentication",
        "attachments": []
      },
      {
        "id": "4",
        "sender": `manager@company.com`,
        "subject": `${topic} Training Reminder`,
        "preview": "Don't forget about today's training session...",
        "timestamp": "3 hours ago",
        "isPhishing": false,
        "content": `<div class=\\"text-[#1C1C1E] dark:text-[#F2F2F7]\\"><h2 class=\\"font-bold text-lg mb-4\\">Training Reminder</h2><p>Hi Team,</p><p>This is a friendly reminder about today's ${topic} training session scheduled at 2:00 PM in Conference Room B.</p><div class=\\"bg-green-50 border-l-4 border-green-400 p-4 my-4\\"><h3 class=\\"font-semibold text-green-800\\">Session Details:</h3><ul class=\\"mt-2 text-green-700\\"><li>• Time: 2:00 PM - 3:30 PM</li><li>• Location: Conference Room B</li><li>• Materials: Provided</li></ul></div><p>Please bring your laptop and be prepared to participate in interactive exercises.</p><p>Looking forward to seeing everyone there!</p><p>Best regards,<br><strong>Your Manager</strong></p></div>`,
        "headers": [`Return-Path: <manager@company.com>`, "SPF: pass", "DMARC: pass"],
        "difficulty": "EASY",
        "explanation": "Legitimate training reminder from company manager",
        "attachments": []
      }
    ];
  }

  const aiResponse = {
    texts: textsData,
    emails: emailsData
  };

  // Validate with schema
  try {
    const validatedInboxContent = InboxContentSchema.parse(aiResponse);
    console.log(`✅ Generated inbox content validated successfully for topic: ${topic}`);
    return validatedInboxContent;
  } catch (validationError) {
    console.warn('Inbox content validation failed, using fallback:', validationError);
    // Return proper fallback with required fields
    return {
      texts: {
        correctTitle: "Great job!",
        correctSubtitle: "You correctly identified this message",
        incorrectTitle: "Good security thinking!",
        incorrectSubtitle: "Being cautious is always wise",
        difficultyLabel: "MEDIUM",
        emailInfoTitle: "Email Analysis",
        phishingExplanationTitle: "Why this was suspicious",
        legitimateExplanationTitle: "Why this was legitimate",
        continueButton: "Continue Learning"
      },
      emails: [],
      mobileHint: "💡 Open email. If suspicious, press Report.",
      feedbackCorrect: "✅ Good job — reporting helps protect everyone.",
      feedbackWrong: "⚠️ Not quite right — this email looks safe. Try again."
    };
  }
}

export type CreateInboxStructureInput = typeof CreateInboxStructureSchema;
export type CreateInboxStructureOutput = typeof CreateInboxStructureOutputSchema;