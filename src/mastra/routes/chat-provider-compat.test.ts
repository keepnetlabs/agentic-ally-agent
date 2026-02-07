import { describe, expect, it } from 'vitest';
import { ModelProvider } from '../model-providers';
import { resolveEffectiveProvider, shouldMapAssistantHistoryAsUser } from './chat-provider-compat';

describe('chat-provider-compat', () => {
  it('falls back to workers-ai when provider/model is missing', () => {
    expect(resolveEffectiveProvider(undefined, undefined)).toBe(ModelProvider.WORKERS_AI);
    expect(resolveEffectiveProvider('openai', undefined)).toBe(ModelProvider.WORKERS_AI);
  });

  it('resolves valid openai override as effective provider', () => {
    expect(resolveEffectiveProvider('openai', 'gpt-4o-mini')).toBe(ModelProvider.OPENAI);
  });

  it('normalizes enum-like provider/model inputs', () => {
    expect(resolveEffectiveProvider('WORKERS_AI', 'WORKERS_AI_GPT_OSS_120B')).toBe(ModelProvider.WORKERS_AI);
  });

  it('falls back to workers-ai when provider is invalid', () => {
    expect(resolveEffectiveProvider('unknown-provider', 'gpt-4o')).toBe(ModelProvider.WORKERS_AI);
  });

  it('falls back to workers-ai when model is invalid', () => {
    expect(resolveEffectiveProvider('openai', 'unknown-model')).toBe(ModelProvider.WORKERS_AI);
  });

  it('maps assistant history for workers-ai effective provider', () => {
    expect(shouldMapAssistantHistoryAsUser()).toBe(true);
    expect(shouldMapAssistantHistoryAsUser('workers-ai', '@cf/openai/gpt-oss-120b')).toBe(true);
  });

  it('does not map assistant history for valid non-workers provider', () => {
    expect(shouldMapAssistantHistoryAsUser('openai', 'gpt-4o-mini')).toBe(false);
  });
});
