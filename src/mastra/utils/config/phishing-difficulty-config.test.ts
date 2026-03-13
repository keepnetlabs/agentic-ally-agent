import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CONFIG } from './phishing-difficulty-config';

describe('DIFFICULTY_CONFIG', () => {
  const levels = ['Easy', 'Medium', 'Hard'] as const;
  const expectedKeys = ['sender', 'grammar', 'urgency', 'visuals'] as const;

  it('should have Easy, Medium, and Hard levels', () => {
    expect(Object.keys(DIFFICULTY_CONFIG)).toEqual(expect.arrayContaining([...levels]));
  });

  it('should have sender, grammar, urgency, visuals for each level', () => {
    for (const level of levels) {
      const config = DIFFICULTY_CONFIG[level];
      for (const key of expectedKeys) {
        expect(config).toHaveProperty(key);
        expect(config[key]).toBeDefined();
      }
    }
  });

  it('Easy sender should have OBVIOUS FAKE rule', () => {
    expect(DIFFICULTY_CONFIG.Easy.sender.rule).toBe('OBVIOUS FAKE');
    expect(DIFFICULTY_CONFIG.Easy.sender.examples).toBeDefined();
    expect(DIFFICULTY_CONFIG.Easy.sender.examples.length).toBeGreaterThan(0);
  });

  it('Medium sender should have SUSPICIOUS BUT PLAUSIBLE rule', () => {
    expect(DIFFICULTY_CONFIG.Medium.sender.rule).toBe('SUSPICIOUS BUT PLAUSIBLE');
  });

  it('Hard sender should have SOPHISTICATED SPOOFING rule', () => {
    expect(DIFFICULTY_CONFIG.Hard.sender.rule).toBe('SOPHISTICATED SPOOFING');
  });

  it('each grammar config should have rule and description', () => {
    for (const level of levels) {
      expect(DIFFICULTY_CONFIG[level].grammar).toHaveProperty('rule');
      expect(DIFFICULTY_CONFIG[level].grammar).toHaveProperty('description');
    }
  });
});
