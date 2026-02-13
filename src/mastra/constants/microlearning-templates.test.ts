import { describe, it, expect } from 'vitest';
import { ETHICAL_POLICY, SCIENTIFIC_EVIDENCE, DEFAULT_LOGO_CONFIG, getScene4Metadata } from './microlearning-templates';

/**
 * Test suite for Microlearning Templates Constants
 * Tests configuration objects and scene metadata generation
 */
describe('Microlearning Templates', () => {
  // ==================== ETHICAL POLICY TESTS ====================
  describe('ETHICAL_POLICY', () => {
    it('should have required top-level properties', () => {
      expect(ETHICAL_POLICY).toHaveProperty('title');
      expect(ETHICAL_POLICY).toHaveProperty('purpose');
      expect(ETHICAL_POLICY).toHaveProperty('why_standards_matter');
      expect(ETHICAL_POLICY).toHaveProperty('applied_standards');
      expect(ETHICAL_POLICY).toHaveProperty('implementation_in_content');
      expect(ETHICAL_POLICY).toHaveProperty('value_for_employees');
      expect(ETHICAL_POLICY).toHaveProperty('conclusion');
    });

    it('should have non-empty title and purpose', () => {
      expect(ETHICAL_POLICY.title.length).toBeGreaterThan(0);
      expect(ETHICAL_POLICY.purpose.length).toBeGreaterThan(0);
    });

    it('should have at least 3 reasons why standards matter', () => {
      expect(ETHICAL_POLICY.why_standards_matter.length).toBeGreaterThanOrEqual(3);
      ETHICAL_POLICY.why_standards_matter.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });

    it('should reference ISO standards', () => {
      expect(ETHICAL_POLICY.applied_standards).toHaveProperty('ISO');
      expect(Array.isArray(ETHICAL_POLICY.applied_standards.ISO)).toBe(true);
      expect(ETHICAL_POLICY.applied_standards.ISO.length).toBeGreaterThan(0);
    });

    it('should reference UN standards', () => {
      expect(ETHICAL_POLICY.applied_standards).toHaveProperty('UN');
      expect(Array.isArray(ETHICAL_POLICY.applied_standards.UN)).toBe(true);
      expect(ETHICAL_POLICY.applied_standards.UN.length).toBeGreaterThan(0);
    });

    it('should have implementation guidelines', () => {
      const impl = ETHICAL_POLICY.implementation_in_content;
      expect(impl).toHaveProperty('gender_inclusive_language');
      expect(impl).toHaveProperty('positive_and_motivational_tone');
      expect(impl).toHaveProperty('inclusive_and_universal_expression');
      expect(impl).toHaveProperty('clear_and_plain_language');
      expect(impl).toHaveProperty('accessibility');
    });

    it('should have value propositions for different stakeholders', () => {
      const value = ETHICAL_POLICY.value_for_employees;
      expect(value).toHaveProperty('HR');
      expect(value).toHaveProperty('CISO');
      expect(value).toHaveProperty('Leaders');
    });

    it('should have conclusion array', () => {
      expect(Array.isArray(ETHICAL_POLICY.conclusion)).toBe(true);
      expect(ETHICAL_POLICY.conclusion.length).toBeGreaterThan(0);
    });
  });

  // ==================== SCIENTIFIC EVIDENCE TESTS ====================
  describe('SCIENTIFIC_EVIDENCE', () => {
    it('should have overview section', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('overview');
      expect(SCIENTIFIC_EVIDENCE.overview).toHaveProperty('title');
      expect(SCIENTIFIC_EVIDENCE.overview).toHaveProperty('description');
      expect(SCIENTIFIC_EVIDENCE.overview).toHaveProperty('evidence_level');
      expect(SCIENTIFIC_EVIDENCE.overview).toHaveProperty('peer_reviewed_sources');
    });

    it('should have learning theories section', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('learning_theories');
      const theories = SCIENTIFIC_EVIDENCE.learning_theories;
      expect(theories).toHaveProperty('cognitive_load_theory');
      expect(theories).toHaveProperty('spacing_effect');
      expect(theories).toHaveProperty('active_recall');
    });

    it('should have theory-application-evidence structure', () => {
      const clt = SCIENTIFIC_EVIDENCE.learning_theories.cognitive_load_theory;
      expect(clt).toHaveProperty('theory');
      expect(clt).toHaveProperty('application');
      expect(clt).toHaveProperty('evidence');
      expect(typeof clt.theory).toBe('string');
      expect(typeof clt.application).toBe('string');
      expect(typeof clt.evidence).toBe('string');
    });

    it('should have behavioral psychology section', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('behavioral_psychology');
      const behav = SCIENTIFIC_EVIDENCE.behavioral_psychology;
      expect(behav).toHaveProperty('implementation_intentions');
      expect(behav).toHaveProperty('social_cognitive_theory');
      expect(behav).toHaveProperty('narrative_transportation');
    });

    it('should have gamification research section', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('gamification_research');
      const gamif = SCIENTIFIC_EVIDENCE.gamification_research;
      expect(gamif).toHaveProperty('intrinsic_motivation');
      expect(gamif).toHaveProperty('immediate_feedback');
    });

    it('should have cybersecurity-specific research', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('cybersecurity_specific');
      const cyber = SCIENTIFIC_EVIDENCE.cybersecurity_specific;
      expect(cyber).toHaveProperty('phishing_detection');
      expect(cyber).toHaveProperty('security_awareness');
      expect(cyber).toHaveProperty('reporting_behavior');
    });

    it('should have methodology evidence section', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('methodology_evidence');
      const method = SCIENTIFIC_EVIDENCE.methodology_evidence;
      expect(method).toHaveProperty('microlearning_effectiveness');
      expect(method).toHaveProperty('multimodal_learning');
      expect(method).toHaveProperty('spaced_repetition');
    });

    it('should have effectiveness metrics', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('effectiveness_metrics');
      const metrics = SCIENTIFIC_EVIDENCE.effectiveness_metrics;
      expect(metrics).toHaveProperty('learning_outcomes');
      expect(metrics).toHaveProperty('engagement_metrics');
      expect(metrics).toHaveProperty('business_impact');
    });

    it('should have research sources array', () => {
      expect(SCIENTIFIC_EVIDENCE).toHaveProperty('research_sources');
      expect(Array.isArray(SCIENTIFIC_EVIDENCE.research_sources)).toBe(true);
      expect(SCIENTIFIC_EVIDENCE.research_sources.length).toBeGreaterThan(0);
    });

    it('should have properly formatted research sources', () => {
      SCIENTIFIC_EVIDENCE.research_sources.forEach(source => {
        expect(source).toHaveProperty('author');
        expect(source).toHaveProperty('year');
        expect(source).toHaveProperty('title');
        expect(typeof source.author).toBe('string');
        expect(typeof source.year).toBe('number');
        expect(typeof source.title).toBe('string');
      });
    });

    it('should have evidence level specified', () => {
      const level = SCIENTIFIC_EVIDENCE.overview.evidence_level;
      expect(level).toBe('Strong');
    });

    it('should have peer-reviewed sources count', () => {
      const count = SCIENTIFIC_EVIDENCE.overview.peer_reviewed_sources;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  // ==================== DEFAULT LOGO CONFIG TESTS ====================
  describe('DEFAULT_LOGO_CONFIG', () => {
    it('should have all required logo properties', () => {
      expect(DEFAULT_LOGO_CONFIG).toHaveProperty('src');
      expect(DEFAULT_LOGO_CONFIG).toHaveProperty('darkSrc');
      expect(DEFAULT_LOGO_CONFIG).toHaveProperty('minimizedSrc');
      expect(DEFAULT_LOGO_CONFIG).toHaveProperty('minimizedDarkSrc');
      expect(DEFAULT_LOGO_CONFIG).toHaveProperty('alt');
    });

    it('should have valid URL strings', () => {
      expect(typeof DEFAULT_LOGO_CONFIG.src).toBe('string');
      expect(DEFAULT_LOGO_CONFIG.src.startsWith('http')).toBe(true);
      expect(typeof DEFAULT_LOGO_CONFIG.darkSrc).toBe('string');
      expect(DEFAULT_LOGO_CONFIG.darkSrc.startsWith('http')).toBe(true);
    });

    it('should have alt text', () => {
      expect(typeof DEFAULT_LOGO_CONFIG.alt).toBe('string');
      expect(DEFAULT_LOGO_CONFIG.alt.length).toBeGreaterThan(0);
    });

    it('should have minimized versions', () => {
      expect(DEFAULT_LOGO_CONFIG.minimizedSrc.startsWith('http')).toBe(true);
      expect(DEFAULT_LOGO_CONFIG.minimizedDarkSrc.startsWith('http')).toBe(true);
    });
  });

  // ==================== GET SCENE 4 METADATA TESTS ====================
  describe('getScene4Metadata', () => {
    describe('Code Review Type', () => {
      it('should return correct metadata for code_review', () => {
        const result = getScene4Metadata(5, 'code_review');

        expect(result.scene_type).toBe('code_review');
        expect(result.points).toBe(15);
        expect(result.hasAchievementNotification).toBe(true);
        expect(result.scientific_basis).toContain('Code Review');
        expect(result.icon.sparkleIconName).toBe('code');
        expect(result.icon.sceneIconName).toBe('code');
      });

      it('should calculate duration correctly for code_review', () => {
        const duration = 5;
        const result = getScene4Metadata(duration, 'code_review');
        const expectedDuration = Math.round(duration * 60 * 0.2);

        expect(result.duration_seconds).toBe(expectedDuration);
        expect(result.duration_seconds).toBe(60); // 5 * 60 * 0.2 = 60
      });

      it('should handle different durations for code_review', () => {
        const durations = [3, 5, 10, 15];
        durations.forEach(duration => {
          const result = getScene4Metadata(duration, 'code_review');
          const expected = Math.round(duration * 60 * 0.2);
          expect(result.duration_seconds).toBe(expected);
        });
      });
    });

    describe('Vishing Simulation Type', () => {
      it('should return correct metadata for vishing_simulation', () => {
        const result = getScene4Metadata(5, 'vishing_simulation');

        expect(result.scene_type).toBe('vishing_simulation');
        expect(result.points).toBe(25);
        expect(result.hasAchievementNotification).toBe(true);
        expect(result.scientific_basis).toContain('Behavioral Rehearsal');
        expect(result.icon.sparkleIconName).toBe('phone');
        expect(result.icon.sceneIconName).toBe('phone');
      });

      it('should calculate duration correctly for vishing_simulation', () => {
        const duration = 5;
        const result = getScene4Metadata(duration, 'vishing_simulation');
        const expectedDuration = Math.round(duration * 60 * 0.25);

        expect(result.duration_seconds).toBe(expectedDuration);
        expect(result.duration_seconds).toBe(75); // 5 * 60 * 0.25 = 75
      });

      it('should handle different durations for vishing_simulation', () => {
        const durations = [3, 5, 10, 15];
        durations.forEach(duration => {
          const result = getScene4Metadata(duration, 'vishing_simulation');
          const expected = Math.round(duration * 60 * 0.25);
          expect(result.duration_seconds).toBe(expected);
        });
      });
    });

    describe('Smishing Simulation Type', () => {
      it('should return correct metadata for smishing_simulation', () => {
        const result = getScene4Metadata(5, 'smishing_simulation');

        expect(result.scene_type).toBe('smishing_simulation');
        expect(result.points).toBe(25);
        expect(result.hasAchievementNotification).toBe(true);
        expect(result.scientific_basis).toContain('Behavioral Rehearsal');
        expect(result.icon.sparkleIconName).toBe('message-square');
        expect(result.icon.sceneIconName).toBe('message-square');
      });

      it('should calculate duration correctly for smishing_simulation', () => {
        const duration = 5;
        const result = getScene4Metadata(duration, 'smishing_simulation');
        const expectedDuration = Math.round(duration * 60 * 0.25);

        expect(result.duration_seconds).toBe(expectedDuration);
        expect(result.duration_seconds).toBe(75); // 5 * 60 * 0.25 = 75
      });

      it('should handle different durations for smishing_simulation', () => {
        const durations = [3, 5, 10, 15];
        durations.forEach(duration => {
          const result = getScene4Metadata(duration, 'smishing_simulation');
          const expected = Math.round(duration * 60 * 0.25);
          expect(result.duration_seconds).toBe(expected);
        });
      });
    });

    describe('Actionable Content Type', () => {
      it('should return correct metadata for actionable_content', () => {
        const result = getScene4Metadata(5, 'actionable_content');

        expect(result.scene_type).toBe('actionable_content');
        expect(result.points).toBe(25);
        expect(result.hasAchievementNotification).toBe(false);
        expect(result.scientific_basis).toContain('Procedural Knowledge');
        expect(result.icon.sparkleIconName).toBe('check-circle');
        expect(result.icon.sceneIconName).toBe('clipboard-check');
      });

      it('should calculate duration correctly for actionable_content', () => {
        const duration = 5;
        const result = getScene4Metadata(duration, 'actionable_content');
        const expectedDuration = Math.round(duration * 60 * 0.25);

        expect(result.duration_seconds).toBe(expectedDuration);
        expect(result.duration_seconds).toBe(75); // 5 * 60 * 0.25 = 75
      });

      it('should handle different durations for actionable_content', () => {
        const durations = [3, 5, 10, 15];
        durations.forEach(duration => {
          const result = getScene4Metadata(duration, 'actionable_content');
          const expected = Math.round(duration * 60 * 0.25);
          expect(result.duration_seconds).toBe(expected);
        });
      });
    });

    describe('Type Comparison', () => {
      it('should have different points for code_review vs others', () => {
        const codeReview = getScene4Metadata(5, 'code_review');
        const vishing = getScene4Metadata(5, 'vishing_simulation');
        const smishing = getScene4Metadata(5, 'smishing_simulation');
        const actionable = getScene4Metadata(5, 'actionable_content');

        expect(codeReview.points).toBe(15);
        expect(vishing.points).toBe(25);
        expect(smishing.points).toBe(25);
        expect(actionable.points).toBe(25);
      });

      it('should have different durations for code_review vs others', () => {
        const duration = 10;
        const codeReview = getScene4Metadata(duration, 'code_review');
        const vishing = getScene4Metadata(duration, 'vishing_simulation');
        const smishing = getScene4Metadata(duration, 'smishing_simulation');
        const actionable = getScene4Metadata(duration, 'actionable_content');

        expect(codeReview.duration_seconds).toBe(120); // 10 * 60 * 0.2
        expect(vishing.duration_seconds).toBe(150); // 10 * 60 * 0.25
        expect(smishing.duration_seconds).toBe(150); // 10 * 60 * 0.25
        expect(actionable.duration_seconds).toBe(150); // 10 * 60 * 0.25
      });

      it('should have different achievement flags', () => {
        const codeReview = getScene4Metadata(5, 'code_review');
        const vishing = getScene4Metadata(5, 'vishing_simulation');
        const smishing = getScene4Metadata(5, 'smishing_simulation');
        const actionable = getScene4Metadata(5, 'actionable_content');

        expect(codeReview.hasAchievementNotification).toBe(true);
        expect(vishing.hasAchievementNotification).toBe(true);
        expect(smishing.hasAchievementNotification).toBe(true);
        expect(actionable.hasAchievementNotification).toBe(false);
      });

      it('should have unique scientific basis for each type', () => {
        const codeReview = getScene4Metadata(5, 'code_review');
        const vishing = getScene4Metadata(5, 'vishing_simulation');
        const actionable = getScene4Metadata(5, 'actionable_content');

        expect(codeReview.scientific_basis).not.toBe(vishing.scientific_basis);
        expect(vishing.scientific_basis).not.toBe(actionable.scientific_basis);
        expect(codeReview.scientific_basis).not.toBe(actionable.scientific_basis);
      });

      it('should have unique icons for each type', () => {
        const codeReview = getScene4Metadata(5, 'code_review');
        const vishing = getScene4Metadata(5, 'vishing_simulation');
        const actionable = getScene4Metadata(5, 'actionable_content');

        expect(codeReview.icon.sparkleIconName).toBe('code');
        expect(vishing.icon.sparkleIconName).toBe('phone');
        expect(actionable.icon.sparkleIconName).toBe('check-circle');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very small duration values', () => {
        const result = getScene4Metadata(1, 'code_review');
        expect(result.duration_seconds).toBe(12); // 1 * 60 * 0.2 = 12
      });

      it('should handle large duration values', () => {
        const result = getScene4Metadata(60, 'vishing_simulation');
        expect(result.duration_seconds).toBe(900); // 60 * 60 * 0.25 = 900
      });

      it('should round duration to nearest integer', () => {
        const result = getScene4Metadata(3.7, 'code_review');
        expect(Number.isInteger(result.duration_seconds)).toBe(true);
      });

      it('should handle fractional duration values', () => {
        const result = getScene4Metadata(4.5, 'actionable_content');
        const expected = Math.round(4.5 * 60 * 0.25);
        expect(result.duration_seconds).toBe(expected);
        expect(result.duration_seconds).toBe(68); // Math.round(67.5) = 68
      });

      it('should handle zero duration', () => {
        const result = getScene4Metadata(0, 'code_review');
        expect(result.duration_seconds).toBe(0);
      });

      it('should return object with all required fields', () => {
        const types: Array<'code_review' | 'actionable_content' | 'vishing_simulation'> = [
          'code_review',
          'actionable_content',
          'vishing_simulation',
        ];

        types.forEach(type => {
          const result = getScene4Metadata(5, type);
          expect(result).toHaveProperty('scene_type');
          expect(result).toHaveProperty('points');
          expect(result).toHaveProperty('duration_seconds');
          expect(result).toHaveProperty('hasAchievementNotification');
          expect(result).toHaveProperty('scientific_basis');
          expect(result).toHaveProperty('icon');
          expect(result.icon).toHaveProperty('sparkleIconName');
          expect(result.icon).toHaveProperty('sceneIconName');
        });
      });
    });

    describe('Return Type Consistency', () => {
      it('should always return an object', () => {
        const types: Array<'code_review' | 'actionable_content' | 'vishing_simulation'> = [
          'code_review',
          'actionable_content',
          'vishing_simulation',
        ];

        types.forEach(type => {
          const result = getScene4Metadata(5, type);
          expect(typeof result).toBe('object');
          expect(result).not.toBeNull();
        });
      });

      it('should have correct types for all fields', () => {
        const result = getScene4Metadata(5, 'code_review');

        expect(typeof result.scene_type).toBe('string');
        expect(typeof result.points).toBe('number');
        expect(typeof result.duration_seconds).toBe('number');
        expect(typeof result.hasAchievementNotification).toBe('boolean');
        expect(typeof result.scientific_basis).toBe('string');
        expect(typeof result.icon).toBe('object');
        expect(typeof result.icon.sparkleIconName).toBe('string');
        expect(typeof result.icon.sceneIconName).toBe('string');
      });
    });
  });
});
