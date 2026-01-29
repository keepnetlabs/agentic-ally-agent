import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent, LanguageContent } from '../../types/microlearning';
import { GenerateLanguageJsonSchema, GenerateLanguageJsonOutputSchema } from '../../schemas';
import { getAppTexts, getAppAriaTexts } from '../../utils/language/app-texts';
import { buildSystemPrompt } from '../../utils/prompt-builders/base-context-builder';
import { buildPolicyScenePrompt } from '../../utils/prompt-builders/policy-context-builder';
import { generateScene1Prompt } from '../scenes/generators/scene1-intro-generator';
import { generateScene2Prompt } from '../scenes/generators/scene2-goal-generator';
import { generateVideoPrompt } from '../scenes/generators/scene3-video-generator';
import { generateScene4Prompt } from '../scenes/generators/scene4-actionable-generator';
import { generateScene4CodeReviewPrompt } from '../scenes/generators/scene4-code-review-generator';
import { generateScene4VishingPrompt } from '../scenes/generators/scene4-vishing-generator';
import { generateScene4SmishingPrompt } from '../scenes/generators/scene4-smishing-generator';
import { generateScene5Prompt } from '../scenes/generators/scene5-quiz-generator';
import { generateScene6Prompt } from '../scenes/generators/scene6-survey-generator';
import { generateScene7Prompt } from '../scenes/generators/scene7-nudge-generator';
import { generateScene8Prompt } from '../scenes/generators/scene8-summary-generator';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { translateTranscript } from '../../utils/content-processors/transcript-translator';
import { SCENE_GENERATION_PARAMS } from '../../utils/config/llm-generation-params';
import { trackCost } from '../../utils/core/cost-tracker';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';
import { buildVishingAgentPrompt } from './utils/vishing-prompt-builder';
import { buildSmishingAgentPrompt } from './utils/smishing-prompt-builder';

export const generateLanguageJsonTool = new Tool({
  id: 'generate_language_json',
  description: 'Generate language-specific training content from microlearning.json metadata with rich context',
  inputSchema: GenerateLanguageJsonSchema,
  outputSchema: GenerateLanguageJsonOutputSchema,
  execute: async (context: any) => {
    const logger = getLogger('GenerateLanguageJsonTool');
    const input = context?.inputData || context?.input || context;
    const { analysis, microlearning, model, writer, policyContext } = input;

    try {
      const languageContent = await generateLanguageJsonWithAI(analysis, microlearning, model, writer, policyContext);

      return {
        success: true,
        data: languageContent
      };

    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        analysis: { language: analysis.language, topic: analysis.topic },
        step: 'language-json-generation',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Language JSON generation failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});

/**
 * Build messages array with multi-message pattern for scene generation
 * Ensures additionalContext and policy context receive dedicated attention from LLM
 */
function buildSceneMessages(systemPrompt: string, scenePrompt: string, analysis: PromptAnalysis, policyContext?: string): any[] {
  let system = systemPrompt;

  // Add policy context to system prompt using centralized builder
  const policyBlock = buildPolicyScenePrompt(policyContext);
  if (policyBlock) {
    system += policyBlock;
  }

  const messages: any[] = [
    { role: 'system', content: system }
  ];

  // If we have rich user behavior context, add it as a dedicated message
  // This uses the multi-message pattern recommended by OpenAI/Anthropic:
  // - Semantic separation signals importance to the LLM
  // - Recency bias ensures context receives more attention
  // - Dedicated attention slot for critical information
  if (analysis.additionalContext) {
    messages.push({
      role: 'user',
      content: `🔴 CRITICAL USER CONTEXT - Behavior & Risk Analysis:

${analysis.additionalContext}`
    });
  }

  // Add main scene generation request
  messages.push({
    role: 'user',
    content: scenePrompt
  });

  return messages;
}


// Generate language-specific training content from microlearning.json metadata with rich context
async function generateLanguageJsonWithAI(analysis: PromptAnalysis, microlearning: MicrolearningContent, model: any, writer?: any, policyContext?: string): Promise<LanguageContent> {
  const logger = getLogger('GenerateLanguageJsonWithAI');
  logger.debug('Initializing language content generation', { hasWriter: !!writer, hasPolicies: !!policyContext });

  // Generate scene 1 & 2 prompts using modular generators
  const scene1Prompt = generateScene1Prompt(analysis, microlearning);
  const scene2Prompt = generateScene2Prompt(analysis, microlearning);

  // Generate video prompt using modular generator
  const videoData = await generateVideoPrompt(analysis, microlearning);
  const videoPrompt = videoData.prompt;
  const selectedVideoUrl = videoData.videoUrl;
  const baseTranscript = videoData.transcript;

  // Translate transcript if not English
  const selectedTranscript = await translateTranscript(baseTranscript, analysis.language, model);

  // Determine Scene 4 type and generate appropriate prompt based on analysis
  const isVishing = analysis.isVishing || false;
  const isSmishing = analysis.isSmishing || false;
  const isCodeTopic = analysis.isCodeTopic || false;
  const scene4Prompt = isVishing
    ? generateScene4VishingPrompt(analysis, microlearning)
    : isSmishing
      ? generateScene4SmishingPrompt(analysis, microlearning)
      : isCodeTopic
        ? generateScene4CodeReviewPrompt(analysis, microlearning)
        : generateScene4Prompt(analysis, microlearning);

  const scene5Prompt = generateScene5Prompt(analysis, microlearning);
  const scene6Prompt = generateScene6Prompt(analysis, microlearning);

  // Generate scene 7, 8 prompts using modular generators
  logger.debug('Preparing final scene prompts', { topic: analysis.topic, category: analysis.category, keyTopicsCount: analysis.keyTopics?.length || 0 });

  const scene7Prompt = generateScene7Prompt(analysis, microlearning);
  const scene8Prompt = generateScene8Prompt(analysis, microlearning);


  try {
    logger.debug('Starting parallel content generation', {
      modelType: model?.constructor?.name || 'unknown',
      language: analysis.language,
      topic: analysis.topic,
      category: analysis.category,
      level: analysis.level
    });

    // Build system prompt with language rules and behavior (level-adaptive vocabulary)
    const systemPrompt = buildSystemPrompt(analysis.language, analysis.level);

    // Video-specific system prompt (adds transcript rule)
    const videoSystemPrompt = systemPrompt + `\n\nVIDEO-SPECIFIC RULE:\n- NEVER use \\n in transcript - use actual line breaks`;

    // Generate content in parallel for better performance and reliability
    const startTime = Date.now();
    const [scene1Response, scene2Response, videoResponse, scene4Response, scene5Response, scene6Response, scene7Response, scene8Response] = await Promise.all([
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene1Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[1]  // Scene 1: Intro (creative)
        }),
        'Scene 1 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene2Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[2]  // Scene 2: Goals (factual)
        }),
        'Scene 2 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(videoSystemPrompt, videoPrompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[3]  // Scene 3: Video (balanced)
        }),
        'Scene 3 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene4Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[4]  // Scene 4: Actions (specific)
        }),
        'Scene 4 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene5Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[5]  // Scene 5: Quiz (precise)
        }),
        'Scene 5 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene6Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[6]  // Scene 6: Survey (neutral)
        }),
        'Scene 6 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene7Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[7]  // Scene 7: Nudge (engaging)
        }),
        'Scene 7 generation'
      ),
      withRetry(
        () => generateText({
          model: model,
          messages: buildSceneMessages(systemPrompt, scene8Prompt, analysis, policyContext),
          ...SCENE_GENERATION_PARAMS[8]  // Scene 8: Summary (consistent)
        }),
        'Scene 8 generation'
      )
    ]);

    const generationTime = Date.now() - startTime;
    logger.debug('Parallel generation completed', { durationMs: generationTime });

    // Track token usage for cost monitoring
    const allResponses = [scene1Response, scene2Response, videoResponse, scene4Response, scene5Response, scene6Response, scene7Response, scene8Response];
    const totalUsage = allResponses.reduce((acc, response) => {
      if (response.usage) {
        // AI SDK v5 uses: inputTokens, outputTokens (camelCase)
        // Older versions: promptTokens/completionTokens or input_tokens/output_tokens
        const usage = response.usage as any;
        const inputTokens = usage.inputTokens ?? usage.promptTokens ?? usage.input_tokens ?? 0;
        const outputTokens = usage.outputTokens ?? usage.completionTokens ?? usage.output_tokens ?? 0;

        acc.promptTokens += inputTokens;
        acc.completionTokens += outputTokens;
      } else {
        logger.warn('Response missing usage field', {});
      }
      return acc;
    }, { promptTokens: 0, completionTokens: 0 });

    // Use cost tracker for structured logging
    trackCost('generate-language-content', model.modelId || '@cf/openai/gpt-oss-120b', totalUsage);

    // Clean and parse the responses with detailed error handling
    logger.debug('Starting JSON parsing for all scenes');
    let scene1Scenes, scene2Scenes, videoScenes, mainScenes, closingScenes;

    try {
      logger.debug('Parsing Scene 1', { responseLength: scene1Response.text.length });
      const cleanedScene1 = cleanResponse(scene1Response.text, 'scene1');
      scene1Scenes = JSON.parse(cleanedScene1);
      logger.debug('Scene 1 parsed successfully', { hasHighlights: !!scene1Scenes['1']?.highlights });
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 1 JSON parsing failed: ${normalizedErr.message}`, { scene: 1, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 1', errorInfo);
      throw new Error(errorInfo.message);
    }

    try {
      logger.debug('Parsing Scene 2', { responseLength: scene2Response.text.length });
      const cleanedScene2 = cleanResponse(scene2Response.text, 'scene2');
      scene2Scenes = JSON.parse(cleanedScene2);
      logger.debug('Scene 2 parsed successfully');
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 2 JSON parsing failed: ${normalizedErr.message}`, { scene: 2, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 2', errorInfo);
      throw new Error(errorInfo.message);
    }

    try {
      logger.debug('Parsing Video', { responseLength: videoResponse.text.length });
      const cleanedVideo = cleanResponse(videoResponse.text, 'video');
      videoScenes = JSON.parse(cleanedVideo);
      logger.debug('Video parsed successfully');
      // Override video URL and transcript with actual selected values
      if (videoScenes['3'] && videoScenes['3'].video) {
        videoScenes['3'].video.src = selectedVideoUrl;
        videoScenes['3'].video.transcript = selectedTranscript;
        videoScenes['3'].video.transcriptLanguage = analysis.language.toLowerCase().startsWith('en') ? 'English' : analysis.language;
        logger.debug('Video URL overridden', { videoUrl: selectedVideoUrl.substring(0, 50) });
      }
    } catch (parseErr) {
      logger.warn('Video JSON parsing failed, attempting retry', { originalError: parseErr instanceof Error ? parseErr.message : String(parseErr) });

      try {
        // Retry with fresh AI call using same optimized prompt (withRetry handles exponential backoff)
        const retryResponse = await withRetry(
          () => generateText({
            model: model,
            messages: buildSceneMessages(videoSystemPrompt, videoPrompt, analysis, policyContext),
            ...SCENE_GENERATION_PARAMS[3]  // Scene 3: Video (balanced) - keep retry consistent with primary call
          }),
          'Video generation retry'
        );

        const retryCleanedVideo = cleanResponse(retryResponse.text, 'video');
        videoScenes = JSON.parse(retryCleanedVideo);

        // Override video URL and transcript with actual selected values
        if (videoScenes['3'] && videoScenes['3'].video) {
          videoScenes['3'].video.src = selectedVideoUrl;
          videoScenes['3'].video.transcript = selectedTranscript;
          videoScenes['3'].video.transcriptLanguage = analysis.language.toLowerCase().startsWith('en') ? 'English' : analysis.language;
          logger.debug('Video URL overridden on retry', { videoUrl: selectedVideoUrl.substring(0, 50) });
        }

        logger.debug('Video scenes parsed successfully on retry');

      } catch {
        const errorInfo = errorService.aiModel('Video content generation failed after retry. Please regenerate the entire microlearning.', { scene: 3, step: 'retry' });
        logErrorInfo(logger, 'error', 'Video generation failed after retry', errorInfo);
        throw new Error(errorInfo.message);
      }
    }

    let scene4Scenes, scene5Scenes, scene6Scenes;

    try {
      logger.debug('Parsing Scene 4', { responseLength: scene4Response.text.length });
      const cleanedScene4 = cleanResponse(scene4Response.text, 'scene4');
      scene4Scenes = JSON.parse(cleanedScene4);
      logger.debug('Scene 4 parsed successfully');
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 4 JSON parsing failed: ${normalizedErr.message}`, { scene: 4, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 4', errorInfo);
      throw new Error(errorInfo.message);
    }

    if (isVishing && scene4Scenes?.['4']?.prompt) {
      const scenarioPrompt = String(scene4Scenes['4'].prompt);
      scene4Scenes['4'].prompt = await buildVishingAgentPrompt(scenarioPrompt, analysis, model);
    }
    if (isSmishing && scene4Scenes?.['4']?.prompt) {
      const scenarioPrompt = String(scene4Scenes['4'].prompt);
      scene4Scenes['4'].prompt = await buildSmishingAgentPrompt(scenarioPrompt, analysis, model);
    }

    try {
      logger.debug('Parsing Scene 5', { responseLength: scene5Response.text.length });
      const cleanedScene5 = cleanResponse(scene5Response.text, 'scene5');
      scene5Scenes = JSON.parse(cleanedScene5);
      logger.debug('Scene 5 parsed successfully');
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 5 JSON parsing failed: ${normalizedErr.message}`, { scene: 5, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 5', errorInfo);
      throw new Error(errorInfo.message);
    }

    try {
      logger.debug('Parsing Scene 6', { responseLength: scene6Response.text.length });
      const cleanedScene6 = cleanResponse(scene6Response.text, 'scene6');
      scene6Scenes = JSON.parse(cleanedScene6);
      logger.debug('Scene 6 parsed successfully');
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 6 JSON parsing failed: ${normalizedErr.message}`, { scene: 6, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 6', errorInfo);
      throw new Error(errorInfo.message);
    }

    // eslint-disable-next-line prefer-const
    mainScenes = { ...scene4Scenes, ...scene5Scenes, ...scene6Scenes };
    logger.debug('Main scenes combined', { sceneCount: Object.keys(mainScenes).length });

    let scene7Scenes, scene8Scenes;

    try {
      logger.debug('Parsing Scene 7', { responseLength: scene7Response.text.length });
      const cleanedScene7 = cleanResponse(scene7Response.text, 'scene7');
      scene7Scenes = JSON.parse(cleanedScene7);
      logger.debug('Scene 7 parsed successfully');
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 7 JSON parsing failed: ${normalizedErr.message}`, { scene: 7, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 7', errorInfo);
      throw new Error(errorInfo.message);
    }

    try {
      logger.debug('Parsing Scene 8', { responseLength: scene8Response.text.length });
      const cleanedScene8 = cleanResponse(scene8Response.text, 'scene8');
      scene8Scenes = JSON.parse(cleanedScene8);
      logger.debug('Scene 8 parsed successfully');
    } catch (parseErr) {
      const normalizedErr = normalizeError(parseErr);
      const errorInfo = errorService.aiModel(`Scene 8 JSON parsing failed: ${normalizedErr.message}`, { scene: 8, step: 'parsing' });
      logErrorInfo(logger, 'error', 'Failed to parse scene 8', errorInfo);
      throw new Error(errorInfo.message);
    }


    // eslint-disable-next-line prefer-const
    closingScenes = { ...scene7Scenes, ...scene8Scenes };
    logger.debug('Closing scenes combined', { sceneCount: Object.keys(closingScenes).length });

    // Combine all scenes into final content
    logger.debug('Combining all scenes into final content');
    const combinedContent = {
      ...scene1Scenes,
      ...scene2Scenes,
      ...videoScenes,
      ...mainScenes,
      ...closingScenes,
      app: {
        texts: getAppTexts(analysis.language),
        ariaTexts: getAppAriaTexts(analysis.language, analysis.topic)
      }
    };

    // Validate the combined content structure
    const sceneCount = Object.keys(combinedContent).filter(key => key !== 'app').length;
    logger.debug('Combined content created', { sceneCount, haAppTexts: !!combinedContent.app });

    if (sceneCount < 8) {
      logger.warn('Scene count mismatch', { expected: 8, actual: sceneCount, sceneKeys: Object.keys(combinedContent).filter(k => k !== 'app').join(', ') });
    }

    const totalTime = Date.now() - startTime;
    logger.debug('Language content generation completed', { durationMs: totalTime, sceneCount });

    return combinedContent as LanguageContent;

  } catch (err) {
    const error = normalizeError(err);
    logger.error('Critical error in language generation', { error: error.message, stack: error.stack });

    // Re-throw the error instead of returning it as LanguageContent
    const errorInfo = errorService.aiModel(`Language generation failed: ${error.message}`, { step: 'language-generation' });
    logErrorInfo(logger, 'error', 'Language generation failed', errorInfo);
    throw new Error(errorInfo.message);
  }
}

