import type { PromptAnalysis } from '../../types/prompt-analysis';
import { normalizeSmishingChannel } from '../../utils/smishing-channel';
import {
    CATEGORIES,
    DEFAULT_TRAINING_LEVEL,
    DEPARTMENTS,
    MICROLEARNING,
    ROLES,
    TRAINING_LEVELS,
} from '../../constants';
import { DEFAULT_LANGUAGE, validateBCP47LanguageCode } from '../../utils/language/language-utils';

function normalizeLevel(input: unknown): (typeof TRAINING_LEVELS)[number] {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw) return DEFAULT_TRAINING_LEVEL;
    const lower = raw.toLowerCase();
    const mapped =
        lower.startsWith('beg') ? 'Beginner'
            : lower.startsWith('int') ? 'Intermediate'
                : lower.startsWith('adv') ? 'Advanced'
                    : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return (TRAINING_LEVELS as readonly string[]).includes(mapped)
        ? (mapped as (typeof TRAINING_LEVELS)[number])
        : DEFAULT_TRAINING_LEVEL;
}

function normalizeDepartment(input: unknown, suggestedDepartment?: string): (typeof DEPARTMENTS)['VALUES'][number] {
    const candidate = typeof input === 'string' ? input.trim() : '';
    const suggested = (suggestedDepartment || '').trim();

    const values = DEPARTMENTS.VALUES as readonly string[];
    if (candidate && values.includes(candidate)) return candidate as (typeof DEPARTMENTS)['VALUES'][number];
    if (suggested && values.includes(suggested)) return suggested as (typeof DEPARTMENTS)['VALUES'][number];
    return DEPARTMENTS.DEFAULT;
}

function normalizeCategory(input: unknown): (typeof CATEGORIES)['VALUES'][number] {
    const candidate = typeof input === 'string' ? input.trim() : '';
    const values = CATEGORIES.VALUES as readonly string[];
    return candidate && values.includes(candidate)
        ? (candidate as (typeof CATEGORIES)['VALUES'][number])
        : CATEGORIES.DEFAULT;
}

function normalizeSingleRole(input: unknown): (typeof ROLES)['VALUES'][number] {
    const values = ROLES.VALUES as readonly string[];
    const role = Array.isArray(input) ? input[0] : input;
    const candidate = typeof role === 'string' ? role.trim() : '';
    return candidate && values.includes(candidate)
        ? (candidate as (typeof ROLES)['VALUES'][number])
        : ROLES.DEFAULT;
}

function normalizeStringArray(input: unknown, fallback: string[]): string[] {
    if (!Array.isArray(input)) return fallback;
    const cleaned = input
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
    return cleaned.length ? cleaned : fallback;
}

function normalizeNonEmptyString(input: unknown, fallback: string): string {
    return typeof input === 'string' && input.trim() ? input.trim() : fallback;
}

function normalizeBoolean(input: unknown, fallback: boolean): boolean {
    return typeof input === 'boolean' ? input : fallback;
}

function extractContextHints(additionalContext?: string, customRequirements?: string): {
    keyTopics: string[];
    practicalApplications: string[];
    mustKeepDetails: string[];
} {
    const raw = [additionalContext, customRequirements]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join('\n');

    if (!raw) {
        return { keyTopics: [], practicalApplications: [], mustKeepDetails: [] };
    }

    const segments = raw
        .split(/\r?\n|[.;]/g)
        .map((segment) => segment.replace(/^[-*]\s*/, '').trim())
        .filter((segment) => segment.length >= 6);

    const uniqueSegments = Array.from(new Set(segments));

    const keyTopics = uniqueSegments
        .slice(0, 5)
        .map((segment) => segment.length > 90 ? `${segment.slice(0, 87)}...` : segment);

    const practicalApplications = uniqueSegments
        .slice(0, 4)
        .map((segment) =>
            segment.length > 120
                ? `Apply in workplace scenario: ${segment.slice(0, 90)}...`
                : `Apply in workplace scenario: ${segment}`
        );

    const mustKeepDetails = uniqueSegments
        .slice(0, 8)
        .map((segment) => (segment.length > 120 ? `${segment.slice(0, 117)}...` : segment));

    return { keyTopics, practicalApplications, mustKeepDetails };
}

export interface AutoRepairPromptAnalysisOptions {
    suggestedDepartment?: string;
}

/**
 * Minimal, deterministic auto-repair for AI prompt analysis.
 * Keeps downstream workflows stable by enforcing allowlists + safe defaults.
 */
export function autoRepairPromptAnalysis(
    analysis: Partial<PromptAnalysis>,
    options: AutoRepairPromptAnalysisOptions = {}
): PromptAnalysis {
    const normalizedLanguage = validateBCP47LanguageCode(analysis.language || DEFAULT_LANGUAGE);
    const normalizedCategory = normalizeCategory(analysis.category);

    const topic = normalizeNonEmptyString(analysis.topic, 'Security Awareness');
    const title = normalizeNonEmptyString(analysis.title, topic);
    const description = normalizeNonEmptyString(
        analysis.description,
        `A focused ${MICROLEARNING.DURATION_MINUTES}-minute microlearning on ${topic}.`
    );

    const department = normalizeDepartment(analysis.department, options.suggestedDepartment);
    const level = normalizeLevel(analysis.level);

    const duration = typeof analysis.duration === 'number' && Number.isFinite(analysis.duration)
        ? analysis.duration
        : MICROLEARNING.DURATION_MINUTES;

    const industries = normalizeStringArray(analysis.industries, ['General Business']);
    const roles = [normalizeSingleRole(analysis.roles)];
    const learningObjectives = normalizeStringArray(
        analysis.learningObjectives,
        [
            `Identify common ${topic} risks`,
            `Apply best-practice safeguards for ${topic}`,
            `Report suspicious activity related to ${topic}`,
        ]
    );
    const contextHints = extractContextHints(analysis.additionalContext, analysis.customRequirements);
    const keyTopics = normalizeStringArray(analysis.keyTopics, contextHints.keyTopics);
    const practicalApplications = normalizeStringArray(
        analysis.practicalApplications,
        contextHints.practicalApplications
    );
    const mustKeepDetails = normalizeStringArray(analysis.mustKeepDetails, contextHints.mustKeepDetails);

    const isCodeTopic = normalizeBoolean(analysis.isCodeTopic, false);
    const isVishing = normalizeBoolean(analysis.isVishing, false);
    const isSmishing = normalizeBoolean(analysis.isSmishing, false);
    const deliveryChannel = isSmishing
        ? (normalizeSmishingChannel(analysis.deliveryChannel) ?? 'sms')
        : undefined;

    return {
        language: normalizedLanguage,
        topic,
        title,
        description,
        department,
        level,
        category: normalizedCategory,
        subcategory: normalizeNonEmptyString(
            analysis.subcategory,
            normalizedCategory === CATEGORIES.DEFAULT ? 'General Security Awareness' : `${normalizedCategory} Basics`
        ),
        learningObjectives,
        duration,
        industries,
        roles,
        keyTopics,
        practicalApplications,
        mustKeepDetails,
        assessmentAreas: normalizeStringArray(analysis.assessmentAreas, []),
        regulationCompliance: Array.isArray(analysis.regulationCompliance)
            ? normalizeStringArray(analysis.regulationCompliance, [])
            : undefined,
        themeColor: analysis.themeColor,
        hasRichContext: analysis.hasRichContext,
        additionalContext: analysis.additionalContext,
        customRequirements: analysis.customRequirements,
        isCodeTopic,
        isVishing,
        isSmishing,
        deliveryChannel,
    };
}


