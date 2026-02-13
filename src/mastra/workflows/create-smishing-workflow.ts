import { createStep, createWorkflow } from '@mastra/core/workflows';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { generateUniqueId } from '../utils/core/id-utils';
import { LANDING_PAGE, STRING_TRUNCATION, KV_NAMESPACES, SMISHING, PHISHING_EMAIL } from '../constants';
import { KVService } from '../services/kv-service';
import {
  detectIndustry,
  fixBrokenImages,
  validateLandingPage,
  logValidationResults
} from '../utils/landing-page';
import { streamDirectReasoning } from '../utils/core/reasoning-stream';
import { extractReasoning } from '../utils/core/ai-utils';
import {
  createSmishingInputSchema,
  createSmishingAnalysisSchema,
  createSmishingSmsOutputSchema,
  createSmishingOutputSchema
} from '../schemas/create-smishing-schemas';
import {
  buildSmishingAnalysisPrompts,
  buildSmishingSmsPrompts
} from '../utils/prompt-builders/smishing-prompts';
import { resolveLogoAndBrand, generateContextualBrand } from '../utils/phishing/brand-resolver';
import { DEFAULT_GENERIC_LOGO, normalizeImgAttributes, validateImageUrlCached } from '../utils/landing-page/image-validator';
import { getLogger } from '../utils/core/logger';
import { waitForKVConsistency, buildExpectedSmishingKeys } from '../utils/kv-consistency';
import { withRetry } from '../utils/core/resilience-utils';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { ProductService } from '../services/product-service';
import { postProcessPhishingLandingHtml } from '../utils/content-processors/phishing-html-postprocessors';
import { buildLandingPagePrompts } from '../utils/prompt-builders/phishing-prompts';
import { PHISHING_SCENARIO_PARAMS, PHISHING_CONTENT_PARAMS } from '../utils/config/llm-generation-params';

// --- Steps ---

// Step 1: Analyze Request & Design Scenario
const analyzeRequest = createStep({
  id: 'analyze-smishing-request',
  description: 'Analyze smishing request, design scenario, detect brand/logo, and determine industry design',
  inputSchema: createSmishingInputSchema,
  outputSchema: createSmishingAnalysisSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('AnalyzeSmishingRequest');
    const { topic, targetProfile, difficulty, language, method, includeLandingPage, includeSms, additionalContext, modelProvider, model, policyContext } = inputData;

    logger.info('Starting smishing scenario analysis', { topic, difficulty, language, method, includeLandingPage, includeSms });

    // Fetch whitelabeling config for potential logo fallback
    const productService = new ProductService();
    let whitelabelConfig: { mainLogoUrl?: string } | null = null;
    try {
      whitelabelConfig = await productService.getWhitelabelingConfig();
    } catch (err) {
      logger.warn('Failed to fetch whitelabeling config', { error: err });
    }

    const aiModel = getModelWithOverride(modelProvider, model);

    const { systemPrompt, userPrompt, additionalContextMessage } = buildSmishingAnalysisPrompts({
      topic,
      difficulty,
      language,
      method,
      targetProfile,
      additionalContext,
      policyContext,
    });

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    if (additionalContextMessage) {
      messages.push({ role: 'user', content: additionalContextMessage });
    }

    messages.push({ role: 'user', content: userPrompt });

    try {
      const response = await withRetry(
        async () => generateText({
          model: aiModel,
          messages,
          ...PHISHING_SCENARIO_PARAMS,
        }),
        'smishing-scenario-analysis'
      );

      const reasoning = extractReasoning(response);
      if (reasoning && inputData.writer) {
        logger.info('Streaming scenario reasoning to frontend');
        await streamDirectReasoning(reasoning, inputData.writer);
      }

      logger.info('AI generated smishing scenario successfully');
      const cleanedJson = cleanResponse(response.text, 'smishing-analysis');
      const parsedResult = JSON.parse(cleanedJson);

    if (!parsedResult.scenario || !parsedResult.category) {
      const errorInfo = errorService.validation('Missing required fields in analysis response', {
        hasScenario: !!parsedResult.scenario,
        hasCategory: !!parsedResult.category,
      });
      logErrorInfo(logger, 'error', 'Smishing analysis validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

      if (parsedResult.description && parsedResult.description.length > PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH) {
        logger.warn('Description exceeds max length, truncating', {
          originalLength: parsedResult.description.length,
        });
        parsedResult.description = parsedResult.description.substring(0, PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH).trim();
      }

      // Brand detection
      logger.info('Detecting brand and resolving logo URL');
      let logoInfo = await resolveLogoAndBrand(parsedResult.name || parsedResult.scenario, parsedResult.scenario, aiModel);

      if (logoInfo.logoUrl && logoInfo.logoUrl !== DEFAULT_GENERIC_LOGO && !logoInfo.logoUrl.includes('img.logo.dev')) {
        try {
          const isLogoValid = await validateImageUrlCached(logoInfo.logoUrl);
          if (!isLogoValid) {
            logger.warn('Resolved logo URL is invalid/broken - resetting to empty', { url: logoInfo.logoUrl });
            logoInfo.logoUrl = '';
          }
        } catch (e) {
          logger.warn('Error validating logo URL - resetting to empty', { error: e });
          logoInfo.logoUrl = '';
        }
      }

      const useWhitelabelLogo = whitelabelConfig?.mainLogoUrl && (
        !logoInfo.isRecognizedBrand ||
        logoInfo.logoUrl === DEFAULT_GENERIC_LOGO ||
        !logoInfo.logoUrl
      );

      if (useWhitelabelLogo) {
        const logoUrl = whitelabelConfig?.mainLogoUrl || '';
        logger.info('Using Whitelabel Logo configuration', {
          reason: !logoInfo.isRecognizedBrand ? 'Brand not recognized' : 'Generic/Empty/Broken logo detected',
          logoUrlPrefix: logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH)
        });

        logoInfo.logoUrl = logoUrl;
      } else if (!logoInfo.isRecognizedBrand && Math.random() < 0.5) {
        logger.info('Brand detection failed, generating contextual brand based on analysis');
        const contextualBrandInfo = await generateContextualBrand(
          parsedResult.scenario,
          parsedResult.category,
          parsedResult.name || parsedResult.scenario,
          aiModel
        );

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

      // Detect industry once in analysis step
      logger.info('Detecting industry for consistent branding');
      let industryDesign = await detectIndustry(parsedResult.name || parsedResult.scenario, parsedResult.scenario, aiModel);

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
        additionalContext,
        difficulty,
        language,
        includeLandingPage,
        includeSms,
        modelProvider,
        model,
        writer: inputData.writer,
        policyContext,
        // Brand detection results
        logoUrl: logoInfo.logoUrl,
        brandName: logoInfo.brandName,
        isRecognizedBrand: logoInfo.isRecognizedBrand,
        brandColors: logoInfo.brandColors,
        // Industry design
        industryDesign: industryDesign,
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Smishing analysis step failed', { error: err.message, stack: err.stack });
      throw new Error(`Smishing analysis workflow error: ${err.message}`);
    }
  },
});

// Step 2: Generate SMS Content
const generateSms = createStep({
  id: 'generate-smishing-sms',
  description: 'Generate smishing SMS message templates',
  inputSchema: createSmishingAnalysisSchema,
  outputSchema: createSmishingSmsOutputSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('GenerateSmishingSms');
    const analysis = inputData;
    const { language, modelProvider, model, difficulty, includeSms, includeLandingPage } = analysis;

    if (includeSms === false) {
      logger.info('SMS generation disabled by user request. Skipping.');
      return {
        messages: undefined,
        analysis,
        includeLandingPage,
        policyContext: analysis.policyContext
      };
    }

    logger.info('Starting smishing SMS generation', { scenario: analysis.scenario, language, method: analysis.method, difficulty });

    const aiModel = getModelWithOverride(modelProvider, model);
    const { systemPrompt, userPrompt } = buildSmishingSmsPrompts({
      analysis,
      language: language || 'en',
      difficulty: difficulty || SMISHING.DEFAULT_DIFFICULTY,
      includeLandingPage,
    });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    try {
      const response = await withRetry(
        async () => generateText({
          model: aiModel,
          messages,
          ...PHISHING_CONTENT_PARAMS,
        }),
        'smishing-sms-generation'
      );

      const smsReasoning = extractReasoning(response);
      if (smsReasoning && analysis.writer) {
        logger.info('Streaming SMS generation reasoning to frontend');
        await streamDirectReasoning(smsReasoning, analysis.writer);
      }

      const cleanedJson = cleanResponse(response.text, 'smishing-sms');
      let parsedResult = JSON.parse(cleanedJson);

      const hasLink = Array.isArray(parsedResult?.messages)
        && parsedResult.messages.some((msg: string) => msg.includes('{PHISHINGURL}'));

      if (!hasLink) {
        logger.warn('SMS messages missing {PHISHINGURL}. Retrying once with stricter instruction.');
        const retryResponse = await generateText({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt + '\n\nCRITICAL: You MUST include {PHISHINGURL} in one message.' },
            { role: 'user', content: userPrompt + '\n\nIMPORTANT: Include {PHISHINGURL} in one message.' }
          ],
          ...PHISHING_CONTENT_PARAMS,
        });
        const retryJson = cleanResponse(retryResponse.text, 'smishing-sms-retry');
        parsedResult = JSON.parse(retryJson);
      }

      if (!parsedResult.messages || !Array.isArray(parsedResult.messages) || parsedResult.messages.length === 0) {
        const errorInfo = errorService.validation('Missing required messages in SMS response', {
          hasMessages: !!parsedResult.messages,
          messageCount: parsedResult.messages?.length
        });
        logErrorInfo(logger, 'error', 'SMS content validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      const finalHasLink = parsedResult.messages.some((msg: string) => msg.includes('{PHISHINGURL}'));
      if (!finalHasLink) {
        throw new Error('SMS messages must include {PHISHINGURL}');
      }

      return {
        ...parsedResult,
        analysis,
        includeLandingPage: analysis.includeLandingPage,
        policyContext: analysis.policyContext
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Smishing SMS generation step failed', { error: err.message, stack: err.stack });
      throw new Error(`Smishing SMS generation workflow error: ${err.message}`);
    }
  },
});

// Step 3: Generate Landing Page
const generateLandingPage = createStep({
  id: 'generate-smishing-landing-page',
  description: 'Generate smishing landing page content including logic and layout',
  inputSchema: createSmishingSmsOutputSchema,
  outputSchema: createSmishingOutputSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('GenerateSmishingLandingPage');
    const { analysis, messages, includeLandingPage, additionalContext, policyContext } = inputData;

    if (includeLandingPage === false) {
      logger.info('Landing page generation disabled by user request. Skipping.');
      return {
        messages,
        analysis,
        policyContext: inputData.policyContext,
      };
    }

    if (!analysis) {
      const errorInfo = errorService.validation('Analysis data missing from previous step', { step: 'generate-smishing-landing-page' });
      logErrorInfo(logger, 'error', 'Analysis data validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

    const { language, modelProvider, model, difficulty, method, scenario, name, description, industryDesign } = analysis;

    logger.info('Starting smishing landing page generation', { method, difficulty });

    if (!industryDesign) {
      const errorInfo = errorService.validation('Industry design missing from analysis step', { step: 'generate-smishing-landing-page' });
      logErrorInfo(logger, 'error', 'Industry design validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

    const aiModel = getModelWithOverride(modelProvider, model);

    const requiredPages = (LANDING_PAGE.FLOWS[method as keyof typeof LANDING_PAGE.FLOWS] || LANDING_PAGE.FLOWS['Click-Only']) as readonly string[];

    let emailBrandContext = '';
    if (analysis.isRecognizedBrand && analysis.brandName) {
      emailBrandContext = `\n**BRAND MENTIONED:** The SMS references: ${analysis.brandName}\n**CRITICAL:** Match landing page design style to this brand's authentic look and feel.`;
      logger.info('Using recognized brand from analysis', { brandName: analysis.brandName });
    }

    const { systemPrompt, userPrompt, userContextMessage } = buildLandingPagePrompts({
      fromName: analysis.brandName || 'Security Team',
      fromAddress: '',
      scenario,
      language: language || 'en',
      industryDesign,
      requiredPages,
      emailBrandContext,
      additionalContext: additionalContext || analysis.additionalContext,
      isQuishing: false,
      policyContext,
    });

    const messagesToSend: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    if (userContextMessage) {
      messagesToSend.push({ role: 'user', content: userContextMessage });
    }

    messagesToSend.push({ role: 'user', content: userPrompt });

    let response;
    let parsedResult;

    try {
      response = await withRetry(
        async () => generateText({
          model: aiModel,
          messages: messagesToSend,
          ...PHISHING_CONTENT_PARAMS,
        }),
        'smishing-landing-page-generation'
      );

      const lpReasoning = extractReasoning(response);
      if (lpReasoning && analysis.writer) {
        await streamDirectReasoning(lpReasoning, analysis.writer);
      }

      const cleanedJson = cleanResponse(response.text, 'smishing-landing-page');
      parsedResult = JSON.parse(cleanedJson);

      if (parsedResult.pages && Array.isArray(parsedResult.pages)) {
        parsedResult.pages = await Promise.all(
          parsedResult.pages.map(async (page: { type: string; template: string }) => {
            let cleanedTemplate = postProcessPhishingLandingHtml({ html: page.template, title: `${analysis.brandName || 'Secure Portal'} Login` });

            if (cleanedTemplate.includes('{CUSTOMMAINLOGO}')) {
              const logoUrl = analysis.logoUrl || DEFAULT_GENERIC_LOGO;
              cleanedTemplate = cleanedTemplate.replace(/src=['"]\{CUSTOMMAINLOGO\}['"]/gi, `src='${logoUrl}'`);
              cleanedTemplate = cleanedTemplate.replace(/\{CUSTOMMAINLOGO\}/g, logoUrl);
              cleanedTemplate = normalizeImgAttributes(cleanedTemplate);
              logger.info('Replaced CUSTOMMAINLOGO tag in landing page with logo from analysis', {
                logoUrlPrefix: logoUrl.substring(0, STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT),
                truncated: logoUrl.length > STRING_TRUNCATION.LOGO_URL_PREFIX_LENGTH_ALT
              });
            }

            cleanedTemplate = await fixBrokenImages(cleanedTemplate, analysis.brandName || 'Security Team');

            const validationResult = validateLandingPage(cleanedTemplate, page.type);
            logValidationResults(validationResult, page.type);

            if (!validationResult.isValid) {
              logger.warn('Landing page validation failed', {
                pageType: page.type,
                errors: validationResult.errors
              });
            }

            return { ...page, template: cleanedTemplate };
          })
        );
      }

      return {
        messages,
        analysis,
        landingPage: {
          name: name,
          description: description,
          method: method || SMISHING.DEFAULT_ATTACK_METHOD,
          difficulty: difficulty || SMISHING.DEFAULT_DIFFICULTY,
          pages: parsedResult.pages
        },
        policyContext: analysis.policyContext
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Smishing landing page generation failed', { error: err.message, stack: err.stack });
      throw error;
    }
  }
});

// Step 4: Save to KV
const saveSmishingContent = createStep({
  id: 'save-smishing-content',
  description: 'Save generated smishing simulation content to KV store',
  inputSchema: createSmishingOutputSchema,
  outputSchema: createSmishingOutputSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('SaveSmishingContent');
    const smishingId = generateUniqueId();
    const language = inputData.analysis?.language || 'en-gb';

    logger.info('Saving smishing content to KV', { smishingId });

    const kvService = new KVService(KV_NAMESPACES.SMISHING);

    await kvService.saveSmishingBase(smishingId, inputData, language);

    if (inputData.messages) {
      await kvService.saveSmishingSms(smishingId, inputData, language);
    }

    if (inputData.landingPage) {
      await kvService.saveSmishingLandingPage(smishingId, inputData, language);
    }

    const expectedKeys = buildExpectedSmishingKeys(
      smishingId,
      language,
      !!inputData.messages,
      !!inputData.landingPage
    );
    await waitForKVConsistency(smishingId, expectedKeys, KV_NAMESPACES.SMISHING);

    return {
      ...inputData,
      smishingId
    };
  }
});

// --- Workflow Definition ---

const createSmishingWorkflow = createWorkflow({
  id: 'create-smishing-workflow',
  description: 'Generate realistic smishing (SMS) simulations',
  inputSchema: createSmishingInputSchema,
  outputSchema: createSmishingOutputSchema,
})
  .then(analyzeRequest)
  .then(generateSms)
  .then(generateLandingPage)
  .then(saveSmishingContent);

createSmishingWorkflow.commit();

export { createSmishingWorkflow };
