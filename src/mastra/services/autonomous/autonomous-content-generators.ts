/**
 * Content generation orchestration for autonomous service
 * Handles user and group content generation coordination
 */

import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { errorService } from '../error-service';
import { DEFAULT_TRAINING_LEVEL, PHISHING, SMISHING, TRAINING_LEVELS } from '../../constants';
import { buildThreadId } from './autonomous-handler-utils';
import type {
  AutonomousActionResult,
  AutonomousAction,
  ContentGeneratableAction,
} from '../../types/autonomous-types';
import {
  generatePhishingSimulation,
  generatePhishingSimulationForGroup,
  assignPhishingWithTraining,
  buildContentCategory,
} from './autonomous-phishing-handlers';
import { generateSmishingSimulation } from './autonomous-smishing-handlers';
import { generateTrainingModule, generateTrainingModuleForGroup } from './autonomous-training-handlers';
import { initiateAutonomousVishingCall } from './autonomous-vishing-handlers';
import { selectGroupTrainingTopic } from './group-topic-service';
import type { RefinementContext } from '../rejection-refinement-service';
import { requestStorage } from '../../utils/core/request-storage';

interface ContentGenerationReport {
  header?: {
    resilience_stage?: { level?: string };
    progression_target?: string;
    progression_hint?: string;
    behavioral_resilience?: {
      current_stage?: string;
      target_stage?: string;
    };
  };
  meta?: {
    department?: string;
  };
  strengths?: string[];
  growth_opportunities?: string[];
  maturity_mapping?: {
    gartner_sbcp?: { current?: string; next?: string; what_it_takes?: string };
    enisa_security_culture?: { current?: string; next?: string; what_it_takes?: string };
    gartner_sbcp_context_only?: { label?: string; description?: string; what_it_takes?: string };
  };
  references?: string[];
  recommended_next_steps?: NextSteps;
  ai_recommended_next_steps?: NextSteps;
}

interface NextSteps {
  simulations?: RecommendedSimulation[];
  microlearnings?: RecommendedMicrolearning[];
  nudges?: RecommendedNudge[];
}

/** Extended tool result — content-generators needs typed analysisReport (unlike handler files) */
interface AutonomousToolResult {
  analysisReport?: ContentGenerationReport;
  userInfo?: {
    preferredLanguage?: string;
    department?: string;
    targetUserResourceId?: string;
    phoneNumber?: string;
  };
}

interface RecommendedSimulation {
  title?: string;
  vector?: string;
  scenario_type?: string;
  difficulty?: string;
  persuasion_tactic?: string;
  rationale?: string;
  why_this?: string;
  designed_to_progress?: string;
  nist_phish_scale?: {
    cue_difficulty?: string;
    premise_alignment?: string;
  };
}

interface RecommendedMicrolearning {
  title?: string;
  objective?: string;
  duration_min?: number;
  language?: string;
  why_this?: string;
  rationale?: string;
}

interface RecommendedNudge {
  channel?: string;
  message?: string;
  cadence?: string;
  why_this?: string;
  rationale?: string;
}

interface GenerationResults {
  phishingResult?: AutonomousActionResult;
  trainingResult?: AutonomousActionResult;
  smishingResult?: AutonomousActionResult;
  vishingCallResult?: AutonomousActionResult;
}

type ActionBatchResourceIds = Partial<Record<AutonomousAction, string>>;

async function runWithActionBatchContext<T>(
  action: AutonomousAction,
  actionBatchResourceIds: ActionBatchResourceIds | undefined,
  operation: () => Promise<T>
): Promise<T> {
  const actionBatchResourceId = actionBatchResourceIds?.[action];
  if (!actionBatchResourceId) {
    return operation();
  }

  const currentStore = requestStorage.getStore();
  const sharedToolEventBus = currentStore?.__toolEventBus ?? new Map<string, unknown>();
  if (currentStore && !currentStore.__toolEventBus) {
    currentStore.__toolEventBus = sharedToolEventBus;
  }

  return requestStorage.run(
    {
      ...(currentStore ?? {}),
      threadId: actionBatchResourceId,
      __toolEventBus: sharedToolEventBus,
    },
    operation
  );
}

function createMissingRecommendationResult(action: ContentGeneratableAction): AutonomousActionResult {
  return {
    success: false,
    error: `No recommended ${action} content found in analysis report`,
    errorCode: 'ERR_VALIDATION_INPUT',
    errorCategory: 'VALIDATION',
    retryable: false,
  };
}

/** Map error message patterns to errorService classifiers */
const ERROR_CLASSIFIERS: Array<{ test: (msg: string) => boolean; classify: typeof errorService.aiModel }> = [
  { test: msg => msg.includes('timeout') || msg.includes('timed out'), classify: errorService.timeout },
  { test: msg => msg.includes('rate') || msg.includes('429'), classify: errorService.rateLimit },
  { test: msg => msg.includes('token') || msg.includes('auth') || msg.includes('401'), classify: errorService.auth },
];

/** Classify error and return enriched AutonomousActionResult */
function createErrorResult(error: unknown, action: string): AutonomousActionResult {
  const err = normalizeError(error);
  const msg = err.message.toLowerCase();
  const classifier = ERROR_CLASSIFIERS.find(c => c.test(msg))?.classify ?? errorService.aiModel;
  const errorInfo = classifier(err.message, { action });

  return {
    success: false,
    error: err.message,
    errorCode: errorInfo.code,
    errorCategory: errorInfo.category,
    retryable: errorInfo.retryable,
  };
}

function pickRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

interface LevelDecision {
  level: (typeof TRAINING_LEVELS)[number];
  reasoning: string;
}

const EMPTY_NEXT_STEPS: NextSteps = {
  simulations: [],
  microlearnings: [],
  nudges: [],
};

function getCurrentBehavioralStage(report?: ContentGenerationReport): string | undefined {
  return report?.header?.behavioral_resilience?.current_stage || report?.header?.resilience_stage?.level;
}

function getTargetBehavioralStage(report?: ContentGenerationReport): string | undefined {
  return report?.header?.behavioral_resilience?.target_stage || report?.header?.progression_target;
}

function getRecommendationReason(item?: { why_this?: string; rationale?: string }): string | undefined {
  if (!item) {
    return undefined;
  }

  const whyThis = item.why_this?.trim();
  if (whyThis) {
    return whyThis;
  }

  const rationale = item.rationale?.trim();
  if (rationale) {
    return rationale;
  }

  return undefined;
}

function hasNextStepContent(steps?: NextSteps): boolean {
  if (!steps) {
    return false;
  }

  return Boolean(
    steps.simulations?.length ||
    steps.microlearnings?.length ||
    steps.nudges?.length
  );
}

function formatDurationMinutes(duration?: number): string {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return 'N/A';
  }

  return `${duration} minutes`;
}

function deriveTrainingLevelFromAnalysis(report?: ContentGenerationReport): LevelDecision {
  const raw = getCurrentBehavioralStage(report);
  if (!raw) {
    const level = pickRandomItem(TRAINING_LEVELS);
    return {
      level,
      reasoning: `No resilience assessment available — assigned "${level}" as default.`,
    };
  }

  const normalized = raw.toLowerCase();
  if (normalized.includes('foundational') || normalized.includes('building') || normalized.includes('low') || normalized.includes('beginner')) {
    return {
      level: 'Beginner',
      reasoning: `User resilience stage is "${raw}" — mapped to Beginner for foundational awareness content.`,
    };
  }
  if (normalized.includes('consistent') || normalized.includes('medium') || normalized.includes('intermediate')) {
    return {
      level: 'Intermediate',
      reasoning: `User resilience stage is "${raw}" — mapped to Intermediate for balanced content difficulty.`,
    };
  }
  if (normalized.includes('champion') || normalized.includes('high') || normalized.includes('advanced')) {
    return {
      level: 'Advanced',
      reasoning: `User resilience stage is "${raw}" — mapped to Advanced for complex scenarios and deep analysis.`,
    };
  }

  return {
    level: DEFAULT_TRAINING_LEVEL,
    reasoning: `User resilience stage "${raw}" not recognized — defaulting to ${DEFAULT_TRAINING_LEVEL}.`,
  };
}

/**
 * Build executive report from analysis data
 */
function getRecommendedNextSteps(report: ContentGenerationReport | undefined) {
  const directSteps = report?.recommended_next_steps;
  const aiSteps = report?.ai_recommended_next_steps;

  if (hasNextStepContent(directSteps)) {
    return directSteps;
  }

  if (hasNextStepContent(aiSteps)) {
    return aiSteps;
  }

  return directSteps ?? aiSteps ?? EMPTY_NEXT_STEPS;
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
  const references = report.references && Array.isArray(report.references) ? report.references.join(', ') : '';
  const currentStage = getCurrentBehavioralStage(report) || 'Unknown';
  const targetStage = getTargetBehavioralStage(report) || 'Unknown';
  const progressionHint = report.header?.progression_hint || 'N/A';
  const gartnerContext = report.maturity_mapping?.gartner_sbcp_context_only;

  return `**User Behavior Analysis Report**

**Current Stage:** ${currentStage}
**Department:** ${report.meta?.department || 'Unknown'}
**Target Stage:** ${targetStage}
**Progression Hint:** ${progressionHint}
**Strengths:** ${report.strengths?.join(', ') || 'None identified'}
**Growth Opportunities:** ${report.growth_opportunities?.join(', ') || 'None identified'}

**Maturity Level (Gartner SBCP):**
- **Current:** ${report.maturity_mapping?.gartner_sbcp?.current || gartnerContext?.label || 'Context only — not an individual rating'}
- **Next Target:** ${report.maturity_mapping?.gartner_sbcp?.next || gartnerContext?.description || 'Unknown'}
- **What It Takes:** ${report.maturity_mapping?.gartner_sbcp?.what_it_takes || gartnerContext?.what_it_takes || 'N/A'}

**Maturity Level (ENISA Security Culture):**
- **Current:** ${report.maturity_mapping?.enisa_security_culture?.current || 'Unknown'}
- **Next Target:** ${report.maturity_mapping?.enisa_security_culture?.next || 'Unknown'}
- **What It Takes:** ${report.maturity_mapping?.enisa_security_culture?.what_it_takes || 'N/A'}

**Recommended Simulation Strategy:**
${sim
      ? `- **Title:** ${sim.title}
- **Vector:** ${sim.vector}
- **Scenario Type:** ${sim.scenario_type}
- **Difficulty:** ${sim.difficulty}
- **Persuasion Tactic:** ${sim.persuasion_tactic}
- **Why This:** ${sim.why_this || sim.rationale || 'N/A'}
- **NIST Phish Scale:** Cue Difficulty: ${sim.nist_phish_scale?.cue_difficulty || 'N/A'}, Premise Alignment: ${sim.nist_phish_scale?.premise_alignment || 'N/A'}
- **Designed to Progress:** ${sim.designed_to_progress || 'N/A'}`
      : 'None'
    }

**Recommended Training Strategy:**
${ml
      ? `- **Title:** ${ml.title}
- **Objective:** ${ml.objective}
- **Duration:** ${formatDurationMinutes(ml.duration_min)}
- **Language:** ${toolResult.userInfo?.preferredLanguage || ml.language || 'en-gb'}
- **Rationale:** ${getRecommendationReason(ml) || 'N/A'}`
      : 'None'
    }

**Recommended Nudge Strategy:**
${nudge
      ? `- **Channel:** ${nudge.channel}
- **Message:** ${nudge.message}
- **Cadence:** ${nudge.cadence}
- **Rationale:** ${getRecommendationReason(nudge) || 'N/A'}`
      : 'None'
    }

**References (use in generation):**
${references || 'None provided'}`;
}

/**
 * Generate generic content (phishing + training) for group assignment
 * Uses group-topic-service to get topic + prompts
 */
export async function generateContentForGroup(
  actions: ContentGeneratableAction[],
  preferredLanguage: string | undefined,
  targetGroupResourceId: string | undefined,
  actionBatchResourceIds?: ActionBatchResourceIds
): Promise<GenerationResults> {
  const logger = getLogger('GenerateContentForGroup');
  const userId = targetGroupResourceId || Date.now();
  let phishingResult: AutonomousActionResult | undefined;
  let trainingResult: AutonomousActionResult | undefined;
  let smishingResult: AutonomousActionResult | undefined;

  // STEP 1: Select topic + get prompts from service
  logger.info('Selecting unified topic for group training', { groupId: userId });
  const topicSelection = await selectGroupTrainingTopic(preferredLanguage);
  const { topic, phishingPrompt, smishingPrompt, trainingPrompt, objectives } = topicSelection;
  logger.info('🎯 Using topic for both phishing & training', { topic, objectivesCount: objectives.length });

  const runTimestamp = Date.now();
  const generationPromises: Promise<void>[] = [];
  const groupTrainingLevel = pickRandomItem(TRAINING_LEVELS);

  // Generate phishing with selected topic + prompt
  if (actions.includes('phishing')) {
    const groupDifficulty = pickRandomItem(PHISHING.DIFFICULTY_LEVELS);
    const groupScenarioType = pickRandomItem(['CLICK_ONLY', 'DATA_SUBMISSION'] as const);
    const groupPhishingSimulation = {
      title: `Group Phishing Simulation: ${topic}`,
      difficulty: groupDifficulty,
      scenario_type: groupScenarioType,
      vector: 'EMAIL',
      persuasion_tactic: 'Topic-focused attack',
      rationale: `Group-level awareness training focused on: ${topic}`,
    };

    const phishingThreadId = buildThreadId('phishing', userId, runTimestamp, true);

    logger.info('Generating phishing simulation', {
      groupId: userId,
      topic,
      language: preferredLanguage,
      threadId: phishingThreadId,
    });

    generationPromises.push(
      runWithActionBatchContext('phishing', actionBatchResourceIds, () =>
        generatePhishingSimulationForGroup(
          groupPhishingSimulation,
          phishingPrompt, // custom topic-based prompt from group-topic-service
          preferredLanguage,
          phishingThreadId,
          userId as string | number
        )
      )
        .then(result => {
          phishingResult = result;
        })
        .catch(error => {
          logger.error('Phishing generation failed (GROUP)', { error: normalizeError(error).message });
          phishingResult = createErrorResult(error, 'phishing-group');
        })
    );
  }

  if (actions.includes('smishing')) {
    const groupSmishingSimulation = {
      title: `Group Smishing Simulation: ${topic}`,
      difficulty: pickRandomItem(SMISHING.DIFFICULTY_LEVELS),
      scenario_type: pickRandomItem(['CLICK_ONLY', 'DATA_SUBMISSION'] as const),
      persuasion_tactic: 'Topic-focused SMS attack',
      rationale: `Group-level smishing awareness training focused on: ${topic}`,
    };

    logger.info('Generating smishing simulation', {
      groupId: userId,
      topic,
      language: preferredLanguage,
    });

    generationPromises.push(
      runWithActionBatchContext('smishing', actionBatchResourceIds, () =>
        generateSmishingSimulation({
          simulation: groupSmishingSimulation,
          executiveReport: smishingPrompt,
          toolResult: {
            userInfo: { preferredLanguage },
          },
          targetGroupResourceId: userId as string | number,
        })
      )
        .then(result => {
          smishingResult = result;
        })
        .catch(error => {
          logger.error('Smishing generation failed (GROUP)', { error: normalizeError(error).message });
          smishingResult = createErrorResult(error, 'smishing-group');
        })
    );
  }

  // Generate training with same topic + prompt
  if (actions.includes('training')) {
    const groupMicrolearning = {
      title: `Group Security Training: ${topic}`,
      objective: `Build comprehensive awareness on ${topic}`,
      rationale: `Group-level training aligned with phishing simulation on: ${topic}`,
    };

    const trainingThreadId = buildThreadId('training', userId, runTimestamp, true);

    logger.info('Generating training module', {
      groupId: userId,
      topic,
      language: preferredLanguage,
      threadId: trainingThreadId,
    });

    generationPromises.push(
      runWithActionBatchContext('training', actionBatchResourceIds, () =>
        generateTrainingModuleForGroup(
          groupMicrolearning,
          trainingPrompt, // custom topic-based prompt from group-topic-service
          preferredLanguage,
          trainingThreadId,
          userId as string | number,
          groupTrainingLevel
        )
      )
        .then(result => {
          trainingResult = result;
        })
        .catch(error => {
          logger.error('Training generation failed (GROUP)', { error: normalizeError(error).message });
          trainingResult = createErrorResult(error, 'training-group');
        })
    );
  }

  // STEP 2: Execute phishing & training in PARALLEL (both use same topic)
  if (generationPromises.length > 0) {
    logger.info('🚀 Executing phishing & training in parallel', { topic });
    await Promise.all(generationPromises);
  }

  return { phishingResult, trainingResult, smishingResult };
}

/**
 * Generate content (phishing + training) for user assignment
 */
export async function generateContentForUser(
  toolResult: AutonomousToolResult,
  executiveReport: string | undefined,
  actions: AutonomousAction[],
  sendAfterPhishingSimulation: boolean | undefined,
  userId: string | number,
  phishingThreadId: string,
  trainingThreadId: string,
  refinementContext?: RefinementContext,
  actionBatchResourceIds?: ActionBatchResourceIds
): Promise<GenerationResults> {
  const logger = getLogger('GenerateContentForUser');
  let phishingResult: AutonomousActionResult | undefined;
  let trainingResult: AutonomousActionResult | undefined;
  let smishingResult: AutonomousActionResult | undefined;
  let vishingCallResult: AutonomousActionResult | undefined;
  const generationPromises: Promise<void>[] = [];

  // Determine upload modes based on sendAfterPhishingSimulation
  const uploadOnly = sendAfterPhishingSimulation === true;

  const recommendedSteps = getRecommendedNextSteps(toolResult.analysisReport);
  const levelDecision = deriveTrainingLevelFromAnalysis(toolResult.analysisReport);
  const trainingLevel = levelDecision.level;
  logger.info('Training level determined', { level: trainingLevel, reasoning: levelDecision.reasoning });

  // Generate phishing if requested and simulation available
  if (actions.includes('phishing') && recommendedSteps.simulations?.[0]) {
    const simulation = recommendedSteps.simulations[0];
    logger.debug('Starting phishing generation', { simulation: simulation.title, uploadOnly });
    generationPromises.push(
      runWithActionBatchContext('phishing', actionBatchResourceIds, () =>
        generatePhishingSimulation(
          simulation,
          executiveReport,
          toolResult,
          phishingThreadId,
          uploadOnly,
          refinementContext?.phishingInstruction
        )
      )
        .then(result => {
          logger.info('Phishing generation result received', {
            success: result?.success,
            resultKeys: Object.keys(result || {}),
            hasUploadAssignResult: !!result?.uploadAssignResult,
          });
          phishingResult = result;
        })
        .catch(error => {
          logger.error('Phishing generation failed', { error: normalizeError(error).message });
          phishingResult = createErrorResult(error, 'phishing-user');
        })
    );
  } else if (actions.includes('phishing')) {
    logger.warn('Skipping phishing generation: simulation recommendation is missing');
    phishingResult = createMissingRecommendationResult('phishing');
  }

  if (actions.includes('smishing') && recommendedSteps.simulations?.[0]) {
    const simulation = recommendedSteps.simulations[0];
    logger.debug('Starting smishing generation', { simulation: simulation.title });
    generationPromises.push(
      runWithActionBatchContext('smishing', actionBatchResourceIds, () =>
        generateSmishingSimulation({
          simulation,
          executiveReport,
          toolResult,
          rejectionFeedback: refinementContext?.smishingInstruction,
        })
      )
        .then(result => {
          logger.info('Smishing generation result received', {
            success: result?.success,
            resultKeys: Object.keys(result || {}),
            hasUploadAssignResult: !!result?.uploadAssignResult,
          });
          smishingResult = result;
        })
        .catch(error => {
          logger.error('Smishing generation failed', { error: normalizeError(error).message });
          smishingResult = createErrorResult(error, 'smishing-user');
        })
    );
  } else if (actions.includes('smishing')) {
    logger.warn('Skipping smishing generation: simulation recommendation is missing');
    smishingResult = createMissingRecommendationResult('smishing');
  }

  // Vishing-call: outbound voice simulation (user assignment only, requires phone)
  if (actions.includes('vishing-call')) {
    const phoneNumber = toolResult.userInfo?.phoneNumber?.trim();
    if (!phoneNumber) {
      logger.warn('Skipping vishing-call: user has no phone number');
      vishingCallResult = { success: false, error: 'User has no phone number' };
    } else {
      generationPromises.push(
        initiateAutonomousVishingCall({
          toNumber: phoneNumber,
          executiveReport,
          toolResult,
        })
          .then(result => {
            logger.info('Vishing-call result received', { success: result?.success });
            vishingCallResult = result;
          })
          .catch(error => {
            logger.error('Vishing-call failed', { error: normalizeError(error).message });
            vishingCallResult = createErrorResult(error, 'vishing-call');
          })
      );
    }
  }

  // Generate training if requested and training available
  if (actions.includes('training') && recommendedSteps.microlearnings?.[0]) {
    const microlearning = recommendedSteps.microlearnings[0];
    logger.info('Starting training generation', { microlearning: microlearning.title, uploadOnly });
    generationPromises.push(
      runWithActionBatchContext('training', actionBatchResourceIds, () =>
        generateTrainingModule(
          microlearning,
          executiveReport,
          toolResult,
          trainingThreadId,
          uploadOnly,
          false,
          trainingLevel,
          refinementContext?.trainingInstruction,
          levelDecision.reasoning
        )
      )
        .then(result => {
          logger.info('Training generation result received', {
            success: result?.success,
            resultKeys: Object.keys(result || {}),
            hasData: !!result?.data,
            hasUploadAssignResult: !!result?.uploadAssignResult,
          });
          trainingResult = result;
        })
        .catch(error => {
          logger.error('Training generation failed', { error: normalizeError(error).message });
          trainingResult = createErrorResult(error, 'training-user');
        })
    );
  } else if (actions.includes('training')) {
    logger.warn('Skipping training generation: microlearning recommendation is missing');
    trainingResult = createMissingRecommendationResult('training');
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
      uploadAssignResultKeys: trainingResult?.uploadAssignResult ? Object.keys(trainingResult.uploadAssignResult) : [],
    });

    const phishingUploadResult = phishingResult?.uploadResult;
    const phishingResourceId = phishingUploadResult?.data?.resourceId;
    const phishingLanguageId = phishingUploadResult?.data?.languageId;
    const phishingIsQuishing = phishingUploadResult?.data?.isQuishing;

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
      source: trainingId ? (trainingResult?.data?.resourceId ? 'data' : 'uploadAssignResult') : 'NOT_FOUND',
    });

    if (!trainingId) {
      logger.warn('Cannot assign phishing with training: trainingId not found', {
        trainingResult: JSON.stringify(trainingResult, null, 2),
      });
    } else {
      // Derive contentCategory from phishing simulation metadata
      const phishingSim = recommendedSteps.simulations?.[0];
      const phishingContentCategory = phishingSim ? buildContentCategory(phishingSim) : '';

      const assignResult = await runWithActionBatchContext('phishing', actionBatchResourceIds, () =>
        assignPhishingWithTraining(
          String(userId),
          phishingThreadId,
          trainingId,
          sendTrainingLanguageId,
          phishingResourceId,
          phishingLanguageId,
          phishingIsQuishing,
          phishingContentCategory
        )
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

  return { phishingResult, trainingResult, smishingResult, vishingCallResult };
}
