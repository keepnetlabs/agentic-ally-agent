/**
 * Group Assignment Fan-Out Utility
 *
 * When a group is targeted for assignment, this utility fetches all members
 * and calls the worker API individually for each user (the backend no longer
 * accepts group-level assignment).
 *
 * Partial failure handling: Promise.allSettled per chunk so one user's failure
 * never blocks others.
 */

import { z } from 'zod';
import { getLogger } from './logger';
import { fetchGroupMembers } from './group-members';
import { resolveBaseApiUrl } from './url-validator';
import { MAX_GROUP_ASSIGN_USERS } from '../../constants';
import type { AgenticActivitiesPayload, WorkerSendResponse } from './worker-api-client';

const logger = getLogger('GroupAssignment');

const DEFAULT_CONCURRENCY = 25;
const MAX_FAILED_USERS_REPORTED = 50;

export interface FanOutResult {
  totalUsers: number;
  succeeded: number;
  failed: number;
  failedUsers: Array<{ resourceId: string; error: string }>;
  /** True when group size exceeds maxUsers limit. No assignments were attempted. */
  limitExceeded?: boolean;
}

export const groupResultSchema = z.object({
  totalUsers: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  failedUsers: z.array(z.object({ resourceId: z.string(), error: z.string() })),
  limitExceeded: z.boolean().optional(),
});

export interface FanOutGroupAssignmentOptions {
  token: string;
  groupResourceId: string;
  baseApiUrl?: string;
  /** Build a per-user payload. Called once for each group member. */
  buildPayload: (userResourceId: string) => AgenticActivitiesPayload;
  /** Execute the API call for a single user. Caller wraps withRetry if desired. */
  callApi: (payload: AgenticActivitiesPayload) => Promise<WorkerSendResponse>;
  /** Max concurrent API calls per chunk (default 25). */
  concurrency?: number;
  /** Max users allowed. Defaults to MAX_GROUP_ASSIGN_USERS from constants.ts. */
  maxUsers?: number;
}

/**
 * Fan-out a group assignment to individual per-user API calls.
 *
 * 1. Fetches all active members via fetchGroupMembers()
 * 2. Processes in chunks of `concurrency` using Promise.allSettled
 * 3. Returns aggregated result with partial failure details
 */
export async function fanOutGroupAssignment(opts: FanOutGroupAssignmentOptions): Promise<FanOutResult> {
  const { token, groupResourceId, buildPayload, callApi, concurrency = DEFAULT_CONCURRENCY, maxUsers = MAX_GROUP_ASSIGN_USERS } = opts;
  const resolvedApiUrl = resolveBaseApiUrl(opts.baseApiUrl);

  const members = await fetchGroupMembers(token, groupResourceId, resolvedApiUrl);

  if (members.length === 0) {
    logger.warn('fan_out_empty_group', { groupResourceId });
    return { totalUsers: 0, succeeded: 0, failed: 0, failedUsers: [] };
  }

  if (members.length > maxUsers) {
    logger.warn('fan_out_max_users_exceeded', { groupResourceId, totalUsers: members.length, maxUsers });
    return {
      totalUsers: members.length,
      succeeded: 0,
      failed: 0,
      failedUsers: [],
      limitExceeded: true,
    };
  }

  logger.info('fan_out_started', {
    groupResourceId,
    totalUsers: members.length,
    concurrency,
    estimatedChunks: Math.ceil(members.length / concurrency),
  });

  let succeeded = 0;
  let failed = 0;
  const failedUsers: Array<{ resourceId: string; error: string }> = [];

  for (let i = 0; i < members.length; i += concurrency) {
    const chunk = members.slice(i, i + concurrency);
    const chunkIndex = Math.floor(i / concurrency) + 1;

    const results = await Promise.allSettled(
      chunk.map(async member => {
        const payload = buildPayload(member.resourceId);
        await callApi(payload);
        return member.resourceId;
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        succeeded++;
      } else {
        failed++;
        if (failedUsers.length < MAX_FAILED_USERS_REPORTED) {
          failedUsers.push({
            resourceId: chunk[j].resourceId,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    }

    logger.debug('fan_out_chunk_complete', {
      chunkIndex,
      chunkSize: chunk.length,
      succeeded,
      failed,
      remaining: members.length - (i + chunk.length),
    });
  }

  logger.info('fan_out_complete', {
    groupResourceId,
    totalUsers: members.length,
    succeeded,
    failed,
  });

  return { totalUsers: members.length, succeeded, failed, failedUsers };
}
