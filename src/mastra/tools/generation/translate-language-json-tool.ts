import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { getModelWithOverride } from '../../model-providers';
import { MODEL_PROVIDERS } from '../../constants';
import { SceneType, getSceneTypeOrDefault } from '../../types/scene-types';
import { rewriteScene1Intro } from '../scenes/rewriters/scene1-intro-rewriter';
import { rewriteScene2Goal } from '../scenes/rewriters/scene2-goal-rewriter';
import { rewriteScene3Video } from '../scenes/rewriters/scene3-video-rewriter';
import { rewriteScene4Actionable } from '../scenes/rewriters/scene4-actionable-rewriter';
import { rewriteScene5Quiz } from '../scenes/rewriters/scene5-quiz-rewriter';
import { rewriteScene6Survey } from '../scenes/rewriters/scene6-survey-rewriter';
import { rewriteScene7Nudge } from '../scenes/rewriters/scene7-nudge-rewriter';
import { rewriteScene8Summary } from '../scenes/rewriters/scene8-summary-rewriter';
import { rewriteAppTexts } from '../scenes/rewriters/app-texts-rewriter';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';

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
        const logger = getLogger('TranslateLanguageJsonTool');

        try {
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

            logger.debug('Starting scene-by-scene rewrite', { sourceLanguage, targetLanguage, topic: topic || 'General' });

            // Extract scenes metadata from microlearningStructure
            const scenesMetadata = microlearningStructure?.scenes || [];
            const appTexts = json.app_texts || {};

            if (scenesMetadata.length === 0) {
                logger.warn('No scenes metadata found, returning original', {});
                return { success: true, data: json };
            }

            logger.debug('Scene rewrite parameters', { sceneCount: scenesMetadata.length });

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
                logger.warn('No content found for scene', { sceneNumber, sceneId });
                return { sceneId, content: null };
            }

            const rewriter = getSceneRewriter(sceneType);
            logger.debug('Rewriting scene', { sceneNumber, totalScenes: scenesMetadata.length, sceneType, sceneId });

            try {
                const rewrittenContent = await rewriter(sceneContent, rewriteContext);
                logger.debug('Scene rewrite completed', { sceneNumber, totalScenes: scenesMetadata.length });
                return { sceneId, content: rewrittenContent };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logger.error('Scene rewrite failed', { sceneNumber, sceneId, error: err.message, stack: err.stack });
                logger.warn('Using original content as fallback', { sceneNumber, sceneId });
                return { sceneId, content: sceneContent }; // Graceful fallback
            }
        }

        // Process all scenes in parallel
        logger.debug('Processing all scenes in parallel', { sceneCount: scenesMetadata.length });

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
        logger.debug('Rewriting application texts', {});
        let rewrittenAppTexts = appTexts;
        try {
            rewrittenAppTexts = await rewriteAppTexts(appTexts, rewriteContext);
            logger.debug('Application texts rewrite completed', {});
        } catch (error) {
            logger.error('Application texts rewrite failed, using original', error);
        }

        // Combine results - preserve original structure with rewritten scenes
        const result = {
            ...json, // Keep all original keys
            ...rewrittenScenesMap, // Override with rewritten scene content
            app_texts: rewrittenAppTexts
        };

            logger.debug('Scene rewrite batch completed', { scenesRewritten: Object.keys(rewrittenScenesMap).length });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const errorInfo = errorService.aiModel(err.message, {
                targetLanguage: context?.targetLanguage,
                step: 'language-translation',
                stack: err.stack
            });

            logger.error('Language translation failed', errorInfo);

            return {
                success: false,
                error: JSON.stringify(errorInfo)
            };
        }
    }
});
