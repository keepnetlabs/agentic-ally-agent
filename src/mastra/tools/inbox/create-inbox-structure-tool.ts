import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { MicrolearningContent } from '../../types/microlearning';
import { MicrolearningService } from '../../services/microlearning-service';
import { getModelWithOverride } from '../../model-providers';
import { InboxContentSchema } from '../../schemas/microlearning-schema';
import { CreateInboxStructureSchema, CreateInboxStructureOutputSchema } from '../../schemas/create-inbox-structure-schema';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { generateInboxTextsPrompt } from './generators/inbox-texts-generator';
import { generateInboxEmailsParallel } from './generators/inbox-emails-orchestrator';
import { LOCALIZER_PARAMS } from '../../utils/config/llm-generation-params';

const microlearningService = new MicrolearningService();

export const createInboxStructureTool = new Tool({
  id: 'create_inbox_structure',
  description: 'Create inbox structure and persist examples/all/inbox/{language}.json',
  inputSchema: CreateInboxStructureSchema,
  outputSchema: CreateInboxStructureOutputSchema,
  execute: async (context: any) => {
    const input = context?.inputData || context?.input || context;
    const { department, languageCode, microlearningId, microlearning, additionalContext, modelProvider, model: modelOverride } = input;

    try {
      const inboxContent = await createInboxStructure(department, languageCode, microlearningId, microlearning, additionalContext, modelProvider, modelOverride);

      console.log(`📦 Tool returning inbox content:`, typeof inboxContent, Object.keys(inboxContent || {}));

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
      console.error('Inbox structure creation failed:', error);

      return {
        success: false,
        error: (error as Error).message
      };
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
    console.warn('First attempt to generate dynamic inbox failed, retrying once:', firstError);

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
      console.warn('Second attempt failed, using fallback:', secondError);
      // Fallback to basic structure
      const fallbackPayload = { texts: {}, emails: [] };
      return fallbackPayload; // Return the fallback content
    }
  }
}

async function generateDynamicInboxWithAI(
  microlearning: MicrolearningContent,
  languageCode: string,
  model: any,
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
    generateText({
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
    generateInboxEmailsParallel({
      topic,
      languageCode,
      category,
      riskArea,
      level,
      department,  // NEW: Pass department for context-specific emails
      additionalContext,
      model
    })
  ]);

  // Parse responses with simplified error handling
  let textsData, emailsData;

  try {
    // Use json-cleaner for robust JSON cleaning with jsonrepair
    const cleanedTexts = cleanResponse(textsResponse.text, 'inbox-texts');

    try {
      textsData = JSON.parse(cleanedTexts);
      console.log('✅ Inbox texts parsed successfully');
    } catch (textsError) {
      console.warn('Texts JSON parse failed, using fallback:', textsError);
      throw textsError;
    }

    emailsData = emailsArray;

  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
  }

  const aiResponse = {
    texts: textsData,
    emails: emailsData
  };

  // Validate with schema
  try {
    const validatedInboxContent = InboxContentSchema.parse(aiResponse);
    console.log(`✅ Generated inbox content validated successfully for topic: ${topic}`);
    return validatedInboxContent;
  } catch (validationError) {
    console.warn('Inbox content validation failed, using fallback:', validationError);
  }
}

export type CreateInboxStructureInput = typeof CreateInboxStructureSchema;
export type CreateInboxStructureOutput = typeof CreateInboxStructureOutputSchema;