import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { MicrolearningContent, LanguageContent } from '../types/microlearning';
import { PromptAnalysis } from '../types/prompt-analysis';
import { MicrolearningService } from '../services/microlearning-service';
import { getModel, Model, ModelProvider } from '../model-providers';
import { RemoteStorageService } from '../services/remote-storage-service';
import { MicrolearningContentSchema, LanguageContentSchema } from '../schemas/microlearning-schema';
import { analyzeUserPromptTool } from './analyze-user-prompt-tool';
import { generateMicrolearningJsonTool } from './generate-microlearning-json-tool';
import { generateLanguageJsonTool } from './generate-language-json-tool';
import { createInboxStructureTool } from './create-inbox-structure-tool';
import { generateMicrolearningId, normalizeDepartmentName } from '../utils/language-utils';
import { UniversalMicrolearningInputSchema, UniversalMicrolearningOutputSchema } from '../schemas/universal-content-schema';

const microlearningService = new MicrolearningService();

export const generateUniversalMicrolearningTool = new Tool({
  id: 'generate_universal_microlearning',
  description: 'Generate complete microlearning from ANY user prompt in ANY language - fully AI-powered dynamic content generation',
  inputSchema: UniversalMicrolearningInputSchema,
  outputSchema: UniversalMicrolearningOutputSchema,
  execute: async (context: any) => {
    // Handle Mastra workflow format - try inputData first, then input
    const actualInput = context?.inputData || context?.input || context;

    // Manual validation bypass if needed
    if (!actualInput?.prompt) {
      console.error('❌ No prompt found in context:', { context, actualInput });
      return {
        success: false,
        error: 'Prompt is required but not found in context'
      };
    }

    const input = {
      prompt: actualInput.prompt,
      department: actualInput.department || 'All',
      additionalContext: actualInput.additionalContext,
      customRequirements: actualInput.customRequirements
    };

    console.log('🔧 Universal generator input:', { input });
    const model = getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B);

    try {
      // Step 1: AI analyzes user prompt with rich context
      console.log(`🤖 Step 1: Analyzing enhanced prompt: "${input.prompt.substring(0, 100)}..."`);
      if (input.additionalContext) {
        console.log(`📄 Additional context provided: ${input.additionalContext.length} characters`);
      }
      if (!analyzeUserPromptTool.execute) {
        throw new Error('Analyze user prompt tool is not executable');
      }

      const analysisResult = await analyzeUserPromptTool.execute({
        inputData: {
          userPrompt: input.prompt,
          additionalContext: input.additionalContext,
          suggestedDepartment: input.department,
          customRequirements: input.customRequirements
        }
      });

      if (!analysisResult?.success) {
        throw new Error('Prompt analysis failed');
      }

      const promptAnalysis: PromptAnalysis = {
        ...analysisResult.data
      };

      // Step 2: Generate microlearning JSON structure using tool
      console.log(`📋 Step 2: Generating microlearning.json for topic: ${promptAnalysis.topic}`);
      const microlearningId = generateMicrolearningId(promptAnalysis.topic);

      if (!generateMicrolearningJsonTool.execute) {
        throw new Error('Generate microlearning JSON tool is not executable');
      }

      const microlearningResult = await generateMicrolearningJsonTool.execute({
        inputData: {
          analysis: promptAnalysis,
          microlearningId: microlearningId,
          model: model
        }
      });

      if (!microlearningResult?.success) {
        throw new Error(microlearningResult?.error || 'Microlearning JSON generation failed');
      }

      const microlearningStructure = microlearningResult.data;

      // Validate microlearning
      let mlToSave: MicrolearningContent = microlearningStructure;
      for (let attempt = 0; attempt < 2; attempt++) {
        const valid = MicrolearningContentSchema.safeParse(mlToSave);
        if (valid.success) break;
        // Try soft repair via model
        try {
          const issues = valid.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
          const repairPrompt = `Repair this microlearning JSON to satisfy schema. Keep existing content, only add missing keys or correct types. Issues: ${issues}`;
          const repair = await generateText({
            model: model,
            messages: [
              { role: 'system', content: 'Return only valid JSON. Do not add commentary.' },
              { role: 'user', content: repairPrompt + '\n\n' + JSON.stringify(mlToSave) }
            ]
          });
          mlToSave = JSON.parse(repair.text);
        } catch (_) { break; }
      }

      // Store microlearning.json in memory AFTER validation/repair
      await microlearningService.storeMicrolearning(mlToSave);

      // Remote save: {microlearningId}.json
      const remote = new RemoteStorageService();
      await remote.saveMicrolearning(microlearningId, mlToSave);
      // Step 3: AI generates language-specific content following JSON standard
      console.log(`🌐 Step 3: Generating ${promptAnalysis.language}.json content`);
      if (!generateLanguageJsonTool.execute) {
        throw new Error('generateLanguageJsonTool.execute is not available');
      }

      const languageResult = await generateLanguageJsonTool.execute({
        inputData: {
          analysis: promptAnalysis,
          microlearning: microlearningStructure,
          model: model
        }
      });

      if (!languageResult.success) {
        throw new Error(`Language content generation failed: ${languageResult.error}`);
      }

      let languageContent = languageResult.data as LanguageContent;

      // Validate language content
      for (let attempt = 0; attempt < 2; attempt++) {
        const valid = LanguageContentSchema.safeParse(languageContent);
        if (valid.success) break;
        try {
          const issues = valid.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
          const repairPrompt = `Repair this language content JSON to satisfy schema. Keep existing content, add missing keys. Issues: ${issues}`;
          const repair = await generateText({
            model: model,
            messages: [
              { role: 'system', content: 'Return only valid JSON. Do not add commentary.' },
              { role: 'user', content: repairPrompt + '\n\n' + JSON.stringify(languageContent) }
            ]
          });
          languageContent = JSON.parse(repair.text) as LanguageContent;
        } catch (_) { break; }
      }

      // Store language content in memory AFTER validation
      await microlearningService.storeLanguageContent(microlearningId, promptAnalysis.language, languageContent);

      // Remote save language file: {microlearningId}/{lang}.json
      await remote.saveLanguageFile(microlearningId, promptAnalysis.language, languageContent);

      // Step 4: Create inbox structure (inbox/{departmentOrAll}/{lang}.json)
      const normalizedDept = promptAnalysis.department ? normalizeDepartmentName(promptAnalysis.department) : 'all';
      console.log(`📥 Step 4: Creating inbox/${normalizedDept}/${promptAnalysis.language}.json`);

      if (!createInboxStructureTool.execute) {
        throw new Error('createInboxStructureTool.execute is not available');
      }

      const inboxResult = await createInboxStructureTool.execute({
        inputData: {
          department: normalizedDept,
          languageCode: promptAnalysis.language,
          microlearningId: microlearningId,
          microlearning: microlearningStructure,
          languageContent: languageContent,
          remote: remote
        }
      });

      if (!inboxResult.success) {
        throw new Error(`Inbox structure creation failed: ${inboxResult.error}`);
      }

      // Generate training URL
      const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
      const langUrl = encodeURIComponent(`lang/${promptAnalysis.language}`);
      const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
      const trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}`;

      return {
        success: true,
        message: `🎉 Complete microlearning pipeline created!\n\n🔗 Training URL: ${trainingUrl}`,
        data: {
          microlearningId,
          title: promptAnalysis.title,
          microlearningMetadata: microlearningStructure.microlearning_metadata,
          detectedLanguage: promptAnalysis.language,
          languageContent,
          languageFilePath: `${microlearningId}/${promptAnalysis.language}.json`,
          targetDepartment: normalizedDept,
          trainingUrl,
          filesGenerated: [
            `${microlearningId}.json`,
            `${microlearningId}/${promptAnalysis.language}.json`,
            `inbox/${normalizedDept}/${promptAnalysis.language}.json`
          ]
        },
        pipeline_summary: {
          step1_prompt_analysis: {
            detected_language: promptAnalysis.language,
            extracted_topic: promptAnalysis.topic,
            target_department: promptAnalysis.department,
            difficulty_level: promptAnalysis.level,
            has_rich_context: promptAnalysis.hasRichContext || false,
            has_custom_requirements: !!promptAnalysis.customRequirements
          },
          step2_microlearning_json: {
            generated: true,
            scenes_count: 8,
            total_points: 100
          },
          step3_language_content: {
            language_code: promptAnalysis.language,
            content_type: "JSON standard compliant",
            ai_generated: true
          },
          step4_inbox_assignment: {
            department: normalizedDept,
            file_path: `inbox/${normalizedDept}/${promptAnalysis.language}.json`,
            assigned: true
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        message: `❌ Failed to generate microlearning from prompt: ${input.prompt}`
      };
    }
  },
});

