/**
 * Scene types used throughout the microlearning system
 * These map to specific rewriters and scene generators
 */
export enum SceneType {
  INTRO = 'intro',
  GOAL = 'goal',
  SCENARIO = 'scenario',
  ACTIONABLE_CONTENT = 'actionable_content',
  CODE_REVIEW = 'code_review',
  QUIZ = 'quiz',
  SURVEY = 'survey',
  NUDGE = 'nudge',
  SUMMARY = 'summary'
}

/**
 * Type guard to check if a string is a valid scene type
 */
export function isValidSceneType(type: string): type is SceneType {
  return Object.values(SceneType).includes(type as SceneType);
}

/**
 * Get scene type from string with fallback
 */
export function getSceneTypeOrDefault(type: string | undefined, defaultType: SceneType = SceneType.ACTIONABLE_CONTENT): SceneType {
  if (!type) return defaultType;
  return isValidSceneType(type) ? (type as SceneType) : defaultType;
}
