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
import { normalizeEmailNestedTablePadding } from '../../utils/content-processors/email-table-padding-normalizer';
import { KVService } from '../../services/kv-service';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';

// Utility: Add timeout to AI calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

const phishingEditorSchema = z.object({
  phishingId: z.string().describe('ID of the existing phishing template to edit'),
  editInstruction: z.string().describe('Natural language instruction for editing (e.g. "Add urgency to all text", "Remove logo", "Translate to Turkish")'),
  language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code)'),
  modelProvider: z.string().optional().describe('Override model provider'),
  model: z.string().optional().describe('Override model name'),
});

// Response validation schemas
const emailResponseSchema = z.object({
  subject: z.string().min(1, 'Subject must not be empty'),
  template: z.string().min(20, 'Template must contain valid HTML'),
  summary: z.string().min(5, 'Summary must be at least 5 characters')
});

const landingPageResponseSchema = z.object({
  type: z.enum(['login', 'success', 'info']).describe('Landing page type'),
  template: z.string().min(50, 'Template must contain complete HTML'),
  edited: z.boolean().describe('Whether page was edited'),
  summary: z.string().min(5, 'Summary must be at least 5 characters')
});

// Input landing page schema for type inference
type LandingPageInput = {
  type: 'login' | 'success' | 'info';
  template: string;
  edited?: boolean;
  summary?: string;
};

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
      } catch {
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
6. ✅ All HTML attributes must use SINGLE QUOTES (e.g., style='color:red;', class='header')
7. ✅ If instruction is to "remove logo", remove only the img tag, keep {CUSTOMMAINLOGO} tag in comments

OUTPUT FORMAT - CRITICAL:
Return ONLY a valid JSON object. Do NOT include:
- Markdown code blocks (no \`\`\`json\`\`\`)
- Extra backticks or quotes
- Explanatory text
- Line breaks before/after JSON

EXACT JSON FORMAT:
{"subject":"New subject line here","template":"<html>...complete HTML...</html>","summary":"Brief 1-2 sentence summary"}

VALIDATION CHECKLIST BEFORE RETURNING:
✓ subject field: non-empty string
✓ template field: contains complete HTML (doctype, html, head, body tags)
✓ summary field: 1-2 sentence description of changes
✓ All HTML attributes use SINGLE quotes (style='...', class='...', id='...')
✓ Merge tags {FIRSTNAME}, {PHISHINGURL} are still present
✓ JSON is valid (matching braces and quotes)
✓ No markdown formatting or backticks
✓ No text before or after the JSON object`;

      // 3. Parallel LLM calls - Email and Landing Page separate

      // 3a. Email edit
      // Escape user input to prevent prompt injection
      const escapedInstruction = JSON.stringify(editInstruction).slice(1, -1);  // Remove outer quotes
      const emailUserPrompt = `Edit this email template:

Subject: ${existingEmail.subject}
Body: ${existingEmail.template}

Instruction: "${escapedInstruction}"`;

      logger.info('Calling LLM for email editing');
      const emailPromise = withRetry(
        () => withTimeout(
          generateText({
            model: aiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: emailUserPrompt }
            ],
            temperature: 0.3,  // Lower temperature for more consistent JSON output
          }),
          30000  // 30 second timeout
        ),
        'Phishing email editing'
      );

      // 3b. Landing page edit (if exists) - each page separate
      let landingPagePromises: ReturnType<typeof generateText>[] = [];
      if (existingLanding?.pages?.length > 0) {
        landingPagePromises = existingLanding.pages.map((page: LandingPageInput, idx: number) => {
          const landingSystemPrompt = `You are editing a phishing landing page for CYBERSECURITY TRAINING.

CRITICAL RULES:
1. ✅ PRESERVE HTML structure and design (colors, spacing, layout)
2. ✅ EDIT page content based on user instruction
3. ✅ PRESERVE all form elements and functionality
4. ✅ Only SKIP if user explicitly said "email only" or "email template only"
5. ✅ Return COMPLETE page HTML (never empty)
6. ✅ All HTML attributes must use SINGLE QUOTES (style='...', class='...', etc.)

OUTPUT FORMAT - CRITICAL:
Return ONLY a valid JSON object. Do NOT include:
- Markdown code blocks (no \`\`\`json\`\`\`)
- Extra backticks or quotes
- Explanatory text
- Line breaks before/after JSON

EXACT JSON FORMAT:
{"type":"login","template":"<html>...complete HTML...</html>","edited":true,"summary":"Description of changes"}

VALIDATION CHECKLIST:
✓ type field: "login", "success", or "info"
✓ template field: complete HTML with all tags
✓ edited field: boolean (true if modified, false if unchanged)
✓ summary field: 1-2 sentence description
✓ All HTML attributes use SINGLE quotes
✓ JSON is valid and complete`;

          const landingUserPrompt = `Edit landing page ${idx + 1}:

${JSON.stringify(page)}

Instruction: "${escapedInstruction}"

IMPORTANT: Edit UNLESS user explicitly said "email only" or similar exclusion.
Return ONLY the JSON object with no extra text.`;

          logger.info(`Calling LLM for landing page ${idx + 1} editing`);
          return withRetry(
            () => withTimeout(
              generateText({
                model: aiModel,
                messages: [
                  { role: 'system', content: landingSystemPrompt },
                  { role: 'user', content: landingUserPrompt }
                ],
                temperature: 0.3,  // Lower temperature for more consistent JSON output
              }),
              30000  // 30 second timeout
            ),
            `Phishing landing page ${idx + 1} editing`
          );
        });
      }

      // 3c. Parallel execution - email + all landing pages
      const allResults = await Promise.allSettled([
        emailPromise,
        ...landingPagePromises
      ]);

      // Extract email result
      const emailResult = allResults[0];
      if (emailResult.status !== 'fulfilled') {
        logger.error('Email editing failed', { reason: emailResult.reason });
        return {
          success: false,
          error: 'Email editing failed after retries',
          message: '❌ Failed to edit email template. Please try again.'
        };
      }

      const emailResponse = emailResult.value;

      // 3d. Parse and validate email response
      logger.info('Email response received, parsing and validating...');
      let editedEmail: z.infer<typeof emailResponseSchema>;
      try {
        const emailCleanedJson = cleanResponse(emailResponse.text, 'phishing-edit-email');
        const parsed = JSON.parse(emailCleanedJson);
        editedEmail = emailResponseSchema.parse(parsed);  // Validate against schema
        logger.debug('Email response validated successfully', { subject: editedEmail.subject });
      } catch (parseErr) {
        const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        logger.error('Email response parsing or validation failed', {
          error: errMsg,
          responsePreview: emailResponse.text.substring(0, 200)
        });
        return {
          success: false,
          error: 'Email response validation failed',
          message: `❌ Email validation error: ${errMsg}`
        };
      }

      // 3e. Parse and validate landing page responses (each page separate)
      const editedLandingPages: z.infer<typeof landingPageResponseSchema>[] = [];
      const landingResults = allResults.slice(1);
      if (landingResults.length > 0) {
        logger.info(`Landing page responses received, parsing and validating ${landingResults.length} pages...`);
        const landingPageResults = landingResults
          .map((result, idx) => {
            if (result.status !== 'fulfilled') {
              logger.warn(`Landing page ${idx + 1} editing failed, skipping`, { reason: result.reason });
              return null;
            }
            try {
              const response = result.value;
              const pageCleanedJson = cleanResponse(response.text, `phishing-edit-landing-${idx}`);
              const parsed = JSON.parse(pageCleanedJson);

              // Validate against schema
              const validated = landingPageResponseSchema.parse(parsed);
              logger.debug(`Landing page ${idx + 1} validated successfully`, { type: validated.type });
              return validated;
            } catch (parseErr) {
              const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
              logger.warn(`Landing page ${idx + 1} parsing or validation error, skipping`, {
                error: errMsg
              });
              return null;
            }
          })
          .filter((page): page is z.infer<typeof landingPageResponseSchema> => page !== null);

        editedLandingPages.push(...landingPageResults);
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

      // 3a. Validate email fields
      if (!editedEmail.subject || typeof editedEmail.subject !== 'string' || editedEmail.subject.trim() === '') {
        logger.error('LLM response invalid subject', { editedEmail });
        return {
          success: false,
          error: 'LLM response missing or invalid subject',
          message: '❌ Edit failed: Invalid email subject. Please try again.'
        };
      }

      if (editedEmail.template === undefined || editedEmail.template === null) {
        logger.error('LLM response missing template field', { editedEmail });
        return {
          success: false,
          error: 'LLM response missing template field',
          message: '❌ Edit failed: LLM did not return a valid template. Please try again.'
        };
      }

      if (typeof editedEmail.template !== 'string' || editedEmail.template.trim() === '') {
        logger.error('LLM returned empty template', { editedEmail });
        return {
          success: false,
          error: 'LLM returned empty template',
          message: `❌ Edit failed: No changes were made. LLM says: "${editedEmail.summary || 'Unable to edit'}". Please try a different instruction.`
        };
      }

      // Validate HTML structure (should contain basic HTML tags)
      const templateStr = editedEmail.template;
      if (!templateStr.includes('<html') && !templateStr.includes('<body')) {
        logger.warn('Template missing HTML structure tags', { templateLength: templateStr.length });
        // Don't fail, but log warning
      }

      // 3b. Use returned template
      const finalTemplate = editedContent.template;

      // 3c. Sanitize HTML
      const sanitizedTemplate = normalizeEmailNestedTablePadding(sanitizeHtml(finalTemplate));

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
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        phishingId,
        editInstruction,
        step: 'phishing-template-edit',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Phishing editor error', errorInfo);

      return {
        ...createToolErrorResponse(errorInfo),
        message: '❌ Failed to edit phishing template. Please try again or provide a different instruction.'
      };
    }
  }
});
