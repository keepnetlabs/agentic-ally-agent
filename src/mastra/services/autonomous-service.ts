// src/mastra/services/autonomous-service.ts
import { getUserInfoTool } from '../tools/user-management';
import { requestStorage } from '../utils/core/request-storage';
import { phishingEmailAgent } from '../agents/phishing-email-agent';
import { microlearningAgent } from '../agents/microlearning-agent';
import { AGENT_CALL_TIMEOUT_MS } from '../constants';
import { withTimeout, withRetry } from '../utils/core/resilience-utils';
import { getLogger } from '../utils/core/logger';
import { normalizeError } from '../utils/core/error-utils';
import { AutonomousRequest, AutonomousResponse } from '../types/autonomous-types';
import { selectGroupTrainingTopic } from './group-topic-service';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../utils/language/language-utils';
import {
    buildPhishingGenerationPrompt,
    buildPhishingGenerationPromptSimplified,
    buildTrainingGenerationPrompt,
    buildTrainingGenerationPromptSimplified,
    buildUploadPrompt,
    buildUploadAndAssignPrompt,
    buildAssignPhishingWithTrainingPrompt,
} from '../utils/prompt-builders/autonomous-prompts';

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
async function generatePhishingSimulation(
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
async function uploadAndAssignPhishing(
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
async function uploadAndAssignPhishingForGroup(
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
async function generatePhishingSimulationForGroup(
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
async function assignPhishingWithTraining(
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

/**
 * Upload only training module (no assignment) - Extracts training ID for linking
 */
async function uploadTrainingOnly(threadId: string, microlearning: any): Promise<any> {
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
async function uploadAndAssignTraining(
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
async function generateTrainingModule(
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
async function uploadAndAssignTrainingForGroup(
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
async function generateTrainingModuleForGroup(
    microlearning: any,
    customPrompt: string,
    preferredLanguage: string | undefined,
    trainingThreadId: string,
    targetGroupResourceId: string | number
): Promise<any> {
    const logger = getLogger('GenerateTrainingModuleForGroup');
    logger.info('🎯 GROUP: Generating training module with custom topic-based prompt', { groupId: targetGroupResourceId });

    const preferredLanguageRaw = preferredLanguage || '';
    const language = preferredLanguageRaw ? validateBCP47LanguageCode(preferredLanguageRaw) : DEFAULT_LANGUAGE;

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

/**
 * Build executive report from analysis data
 */
function buildExecutiveReport(toolResult: any): string | undefined {
    if (!toolResult.analysisReport) {
        return undefined;
    }

    const report = toolResult.analysisReport;
    const sim = report.recommended_next_steps?.simulations?.[0];
    const ml = report.recommended_next_steps?.microlearnings?.[0];
    const nudge = report.recommended_next_steps?.nudges?.[0];
    const references = Array.isArray(report.references) ? report.references.join(', ') : '';

    return `**User Behavior Analysis Report**

**Risk Level:** ${report.header?.resilience_stage?.level || 'Unknown'}
**Department:** ${report.meta?.department || 'Unknown'}
**Progression Target:** ${report.header?.progression_target || 'N/A'}
**Progression Hint:** ${report.header?.progression_hint || 'N/A'}
**Strengths:** ${report.strengths?.join(', ') || 'None identified'}
**Growth Opportunities:** ${report.growth_opportunities?.join(', ') || 'None identified'}

**Maturity Level (Gartner SBCP):**
- **Current:** ${report.maturity_mapping?.gartner_sbcp?.current || 'Unknown'}
- **Next Target:** ${report.maturity_mapping?.gartner_sbcp?.next || 'Unknown'}
- **What It Takes:** ${report.maturity_mapping?.gartner_sbcp?.what_it_takes || 'N/A'}

**Maturity Level (ENISA Security Culture):**
- **Current:** ${report.maturity_mapping?.enisa_security_culture?.current || 'Unknown'}
- **Next Target:** ${report.maturity_mapping?.enisa_security_culture?.next || 'Unknown'}
- **What It Takes:** ${report.maturity_mapping?.enisa_security_culture?.what_it_takes || 'N/A'}

**Recommended Simulation Strategy:**
${sim ? `- **Title:** ${sim.title}
- **Vector:** ${sim.vector}
- **Scenario Type:** ${sim.scenario_type}
- **Difficulty:** ${sim.difficulty}
- **Persuasion Tactic:** ${sim.persuasion_tactic}
- **Rationale:** ${sim.rationale}
- **NIST Phish Scale:** Cue Difficulty: ${sim.nist_phish_scale?.cue_difficulty || 'N/A'}, Premise Alignment: ${sim.nist_phish_scale?.premise_alignment || 'N/A'}
- **Designed to Progress:** ${sim.designed_to_progress || 'N/A'}` : 'None'}

**Recommended Training Strategy:**
${ml ? `- **Title:** ${ml.title}
- **Objective:** ${ml.objective}
- **Duration:** ${ml.duration_min} minutes
- **Language:** ${toolResult.userInfo?.preferredLanguage || ml.language || 'en-gb'}
- **Rationale:** ${ml.rationale}` : 'None'}

**Recommended Nudge Strategy:**
${nudge ? `- **Channel:** ${nudge.channel}
- **Message:** ${nudge.message}
- **Cadence:** ${nudge.cadence}
- **Rationale:** ${nudge.rationale}` : 'None'}

**References (use in generation):**
${references || 'None provided'}`;
}


/**
 * Generate generic content (phishing + training) for group assignment
 * Uses group-topic-service to get topic + prompts
 */
async function generateContentForGroup(
    actions: ('training' | 'phishing')[],
    preferredLanguage: string | undefined,
    targetGroupResourceId: string | undefined
): Promise<{ phishingResult: any; trainingResult: any }> {
    const logger = getLogger('GenerateContentForGroup');
    const userId = targetGroupResourceId || Date.now();
    let phishingResult: any = undefined;
    let trainingResult: any = undefined;

    // STEP 1: Select topic + get prompts from service
    logger.info('Selecting unified topic for group training', { groupId: userId });
    const topicSelection = await selectGroupTrainingTopic(preferredLanguage);
    const { topic, phishingPrompt, trainingPrompt, objectives, scenarios } = topicSelection;
    logger.info('🎯 Using topic for both phishing & training', { topic, objectivesCount: objectives.length });

    const generationPromises: Promise<any>[] = [];

    // Generate phishing with selected topic + prompt
    if (actions.includes('phishing')) {
        const groupPhishingSimulation = {
            title: `Group Phishing Simulation: ${topic}`,
            difficulty: 'Medium',
            scenario_type: 'CLICK_ONLY',
            vector: 'EMAIL',
            persuasion_tactic: 'Topic-focused attack',
            rationale: `Group-level awareness training focused on: ${topic}`
        };

        logger.info('Generating phishing simulation', {
            groupId: userId,
            topic,
            language: preferredLanguage
        });

        generationPromises.push(
            generatePhishingSimulationForGroup(
                groupPhishingSimulation,
                phishingPrompt,  // custom topic-based prompt from group-topic-service
                preferredLanguage,
                `phishing-group-${userId}`,
                userId as string | number
            )
                .then(result => { phishingResult = result; })
                .catch(error => {
                    const err = normalizeError(error);
                    logger.error('Phishing generation failed (GROUP)', { error: err.message });
                    phishingResult = { success: false, error: err.message };
                })
        );
    }

    // Generate training with same topic + prompt
    if (actions.includes('training')) {
        const groupMicrolearning = {
            title: `Group Security Training: ${topic}`,
            objective: `Build comprehensive awareness on ${topic}`,
            rationale: `Group-level training aligned with phishing simulation on: ${topic}`
        };

        logger.info('Generating training module', {
            groupId: userId,
            topic,
            language: preferredLanguage
        });

        generationPromises.push(
            generateTrainingModuleForGroup(
                groupMicrolearning,
                trainingPrompt,  // custom topic-based prompt from group-topic-service
                preferredLanguage,
                `training-group-${userId}`,
                userId as string | number
            )
                .then(result => { trainingResult = result; })
                .catch(error => {
                    const err = normalizeError(error);
                    logger.error('Training generation failed (GROUP)', { error: err.message });
                    trainingResult = { success: false, error: err.message };
                })
        );
    }

    // STEP 2: Execute phishing & training in PARALLEL (both use same topic)
    if (generationPromises.length > 0) {
        logger.info('🚀 Executing phishing & training in parallel', { topic });
        await Promise.all(generationPromises);
    }

    return { phishingResult, trainingResult };
}

/**
 * Generate content (phishing + training) for user assignment
 */
async function generateContentForUser(
    toolResult: any,
    executiveReport: string | undefined,
    actions: ('training' | 'phishing')[],
    sendAfterPhishingSimulation: boolean | undefined,
    userId: string | number,
    phishingThreadId: string,
    trainingThreadId: string
): Promise<{ phishingResult: any; trainingResult: any }> {
    const logger = getLogger('GenerateContentForUser');
    let phishingResult: any = undefined;
    let trainingResult: any = undefined;
    const generationPromises: Promise<any>[] = [];

    // Determine upload modes based on sendAfterPhishingSimulation
    const uploadOnly = sendAfterPhishingSimulation === true;

    // Generate phishing if requested and simulation available
    if (actions.includes('phishing') && toolResult.analysisReport?.recommended_next_steps?.simulations?.[0]) {
        const simulation = toolResult.analysisReport.recommended_next_steps.simulations[0];
        logger.info('Starting phishing generation', { simulation: simulation.title, uploadOnly });
        generationPromises.push(
            generatePhishingSimulation(simulation, executiveReport, toolResult, phishingThreadId, uploadOnly)
                .then(result => {
                    logger.info('Phishing generation result received', {
                        success: result?.success,
                        resultKeys: Object.keys(result || {}),
                        hasUploadAssignResult: !!result?.uploadAssignResult
                    });
                    phishingResult = result;
                })
                .catch(error => {
                    const err = normalizeError(error);
                    logger.error('Phishing generation failed', { error: err.message });
                    phishingResult = { success: false, error: err.message };
                })
        );
    }

    // Generate training if requested and training available
    if (actions.includes('training') && toolResult.analysisReport?.recommended_next_steps?.microlearnings?.[0]) {
        const microlearning = toolResult.analysisReport.recommended_next_steps.microlearnings[0];
        logger.info('Starting training generation', { microlearning: microlearning.title, uploadOnly });
        generationPromises.push(
            generateTrainingModule(microlearning, executiveReport, toolResult, trainingThreadId, uploadOnly)
                .then(result => {
                    logger.info('Training generation result received', {
                        success: result?.success,
                        resultKeys: Object.keys(result || {}),
                        hasData: !!result?.data,
                        hasUploadAssignResult: !!result?.uploadAssignResult
                    });
                    trainingResult = result;
                })
                .catch(error => {
                    const err = normalizeError(error);
                    logger.error('Training generation failed', { error: err.message });
                    trainingResult = { success: false, error: err.message };
                })
        );
    }

    // Execute in parallel
    if (generationPromises.length > 0) {
        await Promise.all(generationPromises);
    }

    // If sendAfterPhishingSimulation, assign phishing with training IDs after both complete
    if (sendAfterPhishingSimulation === true && phishingResult?.success && trainingResult?.success) {
        logger.info('Preparing to assign phishing with training IDs', {
            trainingResultKeys: Object.keys(trainingResult || {}),
            hasData: !!trainingResult?.data,
            dataKeys: trainingResult?.data ? Object.keys(trainingResult.data) : [],
            hasUploadAssignResult: !!trainingResult?.uploadAssignResult,
            uploadAssignResultKeys: trainingResult?.uploadAssignResult ? Object.keys(trainingResult.uploadAssignResult) : []
        });

        // Extract training IDs from training result - try multiple paths
        const trainingId =
            trainingResult?.data?.resourceId ||
            trainingResult?.uploadAssignResult?.trainingId ||
            trainingResult?.uploadAssignResult?.resourceId;

        const sendTrainingLanguageId =
            trainingResult?.data?.sendTrainingLanguageId ||
            trainingResult?.uploadAssignResult?.languageId ||
            trainingResult?.uploadAssignResult?.sendTrainingLanguageId;

        logger.info('Extracted training IDs', {
            trainingId,
            sendTrainingLanguageId,
            source: trainingId ? (trainingResult?.data?.resourceId ? 'data' : 'uploadAssignResult') : 'NOT_FOUND'
        });

        if (!trainingId) {
            logger.warn('Cannot assign phishing with training: trainingId not found', {
                trainingResult: JSON.stringify(trainingResult, null, 2)
            });
        } else {
            const assignResult = await assignPhishingWithTraining(
                userId as string,
                phishingThreadId,
                trainingId,
                sendTrainingLanguageId
            );
            if (assignResult?.success) {
                phishingResult.uploadAssignResult = assignResult;
                phishingResult.message = phishingResult.message?.replace('uploaded', 'uploaded and assigned with training');
                logger.info('✅ Phishing assigned with training IDs');
            } else {
                logger.warn('Failed to assign phishing with training IDs', { error: assignResult?.error });
            }
        }
    }

    return { phishingResult, trainingResult };
}

/**
 * Autonomous service - Executes user/group analysis and generates training/phishing content
 */
export async function executeAutonomousGeneration(
    request: AutonomousRequest
): Promise<AutonomousResponse> {
    const logger = getLogger('ExecuteAutonomousGeneration');
    const { token, firstName, lastName, targetUserResourceId, targetGroupResourceId, departmentName, actions, sendAfterPhishingSimulation, preferredLanguage } = request;

    // Determine assignment type
    const isUserAssignment = !!(firstName || targetUserResourceId);
    const isGroupAssignment = !!targetGroupResourceId;

    if (!isUserAssignment && !isGroupAssignment) {
        logger.error('Invalid assignment: neither user nor group specified');
        return { success: false, error: 'Must specify either user or group assignment', actions };
    }

    try {
        return await requestStorage.run({ token }, async (): Promise<AutonomousResponse> => {
            // USER ASSIGNMENT: Get user info and generate personalized content
            if (isUserAssignment) {
                logger.info('USER ASSIGNMENT: Analyzing user behavior');

                if (!getUserInfoTool.execute) {
                    return { success: false, error: 'getUserInfoTool not executable', actions };
                }

                // Fast path (direct ID) or slow path (name search)
                const toolContext = targetUserResourceId
                    ? { targetUserResourceId, departmentName }
                    : { firstName, lastName };

                const toolResult = await getUserInfoTool.execute({ context: toolContext } as any);

                if (!toolResult.success) {
                    return { success: false, error: toolResult.error || 'User info retrieval failed', actions };
                }

                // Override preferredLanguage if provided
                if (preferredLanguage && toolResult.userInfo) {
                    toolResult.userInfo.preferredLanguage = preferredLanguage;
                }

                // Generate content
                const userId = toolResult.userInfo?.targetUserResourceId || Date.now();
                const executiveReport = buildExecutiveReport(toolResult);
                const { phishingResult, trainingResult } = await generateContentForUser(
                    toolResult, executiveReport, actions, sendAfterPhishingSimulation, userId,
                    `phishing-${userId}`, `training-${userId}`
                );

                logger.info('✅ Autonomous service completed successfully', {
                    assignmentType: 'user',
                    userId,
                    phishingSuccess: phishingResult?.success,
                    trainingSuccess: trainingResult?.success
                });

                return {
                    success: true,
                    userInfo: toolResult.userInfo && {
                        ...toolResult.userInfo,
                        targetUserResourceId: toolResult.userInfo.targetUserResourceId!,
                        maskedId: toolResult.userInfo.maskedId || `[USER-${toolResult.userInfo.targetUserResourceId}]`
                    },
                    recentActivities: toolResult.recentActivities,
                    analysisReport: toolResult.analysisReport,
                    executiveReport,
                    phishingResult,
                    trainingResult,
                    actions,
                    message: `User analysis and content generation completed`
                };
            } else if (isGroupAssignment) {
                // GROUP ASSIGNMENT: Generate generic content for bulk assignment
                logger.info('GROUP ASSIGNMENT: Generating generic content for group', { targetGroupResourceId });

                const { phishingResult, trainingResult } = await generateContentForGroup(
                    actions, preferredLanguage, targetGroupResourceId
                );

                logger.info('✅ Autonomous service completed successfully', {
                    assignmentType: 'group',
                    targetGroupResourceId,
                    phishingSuccess: phishingResult?.success,
                    trainingSuccess: trainingResult?.success
                });

                return {
                    success: true,
                    phishingResult,
                    trainingResult,
                    actions,
                    message: `Generic content generated for group ${targetGroupResourceId}`
                };
            }

            // Fallback (should never reach here due to validation)
            return {
                success: false,
                error: 'Invalid assignment type',
                actions
            };
        });
    } catch (error) {
        const err = normalizeError(error);
        logger.error('Autonomous service error', { error: err.message, stack: err.stack });
        return { success: false, error: err.message, actions };
    }
}
