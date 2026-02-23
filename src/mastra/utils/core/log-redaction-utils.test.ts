import { describe, expect, it } from 'vitest';
import { summarizeForLog } from './log-redaction-utils';

describe('summarizeForLog', () => {
  describe('Primitive Types', () => {
    it('handles null', () => {
      const out = summarizeForLog(null);
      expect(out.type).toBe('null');
    });

    it('handles undefined', () => {
      const out = summarizeForLog(undefined);
      expect(out.type).toBe('undefined');
    });

    it('handles numbers', () => {
      const out = summarizeForLog(123);
      expect(out.type).toBe('number');
    });

    it('handles booleans', () => {
      const out = summarizeForLog(true);
      expect(out.type).toBe('boolean');
    });
  });

  describe('Strings', () => {
    it('summarizes strings with length', () => {
      const out = summarizeForLog('hello');
      expect(out.type).toBe('string');
      expect(out.length).toBe(5);
      expect(out.preview).toBeUndefined();
    });

    it('provides preview when requested', () => {
      const out = summarizeForLog('hello world', { maxStringPreview: 5 });
      expect(out.type).toBe('string');
      expect(out.length).toBe(11);
      expect(out.preview).toBe('hello');
    });

    it('does not crash on empty strings', () => {
      const out = summarizeForLog('');
      expect(out.type).toBe('string');
      expect(out.length).toBe(0);
    });

    it('does not add preview for empty string even when maxStringPreview > 0', () => {
      const out = summarizeForLog('', { maxStringPreview: 5 });
      expect(out.type).toBe('string');
      expect(out.length).toBe(0);
      expect(out.preview).toBeUndefined();
    });

    it('preview truncates at maxStringPreview', () => {
      const out = summarizeForLog('hello world', { maxStringPreview: 3 });
      expect(out.preview).toBe('hel');
    });
  });

  describe('Arrays', () => {
    it('summarizes arrays with count', () => {
      const out = summarizeForLog([1, 2, 3]);
      expect(out.type).toBe('array');
      expect(out.count).toBe(3);
    });

    it('handles empty arrays', () => {
      const out = summarizeForLog([]);
      expect(out.type).toBe('array');
      expect(out.count).toBe(0);
    });

    it('handles large arrays', () => {
      const largeArray = new Array(1000).fill(0);
      const out = summarizeForLog(largeArray);
      expect(out.type).toBe('array');
      expect(out.count).toBe(1000);
    });
  });

  describe('Objects', () => {
    it('summarizes objects with keys (capped defaults)', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const out = summarizeForLog(obj);
      expect(out.type).toBe('object');
      expect(out.keys).toEqual(['a', 'b', 'c']);
      expect(out.count).toBe(3);
    });

    it('respects maxKeys option', () => {
      const out = summarizeForLog({ a: 1, b: 2, c: 3 }, { maxKeys: 1 });
      expect(out.type).toBe('object');
      expect(out.keys).toEqual(['a']);
      expect(out.count).toBe(3);
    });

    it('handles objects with many keys', () => {
      const obj: Record<string, number> = {};
      for (let i = 0; i < 50; i++) obj[`key${i}`] = i;

      const out = summarizeForLog(obj); // default maxKeys=20
      expect(out.type).toBe('object');
      expect(out.keys?.length).toBe(20);
      expect(out.count).toBe(50);
    });
  });

  describe('Robustness', () => {
    it('handles errors gracefully (e.g. proxy trap errors)', () => {
      // Simulating an object that throws when keys are accessed is hard without Proxy
      const throwingProxy = new Proxy(
        {},
        {
          ownKeys: () => {
            throw new Error('trap error');
          },
        }
      );

      const out = summarizeForLog(throwingProxy);
      // The utility catches errors and returns type: 'unknown'
      expect(out.type).toBe('unknown');
    });

    it('handles circular references safely (standard object keys ignore values)', () => {
      // Object.keys does not traverse values, so circular refs in values are fine
      const circle: any = { a: 1 };
      circle.b = circle;

      const out = summarizeForLog(circle);
      expect(out.type).toBe('object');
      expect(out.keys).toContain('a');
      expect(out.keys).toContain('b');
      // No crash
    });
  });
});
