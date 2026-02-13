import { describe, expect, it } from 'vitest';
import {
  getLoginTemplateExample,
  getSuccessTemplateExample,
  getInfoTemplateExample,
  getFooterHTML,
  getLoginPageSection,
  getSuccessPageSection,
  getInfoPageSection,
  TemplateParams,
} from './landing-page-templates';

describe('landing-page-templates', () => {
  const mockParams: TemplateParams = {
    fromName: 'Test Corp',
    industryDesign: {
      industry: 'tech',
      colors: {
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#ff0000',
      },
      patterns: {
        cardStyle: 'background: white;',
        buttonStyle: 'background: black;',
        inputStyle: 'border: 1px solid gray;',
      },
    },
  };

  describe('getFooterHTML', () => {
    it('includes fromName and placeholder links', () => {
      const html = getFooterHTML('Test Corp');
      expect(html).toContain('Test Corp');
      expect(html).toContain('{PHISHINGURL}');
    });
  });

  describe('getLoginTemplateExample', () => {
    it('generates login page with correct structure', () => {
      const html = getLoginTemplateExample(mockParams);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Sign in to Test Corp');
      expect(html).toContain('{CUSTOMMAINLOGO}'); // Logo placeholder
      expect(html).toContain(mockParams.industryDesign.patterns.cardStyle);
      expect(html).toContain(mockParams.industryDesign.patterns.buttonStyle);
      expect(html).toContain('trackId'); // Hidden tracking field
    });
  });

  describe('getSuccessTemplateExample', () => {
    it('generates success page section', () => {
      const html = getSuccessTemplateExample(mockParams);
      expect(html).toContain('Account updated');
      expect(html).toContain('Test Corp');
      // Should not have form input
      expect(html).not.toContain('<input');
      expect(html).toContain('background: white;'); // check if cardStyle pattern is rendered
      expect(html).toContain('#22c55e'); // Green success color

      // Layout Regression Tests (User Req: "Standard Layout Patterns")
      // 1. Centering Check: Fixed width cards must have margin: 0 auto
      // note: we check for the pattern, might be inline style
      const centeringPattern = /margin:\s*0\s+auto/;
      expect(html).toMatch(centeringPattern);

      // 2. Icon Nesting Check: Checkmark (✓) must be INSIDE the green circle (div)
      // We look for the green background div immediately followed by content containing the checkmark
      // Correct: <div ... background:#22c55e ...> ... ✓ ... </div>
      // This is a simplified check assuming the icon is within the same div
      // 2. Icon Nesting Check: Checkmark (✓) must be INSIDE the green circle (div)
      // Regex explanation:
      // background:\s*#22c55e  -> matches background color with optional space
      // [^>]*>                 -> matches rest of opening tag and closing bracket
      // .*                     -> matches any content (s flag enabled)
      // ✓                     -> matches the checkmark
      // .*                     -> matches any content
      // <\/div>                -> matches closing div
      const iconContainerRegex = /background:\s*#22c55e[^>]*>.*✓.*<\/div>/s;
      expect(html).toMatch(iconContainerRegex);
    });
  });

  describe('getInfoTemplateExample', () => {
    it('generates info page section', () => {
      const html = getInfoTemplateExample(mockParams);
      expect(html).toContain('Policy update');
      expect(html).toContain('Test Corp');
      expect(html).toContain('View full policy');
    });
  });

  describe('Section Generators', () => {
    it('getLoginPageSection includes description and template', () => {
      const section = getLoginPageSection(mockParams);
      expect(section).toContain('### 1. LOGIN PAGE');
      expect(section).toContain('<!DOCTYPE html>');
      expect(section).toContain('LOGIN VALIDATION');
    });

    it('getSuccessPageSection includes description and template', () => {
      const section = getSuccessPageSection(mockParams);
      expect(section).toContain('### 2. SUCCESS PAGE');
      expect(section).toContain('<!DOCTYPE html>');
    });

    it('getInfoPageSection includes description and template', () => {
      const section = getInfoPageSection(mockParams);
      expect(section).toContain('### 3. INFO/DOCUMENT PAGE');
      expect(section).toContain('<!DOCTYPE html>');
    });
  });
});
