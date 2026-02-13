import { createStep, createWorkflow } from '@mastra/core/workflows';
import { KVService } from '../services/kv-service';
import { getLogger } from '../utils/core/logger';
import { normalizeDepartmentName } from '../utils/language/language-utils';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { API_ENDPOINTS } from '../constants';
import { waitForKVConsistency, buildExpectedKVKeys } from '../utils/kv-consistency';
import { withRetry } from '../utils/core/resilience-utils';
import { normalizeThemeBackgroundClass } from '../utils/theme/theme-color-normalizer';
import { ProductService } from '../services/product-service';
import { resolveLogoAndBrand } from '../utils/phishing/brand-resolver';
import { getModelWithOverride } from '../model-providers';
import {
  updateInputSchema,
  updateOutputSchema,
  loadMicrolearningOutputSchema,
  mergeUpdatesInputSchema,
  mergeUpdatesOutputSchema,
  saveUpdatesInputSchema
} from '../schemas/update-microlearning-schemas';
import { handleLogoHallucination } from '../utils/microlearning/logo-utils';
import { deepMerge } from '../utils/object-utils';

const logger = getLogger('UpdateMicrolearningWorkflow');

// Color normalization moved to utils/theme/theme-color-normalizer.ts (preset → AI fallback → default)

// Step 1: Load and validate existing microlearning
const loadMicrolearningStep = createStep({
  id: 'load-microlearning',
  description: 'Load existing microlearning from KV',
  inputSchema: updateInputSchema,
  outputSchema: loadMicrolearningOutputSchema,
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
  inputSchema: mergeUpdatesInputSchema,
  outputSchema: mergeUpdatesOutputSchema,
  execute: async ({ inputData }) => {
    const { microlearningId, department, currentContent, currentVersion, updates: rawUpdates, model, modelProvider } = inputData;
    const updates = handleLogoHallucination(rawUpdates, microlearningId);

    logger.info('Received update request', {
      microlearningId,
      department,
      updatesKeys: Object.keys(updates),
      rawUpdates: JSON.stringify(updates)
    });

    const newVersion = currentVersion + 1;
    const updatedContent = JSON.parse(JSON.stringify(currentContent)); // Deep clone
    const changes: Record<string, any> = {};

    // Apply theme updates - deep merge for flexibility
    if (updates.theme) {
      if (!updatedContent.theme) {
        updatedContent.theme = {};
      }

      // Handle Whitelabel Logo Override
      // Check for brandName in both root and theme (agent sometimes nests it)
      const targetBrandName = updates.brandName || updates.theme?.brandName;

      if (updates.useWhitelabelLogo) {
        try {
          const productService = new ProductService();
          const config = await productService.getWhitelabelingConfig();
          if (config?.mainLogoUrl) {
            updates.theme.logo = {
              ...(updates.theme.logo || {}),
              src: config.mainLogoUrl,
              // Fallback to main logo as dark logo is not always available in config
              darkSrc: config.mainLogoUrl
            };
            logger.info('Whitelabel logo applied via overrides', { microlearningId, logoUrl: config.mainLogoUrl });
          } else {
            logger.warn('useWhitelabelLogo requested but no config found', { microlearningId });
          }
        } catch (err) {
          const normalized = normalizeError(err);
          const errorInfo = errorService.external(normalized.message, {
            step: 'apply-whitelabel-logo',
            stack: normalized.stack,
            microlearningId,
          });
          logErrorInfo(logger, 'warn', 'Failed to apply whitelabel logo', errorInfo);
        }
      } else if (targetBrandName) {
        logger.info('Processing external brand update', { brandName: targetBrandName });
        // Handle External Brand Resolution
        try {
          // Use default model or override if provided
          const aiModel = getModelWithOverride(modelProvider, model);

          // Use resolveLogoAndBrand to find the logo URL for the brand
          // We pass the brand name as both name and scenario since we just want logo resolution
          const brandInfo = await resolveLogoAndBrand(targetBrandName, `Brand update to ${targetBrandName}`, aiModel);

          logger.info('Brand resolution result', {
            brand: targetBrandName,
            resolvedLogo: brandInfo.logoUrl
          });

          if (brandInfo.logoUrl) {
            updates.theme.logo = {
              ...(updates.theme.logo || {}),
              src: brandInfo.logoUrl,
              darkSrc: brandInfo.logoUrl // Use same logo for dark mode if resolved externally
            };
            logger.info('External brand logo applied to updates object', {
              microlearningId,
              brand: targetBrandName,
              finalLogoConfig: updates.theme.logo
            });
          } else {
            logger.warn('Brand resolution returned no logo URL', { brand: targetBrandName });
          }
        } catch (err) {
          const normalized = normalizeError(err);
          const errorInfo = errorService.external(normalized.message, {
            step: 'resolve-external-brand-logo',
            stack: normalized.stack,
            brand: targetBrandName,
          });
          logErrorInfo(logger, 'warn', 'Failed to resolve external brand logo', errorInfo);
        }
      } else {
        logger.debug('No brand updates detected', {
          updatesKeys: Object.keys(updates),
          themeKeys: updates.theme ? Object.keys(updates.theme) : [],
          hasLogo: !!updates.theme?.logo
        });
      }

      // Normalize color if provided
      if (updates.theme.colors?.background) {
        const inputColor = updates.theme.colors.background;
        const normalizedColor = await normalizeThemeBackgroundClass(inputColor, modelProvider, model);
        updates.theme.colors.background = normalizedColor;
        logger.debug('Color normalized in merge', {
          microlearningId,
          input: inputColor,
          normalized: normalizedColor,
        });
      }

      // Use deep merge to handle nested theme properties
      updatedContent.theme = deepMerge(updatedContent.theme, updates.theme);

      // DEBUG: Verify merge result for logo
      if (updates.theme?.logo) {
        logger.info('Theme merge complete. Verifying logo state:', {
          inputUpdateLogo: updates.theme.logo,
          mergedOutputLogo: updatedContent.theme?.logo
        });
      }

      // Track theme changes
      const themeObj = updates.theme as Record<string, unknown>;
      for (const key in themeObj) {
        changes[`theme.${key}`] = themeObj[key];
      }
    }

    // Update version and timestamp
    updatedContent.version = newVersion;
    updatedContent.updated_at = new Date().toISOString();

    logger.debug('Theme merged', {
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
  inputSchema: saveUpdatesInputSchema,
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

      // Add a small safety buffer for edge propagation so UI sees changes immediately
      await new Promise(resolve => setTimeout(resolve, 1500));

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
      const errorInfo = errorService.external(err.message, {
        step: 'save-updates',
        stack: err.stack,
        microlearningId,
      });
      logErrorInfo(logger, 'error', 'Failed to save updates', errorInfo);

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
