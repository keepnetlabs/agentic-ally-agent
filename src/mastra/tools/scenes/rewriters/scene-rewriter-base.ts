// src/mastra/tools/scenes/rewriters/scene-rewriter-base.ts
// Base class for all scene rewriting (DRY pattern)
// Eliminates 1,200+ lines of duplicate boilerplate across scene1-8 + app-texts

import { generateText } from 'ai';
import { cleanResponse } from '../../../utils/content-processors/json-cleaner';
import { SCENE_REWRITE_PARAMS } from '../../../utils/config/llm-generation-params';
import { getLanguagePrompt } from '../../../utils/language/localization-language-rules';
import { getLogger } from '../../../utils/core/logger';
import { normalizeError, logErrorInfo } from '../../../utils/core/error-utils';
import { errorService } from '../../../services/error-service';
import { withRetry } from '../../../utils/core/resilience-utils';

import { LanguageModel } from '../../../types/language-model';

export interface RewriteContext {
    sourceLanguage: string;
    targetLanguage: string;
    topic: string;
    model: LanguageModel;
    department?: string;
}

/**
 * Scene type definitions with their specific instructions
 * Each scene type has a unique prompt instruction
 */
type SceneType =
    | 'intro'
    | 'goal'
    | 'video'
    | 'actionable'
    | 'vishing'
    | 'smishing'
    | 'quiz'
    | 'survey'
    | 'nudge'
    | 'summary'
    | 'app-texts';

interface SceneConfig {
    displayName: string;              // e.g., "Intro", "Goals", "Video Transcript"
    typeInstruction: string;          // Scene-specific instruction (e.g., "Make the hook compelling")
    sceneNumber?: number;             // For logging (1-8)
}

/**
 * Configuration map for all scene types
 * Each entry defines how that scene type should be rewritten
 */
const SCENE_CONFIGS: Record<SceneType, SceneConfig> = {
    intro: {
        displayName: 'Intro',
        typeInstruction: 'Make the hook compelling to capture attention.',
        sceneNumber: 1,
    },
    goal: {
        displayName: 'Goals',
        typeInstruction: 'Make goals clear and measurable.',
        sceneNumber: 2,
    },
    video: {
        displayName: 'Video Transcript',
        typeInstruction: 'Create natural, conversational speech patterns.',
        sceneNumber: 3,
    },
    actionable: {
        displayName: 'Actionable Items',
        typeInstruction: 'Keep action steps concrete and achievable.',
        sceneNumber: 4,
    },
    vishing: {
        displayName: 'Vishing Simulation',
        typeInstruction: 'Actively replace any source-language names/titles/orgs/phone formats with culturally appropriate equivalents in the target locale (no transliteration). If a name appears, it must change to a local name; phone numbers must follow local patterns and stay clearly fictional; avoid any real entities. CRITICAL: If a caller name appears in firstMessage, it must match the callerName field exactly (consistency rule).',
        sceneNumber: 4,
    },
    smishing: {
        displayName: 'Smishing Simulation',
        typeInstruction: 'Actively replace any source-language names/titles/orgs/phone formats with culturally appropriate equivalents in the target locale (no transliteration). If a name appears, it must change to a local name; phone numbers must follow local patterns and stay clearly fictional; avoid any real entities. CRITICAL: If a sender name appears in firstMessage, it must match the senderName field exactly (consistency rule). Also do not keep broken references like "link below/attached file" unless the same message includes that fictional artifact.',
        sceneNumber: 4,
    },
    quiz: {
        displayName: 'Quiz',
        typeInstruction: 'Keep quiz questions clear and unambiguous.',
        sceneNumber: 5,
    },
    survey: {
        displayName: 'Survey',
        typeInstruction: 'Keep survey questions neutral and straightforward.',
        sceneNumber: 6,
    },
    nudge: {
        displayName: 'Nudge',
        typeInstruction: 'Keep nudges concise and motivational.',
        sceneNumber: 7,
    },
    summary: {
        displayName: 'Summary',
        typeInstruction: 'Summarize key points concisely.',
        sceneNumber: 8,
    },
    'app-texts': {
        displayName: 'App Text Strings',
        typeInstruction: 'Keep UI strings concise and user-friendly.',
    },
};

/**
 * Build the system prompt for scene localization
 * This is the shared boilerplate that was duplicated 8+ times
 */
function buildSystemPrompt(
    sceneType: SceneType,
    targetLanguage: string,
    sourceLanguage: string,
    topic: string,
    department: string | undefined
): string {
    const config = SCENE_CONFIGS[sceneType];
    const languageRules = getLanguagePrompt(targetLanguage);

    return `You are a native ${targetLanguage} cybersecurity trainer specializing in *semantic localization* of microlearning content.

=== CRITICAL: NOT TRANSLATION, NOT SUMMARY ===

You are NOT:
- translating word-by-word (robotically)
- summarizing or shortening the content
- adding your own generic cybersecurity advice

You MUST:
- keep ALL information, details, specific examples, and scenarios from the source
- keep roughly the same length and level of detail
- ONLY adapt the *phrasing* and *tone* for the ${targetLanguage} workplace context

=== PROCESS: UNDERSTAND → MAP → REWRITE ===

1. Understand the specific lesson/risk in ${sourceLanguage}

2. Map that meaning to natural, professional ${targetLanguage} norms

3. Rewrite it as if a native expert wrote it originally in ${targetLanguage} (re-authoring, NOT summarizing)

=== PRESERVE CONTENT & LOGICAL FLOW ===

- Do NOT add new risks or remove existing details
- Do NOT change the logical flow (Idea A → Idea B → Conclusion)

=== UI/UX CONSTRAINTS (CRITICAL) ===

- Keep the exact same number of list items (If source has 3 bullets, output must have 3 bullets).
- Keep similar visual text length (do not make it much shorter or 3x longer).
- Preserve JSON structure, IDs, URLs, booleans, numbers, scene_type.
- Preserve inline formatting (keep **bold** emphasis, line breaks, etc.).

=== STYLE: NATIVE PROFESSIONAL ===

- Tone: professional, engaging, and direct (microlearning / instructional design).
- Context: ${topic} for ${department || 'General'} employees.
- Scene Type: ${config.displayName} - ${config.typeInstruction}
- Grammar: use natural ${targetLanguage} sentence structures, NOT the source language's grammar.

=== AVOID (THE "TRANSLATIONESE" TRAP) ===

❌ Literal translations of idioms.
❌ Keeping the source language's sentence rhythm (Subject-Verb order mirroring).
❌ Using passive voice if active voice is more natural in ${targetLanguage}.

${languageRules}

=== OUTPUT FORMAT (STRICT) ===

- Output only valid JSON.
- Keys must remain exactly the same.
- Do NOT add or remove any fields.
- Only text values change.
- No conversational filler ("Here is the JSON...", explanations, comments).

FINAL CHECK (MENTAL):

- Did I keep all original technical and scenario details?
- Does every sentence sound like it was naturally written in ${targetLanguage}, not translated?`;
}

/**
 * Build the user prompt for scene localization
 * Identical structure for all scene types
 */
function buildUserPrompt<T>(
    topic: string,
    targetLanguage: string,
    scene: T
): string {
    return `Topic: ${topic}

=== RAW CONTENT CONCEPTS (Source) ===

${JSON.stringify(scene, null, 2)}

INSTRUCTION: Re-author the content above into native ${targetLanguage}.

Focus on natural flow while keeping all technical details and UI structure exactly as is.

Output (JSON only):`;
}

/**
 * Rewrite a scene using semantic localization (not translation)
 * This is the core function that replaces 8 individual rewrite functions
 *
 * @param scene The scene content to rewrite
 * @param sceneType The type of scene (intro, goal, video, etc.)
 * @param context The rewrite context (languages, model, etc.)
 * @returns The rewritten scene
 */
export async function rewriteSceneWithBase<T>(
    scene: T,
    sceneType: SceneType,
    context: RewriteContext
): Promise<T> {
    const config = SCENE_CONFIGS[sceneType];
    const logger = getLogger(`RewriteScene${config.displayName.replace(/\s+/g, '')}`);
    const { sourceLanguage, targetLanguage, topic, model, department } = context;

    // Early return for empty content
    if (!scene || (typeof scene === 'object' && Object.keys(scene).length === 0)) {
        return scene;
    }

    const systemPrompt = buildSystemPrompt(
        sceneType,
        targetLanguage,
        sourceLanguage,
        topic,
        department
    );

    const userPrompt = buildUserPrompt(topic, targetLanguage, scene);

    try {
        const response = await withRetry(
            () => generateText({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                ...SCENE_REWRITE_PARAMS,
            }),
            `Scene ${config.sceneNumber ? config.sceneNumber + ' (' + config.displayName + ')' : config.displayName} rewrite`
        );

        const cleanKey = sceneType === 'app-texts' ? 'app-texts' : `scene${config.sceneNumber}-${sceneType}`;
        const cleaned = cleanResponse(response.text, cleanKey);
        const rewritten = JSON.parse(cleaned) as T;

        return rewritten;
    } catch (error) {
        const err = normalizeError(error);
        const sceneLabel = config.sceneNumber ? `Scene ${config.sceneNumber} (${config.displayName})` : config.displayName;
        const errorInfo = errorService.aiModel(`${sceneLabel} rewrite failed: ${err.message}`, {
            sceneType,
            stack: err.stack
        });
        logErrorInfo(logger, 'error', `${sceneLabel} rewrite failed`, errorInfo);
        throw error;
    }
}
