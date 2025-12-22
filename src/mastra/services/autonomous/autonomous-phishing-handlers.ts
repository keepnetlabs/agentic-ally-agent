/**
 * Phishing simulation generation and assignment handlers
 * Isolated phishing-specific logic for autonomous service
 */

import { phishingEmailAgent } from '../../agents/phishing-email-agent';
import { AGENT_CALL_TIMEOUT_MS } from '../../constants';
import { withTimeout, withRetry } from '../../utils/core/resilience-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';
import {
    buildPhishingGenerationPrompt,
    buildPhishingGenerationPromptSimplified,
    buildUploadPrompt,
    buildUploadAndAssignPrompt,
    buildAssignPhishingWithTrainingPrompt,
} from '../../utils/prompt-builders/autonomous-prompts';

/**
 * Generate phishing simulation using agent - FOR USER ASSIGNMENTS ONLY
 * Implements 3-level fallback pattern per Cursor Rules
 *
 * @param simulation - Simulation metadata (title, difficulty, etc.)
 * @param executiveReport - Executive report from user analysis
 * @param toolResult - User info/tool result
 * @param phishingThreadId - Thread ID for agent memory
 * @param uploadOnly - Whether to upload without assigning
 */
export async function generatePhishingSimulation(
    simulation: any,
    executiveReport: string | undefined,
    toolResult: any,
    phishingThreadId: string,
    uploadOnly: boolean = false
): Promise<any> {
    const logger = getLogger('GeneratePhishingSimulation');
    logger.info('🎯 USER: Generating phishing simulation with executive report');

    // First, add context to agent's memory
    if (executiveReport) {
        try {
            logger.debug('Adding executive report to phishingEmailAgent memory');
            await withTimeout(
                phishingEmailAgent.generate(`[CONTEXT FROM ORCHESTRATOR: ${executiveReport}]`, {
                    memory: {
                        thread: phishingThreadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                AGENT_CALL_TIMEOUT_MS
            );
            logger.debug('Executive report added to agent memory');
        } catch (memoryError) {
            const err = normalizeError(memoryError);
            logger.warn('Failed to add context to agent memory', { error: err.message });
            // Continue anyway - agent can work without full context
        }
    }

    // Use user's preferredLanguage if available, otherwise fall back to default
    const preferredLanguageRaw = toolResult.userInfo?.preferredLanguage || '';
    const language = preferredLanguageRaw ? validateBCP47LanguageCode(preferredLanguageRaw) : DEFAULT_LANGUAGE;

    // Build prompt from standard generation (USER assignment)
    const fullPrompt = buildPhishingGenerationPrompt({
        simulation,
        toolResult,
        language,
    });

    const simplifiedPrompt = buildPhishingGenerationPromptSimplified({
        simulation,
        toolResult,
        language,
    });

    const memoryConfig = {
        memory: {
            thread: phishingThreadId,
            resource: 'agentic-ally-autonomous'
        }
    };

    // LEVEL 1: Primary path - Full context with timeout + retry
    try {
        logger.debug('Calling phishingEmailAgent (Level 1: Primary with full context)');
        const agentResult = await withRetry(
            () => withTimeout(
                phishingEmailAgent.generate(fullPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            ),
            'Phishing agent generation (Level 1)'
        );

        logger.info('Phishing agent executed successfully');

        // Step 4: Upload (and optionally assign)
        if (uploadOnly) {
            const uploadResult = await uploadPhishingOnly(phishingThreadId);
            return {
                success: true,
                message: 'Phishing simulation generated and uploaded',
                agentResponse: agentResult.text,
                uploadResult,
            };
        } else {
            const uploadAssignResult = await uploadAndAssignPhishing(
                toolResult.userInfo?.targetUserResourceId,
                phishingThreadId
            );
            return {
                success: true,
                message: 'Phishing simulation generated' +
                    (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
                agentResponse: agentResult.text,
                uploadAssignResult,
            };
        }
    } catch (primaryError) {
        const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
        logger.warn('Primary failed, attempting fallback 1', { error: err.message });

        // LEVEL 2: Fallback - Simplified prompt without full context
        try {
            logger.debug('Attempting fallback 1: Simplified prompt');
            const agentResult = await withTimeout(
                phishingEmailAgent.generate(simplifiedPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            );

            logger.info('Fallback 1 succeeded');
            if (uploadOnly) {
                const uploadResult = await uploadPhishingOnly(phishingThreadId);
                return {
                    success: true,
                    message: 'Phishing simulation generated via agent (simplified) and uploaded',
                    agentResponse: agentResult.text,
                    uploadResult,
                };
            } else {
                const uploadAssignResult = await uploadAndAssignPhishing(
                    toolResult.userInfo?.targetUserResourceId,
                    phishingThreadId
                );
                return {
                    success: true,
                    message: 'Phishing simulation generated via agent (simplified)' +
                        (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
                    agentResponse: agentResult.text,
                    uploadAssignResult,
                };
            }
        } catch (fallback1Error) {
            const err2 = normalizeError(fallback1Error);
            logger.warn('Fallback 1 failed, using basic', { error: err2.message });

            // LEVEL 3: Guaranteed fallback - Return structured error with recommendations
            return {
                success: false,
                error: 'Agent generation failed after all fallbacks',
                message: 'Phishing simulation generation unavailable. Recommended parameters:',
                recommendedParams: {
                    topic: simulation.title || 'Security Update',
                    difficulty: simulation.difficulty || 'Medium',
                    department: toolResult.userInfo?.department || 'All',
                    vector: simulation.vector || 'EMAIL',
                    persuasionTactic: simulation.persuasion_tactic || 'Authority'
                }
            };
        }
    }
}

/**
 * Upload only phishing simulation (no assignment)
 */
async function uploadPhishingOnly(threadId: string): Promise<any> {
    const logger = getLogger('UploadPhishingOnly');
    try {
        logger.info('Requesting agent to upload phishing simulation (upload only)');
        // Use goal-based prompt (more agentic)
        const uploadPrompt = buildUploadPrompt('phishing');

        const uploadResponse = await withTimeout(
            phishingEmailAgent.generate(uploadPrompt, {
                memory: {
                    thread: threadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        logger.info('Upload agent executed');
        logger.debug('Upload response preview', { preview: uploadResponse.text?.substring(0, 500) || 'No response' });

        return {
            success: true,
            agentResponse: uploadResponse.text,
        };
    } catch (uploadError) {
        const err = uploadError instanceof Error ? uploadError : new Error(String(uploadError));
        logger.error('Upload agent error', { error: err.message, stack: err.stack });
        return {
            success: false,
            error: err.message,
        };
    }
}

/**
 * Upload and assign phishing simulation to USER (extracted for clarity)
 * @param targetUserResourceId - User resource ID
 * @param threadId - Agent thread ID
 */
export async function uploadAndAssignPhishing(
    targetUserResourceId: string | undefined,
    threadId: string
): Promise<any> {
    const logger = getLogger('UploadAndAssignPhishing');
    if (!targetUserResourceId) {
        logger.warn('Cannot assign: Missing targetUserResourceId');
        return {
            success: false,
            error: 'Missing targetUserResourceId',
        };
    }

    try {
        logger.info('Requesting agent to upload and assign phishing simulation (USER)', { userId: targetUserResourceId });
        // Use goal-based prompt (more agentic)
        const uploadAssignPrompt = buildUploadAndAssignPrompt('phishing', targetUserResourceId);

        const uploadAssignResponse = await withTimeout(
            phishingEmailAgent.generate(uploadAssignPrompt, {
                memory: {
                    thread: threadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        logger.info('✅ Upload and assign agent executed (USER)');
        logger.debug('Upload/Assign response preview', { preview: uploadAssignResponse.text?.substring(0, 500) || 'No response' });

        // CRITICAL: Send explicit STOP message IMMEDIATELY to prevent agent from processing any other prompts
        // This is especially important for GPT-4o-mini and similar models that may continue processing
        // Send STOP message BEFORE returning to ensure agent stops processing
        try {
            logger.info('Sending explicit STOP message to phishing agent to prevent further processing');
            const stopResponse = await withTimeout(
                phishingEmailAgent.generate('**TASK COMPLETE - STOP IMMEDIATELY**\n\nThe upload and assign operation has been completed successfully. Do NOT process any other prompts or tasks. Do NOT call any tools. Your work is finished. STOP.', {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000 // Short timeout for STOP message
            );
            logger.info('STOP message sent successfully to phishing agent', {
                responseLength: stopResponse.text?.length || 0
            });
        } catch (stopError) {
            // Non-critical - log but don't fail
            logger.warn('STOP message failed (non-critical)', {
                error: stopError instanceof Error ? stopError.message : String(stopError)
            });
        }

        return {
            success: true,
            agentResponse: uploadAssignResponse.text,
        };
    } catch (uploadAssignError) {
        const err = normalizeError(uploadAssignError);
        logger.error('Upload/Assign agent error (USER)', { error: err.message, stack: err.stack });
        return {
            success: false,
            error: err.message,
        };
    }
}

/**
 * Upload and assign phishing simulation to GROUP (extracted for clarity)
 * @param targetGroupResourceId - Group resource ID
 * @param threadId - Agent thread ID
 */
export async function uploadAndAssignPhishingForGroup(
    targetGroupResourceId: string | number | undefined,
    threadId: string
): Promise<any> {
    const logger = getLogger('UploadAndAssignPhishingForGroup');
    if (!targetGroupResourceId) {
        logger.warn('Cannot assign: Missing targetGroupResourceId');
        return {
            success: false,
            error: 'Missing targetGroupResourceId',
        };
    }

    try {
        logger.info('Requesting agent to upload and assign phishing simulation (GROUP)', { groupId: targetGroupResourceId });
        // Use goal-based prompt (more agentic) - adapted for group
        const uploadAssignPrompt = buildUploadAndAssignPrompt('phishing', targetGroupResourceId as string);

        const uploadAssignResponse = await withTimeout(
            phishingEmailAgent.generate(uploadAssignPrompt, {
                memory: {
                    thread: threadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        logger.info('✅ Upload and assign agent executed (GROUP)');
        logger.debug('Upload/Assign response preview', { preview: uploadAssignResponse.text?.substring(0, 500) || 'No response' });

        // CRITICAL: Send explicit STOP message to prevent agent from processing any other prompts
        try {
            logger.debug('Sending explicit STOP message to phishing agent (GROUP)');
            await withTimeout(
                phishingEmailAgent.generate('**TASK COMPLETE - STOP IMMEDIATELY**\n\nThe upload and assign operation has been completed successfully. Do NOT process any other prompts or tasks. Do NOT call any tools. Your work is finished. STOP.', {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000 // Short timeout for STOP message
            );
            logger.debug('STOP message sent successfully to phishing agent (GROUP)');
        } catch (stopError) {
            // Non-critical - log but don't fail
            logger.warn('STOP message failed (non-critical)', {
                error: stopError instanceof Error ? stopError.message : String(stopError)
            });
        }

        return {
            success: true,
            agentResponse: uploadAssignResponse.text,
        };
    } catch (uploadAssignError) {
        const err = normalizeError(uploadAssignError);
        logger.error('Upload/Assign agent error (GROUP)', { error: err.message, stack: err.stack });
        return {
            success: false,
            error: err.message,
        };
    }
}

/**
 * Generate phishing simulation using agent - FOR GROUP ASSIGNMENTS ONLY
 * Uses custom topic-based prompt from group-topic-service
 *
 * @param simulation - Simulation metadata (title, difficulty, etc.)
 * @param customPrompt - Custom topic-based prompt from group-topic-service
 * @param preferredLanguage - Preferred language
 * @param phishingThreadId - Thread ID for agent memory
 * @param targetGroupResourceId - Group resource ID (for upload/assign)
 */
export async function generatePhishingSimulationForGroup(
    simulation: any,
    customPrompt: string,
    preferredLanguage: string | undefined,
    phishingThreadId: string,
    targetGroupResourceId: string | number
): Promise<any> {
    const logger = getLogger('GeneratePhishingSimulationForGroup');
    logger.info('🎯 GROUP: Generating phishing simulation with custom topic-based prompt', { groupId: targetGroupResourceId });

    const preferredLanguageRaw = preferredLanguage || '';
    const language = preferredLanguageRaw ? validateBCP47LanguageCode(preferredLanguageRaw) : DEFAULT_LANGUAGE;

    const memoryConfig = {
        memory: {
            thread: phishingThreadId,
            resource: 'agentic-ally-autonomous'
        }
    };

    // LEVEL 1: Primary path - Use custom prompt directly
    try {
        logger.debug('Calling phishingEmailAgent (Level 1: Custom topic-based prompt)');
        const agentResult = await withRetry(
            () => withTimeout(
                phishingEmailAgent.generate(customPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            ),
            'Phishing agent generation (Level 1)'
        );

        logger.info('✅ Phishing agent executed successfully (GROUP)');

        // Upload and assign to group
        const uploadAssignResult = await uploadAndAssignPhishingForGroup(targetGroupResourceId, phishingThreadId);

        return {
            success: uploadAssignResult?.success || true,
            message: uploadAssignResult?.success ? 'Phishing simulation generated, uploaded and assigned to group' : 'Phishing simulation generated (assign may have failed)',
            agentResponse: agentResult.text,
            uploadAssignResult,
        };
    } catch (primaryError) {
        const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
        logger.warn('Primary failed, attempting fallback', { error: err.message });

        // LEVEL 2/3: Fallback - use simplified approach
        try {
            logger.debug('Attempting fallback: Simplified prompt');
            const agentResult = await withTimeout(
                phishingEmailAgent.generate(customPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            );

            logger.info('✅ Fallback succeeded (GROUP)');
            const uploadAssignResult = await uploadAndAssignPhishingForGroup(targetGroupResourceId, phishingThreadId);

            return {
                success: uploadAssignResult?.success || true,
                message: uploadAssignResult?.success ? 'Phishing simulation generated, uploaded and assigned to group (fallback)' : 'Phishing simulation generated (fallback, assign may have failed)',
                agentResponse: agentResult.text,
                uploadAssignResult,
            };
        } catch (fallbackError) {
            const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
            logger.error('All phishing generation attempts failed (GROUP)', { error: fallbackErr.message });
            return {
                success: false,
                error: fallbackErr.message,
            };
        }
    }
}

/**
 * Assign phishing simulation with training IDs (for sendAfterPhishingSimulation flow)
 */
export async function assignPhishingWithTraining(
    targetUserResourceId: string | undefined,
    phishingThreadId: string,
    trainingId?: string,
    sendTrainingLanguageId?: string
): Promise<any> {
    const logger = getLogger('AssignPhishingWithTraining');
    if (!targetUserResourceId) {
        logger.warn('Cannot assign: Missing targetUserResourceId');
        return {
            success: false,
            error: 'Missing targetUserResourceId',
        };
    }

    try {
        logger.info('Requesting agent to assign phishing simulation with training IDs', {
            targetUserResourceId,
            trainingId,
            sendTrainingLanguageId,
            hasTrainingInfo: !!trainingId
        });

        // First, add training context to agent memory
        if (trainingId) {
            try {
                const trainingContext = `[TRAINING CONTEXT: Training Resource ID: ${trainingId}, Language ID: ${sendTrainingLanguageId || 'default'}]`;
                logger.debug('Adding training context to agent memory', { trainingId, sendTrainingLanguageId });
                await withTimeout(
                    phishingEmailAgent.generate(trainingContext, {
                        memory: {
                            thread: phishingThreadId,
                            resource: 'agentic-ally-autonomous'
                        }
                    }),
                    AGENT_CALL_TIMEOUT_MS
                );
                logger.debug('Training context added to agent memory');
            } catch (memoryError) {
                const err = normalizeError(memoryError);
                logger.warn('Failed to add training context to agent memory', { error: err.message });
                // Continue anyway - agent can work without full context
            }
        }

        // Use goal-based prompt (more agentic) with training IDs
        const assignPrompt = buildAssignPhishingWithTrainingPrompt(
            targetUserResourceId,
            trainingId,
            sendTrainingLanguageId
        );

        const assignResponse = await withTimeout(
            phishingEmailAgent.generate(assignPrompt, {
                memory: {
                    thread: phishingThreadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        logger.info('Assign with training agent executed');
        logger.debug('Assign response preview', { preview: assignResponse.text?.substring(0, 500) || 'No response' });

        return {
            success: true,
            agentResponse: assignResponse.text,
        };
    } catch (assignError) {
        const err = assignError instanceof Error ? assignError : new Error(String(assignError));
        logger.error('Assign with training agent error', { error: err.message, stack: err.stack });
        return {
            success: false,
            error: err.message,
        };
    }
}
