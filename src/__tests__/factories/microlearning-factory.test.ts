/**
 * Unit tests for microlearning factory
 */
import { describe, it, expect } from 'vitest';
import { createMicrolearningContent, createLanguageContent } from './microlearning-factory';

describe('microlearning-factory', () => {
  describe('createMicrolearningContent', () => {
    it('should create minimal valid content with defaults', () => {
      const content = createMicrolearningContent();
      expect(content.microlearning_id).toBe('ml-test-123');
      expect(content.microlearning_metadata.title).toBe('Test Training');
      expect(content.microlearning_metadata.category).toBe('Security');
      expect(content.scenes).toEqual([]);
    });

    it('should allow microlearning_id override', () => {
      const content = createMicrolearningContent({ microlearning_id: 'ml-custom-456' });
      expect(content.microlearning_id).toBe('ml-custom-456');
    });

    it('should allow metadata overrides', () => {
      const content = createMicrolearningContent({
        microlearning_metadata: { title: 'Custom Title', level: 'Beginner' },
      });
      expect(content.microlearning_metadata.title).toBe('Custom Title');
      expect(content.microlearning_metadata.level).toBe('Beginner');
    });

    it('should allow scenes override', () => {
      const scenes = [{ scene_type: 'intro', id: '1' }] as any;
      const content = createMicrolearningContent({ scenes });
      expect(content.scenes).toEqual(scenes);
    });
  });

  describe('createLanguageContent', () => {
    it('should create minimal valid language content', () => {
      const content = createLanguageContent();
      expect(content['1']).toBeDefined();
      expect(content['1'].scene_type).toBe('intro');
      expect(content['1'].title).toBe('Test Scene');
    });

    it('should allow overrides', () => {
      const content = createLanguageContent({ '1': { title: 'Custom Scene', scene_type: 'intro' } } as any);
      expect(content['1'].title).toBe('Custom Scene');
    });
  });
});
