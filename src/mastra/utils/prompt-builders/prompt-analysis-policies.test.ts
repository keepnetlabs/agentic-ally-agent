import { describe, it, expect } from 'vitest';
import {
  CLARITY_ACCESSIBILITY_POLICY,
  DEFAULT_MICROLEARNING_ETHICAL_POLICY,
  DEFAULT_PHISHING_ETHICAL_POLICY,
} from './prompt-analysis-policies';
import { ETHICAL_POLICY } from '../../constants/microlearning-templates';

describe('prompt-analysis-policies', () => {
  describe('CLARITY_ACCESSIBILITY_POLICY', () => {
    it('is defined and non-empty', () => {
      expect(CLARITY_ACCESSIBILITY_POLICY).toBeDefined();
      expect(CLARITY_ACCESSIBILITY_POLICY.length).toBeGreaterThan(10);
    });

    it('mentions accessibility', () => {
      expect(CLARITY_ACCESSIBILITY_POLICY.toLowerCase()).toContain('accessibility');
    });

    it('mentions fairness', () => {
      expect(CLARITY_ACCESSIBILITY_POLICY.toLowerCase()).toContain('fairness');
    });
  });

  describe('DEFAULT_MICROLEARNING_ETHICAL_POLICY', () => {
    it('is defined and non-empty', () => {
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY).toBeDefined();
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY.length).toBeGreaterThan(20);
    });

    it('contains ethical policy constants', () => {
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY).toContain(ETHICAL_POLICY.title);
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY).toContain(ETHICAL_POLICY.purpose);
    });

    it('formats implementation standards correctly', () => {
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY).toContain('Gender-inclusive language');
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY).toContain('Positive & motivational tone');
      expect(DEFAULT_MICROLEARNING_ETHICAL_POLICY).toContain('Accessibility');
    });
  });

  describe('DEFAULT_PHISHING_ETHICAL_POLICY', () => {
    it('is defined and non-empty', () => {
      expect(DEFAULT_PHISHING_ETHICAL_POLICY).toBeDefined();
      expect(DEFAULT_PHISHING_ETHICAL_POLICY.length).toBeGreaterThan(10);
    });

    it('mentions ISO/UN', () => {
      expect(DEFAULT_PHISHING_ETHICAL_POLICY).toContain('ISO');
      expect(DEFAULT_PHISHING_ETHICAL_POLICY).toContain('UN');
    });

    it('encourages neutral language', () => {
      expect(DEFAULT_PHISHING_ETHICAL_POLICY.toLowerCase()).toContain('neutral');
    });
  });
});
