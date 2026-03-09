/**
 * Lookup Resolver
 *
 * Resolves display names to resource IDs for industry/license filters,
 * and license module IDs to display names for company details.
 *
 * Uses module-level in-memory cache — first call hits API, subsequent calls
 * return cached data (cache lives for the process lifetime).
 *
 * Exports:
 * - resolveLookupFilters: Auto-resolves text → ID in searchCompanies filters
 * - resolveLookupIds: Resolves generic lookup IDs → names
 * - resolveLicenseModuleIds: Resolves license module IDs → names (separate endpoint)
 */
import { withRetry } from '../../utils/core/resilience-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { LOOKUP_TYPE_IDS } from '../../agents/customer-service/cs-constants';

const logger = getLogger('LookupResolver');

// ============================================
// IN-MEMORY CACHE
// ============================================

interface LookupItem {
  id: string;
  name: string;
}

/** Module-level cache keyed by genericCodeTypeId */
const lookupCache = new Map<number, LookupItem[]>();

/** Module-level cache for license modules (from /api/lookups/licenses) */
let licenseModulesCache: LookupItem[] | null = null;

// ============================================
// SHARED: Fetch & cache lookup data
// ============================================

/**
 * Ensures lookup data for given typeIds is cached.
 * Returns true if successful, false if API call failed.
 */
async function ensureLookupCached(typeIds: number[], token: string, apiUrl: string): Promise<boolean> {
  const uncachedTypeIds = typeIds.filter(id => !lookupCache.has(id));
  if (uncachedTypeIds.length === 0) return true;

  try {
    const response = await withRetry(
      async () =>
        fetch(`${apiUrl}/api/lookups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ typeidlist: uncachedTypeIds }),
        }),
      'get-lookup-data'
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('lookup_api_error', { status: response.status, errorText });
      return false;
    }

    const result = await response.json();
    const items: Array<{ resourceId: string; name: string; genericCodeTypeId: number }> =
      result.data || result || [];

    for (const typeId of uncachedTypeIds) {
      const filtered = items
        .filter(item => item.genericCodeTypeId === typeId)
        .map(item => ({ id: item.resourceId, name: item.name }));
      lookupCache.set(typeId, filtered);
    }

    return true;
  } catch (error) {
    const err = normalizeError(error);
    logger.error('lookup_error', { error: err.message });
    return false;
  }
}

/**
 * Find a lookup item by name (case-insensitive).
 * Tries exact match first, then partial/contains match.
 */
function findLookupByName(typeId: number, name: string): LookupItem | undefined {
  const items = lookupCache.get(typeId) || [];
  const lower = name.toLowerCase();

  // Exact match first
  const exact = items.find(item => item.name.toLowerCase() === lower);
  if (exact) return exact;

  // Partial/contains match
  return items.find(item => item.name.toLowerCase().includes(lower) || lower.includes(item.name.toLowerCase()));
}

// ============================================
// EXPORTED: Auto-resolve filters for searchCompanies
// ============================================

/** Fields that need lookup resolution */
const LOOKUP_FIELDS: Record<string, number> = {
  IndustryResourceId: LOOKUP_TYPE_IDS.INDUSTRY,
  LicenseTypeResourceId: LOOKUP_TYPE_IDS.LICENSE_TYPE,
};

/**
 * Auto-resolves text values in IndustryResourceId/LicenseTypeResourceId filters to resourceIds.
 * If the value looks like a UUID, it's already resolved — skip it.
 * If it's a text name, fetch lookup data and resolve to ID.
 *
 * Mutates the filters array in-place for simplicity.
 */
export async function resolveLookupFilters(
  filters: Array<{ fieldName: string; operator: string; value: string }>,
  token: string,
  apiUrl: string
): Promise<void> {
  // Find which lookup types we need
  const neededTypeIds = new Set<number>();
  for (const filter of filters) {
    const typeId = LOOKUP_FIELDS[filter.fieldName];
    if (typeId && !isUUID(filter.value)) {
      neededTypeIds.add(typeId);
    }
  }

  if (neededTypeIds.size === 0) return;

  // Fetch lookup data
  const success = await ensureLookupCached([...neededTypeIds], token, apiUrl);
  if (!success) {
    logger.warn('lookup_resolve_failed', { message: 'Could not fetch lookup data, filters may not work correctly' });
    return;
  }

  // Resolve text values to IDs (supports comma-separated multiple values)
  for (const filter of filters) {
    const typeId = LOOKUP_FIELDS[filter.fieldName];
    if (!typeId) continue;

    const parts = filter.value.split(',').map(v => v.trim()).filter(Boolean);
    const resolvedIds: string[] = [];

    for (const part of parts) {
      if (isUUID(part)) {
        resolvedIds.push(part);
      } else {
        const match = findLookupByName(typeId, part);
        if (match) {
          logger.info('lookup_resolved', { from: part, to: match.id, name: match.name });
          resolvedIds.push(match.id);
        } else {
          logger.warn('lookup_no_match', { value: part, typeId });
        }
      }
    }

    if (resolvedIds.length > 0) {
      filter.value = resolvedIds.join(',');
      filter.operator = 'Include';
    }
  }
}

/**
 * Ensures license modules data is cached from GET /api/lookups/licenses.
 * Returns true if successful, false if API call failed.
 */
async function ensureLicenseModulesCached(token: string, apiUrl: string): Promise<boolean> {
  if (licenseModulesCache !== null) return true;

  try {
    const response = await withRetry(
      async () =>
        fetch(`${apiUrl}/api/lookups/licenses`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      'get-license-modules'
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('license_modules_api_error', { status: response.status, errorText });
      return false;
    }

    const result = await response.json();
    const allModules: Array<{ resourceId: string; name: string }> =
      result.data?.allLicenseModules || [];

    licenseModulesCache = allModules.map(m => ({ id: m.resourceId, name: m.name }));
    return true;
  } catch (error) {
    const err = normalizeError(error);
    logger.error('license_modules_error', { error: err.message });
    return false;
  }
}

/**
 * Resolves an array of resource IDs to their display names using cached lookup data.
 * Returns names for matched IDs, keeps original ID for unmatched ones.
 */
export async function resolveLookupIds(
  ids: string[],
  typeId: number,
  token: string,
  apiUrl: string
): Promise<string[]> {
  if (!ids || ids.length === 0) return [];

  const success = await ensureLookupCached([typeId], token, apiUrl);
  if (!success) return ids;

  const items = lookupCache.get(typeId) || [];
  return ids.map(id => {
    const match = items.find(item => item.id === id);
    return match ? match.name : id;
  });
}

/**
 * Resolves an array of license module resource IDs to their display names.
 * Uses GET /api/lookups/licenses endpoint (allLicenseModules array).
 * Returns names for matched IDs, keeps original ID for unmatched ones.
 */
export async function resolveLicenseModuleIds(
  ids: string[],
  token: string,
  apiUrl: string
): Promise<string[]> {
  if (!ids || ids.length === 0) return [];

  const success = await ensureLicenseModulesCached(token, apiUrl);
  if (!success) return ids;

  return ids.map(id => {
    const match = licenseModulesCache!.find(item => item.id === id);
    return match ? match.name : id;
  });
}

/** Simple UUID check — if it looks like a GUID, it's already an ID */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
