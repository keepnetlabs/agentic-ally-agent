import { describe, it, expect, vi } from 'vitest';
import { buildLandingPageSystemPrompt } from './landing-page-prompts';

const mockGetLoginPageSection = vi.fn(() => '## Login Page Section');
const mockGetSuccessPageSection = vi.fn(() => '## Success Page Section');
const mockGetInfoPageSection = vi.fn(() => '## Info Page Section');

describe('landing-page-prompts', () => {
  describe('buildLandingPageSystemPrompt', () => {
    const baseParams = {
      fromName: 'Acme Corp',
      emailBrandContext: undefined,
      emailUsesLogoTag: false,
      industryDesign: {
        industry: 'Technology',
        colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b' },
        patterns: {
          cardStyle: "background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1)",
          buttonStyle: "background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px",
          inputStyle: "border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px",
        },
      },
      randomLayout: {
        name: 'Centered',
        id: 'CENTERED',
        description: 'Classic centered card layout',
        cssRule: 'max-width: 480px; margin: 0 auto;',
      },
      randomStyle: { name: 'Modern', rules: 'Clean, minimal design' },
      requiredPages: ['login', 'success'] as const,
      isQuishing: false,
      getLoginPageSection: mockGetLoginPageSection,
      getSuccessPageSection: mockGetSuccessPageSection,
      getInfoPageSection: mockGetInfoPageSection,
    };

    const callPrompt = (overrides: Partial<typeof baseParams> = {}) => {
      const p = { ...baseParams, ...overrides };
      return buildLandingPageSystemPrompt(
        p.fromName,
        p.emailBrandContext,
        p.emailUsesLogoTag,
        p.industryDesign,
        p.randomLayout,
        p.randomStyle,
        p.requiredPages,
        p.isQuishing,
        p.getLoginPageSection,
        p.getSuccessPageSection,
        p.getInfoPageSection
      );
    };

    it('should return a string prompt', () => {
      const result = callPrompt();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(500);
    });

    it('should include fromName and industry', () => {
      const result = callPrompt();
      expect(result).toContain('Acme Corp');
      expect(result).toContain('Technology');
    });

    it('should include layout and style names', () => {
      const result = callPrompt();
      expect(result).toContain('Centered');
      expect(result).toContain('Modern');
    });

    it('should include design patterns from industryDesign', () => {
      const result = callPrompt();
      expect(result).toContain('border-radius: 16px');
      expect(result).toContain('background: #2563eb');
      expect(result).toContain('border: 1px solid #e2e8f0');
    });

    it('should call getLoginPageSection when login in requiredPages', () => {
      mockGetLoginPageSection.mockClear();
      callPrompt();
      expect(mockGetLoginPageSection).toHaveBeenCalled();
    });

    it('should include SPLIT layout rules when layout id is SPLIT', () => {
      const result = callPrompt({
        randomLayout: {
          name: 'Split',
          id: 'SPLIT',
          description: 'Split layout',
          cssRule: 'flex',
        },
      });
      expect(result).toContain('display: flex');
      expect(result).toContain('flex-wrap');
    });

    it('should include MINIMAL layout rules when layout id is MINIMAL', () => {
      const result = callPrompt({
        randomLayout: {
          name: 'Minimal',
          id: 'MINIMAL',
          description: 'Minimal layout',
          cssRule: 'minimal',
        },
      });
      expect(result).toContain('NO CARD CONTAINER');
      expect(result).toContain('max-width');
    });

    it('should include HERO layout rules when layout id is HERO', () => {
      const result = callPrompt({
        randomLayout: {
          name: 'Hero',
          id: 'HERO',
          description: 'Hero layout',
          cssRule: 'hero',
        },
      });
      expect(result).toContain('flex-direction: column');
      expect(result).toContain('hero');
    });

    it('should include quishing rule when isQuishing is true', () => {
      const result = callPrompt({ isQuishing: true });
      expect(result).toMatch(/QR|quishing|Quishing/i);
    });

    it('should include logo tag note when emailUsesLogoTag is true', () => {
      const result = callPrompt({ emailUsesLogoTag: true });
      expect(result).toContain('CUSTOMMAINLOGO');
    });
  });
});
