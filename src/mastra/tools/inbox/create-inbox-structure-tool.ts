import { Tool } from '@mastra/core/tools';

import { generateText } from 'ai';
import { LanguageModel } from '../../types/language-model';
import { MicrolearningContent } from '../../types/microlearning';
import { MicrolearningService } from '../../services/microlearning-service';
import { getModelWithOverride } from '../../model-providers';
import {
  InboxContentSchema,
  CreateInboxStructureSchema,
  CreateInboxStructureOutputSchema
} from '../../schemas';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { generateInboxTextsPrompt } from './generators/inbox-texts-generator';
import { generateInboxEmailsParallel } from './generators/inbox-emails-orchestrator';
import { LOCALIZER_PARAMS } from '../../utils/config/llm-generation-params';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';

const microlearningService = new MicrolearningService();

export const createInboxStructureTool = new Tool({
  id: 'create_inbox_structure',
  description: 'Create inbox structure and persist examples/all/inbox/{language}.json',
  inputSchema: CreateInboxStructureSchema,
  outputSchema: CreateInboxStructureOutputSchema,
  execute: async (context: any) => {
    const logger = getLogger('CreateInboxStructureTool');
    const input = context?.inputData || context?.input || context;
    const { department, languageCode, microlearningId, microlearning, additionalContext, modelProvider, model: modelOverride } = input;

    try {
      const inboxContent = await createInboxStructure(department, languageCode, microlearningId, microlearning, additionalContext, modelProvider, modelOverride);

      logger.debug('Tool returning inbox content', { contentType: typeof inboxContent, keyCount: Object.keys(inboxContent || {}).length });

      return {
        success: true,
        data: inboxContent, // Return actual inbox content instead of metadata
        metadata: {
          department: department || 'all',
          languageCode,
          microlearningId,
          inboxPath: `inbox/${department || 'all'}/${languageCode}.json`,
          itemsGenerated: 1,
          estimatedDuration: '20 minutes max'
        }
      };

    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        department,
        languageCode,
        microlearningId,
        step: 'inbox-structure-creation',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Inbox structure creation failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});

// Main inbox structure creation function
async function createInboxStructure(
  department: string,
  languageCode: string,
  microlearningId: string,
  microlearning: MicrolearningContent,
  additionalContext?: string,
  modelProvider?: string,
  modelOverride?: string
) {
  const logger = getLogger('CreateInboxStructure');

  // Maintain in-memory assignment for analytics and tools
  await microlearningService.assignMicrolearningToDepartment(
    department || 'all',
    languageCode,
    microlearningId,
    'medium',
    undefined
  );

  // Build inbox payload in memory shape and upsert remotely
  const dept = department || 'all';

  // Generate dynamic inbox content with AI based on training topic and content
  try {
    const model = getModelWithOverride(modelProvider, modelOverride);
    const dynamicInboxData = await generateDynamicInboxWithAI(
      microlearning,
      languageCode,
      model,
      dept,  // Pass department for context-specific emails
      additionalContext
    );

    return dynamicInboxData; // Return the generated content

  } catch (firstError) {
    const err = normalizeError(firstError);
    logger.warn('First attempt to generate dynamic inbox failed, retrying once', { error: err.message, stack: err.stack });

    try {
      const model = getModelWithOverride(modelProvider, modelOverride);
      const dynamicInboxData = await generateDynamicInboxWithAI(
        microlearning,
        languageCode,
        model,
        dept,  // Pass department for context-specific emails
        additionalContext
      );

      return dynamicInboxData; // Return the generated content after retry

    } catch (secondError) {
      const err = normalizeError(secondError);
      logger.warn('Second attempt failed, using fallback structure', { error: err.message, stack: err.stack });
      // Fallback with user-friendly messages instead of empty structure
      const fallbackPayload = {
        texts: {
          title: 'Training Materials',
          description: 'The inbox is loading or temporarily unavailable.',
          emptyState: 'No simulations available at this time. Please try again later.',
          retry: 'Retry'
        },
        emails: []
      };
      return fallbackPayload;
    }
  }
}

async function generateDynamicInboxWithAI(
  microlearning: MicrolearningContent,
  languageCode: string,
  model: LanguageModel,
  department: string = 'all',  // NEW: Department context for topic-specific emails
  additionalContext?: string
) {
  const topic = microlearning.microlearning_metadata.title;
  const category = microlearning.microlearning_metadata.category;
  const riskArea = microlearning.microlearning_metadata.risk_area;
  const level = microlearning.microlearning_metadata.level;

  // Generate prompts using modular generators
  const textsPrompt = generateInboxTextsPrompt(topic, languageCode, microlearning);

  // Execute both phases
  const [textsResponse, emailsArray] = await Promise.all([
    withRetry(
      () => generateText({
        model: model,
        messages: [
          {
            role: 'system',
            content: `Generate ${topic} UI texts. Return only valid JSON - no markdown, no backticks. Use exact format shown in user prompt.`
          },
          { role: 'user', content: textsPrompt }
        ],
        ...LOCALIZER_PARAMS,
      }),
      `Inbox texts generation for ${topic}`
    ),
    withRetry(
      () => generateInboxEmailsParallel({
        topic,
        languageCode,
        category,
        riskArea,
        level,
        department,  // NEW: Pass department for context-specific emails
        additionalContext,
        model
      }),
      `Inbox emails generation for ${topic}`
    )
  ]);

  // Parse responses with graceful fallbacks
  const logger = getLogger('GenerateDynamicInboxWithAI');
  let textsData: Record<string, unknown> = {};  // Default fallback
  const emailsData = emailsArray;  // Emails already generated

  try {
    // Use json-cleaner for robust JSON cleaning with jsonrepair
    const cleanedTexts = cleanResponse(textsResponse.text, 'inbox-texts');
    textsData = JSON.parse(cleanedTexts) as Record<string, unknown>;
    logger.debug('Inbox texts parsed successfully', {});
  } catch (parseError) {
    const err = normalizeError(parseError);
    logger.warn('Texts JSON parsing failed, using empty fallback', { error: err.message, stack: err.stack });
    // textsData stays as {} - no throw, no propagation
  }

  const aiResponse = {
    texts: textsData,
    emails: emailsData
  };

  // Validate with schema
  try {
    const validatedInboxContent = InboxContentSchema.parse(aiResponse);
    logger.debug('Generated inbox content validated successfully', { topic });
    return validatedInboxContent;
  } catch (validationError) {
    const err = normalizeError(validationError);
    logger.warn('Inbox content validation failed, using fallback', { error: err.message, stack: err.stack });
    // Return fallback structure instead of undefined
    return {
      texts: textsData || {},
      emails: emailsData || []
    };
  }
}

export type CreateInboxStructureInput = typeof CreateInboxStructureSchema;
export type CreateInboxStructureOutput = typeof CreateInboxStructureOutputSchema;