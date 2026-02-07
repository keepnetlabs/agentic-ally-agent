import { describe, expect, it } from 'vitest';
import {
  INTERNAL_AUTH_SKIP_ENDPOINTS,
  PUBLIC_UNAUTHENTICATED_ENDPOINTS,
  SKIP_AUTH_PATHS,
  isPublicUnauthenticatedPath,
} from './public-endpoint-policy';

describe('public-endpoint-policy', () => {
  it('contains expected public unauthenticated endpoints', () => {
    expect(PUBLIC_UNAUTHENTICATED_ENDPOINTS).toContain('/autonomous');
    expect(PUBLIC_UNAUTHENTICATED_ENDPOINTS).toContain('/code-review-validate');
    expect(PUBLIC_UNAUTHENTICATED_ENDPOINTS).toContain('/vishing/prompt');
    expect(PUBLIC_UNAUTHENTICATED_ENDPOINTS).toContain('/smishing/chat');
    expect(PUBLIC_UNAUTHENTICATED_ENDPOINTS).toContain('/email-ir/analyze');
  });

  it('contains expected internal auth-skip endpoints', () => {
    expect(INTERNAL_AUTH_SKIP_ENDPOINTS).toContain('/health');
    expect(INTERNAL_AUTH_SKIP_ENDPOINTS).toContain('/__refresh');
    expect(INTERNAL_AUTH_SKIP_ENDPOINTS).toContain('/__hot-reload-status');
    expect(INTERNAL_AUTH_SKIP_ENDPOINTS).toContain('/api/telemetry');
  });

  it('SKIP_AUTH_PATHS includes all public and internal skip endpoints', () => {
    for (const path of PUBLIC_UNAUTHENTICATED_ENDPOINTS) {
      expect(SKIP_AUTH_PATHS).toContain(path);
    }
    for (const path of INTERNAL_AUTH_SKIP_ENDPOINTS) {
      expect(SKIP_AUTH_PATHS).toContain(path);
    }
  });

  it('has no duplicate entries in SKIP_AUTH_PATHS', () => {
    const unique = new Set(SKIP_AUTH_PATHS);
    expect(unique.size).toBe(SKIP_AUTH_PATHS.length);
  });

  it('isPublicUnauthenticatedPath returns true only for public unauthenticated endpoints', () => {
    for (const path of PUBLIC_UNAUTHENTICATED_ENDPOINTS) {
      expect(isPublicUnauthenticatedPath(path)).toBe(true);
    }

    for (const path of INTERNAL_AUTH_SKIP_ENDPOINTS) {
      expect(isPublicUnauthenticatedPath(path)).toBe(false);
    }

    expect(isPublicUnauthenticatedPath('/chat')).toBe(false);
    expect(isPublicUnauthenticatedPath('/unknown')).toBe(false);
  });
});

