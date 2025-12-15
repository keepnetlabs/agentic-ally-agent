// src/mastra/services/autonomous-service.ts
import { getUserInfoTool } from '../tools/user-management';
import { requestStorage } from '../utils/core/request-storage';
import { phishingEmailAgent } from '../agents/phishing-email-agent';
import { microlearningAgent } from '../agents/microlearning-agent';
import { AGENT_CALL_TIMEOUT_MS } from '../constants';
import { withTimeout, withRetry } from '../utils/core/resilience-utils';
import { getLogger } from '../utils/core/logger';
import { AutonomousRequest, AutonomousResponse } from '../types/autonomous-types';
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
 * Generate phishing simulation using agent (maintains agentic behavior and memory)
 * Implements 3-level fallback pattern per Cursor Rules
 */
async function generatePhishingSimulation(
    simulation: any,
    executiveReport: string | undefined,
    toolResult: any,
    phishingThreadId: string,
    uploadOnly: boolean = false
): Promise<any> {
    const logger = getLogger('GeneratePhishingSimulation');
    logger.info('Using phishingEmailAgent to generate simulation based on analysis report');

    // First, add executive report to agent's memory by sending it as a message
    // This way agent has the full context in memory
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
            const err = memoryError instanceof Error ? memoryError : new Error(String(memoryError));
            logger.warn('Failed to add context to agent memory', { error: err.message });
            // Continue anyway - agent can work without full context
        }
    }

    // Build goal-based prompts for 3-level fallback (more agentic approach)
    const fullPrompt = buildPhishingGenerationPrompt({
        simulation,
        toolResult,
    });

    const simplifiedPrompt = buildPhishingGenerationPromptSimplified({
        simulation,
        toolResult,
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
            const err2 = fallback1Error instanceof Error ? fallback1Error : new Error(String(fallback1Error));
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
 * Upload and assign phishing simulation to user (extracted for clarity)
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
        logger.info('Requesting agent to upload and assign phishing simulation');
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
 * Assign phishing simulation with training IDs (for sendAfterPhishingSimulation flow)
 */
async function assignPhishingWithTraining(
    targetUserResourceId: string | undefined,
    phishingThreadId: string
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
        logger.info('Requesting agent to assign phishing simulation with training IDs');
        // Use goal-based prompt (more agentic)
        const assignPrompt = buildAssignPhishingWithTrainingPrompt(targetUserResourceId);

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
 * Upload only training module (no assignment)
 */
async function uploadTrainingOnly(threadId: string): Promise<any> {
    const logger = getLogger('UploadTrainingOnly');
    try {
        logger.info('Requesting agent to upload training module (upload only)');
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
 */
async function generateTrainingModule(
    microlearning: any,
    executiveReport: string | undefined,
    toolResult: any,
    trainingThreadId: string,
    uploadOnly: boolean = false
): Promise<any> {
    const logger = getLogger('GenerateTrainingModule');
    logger.info('Using microlearningAgent to generate training module based on analysis report');

    // First, add executive report to agent's memory by sending it as a message
    // This way agent has the full context in memory
    if (executiveReport) {
        try {
            logger.debug('Adding executive report to microlearningAgent memory');
            await withTimeout(
                microlearningAgent.generate(`[CONTEXT FROM ORCHESTRATOR: ${executiveReport}]`, {
                    memory: {
                        thread: trainingThreadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                AGENT_CALL_TIMEOUT_MS
            );
            logger.debug('Executive report added to microlearningAgent memory');
        } catch (memoryError) {
            const err = memoryError instanceof Error ? memoryError : new Error(String(memoryError));
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

    // Build goal-based prompts for 3-level fallback (more agentic approach)
    const fullPrompt = buildTrainingGenerationPrompt({
        microlearning,
        department,
        level,
    });

    const simplifiedPrompt = buildTrainingGenerationPromptSimplified({
        microlearning,
        department,
        level,
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
            const uploadResult = await uploadTrainingOnly(trainingThreadId);
            return {
                success: true,
                message: 'Training module generated and uploaded',
                agentResponse: agentResult.text,
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
        const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
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
                const uploadResult = await uploadTrainingOnly(trainingThreadId);
                return {
                    success: true,
                    message: 'Training module generated via agent (simplified) and uploaded',
                    agentResponse: agentResult.text,
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
            const err2 = fallback1Error instanceof Error ? fallback1Error : new Error(String(fallback1Error));
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
 * Autonomous service - Executes user analysis and generates training/phishing content
 * 
 * Flow:
 * 1. Fetch user info and generate analysis report
 * 2. Prepare concise context from analysis report (no extra agent)
 * 3. Generate phishing simulation via phishingEmailAgent (if requested)
 * 4. Generate training module via microlearningAgent (if requested)
 */
export async function executeAutonomousGeneration(
    request: AutonomousRequest
): Promise<AutonomousResponse> {
    const logger = getLogger('ExecuteAutonomousGeneration');
    const { token, firstName, lastName, actions, sendAfterPhishingSimulation } = request;

    try {
        // Set token in request storage so getUserInfoTool can access it
        return await requestStorage.run({ token }, async () => {
            logger.info('Using getUserInfoTool with user details', { firstName, lastName });

            // Use getUserInfoTool with firstName/lastName (as the tool expects)
            if (!getUserInfoTool.execute) {
                return {
                    success: false,
                    error: 'getUserInfoTool is not executable',
                    actions,
                };
            }

            const toolResult = await getUserInfoTool.execute({
                context: {
                    firstName,
                    lastName: lastName
                },
            } as any);

            if (!toolResult.success) {
                return {
                    success: false,
                    error: toolResult.error || 'Failed to get user info',
                    actions,
                };
            }

            // Use isolated thread IDs for each agent to prevent memory confusion
            const userId = toolResult.userInfo?.targetUserResourceId || Date.now();
            const phishingThreadId = `phishing-${userId}`;
            const trainingThreadId = `training-${userId}`;

            // Step 2: Prepare concise context for agents (no duplication, include all important fields + references)
            let contextForAgents: string | undefined;
            logger.debug('Analysis report available', { hasAnalysis: !!toolResult.analysisReport });
            if (toolResult.analysisReport) {
                const report = toolResult.analysisReport;
                const sim = report.recommended_next_steps?.simulations?.[0];
                const ml = report.recommended_next_steps?.microlearnings?.[0];
                const nudge = report.recommended_next_steps?.nudges?.[0];
                const references = Array.isArray(report.references) ? report.references.join(', ') : '';

                contextForAgents = `**User Behavior Analysis Report**

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
- **Language:** ${ml.language}
- **Rationale:** ${ml.rationale}` : 'None'}

**Recommended Nudge Strategy:**
${nudge ? `- **Channel:** ${nudge.channel}
- **Message:** ${nudge.message}
- **Cadence:** ${nudge.cadence}
- **Rationale:** ${nudge.rationale}` : 'None'}

**References (use in generation):**
${references || 'None provided'}`;

            }

            // Keep executiveReport alias for compatibility
            const executiveReport = contextForAgents;
            logger.debug('Executive report prepared', { hasContext: !!executiveReport });

            // Step 3: Generate content based on actions
            let phishingResult: any = undefined;
            let trainingResult: any = undefined;
            const shouldSendAfterPhishingSimulation = sendAfterPhishingSimulation === true

            if (shouldSendAfterPhishingSimulation) {
                // Special flow: Phishing → Training → Assign Phishing with Training IDs
                logger.info('Using sendAfterPhishingSimulation flow');

                // Parallel Generation using Promise array for better readability
                const generationPromises: Promise<any>[] = [];

                // 1. Generate and upload phishing (no assign)
                if (actions.includes('phishing') && toolResult.analysisReport?.recommended_next_steps?.simulations?.[0]) {
                    const simulation = toolResult.analysisReport.recommended_next_steps.simulations[0];
                    generationPromises.push(
                        generatePhishingSimulation(simulation, executiveReport, toolResult, phishingThreadId, true)
                            .then(result => { phishingResult = result; })
                            .catch(error => {
                                const err = error instanceof Error ? error : new Error(String(error));
                                logger.error('Phishing generation failed (sendAfterPhishing flow)', { error: err.message });
                                phishingResult = { success: false, error: err.message };
                            })
                    );
                }

                // 2. Generate and upload training (no assign)
                if (actions.includes('training') && toolResult.analysisReport?.recommended_next_steps?.microlearnings?.[0]) {
                    const microlearning = toolResult.analysisReport.recommended_next_steps.microlearnings[0];
                    generationPromises.push(
                        generateTrainingModule(microlearning, executiveReport, toolResult, trainingThreadId, true)
                            .then(result => { trainingResult = result; })
                            .catch(error => {
                                const err = error instanceof Error ? error : new Error(String(error));
                                logger.error('Training generation failed (sendAfterPhishing flow)', { error: err.message });
                                trainingResult = { success: false, error: err.message };
                            })
                    );
                }

                // Execute both in parallel
                if (generationPromises.length > 0) {
                    await Promise.all(generationPromises);
                }

                // 3. Assign phishing with training IDs (phishing already uploaded)
                if (phishingResult?.success && trainingResult?.success) {
                    logger.info('Assigning phishing with training IDs');
                    const assignPhishingResult = await assignPhishingWithTraining(
                        toolResult.userInfo?.targetUserResourceId,
                        phishingThreadId
                    );

                    if (assignPhishingResult?.success) {
                        phishingResult.uploadAssignResult = assignPhishingResult;
                        phishingResult.message = phishingResult.message?.replace('uploaded', 'uploaded and assigned with training');
                    } else {
                        logger.warn('Failed to assign phishing with training IDs', { error: assignPhishingResult?.error });
                    }
                }
            } else {
                // Normal flow: Each generates, uploads, and assigns independently
                logger.info('Using normal flow (independent generation and assignment)');

                // Generate phishing and training in parallel (with isolated thread IDs)
                const generationPromises: Promise<any>[] = [];

                if (actions.includes('phishing') && toolResult.analysisReport?.recommended_next_steps?.simulations?.[0]) {
                    const simulation = toolResult.analysisReport.recommended_next_steps.simulations[0];
                    generationPromises.push(
                        generatePhishingSimulation(simulation, executiveReport, toolResult, phishingThreadId, false)
                            .then(result => { phishingResult = result; })
                            .catch(error => {
                                const err = error instanceof Error ? error : new Error(String(error));
                                logger.error('Phishing generation failed', { error: err.message });
                                phishingResult = { success: false, error: err.message };
                            })
                    );
                }

                if (actions.includes('training') && toolResult.analysisReport?.recommended_next_steps?.microlearnings?.[0]) {
                    const microlearning = toolResult.analysisReport.recommended_next_steps.microlearnings[0];
                    generationPromises.push(
                        generateTrainingModule(microlearning, executiveReport, toolResult, trainingThreadId, false)
                            .then(result => { trainingResult = result; })
                            .catch(error => {
                                const err = error instanceof Error ? error : new Error(String(error));
                                logger.error('Training generation failed', { error: err.message });
                                trainingResult = { success: false, error: err.message };
                            })
                    );
                }

                // Execute both in parallel
                if (generationPromises.length > 0) {
                    await Promise.all(generationPromises);
                }
            }

            // Build success message based on what was generated
            const generatedItems: string[] = [];
            if (phishingResult?.success) generatedItems.push('phishing simulation');
            if (trainingResult?.success) generatedItems.push('training module');

            const message = generatedItems.length > 0
                ? `User analysis, executive report, and ${generatedItems.join(' + ')} completed successfully.`
                : 'User info, analysis, and executive report fetched successfully. Ready for next step.';
            logger.info('Autonomous service completed successfully', { message });
            return {
                success: true,
                userInfo: toolResult.userInfo,
                recentActivities: toolResult.recentActivities,
                analysisReport: toolResult.analysisReport,
                executiveReport,
                phishingResult,
                trainingResult,
                actions,
                message,
            };
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Autonomous service error', { error: err.message, stack: err.stack });
        return {
            success: false,
            error: err.message,
            actions,
        };
    }
}
