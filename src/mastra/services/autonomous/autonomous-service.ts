// src/mastra/services/autonomous/autonomous-service.ts
import { getUserInfoTool } from '../../tools/user-management';
import { requestStorage, getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../error-service';
import { resolveBaseApiUrl } from '../../utils/core/url-validator';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';
// generateBatchId removed — each assign tool generates its own batchResourceId when threadId is undefined
import {
  AutonomousRequest,
  AutonomousResponse,
  getGroupEligibleActions,
} from '../../types/autonomous-types';
import { buildExecutiveReport, generateContentForUser, generateContentForGroup } from './autonomous-content-generators';
import { buildThreadId } from './autonomous-handler-utils';
import { buildRefinementContext } from '../rejection-refinement-service';

/**
 * Autonomous service - Executes user/group analysis and generates training/phishing content
 */
export async function executeAutonomousGeneration(request: AutonomousRequest): Promise<AutonomousResponse> {
  const logger = getLogger('ExecuteAutonomousGeneration');
  const generationStartMs = Date.now();
  const {
    token,
    companyId: requestCompanyId,
    actionBatchResourceIds,
    firstName,
    lastName,
    targetUserResourceId,
    targetGroupResourceId,
    departmentName,
    actions,
    sendAfterPhishingSimulation,
    preferredLanguage,
    baseApiUrl,
    batchResourceId,
    rejectingReason,
    rejectedScenarioResourceId,
  } = request;

  const effectiveBaseApiUrl = resolveBaseApiUrl(baseApiUrl);
  // Determine assignment type
  const isUserAssignment = !!(firstName || targetUserResourceId);
  const isGroupAssignment = !!targetGroupResourceId;

  if (!isUserAssignment && !isGroupAssignment) {
    logger.error('Invalid assignment: neither user nor group specified');
    return { success: false, error: 'Must specify either user or group assignment', actions };
  }

  try {
    // Standard flow: if batchResourceId is provided, all actions share the same batch.
    // Batch fan-out flow can override this with actionBatchResourceIds so each action keeps its own batchResourceId.
    const hasActionBatchResourceIds = Boolean(actionBatchResourceIds && Object.keys(actionBatchResourceIds).length > 0);
    const threadId = hasActionBatchResourceIds ? undefined : (batchResourceId || undefined);
    const existingCtx = getRequestContext();
    const companyId = requestCompanyId || existingCtx?.companyId || extractCompanyIdFromTokenExport(token);
    // Merge env: prefer request.env (from Workflow binding), fallback to existing context env
    const resolvedEnv = (request.env as Record<string, unknown>) || existingCtx?.env;
    return await requestStorage.run(
      { token, baseApiUrl: effectiveBaseApiUrl, threadId, companyId, env: resolvedEnv },
      async (): Promise<AutonomousResponse> => {
        // USER ASSIGNMENT: Get user info and generate personalized content
        if (isUserAssignment) {
          logger.info('USER ASSIGNMENT: Analyzing user behavior');

          if (!getUserInfoTool.execute) {
            return { success: false, error: 'getUserInfoTool not executable', actions };
          }

          // Fast path (direct ID) or slow path (name search)
          const toolContext = targetUserResourceId ? { targetUserResourceId, departmentName } : { firstName, lastName };

          // v1: execute now takes (inputData, context)
          const toolResult = await getUserInfoTool.execute(toolContext, {});
          logger.debug('Tool result retrieved', { toolResult });

          // v1: Check for ValidationError or failure
          if (('error' in toolResult && toolResult.error) || !toolResult.success) {
            const errorMsg = ('error' in toolResult && toolResult.error) ? String(toolResult.error) : 'User info retrieval failed';
            return { success: false, error: errorMsg, actions };
          }

          // Override preferredLanguage if provided
          if (preferredLanguage && toolResult.userInfo) {
            toolResult.userInfo.preferredLanguage = preferredLanguage;
          }

          const runTimestamp = Date.now();
          const userId = toolResult.userInfo?.targetUserResourceId || runTimestamp;
          const executiveReport = buildExecutiveReport(toolResult);

          // CRITICAL: Append timestamp to thread IDs to ensure UNIQUE memory context per run
          // This prevents "pollution" from previous runs and prevents the agent from hallucinating based on old history
          const phishingThreadId = buildThreadId('phishing', userId, runTimestamp);
          const trainingThreadId = buildThreadId('training', userId, runTimestamp);

          const { env } = getRequestContext();
          const needsRefinement = actions.some(a => a === 'phishing' || a === 'training' || a === 'smishing');
          const refinementContext =
            rejectingReason && rejectedScenarioResourceId && needsRefinement
              ? (await buildRefinementContext({
                  rejectedScenarioResourceId,
                  rejectingReason,
                  actions,
                  userDepartment: toolResult.userInfo?.department,
                  env,
                })) ?? undefined
              : undefined;

          const { phishingResult, trainingResult, smishingResult, vishingCallResult } =
            await generateContentForUser(
              toolResult,
              executiveReport,
              actions,
              sendAfterPhishingSimulation,
              userId,
              phishingThreadId,
              trainingThreadId,
              refinementContext,
              actionBatchResourceIds
            );

          const generationDurationMs = Date.now() - generationStartMs;
          logger.info('metric_generation_duration', {
            metric: 'generation_duration_ms',
            generation_duration_ms: generationDurationMs,
            path: '/autonomous',
            assignmentType: 'user',
            userId,
          });
          logger.info('✅ Autonomous service completed successfully', {
            assignmentType: 'user',
            userId,
            phishingSuccess: phishingResult?.success,
            trainingSuccess: trainingResult?.success,
            smishingSuccess: smishingResult?.success,
            vishingCallSuccess: vishingCallResult?.success,
          });

          const resolvedTargetUserResourceId = toolResult.userInfo?.targetUserResourceId ?? String(userId);

          return {
            success: true,
            userInfo: toolResult.userInfo && {
              ...toolResult.userInfo,
              targetUserResourceId: resolvedTargetUserResourceId,
            },
            recentActivities: toolResult.recentActivities,
            analysisReport: toolResult.analysisReport,
            executiveReport,
            phishingResult,
            trainingResult,
            smishingResult,
            vishingCallResult,
            actions,
            message: `User analysis and content generation completed`,
          };
        } else if (isGroupAssignment) {
          // GROUP ASSIGNMENT: Generate generic content for bulk assignment
          // vishing-call requires user phone; skip for groups
          const groupActions = getGroupEligibleActions(actions);
          logger.info('GROUP ASSIGNMENT: Generating generic content for group', { targetGroupResourceId });

          const { phishingResult, trainingResult, smishingResult } = await generateContentForGroup(
            groupActions,
            preferredLanguage,
            targetGroupResourceId,
            actionBatchResourceIds
          );

          const generationDurationMs = Date.now() - generationStartMs;
          logger.info('metric_generation_duration', {
            metric: 'generation_duration_ms',
            generation_duration_ms: generationDurationMs,
            path: '/autonomous',
            assignmentType: 'group',
            targetGroupResourceId,
          });
          logger.info('✅ Autonomous service completed successfully', {
            assignmentType: 'group',
            targetGroupResourceId,
            phishingSuccess: phishingResult?.success,
            trainingSuccess: trainingResult?.success,
            smishingSuccess: smishingResult?.success,
          });

          return {
            success: true,
            phishingResult,
            trainingResult,
            smishingResult,
            actions,
            message: `Generic content generated for group ${targetGroupResourceId}`,
          };
        }

        // Fallback (should never reach here due to validation)
        return {
          success: false,
          error: 'Invalid assignment type',
          actions,
        };
      }
    );
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'execute-autonomous-generation',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'Autonomous service error', errorInfo);
    return { success: false, error: err.message, actions };
  }
}
