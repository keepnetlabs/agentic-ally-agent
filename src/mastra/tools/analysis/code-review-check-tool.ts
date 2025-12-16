import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { MODEL_PROVIDERS } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';

const CodeReviewCheckSchema = z.object({
  issueType: z.string().describe('Type of issue to fix (e.g., "SQL Injection", "XSS", "Logic Error", "Performance Issue")'),
  originalCode: z.string().describe('The original code with the issue'),
  fixedCode: z.string().describe('The code after developer attempted to fix it'),
  language: z.string().describe('Programming language (javascript, python, java, etc.)'),
  outputLanguage: z.string().optional().default('en').describe('Output language for feedback, explanation and hint (e.g., "en", "tr", "de", "fr", etc.)'),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
  model: z.string().optional().describe('Model name override'),
});

const CodeReviewCheckOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    isCorrect: z.boolean().describe('Whether the fix properly addresses the vulnerability'),
    severity: z.enum(['correct', 'partial', 'incorrect']).describe('How close the fix is to correct'),
    feedback: z.string().describe('Immediate 1-2 sentence feedback for learner (in requested output language)'),
    explanation: z.string().describe('Detailed explanation why correct/incorrect (in requested output language)'),
    points: z.number().min(0).max(25).describe('Points earned (0-25)'),
    hint: z.string().optional().describe('Solution-oriented hint for next attempt if incorrect (in requested output language)'),
  }),
  error: z.string().optional(),
});

export const codeReviewCheckTool = new Tool({
  id: 'code_review_check',
  description: 'Validate if developer correctly fixed the vulnerable code by having AI review the fix',
  inputSchema: CodeReviewCheckSchema,
  outputSchema: CodeReviewCheckOutputSchema,
  execute: async (context: any) => {
    // Support both direct root-level fields (from API endpoint) and nested formats (from agent calls)
    const input = context?.inputData || context?.input || context;
    const {
      issueType,
      originalCode,
      fixedCode,
      language,
      outputLanguage = 'en',
      modelProvider,
      model: modelOverride,
    } = input;

    // Use model override if provided, otherwise use default
    const model = getModelWithOverride(modelProvider, modelOverride);
    const logger = getLogger('CodeReviewCheckTool');

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

      // Call AI for validation
      const response = await generateText({
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
      });

      // Parse and validate response
      const cleanedResponse = cleanResponse(response.text, 'code-review-check');
      const result = JSON.parse(cleanedResponse);

      // Determine points based on correctness
      const points = result.isCorrect ? 25 : result.severity === 'partial' ? 10 : 0;

      const parsedSeverity = result.severity || (result.isCorrect ? 'correct' : 'incorrect');
      if (!['correct', 'partial', 'incorrect'].includes(parsedSeverity)) {
        throw new Error(`Invalid severity: ${parsedSeverity}`);
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
      const err = error instanceof Error ? error : new Error(String(error));
      const errorInfo = errorService.aiModel(err.message, {
        issueType,
        language,
        stack: err.stack,
      });

      logger.error('Code review check failed', errorInfo);

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

export type CodeReviewCheckInput = z.infer<typeof CodeReviewCheckSchema>;
export type CodeReviewCheckOutput = z.infer<typeof CodeReviewCheckOutputSchema>;
