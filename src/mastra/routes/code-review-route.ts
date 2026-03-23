/**
 * POST /code-review-validate - Code Review Validation Route Handler
 *
 * Validates code review check submissions using the codeReviewCheckTool.
 */

import { Context } from 'hono';
import { codeReviewCheckTool } from '../tools';
import type { CodeReviewCheckInput } from '../tools/analysis/code-review-check-schemas';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import type { CodeReviewRequestBody } from '../types';

const logger = getLogger('CodeReviewRoute');

export async function codeReviewValidateHandler(c: Context) {
  try {
    const body = await c.req.json<CodeReviewRequestBody>();

    // Type-safe execution - Tool.execute expects root-level fields matching inputSchema
    if (!codeReviewCheckTool.execute) {
      throw new Error('Code review tool execute method not available');
    }
    // v1 Migration: execute now takes (inputData, context)
    const result = await codeReviewCheckTool.execute(body as CodeReviewCheckInput, {});

    // v1: Check for ValidationError first
    if ('error' in result && result.error) {
      return c.json(result, 400);
    }

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.aiModel(err.message, {
      step: 'code-review-validate',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'code_review_validation_error', errorInfo);
    return c.json(
      {
        success: false,
        data: {
          isCorrect: false,
          severity: 'incorrect',
          feedback: 'Error validating code',
          explanation: error instanceof Error ? error.message : 'Unknown error occurred',
          points: 0,
          hint: '',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
