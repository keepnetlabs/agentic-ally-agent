import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveLogoAndBrand, generateContextualBrand } from './brand-resolver';
import { generateText } from 'ai';
import { getLogoUrl } from '../landing-page/logo-resolver';
import { DEFAULT_GENERIC_LOGO } from '../landing-page/image-validator';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../landing-page/logo-resolver', () => ({
  getLogoUrl: vi.fn().mockReturnValue('http://mock-logo.com'),
}));

vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('brand-resolver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getLogoUrl).mockReturnValue('http://mock-logo.com');
  });

  describe('resolveLogoAndBrand', () => {
    it('resolves recognized brand', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          isRecognizedBrand: true,
          domain: 'microsoft.com',
          brandName: 'Microsoft',
          brandColors: { primary: '#000' },
        }),
      } as any);

      const result = await resolveLogoAndBrand('Microsoft', 'Login', mockModel);

      expect(result.isRecognizedBrand).toBe(true);
      expect(result.brandName).toBe('Microsoft');
      expect(result.logoUrl).toBe('http://mock-logo.com');
      expect(getLogoUrl).toHaveBeenCalledWith('microsoft.com', 96);
    });

    it('handles unrecognized brand', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          isRecognizedBrand: false,
          domain: null,
        }),
      } as any);

      const result = await resolveLogoAndBrand('Generic', 'Context', mockModel);
      expect(result.isRecognizedBrand).toBe(false);
      expect(result.logoUrl).toBe('http://mock-logo.com');
      // Should generate placeholder domain
      expect(getLogoUrl).toHaveBeenCalledWith('generic.local', 96);
    });

    it('handles AI failure', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockRejectedValue(new Error('AI fail'));

      const result = await resolveLogoAndBrand('FailCorp', 'Context', mockModel);
      expect(result.isRecognizedBrand).toBe(false);
      expect(result.logoUrl).toBe('http://mock-logo.com');
    });
    it('handles malformed JSON response with brackets', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: 'Here is the result: {"isRecognizedBrand": true, "domain": "adobe.com", "brandName": "Adobe"}',
      } as any);

      const result = await resolveLogoAndBrand('Adobe', 'Design', mockModel);
      expect(result.brandName).toBe('Adobe');
      expect(getLogoUrl).toHaveBeenCalledWith('adobe.com', 96);
    });

    it('cleans domain string with quotes or spaces', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          isRecognizedBrand: true,
          domain: '"google.com" ', // Quotes and trailing space
          brandName: 'Google',
        }),
      } as any);

      await resolveLogoAndBrand('Google', 'Search', mockModel);
      expect(getLogoUrl).toHaveBeenCalledWith('google.com', 96);
    });

    it('uses email template context when provided', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ isRecognizedBrand: false, domain: null }),
      } as any);

      const emailTemplate = 'Welcome to the secure document workspace';
      await resolveLogoAndBrand('Support', 'Phishing', mockModel, emailTemplate);

      const call = vi.mocked(generateText).mock.calls[0][0];
      expect(call.messages?.[1].content).toContain('Email Template');
      expect(call.messages?.[1].content).toContain('secure document workspace');
    });

    it('uses brand hint context when provided', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ isRecognizedBrand: false, domain: null }),
      } as any);

      await resolveLogoAndBrand('Kurumsal Spor İletişim', 'Playoff campaign', mockModel, undefined, 'consumer sports playoff promo');

      const call = vi.mocked(generateText).mock.calls[0][0];
      expect(call.messages?.[1].content).toContain('Brand Hint');
      expect(call.messages?.[1].content).toContain('consumer sports playoff promo');
      expect(call.messages?.[1].content).toContain('dynamic canonicalization');
    });

    it('guides the model to resolve brands from any language or script', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ isRecognizedBrand: false, domain: null }),
      } as any);

      await resolveLogoAndBrand('ฝ่ายไอที', 'แจ้งเตือนบัญชี', mockModel, undefined, 'เข้าสู่ระบบ Microsoft 365');

      const call = vi.mocked(generateText).mock.calls[0][0];
      expect(call.messages?.[0].content).toContain('any language or script');
      expect(call.messages?.[1].content).toContain('Normalized Signal Hints');
      expect(call.messages?.[1].content).toContain('เข้าสู่ระบบ Microsoft 365');
    });

    it('passes explicit domain hints from multilingual context to the model', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ isRecognizedBrand: false, domain: null }),
      } as any);

      await resolveLogoAndBrand(
        'Tim Keamanan',
        'Pembaruan akses',
        mockModel,
        '<a href="https://www.microsoft.com/security">Masuk</a>',
        'akses portal perusahaan'
      );

      const call = vi.mocked(generateText).mock.calls[0][0];
      expect(call.messages?.[1].content).toContain('Explicit Domain Hints');
      expect(call.messages?.[1].content).toContain('microsoft.com');
    });

    it('uses a detected explicit domain when the model recognizes a brand but omits the domain', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          isRecognizedBrand: true,
          domain: null,
          brandName: 'Microsoft',
          canonicalBrandName: 'Microsoft',
          brandColors: { primary: '#0078D4', secondary: '#737373', accent: '#00A4EF' },
        }),
      } as any);

      const result = await resolveLogoAndBrand(
        'ฝ่ายไอที',
        'อัปเดตการเข้าถึง',
        mockModel,
        '<a href="https://www.microsoft.com/security">เข้าสู่ระบบ</a>',
        'เข้าสู่ระบบพอร์ทัล'
      );

      expect(result.isRecognizedBrand).toBe(true);
      expect(result.brandName).toBe('Microsoft');
      expect(result.brandColors?.primary).toBe('#0078D4');
      expect(getLogoUrl).toHaveBeenCalledWith('microsoft.com', 96);
    });

    it('passes upstream analysis brand signals into the dynamic canonicalization prompt', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({ isRecognizedBrand: false, domain: null }),
      } as any);

      await resolveLogoAndBrand('Equipo de Seguridad', 'Aviso de acceso', mockModel, undefined, 'Inicia sesion', {
        brandIntent: 'public-brand',
        canonicalBrandName: 'Microsoft',
        localizedBrandSurface: 'Inicia sesion en Microsoft 365',
        brandEvidence: ['Localized product wording references Microsoft 365'],
        candidateDomains: ['microsoft.com'],
        brandConfidence: 'high',
        scriptOrLocaleHint: 'es',
      });

      const call = vi.mocked(generateText).mock.calls[0][0];
      expect(call.messages?.[1].content).toContain('Analysis Brand Signals');
      expect(call.messages?.[1].content).toContain('Canonical Brand Name: Microsoft');
      expect(call.messages?.[1].content).toContain('Script/Locale Hint: es');
    });

    it('rejects low-confidence recognized-brand output and falls back to placeholder logo', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          isRecognizedBrand: true,
          domain: 'microsoft.com',
          brandName: 'Microsoft',
          canonicalBrandName: 'Microsoft',
          confidence: 'low',
          brandColors: { primary: '#0078D4', secondary: '#737373', accent: '#00A4EF' },
        }),
      } as any);

      const result = await resolveLogoAndBrand('Generic', 'Context', mockModel);

      expect(result.isRecognizedBrand).toBe(false);
      expect(result.brandName).toBeNull();
      expect(getLogoUrl).toHaveBeenCalledWith('generic.local', 96);
    });

    it('falls back to DEFAULT_GENERIC_LOGO on catastrophic failure', async () => {
      vi.mocked(getLogoUrl).mockImplementation(() => {
        throw new Error('Network fail');
      });
      const result = await resolveLogoAndBrand('Generic', 'Context', {} as any);
      expect(result.logoUrl).toBe(DEFAULT_GENERIC_LOGO);
    });
  });

  describe('generateContextualBrand', () => {
    it('generates brand with domain', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          suggestedBrandName: 'SecurePay',
          domain: 'securepay.com',
        }),
      } as any);

      const result = await generateContextualBrand('scenario', 'cat', 'from', mockModel);
      expect(result.brandName).toBe('SecurePay');
      expect(getLogoUrl).toHaveBeenCalledWith('securepay.com', 96);
    });

    it('cleans domain in contextual generation', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          suggestedBrandName: 'CleanCorp',
          domain: ' cleancorp.net\n',
        }),
      } as any);

      await generateContextualBrand('scenario', 'cat', 'from', mockModel);
      expect(getLogoUrl).toHaveBeenCalledWith('cleancorp.net', 96);
    });

    it('generates brand without domain (uses placeholder)', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          suggestedBrandName: 'LocalShop',
          domain: null,
        }),
      } as any);

      const result = await generateContextualBrand('scenario', 'cat', 'from', mockModel);
      expect(result.brandName).toBe('LocalShop');
      expect(getLogoUrl).toHaveBeenCalledWith('localshop.local', 96);
    });

    it('handles failure in contextual generation with placeholder fallback', async () => {
      const mockModel = {} as any;
      vi.mocked(generateText).mockRejectedValue(new Error('AI fail'));

      const result = await generateContextualBrand('scenario', 'cat', 'OriginalFrom', mockModel);
      expect(result.logoUrl).toBe('http://mock-logo.com');
      expect(getLogoUrl).toHaveBeenCalledWith('brand.local', 96);
    });
  });
});
