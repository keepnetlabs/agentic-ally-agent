import { describe, expect, it } from 'vitest';
import {
  getGenerationParams,
  DEFAULT_GENERATION_PARAMS,
  PHISHING_CONTENT_PARAMS,
  EXTRACTION_PARAMS,
  SCENE_GENERATION_PARAMS,
} from './llm-generation-params';

describe('llm-generation-params', () => {
  describe('getGenerationParams', () => {
    it('returns scene params for "scene" use case', () => {
      const params = getGenerationParams('scene');
      expect(params.temperature).toBe(0.82);
      expect(params.topP).toBe(0.91);
    });

    it('returns PHISHING_CONTENT_PARAMS for "phishing-content"', () => {
      const params = getGenerationParams('phishing-content');
      expect(params).toEqual(PHISHING_CONTENT_PARAMS);
    });

    it('returns EXTRACTION_PARAMS for "extraction"', () => {
      const params = getGenerationParams('extraction');
      expect(params).toEqual(EXTRACTION_PARAMS);
    });

    it('returns DEFAULT_GENERATION_PARAMS for unknown use case', () => {
      const params = getGenerationParams('unknown-use-case');
      expect(params).toEqual(DEFAULT_GENERATION_PARAMS);
    });

    it('returns DEFAULT_GENERATION_PARAMS for empty string', () => {
      const params = getGenerationParams('');
      expect(params).toEqual(DEFAULT_GENERATION_PARAMS);
    });

    it('returns params with temperature and optional topP', () => {
      const params = getGenerationParams('localization');
      expect(params).toHaveProperty('temperature');
      expect(typeof params.temperature).toBe('number');
    });
  });

  describe('DEFAULT_GENERATION_PARAMS', () => {
    it('has temperature and topP', () => {
      expect(DEFAULT_GENERATION_PARAMS).toHaveProperty('temperature');
      expect(DEFAULT_GENERATION_PARAMS).toHaveProperty('topP');
    });
  });

  describe('SCENE_GENERATION_PARAMS', () => {
    it('has params for scenes 1-8', () => {
      expect(Object.keys(SCENE_GENERATION_PARAMS).length).toBe(8);
      for (let i = 1; i <= 8; i++) {
        expect(SCENE_GENERATION_PARAMS[i as 1]).toBeDefined();
        expect(SCENE_GENERATION_PARAMS[i as 1].temperature).toBeDefined();
      }
    });
  });
});
