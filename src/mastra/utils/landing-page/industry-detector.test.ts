import { describe, expect, it, vi, beforeEach } from 'vitest';
import { detectIndustry } from './industry-detector';
import { generateText } from 'ai';

// Mock dependencies
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('industry-detector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('detectIndustry', () => {
    it('uses regex fallback when no model provided', async () => {
      const result = await detectIndustry('Generic Corp', 'Just a business');
      expect(result.industry).toBe('Corporate');
      expect(vi.mocked(generateText)).not.toHaveBeenCalled();
    });

    it('regex detects Technology', async () => {
      const result = await detectIndustry('TechSoft', 'cloud computing software');
      expect(result.industry).toBe('Technology');
    });

    it('regex detects Healthcare', async () => {
      const result = await detectIndustry('MedCare', 'hospital services');
      expect(result.industry).toBe('Healthcare');
    });

    it('regex detects E-commerce', async () => {
      const result = await detectIndustry('Shoply', 'online retail marketplace');
      expect(result.industry).toBe('E-commerce');
    });

    it('regex detects Education', async () => {
      const result = await detectIndustry('EduAcademy', 'university student learning');
      expect(result.industry).toBe('Education');
    });

    it('regex detects Media & Entertainment', async () => {
      const result = await detectIndustry('StreamFlix', 'movie and video streaming');
      expect(result.industry).toBe('Media & Entertainment');
    });

    it('regex detects Government', async () => {
      const result = await detectIndustry('GovPortal', 'public service federal tax');
      expect(result.industry).toBe('Government');
    });

    it('regex detects Real Estate', async () => {
      const result = await detectIndustry('HomeFinder', 'property housing rental');
      expect(result.industry).toBe('Real Estate');
    });

    it('regex detects Hospitality & Travel', async () => {
      const result = await detectIndustry('VoyageHotels', 'travel booking hospitality');
      expect(result.industry).toBe('Hospitality & Travel');
    });

    it('regex detects Logistics & Delivery', async () => {
      const result = await detectIndustry('FastShip', 'package tracking delivery');
      expect(result.industry).toBe('Logistics & Delivery');
    });

    it('regex detects Social Media', async () => {
      const result = await detectIndustry('SocialConnect', 'linkedin profile connection');
      expect(result.industry).toBe('Social Media');
    });

    it('regex detects HR & Recruiting', async () => {
      const result = await detectIndustry('TalentPool', 'hiring payroll interview');
      expect(result.industry).toBe('HR & Recruiting');
    });

    it('regex detects Utilities & Energy', async () => {
      const result = await detectIndustry('PowerGrid', 'electricity bill payment');
      expect(result.industry).toBe('Utilities & Energy');
    });

    it('regex detects Telecommunications', async () => {
      const result = await detectIndustry('ConnectX', 'internet phone fiber broadband');
      expect(result.industry).toBe('Telecommunications');
    });

    it('scoring logic detects Technology over Banking when more Tech keywords are present', async () => {
      // "Finance" (Banking) vs "Tech", "Cloud" (Technology)
      const result = await detectIndustry('FinTech Solutions', 'Finance Tech Cloud Services');
      expect(result.industry).toBe('Technology');
    });

    it('scoring logic detects Utilities over Banking when more Utility keywords are present', async () => {
      // "Payment" (Banking) vs "Electricity", "Bill" (Utilities)
      const result = await detectIndustry('City Power', 'Electricity Bill Payment');
      expect(result.industry).toBe('Utilities & Energy');
    });

    it('provides correct design tokens for Banking & Finance', async () => {
      const result = await detectIndustry('Apex Bank', 'financial services');
      expect(result.colors.primary).toBe('#1e3a8a');
      expect(result.typography.headingClass).toBe('lp-heading-bank');
      expect(result.patterns.buttonStyle).toContain('background: #1e3a8a');
    });

    it('uses AI when model provided', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ industry: 'Banking & Finance' }),
      } as any);

      const result = await detectIndustry('Chase', 'Banking services', mockModel);
      expect(result.industry).toBe('Banking & Finance');
      expect(generateText).toHaveBeenCalled();
    });

    it('falls back to regex if AI fails (invalid JSON)', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: 'Invalid JSON',
      } as any);

      const result = await detectIndustry('Google', 'Search engine', mockModel);
      expect(result.industry).toBe('Technology');
    });

    it('falls back to Corporate if AI returns unknown industry and regex also fails', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ industry: 'Unknown Industry' }),
      } as any);

      // "Acme" + "Stuff" doesn't match any regex
      const result = await detectIndustry('Acme', 'Stuff', mockModel);
      expect(result.industry).toBe('Corporate');
    });

    it('handles AI throw and falls back to regex', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockRejectedValue(new Error('AI Error'));

      const result = await detectIndustry('Google', 'Search engine', mockModel);
      expect(result.industry).toBe('Technology');
    });

    it('cleans AI response before parsing', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: '```json\n{"industry": "Technology"}\n```',
      } as any);

      const result = await detectIndustry('Any', 'Any', mockModel);
      expect(result.industry).toBe('Technology');
    });
    it('falls back to regex if AI returns JSON without industry field', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ wrongKey: 'some value' }),
      } as any);

      // Should fall back to regex -> "Tech"
      const result = await detectIndustry('TechCorp', 'software', mockModel);
      expect(result.industry).toBe('Technology');
    });

    it('falls back to regex if AI returns industry as non-string', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ industry: 12345 }),
      } as any);

      // Should fall back to regex -> "Tech"
      const result = await detectIndustry('TechCorp', 'software', mockModel);
      expect(result.industry).toBe('Technology');
    });

    it('scoring logic tie-breaker: prefers first defined industry in map (Finance vs Tech)', async () => {
      // "Finance" (Banking) vs "Tech" (Technology)
      // If both have 1 match, and Finance is defined first in map, it should win.
      // Banking & Finance is defined before Technology in INDUSTRY_DESIGN_MAP
      const result = await detectIndustry('FinTech', 'Finance Tech');
      expect(result.industry).toBe('Banking & Finance');
    });
  });
});
