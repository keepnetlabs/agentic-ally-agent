import { describe, it, expect } from 'vitest';
import { getExplainabilityReasoning } from './explainability';

describe('getExplainabilityReasoning', () => {
  it('returns reasoning string when explainability.reasoning exists', () => {
    const data = {
      explainability: {
        reasoning: 'User showed phishing vulnerability in recent assessment.',
        keyFactors: [],
        generatedAt: '2026-01-01T00:00:00.000Z',
        version: '1.0',
      },
    };
    expect(getExplainabilityReasoning(data)).toBe('User showed phishing vulnerability in recent assessment.');
  });

  it('returns undefined when explainability is missing', () => {
    const data = { name: 'Test', topic: 'Security' };
    expect(getExplainabilityReasoning(data)).toBeUndefined();
  });

  it('returns undefined when reasoning field is missing from explainability', () => {
    const data = {
      explainability: {
        keyFactors: ['Authority', 'Urgency'],
        generatedAt: '2026-01-01T00:00:00.000Z',
        version: '1.0',
      },
    };
    expect(getExplainabilityReasoning(data)).toBeUndefined();
  });

  it('returns undefined for null input', () => {
    expect(getExplainabilityReasoning(null)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(getExplainabilityReasoning(undefined)).toBeUndefined();
  });

  it('returns undefined for non-object input', () => {
    expect(getExplainabilityReasoning('string')).toBeUndefined();
    expect(getExplainabilityReasoning(42)).toBeUndefined();
  });
});
