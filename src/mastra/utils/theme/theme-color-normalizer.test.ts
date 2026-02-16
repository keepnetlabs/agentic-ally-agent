import { describe, expect, it, vi, beforeEach } from 'vitest';
import { normalizeThemeBackgroundClass } from './theme-color-normalizer';
import { generateText } from 'ai';
import { THEME_COLORS } from '../../constants';

// Mock AI
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock logger
vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock model providers
vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(() => 'mocked-model'),
}));

describe('theme-color-normalizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid Theme Classes (Direct Return)', () => {
    it('returns input if valid theme class', async () => {
      const validClass = THEME_COLORS.VALUES[0];
      const result = await normalizeThemeBackgroundClass(validClass);
      expect(result).toBe(validClass);
    });

    it('returns each valid theme class unchanged', async () => {
      for (const validClass of THEME_COLORS.VALUES) {
        const result = await normalizeThemeBackgroundClass(validClass);
        expect(result).toBe(validClass);
      }
    });

    it('does not call generateText for valid classes', async () => {
      await normalizeThemeBackgroundClass('bg-gradient-blue');
      expect(generateText).not.toHaveBeenCalled();
    });

    it('handles bg-gradient-red', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-red');
      expect(result).toBe('bg-gradient-red');
    });

    it('handles bg-gradient-orange', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-orange');
      expect(result).toBe('bg-gradient-orange');
    });

    it('handles bg-gradient-amber', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-amber');
      expect(result).toBe('bg-gradient-amber');
    });

    it('handles bg-gradient-green', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-green');
      expect(result).toBe('bg-gradient-green');
    });

    it('handles bg-gradient-teal', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-teal');
      expect(result).toBe('bg-gradient-teal');
    });

    it('handles bg-gradient-blue', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-blue');
      expect(result).toBe('bg-gradient-blue');
    });

    it('handles bg-gradient-indigo', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-indigo');
      expect(result).toBe('bg-gradient-indigo');
    });

    it('handles bg-gradient-purple', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-purple');
      expect(result).toBe('bg-gradient-purple');
    });

    it('handles bg-gradient-pink', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-pink');
      expect(result).toBe('bg-gradient-pink');
    });

    it('handles bg-gradient-gray', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-gray');
      expect(result).toBe('bg-gradient-gray');
    });

    it('handles bg-gradient-light-blue', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-light-blue');
      expect(result).toBe('bg-gradient-light-blue');
    });
  });

  describe('Brand Presets (Level 1) - Big Tech', () => {
    it('uses brand presets deterministically (Level 1)', async () => {
      const result = await normalizeThemeBackgroundClass('amazon colors');
      expect(result).toBe('bg-gradient-orange');
    });

    it('maps amazon to orange', async () => {
      expect(await normalizeThemeBackgroundClass('amazon')).toBe('bg-gradient-orange');
    });

    it('maps aws to orange', async () => {
      expect(await normalizeThemeBackgroundClass('aws')).toBe('bg-gradient-orange');
    });

    it('maps microsoft to blue', async () => {
      expect(await normalizeThemeBackgroundClass('microsoft')).toBe('bg-gradient-blue');
    });

    it('maps azure to blue', async () => {
      expect(await normalizeThemeBackgroundClass('azure')).toBe('bg-gradient-blue');
    });

    it('maps google to light-blue', async () => {
      expect(await normalizeThemeBackgroundClass('google')).toBe('bg-gradient-light-blue');
    });

    it('maps gmail to light-blue', async () => {
      expect(await normalizeThemeBackgroundClass('gmail')).toBe('bg-gradient-light-blue');
    });

    it('maps workspace to light-blue', async () => {
      expect(await normalizeThemeBackgroundClass('workspace')).toBe('bg-gradient-light-blue');
    });

    it('maps apple to gray', async () => {
      expect(await normalizeThemeBackgroundClass('apple')).toBe('bg-gradient-gray');
    });

    it('maps icloud to gray', async () => {
      expect(await normalizeThemeBackgroundClass('icloud')).toBe('bg-gradient-gray');
    });

    it('maps meta to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('meta')).toBe('bg-gradient-indigo');
    });

    it('maps facebook to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('facebook')).toBe('bg-gradient-indigo');
    });

    it('maps instagram to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('instagram')).toBe('bg-gradient-indigo');
    });

    it('maps stripe to purple', async () => {
      expect(await normalizeThemeBackgroundClass('stripe')).toBe('bg-gradient-purple');
    });

    it('maps slack to teal', async () => {
      expect(await normalizeThemeBackgroundClass('slack')).toBe('bg-gradient-teal');
    });

    it('maps github to gray', async () => {
      expect(await normalizeThemeBackgroundClass('github')).toBe('bg-gradient-gray');
    });

    it('maps gitlab to gray', async () => {
      expect(await normalizeThemeBackgroundClass('gitlab')).toBe('bg-gradient-gray');
    });

    it('maps linkedin to blue', async () => {
      expect(await normalizeThemeBackgroundClass('linkedin')).toBe('bg-gradient-blue');
    });

    it('maps x to gray', async () => {
      expect(await normalizeThemeBackgroundClass('x')).toBe('bg-gradient-gray');
    });

    it('maps twitter to gray', async () => {
      expect(await normalizeThemeBackgroundClass('twitter')).toBe('bg-gradient-gray');
    });

    it('maps netflix to red', async () => {
      expect(await normalizeThemeBackgroundClass('netflix')).toBe('bg-gradient-red');
    });

    it('maps uber to gray', async () => {
      expect(await normalizeThemeBackgroundClass('uber')).toBe('bg-gradient-gray');
    });

    it('maps airbnb to pink', async () => {
      expect(await normalizeThemeBackgroundClass('airbnb')).toBe('bg-gradient-pink');
    });

    it('maps shopify to green', async () => {
      expect(await normalizeThemeBackgroundClass('shopify')).toBe('bg-gradient-green');
    });

    it('is case-insensitive for brand names', async () => {
      expect(await normalizeThemeBackgroundClass('AMAZON')).toBe('bg-gradient-orange');
      expect(await normalizeThemeBackgroundClass('Amazon')).toBe('bg-gradient-orange');
      expect(await normalizeThemeBackgroundClass('aMaZoN')).toBe('bg-gradient-orange');
    });

    it('works with brand name in sentence', async () => {
      expect(await normalizeThemeBackgroundClass('use amazon colors')).toBe('bg-gradient-orange');
      expect(await normalizeThemeBackgroundClass('google style theme')).toBe('bg-gradient-light-blue');
    });
  });

  describe('Brand Presets (Level 1) - More Tech Companies', () => {
    it('maps salesforce to light-blue', async () => {
      expect(await normalizeThemeBackgroundClass('salesforce')).toBe('bg-gradient-light-blue');
    });

    it('maps oracle to red', async () => {
      expect(await normalizeThemeBackgroundClass('oracle')).toBe('bg-gradient-red');
    });

    it('maps ibm to blue', async () => {
      expect(await normalizeThemeBackgroundClass('ibm')).toBe('bg-gradient-blue');
    });

    it('maps sap to blue', async () => {
      expect(await normalizeThemeBackgroundClass('sap')).toBe('bg-gradient-blue');
    });

    it('maps adobe to red', async () => {
      expect(await normalizeThemeBackgroundClass('adobe')).toBe('bg-gradient-red');
    });

    it('maps zoom to blue', async () => {
      expect(await normalizeThemeBackgroundClass('zoom')).toBe('bg-gradient-blue');
    });

    it('maps dropbox to blue', async () => {
      expect(await normalizeThemeBackgroundClass('dropbox')).toBe('bg-gradient-blue');
    });

    it('maps atlassian to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('atlassian')).toBe('bg-gradient-indigo');
    });

    it('maps jira to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('jira')).toBe('bg-gradient-indigo');
    });

    it('maps confluence to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('confluence')).toBe('bg-gradient-indigo');
    });

    it('maps notion to gray', async () => {
      expect(await normalizeThemeBackgroundClass('notion')).toBe('bg-gradient-gray');
    });

    it('maps figma to purple', async () => {
      expect(await normalizeThemeBackgroundClass('figma')).toBe('bg-gradient-purple');
    });

    it('maps paypal to blue', async () => {
      expect(await normalizeThemeBackgroundClass('paypal')).toBe('bg-gradient-blue');
    });

    it('maps visa to blue', async () => {
      expect(await normalizeThemeBackgroundClass('visa')).toBe('bg-gradient-blue');
    });

    it('maps mastercard to orange', async () => {
      expect(await normalizeThemeBackgroundClass('mastercard')).toBe('bg-gradient-orange');
    });

    it('maps american express to blue', async () => {
      expect(await normalizeThemeBackgroundClass('american express')).toBe('bg-gradient-blue');
    });

    it('maps amex to blue', async () => {
      expect(await normalizeThemeBackgroundClass('amex')).toBe('bg-gradient-blue');
    });

    it('maps openai to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('openai')).toBe('bg-gradient-indigo');
    });

    it('maps anthropic to amber', async () => {
      expect(await normalizeThemeBackgroundClass('anthropic')).toBe('bg-gradient-amber');
    });

    it('maps nvidia to green', async () => {
      expect(await normalizeThemeBackgroundClass('nvidia')).toBe('bg-gradient-green');
    });

    it('maps intel to blue', async () => {
      expect(await normalizeThemeBackgroundClass('intel')).toBe('bg-gradient-blue');
    });

    it('maps amd to red', async () => {
      expect(await normalizeThemeBackgroundClass('amd')).toBe('bg-gradient-red');
    });

    it('maps tesla to red', async () => {
      expect(await normalizeThemeBackgroundClass('tesla')).toBe('bg-gradient-red');
    });
  });

  describe('Brand Presets (Level 1) - Security Vendors', () => {
    it('maps darktrace to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('darktrace')).toBe('bg-gradient-indigo');
    });

    it('maps crowdstrike to red', async () => {
      expect(await normalizeThemeBackgroundClass('crowdstrike')).toBe('bg-gradient-red');
    });

    it('maps falcon to red', async () => {
      expect(await normalizeThemeBackgroundClass('falcon')).toBe('bg-gradient-red');
    });

    it('maps palo alto to orange', async () => {
      expect(await normalizeThemeBackgroundClass('palo alto')).toBe('bg-gradient-orange');
    });

    it('maps paloalto to orange', async () => {
      expect(await normalizeThemeBackgroundClass('paloalto')).toBe('bg-gradient-orange');
    });

    it('maps fortinet to orange', async () => {
      expect(await normalizeThemeBackgroundClass('fortinet')).toBe('bg-gradient-orange');
    });

    it('maps checkpoint to purple', async () => {
      expect(await normalizeThemeBackgroundClass('checkpoint')).toBe('bg-gradient-purple');
    });

    it('maps okta to blue', async () => {
      expect(await normalizeThemeBackgroundClass('okta')).toBe('bg-gradient-blue');
    });

    it('maps sentinelone to teal', async () => {
      expect(await normalizeThemeBackgroundClass('sentinelone')).toBe('bg-gradient-teal');
    });

    it('maps splunk to amber', async () => {
      expect(await normalizeThemeBackgroundClass('splunk')).toBe('bg-gradient-amber');
    });

    it('maps cisco to blue', async () => {
      expect(await normalizeThemeBackgroundClass('cisco')).toBe('bg-gradient-blue');
    });

    it('maps zscaler to blue', async () => {
      expect(await normalizeThemeBackgroundClass('zscaler')).toBe('bg-gradient-blue');
    });

    it('maps cloudflare to orange', async () => {
      expect(await normalizeThemeBackgroundClass('cloudflare')).toBe('bg-gradient-orange');
    });

    it('maps proofpoint to indigo', async () => {
      expect(await normalizeThemeBackgroundClass('proofpoint')).toBe('bg-gradient-indigo');
    });

    it('maps mimecast to purple', async () => {
      expect(await normalizeThemeBackgroundClass('mimecast')).toBe('bg-gradient-purple');
    });

    it('maps sophos to teal', async () => {
      expect(await normalizeThemeBackgroundClass('sophos')).toBe('bg-gradient-teal');
    });

    it('maps kaspersky to green', async () => {
      expect(await normalizeThemeBackgroundClass('kaspersky')).toBe('bg-gradient-green');
    });
  });

  describe('AI Selection (Level 2)', () => {
    it('uses AI for unknown inputs (Level 2)', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-purple',
      } as any);

      const result = await normalizeThemeBackgroundClass('royal purple vibe');
      expect(result).toBe('bg-gradient-purple');
      expect(generateText).toHaveBeenCalled();
    });

    it('calls generateText with correct structure', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-blue',
      } as any);

      await normalizeThemeBackgroundClass('ocean colors');

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        })
      );
    });

    it('trims and splits AI response', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '  bg-gradient-green  \n\n',
      } as any);

      const result = await normalizeThemeBackgroundClass('forest theme');
      expect(result).toBe('bg-gradient-green');
    });

    it('handles AI returning regex match (fallback in Level 2)', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Result: bg-gradient-blue',
      } as any);

      const result = await normalizeThemeBackgroundClass('something blue');
      expect(result).toBe('bg-gradient-blue');
    });

    it('handles AI response with explanation text', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'The best match is bg-gradient-red for your request',
      } as any);

      const result = await normalizeThemeBackgroundClass('fire colors');
      expect(result).toBe('bg-gradient-red');
    });

    it('handles AI response with backticks', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '`bg-gradient-purple`',
      } as any);

      const result = await normalizeThemeBackgroundClass('grape theme');
      expect(result).toBe('bg-gradient-purple');
    });

    it('handles AI response with quotes', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '"bg-gradient-pink"',
      } as any);

      const result = await normalizeThemeBackgroundClass('rose theme');
      expect(result).toBe('bg-gradient-pink');
    });

    it('handles multiline AI response', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Here is my answer:\nbg-gradient-amber\nHope this helps!',
      } as any);

      const result = await normalizeThemeBackgroundClass('sunset colors');
      expect(result).toBe('bg-gradient-amber');
    });

    it('uses default when AI returns invalid color', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-invalid-color',
      } as any);

      const result = await normalizeThemeBackgroundClass('weird colors');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('uses default when AI returns empty string', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '',
      } as any);

      const result = await normalizeThemeBackgroundClass('mystery color');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('uses default when AI returns whitespace only', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '   \n\t  ',
      } as any);

      const result = await normalizeThemeBackgroundClass('unknown theme');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('uses default when AI returns text without valid class', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'I cannot determine a color for this',
      } as any);

      const result = await normalizeThemeBackgroundClass('impossible color');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });
  });

  describe('Fallback to Default (Level 3)', () => {
    it('falls back to DEFAULT if AI fails (Level 3)', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('AI invalid'));

      const result = await normalizeThemeBackgroundClass('colors of chaos');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('falls back to default on network error', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('Network timeout'));

      const result = await normalizeThemeBackgroundClass('some color');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('falls back to default on API error', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await normalizeThemeBackgroundClass('another color');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('falls back to default on null response', async () => {
      vi.mocked(generateText).mockResolvedValue(null as any);

      const result = await normalizeThemeBackgroundClass('color theme');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('falls back to default on undefined response', async () => {
      vi.mocked(generateText).mockResolvedValue(undefined as any);

      const result = await normalizeThemeBackgroundClass('theme color');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });

    it('falls back to default on response without text property', async () => {
      vi.mocked(generateText).mockResolvedValue({} as any);

      const result = await normalizeThemeBackgroundClass('color scheme');
      expect(result).toBe(THEME_COLORS.DEFAULT);
    });
  });

  describe('Model Provider Parameters', () => {
    it('accepts modelProvider parameter', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-blue', 'openai');
      expect(result).toBe('bg-gradient-blue');
    });

    it('accepts modelName parameter', async () => {
      const result = await normalizeThemeBackgroundClass('bg-gradient-red', 'openai', 'gpt-4');
      expect(result).toBe('bg-gradient-red');
    });

    it('passes model parameters to AI for unknown inputs', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-green',
      } as any);

      await normalizeThemeBackgroundClass('forest', 'anthropic', 'claude-3');
      expect(generateText).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string input', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-blue',
      } as any);

      const result = await normalizeThemeBackgroundClass('');
      expect(result).toBe('bg-gradient-blue');
    });

    it('handles whitespace-only input', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-gray',
      } as any);

      const result = await normalizeThemeBackgroundClass('   ');
      expect(result).toBe('bg-gradient-gray');
    });

    it('handles very long input string', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-purple',
      } as any);

      const longInput = 'a'.repeat(1000);
      const result = await normalizeThemeBackgroundClass(longInput);
      expect(result).toBe('bg-gradient-purple');
    });

    it('handles special characters in input', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-amber',
      } as any);

      const result = await normalizeThemeBackgroundClass('color@#$%^&*()');
      expect(result).toBe('bg-gradient-amber');
    });

    it('handles unicode characters in input', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-pink',
      } as any);

      const result = await normalizeThemeBackgroundClass('色彩主題');
      expect(result).toBe('bg-gradient-pink');
    });

    it('handles numeric input', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-teal',
      } as any);

      const result = await normalizeThemeBackgroundClass('12345');
      expect(result).toBe('bg-gradient-teal');
    });

    it('handles input with newlines', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-indigo',
      } as any);

      const result = await normalizeThemeBackgroundClass('multi\nline\ninput');
      expect(result).toBe('bg-gradient-indigo');
    });

    it('handles input with tabs', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-orange',
      } as any);

      const result = await normalizeThemeBackgroundClass('tab\tseparated');
      expect(result).toBe('bg-gradient-orange');
    });
  });

  describe('Integration Scenarios', () => {
    it('prioritizes valid class over brand presets', async () => {
      // "amazon" is a brand preset, but if input is already valid, return it
      const result = await normalizeThemeBackgroundClass('bg-gradient-blue');
      expect(result).toBe('bg-gradient-blue');
      expect(generateText).not.toHaveBeenCalled();
    });

    it('prioritizes brand presets over AI', async () => {
      // Should not call AI if brand preset matches
      const result = await normalizeThemeBackgroundClass('amazon theme');
      expect(result).toBe('bg-gradient-orange');
      expect(generateText).not.toHaveBeenCalled();
    });

    it('uses AI only when no brand preset matches', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'bg-gradient-teal',
      } as any);

      const result = await normalizeThemeBackgroundClass('ocean vibes');
      expect(result).toBe('bg-gradient-teal');
      expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('does not fallback to AI after successful brand match', async () => {
      await normalizeThemeBackgroundClass('google colors');
      await normalizeThemeBackgroundClass('microsoft theme');
      await normalizeThemeBackgroundClass('apple style');

      expect(generateText).not.toHaveBeenCalled();
    });
  });
});
