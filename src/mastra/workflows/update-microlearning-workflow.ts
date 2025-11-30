import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { generateText } from 'ai';
import { KVService } from '../services/kv-service';
import { Logger } from '../utils/logger';
import { normalizeDepartmentName } from '../utils/language-utils';
import { getModelWithOverride } from '../model-providers';
import { THEME_COLORS } from '../constants';
import { DEFAULT_GENERATION_PARAMS } from '../utils/llm-generation-params';

const logger = new Logger('UpdateMicrolearningWorkflow');

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
function deepMerge(target: any, source: any): any {
  if (!source) return target;

  const result = JSON.parse(JSON.stringify(target)); // Deep clone

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // Recursive merge for nested objects
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        // Direct assignment for primitives and arrays
        result[key] = source[key];
      }
    }
  }

  return result;
}

// Color normalization - AI-powered CSS class matching
async function normalizeThemeColor(colorInput: string, modelProvider?: string, modelName?: string): Promise<string> {
  // Check if already a valid CSS class
  if (THEME_COLORS.VALUES.includes(colorInput as any)) {
    return colorInput;
  }

  try {
    // Use model override if provided, otherwise use default (Cloudflare Workers AI)
    const finalModel = getModelWithOverride(modelProvider, modelName);

    const systemPrompt = `ROLE: CSS Color Class Matcher
TASK: Return ONLY the CSS class name - nothing else

CRITICAL RULES:
1. Output ONLY one CSS class name from the provided list
2. NO explanation text, NO quotes, NO backticks, NO markdown
3. NO newlines, NO whitespace before/after
4. NO "The answer is..." or any prefix/suffix
5. Just the class name: bg-gradient-red (EXAMPLE ONLY)
6. If multiple matches, choose closest semantic match
7. If no perfect match, pick best approximation

CONSTRAINT: Your response must be exactly one line with only the CSS class name`;

    const userPrompt = `User requested color: "${colorInput}"

Available colors:
${THEME_COLORS.VALUES.map((c) => `- ${c}`).join('\n')}

Respond with ONLY the CSS class name. Nothing else.`;

    const { text } = await generateText({
      model: finalModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...DEFAULT_GENERATION_PARAMS,
    });

    // Parse response - extract and validate color
    let selectedColor = text.trim().split('\n')[0].trim();

    // Try direct match
    if (THEME_COLORS.VALUES.includes(selectedColor as any)) {
      logger.info('Color normalized', { input: colorInput, output: selectedColor });
      return selectedColor;
    }

    // Fallback: search for pattern in response (in case AI added explanation)
    const classNamePattern = /bg-gradient-[\w-]+/;
    const match = text.match(classNamePattern);
    if (match && THEME_COLORS.VALUES.includes(match[0] as any)) {
      logger.info('Color normalized', { input: colorInput, output: match[0] });
      return match[0];
    }

    // No valid color found, use default
    logger.warn('Invalid color returned from AI', { input: colorInput, aiOutput: selectedColor });
    return THEME_COLORS.DEFAULT;
  } catch (error) {
    logger.error('Color normalization failed', error as Error, { colorInput });
    return THEME_COLORS.DEFAULT;
  }
}

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
    model: z.any().optional(),
    modelProvider: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const kvService = new KVService();
    const { microlearningId, department, updates, model, modelProvider } = inputData;

    logger.info('Loading microlearning', { microlearningId, department });

    const baseKey = `ml:${microlearningId}:base`;
    const currentContent = await kvService.get(baseKey);

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
    model: z.any().optional(),
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
        const normalizedColor = await normalizeThemeColor(inputColor, modelProvider, model);
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
        throw new Error('Failed to save updated microlearning to KV');
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
      const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
      const langUrl = encodeURIComponent(`lang/${language}`);
      const inboxUrl = encodeURIComponent(`inbox/${normalizedDepartment}`);
      const trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

      logger.info('Microlearning updated successfully', {
        microlearningId,
        newVersion,
        changeCount: Object.keys(changes).length,
        trainingUrl,
      });

      // Wait 5 seconds to ensure Cloudflare KV data is consistent before returning URL to UI
      console.log('⏳ Waiting 5 seconds for Cloudflare KV consistency...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('✅ KV consistency check complete, returning training URL');

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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to save updates', error as Error, { microlearningId });

      return {
        success: false,
        status: 'Update failed',
        error: errorMsg,
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
