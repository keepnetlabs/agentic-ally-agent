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
    logger.info('User search headers', { headers });
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
    const getUserAllUrl = `${baseApiUrl || 'https://test-api.devkeepnet.com'}/api/leaderboard/get-all`;
    const resp = await fetch(getUserAllUrl, {
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
    return data?.items || data?.data?.results || [];
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
        if (!exact) {
            deps.logger.info('No exact user found by email', { email: normalizedEmail, candidateCount: users.length });
            return null;
        }
        deps.logger.info('User found by email', { email: normalizedEmail, userId: exact.targetUserResourceId });
        return exact;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search by email failed', { error: err.message });
        logErrorInfo(deps.logger as any, 'error', 'User search error', errorInfo);
        // Preserve original error message for higher-level handlers/tests (e.g., "Network error")
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


