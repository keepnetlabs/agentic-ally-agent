import { normalizeError, logErrorInfo } from '../../../utils/core/error-utils';
import { errorService } from '../../../services/error-service';
import { PlatformUser } from '../user-management-types';

export interface UserSearchFilterItem {
    Value: string;
    FieldName: string;
    Operator: string;
}

export interface UserSearchDeps {
    token: string;
    companyId?: string;
    baseApiUrl?: string; // Dynamic API URL from request context
    logger: {
        info: (message: string, context?: Record<string, unknown>) => void;
        debug: (message: string, context?: Record<string, unknown>) => void;
        warn: (message: string, context?: Record<string, unknown>) => void;
        error: (message: string, context?: Record<string, unknown>) => void;
    };
}

function getTargetUsersSearchUrl(baseApiUrl?: string): string {
    return `${baseApiUrl || 'https://test-api.devkeepnet.com'}/api/target-users/search`;
}

function getUserAllUrl(baseApiUrl?: string): string {
    return `${baseApiUrl || 'https://test-api.devkeepnet.com'}/api/leaderboard/get-all`;
}

function getTargetUserByIdUrl(baseApiUrl: string | undefined, resourceId: string): string {
    return `${baseApiUrl || 'https://test-api.devkeepnet.com'}/api/target-users/${encodeURIComponent(resourceId)}`;
}

export async function fetchUsersWithFilters(
    deps: UserSearchDeps,
    getAllPayloadTemplate: unknown,
    filterItems: UserSearchFilterItem[]
): Promise<PlatformUser[]> {
    const { token, companyId, baseApiUrl, logger } = deps;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    if (companyId) headers['x-ir-company-id'] = companyId;
    const payload = JSON.parse(JSON.stringify(getAllPayloadTemplate));
    const filterGroup = (payload as any)?.filter?.FilterGroups?.[0];
    if (!filterGroup?.FilterItems) {
        const errorInfo = errorService.validation('Invalid GET_ALL payload template (missing filter group)', { step: 'fetchUsersWithFilters' });
        throw new Error(errorInfo.message);
    }
    for (const item of filterItems) {
        filterGroup.FilterItems.push(item);
    }

    // Build URL dynamically from baseApiUrl (defaults to test environment)
    const userAllUrl = getUserAllUrl(baseApiUrl);
    const resp = await fetch(userAllUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const errorText = await resp.text();
        logger.error('RAW BACKEND RESPONSE:', { status: resp.status, body: errorText });

        let detailedMessage = `User search API error: ${resp.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            // "Simulated company not found" or similar from backend
            if (errorJson?.message) {
                detailedMessage = errorJson.message;
            }
        } catch {
            // If not JSON, use the raw text if short, or default
            if (errorText.length < 100) detailedMessage += ` - ${errorText}`;
        }

        const errorInfo = errorService.external(detailedMessage, {
            status: resp.status,
            errorBody: errorText.substring(0, 1000)
        });
        logErrorInfo(logger as any, 'error', 'User search API failed', errorInfo);
        // Throwing the extracted message so it propagates up
        throw new Error(detailedMessage);
    }

    const data = await resp.json();
    const primaryItems = data?.items || data?.data?.results || [];
    if (primaryItems.length > 0) {
        return primaryItems;
    }

    // Fallback search endpoint if primary returns empty
    logger.info('Primary user search returned empty; attempting fallback search', {
        filterItemCount: filterItems.length
    });
    return fetchUsersFromFallback(deps, filterItems);
}

async function fetchUsersFromFallback(
    deps: UserSearchDeps,
    filterItems: UserSearchFilterItem[]
): Promise<PlatformUser[]> {
    const { token, companyId, baseApiUrl, logger } = deps;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    if (companyId) headers['x-ir-company-id'] = companyId;

    const payload = {
        pageNumber: 1,
        pageSize: 10,
        orderBy: '',
        ascending: false,
        filter: {
            Condition: 'AND',
            SearchInputTextValue: '',
            FilterGroups: [
                {
                    Condition: 'AND',
                    FilterItems: [
                        ...filterItems.map(item => ({
                            Value: item.Value,
                            FieldName: item.FieldName,
                            Operator: 'Equal'
                        })),
                        {
                            FieldName: 'Status',
                            Value: '1',
                            Operator: 'Include'
                        },
                        {
                            FieldName: 'IsDeleted',
                            Value: false,
                            Operator: 'Contains'
                        }
                    ],
                    FilterGroups: []
                },
                {
                    Condition: 'OR',
                    FilterItems: [],
                    FilterGroups: []
                }
            ]
        }
    };

    const fallbackUrl = getTargetUsersSearchUrl(baseApiUrl);
    logger.info('Attempting fallback user search', {
        fallbackUrl,
        payload
    });
    try {
        const fallbackResp = await fetch(fallbackUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!fallbackResp.ok) {
            const errorText = await fallbackResp.text();
            logger.warn('Fallback user search failed', {
                status: fallbackResp.status,
                error: errorText.substring(0, 200)
            });
            return [];
        }
        const fallbackData = await fallbackResp.json();
        logger.info('Fallback user search response', { fallbackData });
        return fallbackData?.items || fallbackData?.data?.results || [];
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('Fallback user search error', { error: err.message });
        return [];
    }
}

async function fetchUserByIdDirect(
    deps: UserSearchDeps,
    targetUserResourceId: string
): Promise<PlatformUser | null> {
    const { token, companyId, baseApiUrl, logger } = deps;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    if (companyId) headers['x-ir-company-id'] = companyId;

    const url = getTargetUserByIdUrl(baseApiUrl, targetUserResourceId);
    const resp = await fetch(url, { method: 'GET', headers });
    if (resp.status === 404) {
        return null;
    }
    if (!resp.ok) {
        const errorText = await resp.text();
        logger.error('RAW BACKEND RESPONSE:', { status: resp.status, body: errorText });

        let detailedMessage = `User lookup API error: ${resp.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson?.message) {
                detailedMessage = errorJson.message;
            }
        } catch {
            if (errorText.length < 100) detailedMessage += ` - ${errorText}`;
        }

        const errorInfo = errorService.external(detailedMessage, {
            status: resp.status,
            errorBody: errorText.substring(0, 1000)
        });
        logErrorInfo(logger as any, 'error', 'User lookup API failed', errorInfo);
        throw new Error(detailedMessage);
    }

    const payload = await resp.json();
    const data = payload?.data;
    if (!data) return null;

    return {
        targetUserResourceId: String(data.resourceId || targetUserResourceId),
        firstName: String(data.firstName || ''),
        lastName: String(data.lastName || ''),
        email: String(data.email || ''),
        department: data.department,
        departmentName: data.department,
        preferredLanguage: data.preferredLanguageId,
        role: data.priority,
    };
}

export async function findUserByEmail(
    deps: UserSearchDeps,
    getAllPayloadTemplate: unknown,
    email: string
): Promise<PlatformUser | null> {
    const normalizedEmail = String(email).trim().toLowerCase();

    try {
        const users = await fetchUsersWithFilters(deps, getAllPayloadTemplate, [
            { Value: normalizedEmail, FieldName: 'email', Operator: 'Equals' },
        ]);
        if (users.length === 0) return null;
        const exact = users.find(u => String(u?.email || '').toLowerCase() === normalizedEmail);
        if (exact) {
            deps.logger.info('User found by email', { email: normalizedEmail, userId: exact.targetUserResourceId });
            return exact;
        }

        deps.logger.info('No exact user found by email in primary search, trying fallback', {
            email: normalizedEmail,
            candidateCount: users.length
        });
        const fallbackUsers = await fetchUsersFromFallback(deps, [
            { Value: normalizedEmail, FieldName: 'email', Operator: 'Equals' },
        ]);
        const fallbackExact = fallbackUsers.find(u => String(u?.email || '').toLowerCase() === normalizedEmail);
        if (!fallbackExact) {
            deps.logger.info('No exact user found by email in fallback search', {
                email: normalizedEmail,
                candidateCount: fallbackUsers.length
            });
            return null;
        }
        deps.logger.info('User found by email via fallback search', {
            email: normalizedEmail,
            userId: fallbackExact.targetUserResourceId
        });
        return fallbackExact;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search by email failed', { error: err.message });
        logErrorInfo(deps.logger as any, 'error', 'User search error', errorInfo);
        // Preserve original error message for higher-level handlers/tests (e.g., "Network error")
        throw new Error(err.message);
    }
}

export async function findUserById(
    deps: UserSearchDeps,
    getAllPayloadTemplate: unknown,
    targetUserResourceId: string
): Promise<PlatformUser | null> {
    const normalizedId = String(targetUserResourceId).trim();

    try {
        const users = await fetchUsersWithFilters(deps, getAllPayloadTemplate, [
            { Value: normalizedId, FieldName: 'targetUserResourceId', Operator: 'Equals' },
        ]);
        if (users.length === 0) return null;
        const exact = users.find(u => String(u?.targetUserResourceId || '') === normalizedId);
        if (exact) {
            deps.logger.info('User found by ID', { targetUserResourceId: normalizedId });
            return exact;
        }

        deps.logger.info('No exact user found by ID in primary search, trying fallback', {
            targetUserResourceId: normalizedId,
            candidateCount: users.length
        });
        const fallbackUsers = await fetchUsersFromFallback(deps, [
            { Value: normalizedId, FieldName: 'targetUserResourceId', Operator: 'Equals' },
        ]);
        const fallbackExact = fallbackUsers.find(u => String(u?.targetUserResourceId || '') === normalizedId);
        if (!fallbackExact) {
            deps.logger.info('No exact user found by ID in fallback search', {
                targetUserResourceId: normalizedId,
                candidateCount: fallbackUsers.length
            });
            deps.logger.info('Fallback search failed; trying direct user lookup endpoint', {
                targetUserResourceId: normalizedId
            });
            const directUser = await fetchUserByIdDirect(deps, normalizedId);
            if (!directUser) {
                deps.logger.info('No user found by ID via direct lookup', { targetUserResourceId: normalizedId });
                return null;
            }
            deps.logger.info('User found by ID via direct lookup', { targetUserResourceId: normalizedId });
            return directUser;
        }
        deps.logger.info('User found by ID via fallback search', { targetUserResourceId: normalizedId });
        return fallbackExact;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search by ID failed', { error: err.message });
        logErrorInfo(deps.logger as any, 'error', 'User search error', errorInfo);
        throw new Error(err.message);
    }
}

export async function findUserByNameWithFallbacks(
    deps: UserSearchDeps,
    getAllPayloadTemplate: unknown,
    firstName: string,
    lastName?: string,
    fullNameForLogs?: string
): Promise<PlatformUser | null> {
    const fullName = fullNameForLogs || `${firstName}${lastName ? ` ${lastName}` : ''}`;

    const fetchByName = async (fName: string, lName?: string): Promise<PlatformUser[]> => {
        return fetchUsersWithFilters(deps, getAllPayloadTemplate, [
            { Value: fName, FieldName: 'firstName', Operator: 'Contains' },
            ...(lName ? [{ Value: lName, FieldName: 'lastName', Operator: 'Contains' }] : []),
        ]);
    };

    try {
        // Level 1: first + last (as provided)
        let users = await fetchByName(firstName, lastName);

        // Level 2: last token only (handles middle names)
        if (users.length === 0 && lastName && lastName.includes(' ')) {
            const lastToken = lastName.trim().split(/\s+/).slice(-1)[0];
            deps.logger.info('User search fallback: lastName has spaces; retrying with last token', { fullName, lastToken });
            users = await fetchByName(firstName, lastToken);
        }

        // Level 3: first only (broad)
        if (users.length === 0) {
            deps.logger.info('User search fallback: retrying with firstName only', { fullName, firstName });
            users = await fetchByName(firstName);
        }

        if (users.length === 0) {
            deps.logger.info('No user found by name search fallbacks', { name: fullName });
            return null;
        }

        const preferredLastToken = lastName?.trim().split(/\s+/).slice(-1)[0]?.toLowerCase();
        let result: PlatformUser;
        if (preferredLastToken) {
            const exact = users.find(u => String(u?.lastName || '').toLowerCase() === preferredLastToken);
            result = exact || users[0];
        } else {
            result = users[0];
        }

        deps.logger.info('User found by name search', { name: fullName, userId: result.targetUserResourceId });
        return result;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search failed', { error: err.message });
        logErrorInfo(deps.logger as any, 'error', 'User search error', errorInfo);
        // Preserve original error message for higher-level handlers/tests (e.g., "Network error")
        throw new Error(err.message);
    }
}


