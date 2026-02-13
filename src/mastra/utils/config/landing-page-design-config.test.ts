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

    it('should return an object with all required properties', () => {
      const layout = getRandomLayout();
      expect(layout).toHaveProperty('id');
      expect(layout).toHaveProperty('name');
      expect(layout).toHaveProperty('description');
      expect(layout).toHaveProperty('cssRule');
    });

    it('should return a layout with non-empty id', () => {
      const layout = getRandomLayout();
      expect(layout.id).toBeTruthy();
      expect(layout.id.length).toBeGreaterThan(0);
    });

    it('should return a layout with non-empty name', () => {
      const layout = getRandomLayout();
      expect(layout.name).toBeTruthy();
      expect(layout.name.length).toBeGreaterThan(0);
    });

    it('should return a layout with non-empty description', () => {
      const layout = getRandomLayout();
      expect(layout.description).toBeTruthy();
      expect(layout.description.length).toBeGreaterThan(0);
    });

    it('should return a layout with non-empty cssRule', () => {
      const layout = getRandomLayout();
      expect(layout.cssRule).toBeTruthy();
      expect(layout.cssRule.length).toBeGreaterThan(0);
    });

    it('should return different layouts over multiple calls', () => {
      const layouts = new Set<string>();
      // With 50 iterations and 4 options, very high probability of hitting multiple layouts
      for (let i = 0; i < 50; i++) {
        const layout = getRandomLayout();
        layouts.add(layout.id);
      }
      // Should get at least 2 different layouts
      expect(layouts.size).toBeGreaterThan(1);
    });

    it('should always return one of the 4 defined layouts', () => {
      for (let i = 0; i < 30; i++) {
        const layout = getRandomLayout();
        const ids = LAYOUT_OPTIONS.map(l => l.id);
        expect(ids).toContain(layout.id);
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

    it('should return an object with all required properties', () => {
      const style = getRandomStyle();
      expect(style).toHaveProperty('id');
      expect(style).toHaveProperty('name');
      expect(style).toHaveProperty('rules');
    });

    it('should return a style with non-empty id', () => {
      const style = getRandomStyle();
      expect(style.id).toBeTruthy();
      expect(style.id.length).toBeGreaterThan(0);
    });

    it('should return a style with non-empty name', () => {
      const style = getRandomStyle();
      expect(style.name).toBeTruthy();
      expect(style.name.length).toBeGreaterThan(0);
    });

    it('should return a style with non-empty rules', () => {
      const style = getRandomStyle();
      expect(style.rules).toBeTruthy();
      expect(style.rules.length).toBeGreaterThan(0);
    });

    it('should return different styles over multiple calls', () => {
      const styles = new Set<string>();
      // With 30 iterations and 3 options, very high probability of hitting all styles
      for (let i = 0; i < 30; i++) {
        const style = getRandomStyle();
        styles.add(style.id);
      }
      // Should get at least 2 different styles
      expect(styles.size).toBeGreaterThan(1);
    });

    it('should always return one of the 3 defined styles', () => {
      for (let i = 0; i < 30; i++) {
        const style = getRandomStyle();
        const ids = STYLE_OPTIONS.map(s => s.id);
        expect(ids).toContain(style.id);
      }
    });
  });

  describe('LAYOUT_OPTIONS', () => {
    it('should have exactly 4 layout options', () => {
      expect(LAYOUT_OPTIONS).toHaveLength(4);
    });

    it('should have all layouts with required properties', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(layout).toHaveProperty('id');
        expect(layout).toHaveProperty('name');
        expect(layout).toHaveProperty('description');
        expect(layout).toHaveProperty('cssRule');
      });
    });

    it('should have all layouts with non-empty id', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(layout.id).toBeTruthy();
        expect(typeof layout.id).toBe('string');
        expect(layout.id.length).toBeGreaterThan(0);
      });
    });

    it('should have all layouts with non-empty name', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(layout.name).toBeTruthy();
        expect(typeof layout.name).toBe('string');
        expect(layout.name.length).toBeGreaterThan(0);
      });
    });

    it('should have all layouts with non-empty description', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(layout.description).toBeTruthy();
        expect(typeof layout.description).toBe('string');
        expect(layout.description.length).toBeGreaterThan(0);
      });
    });

    it('should have all layouts with non-empty cssRule', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(layout.cssRule).toBeTruthy();
        expect(typeof layout.cssRule).toBe('string');
        expect(layout.cssRule.length).toBeGreaterThan(0);
      });
    });

    describe('CENTERED layout', () => {
      const centered = LAYOUT_OPTIONS.find(l => l.id === 'CENTERED');

      it('should exist', () => {
        expect(centered).toBeDefined();
      });

      it('should have correct name', () => {
        expect(centered?.name).toBe('CENTERED CARD (Classic)');
      });

      it('should have meaningful description', () => {
        expect(centered?.description).toContain('centered');
        expect(centered?.description.length).toBeGreaterThan(20);
      });

      it('should have cssRule with display flex', () => {
        expect(centered?.cssRule).toContain('display: flex');
      });

      it('should have cssRule with align-items center', () => {
        expect(centered?.cssRule).toContain('align-items: center');
      });

      it('should have cssRule with max-width', () => {
        expect(centered?.cssRule).toContain('max-width: 420px');
      });

      it('should have cssRule with card styling', () => {
        expect(centered?.cssRule).toContain('.card');
      });
    });

    describe('SPLIT layout', () => {
      const split = LAYOUT_OPTIONS.find(l => l.id === 'SPLIT');

      it('should exist', () => {
        expect(split).toBeDefined();
      });

      it('should have correct name', () => {
        expect(split?.name).toBe('SPLIT SCREEN (Enterprise)');
      });

      it('should have meaningful description', () => {
        expect(split?.description).toContain('Split');
        expect(split?.description.length).toBeGreaterThan(20);
      });

      it('should have cssRule with brand-side', () => {
        expect(split?.cssRule).toContain('.brand-side');
      });

      it('should have cssRule with form-side', () => {
        expect(split?.cssRule).toContain('.form-side');
      });

      it('should have cssRule with flex layout', () => {
        expect(split?.cssRule).toContain('display: flex');
      });

      it('should have cssRule with min-height 100vh', () => {
        expect(split?.cssRule).toContain('min-height: 100vh');
      });
    });

    describe('MINIMAL layout', () => {
      const minimal = LAYOUT_OPTIONS.find(l => l.id === 'MINIMAL');

      it('should exist', () => {
        expect(minimal).toBeDefined();
      });

      it('should have correct name', () => {
        expect(minimal?.name).toBe('MINIMAL / URGENT (Alert)');
      });

      it('should have meaningful description', () => {
        expect(minimal?.description).toContain('simple');
        expect(minimal?.description.length).toBeGreaterThan(20);
      });

      it('should use FORM_MAX_WIDTH_PX constant', () => {
        expect(minimal?.cssRule).toContain(`max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px`);
      });

      it('should have cssRule with body styling', () => {
        expect(minimal?.cssRule).toContain('body {');
      });

      it('should have cssRule with form styling', () => {
        expect(minimal?.cssRule).toContain('form {');
      });

      it('should have cssRule with white background', () => {
        expect(minimal?.cssRule).toContain('background-color: #ffffff');
      });
    });

    describe('HERO layout', () => {
      const hero = LAYOUT_OPTIONS.find(l => l.id === 'HERO');

      it('should exist', () => {
        expect(hero).toBeDefined();
      });

      it('should have correct name', () => {
        expect(hero?.name).toBe('HERO HEADER (Marketing/Promo)');
      });

      it('should have meaningful description', () => {
        expect(hero?.description).toContain('hero');
        expect(hero?.description.length).toBeGreaterThan(20);
      });

      it('should use HERO_MAIN_CONTAINER_MAX_WIDTH_PX constant', () => {
        expect(hero?.cssRule).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px`);
      });

      it('should use HERO_MAIN_CONTAINER_MARGIN_TOP_PX constant', () => {
        expect(hero?.cssRule).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0`);
      });

      it('should have cssRule with hero section', () => {
        expect(hero?.cssRule).toContain('.hero');
      });

      it('should have cssRule with main-container', () => {
        expect(hero?.cssRule).toContain('.main-container');
      });

      it('should have cssRule with hero height', () => {
        expect(hero?.cssRule).toContain('height: 220px');
      });
    });
  });

  describe('STYLE_OPTIONS', () => {
    it('should have exactly 3 style options', () => {
      expect(STYLE_OPTIONS).toHaveLength(3);
    });

    it('should have all styles with required properties', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(style).toHaveProperty('id');
        expect(style).toHaveProperty('name');
        expect(style).toHaveProperty('rules');
      });
    });

    it('should have all styles with non-empty id', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(style.id).toBeTruthy();
        expect(typeof style.id).toBe('string');
        expect(style.id.length).toBeGreaterThan(0);
      });
    });

    it('should have all styles with non-empty name', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(style.name).toBeTruthy();
        expect(typeof style.name).toBe('string');
        expect(style.name.length).toBeGreaterThan(0);
      });
    });

    it('should have all styles with non-empty rules', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(style.rules).toBeTruthy();
        expect(typeof style.rules).toBe('string');
        expect(style.rules.length).toBeGreaterThan(0);
      });
    });

    describe('SOFT style', () => {
      const soft = STYLE_OPTIONS.find(s => s.id === 'SOFT');

      it('should exist', () => {
        expect(soft).toBeDefined();
      });

      it('should have correct name', () => {
        expect(soft?.name).toBe('Soft & Modern');
      });

      it('should have rules mentioning border-radius', () => {
        expect(soft?.rules).toContain('Border-radius');
      });

      it('should have rules mentioning box-shadow', () => {
        expect(soft?.rules).toContain('Box-shadow');
      });

      it('should have rules mentioning padding', () => {
        expect(soft?.rules).toContain('Padding');
      });

      it('should have rules mentioning buttons', () => {
        expect(soft?.rules).toContain('Buttons');
      });

      it('should specify spacious padding', () => {
        expect(soft?.rules).toContain('32px');
      });
    });

    describe('SHARP style', () => {
      const sharp = STYLE_OPTIONS.find(s => s.id === 'SHARP');

      it('should exist', () => {
        expect(sharp).toBeDefined();
      });

      it('should have correct name', () => {
        expect(sharp?.name).toBe('Sharp & Corporate');
      });

      it('should have rules mentioning border-radius', () => {
        expect(sharp?.rules).toContain('Border-radius');
      });

      it('should have rules mentioning box-shadow', () => {
        expect(sharp?.rules).toContain('Box-shadow');
      });

      it('should have rules mentioning border', () => {
        expect(sharp?.rules).toContain('Border');
      });

      it('should have rules mentioning compact padding', () => {
        expect(sharp?.rules).toContain('Compact');
      });

      it('should specify small border-radius values', () => {
        expect(sharp?.rules).toContain('2px to 4px');
      });
    });

    describe('FLAT style', () => {
      const flat = STYLE_OPTIONS.find(s => s.id === 'FLAT');

      it('should exist', () => {
        expect(flat).toBeDefined();
      });

      it('should have correct name', () => {
        expect(flat?.name).toBe('Flat & High Contrast');
      });

      it('should have rules mentioning border-radius', () => {
        expect(flat?.rules).toContain('Border-radius');
      });

      it('should have rules mentioning no shadow', () => {
        expect(flat?.rules).toContain('No shadow');
      });

      it('should have rules mentioning border', () => {
        expect(flat?.rules).toContain('Border');
      });

      it('should have rules mentioning strong borders', () => {
        expect(flat?.rules).toContain('strong');
      });

      it('should specify medium border-radius', () => {
        expect(flat?.rules).toContain('6px');
      });
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

    it('should have unique names for layouts', () => {
      const names = LAYOUT_OPTIONS.map(l => l.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have unique names for styles', () => {
      const names = STYLE_OPTIONS.map(s => s.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have all layout IDs in uppercase', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(layout.id).toBe(layout.id.toUpperCase());
      });
    });

    it('should have all style IDs in uppercase', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(style.id).toBe(style.id.toUpperCase());
      });
    });

    it('should have layout IDs as valid CSS identifiers', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        // Should not contain spaces or special chars (except underscore)
        expect(layout.id).toMatch(/^[A-Z_]+$/);
      });
    });

    it('should have style IDs as valid CSS identifiers', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(style.id).toMatch(/^[A-Z_]+$/);
      });
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

    it('should use numeric constants from LANDING_PAGE', () => {
      expect(typeof LANDING_PAGE.FORM_MAX_WIDTH_PX).toBe('number');
      expect(typeof LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX).toBe('number');
      expect(typeof LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX).toBe('number');
    });

    it('should have valid numeric values in constants', () => {
      // Max-width values should be positive
      expect(LANDING_PAGE.FORM_MAX_WIDTH_PX).toBeGreaterThan(0);
      expect(LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX).toBeGreaterThan(0);
      // Margin can be negative (negative margins are valid in CSS)
      expect(typeof LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX).toBe('number');
    });
  });

  describe('edge cases and immutability', () => {
    it('LAYOUT_OPTIONS should be an array', () => {
      expect(Array.isArray(LAYOUT_OPTIONS)).toBe(true);
    });

    it('STYLE_OPTIONS should be an array', () => {
      expect(Array.isArray(STYLE_OPTIONS)).toBe(true);
    });

    it('should not have empty LAYOUT_OPTIONS', () => {
      expect(LAYOUT_OPTIONS.length).toBeGreaterThan(0);
    });

    it('should not have empty STYLE_OPTIONS', () => {
      expect(STYLE_OPTIONS.length).toBeGreaterThan(0);
    });

    it('each layout should be a plain object', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        expect(typeof layout).toBe('object');
        expect(layout).not.toBeNull();
      });
    });

    it('each style should be a plain object', () => {
      STYLE_OPTIONS.forEach(style => {
        expect(typeof style).toBe('object');
        expect(style).not.toBeNull();
      });
    });
  });

  describe('consistency across configurations', () => {
    it('all layouts should follow same property naming', () => {
      const firstLayout = LAYOUT_OPTIONS[0];
      const propertyNames = Object.keys(firstLayout).sort();

      LAYOUT_OPTIONS.forEach(layout => {
        const layoutProps = Object.keys(layout).sort();
        expect(layoutProps).toEqual(propertyNames);
      });
    });

    it('all styles should follow same property naming', () => {
      const firstStyle = STYLE_OPTIONS[0];
      const propertyNames = Object.keys(firstStyle).sort();

      STYLE_OPTIONS.forEach(style => {
        const styleProps = Object.keys(style).sort();
        expect(styleProps).toEqual(propertyNames);
      });
    });

    it('layout descriptions should be informative', () => {
      LAYOUT_OPTIONS.forEach(layout => {
        // Description should be at least 20 characters
        expect(layout.description.length).toBeGreaterThan(20);
        // Should not be just the name
        expect(layout.description).not.toBe(layout.name);
      });
    });

    it('style rules should be informative', () => {
      STYLE_OPTIONS.forEach(style => {
        // Rules should be at least 20 characters
        expect(style.rules.length).toBeGreaterThan(20);
        // Should not be just the name
        expect(style.rules).not.toBe(style.name);
      });
    });
  });
});
