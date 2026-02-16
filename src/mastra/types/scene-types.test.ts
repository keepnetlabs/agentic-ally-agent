import { describe, it, expect } from 'vitest';
import { SceneType, isValidSceneType, getSceneTypeOrDefault } from './scene-types';

/**
 * Test suite for Scene Types
 * Tests enum values, type guards, and utility functions
 */
describe('Scene Types', () => {
  // ==================== SCENE TYPE ENUM TESTS ====================
  describe('SceneType Enum', () => {
    it('should have INTRO scene type', () => {
      expect(SceneType.INTRO).toBe('intro');
    });

    it('should have GOAL scene type', () => {
      expect(SceneType.GOAL).toBe('goal');
    });

    it('should have SCENARIO scene type', () => {
      expect(SceneType.SCENARIO).toBe('scenario');
    });

    it('should have ACTIONABLE_CONTENT scene type', () => {
      expect(SceneType.ACTIONABLE_CONTENT).toBe('actionable_content');
    });

    it('should have CODE_REVIEW scene type', () => {
      expect(SceneType.CODE_REVIEW).toBe('code_review');
    });

    it('should have VISHING_SIMULATION scene type', () => {
      expect(SceneType.VISHING_SIMULATION).toBe('vishing_simulation');
    });

    it('should have SMISHING_SIMULATION scene type', () => {
      expect(SceneType.SMISHING_SIMULATION).toBe('smishing_simulation');
    });

    it('should have QUIZ scene type', () => {
      expect(SceneType.QUIZ).toBe('quiz');
    });

    it('should have SURVEY scene type', () => {
      expect(SceneType.SURVEY).toBe('survey');
    });

    it('should have NUDGE scene type', () => {
      expect(SceneType.NUDGE).toBe('nudge');
    });

    it('should have SUMMARY scene type', () => {
      expect(SceneType.SUMMARY).toBe('summary');
    });

    it('should have exactly 11 scene types', () => {
      const sceneTypes = Object.values(SceneType);
      expect(sceneTypes.length).toBe(11);
    });

    it('should have all unique values', () => {
      const values = Object.values(SceneType);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should use snake_case for multi-word types', () => {
      expect(SceneType.ACTIONABLE_CONTENT).toContain('_');
      expect(SceneType.CODE_REVIEW).toContain('_');
      expect(SceneType.VISHING_SIMULATION).toContain('_');
      expect(SceneType.SMISHING_SIMULATION).toContain('_');
    });

    it('should use lowercase values', () => {
      Object.values(SceneType).forEach(value => {
        expect(value).toBe(value.toLowerCase());
      });
    });
  });

  // ==================== isValidSceneType TESTS ====================
  describe('isValidSceneType', () => {
    describe('Valid Scene Types', () => {
      it('should return true for intro', () => {
        expect(isValidSceneType('intro')).toBe(true);
      });

      it('should return true for goal', () => {
        expect(isValidSceneType('goal')).toBe(true);
      });

      it('should return true for scenario', () => {
        expect(isValidSceneType('scenario')).toBe(true);
      });

      it('should return true for actionable_content', () => {
        expect(isValidSceneType('actionable_content')).toBe(true);
      });

      it('should return true for code_review', () => {
        expect(isValidSceneType('code_review')).toBe(true);
      });

      it('should return true for vishing_simulation', () => {
        expect(isValidSceneType('vishing_simulation')).toBe(true);
      });

      it('should return true for smishing_simulation', () => {
        expect(isValidSceneType('smishing_simulation')).toBe(true);
      });

      it('should return true for quiz', () => {
        expect(isValidSceneType('quiz')).toBe(true);
      });

      it('should return true for survey', () => {
        expect(isValidSceneType('survey')).toBe(true);
      });

      it('should return true for nudge', () => {
        expect(isValidSceneType('nudge')).toBe(true);
      });

      it('should return true for summary', () => {
        expect(isValidSceneType('summary')).toBe(true);
      });

      it('should return true for all enum values', () => {
        Object.values(SceneType).forEach(sceneType => {
          expect(isValidSceneType(sceneType)).toBe(true);
        });
      });
    });

    describe('Invalid Scene Types', () => {
      it('should return false for invalid string', () => {
        expect(isValidSceneType('invalid')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isValidSceneType('')).toBe(false);
      });

      it('should return false for uppercase variant', () => {
        expect(isValidSceneType('INTRO')).toBe(false);
      });

      it('should return false for mixed case', () => {
        expect(isValidSceneType('Intro')).toBe(false);
      });

      it('should return false for number as string', () => {
        expect(isValidSceneType('123')).toBe(false);
      });

      it('should return false for special characters', () => {
        expect(isValidSceneType('intro!')).toBe(false);
        expect(isValidSceneType('intro@')).toBe(false);
      });

      it('should return false for whitespace', () => {
        expect(isValidSceneType(' ')).toBe(false);
        expect(isValidSceneType('  ')).toBe(false);
      });

      it('should return false for intro with spaces', () => {
        expect(isValidSceneType('intro ')).toBe(false);
        expect(isValidSceneType(' intro')).toBe(false);
      });

      it('should return false for dash instead of underscore', () => {
        expect(isValidSceneType('actionable-content')).toBe(false);
        expect(isValidSceneType('code-review')).toBe(false);
      });

      it('should return false for camelCase', () => {
        expect(isValidSceneType('actionableContent')).toBe(false);
        expect(isValidSceneType('codeReview')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long strings', () => {
        const longString = 'a'.repeat(1000);
        expect(isValidSceneType(longString)).toBe(false);
      });

      it('should handle strings with newlines', () => {
        expect(isValidSceneType('intro\n')).toBe(false);
      });

      it('should handle strings with tabs', () => {
        expect(isValidSceneType('intro\t')).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(isValidSceneType('intro')).toBe(true);
        expect(isValidSceneType('Intro')).toBe(false);
        expect(isValidSceneType('INTRO')).toBe(false);
      });
    });
  });

  // ==================== getSceneTypeOrDefault TESTS ====================
  describe('getSceneTypeOrDefault', () => {
    describe('Valid Input', () => {
      it('should return intro for valid intro string', () => {
        const result = getSceneTypeOrDefault('intro');
        expect(result).toBe(SceneType.INTRO);
      });

      it('should return vishing_simulation for valid vishing string', () => {
        const result = getSceneTypeOrDefault('vishing_simulation');
        expect(result).toBe(SceneType.VISHING_SIMULATION);
      });

      it('should return smishing_simulation for valid smishing string', () => {
        const result = getSceneTypeOrDefault('smishing_simulation');
        expect(result).toBe(SceneType.SMISHING_SIMULATION);
      });

      it('should return code_review for valid code_review string', () => {
        const result = getSceneTypeOrDefault('code_review');
        expect(result).toBe(SceneType.CODE_REVIEW);
      });

      it('should return actionable_content for valid actionable string', () => {
        const result = getSceneTypeOrDefault('actionable_content');
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });

      it('should return correct type for all valid scene types', () => {
        Object.values(SceneType).forEach(sceneType => {
          const result = getSceneTypeOrDefault(sceneType);
          expect(result).toBe(sceneType);
        });
      });
    });

    describe('Invalid Input - Default Fallback', () => {
      it('should return default for invalid string', () => {
        const result = getSceneTypeOrDefault('invalid');
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });

      it('should return default for empty string', () => {
        const result = getSceneTypeOrDefault('');
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });

      it('should return default for undefined', () => {
        const result = getSceneTypeOrDefault(undefined);
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });

      it('should return default for uppercase variant', () => {
        const result = getSceneTypeOrDefault('INTRO');
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });
    });

    describe('Custom Default', () => {
      it('should use custom default for undefined input', () => {
        const result = getSceneTypeOrDefault(undefined, SceneType.INTRO);
        expect(result).toBe(SceneType.INTRO);
      });

      it('should use custom default for invalid input', () => {
        const result = getSceneTypeOrDefault('invalid', SceneType.QUIZ);
        expect(result).toBe(SceneType.QUIZ);
      });

      it('should accept vishing_simulation as custom default', () => {
        const result = getSceneTypeOrDefault('invalid', SceneType.VISHING_SIMULATION);
        expect(result).toBe(SceneType.VISHING_SIMULATION);
      });

      it('should accept smishing_simulation as custom default', () => {
        const result = getSceneTypeOrDefault('invalid', SceneType.SMISHING_SIMULATION);
        expect(result).toBe(SceneType.SMISHING_SIMULATION);
      });

      it('should accept code_review as custom default', () => {
        const result = getSceneTypeOrDefault(undefined, SceneType.CODE_REVIEW);
        expect(result).toBe(SceneType.CODE_REVIEW);
      });

      it('should ignore custom default when input is valid', () => {
        const result = getSceneTypeOrDefault('intro', SceneType.QUIZ);
        expect(result).toBe(SceneType.INTRO);
      });

      it('should work with all scene types as custom default', () => {
        Object.values(SceneType).forEach(defaultType => {
          const result = getSceneTypeOrDefault('invalid', defaultType);
          expect(result).toBe(defaultType);
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle null-like values', () => {
        const result = getSceneTypeOrDefault(undefined);
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });

      it('should handle very long invalid strings', () => {
        const longString = 'a'.repeat(1000);
        const result = getSceneTypeOrDefault(longString);
        expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      });

      it('should be consistent across multiple calls', () => {
        const result1 = getSceneTypeOrDefault('invalid');
        const result2 = getSceneTypeOrDefault('invalid');
        expect(result1).toBe(result2);
      });

      it('should not modify input string', () => {
        const input = 'intro';
        const result = getSceneTypeOrDefault(input);
        expect(result).toBe('intro');
        expect(input).toBe('intro'); // Input unchanged
      });
    });

    describe('Type Safety', () => {
      it('should return SceneType enum value', () => {
        const result = getSceneTypeOrDefault('intro');
        const isSceneType = Object.values(SceneType).includes(result);
        expect(isSceneType).toBe(true);
      });

      it('should always return a valid SceneType', () => {
        const testCases = ['intro', 'invalid', '', undefined, 'INTRO', '123'];
        testCases.forEach(testCase => {
          const result = getSceneTypeOrDefault(testCase);
          expect(isValidSceneType(result)).toBe(true);
        });
      });
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Tests', () => {
    it('should work together: validate and get default', () => {
      const input = 'invalid';
      const isValid = isValidSceneType(input);
      expect(isValid).toBe(false);

      const result = getSceneTypeOrDefault(input);
      expect(result).toBe(SceneType.ACTIONABLE_CONTENT);
      expect(isValidSceneType(result)).toBe(true);
    });

    it('should work together: validate and use value', () => {
      const input = 'vishing_simulation';
      const isValid = isValidSceneType(input);
      expect(isValid).toBe(true);

      const result = getSceneTypeOrDefault(input);
      expect(result).toBe(SceneType.VISHING_SIMULATION);
      expect(isValidSceneType(result)).toBe(true);
    });

    it('should handle all scene types in workflow', () => {
      Object.values(SceneType).forEach(sceneType => {
        // Validate
        expect(isValidSceneType(sceneType)).toBe(true);

        // Get or default
        const result = getSceneTypeOrDefault(sceneType);
        expect(result).toBe(sceneType);

        // Validate result
        expect(isValidSceneType(result)).toBe(true);
      });
    });
  });

  // ==================== ENUM COMPLETENESS TESTS ====================
  describe('Enum Completeness', () => {
    it('should cover all 8 scenes in microlearning', () => {
      const expectedScenes = [
        'intro', // Scene 1
        'goal', // Scene 2
        'scenario', // Scene 3
        'quiz', // Scene 5
        'survey', // Scene 6
        'nudge', // Scene 7
        'summary', // Scene 8
      ];

      expectedScenes.forEach(scene => {
        expect(Object.values(SceneType)).toContain(scene);
      });
    });

    it('should include scene 4 variants', () => {
      const scene4Variants = ['actionable_content', 'code_review', 'vishing_simulation'];

      scene4Variants.forEach(variant => {
        expect(Object.values(SceneType)).toContain(variant);
      });
    });

    it('should have scene 4 variants as separate types', () => {
      expect(SceneType.ACTIONABLE_CONTENT).toBeDefined();
      expect(SceneType.CODE_REVIEW).toBeDefined();
      expect(SceneType.VISHING_SIMULATION).toBeDefined();
    });
  });
});
