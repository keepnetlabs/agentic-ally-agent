// src/mastra/services/autonomous-service.ts
import { getUserInfoTool } from '../tools/user-management';
import { requestStorage } from '../utils/core/request-storage';
import { phishingEmailAgent } from '../agents/phishing-email-agent';
import { microlearningAgent } from '../agents/microlearning-agent';
import { AGENT_CALL_TIMEOUT_MS } from '../constants';
import { withTimeout, withRetry } from '../utils/core/resilience-utils';
import { AutonomousRequest, AutonomousResponse } from '../types/autonomous-types';

/**
 * Generate phishing simulation using agent (maintains agentic behavior and memory)
 * Implements 3-level fallback pattern per Cursor Rules
 */
async function generatePhishingSimulation(
    simulation: any,
    executiveReport: string | undefined,
    toolResult: any,
    threadId: string
): Promise<any> {
    console.log('🎣 Using phishingEmailAgent to generate simulation based on analysis report...');

    // First, add executive report to agent's memory by sending it as a message
    // This way agent has the full context in memory
    if (executiveReport) {
        try {
            console.log('📤 Adding executive report to phishingEmailAgent memory...');
            await withTimeout(
                phishingEmailAgent.generate(`[CONTEXT FROM ORCHESTRATOR: ${executiveReport}]`, {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                AGENT_CALL_TIMEOUT_MS
            );
            console.log('✅ Executive report added to agent memory');
        } catch (memoryError) {
            console.warn('⚠️ Failed to add context to agent memory:', memoryError);
            // Continue anyway - agent can work without full context
        }
    }

    // Build prompts for 3-level fallback
    const fullPrompt = `Based on the user behavior analysis in the previous context, generate the recommended phishing simulation now.

**Recommended Simulation Strategy:**
- Topic: ${simulation.title || 'Security Update'}
- Difficulty: ${simulation.difficulty || 'Medium'}
- Method: ${simulation.scenario_type === 'CLICK_ONLY' ? 'Click-Only' : simulation.scenario_type === 'DATA_SUBMISSION' ? 'Data-Submission' : 'Click-Only'}
- Vector: ${simulation.vector || 'EMAIL'}
- Persuasion Tactic: ${simulation.persuasion_tactic || 'Authority'}
- Rationale: ${simulation.rationale || 'Based on user behavior analysis'}

**Target Profile:**
- Department: ${toolResult.userInfo?.department || 'All'}
- Behavioral Triggers: ${simulation.persuasion_tactic || 'Authority'}

Execute the phishingExecutor tool now with these parameters. Skip confirmation and generate immediately.`;

    const simplifiedPrompt = `Generate a phishing simulation:
- Topic: ${simulation.title || 'Security Update'}
- Difficulty: ${simulation.difficulty || 'Medium'}
- Department: ${toolResult.userInfo?.department || 'All'}

Execute the phishingExecutor tool now. Skip confirmation and generate immediately.`;

    const memoryConfig = {
        memory: {
            thread: threadId,
            resource: 'agentic-ally-autonomous'
        }
    };

    // LEVEL 1: Primary path - Full context with timeout + retry
    try {
        console.log('🎣 Calling phishingEmailAgent (Level 1: Primary with full context)...');
        const agentResult = await withRetry(
            () => withTimeout(
                phishingEmailAgent.generate(fullPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            ),
            'Phishing agent generation (Level 1)'
        );

        console.log('✅ Phishing agent executed successfully');
        console.log('📝 Agent response preview:', agentResult.text?.substring(0, 500) || 'No response');

        return {
            success: true,
            message: 'Phishing simulation generated via agent',
            agentResponse: agentResult.text,
        };
    } catch (primaryError) {
        console.warn('⚠️ Primary failed, fallback 1:', primaryError);

        // LEVEL 2: Fallback - Simplified prompt without full context
        try {
            console.log('🎣 Attempting fallback 1: Simplified prompt...');
            const agentResult = await withTimeout(
                phishingEmailAgent.generate(simplifiedPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            );

            console.log('✅ Fallback 1 succeeded');
            return {
                success: true,
                message: 'Phishing simulation generated via agent (simplified)',
                agentResponse: agentResult.text,
            };
        } catch (fallback1Error) {
            console.warn('⚠️ Fallback 1 failed, using basic:', fallback1Error);

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
 * Upload and assign training module to user (extracted for clarity)
 */
async function uploadAndAssignTraining(
    targetUserResourceId: string | undefined,
    threadId: string
): Promise<any> {
    if (!targetUserResourceId) {
        console.warn('⚠️ Cannot assign: Missing targetUserResourceId');
        return {
            success: false,
            error: 'Missing targetUserResourceId',
        };
    }

    try {
        console.log('📤 Requesting agent to upload and assign training...');
        const uploadAssignPrompt = `The training has been generated successfully. Now you MUST upload and assign it.

**AUTONOMOUS EXECUTION OVERRIDE:**
- User Confirmation: **ALREADY RECEIVED**
- Target User ID: **${targetUserResourceId}**
- Action: **Execute Upload & Assign IMMEDIATELY**

Instructions:
1. FIRST: Call 'uploadTraining' tool.
2. WAIT for the tool output (resourceId).
3. THEN: Call 'assignTraining' tool using the resourceId from step 1.
   - targetUserResourceId: "${targetUserResourceId}"

WARNING: You CANNOT call 'assignTraining' before 'uploadTraining' completes. Do not run them in parallel.
DO NOT ask for confirmation. EXECUTE SEQUENCE NOW.`;

        const uploadAssignResponse = await withTimeout(
            microlearningAgent.generate(uploadAssignPrompt, {
                memory: {
                    thread: threadId,
                    resource: 'agentic-ally-autonomous'
                }
            }),
            AGENT_CALL_TIMEOUT_MS
        );

        console.log('✅ Upload and assign agent executed');
        console.log('📝 Upload/Assign response preview:', uploadAssignResponse.text?.substring(0, 500) || 'No response');

        return {
            success: true,
            agentResponse: uploadAssignResponse.text,
        };
    } catch (uploadAssignError) {
        console.error('❌ Upload/Assign agent error:', uploadAssignError);
        return {
            success: false,
            error: uploadAssignError instanceof Error ? uploadAssignError.message : 'Unknown error',
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
    threadId: string
): Promise<any> {
    console.log('📚 Using microlearningAgent to generate training module based on analysis report...');

    // First, add executive report to agent's memory by sending it as a message
    // This way agent has the full context in memory
    if (executiveReport) {
        try {
            console.log('📤 Adding executive report to microlearningAgent memory...');
            await withTimeout(
                microlearningAgent.generate(`[CONTEXT FROM ORCHESTRATOR: ${executiveReport}]`, {
                    memory: {
                        thread: threadId,
                        resource: 'agentic-ally-autonomous'
                    }
                }),
                AGENT_CALL_TIMEOUT_MS
            );
            console.log('✅ Executive report added to microlearningAgent memory');
        } catch (memoryError) {
            console.warn('⚠️ Failed to add context to microlearningAgent memory:', memoryError);
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

    // Build prompts for 3-level fallback
    const fullPrompt = `Based on the user behavior analysis in the previous context, generate the recommended training module now.

**Recommended Training Strategy:**
- Topic: ${topic}
- Objective: ${objective}
- Department: ${department}
- Level: ${level}
- Rationale: ${rationale}

**Target Profile:**
- Department: ${toolResult.userInfo?.department || 'All'}
- User Context: See previous orchestrator context for detailed behavioral analysis

**AUTONOMOUS EXECUTION OVERRIDE:**
- User Confirmation: **ALREADY RECEIVED**
- Information Gathering: **COMPLETE**
- Summary: **SKIPPED BY SYSTEM**
- ACTION: **Execute State 3 IMMEDIATELY**

Instruction: Call the workflowExecutor tool now with these parameters.
- workflowType: 'create-microlearning'
- prompt: "${topic}"
- department: "${department}"
- level: "${level}"
- additionalContext: [Copy the ENTIRE orchestrator context from previous message]
- priority: 'medium'

DO NOT ask questions. DO NOT show summary. EXECUTE NOW.`;

    const simplifiedPrompt = `Generate training module:
- Topic: ${topic}
- Department: ${department}
- Level: ${level}

Execute workflowExecutor tool with workflowType: 'create-microlearning', prompt: "${topic}", department: "${department}", level: "${level}". Skip confirmation.`;

    const memoryConfig = {
        memory: {
            thread: threadId,
            resource: 'agentic-ally-autonomous'
        }
    };

    // LEVEL 1: Primary path - Full context with timeout + retry
    try {
        console.log('📚 Calling microlearningAgent (Level 1: Primary with full context)...');
        const agentResult = await withRetry(
            () => withTimeout(
                microlearningAgent.generate(fullPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            ),
            'Training agent generation (Level 1)'
        );

        console.log('✅ Training agent executed successfully');

        // Step 4: Upload and Assign (separate agent call after generation)
        const uploadAssignResult = await uploadAndAssignTraining(
            toolResult.userInfo?.targetUserResourceId,
            threadId
        );

        return {
            success: true,
            message: 'Training module generated' +
                (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
            agentResponse: agentResult.text,
            uploadAssignResult,
        };
    } catch (primaryError) {
        console.warn('⚠️ Primary failed, fallback 1:', primaryError);

        // LEVEL 2: Fallback - Simplified prompt without full context
        try {
            console.log('📚 Attempting fallback 1: Simplified prompt...');
            const agentResult = await withTimeout(
                microlearningAgent.generate(simplifiedPrompt, memoryConfig),
                AGENT_CALL_TIMEOUT_MS
            );

            console.log('✅ Fallback 1 succeeded');
            const uploadAssignResult = await uploadAndAssignTraining(
                toolResult.userInfo?.targetUserResourceId,
                threadId
            );

            return {
                success: true,
                message: 'Training module generated via agent (simplified)' +
                    (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
                agentResponse: agentResult.text,
                uploadAssignResult,
            };
        } catch (fallback1Error) {
            console.warn('⚠️ Fallback 1 failed, using basic:', fallback1Error);

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
    const { token, firstName, lastName, actions } = request;

    try {
        // Set token in request storage so getUserInfoTool can access it
        return await requestStorage.run({ token }, async () => {
            console.log('✅ Using getUserInfoTool with:', { firstName, lastName });

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

            // Use consistent thread ID for memory continuity across all agents
            const threadId = `autonomous-${toolResult.userInfo?.targetUserResourceId || Date.now()}`;

            // Step 2: Prepare concise context for agents (no duplication, include all important fields + references)
            let contextForAgents: string | undefined;
            console.log('🔍 Analysis report:', JSON.stringify(toolResult.analysisReport, null, 2));
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
            console.log('🔍 Executive report:', executiveReport);
            // Step 3: Generate content based on actions
            let phishingResult: any = undefined;
            let trainingResult: any = undefined;

            // Generate phishing if requested
            if (actions.includes('phishing') && toolResult.analysisReport?.recommended_next_steps?.simulations?.[0]) {
                const simulation = toolResult.analysisReport.recommended_next_steps.simulations[0];
                phishingResult = await generatePhishingSimulation(simulation, executiveReport, toolResult, threadId);
            }

            // Generate training if requested
            if (actions.includes('training') && toolResult.analysisReport?.recommended_next_steps?.microlearnings?.[0]) {
                const microlearning = toolResult.analysisReport.recommended_next_steps.microlearnings[0];
                trainingResult = await generateTrainingModule(microlearning, executiveReport, toolResult, threadId);
            }

            // Build success message based on what was generated
            const generatedItems: string[] = [];
            if (phishingResult?.success) generatedItems.push('phishing simulation');
            if (trainingResult?.success) generatedItems.push('training module');

            const message = generatedItems.length > 0
                ? `User analysis, executive report, and ${generatedItems.join(' + ')} completed successfully.`
                : 'User info, analysis, and executive report fetched successfully. Ready for next step.';

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
        console.error('❌ Autonomous service error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            actions,
        };
    }
}
