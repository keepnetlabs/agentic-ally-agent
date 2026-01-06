/**
 * Training module generation and assignment handlers
 * Isolated training-specific logic for autonomous service
 */

import { microlearningAgent } from '../../agents/microlearning-agent';
import { AGENT_CALL_TIMEOUT_MS } from '../../constants';
import { withTimeout, withRetry } from '../../utils/core/resilience-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';
import {
    buildTrainingGenerationPrompt,
    buildTrainingGenerationPromptSimplified,
    buildUploadPrompt,
    buildUploadAndAssignPrompt,
} from '../../utils/prompt-builders/autonomous-prompts';

/**
 * Upload only training module (no assignment) - Extracts training ID for linking
 */
export async function uploadTrainingOnly(threadId: string, microlearning: any): Promise<any> {
    const logger = getLogger('UploadTrainingOnly');
    try {
        logger.info('Requesting agent to upload training module (upload only)', { microlearning: microlearning?.title });
        // Use goal-based prompt (more agentic)
        const uploadPrompt = buildUploadPrompt('training');

        const uploadResponse = await withTimeout(
            microlearningAgent.generate(uploadPrompt, {
                memory: {
                    thread: threadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        logger.info('Upload agent executed');
        logger.debug('Upload response preview', { preview: uploadResponse.text?.substring(0, 500) || 'No response' });

        // CRITICAL: Send explicit STOP message IMMEDIATELY to prevent agent from processing any other prompts
        // This is especially important for GPT-4o-mini and similar models that may continue processing
        try {
            logger.info('Sending explicit STOP message to training agent (upload only) to prevent further processing');
            await withTimeout(
                microlearningAgent.generate('**TASK COMPLETE - STOP IMMEDIATELY**\n\nThe upload operation has been completed successfully. Do NOT process any other prompts or tasks. Do NOT call any tools. Your work is finished. STOP.', {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000 // Short timeout for STOP message
            );
            logger.info('STOP message sent successfully to training agent (upload only)');
        } catch (stopError) {
            // Non-critical - log but don't fail
            logger.warn('STOP message failed (non-critical)', {
                error: stopError instanceof Error ? stopError.message : String(stopError)
            });
        }

        // Extract training IDs from agent response
        const responseText = uploadResponse.text || '';
        const successMatch = responseText.match(/UPLOAD_SUCCESS:\s*resourceId=([^,\s]+),\s*languageId=([^\s\)]+)/i);
        const failureMatch = responseText.match(/UPLOAD_FAILED:\s*(.+?)(?:\n|$)/i);

        if (successMatch) {
            const resourceId = successMatch[1];
            const languageId = successMatch[2];
            logger.info('Training upload successful', { resourceId, languageId });
            return {
                success: true,
                agentResponse: uploadResponse.text,
                data: {
                    resourceId,
                    sendTrainingLanguageId: languageId,
                },
            };
        } else if (failureMatch) {
            const errorMsg = failureMatch[1];
            logger.warn('Training upload failed', { error: errorMsg });
            return {
                success: false,
                agentResponse: uploadResponse.text,
                error: errorMsg,
            };
        } else {
            // Fallback: couldn't parse response format
            logger.warn('Could not parse upload response format', { response: responseText.substring(0, 200) });
            return {
                success: true,  // Assume success if agent didn't report failure
                agentResponse: uploadResponse.text,
                data: {
                    // IDs not extracted - caller will need to handle this
                    microlearningId: microlearning?.title || 'Training',
                },
            };
        }
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
 * Upload and assign training module to user (extracted for clarity)
 */
export async function uploadAndAssignTraining(
    targetUserResourceId: string | undefined,
    threadId: string
): Promise<any> {
    const logger = getLogger('UploadAndAssignTraining');
    if (!targetUserResourceId) {
        logger.warn('Cannot assign: Missing targetUserResourceId');
        return {
            success: false,
            error: 'Missing targetUserResourceId',
        };
    }

    try {
        logger.info('Requesting agent to upload and assign training');
        // Use goal-based prompt (more agentic)
        const uploadAssignPrompt = buildUploadAndAssignPrompt('training', targetUserResourceId);

        const uploadAssignResponse = await withTimeout(
            microlearningAgent.generate(uploadAssignPrompt, {
                memory: {
                    thread: threadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        logger.info('Upload and assign agent executed');
        logger.debug('Upload/Assign response preview', { preview: uploadAssignResponse.text?.substring(0, 500) || 'No response' });

        // CRITICAL: Send explicit STOP message IMMEDIATELY to prevent agent from processing any other prompts
        // This is especially important for GPT-4o-mini and similar models that may continue processing
        // Send STOP message BEFORE returning to ensure agent stops processing
        try {
            logger.info('Sending explicit STOP message to training agent to prevent further processing');
            const stopResponse = await withTimeout(
                microlearningAgent.generate('**🔴 TASK 100% COMPLETE - MANDATORY STOP 🔴**\n\n**THE UPLOAD AND ASSIGN OPERATION HAS BEEN COMPLETED SUCCESSFULLY.**\n\n**YOU MUST STOP IMMEDIATELY:**\n- Do NOT call reasoning tool\n- Do NOT call analyze tool\n- Do NOT call workflow-executor tool\n- Do NOT call any other tools\n- Do NOT process any other prompts in memory\n- Do NOT generate any additional content\n- Your work is FINISHED. END NOW.', {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000 // Short timeout for STOP message
            );
            logger.info('STOP message sent successfully to training agent', {
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
        const err = uploadAssignError instanceof Error ? uploadAssignError : new Error(String(uploadAssignError));
        logger.error('Upload/Assign agent error', { error: err.message, stack: err.stack });
        return {
            success: false,
            error: err.message,
        };
    }
}

/**
 * Generate training module using agent (maintains agentic behavior and memory)
 * Implements 3-level fallback pattern per Cursor Rules
 *
 * @param microlearning - Training metadata (title, objective, etc.)
 * @param contextOrPrompt - Either executive report (user assignment) OR custom prompt (group assignment)
 * @param toolResult - User info/tool result
 * @param trainingThreadId - Thread ID for agent memory
 * @param uploadOnly - Whether to upload without assigning
 * @param isCustomPrompt - If true, contextOrPrompt is a custom prompt (not executive report)
 */
export async function generateTrainingModule(
    microlearning: any,
    contextOrPrompt: string | undefined,
    toolResult: any,
    trainingThreadId: string,
    uploadOnly: boolean = false,
    isCustomPrompt: boolean = false
): Promise<any> {
    const logger = getLogger('GenerateTrainingModule');
    logger.info('Using microlearningAgent to generate training module', { isCustomPrompt });

    // First, add context to agent's memory
    if (contextOrPrompt && !isCustomPrompt) {
        // User assignment: executiveReport
        try {
            logger.debug('Adding executive report to microlearningAgent memory');
            await withTimeout(
                microlearningAgent.generate(`[CONTEXT FROM ORCHESTRATOR: ${contextOrPrompt}]`, {
                    memory: {
                        thread: trainingThreadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                AGENT_CALL_TIMEOUT_MS
            );
            logger.debug('Executive report added to microlearningAgent memory');
        } catch (memoryError) {
            const err = normalizeError(memoryError);
            logger.warn('Failed to add context to microlearningAgent memory', { error: err.message });
            // Continue anyway - agent can work without full context
        }
    }

    // Extract training parameters from microlearning recommendation
    // Schema: { title, objective, duration_min, language, rationale }
    const topic = microlearning.title || 'Security Awareness';
    const objective = microlearning.objective || '';
    const department = toolResult.userInfo?.department || 'All';
    // Level not in microlearning object, default to Intermediate (can be refined from analysisReport if needed)
    const level = 'Intermediate';
    const rationale = microlearning.rationale || 'Based on user behavior analysis';

    // Use user's preferredLanguage if available, otherwise fall back to microlearning.language or default
    const preferredLanguageRaw = toolResult.userInfo?.preferredLanguage || microlearning.language || '';
    const language = preferredLanguageRaw ? validateBCP47LanguageCode(preferredLanguageRaw) : DEFAULT_LANGUAGE;

    // Build prompt - either from custom prompt or from standard generation
    let fullPrompt: string;
    if (isCustomPrompt && contextOrPrompt) {
        // Group assignment: use custom topic-based prompt directly
        fullPrompt = contextOrPrompt;
        logger.debug('Using custom group topic prompt');
    } else {
        // User assignment: build standard prompt
        fullPrompt = buildTrainingGenerationPrompt({
            microlearning,
            department,
            level,
            language,
        });
    }

    const simplifiedPrompt = buildTrainingGenerationPromptSimplified({
        microlearning,
        department,
        level,
        language,
    });

    const memoryConfig = {
        memory: {
            thread: trainingThreadId,
            resource: 'agentic-ally-autonomous'
        }
    };

    // LEVEL 1: Primary path - Full context with timeout + retry
    try {
        logger.debug('Calling microlearningAgent (Level 1: Primary with full context)');
        const agentResult = await withRetry(
            () => withTimeout(
                microlearningAgent.generate(fullPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            ),
            'Training agent generation (Level 1)'
        );

        logger.info('Training agent executed successfully');

        // CRITICAL: Send STOP message after training generation to prevent agent from continuing
        // This prevents agent from processing any remaining prompts in memory
        try {
            logger.info('Sending STOP message after training generation to prevent further processing');
            await withTimeout(
                microlearningAgent.generate('**GENERATION COMPLETE - WAIT FOR UPLOAD INSTRUCTIONS**\n\nTraining generation has been completed. Do NOT generate again. Do NOT call workflow-executor again. Wait for upload/assign instructions. STOP.', {
                    memory: {
                        thread: trainingThreadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000
            );
            logger.info('STOP message sent after training generation');
        } catch (stopError) {
            logger.warn('STOP message after generation failed (non-critical)', {
                error: stopError instanceof Error ? stopError.message : String(stopError)
            });
        }

        // Step 4: Upload (and optionally assign)
        if (uploadOnly) {
            const uploadResult = await uploadTrainingOnly(trainingThreadId, microlearning);
            return {
                success: uploadResult?.success || true,
                message: uploadResult?.success ? 'Training module generated and uploaded' : 'Training module generated (upload may have failed)',
                agentResponse: agentResult.text,
                data: uploadResult?.data,  // ← Training IDs here
                uploadResult,
            };
        } else {
            const uploadAssignResult = await uploadAndAssignTraining(
                toolResult.userInfo?.targetUserResourceId,
                trainingThreadId
            );
            return {
                success: true,
                message: 'Training module generated' +
                    (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
                agentResponse: agentResult.text,
                uploadAssignResult,
            };
        }
    } catch (primaryError) {
        const err = normalizeError(primaryError);
        logger.warn('Primary failed, attempting fallback 1', { error: err.message });

        // LEVEL 2: Fallback - Simplified prompt without full context
        try {
            logger.debug('Attempting fallback 1: Simplified prompt');
            const agentResult = await withTimeout(
                microlearningAgent.generate(simplifiedPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            );

            logger.info('Fallback 1 succeeded');
            if (uploadOnly) {
                const uploadResult = await uploadTrainingOnly(trainingThreadId, microlearning);
                return {
                    success: uploadResult?.success || true,
                    message: uploadResult?.success ? 'Training module generated via agent (simplified) and uploaded' : 'Training module generated (upload may have failed)',
                    agentResponse: agentResult.text,
                    data: uploadResult?.data,  // ← Training IDs here
                    uploadResult,
                };
            } else {
                const uploadAssignResult = await uploadAndAssignTraining(
                    toolResult.userInfo?.targetUserResourceId,
                    trainingThreadId
                );
                return {
                    success: true,
                    message: 'Training module generated via agent (simplified)' +
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
                message: 'Training module generation unavailable. Recommended parameters:',
                recommendedParams: {
                    topic,
                    objective,
                    department,
                    level,
                    rationale
                }
            };
        }
    }
}

/**
 * Upload and assign training for group - GROUP ONLY
 */
export async function uploadAndAssignTrainingForGroup(
    targetGroupResourceId: string | number | undefined,
    threadId: string
): Promise<any> {
    const logger = getLogger('UploadAndAssignTrainingForGroup');
    if (!targetGroupResourceId) {
        logger.warn('Cannot assign: Missing targetGroupResourceId');
        return {
            success: false,
            error: 'Missing targetGroupResourceId',
        };
    }

    try {
        logger.info('Requesting agent to upload and assign training (GROUP)', { groupId: targetGroupResourceId });
        // Use goal-based prompt (more agentic) - adapted for group
        const uploadAssignPrompt = buildUploadAndAssignPrompt('training', targetGroupResourceId as string);

        const uploadAssignResponse = await withTimeout(
            microlearningAgent.generate(uploadAssignPrompt, {
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
            logger.debug('Sending explicit STOP message to training agent (GROUP)');
            await withTimeout(
                microlearningAgent.generate('**TASK COMPLETE - STOP IMMEDIATELY**\n\nThe upload and assign operation has been completed successfully. Do NOT process any other prompts or tasks. Do NOT call any tools. Your work is finished. STOP.', {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000 // Short timeout for STOP message
            );
            logger.debug('STOP message sent successfully to training agent (GROUP)');
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
 * Generate training module using agent - FOR GROUP ASSIGNMENTS ONLY
 * Uses custom topic-based prompt from group-topic-service
 *
 * @param microlearning - Training metadata (title, objective, etc.)
 * @param customPrompt - Custom topic-based prompt from group-topic-service
 * @param preferredLanguage - Preferred language
 * @param trainingThreadId - Thread ID for agent memory
 * @param targetGroupResourceId - Group resource ID (for upload/assign)
 */
export async function generateTrainingModuleForGroup(
    microlearning: any,
    customPrompt: string,
    preferredLanguage: string | undefined,
    trainingThreadId: string,
    targetGroupResourceId: string | number
): Promise<any> {
    const logger = getLogger('GenerateTrainingModuleForGroup');
    logger.info('🎯 GROUP: Generating training module with custom topic-based prompt', { groupId: targetGroupResourceId });

    const memoryConfig = {
        memory: {
            thread: trainingThreadId,
            resource: 'agentic-ally-autonomous'
        }
    };

    // LEVEL 1: Primary path - Use custom prompt directly
    try {
        logger.debug('Calling microlearningAgent (Level 1: Custom topic-based prompt)');
        const agentResult = await withRetry(
            () => withTimeout(
                microlearningAgent.generate(customPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            ),
            'Training agent generation (Level 1)'
        );

        logger.info('✅ Training agent executed successfully (GROUP)');

        // CRITICAL: Send STOP message after training generation to prevent agent from continuing
        // This prevents agent from processing any remaining prompts in memory
        try {
            logger.info('Sending STOP message after training generation (GROUP) to prevent further processing');
            await withTimeout(
                microlearningAgent.generate('**GENERATION COMPLETE - WAIT FOR UPLOAD INSTRUCTIONS**\n\nTraining generation has been completed. Do NOT generate again. Do NOT call workflow-executor again. Wait for upload/assign instructions. STOP.', {
                    memory: {
                        thread: trainingThreadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                5000
            );
            logger.info('STOP message sent after training generation (GROUP)');
        } catch (stopError) {
            logger.warn('STOP message after generation failed (non-critical)', {
                error: stopError instanceof Error ? stopError.message : String(stopError)
            });
        }

        // Upload and assign to group
        const uploadAssignResult = await uploadAndAssignTrainingForGroup(targetGroupResourceId, trainingThreadId);

        return {
            success: uploadAssignResult?.success || true,
            message: uploadAssignResult?.success ? 'Training module generated, uploaded and assigned to group' : 'Training module generated (assign may have failed)',
            agentResponse: agentResult.text,
            uploadAssignResult,
        };
    } catch (primaryError) {
        const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
        logger.warn('Primary failed, attempting fallback', { error: err.message });

        // LEVEL 2: Fallback - Simplified prompt
        try {
            logger.debug('Calling microlearningAgent (Level 2: Simplified fallback)');
            const simplifiedPrompt = `Generate a brief training module on the topic covered in the original prompt. Keep it concise and practical.`;

            const agentResult = await withRetry(
                () => withTimeout(
                    microlearningAgent.generate(simplifiedPrompt, memoryConfig),
                    AGENT_CALL_TIMEOUT_MS
                ),
                'Training agent generation (Level 2)'
            );

            logger.info('✅ Training agent executed successfully (Level 2 Fallback)');

            // CRITICAL: Send STOP message after fallback generation
            try {
                logger.info('Sending STOP message after fallback training generation (GROUP)');
                await withTimeout(
                    microlearningAgent.generate('**GENERATION COMPLETE - WAIT FOR UPLOAD INSTRUCTIONS**\n\nTraining generation has been completed. Do NOT generate again. Do NOT call workflow-executor again. Wait for upload/assign instructions. STOP.', {
                        memory: {
                            thread: trainingThreadId,
                            resource: 'agentic-ally-autonomous'
                        }
                    }),
                    5000
                );
                logger.info('STOP message sent after fallback generation (GROUP)');
            } catch (stopError) {
                logger.warn('STOP message after fallback generation failed (non-critical)', {
                    error: stopError instanceof Error ? stopError.message : String(stopError)
                });
            }

            const uploadAssignResult = await uploadAndAssignTrainingForGroup(targetGroupResourceId, trainingThreadId);

            return {
                success: uploadAssignResult?.success || true,
                message: uploadAssignResult?.success ? 'Training module generated (simplified), uploaded and assigned to group' : 'Training module generated',
                agentResponse: agentResult.text,
                uploadAssignResult,
            };
        } catch (fallback2Error) {
            const err2 = fallback2Error instanceof Error ? fallback2Error : new Error(String(fallback2Error));
            logger.error('All generation attempts failed (GROUP)', { error: err2.message });

            return {
                success: false,
                error: `Failed to generate training module: ${err2.message}`,
            };
        }
    }
}
