// src/mastra/utils/prompt-builders/autonomous-prompts.ts
/**
 * Goal-based prompts for autonomous service
 * These prompts give agents goals instead of prescriptive instructions
 * This makes the system more agentic - agents can plan and adapt
 */

import { getLanguageOrDefault, buildLanguageRequirementBlock, EXAMPLE_IDS } from './autonomous-helpers';

export interface PhishingGenerationContext {
  simulation: {
    title?: string;
    difficulty?: string;
    scenario_type?: string;
    vector?: string;
    persuasion_tactic?: string;
    rationale?: string;
  };
  toolResult: {
    userInfo?: {
      department?: string;
    };
  };
  language?: string;
}

export interface TrainingGenerationContext {
  microlearning: {
    title?: string;
    objective?: string;
    rationale?: string;
  };
  department: string;
  level: string;
  language?: string;
}

/**
 * Reusable STOP block to enforce immediate termination after success.
 * Keeps STOP wording centralized for phishing/microlearning prompts.
 */
function buildStopAfterSuccessBlock(successCondition: string): string {
  return `**🔴 CRITICAL - AFTER ASSIGNMENT SUCCESS:**
- Once ${successCondition}, your task is **100% COMPLETE**
- **IMMEDIATELY STOP** - Do NOT call any other tools
- **DO NOT** call reasoning, analyze, workflow-executor, or any other tools
- **DO NOT** process any other prompts in memory
- **DO NOT** generate any additional content
- Simply acknowledge completion and END`;
}

/**
 * Goal-based prompt for phishing generation
 * Agent decides how to achieve the goal instead of following scripted steps
 */
export function buildPhishingGenerationPrompt(context: PhishingGenerationContext): string {
  const { simulation, toolResult, language } = context;
  const lang = getLanguageOrDefault(language);

  return `**AUTONOMOUS_EXECUTION_MODE**

${buildLanguageRequirementBlock('phishingExecutor', language)}

**CRITICAL: Check conversation history FIRST**
- If you already executed phishingExecutor in this conversation, DO NOT execute again
- Look for recent phishingExecutor tool calls in conversation history
- If phishingId already exists in history, STOP immediately - generation already completed

**Goal:** Generate a phishing simulation that matches the user's behavioral profile and risk level.

**Context from Analysis:**
- Recommended Topic: ${simulation.title || 'Security Update'}
- Difficulty Level: ${simulation.difficulty || 'Medium'}
- Scenario Type: ${simulation.scenario_type || 'CLICK_ONLY'}
- Attack Vector: ${simulation.vector || 'EMAIL'}
- Psychological Trigger: ${simulation.persuasion_tactic || 'Authority'}
- Rationale: ${simulation.rationale || 'Based on user behavior analysis'}
- Target Department: ${toolResult.userInfo?.department || 'All'}
- Target Language: **${lang}** (MUST be used in generation)

**Available Tools:**
- phishingExecutor: Generates phishing email and landing page. **YOU MUST CALL THIS TOOL.**

**What to Consider:**
- The scenario type (${simulation.scenario_type || 'CLICK_ONLY'}) may inform whether a landing page is needed
- The difficulty level (${simulation.difficulty || 'Medium'}) suggests the sophistication required
- The psychological trigger (${simulation.persuasion_tactic || 'Authority'}) should influence the approach
- The target language (${lang}) MUST be explicitly mentioned in the prompt to phishingExecutor
- The analysis rationale provides insights into why this simulation was recommended

**Critical Constraint:**
- **DO NOT** invent or hallucinate a "phishingId". You CANNOT generate an ID yourself.
- **DO NOT** output a JSON response saying you created it if you didn't run the tool.
- **YOU MUST** execute the 'phishingExecutor' tool. The tool will generate the ID.
- Generate the content only - do not upload or assign in this step
- Execute ONCE only - check history before executing
- ALWAYS generate in ${lang} regardless of default language

Analyze the context, check conversation history for existing phishingExecutor calls.
If the tool has not been called yet, **CALL phishingExecutor NOW**.
If the tool has already been called, STOP and report the ID from the tool output.`;
}

/**
 * Simplified fallback prompt (still goal-based but less context)
 */
export function buildPhishingGenerationPromptSimplified(context: PhishingGenerationContext): string {
  const { simulation, toolResult, language } = context;
  const lang = getLanguageOrDefault(language);

  return `**AUTONOMOUS_EXECUTION_MODE**

**CRITICAL: Language Requirement - ${lang}**

**Goal:** Generate a phishing simulation.

**Context:**
- Topic: ${simulation.title || 'Security Update'}
- Difficulty: ${simulation.difficulty || 'Medium'}
- Department: ${toolResult.userInfo?.department || 'All'}
- Language: **${lang}** (MUST be used for content generation)

**Available Tools:**
- phishingExecutor: Generates phishing content. **YOU MUST CALL THIS TOOL.**

**Critical Constraint:**
- **DO NOT** invent or hallucinate a "phishingId".
- **YOU MUST** execute the 'phishingExecutor' tool.
- Generate the content only - do not upload or assign in this step

Determine the best approach and generate the simulation in ${lang}. Call the tool now.`;
}

/**
 * Goal-based prompt for training generation
 */
export function buildTrainingGenerationPrompt(context: TrainingGenerationContext): string {
  const { microlearning, department, level, language } = context;
  const lang = getLanguageOrDefault(language);

  return `**AUTONOMOUS_EXECUTION_MODE**

${buildLanguageRequirementBlock('workflowExecutor', language)}

**Goal:** Generate a training module that addresses the user's learning needs based on their behavioral profile.

**Context from Analysis:**
- Recommended Topic: ${microlearning.title || 'Security Awareness'}
- Objective: ${microlearning.objective || ''}
- Target Department: ${department}
- Difficulty Level: ${level}
- Target Language: **${lang}** (MUST include this in workflowExecutor call)
- Rationale: ${microlearning.rationale || 'Based on user behavior analysis'}

**Available Tools:**
- workflowExecutor: Creates microlearning content. **YOU MUST CALL THIS TOOL.**

**What to Consider:**
- The orchestrator context (from previous messages) contains detailed behavioral analysis - include it in additionalContext
- The user's risk level and learning needs should shape the content structure
- The department (${department}) and difficulty level (${level}) inform the appropriate depth and focus
- The target language (${lang}) MUST be explicitly mentioned in the prompt text passed to workflowExecutor
- The rationale explains why this training was recommended - use it to guide content decisions

**Critical Constraint:**
- **DO NOT** invent or hallucinate a "microlearningId".
- **YOU MUST** execute the 'workflowExecutor' tool.
- Generate the content only - do not upload or assign in this step
- ALWAYS mention the language requirement in the prompt, e.g., "Create training module in ${lang} for..."

Review the context, determine the optimal training approach, and execute the generation. Call the tool now.`;
}

/**
 * Simplified fallback prompt for training
 */
export function buildTrainingGenerationPromptSimplified(context: TrainingGenerationContext): string {
  const { microlearning, department, level, language } = context;
  const lang = getLanguageOrDefault(language);

  return `**AUTONOMOUS_EXECUTION_MODE**

**CRITICAL: Language Requirement - ${lang}**

**Goal:** Generate a training module.

**Context:**
- Topic: ${microlearning.title || 'Security Awareness'}
- Department: ${department}
- Level: ${level}
- Language: **${lang}** (MUST be included in prompt to workflowExecutor)

**Available Tools:**
- workflowExecutor: Creates training. **YOU MUST CALL THIS TOOL.**

**Critical Constraint:**
- **DO NOT** invent or hallucinate a "microlearningId".
- **YOU MUST** execute the 'workflowExecutor' tool.

When calling workflowExecutor, mention the language requirement in the prompt. Determine the best approach and generate the training module in ${lang}. Call the tool now.`;
}

/**
 * Goal-based prompt for upload (less prescriptive)
 */
export function buildUploadPrompt(artifactType: 'phishing' | 'training', generatedArtifactId?: string): string {
  const toolName = artifactType === 'phishing' ? 'uploadPhishing' : 'uploadTraining';
  const idField = artifactType === 'phishing' ? 'phishingId' : 'microlearningId';
  const artifactLabel = artifactType === 'phishing' ? 'simulation' : 'module';

  const contextInfo = generatedArtifactId
    ? `- The ${idField} is: **${generatedArtifactId}** (Use this EXACT ID)`
    : `- The ${idField} should be available in recent conversation history`;

  return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Upload the ${artifactType} ${artifactLabel} to the platform and report the Resource IDs.

**Context:**
- The ${artifactType} has been generated successfully
${contextInfo}

**Available Tools:**
- ${toolName}: Uploads ${artifactType} to platform

**IMPORTANT - Response Format:**
After uploading, you MUST report the results in this exact format:
- If successful: "UPLOAD_SUCCESS: resourceId=<ID>, languageId=<LANG>"
- If failed: "UPLOAD_FAILED: <error message>"

${
  generatedArtifactId
    ? `Call ${toolName} using ${idField}="${generatedArtifactId}".`
    : `Locate the ${idField} from conversation history and call ${toolName}.`
}
Report results in the format above.`;
}

/**
 * Goal-based prompt for upload and assign
 */
export function buildUploadAndAssignPrompt(
  artifactType: 'phishing' | 'training',
  targetUserResourceId: string,
  generatedArtifactId?: string
): string {
  const uploadTool = artifactType === 'phishing' ? 'uploadPhishing' : 'uploadTraining';
  const assignTool = artifactType === 'phishing' ? 'assignPhishing' : 'assignTraining';
  const idField = artifactType === 'phishing' ? 'phishingId' : 'microlearningId';
  const artifactLabel = artifactType === 'phishing' ? 'simulation' : 'module';

  // Use consistent example IDs from constants
  const exampleGeneratedId = EXAMPLE_IDS[artifactType].generated;
  const exampleResourceId = EXAMPLE_IDS[artifactType].resource;

  const contextInfo = generatedArtifactId
    ? `- The ${idField} is: **${generatedArtifactId}**`
    : `- The ${idField} should be available in recent conversation history`;

  return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Upload and assign the ${artifactType} ${artifactLabel} to user ${targetUserResourceId}.

**Context:**
- The ${artifactType} has been generated successfully
- Target user ID: ${targetUserResourceId}
${contextInfo}

**Available Tools:**
- ${uploadTool}: Uploads ${artifactType} to platform
  INPUT: { ${idField}: "xyz" }
  OUTPUT: { success: true, data: { resourceId: "RESOURCE_ID_ABC", languageId: "..." } }

- ${assignTool}: Assigns ${artifactType} to user
  INPUT: { resourceId: "RESOURCE_ID_ABC", targetUserResourceId: "${targetUserResourceId}" }
  OUTPUT: { success: true, message: "..." }

**CRITICAL STEP-BY-STEP SEQUENCE:**

**⚠️ IMPORTANT DISTINCTION:**
- ${idField} (INPUT to upload): "${exampleGeneratedId}" ← Generated ${artifactType} ID (FOR UPLOAD ONLY)
- resourceId (OUTPUT from upload): "${exampleResourceId}" ← Backend-assigned ID (FOR ASSIGN)
- These are DIFFERENT! Do not confuse them!

1️⃣ **UPLOAD** - Call ${uploadTool} tool
   - Input parameter: { ${idField}: "${generatedArtifactId || '[from history]'}" }
   - Example: Call ${uploadTool} with ${idField}="${exampleGeneratedId}"
   - Wait for response
   - Response will contain: { success: true, data: { resourceId: "${exampleResourceId}", ... } }

2️⃣ **EXTRACT** - From the upload response, extract ONLY the resourceId:
   - resourceId = response.data.resourceId
   - Example: From response { data: { resourceId: "${exampleResourceId}" } }, extract "${exampleResourceId}"
   - **FORGET the ${idField}="${exampleGeneratedId}" NOW** - You don't need it anymore!

3️⃣ **ASSIGN** - Call ${assignTool} tool
   - Input parameter: { resourceId: "${exampleResourceId}", targetUserResourceId: "${targetUserResourceId}" }
   - Use ONLY the resourceId from Step 2, NOT the original ${idField}
   - Example: Call ${assignTool} with resourceId="${exampleResourceId}" (not "${exampleGeneratedId}"!)

**🔴 COMMON MISTAKE TO AVOID:**
❌ WRONG: ${assignTool}(${idField}="${exampleGeneratedId}", targetUserResourceId)  [uses original ID]
✅ RIGHT: ${assignTool}(resourceId="${exampleResourceId}", targetUserResourceId)  [uses upload response ID]

Execute this sequence:
${uploadTool}(${idField}="${generatedArtifactId || '[from history]'}")
→ Extract: resourceId="${exampleResourceId}"
→ ${assignTool}(resourceId="${exampleResourceId}", targetUserResourceId="${targetUserResourceId}")

${buildStopAfterSuccessBlock(`${assignTool} returns { success: true }`)}`;
}

/**
 * Goal-based prompt for assigning phishing with training IDs
 */
export function buildAssignPhishingWithTrainingPrompt(
  targetUserResourceId: string,
  trainingId?: string,
  sendTrainingLanguageId?: string
): string {
  const trainingContext = trainingId
    ? `**Training IDs to link:**
- trainingId: ${trainingId}
- sendTrainingLanguageId: ${sendTrainingLanguageId || 'default'}`
    : `**Training IDs:**
- Must be extracted from training upload result in conversation history
- trainingId: From training upload response.data.resourceId
- sendTrainingLanguageId: From training upload response.data.sendTrainingLanguageId`;

  return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Assign the phishing simulation to user ${targetUserResourceId}, linking it with the training module that was also generated.

**Context:**
- Both phishing simulation and training module have been uploaded successfully
- Target user ID: ${targetUserResourceId}

${trainingContext}

**Available Tools:**
- assignPhishing: Assigns phishing simulation (can include training IDs for linking)

**Required IDs:**
- Phishing: resourceId (from phishing upload), languageId (optional)
- Training: trainingId, sendTrainingLanguageId (${trainingId ? 'ALREADY PROVIDED ABOVE' : 'extract from history'})

**Critical:**
- Extract all IDs carefully and use exact values
- For phishing: Get resourceId from conversation history if not provided
- For training: ${trainingId ? `Use the provided values: trainingId="${trainingId}"` : 'Extract from conversation history'}

Assign the phishing simulation to user ${targetUserResourceId} with training linkage.

${buildStopAfterSuccessBlock('assignPhishing returns { success: true }')}`;
}
