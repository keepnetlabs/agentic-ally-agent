import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { getModelWithOverride } from '../model-providers';
import { MODEL_PROVIDERS } from '../constants';
import { SceneType, getSceneTypeOrDefault } from '../types/scene-types';
import { rewriteScene1Intro } from './scene-rewriters/scene1-intro-rewriter';
import { rewriteScene2Goal } from './scene-rewriters/scene2-goal-rewriter';
import { rewriteScene3Video } from './scene-rewriters/scene3-video-rewriter';
import { rewriteScene4Actionable } from './scene-rewriters/scene4-actionable-rewriter';
import { rewriteScene5Quiz } from './scene-rewriters/scene5-quiz-rewriter';
import { rewriteScene6Survey } from './scene-rewriters/scene6-survey-rewriter';
import { rewriteScene7Nudge } from './scene-rewriters/scene7-nudge-rewriter';
import { rewriteScene8Summary } from './scene-rewriters/scene8-summary-rewriter';
import { rewriteAppTexts } from './scene-rewriters/app-texts-rewriter';

/* =========================================================
 * Schemas
 * =======================================================*/
const TranslateJsonInputSchema = z.object({
    json: z.any(),
    microlearningStructure: z.any().describe('Base microlearning structure with scenes metadata'),
    sourceLanguage: z.string().optional().default('en-gb'),
    targetLanguage: z.string(),
    topic: z.string().optional(),
    doNotTranslateKeys: z.array(z.string()).optional(),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
    model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

const TranslateJsonOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional()
});

/* =========================================================
 * Scene Type Detection & Mapping
 * =======================================================*/

function getSceneRewriter(sceneType: SceneType): any {
    const rewriterMap: Record<SceneType, any> = {
        [SceneType.INTRO]: rewriteScene1Intro,
        [SceneType.GOAL]: rewriteScene2Goal,
        [SceneType.SCENARIO]: rewriteScene3Video, // scenario is the video scene
        [SceneType.ACTIONABLE_CONTENT]: rewriteScene4Actionable,
        [SceneType.CODE_REVIEW]: rewriteScene4Actionable, // Use same rewriter as actionable
        [SceneType.QUIZ]: rewriteScene5Quiz,
        [SceneType.SURVEY]: rewriteScene6Survey,
        [SceneType.NUDGE]: rewriteScene7Nudge,
        [SceneType.SUMMARY]: rewriteScene8Summary,
    };

    return rewriterMap[sceneType];
}

/* =========================================================
 * Scene-by-Scene Rewrite Tool
 * =======================================================*/
export const translateLanguageJsonTool = new Tool({
    id: 'translate_language_json',
    description: 'Rewrite language content scene-by-scene using specialized rewriters for native quality. Each scene is rewritten by a domain-specific expert.',
    inputSchema: TranslateJsonInputSchema,
    outputSchema: TranslateJsonOutputSchema,
    execute: async (context: any) => {
        const {
            json,
            microlearningStructure,
            sourceLanguage = 'en-gb',
            targetLanguage,
            topic,
            modelProvider,
            model: modelOverride
        } = context as z.infer<typeof TranslateJsonInputSchema>;

        const model = getModelWithOverride(modelProvider, modelOverride);

        console.log('🎬 [SCENE REWRITE] Starting modular scene-by-scene rewrite');
        console.log('📝 [SCENE REWRITE] Source:', sourceLanguage, '→ Target:', targetLanguage);
        console.log('🎯 [SCENE REWRITE] Topic:', topic || 'General');

        // Extract scenes metadata from microlearningStructure
        const scenesMetadata = microlearningStructure?.scenes || [];
        const appTexts = json.app_texts || {};

        if (scenesMetadata.length === 0) {
            console.log('⚠️ [SCENE REWRITE] No scenes metadata found, returning original');
            return { success: true, data: json };
        }

        console.log(`🎬 [SCENE REWRITE] Found ${scenesMetadata.length} scenes`);

        // Build rewrite context
        const rewriteContext = {
            sourceLanguage,
            targetLanguage,
            topic: topic || 'Cybersecurity training',
            model
        };

        // Rewrite function for a single scene
        async function rewriteScene(sceneMetadata: any, sceneIndex: number): Promise<{ sceneId: string, content: any }> {
            const sceneNumber = sceneIndex + 1;
            const sceneId = sceneMetadata.scene_id;
            const sceneTypeRaw = sceneMetadata.metadata?.scene_type;
            const sceneType = getSceneTypeOrDefault(sceneTypeRaw);
            const sceneContent = json[sceneId];

            if (!sceneContent) {
                console.warn(`⚠️ [SCENE ${sceneNumber}] No content found for scene_id ${sceneId}`);
                return { sceneId, content: null };
            }

            const rewriter = getSceneRewriter(sceneType);
            console.log(`🎬 [SCENE ${sceneNumber}/${scenesMetadata.length}] Rewriting ${sceneType} (id: ${sceneId})`);

            try {
                const rewrittenContent = await rewriter(sceneContent, rewriteContext);
                console.log(`✅ [SCENE ${sceneNumber}/${scenesMetadata.length}] Rewrite completed`);
                return { sceneId, content: rewrittenContent };
            } catch (error) {
                console.error(`❌ [SCENE ${sceneNumber}/${scenesMetadata.length}] Rewrite failed:`, error);
                console.warn(`⚠️ [SCENE ${sceneNumber}/${scenesMetadata.length}] Using original as fallback`);
                return { sceneId, content: sceneContent }; // Graceful fallback
            }
        }

        // Process all scenes in parallel
        console.log(`📦 [PARALLEL] Processing all ${scenesMetadata.length} scenes simultaneously`);

        const allResults = await Promise.all(
            scenesMetadata.map((sceneMetadata: any, idx: number) => rewriteScene(sceneMetadata, idx))
        );

        // Map results to scene IDs
        const rewrittenScenesMap: Record<string, any> = {};
        allResults.forEach(({ sceneId, content }) => {
            if (content) {
                rewrittenScenesMap[sceneId] = content;
            }
        });

        // Rewrite app_texts
        console.log('📱 [APP_TEXTS] Rewriting application texts');
        let rewrittenAppTexts = appTexts;
        try {
            rewrittenAppTexts = await rewriteAppTexts(appTexts, rewriteContext);
            console.log('✅ [APP_TEXTS] Rewrite completed');
        } catch (error) {
            console.error('❌ [APP_TEXTS] Rewrite failed, using original:', error);
        }

        // Combine results - preserve original structure with rewritten scenes
        const result = {
            ...json, // Keep all original keys
            ...rewrittenScenesMap, // Override with rewritten scene content
            app_texts: rewrittenAppTexts
        };

        console.log(`🎉 [SCENE REWRITE] Completed: ${Object.keys(rewrittenScenesMap).length} scenes rewritten`);

        return {
            success: true,
            data: result
        };
    }
});
