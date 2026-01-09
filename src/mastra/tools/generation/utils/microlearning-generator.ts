import { generateText } from 'ai';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent, Scene } from '../../../types/microlearning';
import { cleanResponse } from '../../../utils/content-processors/json-cleaner';
import { METADATA_GENERATION_PARAMS } from '../../../utils/config/llm-generation-params';
import { CATEGORIES } from '../../../constants';
import { type LanguageModel } from '../../../types/language-model';
import { ProductService } from '../../../services/product-service';
import { getLogger } from '../../../utils/core/logger';
import { normalizeError } from '../../../utils/core/error-utils';
import { withRetry } from '../../../utils/core/resilience-utils';
import {
    ETHICAL_POLICY,
    SCIENTIFIC_EVIDENCE,
    DEFAULT_LOGO_CONFIG,
    getScene4Metadata
} from '../../../constants/microlearning-templates';

export async function generateMicrolearningJsonWithAI(
    analysis: PromptAnalysis & { additionalContext?: string },
    microlearningId: string,
    model: LanguageModel,
    _policyContext?: string
) {
    const scene4Type = analysis.isCodeTopic ? "code_review" : "actionable_content";

    const microlearning: MicrolearningContent = {
        microlearning_id: microlearningId,
        microlearning_metadata: {
            title: analysis.title,
            description: analysis.description,
            category: analysis.category,
            subcategory: analysis.subcategory,
            industry_relevance: analysis.industries,
            department_relevance: [analysis.department],
            role_relevance: analysis.roles,
            regulation_compliance: analysis.regulationCompliance || [],
            risk_area: analysis.topic,
            content_provider: "AI-Generated Training",
            level: (analysis.level?.charAt(0).toUpperCase() + analysis.level?.slice(1)) as MicrolearningContent['microlearning_metadata']['level'],
            ethical_inclusive_language_policy: ETHICAL_POLICY,
            language: analysis.language.toLowerCase(),
            language_availability: [analysis.language.toLowerCase()],
            gamification_enabled: true,
            total_points: 100
        },
        scientific_evidence: SCIENTIFIC_EVIDENCE,
        scenes: generateSceneStructure(analysis.duration, scene4Type),
        theme: await generateTheme(analysis.themeColor)
    };

    const logger = getLogger('GenerateMicrolearningJson');
    logger.info('Starting Stage 2: Enhancement');
    const enhancedMicrolearning = await enhanceMicrolearningContent(microlearning, model, analysis.additionalContext);
    logger.info('Stage 2 completed');

    return enhancedMicrolearning;
}

export async function generateTheme(themeColor?: string) {
    const backgroundColor = themeColor || "bg-gradient-gray";

    let logoConfig = { ...DEFAULT_LOGO_CONFIG };

    try {
        const logger = getLogger('GenerateTheme');
        const productService = new ProductService();
        const whitelabelingConfig = await productService.getWhitelabelingConfig();

        logger.debug('Whitelabeling Config Response', { config: whitelabelingConfig });

        if (whitelabelingConfig) {
            logoConfig = {
                "src": whitelabelingConfig.mainLogoUrl || logoConfig.src,
                "darkSrc": whitelabelingConfig.mainLogoUrl || logoConfig.darkSrc,
                "minimizedSrc": whitelabelingConfig.minimizedMenuLogoUrl || logoConfig.minimizedSrc,
                "minimizedDarkSrc": whitelabelingConfig.minimizedMenuLogoUrl || logoConfig.minimizedDarkSrc,
                "alt": whitelabelingConfig.brandName || logoConfig.alt
            };
        }
    } catch (error) {
        const logger = getLogger('GenerateTheme');
        const err = normalizeError(error);
        logger.warn('Failed to fetch whitelabeling config, using defaults', { error: err.message });
    }

    return {
        fontFamily: {
            primary: "SF Pro Display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            secondary: "SF Pro Text, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            monospace: "SF Mono, ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace"
        },
        colors: {
            background: backgroundColor
        },
        "logo": logoConfig
    }
}

export async function enhanceMicrolearningContent(microlearning: MicrolearningContent, model: LanguageModel, additionalContext?: string): Promise<MicrolearningContent> {
    const categoriesList = CATEGORIES.VALUES.join(', ');

    const enhancementPrompt = `CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no backticks.

ENHANCE this microlearning metadata to industry standards:

${JSON.stringify(microlearning, null, 2)}

USER CONTEXT & SPECIFIC REQUIREMENTS:
${additionalContext ? `"${additionalContext}"` : "No specific context provided."}
(Use this context to refine the Title, Risk Area, and relevance.)

ENHANCEMENT RULES (apply ONLY if needed):
1. Title: 2-5 words max, professional training format
   - Current: "${microlearning.microlearning_metadata.title}"
   - Should clearly convey core topic and learning focus
   - Use action-oriented or outcome-focused phrasing when appropriate
   - Examples vary by domain - security: "Stop Phishing Attacks", leadership: "Effective Delegation Skills", compliance: "GDPR Essentials"

2. Category: Ensure correct categorization (DO NOT CHANGE unless clearly wrong)
   - Current: "${microlearning.microlearning_metadata.category}"
   - Valid categories: ${categoriesList}
   - CRITICAL: If current category is in the valid list above, DO NOT CHANGE IT. Only fix if completely invalid.

3. Learning Objectives (Bloom's Taxonomy):
   - Ensure descriptions and objectives use measurable verbs (e.g., "Identify", "Analyze", "Apply" instead of "Understand").
   - Focus on ACTIONABLE outcomes for the learner.

4. Regulation Compliance: Add 2-4 relevant standards
   - Current: ${microlearning.microlearning_metadata.regulation_compliance?.length || 0} items
   - Select standards relevant to topic domain (ISO, NIST, GDPR, SOC 2, PCI DSS, HIPAA, etc.)

5. Risk Area: 1-3 words, core subject only
   - Current: "${microlearning.microlearning_metadata.risk_area}"
   - Remove unnecessary modifiers, keep essence

6. Scientific Basis: Verify all 8 scenes have specific learning theory reference

VALIDATION CHECKLIST:
✓ Title: 2-5 words, clear and professional
✓ Category: Accurate for topic domain
✓ Objectives: Uses Bloom's Taxonomy verbs
✓ Risk area: 1-3 words maximum
✓ All scenes have scientific_basis field

CRITICAL JSON RULES:
- Use double quotes for all strings
- No trailing commas
- Escape all quotes in content with \"
- No undefined or null values
- Return complete enhanced JSON with same structure`;

    try {
        const response = await withRetry(
            () => generateText({
                model: model,
                messages: [
                    { role: 'system', content: 'You are enhancing microlearning content. Keep the exact same JSON structure, only improve content values. Return ONLY valid JSON, no markdown blocks or commentary.' },
                    { role: 'user', content: enhancementPrompt }
                ],
                ...METADATA_GENERATION_PARAMS,
            }),
            `[GenerateMicrolearningJsonTool] microlearning-enhancement`
        );

        const cleanedResponse = cleanResponse(response.text, 'microlearning-enhancement');
        const enhanced = JSON.parse(cleanedResponse);
        const logger = getLogger('EnhanceMicrolearning');
        logger.info('Microlearning content enhanced successfully');
        return enhanced;
    } catch (error) {
        const logger = getLogger('EnhanceMicrolearning');
        const err = normalizeError(error);
        logger.warn('Enhancement failed, returning original', { error: err.message });
        return microlearning;
    }
}

export function generateSceneStructure(duration: number, scene4Type: "code_review" | "actionable_content" = "actionable_content"): Scene[] {
    return [
        {
            scene_id: "1",
            metadata: {
                scene_type: "intro" as const,
                points: 5,
                duration_seconds: Math.round(duration * 60 * 0.1),
                hasAchievementNotification: false,
                scientific_basis: "Attention Capture: Creates initial engagement and sets learning expectations.",
                icon: { sparkleIconName: "sparkles", sceneIconName: "play-circle" }
            }
        },
        {
            scene_id: "2",
            metadata: {
                scene_type: "goal" as const,
                points: 5,
                duration_seconds: Math.round(duration * 60 * 0.15),
                hasAchievementNotification: false,
                scientific_basis: "Goal Activation: Clear objectives improve learning focus and retention.",
                icon: { sparkleIconName: "target", sceneIconName: "target" }
            }
        },
        {
            scene_id: "3",
            metadata: {
                scene_type: "scenario" as const,
                points: 10,
                duration_seconds: Math.round(duration * 60 * 0.25),
                hasAchievementNotification: false,
                scientific_basis: "Contextual Learning: Real-world context improves knowledge transfer.",
                icon: { sparkleIconName: "video", sceneIconName: "monitor-play" }
            }
        },
        {
            scene_id: "4",
            metadata: getScene4Metadata(duration, scene4Type)
        },
        {
            scene_id: "5",
            metadata: {
                scene_type: "quiz" as const,
                points: 25,
                duration_seconds: Math.round(duration * 60 * 0.15),
                hasAchievementNotification: true,
                scientific_basis: "Active Recall: Testing enhances retention and identifies knowledge gaps.",
                icon: { sparkleIconName: "brain", sceneIconName: "brain" }
            }
        },
        {
            scene_id: "6",
            metadata: {
                scene_type: "survey" as const,
                points: 5,
                duration_seconds: Math.round(duration * 60 * 0.05),
                hasAchievementNotification: false,
                scientific_basis: "Metacognition: Self-assessment promotes learning awareness.",
                icon: { sparkleIconName: "chart-bar", sceneIconName: "list-checks" }
            }
        },
        {
            scene_id: "7",
            metadata: {
                scene_type: "nudge" as const,
                points: 10,
                duration_seconds: Math.round(duration * 60 * 0.05),
                hasAchievementNotification: false,
                scientific_basis: "Implementation Intentions: Concrete plans improve behavior change.",
                icon: { sparkleIconName: "zap", sceneIconName: "repeat" }
            }
        },
        {
            scene_id: "8",
            metadata: {
                scene_type: "summary" as const,
                points: 15,
                duration_seconds: Math.round(duration * 60 * 0.1),
                hasAchievementNotification: true,
                scientific_basis: "Consolidation: Review reinforces learning and provides closure.",
                icon: { sparkleIconName: "trophy", sceneIconName: "trophy" }
            }
        }
    ];
}
