import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { errorService } from '../../services/error-service';
import { ERROR_MESSAGES } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { getRequestContext } from '../../utils/core/request-storage';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { validateToolResult } from '../../utils/tool-result-validation';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import { isSafeId } from '../../utils/core/id-utils';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';
import { uuidv4 } from '../../utils/core/id-utils';

interface GroupSearchDeps {
  token: string;
  companyId?: string;
  baseApiUrl?: string;
  logger: ReturnType<typeof getLogger>;
}

const MIN_GROUP_NAME_LENGTH = 3;
const GROUP_LOOKUP_TIMEOUT_MS = 15000;

const getTargetGroupInfoOutputSchema = z.object({
  success: z.boolean(),
  groupInfo: z
    .object({
      targetGroupResourceId: z.string(),
      groupName: z.string().optional(),
      departmentName: z.string().optional(),
      memberCount: z.number().optional(),
    })
    .optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

const GROUP_ID_FIELDS = ['targetGroupResourceId', 'groupId', 'id', 'resourceId', 'groupResourceId'] as const;
const GROUP_NAME_FIELDS = ['groupName', 'name', 'title'] as const;
const GROUP_DEPARTMENT_FIELDS = ['departmentName', 'department', 'dept'] as const;
const GROUP_MEMBER_COUNT_FIELDS = ['memberCount', 'size', 'members', 'userCount'] as const;

function extractStringField(record: Record<string, unknown>, fields: readonly string[]): string | undefined {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function extractGroupId(record: Record<string, unknown>): string | undefined {
  for (const field of GROUP_ID_FIELDS) {
    const value = record[field];
    if (value !== undefined && value !== null) {
      const normalized = String(value).trim();
      if (normalized) {
        return normalized;
      }
    }
  }
  return undefined;
}

function extractGroupName(record: Record<string, unknown>): string | undefined {
  return extractStringField(record, GROUP_NAME_FIELDS);
}

function extractGroupDepartment(record: Record<string, unknown>): string | undefined {
  return extractStringField(record, GROUP_DEPARTMENT_FIELDS);
}

function extractMemberCount(record: Record<string, unknown>): number | undefined {
  for (const field of GROUP_MEMBER_COUNT_FIELDS) {
    const value = record[field];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

const GROUP_SEARCH_PAYLOAD_TEMPLATE = {
  pageNumber: 1,
  pageSize: 10,
  orderBy: 'CreateTime',
  ascending: false,
  filter: {
    Condition: 'AND',
    SearchInputTextValue: '',
    FilterGroups: [
      {
        Condition: 'AND',
        FilterItems: [],
        FilterGroups: [],
      },
      {
        Condition: 'OR',
        FilterItems: [],
        FilterGroups: [],
      },
    ],
  },
  systemGeneratedGroups: true,
} as const;

function createGroupSearchPayload(groupName: string) {
  const payload = JSON.parse(JSON.stringify(GROUP_SEARCH_PAYLOAD_TEMPLATE));
  const filterItems = [
    { FieldName: 'Name', Operator: 'Contains', Value: groupName },
    { FieldName: 'Priority', Operator: 'Contains', Value: groupName },
  ];
  payload.filter.FilterGroups[1].FilterItems = filterItems;
  return payload;
}

async function fetchGroupsWithFilters(deps: GroupSearchDeps, groupName: string): Promise<Record<string, unknown>[]> {
  const { token, companyId, baseApiUrl, logger } = deps;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (companyId) {
    headers['x-ir-company-id'] = companyId;
  }

  const payload = createGroupSearchPayload(groupName);

  // Build search URL dynamically from baseApiUrl (defaults to test environment)
  const groupSearchUrl = `${baseApiUrl || 'https://test-api.devkeepnet.com'}/api/target-groups/search`;

  const response = await withRetry(
    () =>
      withTimeout(
        fetch(groupSearchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }),
        GROUP_LOOKUP_TIMEOUT_MS
      ),
    `Target group search: "${groupName}"`
  );

  if (!response.ok) {
    const errorInfo = errorService.external(ERROR_MESSAGES.GROUP_INFO.FETCH_FAILED, {
      service: 'group-search',
      status: response.status,
    });
    logErrorInfo(logger, 'error', 'Group search API failed', errorInfo);
    throw new Error(errorInfo.message);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'group-search-json-parse',
      stack: err.stack,
    });
    logErrorInfo(logger, 'warn', 'Group search response JSON parse failed', errorInfo);
    return [];
  }

  const r = result as Record<string, unknown> | undefined;
  const data = (r?.data as Record<string, unknown> | undefined) ?? undefined;

  const candidates = [data?.results, data?.items, r?.results, r?.items];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as Record<string, unknown>[];
  }

  return [];
}

function pickBestGroup(groups: Record<string, unknown>[], normalizedGroupName: string) {
  const normalizedSearch = normalizedGroupName.toLowerCase();
  const exactMatch = groups.find(group => {
    const candidateName = extractGroupName(group);
    return typeof candidateName === 'string' && candidateName.toLowerCase() === normalizedSearch;
  });
  return exactMatch || groups[0];
}

export const getTargetGroupInfoTool = createTool({
  id: 'get-target-group-info',
  description:
    'Resolves a target group resource ID (and department) by searching the platform when only a group name is known.',
  inputSchema: z
    .object({
      targetGroupResourceId: z
        .string()
        .optional()
        .describe('Direct group ID (skips search step, faster). Use if ID is already known.'),
      groupName: z
        .string()
        .optional()
        .describe('Group display name (e.g., "IT Department") used to search for the ID.'),
      departmentName: z.string().optional().describe('Optional department hint to attach to the resolved group.'),
    })
    .refine(data => Boolean(data.targetGroupResourceId) || Boolean(data.groupName?.trim()), {
      message: 'Provide targetGroupResourceId OR a valid groupName.',
    }),
  outputSchema: getTargetGroupInfoOutputSchema,
  execute: async ({ context, writer }) => {
    const logger = getLogger('GetTargetGroupInfoTool');
    const { targetGroupResourceId: providedId, groupName: rawGroupName, departmentName: providedDepartment } = context;
    const { token, companyId, baseApiUrl } = getRequestContext();

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.GROUP_INFO.TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    const emitResult = async (groupInfo: {
      targetGroupResourceId: string;
      groupName?: string;
      departmentName?: string;
      memberCount?: number;
    }) => {
      const toolResult = {
        success: true,
        groupInfo,
        message: formatToolSummary({
          prefix: '✅ Group resolved',
          title: groupInfo.groupName || groupInfo.targetGroupResourceId,
          kv: [
            { key: 'targetGroupResourceId', value: groupInfo.targetGroupResourceId },
            { key: 'departmentName', value: groupInfo.departmentName },
            { key: 'memberCount', value: groupInfo.memberCount },
          ],
        }),
      };

      // EMIT UI SIGNAL FOR GROUP (SURGICAL)
      if (writer) {
        try {
          const messageId = uuidv4();
          const meta = {
            targetGroupResourceId: groupInfo.targetGroupResourceId,
            groupName: groupInfo.groupName,
            memberCount: groupInfo.memberCount,
          };
          const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

          await writer.write({ type: 'text-start', id: messageId });
          await writer.write({
            type: 'text-delta',
            id: messageId,
            delta: `::ui:target_group::${encoded}::/ui:target_group::\n`,
          });
          await writer.write({ type: 'text-end', id: messageId });
        } catch (emitErr) {
          const err = normalizeError(emitErr);
          const errorInfo = errorService.external(err.message, { step: 'emit-ui-signal-group', stack: err.stack });
          logErrorInfo(logger, 'warn', 'Failed to emit UI signal for group', errorInfo);
        }
      }

      const validationResult = validateToolResult(toolResult, getTargetGroupInfoOutputSchema, 'get-target-group-info');
      if (!validationResult.success) {
        logErrorInfo(logger, 'error', 'Group info validation failed', validationResult.error);
        return createToolErrorResponse(validationResult.error);
      }

      return validationResult.data;
    };

    if (providedId) {
      logger.info('Target group ID provided, skipping search', { targetGroupResourceId: providedId });
      const normalizedId = String(providedId).trim();
      if (!isSafeId(normalizedId)) {
        const errorInfo = errorService.validation('Invalid targetGroupResourceId format.', {
          field: 'targetGroupResourceId',
        });
        logErrorInfo(logger, 'warn', 'Validation error: invalid provided group ID', errorInfo);
        return createToolErrorResponse(errorInfo);
      }
      return emitResult({
        targetGroupResourceId: normalizedId,
        groupName: rawGroupName?.trim(),
        departmentName: providedDepartment?.trim(),
      });
    }

    const normalizedGroupName = String(rawGroupName || '').trim();

    if (normalizedGroupName.length < MIN_GROUP_NAME_LENGTH) {
      const errorInfo = errorService.validation('Group name must be at least 3 characters long.', {
        field: 'groupName',
      });
      logErrorInfo(logger, 'warn', 'Validation error: groupName too short', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    try {
      const trySearch = async (name: string) => fetchGroupsWithFilters({ token, companyId, baseApiUrl, logger }, name);

      // Level 1: full search string
      let groups = await trySearch(normalizedGroupName);

      // Level 2: strip common suffixes/prefixes ("group", "grup", "ekip") and retry
      if (groups.length === 0) {
        const simplified = normalizedGroupName
          .replace(/\b(group|grup|ekip|department|departman)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (simplified && simplified.length >= MIN_GROUP_NAME_LENGTH && simplified !== normalizedGroupName) {
          logger.info('⚠️ No groups found; retrying with simplified group name', {
            original: normalizedGroupName,
            simplified,
          });
          groups = await trySearch(simplified);
        }
      }

      if (groups.length === 0) {
        const errorInfo = errorService.notFound(ERROR_MESSAGES.GROUP_INFO.NOT_FOUND, {
          resourceType: 'groupName',
          resourceId: normalizedGroupName,
        });
        logErrorInfo(logger, 'warn', 'Group not found', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const selectedGroup = pickBestGroup(groups, normalizedGroupName);
      const resolvedId = extractGroupId(selectedGroup);
      if (!resolvedId) {
        const errorInfo = errorService.notFound('Group record missing ID after search', {
          resourceType: 'group',
          resourceId: normalizedGroupName,
        });
        logErrorInfo(logger, 'warn', 'Group search result missing ID', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const groupInfo = {
        targetGroupResourceId: resolvedId,
        groupName: extractGroupName(selectedGroup) || normalizedGroupName,
        departmentName: extractGroupDepartment(selectedGroup) || providedDepartment?.trim(),
        memberCount: extractMemberCount(selectedGroup),
      };

      logger.info('Group metadata resolved via search', { groupInfo });
      return emitResult(groupInfo);
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(ERROR_MESSAGES.GROUP_INFO.FETCH_FAILED, { error: err.message });
      logErrorInfo(logger, 'error', 'Group lookup failed', errorInfo);
      return createToolErrorResponse(errorInfo);
    }
  },
});
