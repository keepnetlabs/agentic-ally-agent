import { describe, it, expect } from 'vitest';
import {
  SceneMetadataSchema,
  MicrolearningMetadataSchema,
  MicrolearningContentSchema,
} from './microlearning-schema';

describe('Microlearning Schema Validation', () => {
  describe('SceneMetadataSchema', () => {
    const validMetadata = {
      scene_type: 'intro' as const,
      points: 10,
      duration_seconds: 30,
      hasAchievementNotification: true,
      scientific_basis: 'Spaced repetition theory',
      icon: {
        sceneIconName: 'info-circle',
        sparkleIconName: 'sparkle',
      },
    };

    it('should validate scene metadata', () => {
      const result = SceneMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should accept all scene types', () => {
      const types = [
        'intro',
        'goal',
        'scenario',
        'actionable_content',
        'code_review',
        'vishing_simulation',
        'smishing_simulation',
        'quiz',
        'survey',
        'nudge',
        'summary',
      ];

      types.forEach((type) => {
        const result = SceneMetadataSchema.safeParse({
          ...validMetadata,
          scene_type: type as any,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid scene type', () => {
      const result = SceneMetadataSchema.safeParse({
        ...validMetadata,
        scene_type: 'invalid_scene',
      });
      expect(result.success).toBe(false);
    });

    it('should validate non-negative points', () => {
      expect(
        SceneMetadataSchema.safeParse({
          ...validMetadata,
          points: 0,
        }).success
      ).toBe(true);

      expect(
        SceneMetadataSchema.safeParse({
          ...validMetadata,
          points: -1,
        }).success
      ).toBe(false);
    });

    it('should require positive duration_seconds', () => {
      expect(
        SceneMetadataSchema.safeParse({
          ...validMetadata,
          duration_seconds: 0,
        }).success
      ).toBe(false);

      expect(
        SceneMetadataSchema.safeParse({
          ...validMetadata,
          duration_seconds: 1,
        }).success
      ).toBe(true);
    });

    it('should accept optional sparkleIconName', () => {
      const result = SceneMetadataSchema.safeParse({
        ...validMetadata,
        icon: {
          sceneIconName: 'info-circle',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('MicrolearningMetadataSchema', () => {
    const validMetadata = {
      title: 'Phishing Awareness',
      category: 'Security',
      subcategory: 'Email Security',
      industry_relevance: ['Technology', 'Finance'],
      department_relevance: ['IT', 'HR'],
      role_relevance: ['Employee', 'Manager'],
      regulation_compliance: ['GDPR', 'HIPAA'],
      risk_area: 'Social Engineering',
      content_provider: 'SecurityTeam',
      level: 'Intermediate' as const,
      ethical_inclusive_language_policy: {},
      language_availability: ['en-gb', 'tr-tr'],
      gamification_enabled: true,
      total_points: 100,
    };

    it('should validate microlearning metadata', () => {
      const result = MicrolearningMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should accept all training levels', () => {
      const levels = ['Beginner', 'Intermediate', 'Advanced'];
      levels.forEach((level) => {
        const result = MicrolearningMetadataSchema.safeParse({
          ...validMetadata,
          level: level as any,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept empty arrays for relevance fields', () => {
      const result = MicrolearningMetadataSchema.safeParse({
        ...validMetadata,
        industry_relevance: [],
        department_relevance: [],
        role_relevance: [],
        regulation_compliance: [],
      });
      expect(result.success).toBe(true);
    });

    it('should require positive total_points', () => {
      expect(
        MicrolearningMetadataSchema.safeParse({
          ...validMetadata,
          total_points: 0,
        }).success
      ).toBe(false);

      expect(
        MicrolearningMetadataSchema.safeParse({
          ...validMetadata,
          total_points: 1,
        }).success
      ).toBe(true);
    });
  });

  describe('MicrolearningContentSchema', () => {
    const validContent = {
      microlearning_id: 'ml-001',
      microlearning_metadata: {
        title: 'Test',
        category: 'Security',
        subcategory: 'Email',
        industry_relevance: [],
        department_relevance: [],
        role_relevance: [],
        regulation_compliance: [],
        risk_area: 'Phishing',
        content_provider: 'Team',
        level: 'Beginner' as const,
        ethical_inclusive_language_policy: {},
        language_availability: ['en-gb'],
        gamification_enabled: true,
        total_points: 100,
      },
      scientific_evidence: {},
      theme: {
        fontFamily: { heading: 'Arial', body: 'Verdana' },
      },
      scenes: Array(8)
        .fill(null)
        .map((_, i) => ({
          scene_id: `scene-${i}`,
          metadata: {
            scene_type: 'intro' as const,
            points: 10,
            duration_seconds: 30,
            hasAchievementNotification: true,
            scientific_basis: 'Theory',
            icon: { sceneIconName: 'icon' },
          },
        })),
    };

    it('should validate complete microlearning content', () => {
      const result = MicrolearningContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should require at least 8 scenes', () => {
      const result = MicrolearningContentSchema.safeParse({
        ...validContent,
        scenes: validContent.scenes.slice(0, 7),
      });
      expect(result.success).toBe(false);
    });

    it('should accept exactly 8 scenes', () => {
      const result = MicrolearningContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should accept empty theme', () => {
      const result = MicrolearningContentSchema.safeParse({
        ...validContent,
        theme: {},
      });
      expect(result.success).toBe(true);
    });
  });
});
