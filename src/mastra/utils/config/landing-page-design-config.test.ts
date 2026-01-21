import { describe, it, expect } from 'vitest';
import { LANDING_PAGE } from '../../constants';
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

  describe('layout sizing constants', () => {
    it('MINIMAL should use LANDING_PAGE.FORM_MAX_WIDTH_PX in cssRule', () => {
      const minimal = LAYOUT_OPTIONS.find(l => l.id === 'MINIMAL');
      expect(minimal).toBeDefined();
      if (!minimal) throw new Error('Expected MINIMAL layout to exist');
      expect(minimal.cssRule).toContain(`form { max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px;`);
    });

    it('HERO should use LANDING_PAGE hero sizing constants in cssRule', () => {
      const hero = LAYOUT_OPTIONS.find(l => l.id === 'HERO');
      expect(hero).toBeDefined();
      if (!hero) throw new Error('Expected HERO layout to exist');
      expect(hero.cssRule).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
      expect(hero.cssRule).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;`);
    });
  });
});
