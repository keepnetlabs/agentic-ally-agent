/**
 * Phishing Editor Tool
 * Allows editing and customizing existing phishing templates via natural language instructions
 * Supports: text updates, tone changes, language translation, element removal, etc.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { getModelWithOverride } from '../../model-providers';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { sanitizeHtml } from '../../utils/content-processors/html-sanitizer';
import { KVService } from '../../services/kv-service';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { ERROR_MESSAGES } from '../../constants';

const phishingEditorSchema = z.object({
  phishingId: z.string().describe('ID of the existing phishing template to edit'),
  editInstruction: z.string().describe('Natural language instruction for editing (e.g. "Tüm textleri urgency ile yaz", "Logo\'yu kaldır", "Türkçe\'ye çevir")'),
  language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code)'),
  modelProvider: z.string().optional().describe('Override model provider'),
  model: z.string().optional().describe('Override model name'),
});

export const phishingEditorTool = createTool({
  id: 'phishing-editor',
  description: 'Edit and customize existing phishing templates using natural language instructions',
  inputSchema: phishingEditorSchema,

  execute: async ({ context, writer }) => {
    const { phishingId, editInstruction, language: inputLanguage, modelProvider, model } = context;
    const logger = getLogger('PhishingEditor');

    try {
      logger.info('Starting phishing template edit', { phishingId, editInstruction });

      // 1. Load existing phishing email from KV
      const kvServicePhishing = new KVService('f6609d79aa2642a99584b05c64ecaa9f');
      const language = inputLanguage || 'en-gb';
      const emailKey = `phishing:${phishingId}:email:${language}`;
      const existingEmail = await kvServicePhishing.get(emailKey);

      if (!existingEmail || !existingEmail.template) {
        logger.error('Phishing email not found', { phishingId, emailKey });
        return {
          success: false,
          error: `Phishing template with ID ${phishingId} not found`,
          message: `❌ Template not found. Please provide a valid phishing ID.`
        };
      }

      logger.info('Loaded existing phishing email', { phishingId, templateLength: existingEmail.template.length });

      // 2. Try to load landing page (optional)
      let existingLanding = null;
      const landingKey = `phishing:${phishingId}:landing:${language}`;
      try {
        existingLanding = await kvServicePhishing.get(landingKey);
        logger.debug('Landing page loaded', { landingKey, hasPagesLength: existingLanding?.pages?.length });
      } catch (err) {
        logger.debug('Landing page not found or error loading', { landingKey });
      }

      // 3. Prepare LLM prompts
      const aiModel = getModelWithOverride(modelProvider, model);

      const systemPrompt = `You are editing a phishing email template for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

CRITICAL RULES:
1. ✅ PRESERVE all merge tags: {FIRSTNAME}, {PHISHINGURL}, {CUSTOMMAINLOGO}
2. ✅ PRESERVE HTML structure and design (colors, spacing, layout)
3. ✅ PRESERVE all form elements and their functionality
4. ✅ Update: Text content, tone, urgency, language, psychological triggers
5. ✅ Validate that the result is complete HTML, not truncated
6. ✅ All HTML attributes must use SINGLE QUOTES
7. ✅ If instruction is to "remove logo", remove only the img tag, keep {CUSTOMMAINLOGO} tag in comments

OUTPUT:
Return ONLY valid JSON (no markdown, no backticks):
{
  "subject": "New or updated subject line",
  "template": "Complete HTML template with all edits applied",
  "summary": "Brief summary of changes made (1-2 sentences)"
}

VALIDATION:
- [ ] Merge tags present: {FIRSTNAME}, {PHISHINGURL}
- [ ] HTML is complete (DOCTYPE, html tags, body tags all present)
- [ ] All attributes use single quotes
- [ ] JSON is valid and parseable`;

      // 3. Parallel LLM calls - Email and Landing Page separate

      // 3a. Email edit
      const emailUserPrompt = `Edit this email template:

Subject: ${existingEmail.subject}
Body: ${existingEmail.template}

Instruction: ${editInstruction}`;

      logger.info('Calling LLM for email editing');
      const emailPromise = generateText({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: emailUserPrompt }
        ],
        temperature: 0.7,
      });

      // 3b. Landing page edit (if exists) - each page separate
      let landingPagePromises: ReturnType<typeof generateText>[] = [];
      if (existingLanding?.pages?.length > 0) {
        landingPagePromises = existingLanding.pages.map((page: any, idx: number) => {
          const landingSystemPrompt = `You are editing a phishing landing page for CYBERSECURITY TRAINING.

CRITICAL RULES:
1. ✅ PRESERVE HTML structure and design (colors, spacing, layout)
2. ✅ EDIT page content based on user instruction
3. ✅ PRESERVE all form elements and functionality
4. ✅ Only SKIP if user explicitly said "email only" or "email template only"
5. ✅ Return COMPLETE page HTML (never empty)
6. ✅ All HTML attributes must use SINGLE QUOTES (e.g. style='color:red') to ensure valid JSON

OUTPUT JSON:
{
  "type": "login/success/info", 
  "template": "Complete HTML template...", 
  "edited": true, 
  "summary": "Changed background color..."
}`;

          const landingUserPrompt = `Edit landing page ${idx + 1}:

${JSON.stringify(page)}

Instruction: ${editInstruction}

IMPORTANT: Edit UNLESS user explicitly said "email only" or similar exclusion.`;

          logger.info(`Calling LLM for landing page ${idx + 1} editing`);
          return generateText({
            model: aiModel,
            messages: [
              { role: 'system', content: landingSystemPrompt },
              { role: 'user', content: landingUserPrompt }
            ],
            temperature: 0.7,
          });
        });
      }

      // 3c. Parallel execution - email + all landing pages
      const [emailResponse, ...landingResponses] = await Promise.all([
        emailPromise,
        ...landingPagePromises
      ]);

      // 3d. Parse email response
      logger.info('Email response received, parsing...');
      const emailCleanedJson = cleanResponse(emailResponse.text, 'phishing-edit-email');
      const editedEmail = JSON.parse(emailCleanedJson);

      // 3e. Parse landing page responses (each page separate)
      let editedLandingPages = [];
      if (landingResponses?.length > 0) {
        logger.info(`Landing page responses received, parsing ${landingResponses.length} pages...`);
        editedLandingPages = landingResponses.map((response, idx) => {
          const pageCleanedJson = cleanResponse(response.text, `phishing-edit-landing-${idx}`);
          return JSON.parse(pageCleanedJson);
        });
      }

      // 3f. Combine landing pages into single object
      let editedLanding = null;
      if (editedLandingPages.length > 0) {
        editedLanding = {
          pages: editedLandingPages,
          summary: editedLandingPages.map(p => p.summary).filter(Boolean).join('; ')
        };
      }

      // Rename for compatibility
      const editedContent = editedEmail;

      // 3a. Validate template exists and is not empty
      if (editedContent.template === undefined || editedContent.template === null) {
        logger.error('LLM response missing template field', { editedContent });
        return {
          success: false,
          error: 'LLM response missing template field',
          message: '❌ Edit failed: LLM did not return a valid template. Please try again.'
        };
      }

      if (editedContent.template.trim() === '') {
        logger.error('LLM returned empty template', { editedContent });
        return {
          success: false,
          error: 'LLM returned empty template',
          message: `❌ Edit failed: No changes were made. LLM says: "${editedContent.summary}". Please try a different edit instruction.`
        };
      }

      // 3b. Use returned template
      let finalTemplate = editedContent.template;

      // 3c. Sanitize HTML
      const sanitizedTemplate = sanitizeHtml(finalTemplate);

      // 4. Save updated email with same ID and language
      const updatedEmail = {
        ...existingEmail,
        subject: editedContent.subject || existingEmail.subject,
        template: sanitizedTemplate,
        lastModified: Date.now()
      };

      // 4a. Save email
      await kvServicePhishing.put(emailKey, updatedEmail);
      logger.info('Phishing email updated successfully', { phishingId, emailKey });

      // 4b. Save landing page if edited
      if (editedLanding && editedLanding.pages) {
        const updatedLanding = {
          ...existingLanding,
          pages: editedLanding.pages,
          lastModified: Date.now()
        };
        await kvServicePhishing.put(landingKey, updatedLanding);
        logger.info('Phishing landing page updated successfully', { phishingId, landingKey });
      }

      // 5. Stream updated components to UI
      if (writer) {
        try {
          const messageId = uuidv4();
          await writer.write({ type: 'text-start', id: messageId });

          // Stream email
          if (editedContent.template) {
            const emailObject = {
              subject: editedContent.subject,
              template: sanitizedTemplate,
              fromAddress: updatedEmail.fromAddress,
              fromName: updatedEmail.fromName,
            };
            const emailJson = JSON.stringify(emailObject);
            const encodedEmail = Buffer.from(emailJson).toString('base64');

            await writer.write({
              type: 'text-delta',
              id: messageId,
              delta: `::ui:phishing_email::${encodedEmail}::/ui:phishing_email::\n`
            });
          }

          // Stream landing pages
          if (editedLanding && editedLanding.pages && editedLanding.pages.length > 0) {
            const landingObject = { pages: editedLanding.pages };
            const landingJson = JSON.stringify(landingObject);
            const encodedLanding = Buffer.from(landingJson).toString('base64');

            await writer.write({
              type: 'text-delta',
              id: messageId,
              delta: `::ui:landing_page::${encodedLanding}::/ui:landing_page::\n`
            });
          }

          await writer.write({ type: 'text-end', id: messageId });
        } catch (err) {
          logger.warn('Failed to stream updated components to UI', { error: err instanceof Error ? err.message : String(err) });
        }
      }

      // 6. Return success response
      const updates = ['Email'];
      if (editedLanding?.pages) updates.push('Landing Page');

      return {
        success: true,
        status: 'success',
        data: {
          phishingId,
          subject: editedContent.subject,
          summary: editedContent.summary || editedLanding?.summary,
          message: `✅ Updated: ${updates.join(' + ')}\n${editedContent.summary || ''}${editedLanding?.summary ? '\n' + editedLanding.summary : ''}`
        }
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const errorInfo = errorService.external(err.message, {
        phishingId,
        editInstruction,
        step: 'phishing-template-edit',
        stack: err.stack
      });

      logger.error('Phishing editor error', { code: errorInfo.code, message: errorInfo.message, category: errorInfo.category });

      return {
        success: false,
        error: JSON.stringify(errorInfo),
        message: '❌ Failed to edit phishing template. Please try again or provide a different instruction.'
      };
    }
  }
});
