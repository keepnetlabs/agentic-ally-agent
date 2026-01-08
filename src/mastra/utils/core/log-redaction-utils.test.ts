import { describe, expect, it } from 'vitest';
import { summarizeForLog } from './log-redaction-utils';

describe('summarizeForLog', () => {
  it('summarizes strings with length', () => {
    const out = summarizeForLog('hello');
    expect(out.type).toBe('string');
    expect(out.length).toBe(5);
    expect(out.preview).toBeUndefined();
  });

  it('summarizes objects with keys (capped)', () => {
    const out = summarizeForLog({ a: 1, b: 2 }, { maxKeys: 1 });
    expect(out.type).toBe('object');
    expect(out.keys).toEqual(['a']);
    expect(out.count).toBe(2);
  });

  it('summarizes arrays with count', () => {
    const out = summarizeForLog([1, 2, 3]);
    expect(out.type).toBe('array');
    expect(out.count).toBe(3);
  });
});


