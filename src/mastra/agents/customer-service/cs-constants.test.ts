/**
 * CS routing config — same invariants as ROUTING in constants.test.ts (no drift).
 */
import { describe, it, expect } from 'vitest';
import {
  CS_AGENT_NAMES,
  CS_VALID_AGENTS,
  CS_DEFAULT_AGENT,
} from './cs-constants';

function assertUniqueNonEmpty(label: string, items: readonly string[]): void {
  expect(items.length, `${label}: empty`).toBeGreaterThan(0);
  for (const s of items) {
    expect(s.length, `${label}: empty string`).toBeGreaterThan(0);
    expect(s, `${label}: untrimmed`).toBe(s.trim());
  }
  expect(new Set(items).size, `${label}: duplicates`).toBe(items.length);
}

describe('cs-constants', () => {
  it('has unique non-empty CS_VALID_AGENTS', () => {
    assertUniqueNonEmpty('CS_VALID_AGENTS', [...CS_VALID_AGENTS]);
  });

  it('defaults to an agent that is in CS_VALID_AGENTS', () => {
    expect(CS_VALID_AGENTS).toContain(CS_DEFAULT_AGENT);
    expect(CS_DEFAULT_AGENT).toBe(CS_AGENT_NAMES.COMPANY_SEARCH);
  });

  it('lists report agent as routable', () => {
    expect(CS_VALID_AGENTS).toContain(CS_AGENT_NAMES.REPORT);
  });
});
