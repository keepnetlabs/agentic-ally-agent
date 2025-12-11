import { createStep, createWorkflow } from '@mastra/core/workflows';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { sanitizeHtml } from '../utils/content-processors/html-sanitizer';
import { v4 as uuidv4 } from 'uuid';
import { LANDING_PAGE } from '../constants';
import { KVService } from '../services/kv-service';
import {
  detectIndustry,
  fixBrokenImages,
  validateLandingPage,
  logValidationResults
} from '../utils/landing-page';
import { streamDirectReasoning } from '../utils/reasoning-stream';
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
import { resolveLogoAndBrand } from '../utils/phishing/brand-resolver';
import { DEFAULT_GENERIC_LOGO, normalizeImgAttributes } from '../utils/landing-page/image-validator';
import { retryGenerationWithStrongerPrompt } from '../utils/phishing/retry-generator';

// --- Steps ---

// Step 1: Analyze Request & Design Scenario
const analyzeRequest = createStep({
  id: 'analyze-phishing-request',
  inputSchema: InputSchema,
  outputSchema: AnalysisSchema,
  execute: async ({ inputData }) => {
    const { topic, targetProfile, difficulty, language, method, includeLandingPage, includeEmail, additionalContext, modelProvider, model } = inputData;

    console.log('🎣 Starting phishing scenario analysis:', { topic, difficulty, language, method, includeLandingPage, includeEmail });

    const aiModel = getModelWithOverride(modelProvider, model);

    // Build prompts using prompt builder
    const { systemPrompt, userPrompt, additionalContextMessage } = buildAnalysisPrompts({
      topic,
      difficulty,
      language,
      method,
      targetProfile,
      additionalContext,
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

      // Resolve logo and brand detection early (once, in analysis step)
      console.log('🎨 Detecting brand and resolving logo URL...');
      const logoInfo = await resolveLogoAndBrand(parsedResult.fromName, parsedResult.scenario, aiModel);
      console.log(`   Brand: ${logoInfo.brandName || 'Generic'}, Logo URL: ${logoInfo.logoUrl.substring(0, 60)}...`);

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
        // Brand detection results
        logoUrl: logoInfo.logoUrl,
        brandName: logoInfo.brandName,
        isRecognizedBrand: logoInfo.isRecognizedBrand,
        brandColors: logoInfo.brandColors, // Brand colors if available
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

    console.log('📧 Starting phishing email content generation:', { scenario: analysis.scenario, language, method: analysis.method, difficulty });

    const aiModel = getModelWithOverride(modelProvider, model);

    // Detect industry for consistent branding with landing page
    let industryDesign = detectIndustry(analysis.fromName, analysis.scenario);

    // Override with brand colors if available (more accurate for recognized brands)
    if (analysis.brandColors && analysis.isRecognizedBrand) {
      industryDesign = {
        ...industryDesign,
        colors: {
          primary: analysis.brandColors.primary,
          secondary: analysis.brandColors.secondary,
          accent: analysis.brandColors.accent,
          gradient: `linear-gradient(135deg, ${analysis.brandColors.primary}, ${analysis.brandColors.accent})`, // Generate gradient from brand colors
        }
      };
      console.log(`🎨 Using brand colors for "${analysis.brandName}": ${analysis.brandColors.primary}, ${analysis.brandColors.secondary}, ${analysis.brandColors.accent}`);
    } else {
      console.log(`🎨 Detected industry for email: ${industryDesign.industry}`);
    }

    // Build prompts using prompt builder
    const { systemPrompt, userPrompt } = buildEmailPrompts({
      analysis,
      difficulty: difficulty || 'Medium',
      language: language || 'en',
      industryDesign,
    });

    try {
      // First attempt
      let response;
      let parsedResult;

      try {
        response = await generateText({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8, // Increased from 0.7 for more creative email variations while maintaining quality
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
        parsedResult = JSON.parse(cleanedJson);
      } catch (error) {
        // Retry with stronger prompt
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

        // Replace {CUSTOMMAINLOGO} tag FIRST (before fixBrokenImages)
        if (cleanedTemplate.includes('{CUSTOMMAINLOGO}')) {
          const logoUrl = analysis.logoUrl || DEFAULT_GENERIC_LOGO;
          // Replace {CUSTOMMAINLOGO} tag with logo URL
          cleanedTemplate = cleanedTemplate.replace(/src=['"]\{CUSTOMMAINLOGO\}['"]/gi, `src='${logoUrl}'`);
          // Also handle cases where tag might be in the value without quotes (edge case)
          cleanedTemplate = cleanedTemplate.replace(/\{CUSTOMMAINLOGO\}/g, logoUrl);
          // Normalize img attributes and add centering styles
          cleanedTemplate = normalizeImgAttributes(cleanedTemplate);
          console.log('✅ Replaced {CUSTOMMAINLOGO} tag with logo from analysis:', logoUrl.substring(0, 80) + (logoUrl.length > 80 ? '...' : ''));
        }

        // Fix broken images with real HTTP validation (same as landing pages)
        // This runs AFTER replace/normalize
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
    let industryDesign = detectIndustry(fromName, scenario);

    // Override with brand colors if available (more accurate for recognized brands)
    if (analysis.brandColors && analysis.isRecognizedBrand) {
      industryDesign = {
        ...industryDesign,
        colors: {
          primary: analysis.brandColors.primary,
          secondary: analysis.brandColors.secondary,
          accent: analysis.brandColors.accent,
          gradient: `linear-gradient(135deg, ${analysis.brandColors.primary}, ${analysis.brandColors.accent})`, // Generate gradient from brand colors
        }
      };
      console.log(`🎨 Using brand colors for "${analysis.brandName}": ${analysis.brandColors.primary}, ${analysis.brandColors.secondary}, ${analysis.brandColors.accent}`);
    } else {
      console.log(`🎨 Detected industry: ${industryDesign.industry}`);
    }

    // Determine required pages based on method
    const requiredPages = (LANDING_PAGE.FLOWS[method as keyof typeof LANDING_PAGE.FLOWS] || LANDING_PAGE.FLOWS['Click-Only']) as readonly string[];

    // Use brand info from analysis (already detected in analyzeRequest step)
    let emailBrandContext = '';
    if (analysis.isRecognizedBrand && analysis.brandName) {
      emailBrandContext = `\n**EMAIL CONTEXT - BRAND MENTIONED:**\nThe email references: ${analysis.brandName}\n**CRITICAL:** Match the landing page design style to this brand's authentic look and feel.`;
      console.log(`🎨 Using recognized brand from analysis: ${analysis.brandName}`);
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
        response = await generateText({
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
        parsedResult = JSON.parse(cleanedJson);
      } catch (error) {
        // Retry with stronger prompt
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
              console.log('✅ Replaced {CUSTOMMAINLOGO} tag in landing page with logo from analysis:', logoUrl.substring(0, 80) + (logoUrl.length > 80 ? '...' : ''));
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
