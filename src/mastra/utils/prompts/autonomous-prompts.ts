// src/mastra/utils/prompts/autonomous-prompts.ts
/**
 * Goal-based prompts for autonomous service
 * These prompts give agents goals instead of prescriptive instructions
 * This makes the system more agentic - agents can plan and adapt
 */

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
}

export interface TrainingGenerationContext {
    microlearning: {
        title?: string;
        objective?: string;
        rationale?: string;
    };
    department: string;
    level: string;
}

/**
 * Goal-based prompt for phishing generation
 * Agent decides how to achieve the goal instead of following scripted steps
 */
export function buildPhishingGenerationPrompt(context: PhishingGenerationContext): string {
    const { simulation, toolResult } = context;

    return `**AUTONOMOUS_EXECUTION_MODE**

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

**Available Tools:**
- phishingExecutor: Generates phishing email and landing page

**What to Consider:**
- The scenario type (${simulation.scenario_type || 'CLICK_ONLY'}) may inform whether a landing page is needed
- The difficulty level (${simulation.difficulty || 'Medium'}) suggests the sophistication required
- The psychological trigger (${simulation.persuasion_tactic || 'Authority'}) should influence the approach
- The analysis rationale provides insights into why this simulation was recommended

**Critical Constraint:**
- Generate the content only - do not upload or assign in this step
- Execute ONCE only - check history before executing

Analyze the context, check conversation history for existing phishingExecutor calls, and execute only if not already done.`;
}

/**
 * Simplified fallback prompt (still goal-based but less context)
 */
export function buildPhishingGenerationPromptSimplified(context: PhishingGenerationContext): string {
    const { simulation, toolResult } = context;

    return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Generate a phishing simulation.

**Context:**
- Topic: ${simulation.title || 'Security Update'}
- Difficulty: ${simulation.difficulty || 'Medium'}
- Department: ${toolResult.userInfo?.department || 'All'}

**Available Tools:**
- phishingExecutor: Generates phishing content

Determine the best approach and generate the simulation.`;
}

/**
 * Goal-based prompt for training generation
 */
export function buildTrainingGenerationPrompt(context: TrainingGenerationContext): string {
    const { microlearning, department, level } = context;

    return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Generate a training module that addresses the user's learning needs based on their behavioral profile.

**Context from Analysis:**
- Recommended Topic: ${microlearning.title || 'Security Awareness'}
- Objective: ${microlearning.objective || ''}
- Target Department: ${department}
- Difficulty Level: ${level}
- Rationale: ${microlearning.rationale || 'Based on user behavior analysis'}

**Available Tools:**
- workflowExecutor: Creates microlearning content (workflowType: 'create-microlearning')

**What to Consider:**
- The orchestrator context (from previous messages) contains detailed behavioral analysis - include it in additionalContext
- The user's risk level and learning needs should shape the content structure
- The department (${department}) and difficulty level (${level}) inform the appropriate depth and focus
- The rationale explains why this training was recommended - use it to guide content decisions

**Critical Constraint:**
- Generate the content only - do not upload or assign in this step

Review the context, determine the optimal training approach, and execute the generation.`;
}

/**
 * Simplified fallback prompt for training
 */
export function buildTrainingGenerationPromptSimplified(context: TrainingGenerationContext): string {
    const { microlearning, department, level } = context;

    return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Generate a training module.

**Context:**
- Topic: ${microlearning.title || 'Security Awareness'}
- Department: ${department}
- Level: ${level}

**Available Tools:**
- workflowExecutor: Creates training (workflowType: 'create-microlearning')

Determine the best approach and generate the training module.`;
}

/**
 * Goal-based prompt for upload (less prescriptive)
 */
export function buildUploadPrompt(
    artifactType: 'phishing' | 'training'
): string {
    const toolName = artifactType === 'phishing' ? 'uploadPhishing' : 'uploadTraining';
    const idField = artifactType === 'phishing' ? 'phishingId' : 'microlearningId';
    const artifactLabel = artifactType === 'phishing' ? 'simulation' : 'module';

    return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Upload the ${artifactType} ${artifactLabel} to the platform so it can be assigned to users.

**Context:**
- The ${artifactType} has been generated successfully
- The ${idField} should be available in recent conversation history

**Available Tools:**
- ${toolName}: Uploads ${artifactType} to platform

Locate the ${idField} from conversation history and upload the ${artifactType}.`;
}

/**
 * Goal-based prompt for upload and assign
 */
export function buildUploadAndAssignPrompt(
    artifactType: 'phishing' | 'training',
    targetUserResourceId: string
): string {
    const uploadTool = artifactType === 'phishing' ? 'uploadPhishing' : 'uploadTraining';
    const assignTool = artifactType === 'phishing' ? 'assignPhishing' : 'assignTraining';
    const idField = artifactType === 'phishing' ? 'phishingId' : 'microlearningId';
    const artifactLabel = artifactType === 'phishing' ? 'simulation' : 'module';

    return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Upload and assign the ${artifactType} ${artifactLabel} to user ${targetUserResourceId}.

**Context:**
- The ${artifactType} has been generated successfully
- Target user ID: ${targetUserResourceId}
- The ${idField} should be available in recent conversation history

**Available Tools:**
- ${uploadTool}: Uploads ${artifactType} to platform (returns resourceId and languageId in response.data)
- ${assignTool}: Assigns ${artifactType} to user (requires resourceId, languageId optional, and targetUserResourceId)

**Critical Sequence:**
- Upload must complete successfully before assignment can proceed
- Extract IDs from the upload tool's response.data field (resourceId, languageId)
- Use the exact IDs returned by the upload tool for assignment

Locate the ${idField}, upload first, then assign using the returned IDs.`;
}

/**
 * Goal-based prompt for assigning phishing with training IDs
 */
export function buildAssignPhishingWithTrainingPrompt(
    targetUserResourceId: string
): string {
    return `**AUTONOMOUS_EXECUTION_MODE**

**Goal:** Assign the phishing simulation to user ${targetUserResourceId}, linking it with the training module that was also generated.

**Context:**
- Both phishing simulation and training module have been uploaded successfully
- Both upload results should be available in recent conversation history
- Target user ID: ${targetUserResourceId}

**Available Tools:**
- assignPhishing: Assigns phishing simulation (can include training IDs for linking)

**What You Need:**
- From phishing upload result (uploadPhishing tool): resourceId (data.resourceId), languageId (data.languageId, optional)
- From training upload result (uploadTraining tool): trainingId (data.resourceId), sendTrainingLanguageId (data.sendTrainingLanguageId)

**Critical:**
- Both upload results must be found in conversation history
- Extract IDs from response.data fields (not top-level fields)
- Use exact IDs returned by upload tools

Locate both upload results, extract the required IDs, and assign the phishing simulation with training linkage.`;
}

