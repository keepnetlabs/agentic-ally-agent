import { PHISHING } from '../constants';

const TRAINING_TO_PHISHING_MAP: Record<string, typeof PHISHING.DIFFICULTY_LEVELS[number]> = {
    beginner: 'Easy',
    intermediate: 'Medium',
    advanced: 'Hard',
};

const PHISHING_TO_TRAINING_MAP: Record<typeof PHISHING.DIFFICULTY_LEVELS[number], string> = {
    Easy: 'Beginner',
    Medium: 'Intermediate',
    Hard: 'Advanced',
};

/**
 * Normalize arbitrary difficulty labels into the phishing difficulty enum.
 */
export const normalizeDifficultyValue = (
    value: unknown
): typeof PHISHING.DIFFICULTY_LEVELS[number] | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const normalizedLower = trimmed.toLowerCase();
    if (TRAINING_TO_PHISHING_MAP[normalizedLower]) {
        return TRAINING_TO_PHISHING_MAP[normalizedLower];
    }

    const matched = PHISHING.DIFFICULTY_LEVELS.find((level) => level.toLowerCase() === normalizedLower);
    return matched;
};

export const mapTrainingLevelToPhishingDifficulty = (
    trainingLevel: string | undefined
): typeof PHISHING.DIFFICULTY_LEVELS[number] =>
    normalizeDifficultyValue(trainingLevel) ?? PHISHING.DEFAULT_DIFFICULTY;

/**
 * Map phishing difficulty back to the anticipated training level label.
 */
export const mapPhishingDifficultyToTrainingLevel = (difficulty: typeof PHISHING.DIFFICULTY_LEVELS[number]): string =>
    PHISHING_TO_TRAINING_MAP[difficulty] ?? 'Intermediate';


