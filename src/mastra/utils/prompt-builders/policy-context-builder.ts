/**
 * Policy Context Builder
 * Builds consistent, AI-optimized policy context blocks for prompts
 * Ensures AI prioritizes and respects company policies in all content generation
 */

/**
 * Format types for policy context
 * - system: For system prompts (initial instruction)
 * - enhancement: For enhancement/refinement prompts (with Do not ignore directive)
 * - scene: For scene generation (mandatory alignment instruction)
 */
type PolicyContextFormat = 'system' | 'enhancement' | 'scene';

/**
 * Build policy context block with AI-optimized formatting
 * Uses critical markers and mandatory language to ensure AI attention
 *
 * @param policyContext - Raw policy content (multiple policies concatenated)
 * @param format - Format type (system, enhancement, or scene)
 * @returns Formatted policy context block ready for prompt injection
 */
export function buildPolicyContextBlock(
  policyContext?: string,
  format: PolicyContextFormat = 'system'
): string {
  if (!policyContext || policyContext.trim() === '') {
    return '';
  }

  const criticalMarker = '🔴 CRITICAL - MANDATORY COMPANY POLICIES:';
  const baseBlock = `${criticalMarker}\n${policyContext}`;

  switch (format) {
    case 'system':
      return `\n\n${baseBlock}\n\nINSTRUCTION: Reference and align all content with these exact company policies. These are mandatory guidelines.`;

    case 'enhancement':
      return `\n\n${baseBlock}\n\nINSTRUCTION: Enhance content to strictly align with these company policies. Do not ignore these guidelines.`;

    case 'scene':
      return `\n\n${baseBlock}\n\nINSTRUCTION: Generate content that strictly respects and references these exact company policies in every section.`;

    default:
      return `\n\n${baseBlock}`;
  }
}

/**
 * Build policy context for system prompt (most common use)
 * Quick helper for system prompt integration
 */
export function buildPolicySystemPrompt(policyContext?: string): string {
  return buildPolicyContextBlock(policyContext, 'system');
}

/**
 * Build policy context for enhancement prompt
 * Quick helper for refinement/enhancement operations
 */
export function buildPolicyEnhancementPrompt(policyContext?: string): string {
  return buildPolicyContextBlock(policyContext, 'enhancement');
}

/**
 * Build policy context for scene generation
 * Quick helper for scene-specific instructions
 */
export function buildPolicyScenePrompt(policyContext?: string): string {
  return buildPolicyContextBlock(policyContext, 'scene');
}
