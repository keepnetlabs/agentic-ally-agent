import { z } from 'zod';
import type { LanguageModel } from 'ai';

/**
 * Zod schema for LanguageModel validation
 *
 * Note: LanguageModel from AI SDK is a complex interface with generics
 * that cannot be fully validated with Zod. We use z.custom() with type assertion
 * to provide type safety while allowing the actual AI SDK model objects to pass through.
 */
export const LanguageModelSchema = z
  .custom<LanguageModel>(
    val => {
      // Basic validation: check if it looks like a LanguageModel
      return typeof val === 'object' && val !== null && 'provider' in val && 'modelId' in val;
    },
    {
      message: 'Must be a valid AI language model instance',
    }
  )
  .describe('AI language model instance (OpenAI, Google, Workers AI)');

/**
 * Export LanguageModel type for TypeScript usage
 */
export type { LanguageModel };
