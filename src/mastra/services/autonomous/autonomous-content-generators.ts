/**
 * Content generation orchestration for autonomous service
 * Handles user and group content generation coordination
 */

import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import {
    generatePhishingSimulation,
    generatePhishingSimulationForGroup,
    assignPhishingWithTraining,
} from './autonomous-phishing-handlers';
import {
    generateTrainingModule,
    generateTrainingModuleForGroup,
} from './autonomous-training-handlers';
import { selectGroupTrainingTopic } from './group-topic-service';

interface ContentGenerationReport {
    header?: {
        resilience_stage?: { level?: string };
        progression_target?: string;
        progression_hint?: string;
    };
    meta?: {
        department?: string;
    };
    strengths?: string[];
    growth_opportunities?: string[];
    maturity_mapping?: {
        gartner_sbcp?: { current?: string; next?: string; what_it_takes?: string };
        enisa_security_culture?: { current?: string; next?: string; what_it_takes?: string };
    };
    references?: string[];
    recommended_next_steps?: NextSteps;
    ai_recommended_next_steps?: NextSteps;
}

interface NextSteps {
    simulations?: any[];
    microlearnings?: any[];
    nudges?: any[];
}

interface AutonomousToolResult {
    analysisReport?: ContentGenerationReport;
    userInfo?: {
        preferredLanguage?: string;
        department?: string;
        targetUserResourceId?: string;
    };
}

/**
 * Build executive report from analysis data
 */
function getRecommendedNextSteps(report: ContentGenerationReport | undefined) {
    return (
        report?.recommended_next_steps ??
        report?.ai_recommended_next_steps ??
        {
            simulations: [],
            microlearnings: [],
            nudges: [],
        }
    );
}

export function buildExecutiveReport(toolResult: AutonomousToolResult): string | undefined {
    if (!toolResult.analysisReport) {
        return undefined;
    }

    const report = toolResult.analysisReport;
    const steps = getRecommendedNextSteps(report);
    const sim = steps.simulations?.[0];
    const ml = steps.microlearnings?.[0];
    const nudge = steps.nudges?.[0];
    const references = (report.references && Array.isArray(report.references)) ? report.references.join(', ') : '';

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
export async function generateContentForGroup(
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
    const { topic, phishingPrompt, trainingPrompt, objectives } = topicSelection;
    logger.info('🎯 Using topic for both phishing & training', { topic, objectivesCount: objectives.length });

    const runTimestamp = Date.now();
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

        const phishingThreadId = `phishing-group-${userId}-${runTimestamp}`;

        logger.info('Generating phishing simulation', {
            groupId: userId,
            topic,
            language: preferredLanguage,
            threadId: phishingThreadId
        });

        generationPromises.push(
            generatePhishingSimulationForGroup(
                groupPhishingSimulation,
                phishingPrompt,  // custom topic-based prompt from group-topic-service
                preferredLanguage,
                phishingThreadId,
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

        const trainingThreadId = `training-group-${userId}-${runTimestamp}`;

        logger.info('Generating training module', {
            groupId: userId,
            topic,
            language: preferredLanguage,
            threadId: trainingThreadId
        });

        generationPromises.push(
            generateTrainingModuleForGroup(
                groupMicrolearning,
                trainingPrompt,  // custom topic-based prompt from group-topic-service
                preferredLanguage,
                trainingThreadId,
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
export async function generateContentForUser(
    toolResult: AutonomousToolResult,
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

    const recommendedSteps = getRecommendedNextSteps(toolResult.analysisReport);

    // Generate phishing if requested and simulation available
    if (actions.includes('phishing') && recommendedSteps.simulations?.[0]) {
        const simulation = recommendedSteps.simulations[0];
        logger.debug('Starting phishing generation', { simulation: simulation.title, uploadOnly });
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
    if (actions.includes('training') && recommendedSteps.microlearnings?.[0]) {
        const microlearning = recommendedSteps.microlearnings[0];
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
