// src/mastra/utils/core/group-members.ts
import { getLogger } from './logger';

export interface GroupMember {
  resourceId: string;
  firstName: string;
  lastName: string;
  department?: string;
  email?: string;
  preferredLanguage?: string;
  phoneNumber?: string;
}

/**
 * Fetch all members of a target group via platform API (paginated).
 *
 * Endpoint: POST /api/target-groups/{groupResourceId}/users
 * Paginates automatically until all users are fetched.
 *
 * @param token - JWT access token
 * @param groupResourceId - Target group resource ID
 * @param baseApiUrl - Platform API base URL
 * @param pageSize - Users per page (default 100 for efficiency)
 * @returns Array of group members
 */
export async function fetchGroupMembers(
  token: string,
  groupResourceId: string,
  baseApiUrl: string,
  pageSize = 1000
): Promise<GroupMember[]> {
  const logger = getLogger('FetchGroupMembers');
  const allMembers: GroupMember[] = [];
  let pageNumber = 1;
  let totalPages = 1;

  const MAX_PAGES = 100; // Safety cap: 100 pages × 1000 users = 100,000 max

  logger.info('group_members_fetch_started', { groupResourceId, baseApiUrl });

  do {
    const payload = {
      pageNumber,
      pageSize,
      orderBy: 'CreateTime',
      ascending: false,
      filter: {
        Condition: 'AND',
        SearchInputTextValue: '',
        FilterGroups: [
          { Condition: 'AND', FilterItems: [], FilterGroups: [] },
          { Condition: 'OR', FilterItems: [], FilterGroups: [] },
        ],
      },
      excludeGroupUsers: false,
    };

    const response = await fetch(`${baseApiUrl}/api/target-groups/${groupResourceId}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.error('group_members_fetch_failed', {
        groupResourceId,
        pageNumber,
        status: response.status,
        statusText: response.statusText,
        errorBody: errorBody.slice(0, 500),
      });
      throw new Error(`Failed to fetch group members: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as {
      data?: {
        totalNumberOfPages?: number;
        totalNumberOfRecords?: number;
        results?: Array<{
          resourceId: string;
          firstName: string;
          lastName: string;
          department?: string;
          email?: string;
          preferredLanguage?: string;
          phoneNumber?: string;
          status?: string;
        }>;
      };
    };

    const users = result.data?.results || [];
    totalPages = result.data?.totalNumberOfPages || 1;

    // Only include active users
    for (const user of users) {
      if (user.status !== 'Active' && user.status !== undefined) continue;
      allMembers.push({
        resourceId: user.resourceId,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department || undefined,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        phoneNumber: user.phoneNumber,
      });
    }

    logger.debug('Fetched page', {
      pageNumber,
      totalPages,
      usersInPage: users.length,
      totalSoFar: allMembers.length,
    });

    pageNumber++;
  } while (pageNumber <= totalPages && pageNumber <= MAX_PAGES);

  if (allMembers.length === 0) {
    logger.warn('group_members_empty', { groupResourceId, totalPagesScanned: pageNumber - 1 });
  } else {
    logger.info('group_members_fetch_complete', {
      groupResourceId,
      totalMembers: allMembers.length,
      totalPagesScanned: pageNumber - 1,
    });
  }

  return allMembers;
}

/**
 * Fetch a single page of group members (for workflow step-by-step processing).
 * Returns the users for that page + pagination metadata.
 */
export async function fetchGroupMembersPage(
  token: string,
  groupResourceId: string,
  baseApiUrl: string,
  pageNumber: number,
  pageSize = 1000,
): Promise<{ users: GroupMember[]; totalPages: number; totalRecords: number }> {
  const logger = getLogger('FetchGroupMembersPage');

  const payload = {
    pageNumber,
    pageSize,
    orderBy: 'CreateTime',
    ascending: false,
    filter: {
      Condition: 'AND',
      SearchInputTextValue: '',
      FilterGroups: [
        { Condition: 'AND', FilterItems: [], FilterGroups: [] },
        { Condition: 'OR', FilterItems: [], FilterGroups: [] },
      ],
    },
    excludeGroupUsers: false,
  };

  const response = await fetch(`${baseApiUrl}/api/target-groups/${groupResourceId}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('group_members_page_fetch_failed', {
      groupResourceId,
      pageNumber,
      status: response.status,
      errorBody: errorBody.slice(0, 500),
    });
    throw new Error(`Failed to fetch group members page ${pageNumber}: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as {
    data?: {
      totalNumberOfPages?: number;
      totalNumberOfRecords?: number;
      results?: Array<{
        resourceId: string;
        firstName: string;
        lastName: string;
        department?: string;
        email?: string;
        preferredLanguage?: string;
        phoneNumber?: string;
        status?: string;
      }>;
    };
  };

  const rawUsers = result.data?.results || [];
  const users: GroupMember[] = [];
  for (const user of rawUsers) {
    if (user.status !== 'Active' && user.status !== undefined) continue;
    users.push({
      resourceId: user.resourceId,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department || undefined,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      phoneNumber: user.phoneNumber,
    });
  }

  return {
    users,
    totalPages: result.data?.totalNumberOfPages || 1,
    totalRecords: result.data?.totalNumberOfRecords || 0,
  };
}
