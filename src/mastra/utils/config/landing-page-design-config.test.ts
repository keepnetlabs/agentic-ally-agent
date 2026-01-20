import { describe, it, expect } from 'vitest';
import { getRandomLayout, getRandomStyle, LAYOUT_OPTIONS, STYLE_OPTIONS } from './landing-page-design-config';

describe('landing-page-design-config', () => {
  describe('getRandomLayout', () => {
    it('should return a valid layout option from available options', () => {
      // Run multiple times to increase chance of hitting different options (though not deterministic without mocking random)
      for (let i = 0; i < 20; i++) {
        const layout = getRandomLayout();
        expect(LAYOUT_OPTIONS).toContain(layout);
        expect(layout.id).toBeDefined();
        expect(layout.cssRule).toBeDefined();
      }
    });
  });

  describe('getRandomStyle', () => {
    it('should return a valid style option from available options', () => {
      for (let i = 0; i < 20; i++) {
        const style = getRandomStyle();
        expect(STYLE_OPTIONS).toContain(style);
        expect(style.id).toBeDefined();
        expect(style.rules).toBeDefined();
      }
    });
  });

  describe('configuration integrity', () => {
    it('should have unique IDs for layouts', () => {
      const ids = LAYOUT_OPTIONS.map(l => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs for styles', () => {
      const ids = STYLE_OPTIONS.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
