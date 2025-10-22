import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { PromptAnalysis } from '../types/prompt-analysis';
import { MicrolearningContent, LanguageContent } from '../types/microlearning';
import { GenerateLanguageJsonSchema, GenerateLanguageJsonOutputSchema } from '../schemas/generate-language-json-schema';
import { getAppTexts, getAppAriaTexts } from '../utils/app-texts';
import { generateScene1Prompt } from './scene-generators/scene1-intro-generator';
import { generateScene2Prompt } from './scene-generators/scene2-goal-generator';
import { generateVideoPrompt } from './scene-generators/scene3-video-generator';
import { generateScene4Prompt } from './scene-generators/scene4-actionable-generator';
import { generateScene5Prompt } from './scene-generators/scene5-quiz-generator';
import { generateScene6Prompt } from './scene-generators/scene6-survey-generator';
import { generateScene7Prompt } from './scene-generators/scene7-nudge-generator';
import { generateScene8Prompt } from './scene-generators/scene8-summary-generator';
import { cleanResponse } from '../utils/content-processors/json-cleaner';

export const generateLanguageJsonTool = new Tool({
  id: 'generate_language_json',
  description: 'Generate language-specific training content from microlearning.json metadata with rich context',
  inputSchema: GenerateLanguageJsonSchema,
  outputSchema: GenerateLanguageJsonOutputSchema,
  execute: async (context: any) => {
    const input = context?.inputData || context?.input || context;
    const { analysis, microlearning, model } = input;

    try {
      const languageContent = await generateLanguageJsonWithAI(analysis, microlearning, model);

      return {
        success: true,
        data: languageContent
      };

    } catch (error) {
      console.error('Language JSON generation failed:', error);

      return {
        success: false,
        error: (error as Error).message
      };
    }
  },
});

// Generate language-specific training content from microlearning.json metadata with rich context
async function generateLanguageJsonWithAI(analysis: PromptAnalysis, microlearning: MicrolearningContent, model: any): Promise<LanguageContent> {

  // Generate scene 1 & 2 prompts using modular generators
  const scene1Prompt = generateScene1Prompt(analysis, microlearning);
  const scene2Prompt = generateScene2Prompt(analysis, microlearning);

  // Generate video prompt using modular generator
  const videoData = await generateVideoPrompt(analysis, microlearning);
  const videoPrompt = videoData.prompt;
  const selectedVideoUrl = videoData.videoUrl;
  const selectedTranscript = videoData.transcript;
  // Generate scene 4, 5, 6 prompts using modular generators
  const scene4Prompt = generateScene4Prompt(analysis, microlearning);
  const scene5Prompt = generateScene5Prompt(analysis, microlearning);
  const scene6Prompt = generateScene6Prompt(analysis, microlearning);

  // Generate scene 7, 8 prompts using modular generators
  console.log('📋 Analysis data for Scene 8:');
  console.log('  topic:', analysis.topic);
  console.log('  category:', analysis.category);
  console.log('  keyTopics:', analysis.keyTopics);

  const scene7Prompt = generateScene7Prompt(analysis, microlearning);
  const scene8Prompt = generateScene8Prompt(analysis, microlearning);


  try {
    console.log('🚀 Starting parallel content generation with model:', model?.constructor?.name || 'unknown');
    console.log('📊 Generation parameters:', {
      language: analysis.language,
      topic: analysis.topic,
      category: analysis.category,
      level: analysis.level
    });

    // Optimized system prompts for GPT-5 Nano (concise, bullet format)
    const baseSystemPrompt = `You generate ${analysis.language} microlearning scenes.

CRITICAL RULES:
1. Return ONLY valid JSON (no markdown, no backticks)
2. Use EXACT fields from template - NO extra keys
3. Simple, conversational language - NOT formal
4. Use real Lucide icon names (e.g., "mail-warning", "shield-check")

Start directly with {`;

    const videoSystemPrompt = baseSystemPrompt + `\n5. NEVER use \\n in transcript - use actual line breaks`;

    // Generate content in parallel for better performance and reliability
    const startTime = Date.now();
    const [scene1Response, scene2Response, videoResponse, scene4Response, scene5Response, scene6Response, scene7Response, scene8Response] = await Promise.all([
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene1Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 1 generation failed:', err);
        throw new Error(`Scene 1 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene2Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 2 generation failed:', err);
        throw new Error(`Scene 2 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: videoSystemPrompt },
          { role: 'user', content: videoPrompt }
        ]
      }).catch(err => {
        console.error('❌ Video generation failed:', err);
        throw new Error(`Video generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene4Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 4 generation failed:', err);
        throw new Error(`Scene 4 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene5Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 5 generation failed:', err);
        throw new Error(`Scene 5 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene6Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 6 generation failed:', err);
        throw new Error(`Scene 6 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene7Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 7 generation failed:', err);
        throw new Error(`Scene 7 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }),
      generateText({
        model: model,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: scene8Prompt }
        ]
      }).catch(err => {
        console.error('❌ Scene 8 generation failed:', err);
        throw new Error(`Scene 8 generation failed: ${err instanceof Error ? err.message : String(err)}`);
      })
    ]);

    const generationTime = Date.now() - startTime;
    console.log(`⏱️ Parallel generation completed in ${generationTime}ms`);

    // Clean and parse the responses with detailed error handling

    console.log('🔄 Starting JSON parsing...');
    let scene1Scenes, scene2Scenes, videoScenes, mainScenes, closingScenes;

    try {
      console.log('📤 Scene 1 RAW Response:', scene1Response.text.substring(0, 500));
      const cleanedScene1 = cleanResponse(scene1Response.text, 'scene1');
      console.log('🧹 Scene 1 CLEANED:', cleanedScene1.substring(0, 500));
      scene1Scenes = JSON.parse(cleanedScene1);
      console.log('✅ Scene 1 PARSED:', JSON.stringify(scene1Scenes).substring(0, 500));
      console.log('🔍 Scene 1 has highlights?', !!scene1Scenes['1']?.highlights);
    } catch (parseErr) {
      console.error('❌ Failed to parse scene 1:', parseErr);
      console.log('🔍 Scene 1 response preview:', scene1Response.text.substring(0, 200));
      throw new Error(`Scene 1 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    try {
      console.log('📤 Scene 2 RAW Response:', scene2Response.text.substring(0, 500));
      const cleanedScene2 = cleanResponse(scene2Response.text, 'scene2');
      console.log('🧹 Scene 2 CLEANED:', cleanedScene2.substring(0, 500));
      scene2Scenes = JSON.parse(cleanedScene2);
      console.log('✅ Scene 2 PARSED:', JSON.stringify(scene2Scenes).substring(0, 500));
    } catch (parseErr) {
      console.error('❌ Failed to parse scene 2:', parseErr);
      console.log('🔍 Scene 2 response preview:', scene2Response.text.substring(0, 200));
      throw new Error(`Scene 2 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    try {
      console.log('📤 Video RAW Response:', videoResponse.text.substring(0, 500));
      const cleanedVideo = cleanResponse(videoResponse.text, 'video');
      console.log('🧹 Video CLEANED:', cleanedVideo.substring(0, 500));
      videoScenes = JSON.parse(cleanedVideo);
      console.log('✅ Video PARSED:', JSON.stringify(videoScenes).substring(0, 500));
      // Override video URL and transcript with actual selected values
      if (videoScenes['3'] && videoScenes['3'].video) {
        videoScenes['3'].video.src = selectedVideoUrl;
        videoScenes['3'].video.transcript = selectedTranscript;
        console.log(`✅ Video URL overridden: ${selectedVideoUrl}`);
      }
    } catch (parseErr) {
      console.warn('⚠️ Video JSON parsing failed, attempting retry...');

      try {
        // Retry with fresh AI call using same optimized prompt
        const retryResponse = await generateText({
          model: model,
          messages: [
            { role: 'system', content: videoSystemPrompt },
            { role: 'user', content: videoPrompt }
          ]
        });

        const retryCleanedVideo = cleanResponse(retryResponse.text, 'video');
        videoScenes = JSON.parse(retryCleanedVideo);

        // Override video URL and transcript with actual selected values
        if (videoScenes['3'] && videoScenes['3'].video) {
          videoScenes['3'].video.src = selectedVideoUrl;
          videoScenes['3'].video.transcript = selectedTranscript;
          console.log(`✅ Video URL overridden on retry: ${selectedVideoUrl}`);
        }

        console.log('✅ Video scenes parsed successfully on retry');

      } catch (retryErr) {
        console.error('❌ Video generation failed after retry');
        throw new Error(`Video content generation failed after retry. Please regenerate the entire microlearning.`);
      }
    }

    let scene4Scenes, scene5Scenes, scene6Scenes;

    try {
      console.log('📤 Scene 4 RAW Response:', scene4Response.text.substring(0, 500));
      const cleanedScene4 = cleanResponse(scene4Response.text, 'scene4');
      console.log('🧹 Scene 4 CLEANED:', cleanedScene4.substring(0, 500));
      scene4Scenes = JSON.parse(cleanedScene4);
      console.log('✅ Scene 4 PARSED:', JSON.stringify(scene4Scenes).substring(0, 500));
    } catch (parseErr) {
      console.error('❌ Failed to parse Scene 4:', parseErr);
      console.log('🔍 Scene 4 response preview:', scene4Response.text.substring(0, 200));
      throw new Error(`Scene 4 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    try {
      console.log('📤 Scene 5 RAW Response:', scene5Response.text.substring(0, 500));
      const cleanedScene5 = cleanResponse(scene5Response.text, 'scene5');
      console.log('🧹 Scene 5 CLEANED:', cleanedScene5.substring(0, 500));
      scene5Scenes = JSON.parse(cleanedScene5);
      console.log('✅ Scene 5 PARSED:', JSON.stringify(scene5Scenes).substring(0, 500));
    } catch (parseErr) {
      console.error('❌ Failed to parse Scene 5:', parseErr);
      console.log('🔍 Scene 5 response preview:', scene5Response.text.substring(0, 200));
      throw new Error(`Scene 5 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    try {
      console.log('📤 Scene 6 RAW Response:', scene6Response.text.substring(0, 500));
      const cleanedScene6 = cleanResponse(scene6Response.text, 'scene6');
      console.log('🧹 Scene 6 CLEANED:', cleanedScene6.substring(0, 500));
      scene6Scenes = JSON.parse(cleanedScene6);
      console.log('✅ Scene 6 PARSED:', JSON.stringify(scene6Scenes).substring(0, 500));
    } catch (parseErr) {
      console.error('❌ Failed to parse Scene 6:', parseErr);
      console.log('🔍 Scene 6 response preview:', scene6Response.text.substring(0, 200));
      throw new Error(`Scene 6 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    mainScenes = { ...scene4Scenes, ...scene5Scenes, ...scene6Scenes };
    console.log('✅ Main scenes (4, 5, 6) combined successfully');

    let scene7Scenes, scene8Scenes;

    try {
      console.log('📤 Scene 7 RAW Response:', scene7Response.text.substring(0, 500));
      const cleanedScene7 = cleanResponse(scene7Response.text, 'scene7');
      console.log('🧹 Scene 7 CLEANED:', cleanedScene7.substring(0, 500));
      scene7Scenes = JSON.parse(cleanedScene7);
      console.log('✅ Scene 7 PARSED:', JSON.stringify(scene7Scenes).substring(0, 500));
    } catch (parseErr) {
      console.error('❌ Failed to parse Scene 7:', parseErr);
      console.log('🔍 Scene 7 response preview:', scene7Response.text.substring(0, 200));
      throw new Error(`Scene 7 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    try {
      console.log('📤 Scene 8 RAW Response:', scene8Response.text.substring(0, 500));
      const cleanedScene8 = cleanResponse(scene8Response.text, 'scene8');
      console.log('🧹 Scene 8 CLEANED:', cleanedScene8.substring(0, 500));
      scene8Scenes = JSON.parse(cleanedScene8);
      console.log('✅ Scene 8 PARSED:', JSON.stringify(scene8Scenes).substring(0, 500));
    } catch (parseErr) {
      console.error('❌ Failed to parse Scene 8:', parseErr);
      console.log('🔍 Scene 8 response preview:', scene8Response.text.substring(0, 200));
      throw new Error(`Scene 8 JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }


    closingScenes = { ...scene7Scenes, ...scene8Scenes };
    console.log('✅ Closing scenes (7, 8) combined successfully');

    // Combine all scenes into final content
    console.log('🔗 Combining all scenes...');
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
    console.log(`🎯 Combined content created with ${sceneCount} scenes`);

    if (sceneCount < 8) {
      console.warn(`⚠️ Expected 8 scenes, got ${sceneCount}. Scene keys: ${Object.keys(combinedContent).filter(k => k !== 'app').join(', ')}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Language content generation completed successfully in ${totalTime}ms`);

    return combinedContent as LanguageContent;

  } catch (err) {
    console.error('💥 CRITICAL ERROR in generateLanguageJsonWithAI:', err);
    console.error('📊 Error context:', {
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
      language: analysis.language,
      topic: analysis.topic,
      modelType: model?.constructor?.name || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Log the full error details for debugging
    if (err instanceof SyntaxError) {
      console.error('🔍 JSON Syntax Error detected');
    } else if (err instanceof Error && err.message?.includes('generation failed')) {
      console.error('🔍 AI Generation Error detected');
    } else {
      console.error('🔍 Unknown error type detected');
    }

    // Re-throw the error instead of returning it as LanguageContent
    throw new Error(`Language generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

