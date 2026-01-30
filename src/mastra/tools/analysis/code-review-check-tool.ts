import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';
import { CodeReviewCheckSchema, CodeReviewCheckOutputSchema } from './code-review-check-schemas';

export type { CodeReviewCheckInput, CodeReviewCheckOutput } from './code-review-check-schemas';

const logger = getLogger('CodeReviewCheckTool');

export const codeReviewCheckTool = createTool({
  id: 'code_review_check',
  description: 'Validate if developer correctly fixed the vulnerable code by having AI review the fix',
  inputSchema: CodeReviewCheckSchema,
  outputSchema: CodeReviewCheckOutputSchema,
  // v1: (inputData, ctx) signature
  execute: async (inputData, _ctx?: ToolExecutionContext) => {
    const {
      issueType,
      originalCode,
      fixedCode,
      language,
      outputLanguage = 'en',
      modelProvider,
      model: modelOverride,
    } = inputData;

    // Use model override if provided, otherwise use default
    const model = getModelWithOverride(modelProvider, modelOverride);

    logger.info('Code Review Check', { issueType, language });

    try {
      // Create validation prompt
      const validationPrompt = buildCodeReviewCheckPrompt(
        issueType,
        originalCode,
        fixedCode,
        language,
        outputLanguage
      );

      // Call AI for validation with automatic retry
      const response = await withRetry(
        () => generateText({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a pragmatic code reviewer. Your job is to validate if a developer correctly fixed a code issue (could be a security vulnerability, logic error, performance problem, or other code defect).

Focus on: Does the fix solve the issue? If yes, it's correct - don't worry about whether it's the most elegant or best-practice approach. There are infinite ways to solve a problem.

IMPORTANT: Respond in ${outputLanguage} language. All feedback, explanation, and hint must be in ${outputLanguage}.

Return ONLY valid JSON - NO markdown, NO backticks, NO formatting. Start directly with {.`,
            },
            { role: 'user', content: validationPrompt },
          ],
          temperature: 0.3, // Lower temperature for consistency
        }),
        `[CodeReviewCheckTool] code-review-validation-${issueType}`
      );

      // Parse and validate response
      const cleanedResponse = cleanResponse(response.text, 'code-review-check');
      const result = JSON.parse(cleanedResponse);

      // Determine points based on correctness
      const points = result.isCorrect ? 25 : result.severity === 'partial' ? 10 : 0;

      const parsedSeverity = result.severity || (result.isCorrect ? 'correct' : 'incorrect');
      if (!['correct', 'partial', 'incorrect'].includes(parsedSeverity)) {
        const errorInfo = errorService.validation(`Invalid severity: ${parsedSeverity}`, { severity: parsedSeverity });
        logErrorInfo(logger, 'warn', 'Invalid severity', errorInfo);
        throw new Error(errorInfo.message);
      }

      return {
        success: true,
        data: {
          isCorrect: result.isCorrect,
          severity: parsedSeverity as 'correct' | 'partial' | 'incorrect',
          feedback: result.feedback,
          explanation: result.explanation,
          points: points,
          hint: result.hint || result.nextStep || '', // Always return hint, empty string if not provided
        },
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        issueType,
        language,
        stack: err.stack,
      });

      logErrorInfo(logger, 'error', 'Code review check failed', errorInfo);

      // Return error response with default data (required by OutputSchema)
      return {
        success: false,
        data: {
          isCorrect: false,
          severity: 'incorrect' as const,
          feedback: 'Error validating code',
          explanation: `Code review validation failed: ${err.message}`,
          points: 0,
          hint: '',
        },
        error: JSON.stringify(errorInfo),
      };
    }
  },
});

/**
 * Build the prompt for AI to validate the developer's code fix
 */
function buildCodeReviewCheckPrompt(
  issueType: string,
  originalCode: string,
  fixedCode: string,
  language: string,
  outputLanguage: string = 'en'
): string {
  return `Code Issue Validation Task:

ISSUE TYPE: ${issueType}

ORIGINAL CODE (WITH ISSUE):
\`\`\`${language}
${originalCode}
\`\`\`

DEVELOPER'S FIX:
\`\`\`${language}
${fixedCode}
\`\`\`

LANGUAGE: ${language}
OUTPUT LANGUAGE: ${outputLanguage}

VALIDATION TASK:
Review the developer's fix and determine if it properly addresses the "${issueType}" issue.

IMPORTANT: Respond in ${outputLanguage}. All feedback, explanation, and hint must be clear and actionable in ${outputLanguage}.

Criteria for a CORRECT fix:
1. The issue is properly resolved (the problem no longer exists)
2. The code is functional (doesn't break existing logic)
3. No new critical issues are introduced

What matters:
- Does the fix solve the issue? YES = correct
- There are many valid ways to solve an issue - accept any valid solution
- Code style, formatting, or elegance don't matter

Return JSON (in ${outputLanguage}):
{
  "isCorrect": boolean,
  "severity": "correct|partial|incorrect",
  "feedback": "1-2 sentence immediate feedback (in ${outputLanguage})",
  "explanation": "2-3 sentences explaining why the fix works or what's still broken (in ${outputLanguage})",
  "hint": "If incorrect, provide a solution-oriented hint for the developer to try again (optional, in ${outputLanguage})"
}

IMPORTANT:
- If the issue is fixed, mark as correct - don't penalize for non-optimal approaches
- Only mark incorrect if the issue is NOT fixed or new problems are introduced
- There are infinite ways to solve a problem - accept any that works
- No markdown, no backticks - just valid JSON`;
}
