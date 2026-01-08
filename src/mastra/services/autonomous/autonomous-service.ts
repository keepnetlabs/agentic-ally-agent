// src/mastra/services/autonomous/autonomous-service.ts
import { getUserInfoTool } from '../../tools/user-management';
import { requestStorage } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { AutonomousRequest, AutonomousResponse } from '../../types/autonomous-types';
import {
    buildExecutiveReport,
    generateContentForUser,
    generateContentForGroup,
} from './autonomous-content-generators';

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
                logger.debug('Tool result retrieved', { toolResult });
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

                const resolvedTargetUserResourceId =
                    toolResult.userInfo?.targetUserResourceId ?? String(userId);

                return {
                    success: true,
                    userInfo: toolResult.userInfo && {
                        ...toolResult.userInfo,
                        targetUserResourceId: resolvedTargetUserResourceId
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
