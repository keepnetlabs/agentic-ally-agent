import { createStep, createWorkflow } from '@mastra/core/workflows';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { sanitizeHtml } from '../utils/content-processors/html-sanitizer';
import { v4 as uuidv4 } from 'uuid';
import { LANDING_PAGE, STRING_TRUNCATION } from '../constants';
import { KVService } from '../services/kv-service';
import {
  detectIndustry,
  fixBrokenImages,
  validateLandingPage,
  logValidationResults
} from '../utils/landing-page';
import { streamDirectReasoning } from '../utils/core/reasoning-stream';
import {
  InputSchema,
  AnalysisSchema,
  EmailOutputSchema,
  OutputSchema
} from '../schemas/phishing-workflow-schemas';
import {
  buildAnalysisPrompts,
  buildEmailPrompts,
  buildLandingPagePrompts
} from '../utils/prompt-builders/phishing-prompts';
import { resolveLogoAndBrand, generateContextualBrand } from '../utils/phishing/brand-resolver';
import { DEFAULT_GENERIC_LOGO, normalizeImgAttributes } from '../utils/landing-page/image-validator';
import { retryGenerationWithStrongerPrompt } from '../utils/phishing/retry-generator';
import { getLogger } from '../utils/core/logger';
import { waitForKVConsistency, buildExpectedPhishingKeys } from '../utils/kv-consistency';
import { withRetry } from '../utils/core/resilience-utils';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';

// --- Steps ---

// Step 1: Analyze Request & Design Scenario
const analyzeRequest = createStep({
  id: 'analyze-phishing-request',
  description: 'Analyze phishing request, design scenario, detect brand/logo, and determine industry design',
  inputSchema: InputSchema,
  outputSchema: AnalysisSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('AnalyzePhishingRequest');
    const { topic, isQuishing, targetProfile, difficulty, language, method, includeLandingPage, includeEmail, additionalContext, modelProvider, model, policyContext } = inputData;

    logger.info('Starting phishing scenario analysis', { topic, isQuishing, difficulty, language, method, includeLandingPage, includeEmail });

    const aiModel = getModelWithOverride(modelProvider, model);

    // Agent determines isQuishing - use it directly (no pre-check needed)
    const isQuishingDetected = isQuishing || false;

    if (isQuishingDetected) {
      logger.info('✅ Quishing detected by agent - will use quishing-specific prompts');
    } else {
      logger.info('❌ Normal phishing - will use normal phishing prompts');
    }

    // Build prompts using prompt builder (pass quishing detection result from agent)
    const { systemPrompt, userPrompt, additionalContextMessage } = buildAnalysisPrompts({
      topic,
      difficulty,
      language,
      method,
      targetProfile,
      additionalContext,
      isQuishingDetected,
      policyContext,
    });

    logger.info('Analysis prompt type', {
      promptType: isQuishingDetected ? 'QUISHING' : 'NORMAL_PHISHING',
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length
    });

    // Build messages array
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add additionalContext as a separate message BEFORE the task prompt (index 1)
    // This way LLM sees the user behavior context first, then designs the scenario accordingly
    if (additionalContextMessage) {
      messages.push({
        role: 'user',
        content: additionalContextMessage
      });
    }

    // Add the main task prompt (after context, so LLM can adapt the scenario based on context)
    messages.push({ role: 'user', content: userPrompt });

    try {
      const response = await withRetry(
        async () => {
          return await generateText({
            model: aiModel,
            messages,
            temperature: 0.7,
          });
        },
        'phishing-scenario-analysis'
      );

      // Extract reasoning if available (Workers AI returns it)
      const reasoning = (response as any).response?.body?.reasoning;
      if (reasoning && inputData.writer) {
        logger.info('Streaming scenario reasoning to frontend');
        // Stream reasoning directly without LLM processing
        await streamDirectReasoning(reasoning, inputData.writer);
      }

      logger.info('AI generated phishing scenario successfully');
      const cleanedJson = cleanResponse(response.text, 'phishing-analysis');
      const parsedResult = JSON.parse(cleanedJson);

      // Validate required fields
      if (!parsedResult.scenario || !parsedResult.category || !parsedResult.fromAddress || !parsedResult.method) {
        const errorInfo = errorService.validation('Missing required fields in analysis response', {
          hasScenario: !!parsedResult.scenario,
          hasCategory: !!parsedResult.category,
          hasFromAddress: !!parsedResult.fromAddress,
          hasMethod: !!parsedResult.method
        });
        logErrorInfo(logger, 'error', 'Phishing analysis validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      // Validate description length (max 300 characters)
      if (parsedResult.description && parsedResult.description.length > 300) {
        logger.warn('Description exceeds 300 characters, truncating', {
          originalLength: parsedResult.description.length,
          microlearningId: parsedResult.microlearningId
        });
        parsedResult.description = parsedResult.description.substring(0, 300).trim();
      }

      // Ensure isQuishing is set (prioritize agent's decision, fallback to AI's output, default to false)
      if (typeof inputData.isQuishing === 'boolean') {
        // Agent explicitly set isQuishing - use it (overrides AI's decision if different)
        parsedResult.isQuishing = inputData.isQuishing;
        logger.info('Using agent-provided isQuishing flag', {
          topic: inputData.topic,
          isQuishing: parsedResult.isQuishing,
          agentProvided: true
        });
      } else if (typeof parsedResult.isQuishing !== 'boolean') {
        // Neither agent nor AI provided it - default to false
        logger.warn('isQuishing not provided by agent or AI, defaulting to false', { topic: inputData.topic });
        parsedResult.isQuishing = false;
      } else {
        // AI provided it, agent didn't - use AI's decision
        logger.info('Using AI-provided isQuishing flag', {
          topic: inputData.topic,
          isQuishing: parsedResult.isQuishing,
          agentProvided: false
        });
      }

      // Log generated scenario for debugging
      logger.info('Generated Scenario', {
        scenario: parsedResult.scenario,
        category: parsedResult.category,
        method: parsedResult.method,
        sender: parsedResult.fromName,
        fromAddress: parsedResult.fromAddress,
        triggers: parsedResult.psychologicalTriggers?.join(', ')
      });

      // Resolve logo and brand detection early (once, in analysis step)
      logger.info('Detecting brand and resolving logo URL');
      let logoInfo = await resolveLogoAndBrand(parsedResult.fromName, parsedResult.scenario, aiModel);

      // If brand detection failed, sometimes generate a contextual brand name and logo based on analysis
      // This adds variety and makes phishing simulations more realistic
      if (!logoInfo.isRecognizedBrand && Math.random() < 0.5) {
        logger.info('Brand detection failed, generating contextual brand based on analysis');
        const contextualBrandInfo = await generateContextualBrand(
          parsedResult.scenario,
          parsedResult.category,
          parsedResult.fromName,
          aiModel
        );

        // If contextual brand was generated successfully, use it
        if (contextualBrandInfo.brandName) {
          logoInfo = contextualBrandInfo;
          logger.info('Using generated contextual brand', {
            brandName: logoInfo.brandName,
            logoUrlPrefix: logoInfo.logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH)
          });
        }
      }

      logger.info('Brand detection complete', {
        brandName: logoInfo.brandName || 'Generic',
        logoUrlPrefix: logoInfo.logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH),
        isRecognizedBrand: logoInfo.isRecognizedBrand
      });

      // Detect industry once in analysis step (avoid duplicate calls in email/landing page steps)
      logger.info('Detecting industry for consistent branding');
      let industryDesign = await detectIndustry(parsedResult.fromName, parsedResult.scenario, aiModel);

      // Override with brand colors if available (more accurate for recognized brands)
      if (logoInfo.brandColors && logoInfo.isRecognizedBrand) {
        industryDesign = {
          ...industryDesign,
          colors: {
            primary: logoInfo.brandColors.primary,
            secondary: logoInfo.brandColors.secondary,
            accent: logoInfo.brandColors.accent,
            gradient: `linear-gradient(135deg, ${logoInfo.brandColors.primary}, ${logoInfo.brandColors.accent})`,
          }
        };
        logger.info('Using brand colors for industry design', {
          brandName: logoInfo.brandName,
          primary: logoInfo.brandColors.primary,
          secondary: logoInfo.brandColors.secondary,
          accent: logoInfo.brandColors.accent
        });
      } else {
        logger.info('Using detected industry design', { industry: industryDesign.industry });
      }

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
        policyContext,
        // Brand detection results
        logoUrl: logoInfo.logoUrl,
        brandName: logoInfo.brandName,
        isRecognizedBrand: logoInfo.isRecognizedBrand,
        brandColors: logoInfo.brandColors, // Brand colors if available
        // Industry design (detected once, reused in email/landing page steps)
        industryDesign: industryDesign,
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Phishing analysis step failed', { error: err.message, stack: err.stack });
      throw new Error(`Phishing analysis workflow error: ${err.message}`);
    }
  },
});

// Step 2: Generate Email Content
const generateEmail = createStep({
  id: 'generate-phishing-email',
  inputSchema: AnalysisSchema,
  outputSchema: EmailOutputSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('GeneratePhishingEmail');
    const analysis = inputData;
    const { language, modelProvider, model, difficulty, includeEmail, includeLandingPage, industryDesign, policyContext } = analysis;

    // If email generation is disabled, skip this step but pass context
    if (includeEmail === false) {
      logger.info('Email generation disabled by user request. Skipping.');
      return {
        subject: undefined,
        template: undefined,
        fromAddress: analysis.fromAddress,
        fromName: analysis.fromName,
        analysis,
        includeLandingPage,
        policyContext: analysis.policyContext
      };
    }

    logger.info('Starting phishing email content generation', { scenario: analysis.scenario, language, method: analysis.method, difficulty });

    // Validate industry design from analysis step (already detected, no need to call again)
    if (!industryDesign) {
      throw new Error('Industry design missing from analysis step');
    }
    logger.info('Using industry design from analysis', { industry: industryDesign.industry });

    const aiModel = getModelWithOverride(modelProvider, model);

    // Build prompts using prompt builder
    const { systemPrompt, userPrompt } = buildEmailPrompts({
      analysis,
      difficulty: difficulty || 'Medium',
      language: language || 'en',
      industryDesign,
      policyContext,
    });

    try {
      // First attempt with automatic retry (withRetry handles transient errors)
      let response;
      let parsedResult;

      try {
        response = await withRetry(
          async () => {
            return await generateText({
              model: aiModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.8
            });
          },
          'phishing-email-generation'
        );

        // Extract reasoning if available (Workers AI returns it)
        const emailReasoning = (response as any).response?.body?.reasoning;
        if (emailReasoning && analysis.writer) {
          logger.info('Streaming email generation reasoning to frontend');
          // Stream reasoning directly without LLM processing
          await streamDirectReasoning(emailReasoning, analysis.writer);
        }

        logger.info('AI generated phishing email content successfully');
        const cleanedJson = cleanResponse(response.text, 'phishing-email-content');
        parsedResult = JSON.parse(cleanedJson);
      } catch (error) {
        // Level 2 fallback: Retry with stronger prompt (for JSON parse errors, content issues)
        const err = normalizeError(error);
        logger.warn('Primary generation failed, using stronger prompt retry', {
          error: err.message
        });
        const retryResult = await retryGenerationWithStrongerPrompt(
          aiModel,
          systemPrompt,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          'email',
          analysis.writer
        );
        response = retryResult.response;
        parsedResult = retryResult.parsedResult;
      }

      // Sanitize HTML content to fix quoting/escaping issues
      if (parsedResult.template) {
        let cleanedTemplate = sanitizeHtml(parsedResult.template);

        // Replace {CUSTOMMAINLOGO} tag with actual logo URL (same as landing pages)
        if (cleanedTemplate.includes('{CUSTOMMAINLOGO}')) {
          const logoUrl = analysis.logoUrl || DEFAULT_GENERIC_LOGO;
          // Replace {CUSTOMMAINLOGO} tag with logo URL
          cleanedTemplate = cleanedTemplate.replace(/src=['"]\{CUSTOMMAINLOGO\}['"]/gi, `src='${logoUrl}'`);
          // Also handle cases where tag might be in the value without quotes (edge case)
          cleanedTemplate = cleanedTemplate.replace(/\{CUSTOMMAINLOGO\}/g, logoUrl);
          logger.info('Replaced CUSTOMMAINLOGO tag in email template with logo URL', {
            logoUrlPrefix: logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT),
            truncated: logoUrl.length > STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT
          });
        }

        // NOTE: {QRCODEURLIMAGE} placeholder is NOT replaced here - backend will replace it with actual QR code URL
        // fixBrokenImages will skip placeholder validation (preserves {QRCODEURLIMAGE} and {CUSTOMMAINLOGO})

        // Fix broken images with real HTTP validation (same as landing pages)
        // This runs AFTER replace/normalize
        // fixBrokenImages will skip any placeholders (merge tags like {QRCODEURLIMAGE}, {CUSTOMMAINLOGO})
        cleanedTemplate = await fixBrokenImages(cleanedTemplate, analysis.fromName);

        parsedResult.template = cleanedTemplate;
      }

      // Validate required fields
      if (!parsedResult.subject || !parsedResult.template) {
        const errorInfo = errorService.validation('Missing required fields (subject or template) in email content response', {
          hasSubject: !!parsedResult.subject,
          hasTemplate: !!parsedResult.template
        });
        logErrorInfo(logger, 'error', 'Email content validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      // Log generated content for debugging
      logger.info('Generated Email', {
        subject: parsedResult.subject,
        templatePreview: parsedResult.template
      });

      return {
        ...parsedResult,
        fromAddress: analysis.fromAddress,
        fromName: analysis.fromName,
        analysis: inputData, // Include the analysis in the final output for transparency
        additionalContext: analysis.additionalContext, // Also pass directly for easier access
        includeLandingPage: analysis.includeLandingPage,
        policyContext: analysis.policyContext
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Phishing email generation step failed', { error: err.message, stack: err.stack });
      throw new Error(`Phishing email generation workflow error: ${err.message}`);
    }
  },
});

// Step 3: Generate Landing Page
// NOTE: Landing page generation is STANDARD for both normal phishing and quishing.
// No special handling for isQuishing - same quality and standards apply.
const generateLandingPage = createStep({
  id: 'generate-landing-page',
  inputSchema: EmailOutputSchema,
  outputSchema: OutputSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('GenerateLandingPage');
    const { analysis, fromAddress, fromName, subject, template, includeLandingPage, additionalContext, policyContext } = inputData;

    // If landing page generation is disabled, skip this step
    if (includeLandingPage === false) {
      logger.info('Landing page generation disabled by user request. Skipping.');
      return {
        subject,
        template,
        fromAddress,
        fromName,
        analysis,
        policyContext: inputData.policyContext,
      };
    }

    if (!analysis) {
      const errorInfo = errorService.validation('Analysis data missing from previous step', { step: 'generate-landing-page' });
      logErrorInfo(logger, 'error', 'Analysis data validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

    const { language, modelProvider, model, difficulty, method, scenario, name, description, industryDesign } = analysis;

    logger.info('Starting landing page generation', { method, difficulty });

    // Validate industry design from analysis step (already detected, no need to call again)
    if (!industryDesign) {
      const errorInfo = errorService.validation('Industry design missing from analysis step', { step: 'generate-landing-page' });
      logErrorInfo(logger, 'error', 'Industry design validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }
    logger.info('Using industry design from analysis', { industry: industryDesign.industry });

    const aiModel = getModelWithOverride(modelProvider, model);

    // Determine required pages based on method
    const requiredPages = (LANDING_PAGE.FLOWS[method as keyof typeof LANDING_PAGE.FLOWS] || LANDING_PAGE.FLOWS['Click-Only']) as readonly string[];

    // Use brand info from analysis (already detected in analyzeRequest step)
    let emailBrandContext = '';
    if (analysis.isRecognizedBrand && analysis.brandName) {
      emailBrandContext = `\n**EMAIL CONTEXT - BRAND MENTIONED:**\nThe email references: ${analysis.brandName}\n**CRITICAL:** Match the landing page design style to this brand's authentic look and feel.`;
      logger.info('Using recognized brand from analysis', { brandName: analysis.brandName });
    }

    // Build prompts using prompt builder
    const { systemPrompt, userPrompt, userContextMessage, emailContextMessage } = buildLandingPagePrompts({
      fromName,
      fromAddress,
      scenario,
      language: language || 'en',
      industryDesign,
      requiredPages,
      emailBrandContext,
      subject,
      template,
      additionalContext: additionalContext || analysis.additionalContext,
      isQuishing: analysis.isQuishing || false,
      policyContext,
    });

    // Build messages array with multi-message pattern for targeted context
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add user behavior context FIRST (before email context) so landing page design is informed by user analysis
    if (userContextMessage) {
      messages.push({
        role: 'user',
        content: userContextMessage
      });
    }

    // Add email context as separate message (for logo/brand consistency)
    if (emailContextMessage) {
      messages.push({
        role: 'user',
        content: emailContextMessage
      });
    }

    // Add the main task prompt (after context, so LLM can adapt the scenario based on context)
    messages.push({
      role: 'user',
      content: userPrompt
    });

    let response;
    let parsedResult;

    try {
      try {
        response = await withRetry(
          async () => {
            return await generateText({
              model: aiModel,
              messages: messages,
              temperature: 0.8,
            });
          },
          'phishing-landing-page-generation'
        );

        // Reasoning handling
        const lpReasoning = (response as any).response?.body?.reasoning;
        if (lpReasoning && analysis.writer) {
          await streamDirectReasoning(lpReasoning, analysis.writer);
        }

        const cleanedJson = cleanResponse(response.text, 'landing-page');
        parsedResult = JSON.parse(cleanedJson);
      } catch (error) {
        // Level 2 fallback: Retry with stronger prompt (for JSON parse errors, content issues)
        const err = normalizeError(error);
        logger.warn('Primary landing page generation failed, using stronger prompt retry', {
          error: err.message
        });
        const retryResult = await retryGenerationWithStrongerPrompt(
          aiModel,
          systemPrompt,
          messages,
          'landing-page',
          analysis.writer
        );
        response = retryResult.response;
        parsedResult = retryResult.parsedResult;
      }

      // Sanitize HTML, fix broken images, enforce email logo, and validate for all pages
      if (parsedResult.pages && Array.isArray(parsedResult.pages)) {
        parsedResult.pages = await Promise.all(
          parsedResult.pages.map(async (page: any) => {
            // Step 1: Sanitize HTML
            let cleanedTemplate = sanitizeHtml(page.template);

            // Step 2: Replace {CUSTOMMAINLOGO} tag FIRST (before fixBrokenImages)
            if (cleanedTemplate.includes('{CUSTOMMAINLOGO}')) {
              const logoUrl = analysis.logoUrl || DEFAULT_GENERIC_LOGO;
              // Replace {CUSTOMMAINLOGO} tag with logo URL
              cleanedTemplate = cleanedTemplate.replace(/src=['"]\{CUSTOMMAINLOGO\}['"]/gi, `src='${logoUrl}'`);
              // Also handle cases where tag might be in the value without quotes (edge case)
              cleanedTemplate = cleanedTemplate.replace(/\{CUSTOMMAINLOGO\}/g, logoUrl);
              // Normalize img attributes and add centering styles
              cleanedTemplate = normalizeImgAttributes(cleanedTemplate);
              logger.info('Replaced CUSTOMMAINLOGO tag in landing page with logo from analysis', {
                logoUrlPrefix: logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT),
                truncated: logoUrl.length > STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT
              });
            }

            // Step 3: Fix broken images with real HTTP validation
            // This runs AFTER replace/normalize
            cleanedTemplate = await fixBrokenImages(cleanedTemplate, fromName);

            // Step 4: Validate HTML structure and required elements
            const validationResult = validateLandingPage(cleanedTemplate, page.type);
            logValidationResults(validationResult, page.type);

            // If validation fails due to CSS patterns, log but continue
            // (We've already tried our best with explicit negative examples)
            if (!validationResult.isValid) {
              logger.warn('Landing page validation failed', {
                pageType: page.type,
                errors: validationResult.errors
              });
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
        },
        policyContext: analysis.policyContext
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Landing page generation failed', { error: err.message, stack: err.stack });
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
    const logger = getLogger('SavePhishingContent');
    const phishingId = uuidv4();
    const language = 'en-gb'; // Default language for phishing content

    logger.info('Saving phishing content to KV', { phishingId });

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

    // Verify KV consistency before returning phishing ID
    // Use phishing namespace ID to check consistency
    const expectedKeys = buildExpectedPhishingKeys(
      phishingId,
      language,
      !!inputData.template,
      !!inputData.landingPage
    );
    await waitForKVConsistency(phishingId, expectedKeys, 'f6609d79aa2642a99584b05c64ecaa9f');

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
