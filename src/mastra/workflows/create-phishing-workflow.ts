import { createStep, createWorkflow } from '@mastra/core/workflows';
import { trackedGenerateText } from '../utils/core/tracked-generate';
import { reasoningHeaders } from '../model-providers';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { generateUniqueId } from '../utils/core/id-utils';
import { LANDING_PAGE, STRING_TRUNCATION, KV_NAMESPACES } from '../constants';
import { KVService } from '../services/kv-service';
import {
  detectIndustry,
  fixBrokenImages,
  validateLandingPage,
  hasRetryableLandingQualitySignals,
  logValidationResults,
} from '../utils/landing-page';
import { streamDirectReasoning } from '../utils/core/reasoning-stream';
import { extractReasoning } from '../utils/core/ai-utils';
import {
  createPhishingStepInputSchema,
  createPhishingAnalysisSchema,
  createPhishingEmailOutputSchema,
  createPhishingOutputSchema,
  PHISHING_AUDIENCE_MODES,
  PHISHING_JOURNEY_TYPES,
  PHISHING_OFFER_MECHANICS,
  PHISHING_BRAND_INTENTS,
  PHISHING_BRAND_CONFIDENCE_LEVELS,
} from '../schemas/create-phishing-schemas';
import {
  buildAnalysisPrompts,
  buildEmailPrompts,
  buildLandingPagePrompts,
} from '../utils/prompt-builders/phishing-prompts';
import { resolveLogoAndBrand, generateContextualBrand } from '../utils/phishing/brand-resolver';
import {
  DEFAULT_GENERIC_LOGO,
  normalizeImgAttributes,
  validateImageUrlCached,
} from '../utils/landing-page/image-validator';
import { retryGenerationWithStrongerPrompt } from '../utils/phishing/retry-generator';
import { getLogger } from '../utils/core/logger';
import { waitForKVConsistency, buildExpectedPhishingKeys } from '../utils/kv-consistency';
import { withRetry } from '../utils/core/resilience-utils';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { ProductService } from '../services/product-service';
import {
  postProcessPhishingEmailHtml,
  postProcessPhishingLandingHtml,
} from '../utils/content-processors/phishing-html-postprocessors';
import { repairBrokenLandingFormControlAttrs } from '../utils/content-processors/landing-form-style-preserver';
import { PHISHING_SCENARIO_PARAMS, PHISHING_CONTENT_PARAMS, PHISHING_LANDING_PARAMS } from '../utils/config/llm-generation-params';
import { emitWorkflowStep } from '../utils/core/stream-progress';
import type { StreamWriter } from '../types/stream-writer';

type LandingPageType = (typeof LANDING_PAGE.PAGE_TYPES)[number];

const PHISHING_TOTAL_STEPS = 4;
const PHISHING_WORKFLOW_NAME = 'create-phishing';
const BRAND_SIGNAL_LIST_LIMIT = 3;

function normalizeAllowedValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmedValue = value.trim();
  return (allowedValues as readonly string[]).includes(trimmedValue) ? (trimmedValue as T[number]) : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeOptionalStringList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
    .slice(0, maxItems);
}

function normalizeAnalysisBrandSignals(rawBrandSignals: unknown) {
  const safeBrandSignals =
    rawBrandSignals && typeof rawBrandSignals === 'object'
      ? (rawBrandSignals as Record<string, unknown>)
      : {};

  const normalizedBrandSignals = {
    brandIntent: normalizeAllowedValue(
      safeBrandSignals.brandIntent,
      PHISHING_BRAND_INTENTS,
      'generic'
    ),
    canonicalBrandName: normalizeOptionalString(safeBrandSignals.canonicalBrandName),
    localizedBrandSurface: normalizeOptionalString(safeBrandSignals.localizedBrandSurface),
    brandEvidence: normalizeOptionalStringList(safeBrandSignals.brandEvidence, BRAND_SIGNAL_LIST_LIMIT),
    candidateDomains: normalizeOptionalStringList(safeBrandSignals.candidateDomains, BRAND_SIGNAL_LIST_LIMIT),
    brandConfidence: normalizeAllowedValue(
      safeBrandSignals.brandConfidence,
      PHISHING_BRAND_CONFIDENCE_LEVELS,
      'low'
    ),
    scriptOrLocaleHint: normalizeOptionalString(safeBrandSignals.scriptOrLocaleHint),
  };

  const hasMeaningfulBrandSignals =
    normalizedBrandSignals.brandIntent !== 'generic' ||
    !!normalizedBrandSignals.canonicalBrandName ||
    !!normalizedBrandSignals.localizedBrandSurface ||
    normalizedBrandSignals.brandEvidence.length > 0 ||
    normalizedBrandSignals.candidateDomains.length > 0 ||
    !!normalizedBrandSignals.scriptOrLocaleHint;

  return hasMeaningfulBrandSignals ? normalizedBrandSignals : undefined;
}

function normalizeAnalysisScenarioMetadata(parsedResult: Record<string, unknown>): void {
  parsedResult.audienceMode = normalizeAllowedValue(
    parsedResult.audienceMode,
    PHISHING_AUDIENCE_MODES,
    'general'
  );
  parsedResult.journeyType = normalizeAllowedValue(
    parsedResult.journeyType,
    PHISHING_JOURNEY_TYPES,
    'generic'
  );
  parsedResult.offerMechanic = normalizeAllowedValue(
    parsedResult.offerMechanic,
    PHISHING_OFFER_MECHANICS,
    'generic'
  );
  parsedResult.brandSignals = normalizeAnalysisBrandSignals(parsedResult.brandSignals);
}

/** Emit a phishing workflow step event (safe no-op if writer is undefined) */
async function emitPhishingStep(writer: StreamWriter | undefined, runId: string, stepIndex: number, status: 'running' | 'completed' | 'error', stepName: string, message?: string) {
  await emitWorkflowStep(writer, { workflowRunId: runId, workflowName: PHISHING_WORKFLOW_NAME, stepIndex, totalSteps: PHISHING_TOTAL_STEPS, stepName, status, message });
}

// --- Steps ---

// Step 1: Analyze Request & Design Scenario
const analyzeRequest = createStep({
  id: 'analyze-phishing-request',
  description: 'Analyze phishing request, design scenario, detect brand/logo, and determine industry design',
  // v1: Use step schema with resolved types (defaults applied)
  inputSchema: createPhishingStepInputSchema,
  outputSchema: createPhishingAnalysisSchema,
  execute: async ({ inputData, requestContext }) => {
    const logger = getLogger('AnalyzePhishingRequest');
    const writer = requestContext?.get('writer') as StreamWriter | undefined;
    const _wfRunId = crypto.randomUUID();
    requestContext?.set('_wfRunId', _wfRunId);
    await emitPhishingStep(writer, _wfRunId, 0, 'running', 'Designing scenario', 'Analyzing topic, detecting brand and industry...');

    const {
      topic,
      isQuishing,
      targetProfile,
      difficulty,
      language,
      method,
      includeLandingPage,
      includeEmail,
      behavioralProfile,
      additionalContext,
      modelProvider,
      model,
      policyContext,
    } = inputData;

    logger.info('Starting phishing scenario analysis', {
      topic,
      isQuishing,
      difficulty,
      language,
      method,
      includeLandingPage,
      includeEmail,
    });

    // Fetch whitelabeling config for potential logo fallback
    const productService = new ProductService();
    let whitelabelConfig: { mainLogoUrl?: string } | null = null;
    try {
      whitelabelConfig = await productService.getWhitelabelingConfig();
    } catch (err) {
      const normalized = normalizeError(err);
      const errorInfo = errorService.external(normalized.message, {
        step: 'fetch-whitelabel-config',
        stack: normalized.stack,
      });
      logErrorInfo(logger, 'warn', 'Failed to fetch whitelabeling config', errorInfo);
    }

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
      behavioralProfile,
      additionalContext,
      isQuishingDetected,
      policyContext,
    });

    logger.info('Analysis prompt type', {
      promptType: isQuishingDetected ? 'QUISHING' : 'NORMAL_PHISHING',
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    // Build messages array
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [{ role: 'system', content: systemPrompt }];

    // Add additionalContext as a separate message BEFORE the task prompt (index 1)
    // This way LLM sees the user behavior context first, then designs the scenario accordingly
    if (additionalContextMessage) {
      messages.push({
        role: 'user',
        content: additionalContextMessage,
      });
    }

    // Add the main task prompt (after context, so LLM can adapt the scenario based on context)
    messages.push({ role: 'user', content: userPrompt });

    try {
      const response = await withRetry(async () => {
        return await trackedGenerateText('phishing-analysis', {
          model: aiModel,
          messages,
          ...PHISHING_SCENARIO_PARAMS,
          headers: reasoningHeaders(),
        });
      }, 'phishing-scenario-analysis');

      // Extract reasoning if available (Workers AI returns it)
      const reasoning = extractReasoning(response);
      if (reasoning && writer) {
        logger.info('Streaming scenario reasoning to frontend');
        await streamDirectReasoning(reasoning, writer);
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
          hasMethod: !!parsedResult.method,
        });
        logErrorInfo(logger, 'error', 'Phishing analysis validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      // Validate description length (max 300 characters)
      if (parsedResult.description && parsedResult.description.length > 300) {
        logger.warn('Description exceeds 300 characters, truncating', {
          originalLength: parsedResult.description.length,
          microlearningId: parsedResult.microlearningId,
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
          agentProvided: true,
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
          agentProvided: false,
        });
      }

      normalizeAnalysisScenarioMetadata(parsedResult as Record<string, unknown>);

      // Log generated scenario for debugging
      logger.info('Generated Scenario', {
        scenario: parsedResult.scenario,
        category: parsedResult.category,
        method: parsedResult.method,
        sender: parsedResult.fromName,
        fromAddress: parsedResult.fromAddress,
        triggers: parsedResult.psychologicalTriggers?.join(', '),
      });

      // Resolve logo and brand detection early (once, in analysis step)
      logger.info('Detecting brand and resolving logo URL');
      let logoInfo = await resolveLogoAndBrand(
        parsedResult.fromName,
        parsedResult.scenario,
        aiModel,
        undefined,
        inputData.topic,
        parsedResult.brandSignals
      );

      // Validate the resolved logo URL to ensure it's accessible
      // Skip validation for img.logo.dev URLs as they often fail HEAD requests in the backend
      if (logoInfo.logoUrl && logoInfo.logoUrl !== DEFAULT_GENERIC_LOGO && !logoInfo.logoUrl.includes('img.logo.dev')) {
        try {
          // We assume empty/null is invalid
          const isLogoValid = await validateImageUrlCached(logoInfo.logoUrl);
          if (!isLogoValid) {
            logger.warn('Resolved logo URL is invalid/broken - resetting to empty', { url: logoInfo.logoUrl });
            logoInfo.logoUrl = '';
          }
        } catch (e) {
          const err = normalizeError(e);
          const errorInfo = errorService.external(err.message, { step: 'validate-logo-url', stack: err.stack });
          logErrorInfo(logger, 'warn', 'Error validating logo URL - resetting to empty', errorInfo);
          logoInfo.logoUrl = '';
        }
      }

      // ENHANCEMENT: Whitelabel Logo Fallback
      // If the brand is NOT recognized (generic/internal) OR the resolved logo is the generic fallback,
      // OR the resolved logo is BROKEN/INVALID (empty), and we have a whitelabel logo configured, use it.
      // This ensures generic emails (HR, IT, etc.) look like they come from the target organization.
      const useWhitelabelLogo =
        whitelabelConfig?.mainLogoUrl &&
        (!logoInfo.isRecognizedBrand || logoInfo.logoUrl === DEFAULT_GENERIC_LOGO || !logoInfo.logoUrl);

      if (useWhitelabelLogo) {
        const logoUrl = whitelabelConfig?.mainLogoUrl || '';
        logger.info('Using Whitelabel Logo configuration', {
          reason: !logoInfo.isRecognizedBrand ? 'Brand not recognized' : 'Generic/Empty/Broken logo detected',
          logoUrlPrefix: logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH),
        });

        logoInfo.logoUrl = logoUrl;
        // We keep logoInfo.isRecognizedBrand as is (likely false), so downstream logic knows it's not a public brand
      }
      // If brand detection failed and we didn't use whitelabel logo, sometimes generate a contextual brand name and logo
      // This adds variety and makes phishing simulations more realistic
      else if (!logoInfo.isRecognizedBrand && Math.random() < 0.5) {
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
            logoUrlPrefix: logoInfo.logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH),
          });
        }
      }

      logger.info('Brand detection complete', {
        brandName: logoInfo.brandName || 'Generic',
        logoUrlPrefix: logoInfo.logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH),
        isRecognizedBrand: logoInfo.isRecognizedBrand,
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
          },
        };
        logger.info('Using brand colors for industry design', {
          brandName: logoInfo.brandName,
          primary: logoInfo.brandColors.primary,
          secondary: logoInfo.brandColors.secondary,
          accent: logoInfo.brandColors.accent,
        });
      } else {
        logger.info('Using detected industry design', { industry: industryDesign.industry });
      }

      await emitPhishingStep(writer, _wfRunId, 0, 'completed', 'Designing scenario', 'Scenario designed');

      return {
        ...parsedResult,
        behavioralProfile,
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
        brandSignals: parsedResult.brandSignals,
        // Industry design (detected once, reused in email/landing page steps)
        industryDesign: industryDesign,
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        step: 'phishing-analysis',
        stack: err.stack,
      });
      logErrorInfo(logger, 'error', 'Phishing analysis step failed', errorInfo);
      const e = new Error(`Phishing analysis workflow error: ${err.message}`);
      (e as Error & { code?: string }).code = errorInfo.code;
      throw e;
    }
  },
});

// Step 2: Generate Email Content
const generateEmail = createStep({
  id: 'generate-phishing-email',
  description: 'Generate phishing email content including subject, body, and sender details',
  inputSchema: createPhishingAnalysisSchema,
  outputSchema: createPhishingEmailOutputSchema,
  execute: async ({ inputData, requestContext }) => {
    const logger = getLogger('GeneratePhishingEmail');
    const writer = requestContext?.get('writer') as StreamWriter | undefined;
    const _wfRunId = (requestContext?.get('_wfRunId') as string) || '';
    await emitPhishingStep(writer, _wfRunId, 1, 'running', 'Generating email template', 'Creating subject line and HTML body...');

    const analysis = inputData;
    const {
      language,
      modelProvider,
      model,
      difficulty,
      includeEmail,
      includeLandingPage,
      industryDesign,
      policyContext,
    } = analysis;

    // If email generation is disabled, skip this step but pass context
    if (includeEmail === false) {
      logger.info('Email generation disabled by user request. Skipping.');
      await emitPhishingStep(writer, _wfRunId, 1, 'completed', 'Generating email template', 'Skipped (disabled)');
      return {
        subject: undefined,
        template: undefined,
        fromAddress: analysis.fromAddress,
        fromName: analysis.fromName,
        analysis,
        includeLandingPage,
        policyContext: analysis.policyContext,
      };
    }

    logger.info('Starting phishing email content generation', {
      scenario: analysis.scenario,
      language,
      method: analysis.method,
      difficulty,
    });

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
        response = await withRetry(async () => {
          return await trackedGenerateText('phishing-email-generate', {
            model: aiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            ...PHISHING_CONTENT_PARAMS,
            headers: reasoningHeaders(),
          });
        }, 'phishing-email-generation');

        // Extract reasoning if available (Workers AI returns it)
        const emailReasoning = extractReasoning(response);
        if (emailReasoning && writer) {
          logger.info('Streaming email generation reasoning to frontend');
          await streamDirectReasoning(emailReasoning, writer);
        }

        logger.info('AI generated phishing email content successfully');
        const cleanedJson = cleanResponse(response.text, 'phishing-email-content');
        parsedResult = JSON.parse(cleanedJson);
      } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.aiModel(err.message, {
          step: 'phishing-email-primary-generation',
          stack: err.stack,
        });
        logErrorInfo(logger, 'warn', 'Primary generation failed, using stronger prompt retry', errorInfo);
        const retryResult = await retryGenerationWithStrongerPrompt(
          aiModel,
          systemPrompt,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          'email',
          writer
        );
        response = retryResult.response;
        parsedResult = retryResult.parsedResult;
      }

      // Sanitize HTML content to fix quoting/escaping issues
      if (parsedResult.template) {
        let cleanedTemplate = postProcessPhishingEmailHtml({ html: parsedResult.template });

        // Replace {CUSTOMMAINLOGO} tag with actual logo URL (same as landing pages)
        if (cleanedTemplate.includes('{CUSTOMMAINLOGO}')) {
          const logoUrl = analysis.logoUrl || DEFAULT_GENERIC_LOGO;
          // Replace {CUSTOMMAINLOGO} tag with logo URL
          cleanedTemplate = cleanedTemplate.replace(/src=['"]\{CUSTOMMAINLOGO\}['"]/gi, `src='${logoUrl}'`);
          // Also handle cases where tag might be in the value without quotes (edge case)
          cleanedTemplate = cleanedTemplate.replace(/\{CUSTOMMAINLOGO\}/g, logoUrl);
          logger.info('Replaced CUSTOMMAINLOGO tag in email template with logo URL', {
            logoUrlPrefix: logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT),
            truncated: logoUrl.length > STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT,
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
        const errorInfo = errorService.validation(
          'Missing required fields (subject or template) in email content response',
          {
            hasSubject: !!parsedResult.subject,
            hasTemplate: !!parsedResult.template,
          }
        );
        logErrorInfo(logger, 'error', 'Email content validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      // Log generated content for debugging
      logger.info('Generated Email', {
        subject: parsedResult.subject,
        templatePreview: parsedResult.template,
      });

      await emitPhishingStep(writer, _wfRunId, 1, 'completed', 'Generating email template', 'Email template ready');

      return {
        ...parsedResult,
        fromAddress: analysis.fromAddress,
        fromName: analysis.fromName,
        analysis: inputData, // Include the analysis in the final output for transparency
        additionalContext: analysis.additionalContext, // Also pass directly for easier access
        includeLandingPage: analysis.includeLandingPage,
        policyContext: analysis.policyContext,
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        step: 'phishing-email-generation',
        stack: err.stack,
      });
      logErrorInfo(logger, 'error', 'Phishing email generation step failed', errorInfo);
      const e = new Error(`Phishing email generation workflow error: ${err.message}`);
      (e as Error & { code?: string }).code = errorInfo.code;
      throw e;
    }
  },
});

// Step 3: Generate Landing Page
// NOTE: Landing page generation is STANDARD for both normal phishing and quishing.
// No special handling for isQuishing - same quality and standards apply.
const generateLandingPage = createStep({
  id: 'generate-landing-page',
  description: 'Generate phishing landing page content including logic and layout',
  inputSchema: createPhishingEmailOutputSchema,
  outputSchema: createPhishingOutputSchema,
  execute: async ({ inputData, requestContext }) => {
    const logger = getLogger('GenerateLandingPage');
    const writer = requestContext?.get('writer') as StreamWriter | undefined;
    const _wfRunId = (requestContext?.get('_wfRunId') as string) || '';
    await emitPhishingStep(writer, _wfRunId, 2, 'running', 'Creating landing pages', 'Generating multi-page login forms...');

    const { analysis, fromAddress, fromName, subject, template, includeLandingPage, additionalContext, policyContext } =
      inputData;

    // If landing page generation is disabled, skip this step
    if (includeLandingPage === false) {
      logger.info('Landing page generation disabled by user request. Skipping.');
      await emitPhishingStep(writer, _wfRunId, 2, 'completed', 'Creating landing pages', 'Skipped (disabled)');
      return {
        subject,
        template,
        fromAddress,
        fromName,
        analysis,
        language: analysis.language,
        policyContext: inputData.policyContext,
      };
    }

    if (!analysis) {
      const errorInfo = errorService.validation('Analysis data missing from previous step', {
        step: 'generate-landing-page',
      });
      logErrorInfo(logger, 'error', 'Analysis data validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

    const { language, modelProvider, model, difficulty, method, scenario, name, description, industryDesign } =
      analysis;

    logger.info('Starting landing page generation', { method, difficulty });

    // Validate industry design from analysis step (already detected, no need to call again)
    if (!industryDesign) {
      const errorInfo = errorService.validation('Industry design missing from analysis step', {
        step: 'generate-landing-page',
      });
      logErrorInfo(logger, 'error', 'Industry design validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }
    logger.info('Using industry design from analysis', { industry: industryDesign.industry });

    const aiModel = getModelWithOverride(modelProvider, model);

    // Determine required pages based on method
    const requiredPages = (LANDING_PAGE.FLOWS[method as keyof typeof LANDING_PAGE.FLOWS] ||
      LANDING_PAGE.FLOWS['Click-Only']) as readonly string[];

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
      behavioralProfile: analysis.behavioralProfile,
      isQuishing: analysis.isQuishing || false,
      audienceMode: analysis.audienceMode,
      journeyType: analysis.journeyType,
      offerMechanic: analysis.offerMechanic,
      method: analysis.method,
      policyContext,
    });

    // Build messages array with multi-message pattern for targeted context
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [{ role: 'system', content: systemPrompt }];

    // Add user behavior context FIRST (before email context) so landing page design is informed by user analysis
    if (userContextMessage) {
      messages.push({
        role: 'user',
        content: userContextMessage,
      });
    }

    // Add email context as separate message (for logo/brand consistency)
    if (emailContextMessage) {
      messages.push({
        role: 'user',
        content: emailContextMessage,
      });
    }

    // Add the main task prompt (after context, so LLM can adapt the scenario based on context)
    messages.push({
      role: 'user',
      content: userPrompt,
    });

    let response;
    let parsedResult: { pages?: { type: LandingPageType; template: string }[] };

    const finalizeLandingPages = async (pages: { type: LandingPageType; template: string }[]) => {
      let hasCriticalValidationIssues = false;

      const finalizedPages = await Promise.all(
        pages.map(async (page: { type: LandingPageType; template: string }) => {
          // Step 1: Post-process landing HTML (sanitize/repair/centering/wrapper)
          let cleanedTemplate = postProcessPhishingLandingHtml({ html: page.template, title: `${fromName} Login` });

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
              truncated: logoUrl.length > STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT,
            });
          }

          // Step 3: Fix broken images with real HTTP validation
          // This runs AFTER replace/normalize
          cleanedTemplate = await fixBrokenImages(cleanedTemplate, fromName);

          // Step 3.5: Repair malformed boolean/form control attrs before validation/save.
          cleanedTemplate = repairBrokenLandingFormControlAttrs(cleanedTemplate);

          // Step 4: Validate HTML structure and required elements
          const validationResult = validateLandingPage(cleanedTemplate, page.type, {
            fromName,
            scenario,
            subject,
            isQuishing: analysis.isQuishing || false,
          });
          logValidationResults(validationResult, page.type);

          if (hasRetryableLandingQualitySignals(validationResult)) {
            hasCriticalValidationIssues = true;
            logger.warn('Landing page quality validation flagged retryable issues', {
              pageType: page.type,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
            });
          }

          return {
            ...page,
            template: cleanedTemplate,
          };
        })
      );

      return { finalizedPages, hasCriticalValidationIssues };
    };

    try {
      try {
        response = await withRetry(async () => {
          return await trackedGenerateText('phishing-landing-page', {
            model: aiModel,
            messages: messages,
            ...PHISHING_LANDING_PARAMS,
          });
        }, 'phishing-landing-page-generation');

        // Reasoning handling
        const lpReasoning = extractReasoning(response);
        if (lpReasoning && writer) {
          await streamDirectReasoning(lpReasoning, writer);
        }

        const cleanedJson = cleanResponse(response.text, 'landing-page');
        parsedResult = JSON.parse(cleanedJson);
      } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.aiModel(err.message, {
          step: 'phishing-landing-page-primary-generation',
          stack: err.stack,
        });
        logErrorInfo(logger, 'warn', 'Primary landing page generation failed, using stronger prompt retry', errorInfo);
        const retryResult = await retryGenerationWithStrongerPrompt(
          aiModel,
          systemPrompt,
          messages,
          'landing-page',
          writer
        );
        response = retryResult.response;
        parsedResult = retryResult.parsedResult as typeof parsedResult;
      }

      // Validate page count matches requiredPages — AI sometimes skips the success page
      const returnedTypes = (parsedResult.pages || []).map((p: { type: string }) => p.type);
      const missingPages = requiredPages.filter(rp => !returnedTypes.includes(rp));
      if (missingPages.length > 0) {
        logger.warn('AI returned fewer pages than required, retrying with stronger prompt', {
          required: [...requiredPages],
          returned: returnedTypes,
          missing: [...missingPages],
        });
        const retryResult = await retryGenerationWithStrongerPrompt(
          aiModel,
          systemPrompt,
          messages,
          'landing-page',
          writer
        );
        response = retryResult.response;
        parsedResult = retryResult.parsedResult as typeof parsedResult;

        // Check again after retry
        const retryTypes = (parsedResult.pages || []).map((p: { type: string }) => p.type);
        const stillMissing = requiredPages.filter(rp => !retryTypes.includes(rp));
        if (stillMissing.length > 0) {
          logger.warn('Retry still missing pages, proceeding with available pages', {
            required: [...requiredPages],
            returned: retryTypes,
            stillMissing: [...stillMissing],
          });
        }
      }

      // Sanitize HTML, fix broken images, enforce email logo, and validate for all pages
      if (parsedResult.pages && Array.isArray(parsedResult.pages)) {
        let finalized = await finalizeLandingPages(parsedResult.pages);
        parsedResult.pages = finalized.finalizedPages;

        if (finalized.hasCriticalValidationIssues) {
          logger.warn('Landing page quality issues detected, retrying generation once with stronger prompt');
          const retryResult = await retryGenerationWithStrongerPrompt(
            aiModel,
            systemPrompt,
            messages,
            'landing-page',
            writer
          );
          response = retryResult.response;
          parsedResult = retryResult.parsedResult as typeof parsedResult;

          const retriedPages = Array.isArray(parsedResult.pages) ? parsedResult.pages : [];
          finalized = await finalizeLandingPages(retriedPages);
          parsedResult.pages = finalized.finalizedPages;

          if (finalized.hasCriticalValidationIssues) {
            logger.warn('Landing page still has validation issues after retry, proceeding with best available output');
          }
        }
      }

      const pageCount = parsedResult.pages?.length || 0;
      await emitPhishingStep(writer, _wfRunId, 2, 'completed', 'Creating landing pages', `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} ready`);

      return {
        subject,
        template,
        fromAddress,
        fromName,
        analysis: analysis,
        landingPage: {
          name: name,
          description: description,
          method: method || 'Data-Submission',
          difficulty: difficulty || 'Medium',
          pages: parsedResult.pages || [],
        },
        language,
        policyContext: analysis.policyContext,
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        step: 'landing-page-generation',
        stack: err.stack,
      });
      logErrorInfo(logger, 'error', 'Landing page generation failed', errorInfo);
      const e = new Error(`Landing page generation workflow error: ${err.message}`);
      (e as Error & { code?: string }).code = errorInfo.code;
      throw e;
    }
  },
});

// Step 4: Save to KV
const savePhishingContent = createStep({
  id: 'save-phishing-content',
  description: 'Save generated phishing simulation content to KV store',
  inputSchema: createPhishingOutputSchema, // Use OutputSchema directly as input
  outputSchema: createPhishingOutputSchema,
  execute: async ({ inputData, requestContext }) => {
    const logger = getLogger('SavePhishingContent');
    const writer = requestContext?.get('writer') as StreamWriter | undefined;
    const _wfRunId = (requestContext?.get('_wfRunId') as string) || '';
    await emitPhishingStep(writer, _wfRunId, 3, 'running', 'Saving simulation', 'Persisting to storage...');

    const phishingId = generateUniqueId();
    const language = inputData.language || 'en-gb';

    logger.info('Saving phishing content to KV', { phishingId });

    // Initialize KVService with Phishing Namespace ID
    const kvService = new KVService(KV_NAMESPACES.PHISHING);

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
    const expectedKeys = buildExpectedPhishingKeys(phishingId, language, !!inputData.template, !!inputData.landingPage);
    await waitForKVConsistency(phishingId, expectedKeys, KV_NAMESPACES.PHISHING);

    await emitPhishingStep(writer, _wfRunId, 3, 'completed', 'Saving simulation', 'Simulation saved');

    return {
      ...inputData,
      phishingId,
    };
  },
});

// --- Workflow Definition ---

const createPhishingWorkflow = createWorkflow({
  id: 'create-phishing-workflow',
  description: 'Generate realistic phishing email simulations',
  // v1: Use step schema with resolved types for consistent type flow
  inputSchema: createPhishingStepInputSchema,
  outputSchema: createPhishingOutputSchema,
})
  .then(analyzeRequest)
  .then(generateEmail)
  .then(generateLandingPage)
  .then(savePhishingContent);

createPhishingWorkflow.commit();

export { createPhishingWorkflow };
