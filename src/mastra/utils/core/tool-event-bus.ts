/**
 * Tool Event Bus — Inter-tool data passing within a single request lifecycle.
 *
 * Lightweight key-value store scoped to the current AsyncLocalStorage context.
 * Upload tools write data, assign tools read it — no LLM dependency, no extra KV/D1.
 *
 * Usage:
 *   // Upload tool (writer):
 *   toolEventBus.set('explainabilityReasoning', reasoning);
 *
 *   // Assign tool (reader):
 *   const reasoning = toolEventBus.get<string>('explainabilityReasoning');
 */

import { requestStorage } from './request-storage';

function getBus(): Map<string, unknown> {
  const store = requestStorage.getStore();
  if (!store) return new Map();

  if (!store.__toolEventBus) {
    store.__toolEventBus = new Map<string, unknown>();
  }
  return store.__toolEventBus;
}

export const toolEventBus = {
  set(key: string, value: unknown): void {
    getBus().set(key, value);
  },

  get<T = unknown>(key: string): T | undefined {
    return getBus().get(key) as T | undefined;
  },

  has(key: string): boolean {
    return getBus().has(key);
  },
};
