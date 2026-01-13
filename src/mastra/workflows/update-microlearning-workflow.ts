import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { KVService } from '../services/kv-service';
import { getLogger } from '../utils/core/logger';
import { normalizeDepartmentName } from '../utils/language/language-utils';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { API_ENDPOINTS } from '../constants';
import { waitForKVConsistency, buildExpectedKVKeys } from '../utils/kv-consistency';
import { withRetry } from '../utils/core/resilience-utils';
import { normalizeThemeBackgroundClass } from '../utils/theme/theme-color-normalizer';

const logger = getLogger('UpdateMicrolearningWorkflow');

// Input/Output Schemas
const updateInputSchema = z.object({
  microlearningId: z.string().describe('ID of existing microlearning to update'),
  department: z.string().optional().default('All').describe('Department for context'),
  updates: z.object({
    theme: z
      .record(z.any())
      .describe('Theme updates (fontFamily, colors, logo)'),
  }).describe('Updates to apply'),
  modelProvider: z.string().optional().describe('Model provider override (OPENAI, WORKERS_AI, GOOGLE)'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

const updateOutputSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  metadata: z
    .object({
      microlearningId: z.string(),
      version: z.number(),
      changes: z.record(z.any()).optional(),
      trainingUrl: z.string().optional(),
      timestamp: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

// Deep merge utility - handles nested objects properly
function deepMerge<T>(target: T, source: any): T {
  if (!source) return target;

  const result = JSON.parse(JSON.stringify(target)); // Deep clone

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // Recursive merge for nested objects
         
        result[key] = deepMerge((result as any)[key] || {}, source[key]);
      } else {
        // Direct assignment for primitives and arrays
         
        (result as any)[key] = source[key];
      }
    }
  }

  return result;
}

// Color normalization moved to utils/theme/theme-color-normalizer.ts (preset → AI fallback → default)

// Step 1: Load and validate existing microlearning
const loadMicrolearningStep = createStep({
  id: 'load-microlearning',
  description: 'Load existing microlearning from KV',
  inputSchema: updateInputSchema,
  outputSchema: z.object({
    microlearningId: z.string(),
    department: z.string(),
    currentContent: z.any(),
    currentVersion: z.number(),
    updates: z.any(),
    model: z.string().optional(),
    modelProvider: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const kvService = new KVService();
    const { microlearningId, department, updates, model, modelProvider } = inputData;

    logger.info('Loading microlearning', { microlearningId, department });

    const baseKey = `ml:${microlearningId}:base`;
    const currentContent = await withRetry(
      () => kvService.get(baseKey),
      `KV load (microlearning base ${microlearningId})`
    );

    if (!currentContent) {
      throw new Error(`Microlearning ${microlearningId} not found`);
    }

    const currentVersion = currentContent.version || 1;

    logger.info('Microlearning loaded', {
      microlearningId,
      department,
      currentVersion,
      hasThemeUpdates: !!updates.theme,
    });

    return {
      microlearningId,
      department,
      currentContent,
      currentVersion,
      updates,
      model,
      modelProvider,
    };
  },
});

// Step 2: Merge theme updates with deep merge
const mergeUpdatesStep = createStep({
  id: 'merge-updates',
  description: 'Merge theme updates with current content',
  inputSchema: z.object({
    microlearningId: z.string(),
    department: z.string(),
    currentContent: z.any(),
    currentVersion: z.number(),
    updates: z.any(),
    model: z.string().optional(),
    modelProvider: z.string().optional(),
  }),
  outputSchema: z.object({
    microlearningId: z.string(),
    department: z.string(),
    updatedContent: z.any(),
    newVersion: z.number(),
    changes: z.record(z.any()),
  }),
  execute: async ({ inputData }) => {
    const { microlearningId, department, currentContent, currentVersion, updates, model, modelProvider } = inputData;

    const newVersion = currentVersion + 1;
    const updatedContent = JSON.parse(JSON.stringify(currentContent)); // Deep clone
    const changes: Record<string, any> = {};

    // Apply theme updates - deep merge for flexibility
    if (updates.theme) {
      if (!updatedContent.theme) {
        updatedContent.theme = {};
      }

      // Normalize color if provided
      if (updates.theme.colors?.background) {
        const inputColor = updates.theme.colors.background;
        const normalizedColor = await normalizeThemeBackgroundClass(inputColor, modelProvider, model);
        updates.theme.colors.background = normalizedColor;
        logger.info('Color normalized in merge', {
          microlearningId,
          input: inputColor,
          normalized: normalizedColor,
        });
      }

      // Use deep merge to handle nested theme properties
      updatedContent.theme = deepMerge(updatedContent.theme, updates.theme);

      // Track theme changes
      for (const key in updates.theme) {
        changes[`theme.${key}`] = updates.theme[key];
      }
    }

    // Update version and timestamp
    updatedContent.version = newVersion;
    updatedContent.updated_at = new Date().toISOString();

    logger.info('Theme merged', {
      microlearningId,
      department,
      newVersion,
      changeCount: Object.keys(changes).length,
    });

    return {
      microlearningId,
      department,
      updatedContent,
      newVersion,
      changes,
    };
  },
});

// Step 3: Save to KV and track history
const saveUpdatesStep = createStep({
  id: 'save-updates',
  description: 'Save updated microlearning to KV and track history',
  inputSchema: z.object({
    microlearningId: z.string(),
    department: z.string(),
    updatedContent: z.any(),
    newVersion: z.number(),
    changes: z.record(z.any()),
  }),
  outputSchema: updateOutputSchema,
  execute: async ({ inputData }) => {
    const { microlearningId, department, updatedContent, newVersion, changes } = inputData;
    const kvService = new KVService();

    try {
      logger.info('Saving updated microlearning', {
        microlearningId,
        department,
        newVersion,
      });

      // Save updated base content
      const baseKey = `ml:${microlearningId}:base`;
      const saved = await kvService.put(baseKey, updatedContent);

      if (!saved) {
        const errorInfo = errorService.external('Failed to save updated microlearning to KV', { microlearningId, step: 'save-updated-content' });
        logErrorInfo(logger, 'error', 'KV save failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      // Save version history entry
      const historyKey = `ml:${microlearningId}:history:${newVersion}`;
      const historyEntry = {
        action: 'updated',
        version: newVersion,
        timestamp: new Date().toISOString(),
        changes,
      };

      await kvService.put(historyKey, historyEntry);

      // Build training URL
      const language = updatedContent.microlearning_metadata?.language || 'en';
      const normalizedDepartment = normalizeDepartmentName(department || 'All');
      const langUrl = encodeURIComponent(`lang/${language}`);
      const inboxUrl = encodeURIComponent(`inbox/${normalizedDepartment}`);
      const trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?courseId=${microlearningId}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

      logger.info('Microlearning updated successfully', {
        microlearningId,
        newVersion,
        changeCount: Object.keys(changes).length,
        trainingUrl,
      });

      // Verify KV consistency before returning URL to UI
      const expectedKeys = buildExpectedKVKeys(microlearningId, language, normalizedDepartment);
      await waitForKVConsistency(microlearningId, expectedKeys);

      return {
        success: true,
        status: `Microlearning updated to version ${newVersion}`,
        metadata: {
          microlearningId,
          version: newVersion,
          changes,
          trainingUrl,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Failed to save updates', { error: err.message, stack: err.stack, microlearningId });

      return {
        success: false,
        status: 'Update failed',
        error: err.message,
      };
    }
  },
});

// Create Update Microlearning Workflow
const updateMicrolearningWorkflow = createWorkflow({
  id: 'update-microlearning-workflow',
  description: 'Update existing microlearning metadata and theme with version control',
  inputSchema: updateInputSchema,
  outputSchema: updateOutputSchema,
})
  .then(loadMicrolearningStep)
  .then(mergeUpdatesStep)
  .then(saveUpdatesStep);

updateMicrolearningWorkflow.commit();

export { updateMicrolearningWorkflow };
