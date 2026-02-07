/**
 * Endpoints intentionally exposed without X-AGENTIC-ALLY-TOKEN.
 * These MUST be protected by stricter validation and rate limiting.
 */
export const PUBLIC_UNAUTHENTICATED_ENDPOINTS = [
  '/autonomous',
  '/code-review-validate',
  '/vishing/prompt',
  '/smishing/chat',
  '/email-ir/analyze',
] as const;

/**
 * Internal/system endpoints that bypass auth for platform/runtime needs.
 */
export const INTERNAL_AUTH_SKIP_ENDPOINTS = [
  '/health',
  '/__refresh',
  '/__hot-reload-status',
  '/api/telemetry',
] as const;

export const SKIP_AUTH_PATHS = [
  ...INTERNAL_AUTH_SKIP_ENDPOINTS,
  ...PUBLIC_UNAUTHENTICATED_ENDPOINTS,
] as const;

export function isPublicUnauthenticatedPath(path: string): boolean {
  return PUBLIC_UNAUTHENTICATED_ENDPOINTS.includes(
    path as (typeof PUBLIC_UNAUTHENTICATED_ENDPOINTS)[number]
  );
}

