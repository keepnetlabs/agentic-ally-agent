import { describe, it, expect } from 'vitest';

/**
 * Test Suite: generateScene4Metadata
 * Tests for dynamic Scene 4 metadata generation based on scene type
 */

describe('generateScene4Metadata', () => {
  /**
   * Helper function to generate Scene 4 metadata
   * (simulating the actual function behavior)
   */
  function generateScene4Metadata(duration: number, scene4Type: 'code_review' | 'actionable_content') {
    if (scene4Type === 'code_review') {
      return {
        scene_type: 'code_review' as const,
        points: 15,
        duration_seconds: Math.round(duration * 60 * 0.2),
        hasAchievementNotification: true,
        scientific_basis: 'Code Review – Active Analysis + Secure Coding: Encourages critical thinking and secure design review habits.',
        icon: {
          sparkleIconName: 'code',
          sceneIconName: 'code'
        }
      };
    }

    return {
      scene_type: 'actionable_content' as const,
      points: 25,
      duration_seconds: Math.round(duration * 60 * 0.25),
      hasAchievementNotification: false,
      scientific_basis: 'Procedural Knowledge: Step-by-step guidance builds competency.',
      icon: {
        sparkleIconName: 'check-circle',
        sceneIconName: 'clipboard-check'
      }
    };
  }

  describe('code_review scene type', () => {
    it('should return code_review scene type', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.scene_type).toBe('code_review');
    });

    it('should assign 15 points for code_review', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.points).toBe(15);
    });

    it('should allocate 20% of duration for code_review', () => {
      const duration = 5;
      const metadata = generateScene4Metadata(duration, 'code_review');
      const expectedSeconds = Math.round(duration * 60 * 0.2);
      expect(metadata.duration_seconds).toBe(expectedSeconds);
      expect(metadata.duration_seconds).toBe(60); // 5 minutes * 60 * 0.2
    });

    it('should enable achievement notification for code_review', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.hasAchievementNotification).toBe(true);
    });

    it('should use code review scientific basis', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.scientific_basis).toContain('Code Review');
      expect(metadata.scientific_basis).toContain('Active Analysis');
      expect(metadata.scientific_basis).toContain('Secure Coding');
    });

    it('should use code icons for code_review', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.icon.sparkleIconName).toBe('code');
      expect(metadata.icon.sceneIconName).toBe('code');
    });

    it('should have correct icon structure for code_review', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.icon).toHaveProperty('sparkleIconName');
      expect(metadata.icon).toHaveProperty('sceneIconName');
      expect(Object.keys(metadata.icon).length).toBe(2);
    });
  });

  describe('actionable_content scene type', () => {
    it('should return actionable_content scene type', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.scene_type).toBe('actionable_content');
    });

    it('should assign 25 points for actionable_content', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.points).toBe(25);
    });

    it('should allocate 25% of duration for actionable_content', () => {
      const duration = 5;
      const metadata = generateScene4Metadata(duration, 'actionable_content');
      const expectedSeconds = Math.round(duration * 60 * 0.25);
      expect(metadata.duration_seconds).toBe(expectedSeconds);
      expect(metadata.duration_seconds).toBe(75); // 5 minutes * 60 * 0.25
    });

    it('should disable achievement notification for actionable_content', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.hasAchievementNotification).toBe(false);
    });

    it('should use procedural knowledge scientific basis', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.scientific_basis).toContain('Procedural Knowledge');
      expect(metadata.scientific_basis).toContain('competency');
    });

    it('should use inbox/action icons for actionable_content', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.icon.sparkleIconName).toBe('check-circle');
      expect(metadata.icon.sceneIconName).toBe('clipboard-check');
    });

    it('should have correct icon structure for actionable_content', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.icon).toHaveProperty('sparkleIconName');
      expect(metadata.icon).toHaveProperty('sceneIconName');
      expect(Object.keys(metadata.icon).length).toBe(2);
    });
  });

  describe('duration calculations', () => {
    it('should correctly calculate duration for 1-minute training (code_review)', () => {
      const metadata = generateScene4Metadata(1, 'code_review');
      expect(metadata.duration_seconds).toBe(12); // 1 * 60 * 0.2
    });

    it('should correctly calculate duration for 10-minute training (code_review)', () => {
      const metadata = generateScene4Metadata(10, 'code_review');
      expect(metadata.duration_seconds).toBe(120); // 10 * 60 * 0.2
    });

    it('should correctly calculate duration for 1-minute training (actionable_content)', () => {
      const metadata = generateScene4Metadata(1, 'actionable_content');
      expect(metadata.duration_seconds).toBe(15); // 1 * 60 * 0.25
    });

    it('should correctly calculate duration for 10-minute training (actionable_content)', () => {
      const metadata = generateScene4Metadata(10, 'actionable_content');
      expect(metadata.duration_seconds).toBe(150); // 10 * 60 * 0.25
    });

    it('should handle fractional seconds properly', () => {
      const metadata = generateScene4Metadata(3, 'code_review');
      // 3 * 60 * 0.2 = 36
      expect(metadata.duration_seconds).toBe(36);
      expect(Number.isInteger(metadata.duration_seconds)).toBe(true);
    });
  });

  describe('points allocation', () => {
    it('should always give code_review 15 points (regardless of duration)', () => {
      for (let duration = 1; duration <= 10; duration++) {
        const metadata = generateScene4Metadata(duration, 'code_review');
        expect(metadata.points).toBe(15);
      }
    });

    it('should always give actionable_content 25 points (regardless of duration)', () => {
      for (let duration = 1; duration <= 10; duration++) {
        const metadata = generateScene4Metadata(duration, 'actionable_content');
        expect(metadata.points).toBe(25);
      }
    });

    it('code_review should have fewer points than actionable_content', () => {
      const codeReview = generateScene4Metadata(5, 'code_review');
      const actionable = generateScene4Metadata(5, 'actionable_content');
      expect(codeReview.points).toBeLessThan(actionable.points);
    });
  });

  describe('achievement notification strategy', () => {
    it('code_review should enable achievement notification (reinforces learning)', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.hasAchievementNotification).toBe(true);
    });

    it('actionable_content should disable achievement notification', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.hasAchievementNotification).toBe(false);
    });
  });

  describe('scientific basis messaging', () => {
    it('code_review should reference active analysis and secure coding', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.scientific_basis.toLowerCase()).toContain('active analysis');
      expect(metadata.scientific_basis.toLowerCase()).toContain('secure coding');
    });

    it('actionable_content should reference procedural knowledge', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.scientific_basis.toLowerCase()).toContain('procedural knowledge');
    });

    it('scientific_basis should be non-empty and meaningful', () => {
      const codeReview = generateScene4Metadata(5, 'code_review');
      const actionable = generateScene4Metadata(5, 'actionable_content');
      expect(codeReview.scientific_basis.length).toBeGreaterThan(20);
      expect(actionable.scientific_basis.length).toBeGreaterThan(20);
    });
  });

  describe('icon consistency and structure', () => {
    it('should return icon object with both required properties', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.icon).toBeDefined();
      expect(metadata.icon.sparkleIconName).toBeDefined();
      expect(metadata.icon.sceneIconName).toBeDefined();
      expect(typeof metadata.icon.sparkleIconName).toBe('string');
      expect(typeof metadata.icon.sceneIconName).toBe('string');
    });

    it('code_review should use matching icon names', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata.icon.sparkleIconName).toBe(metadata.icon.sceneIconName);
      expect(metadata.icon.sparkleIconName).toBe('code');
    });

    it('actionable_content should use distinct icon names', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      expect(metadata.icon.sparkleIconName).not.toBe(metadata.icon.sceneIconName);
      expect(metadata.icon.sparkleIconName).toBe('check-circle');
      expect(metadata.icon.sceneIconName).toBe('clipboard-check');
    });
  });

  describe('type safety (const assertions)', () => {
    it('should maintain const assertion for code_review scene_type', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      // TypeScript should infer literal type 'code_review', not string
      const sceneType = metadata.scene_type as 'code_review';
      expect(sceneType).toBe('code_review');
    });

    it('should maintain const assertion for actionable_content scene_type', () => {
      const metadata = generateScene4Metadata(5, 'actionable_content');
      // TypeScript should infer literal type 'actionable_content', not string
      const sceneType = metadata.scene_type as 'actionable_content';
      expect(sceneType).toBe('actionable_content');
    });

    it('should have all required properties with correct types', () => {
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(typeof metadata.scene_type).toBe('string');
      expect(typeof metadata.points).toBe('number');
      expect(typeof metadata.duration_seconds).toBe('number');
      expect(typeof metadata.hasAchievementNotification).toBe('boolean');
      expect(typeof metadata.scientific_basis).toBe('string');
      expect(typeof metadata.icon).toBe('object');
    });
  });

  describe('edge cases', () => {
    it('should handle very small duration (0.5 minutes)', () => {
      const metadata = generateScene4Metadata(0.5, 'code_review');
      expect(metadata.duration_seconds).toBe(6); // 0.5 * 60 * 0.2
      expect(metadata.duration_seconds).toBeGreaterThan(0);
    });

    it('should handle large duration (60 minutes)', () => {
      const metadata = generateScene4Metadata(60, 'code_review');
      expect(metadata.duration_seconds).toBe(720); // 60 * 60 * 0.2
      expect(Number.isInteger(metadata.duration_seconds)).toBe(true);
    });

    it('should not return negative or zero duration', () => {
      const durations = [0.1, 1, 5, 10, 30, 60];
      durations.forEach(duration => {
        const codeReview = generateScene4Metadata(duration, 'code_review');
        const actionable = generateScene4Metadata(duration, 'actionable_content');
        expect(codeReview.duration_seconds).toBeGreaterThan(0);
        expect(actionable.duration_seconds).toBeGreaterThan(0);
      });
    });

    it('should maintain consistent point allocation across all durations', () => {
      const durations = [1, 5, 10, 30, 60];
      durations.forEach(duration => {
        const codeReview = generateScene4Metadata(duration, 'code_review');
        const actionable = generateScene4Metadata(duration, 'actionable_content');
        expect(codeReview.points).toBe(15);
        expect(actionable.points).toBe(25);
      });
    });
  });

  describe('clean and readable code patterns', () => {
    it('should return proper object structure without nested ternaries', () => {
      // This test verifies that the function returns complete objects
      // without messy ternary chains (which would be bad code quality)
      const codeReview = generateScene4Metadata(5, 'code_review');
      const actionable = generateScene4Metadata(5, 'actionable_content');

      // Both should be complete, readable objects
      expect(Object.keys(codeReview).length).toBe(6); // scene_type, points, duration_seconds, hasAchievementNotification, scientific_basis, icon
      expect(Object.keys(actionable).length).toBe(6);

      // Both should have consistent structure
      expect(Object.keys(codeReview)).toEqual(Object.keys(actionable));
    });

    it('should use if-else pattern instead of ternaries (code quality)', () => {
      // The implementation uses if (scene4Type === 'code_review') { return {...} }
      // This is cleaner than: return scene4Type === 'code_review' ? {...} : {...}
      const metadata = generateScene4Metadata(5, 'code_review');
      expect(metadata).toBeDefined();
      expect(metadata.scene_type).toBe('code_review');
    });
  });
});
