/**
 * Pure helpers from rejection-refinement-service (no D1 / LLM).
 */
import { describe, it, expect } from 'vitest';
import { buildOriginalContentSummary, parseRefinementOutput } from './rejection-refinement-service';

describe('rejection-refinement-service (pure)', () => {
  describe('buildOriginalContentSummary', () => {
    it('joins non-null metadata fields with newlines', () => {
      const s = buildOriginalContentSummary({
        content_type: 'phishing',
        scenario: 'CEO fraud',
        tactic: 'Authority',
        difficulty: 'Hard',
        scenario_type: 'email',
        reasoning: 'User prefers finance themes',
      });
      expect(s).toContain('Type: phishing');
      expect(s).toContain('Title/Topic: "CEO fraud"');
      expect(s).toContain('Tactic: Authority');
      expect(s).toContain('Difficulty: Hard');
      expect(s).toContain('Scenario type: email');
      expect(s).toContain('AI reasoning: "User prefers finance themes"');
    });

    it('returns empty string when all fields null', () => {
      expect(
        buildOriginalContentSummary({
          content_type: null,
          scenario: null,
          tactic: null,
          difficulty: null,
          scenario_type: null,
          reasoning: null,
        })
      ).toBe('');
    });
  });

  describe('parseRefinementOutput', () => {
    it('parses plain JSON object', () => {
      const raw = JSON.stringify({
        phishingInstruction: 'Use softer tone',
        trainingInstruction: null,
      });
      const out = parseRefinementOutput(raw);
      expect(out).toEqual({
        phishingInstruction: 'Use softer tone',
        trainingInstruction: null,
      });
    });

    it('strips markdown json fences', () => {
      const raw = '```json\n{"smishingInstruction": "Shorten SMS"}\n```';
      expect(parseRefinementOutput(raw)).toEqual({ smishingInstruction: 'Shorten SMS' });
    });

    it('returns null for invalid JSON', () => {
      expect(parseRefinementOutput('not json')).toBeNull();
    });

    it('returns null when object has no instruction keys', () => {
      expect(parseRefinementOutput('{"foo": "bar"}')).toBeNull();
    });
  });
});
