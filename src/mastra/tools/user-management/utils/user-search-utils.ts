import { normalizeError, logErrorInfo } from '../../../utils/core/error-utils';
import { errorService } from '../../../services/error-service';
import { withRetry } from '../../../utils/core/resilience-utils';
import { PlatformUser } from '../user-management-types';

/** API response shape: get-all returns items or data.results. */
interface UserSearchApiResponse {
    items?: PlatformUser[];
    data?: { results?: PlatformUser[] };
}

/** Expected shape of GET_ALL payload template (filter.FilterGroups[0].FilterItems). */
interface GetAllPayloadShape {
    filter?: {
        FilterGroups?: Array<{ FilterItems?: unknown[] }>;
    };
}

/** Filter item for user search API (e.g. email Equals, targetUserResourceId Equals). */
export interface UserSearchFilterItem {
    Value: string;
    FieldName: string;
    Operator: string;
}

/** Dependencies for user search: auth token, optional companyId/baseApiUrl, logger. */
export interface UserSearchDeps {
    token: string;
    companyId?: string;
    baseApiUrl?: string;
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

/**
 * Fetches users with filters. Uses primary (leaderboard/get-all), then fallback (target-users/search) if empty.
 *
 * @param deps - Token, companyId, baseApiUrl, logger
 * @param getAllPayloadTemplate - Payload template with filter structure
 * @param filterItems - Filters to append (e.g. email Equals, targetUserResourceId Equals)
 * @returns Array of PlatformUser (may be empty)
 */
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
    const payload = JSON.parse(JSON.stringify(getAllPayloadTemplate)) as GetAllPayloadShape;
    const filterGroup = payload?.filter?.FilterGroups?.[0];
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
        logErrorInfo(logger, 'error', 'User search API failed', errorInfo);
        // Throwing the extracted message so it propagates up
        throw new Error(detailedMessage);
    }

    const data = (await resp.json()) as UserSearchApiResponse | null;
    const primaryItems = data?.items ?? data?.data?.results ?? [];
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
        const fallbackData = (await fallbackResp.json()) as UserSearchApiResponse | null;
        logger.info('Fallback user search response', { fallbackData });
        return fallbackData?.items ?? fallbackData?.data?.results ?? [];
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('Fallback user search error', { error: err.message });
        return [];
    }
}

/** If direct lookup returns a phone, merge it into the search result; otherwise leave base unchanged. */
function mergePhoneFromEnriched(base: PlatformUser, enriched: PlatformUser | null): PlatformUser | null {
    if (enriched?.phoneNumber) return { ...base, phoneNumber: enriched.phoneNumber };
    return null;
}

/** Attempts to enrich base with phone from direct lookup. Retries once on transient failures. Returns merged user if successful, null on failure (caller should return base). */
async function tryEnrichWithPhone(
    base: PlatformUser,
    deps: UserSearchDeps,
    resourceId: string,
    logContext: Record<string, unknown>
): Promise<PlatformUser | null> {
    try {
        const enriched = await withRetry(
            () => fetchUserByIdDirect(deps, resourceId),
            'phone_enrichment_direct_lookup',
            { maxAttempts: 2 }
        );
        return mergePhoneFromEnriched(base, enriched);
    } catch (err) {
        deps.logger.warn('Phone enrichment failed, returning user without phone', {
            ...logContext,
            error: (err as Error).message,
        });
        return null;
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
        logErrorInfo(logger, 'error', 'User lookup API failed', errorInfo);
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
        phoneNumber: String(data.phoneNumber || data.mobilePhone || data.phone || ''),
        department: data.department,
        departmentName: data.department,
        preferredLanguage: data.preferredLanguageId,
        role: data.priority,
    };
}

/**
 * Finds a user by email. Uses primary search (get-all), then fallback (target-users/search).
 * If found but phoneNumber is missing, enriches via direct lookup and merges phone into the result.
 *
 * @param deps - Token, logger, baseApiUrl
 * @param getAllPayloadTemplate - Payload template for leaderboard/get-all
 * @param email - Email to search (normalized to lowercase)
 * @returns PlatformUser or null if not found
 */
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
            // If phone is missing, enrich via direct lookup (has phone normalization)
            if (!exact.phoneNumber && exact.targetUserResourceId) {
                deps.logger.info('User found by email but phoneNumber missing, enriching via direct lookup', {
                    email: normalizedEmail,
                    targetUserResourceId: exact.targetUserResourceId,
                });
                const merged = await tryEnrichWithPhone(exact, deps, String(exact.targetUserResourceId), {
                    email: normalizedEmail,
                    targetUserResourceId: exact.targetUserResourceId,
                });
                if (merged) return merged;
            }
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
        // If phone is missing from fallback result, enrich via direct lookup
        if (!fallbackExact.phoneNumber && fallbackExact.targetUserResourceId) {
            deps.logger.info('User found by email via fallback but phoneNumber missing, enriching via direct lookup', {
                email: normalizedEmail,
                targetUserResourceId: fallbackExact.targetUserResourceId,
            });
            const merged = await tryEnrichWithPhone(fallbackExact, deps, String(fallbackExact.targetUserResourceId), {
                email: normalizedEmail,
                targetUserResourceId: fallbackExact.targetUserResourceId,
            });
            if (merged) return merged;
        }
        deps.logger.info('User found by email via fallback search', {
            email: normalizedEmail,
            userId: fallbackExact.targetUserResourceId
        });
        return fallbackExact;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search by email failed', { error: err.message });
        logErrorInfo(deps.logger, 'error', 'User search error', errorInfo);
        // Preserve original error message for higher-level handlers/tests (e.g., "Network error")
        throw new Error(err.message);
    }
}

/**
 * Finds a user by targetUserResourceId. Uses primary search, then fallback, then direct GET.
 * If found via search but phoneNumber is missing, enriches via direct lookup and merges phone.
 *
 * @param deps - Token, logger, baseApiUrl
 * @param getAllPayloadTemplate - Payload template for leaderboard/get-all
 * @param targetUserResourceId - User ID to search
 * @returns PlatformUser or null if not found
 */
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
            // If phone is missing, enrich via direct lookup (has phone normalization)
            if (!exact.phoneNumber) {
                deps.logger.info('User found by ID but phoneNumber missing, enriching via direct lookup', {
                    targetUserResourceId: normalizedId,
                });
                const merged = await tryEnrichWithPhone(exact, deps, normalizedId, { targetUserResourceId: normalizedId });
                if (merged) return merged;
            }
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
        // If phone is missing from fallback result, enrich via direct lookup
        if (!fallbackExact.phoneNumber) {
            deps.logger.info('User found by ID via fallback but phoneNumber missing, enriching via direct lookup', {
                targetUserResourceId: normalizedId,
            });
            const merged = await tryEnrichWithPhone(fallbackExact, deps, normalizedId, { targetUserResourceId: normalizedId });
            if (merged) return merged;
        }
        deps.logger.info('User found by ID via fallback search', { targetUserResourceId: normalizedId });
        return fallbackExact;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search by ID failed', { error: err.message });
        logErrorInfo(deps.logger, 'error', 'User search error', errorInfo);
        throw new Error(err.message);
    }
}

/**
 * Finds a user by first/last name with fallbacks: full name → last token only → first name only.
 * If found but phoneNumber is missing, enriches via direct lookup and merges phone.
 *
 * @param deps - Token, logger, baseApiUrl
 * @param getAllPayloadTemplate - Payload template for leaderboard/get-all
 * @param firstName - First name (required)
 * @param lastName - Last name (optional; supports "De Luca" → retry with "Luca")
 * @param fullNameForLogs - Display name for logging (defaults to "firstName lastName")
 * @returns PlatformUser or null if not found
 */
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

        if (!result.phoneNumber && result.targetUserResourceId) {
            deps.logger.info('User found by name but phoneNumber missing, enriching via direct lookup', {
                name: fullName,
                targetUserResourceId: result.targetUserResourceId,
            });
            const merged = await tryEnrichWithPhone(result, deps, String(result.targetUserResourceId), {
                name: fullName,
                targetUserResourceId: result.targetUserResourceId,
            });
            if (merged) return merged;
        }

        deps.logger.info('User found by name search', { name: fullName, userId: result.targetUserResourceId });
        return result;
    } catch (error) {
        const err = normalizeError(error);
        const errorInfo = errorService.external('User search failed', { error: err.message });
        logErrorInfo(deps.logger, 'error', 'User search error', errorInfo);
        // Preserve original error message for higher-level handlers/tests (e.g., "Network error")
        throw new Error(err.message);
    }
}


