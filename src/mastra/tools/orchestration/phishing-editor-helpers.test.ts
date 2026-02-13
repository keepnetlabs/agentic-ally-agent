import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPhishingContent,
  parseAndValidateEmailResponse,
  processLandingPageResults,
  streamEditResultsToUI,
  savePhishingContent,
  ExistingEmail,
  ExistingLanding,
  EditedLanding,
} from './phishing-editor-helpers';
import { KVService } from '../../services/kv-service';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { fixBrokenImages } from '../../utils/landing-page/image-validator';
import {
  preserveLandingFormControlStyles,
  preserveMissingLandingFormControlStyles,
  repairBrokenLandingFormControlAttrs,
} from '../../utils/content-processors/landing-form-style-preserver';
import { postProcessPhishingLandingHtml } from '../../utils/content-processors/phishing-html-postprocessors';

// Mock dependencies
vi.mock('../../services/kv-service');
vi.mock('../../utils/core/id-utils', () => ({
  uuidv4: vi.fn(() => 'msg-phish'),
}));
vi.mock('../../utils/core/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock cleanResponse to just return the input if already valid JSON or clean it simply
vi.mock('../../utils/content-processors/json-cleaner', () => ({
  cleanResponse: vi.fn(text => text),
}));
vi.mock('../../utils/landing-page/image-validator', () => ({
  fixBrokenImages: vi.fn(async (html: string) => html),
}));
vi.mock('../../utils/content-processors/landing-form-style-preserver', () => ({
  preserveLandingFormControlStyles: vi.fn((_original: string, repaired: string) => repaired),
  preserveMissingLandingFormControlStyles: vi.fn((_original: string, repaired: string) => repaired),
  repairBrokenLandingFormControlAttrs: vi.fn((html: string) => html),
}));
vi.mock('../../utils/content-processors/phishing-html-postprocessors', () => ({
  postProcessPhishingLandingHtml: vi.fn(({ html }: { html: string }) => html),
}));

describe('Phishing Editor Helpers', () => {
  describe('loadPhishingContent', () => {
    let mockKvGet: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockKvGet = vi.fn();

      const MockKVService = vi.mocked(KVService);
      MockKVService.mockImplementation(function () {
        return {
          get: mockKvGet,
          put: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
        } as any;
      });
    });

    it('should load content successfully when all keys exist', async () => {
      const phishingId = 'test-id';
      const language = 'en-GB';

      const mockBase = { method: 'POST', isQuishing: false };
      const mockEmail: ExistingEmail = { subject: 'Test', template: '<html></html>', fromAddress: 'test@example.com' };
      const mockLanding: ExistingLanding = { pages: [{ type: 'login', template: '<html></html>', summary: 'Login' }] };

      mockKvGet.mockResolvedValueOnce(mockBase); // base
      mockKvGet.mockResolvedValueOnce(mockEmail); // email
      mockKvGet.mockResolvedValueOnce(mockLanding); // landing

      const result = await loadPhishingContent(phishingId, language);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content.base).toEqual(mockBase);
        expect(result.content.email).toEqual(mockEmail);
        expect(result.content.landing).toEqual(mockLanding);
        expect(result.content.emailKey).toContain(phishingId);
        expect(result.content.emailKey).toContain('en-gb'); // Normalized language in key
      }
    });

    it('should return error if neither email nor landing exists', async () => {
      mockKvGet.mockResolvedValue(null);

      const result = await loadPhishingContent('test-id', 'en-GB');

      expect(result.success).toBe(false);
      // @ts-ignore
      expect(result.error).toBeDefined();
    });

    it('should succeed with only landing page', async () => {
      const mockLanding: ExistingLanding = { pages: [{ type: 'login', template: '<html></html>', summary: 'Login' }] };

      mockKvGet.mockResolvedValueOnce(null); // base
      mockKvGet.mockResolvedValueOnce(null); // email
      mockKvGet.mockResolvedValueOnce(mockLanding); // landing

      const result = await loadPhishingContent('test-id', 'en-US');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content.email).toBeNull();
        expect(result.content.landing).toEqual(mockLanding);
      }
    });

    it('should handle rejected base/email reads when landing exists', async () => {
      const mockLanding: ExistingLanding = {
        pages: [{ type: 'info', template: '<html><body>landing only</body></html>', summary: 'Landing' }],
      };

      mockKvGet.mockRejectedValueOnce(new Error('base unavailable')); // base
      mockKvGet.mockRejectedValueOnce(new Error('email unavailable')); // email
      mockKvGet.mockResolvedValueOnce(mockLanding); // landing

      const result = await loadPhishingContent('test-id', 'en-US');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content.base).toBeNull();
        expect(result.content.email).toBeNull();
        expect(result.content.landing).toEqual(mockLanding);
      }
    });

    it('should handle rejected landing read when email exists', async () => {
      const mockBase = { method: 'POST', isQuishing: false };
      const mockEmail: ExistingEmail = {
        subject: 'Subject',
        template: '<html><body>email</body></html>',
        fromAddress: 'mail@example.com',
      };

      mockKvGet.mockResolvedValueOnce(mockBase); // base
      mockKvGet.mockResolvedValueOnce(mockEmail); // email
      mockKvGet.mockRejectedValueOnce(new Error('landing unavailable')); // landing

      const result = await loadPhishingContent('test-id', 'en-US');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content.base).toEqual(mockBase);
        expect(result.content.email).toEqual(mockEmail);
        expect(result.content.landing).toBeNull();
      }
    });
  });

  describe('parseAndValidateEmailResponse', () => {
    beforeEach(() => {
      vi.mocked(cleanResponse).mockImplementation((text: any) => text);
    });

    it('should validate correct email response', () => {
      const validResponse = JSON.stringify({
        subject: 'New Subject',
        template: '<html><body>New Body</body></html>',
        summary: 'Updated subject and body',
      });

      const result = parseAndValidateEmailResponse(validResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.email.subject).toBe('New Subject');
        expect(result.email.template).toBe('<html><body>New Body</body></html>');
      }
    });

    it('should fail on invalid JSON', () => {
      const result = parseAndValidateEmailResponse('{ invalid json');
      expect(result.success).toBe(false);
    });

    it('should fail if schema attributes validation fails', () => {
      const invalidResponse = JSON.stringify({
        subject: 'Subject Only',
        // missing template and summary
      });

      const result = parseAndValidateEmailResponse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should parse img src entries in template for logging path', () => {
      const responseWithImages = JSON.stringify({
        subject: 'Image Subject',
        template:
          '<html><body><img src=\'https://a.example/x.png\' /><img src="https://b.example/y.png" /></body></html>',
        summary: 'Has two images in template',
      });

      const result = parseAndValidateEmailResponse(responseWithImages);
      expect(result.success).toBe(true);
    });

    it('should stringify non-Error parse failures', () => {
      vi.mocked(cleanResponse).mockImplementation(() => {
        throw 'email-parse-failed';
      });

      const result = parseAndValidateEmailResponse('ignored');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('email-parse-failed');
      }
    });
  });

  describe('savePhishingContent', () => {
    let mockKvPut: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockKvPut = vi.fn();

      const MockKVService = vi.mocked(KVService);
      MockKVService.mockImplementation(function () {
        return {
          get: vi.fn(),
          put: mockKvPut,
          delete: vi.fn(),
          list: vi.fn(),
        } as any;
      });
    });

    it('should save email if provided', async () => {
      const updatedEmail = {
        subject: 'Updated',
        template: 'Template',
        lastModified: 12345,
      };

      await savePhishingContent('email-key', 'landing-key', updatedEmail, null, null);

      expect(mockKvPut).toHaveBeenCalledWith('email-key', updatedEmail);
      expect(mockKvPut).toHaveBeenCalledTimes(1);
    });

    it('should save landing if edited', async () => {
      const existingLanding: ExistingLanding = { pages: [] };
      const editedLanding: EditedLanding = {
        pages: [{ type: 'login', template: 'New', summary: 'Sum', edited: true }],
        summary: 'Sum',
      };

      await savePhishingContent('email-key', 'landing-key', null, existingLanding, editedLanding);

      expect(mockKvPut).toHaveBeenCalledWith(
        'landing-key',
        expect.objectContaining({
          pages: editedLanding.pages,
        })
      );
    });
  });

  describe('processLandingPageResults', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(cleanResponse).mockImplementation((text: any) => text);
    });

    it('returns null for empty landing results', async () => {
      const result = await processLandingPageResults([], null, 'edit', 'none', 'Corp');
      expect(result).toBeNull();
    });

    it('returns null when all landing results are rejected', async () => {
      const result = await processLandingPageResults(
        [{ status: 'rejected', reason: new Error('llm fail') }],
        null,
        'edit',
        'none',
        'Corp'
      );
      expect(result).toBeNull();
    });

    it('uses preserveLandingFormControlStyles in translate mode', async () => {
      const landingResult = {
        status: 'fulfilled',
        value: {
          text: JSON.stringify({
            type: 'login',
            template:
              '<html><body><form><input name=\"u\" /><button type=\"submit\">Continue Login Securely</button></form></body></html>',
            edited: true,
            summary: 'updated login',
          }),
        },
      } as PromiseFulfilledResult<{ text: string }>;

      const existingLanding: ExistingLanding = {
        pages: [{ type: 'login', template: '<html><body>old</body></html>', summary: 'old' }],
      };

      const result = await processLandingPageResults(
        [landingResult],
        existingLanding,
        'translate',
        'translate all text',
        'Corp'
      );

      expect(result).not.toBeNull();
      expect(preserveLandingFormControlStyles).toHaveBeenCalled();
      expect(fixBrokenImages).toHaveBeenCalled();
      expect(repairBrokenLandingFormControlAttrs).toHaveBeenCalled();
      expect(postProcessPhishingLandingHtml).toHaveBeenCalled();
    });

    it('uses preserveMissingLandingFormControlStyles when edit instruction targets form styles', async () => {
      const landingResult = {
        status: 'fulfilled',
        value: {
          text: JSON.stringify({
            type: 'success',
            template:
              '<html><body><button class=\"cta\">Proceed to Secure Dashboard Confirmation</button></body></html>',
            edited: true,
            summary: 'changed',
          }),
        },
      } as PromiseFulfilledResult<{ text: string }>;

      const existingLanding: ExistingLanding = {
        pages: [{ type: 'success', template: '<html><body>old-button</body></html>', summary: 'old' }],
      };

      const result = await processLandingPageResults(
        [landingResult],
        existingLanding,
        'edit',
        'change input button style',
        'Corp'
      );

      expect(result).not.toBeNull();
      expect(preserveMissingLandingFormControlStyles).toHaveBeenCalled();
    });

    it('uses empty-string fallback when editInstruction is undefined', async () => {
      const landingResult = {
        status: 'fulfilled',
        value: {
          text: JSON.stringify({
            type: 'login',
            template:
              '<html><body><form><input name=\"u\" /><button type=\"submit\">Continue Login Securely</button></form></body></html>',
            edited: true,
            summary: 'ok fallback',
          }),
        },
      } as PromiseFulfilledResult<{ text: string }>;

      const existingLanding: ExistingLanding = {
        pages: [{ type: 'login', template: '<html><body>old</body></html>', summary: 'old' }],
      };

      const result = await processLandingPageResults(
        [landingResult],
        existingLanding,
        'edit',
        undefined as any,
        'Corp'
      );

      expect(result).not.toBeNull();
      expect(preserveLandingFormControlStyles).toHaveBeenCalled();
    });

    it('falls back to repaired html when original template is missing', async () => {
      const landingResult = {
        status: 'fulfilled',
        value: {
          text: JSON.stringify({
            type: 'info',
            template:
              '<html><body><p>This is a fresh informational landing page template with enough content.</p></body></html>',
            edited: true,
            summary: 'fresh',
          }),
        },
      } as PromiseFulfilledResult<{ text: string }>;

      const result = await processLandingPageResults([landingResult], null, 'edit', 'general edit', 'Corp');

      expect(result).not.toBeNull();
      expect(result?.pages[0].template).toContain('fresh');
    });

    it('skips fulfilled landing item when parsing fails', async () => {
      const badLandingResult = {
        status: 'fulfilled',
        value: { text: '{not-json' },
      } as PromiseFulfilledResult<{ text: string }>;

      const result = await processLandingPageResults([badLandingResult], null, 'edit', 'general', 'Corp');

      expect(result).toBeNull();
    });

    it('stringifies non-Error parse failures for landing results', async () => {
      vi.mocked(cleanResponse).mockImplementation(() => {
        throw 'landing-parse-failed';
      });

      const landingResult = {
        status: 'fulfilled',
        value: {
          text: '{"type":"info","template":"<html>x</html>","edited":true,"summary":"ok"}',
        },
      } as PromiseFulfilledResult<{ text: string }>;

      const result = await processLandingPageResults([landingResult], null, 'edit', 'general', 'Corp');

      expect(result).toBeNull();
    });
  });

  describe('streamEditResultsToUI', () => {
    it('streams email and landing payload blocks', async () => {
      const writer = { write: vi.fn().mockResolvedValue(undefined) };

      await streamEditResultsToUI(
        writer,
        'pid-1',
        'email-key',
        'landing-key',
        'en-gb',
        { subject: 'S', template: '<html>x</html>', summary: 'ok' },
        '<html>x</html>',
        'from@example.com',
        'From Name',
        { pages: [{ type: 'login', template: '<html>l</html>', edited: true, summary: 'ok' }], summary: 'ok' },
        { name: 'Landing', description: 'Desc', method: 'POST', difficulty: 'easy' },
        'POST',
        true
      );

      expect(writer.write).toHaveBeenCalledWith({ type: 'text-start', id: 'msg-phish' });
      expect(writer.write).toHaveBeenCalledWith(
        expect.objectContaining({ delta: expect.stringContaining('::ui:phishing_email::') })
      );
      expect(writer.write).toHaveBeenCalledWith(
        expect.objectContaining({ delta: expect.stringContaining('::ui:landing_page::') })
      );
      expect(writer.write).toHaveBeenCalledWith({ type: 'text-end', id: 'msg-phish' });
    });

    it('handles non-Error writer exceptions', async () => {
      const writer = { write: vi.fn().mockRejectedValue('write string fail') };

      await streamEditResultsToUI(
        writer,
        'pid-2',
        null,
        null,
        'en-gb',
        null,
        null,
        undefined,
        undefined,
        null,
        null,
        undefined,
        false
      );

      expect(writer.write).toHaveBeenCalled();
    });

    it('emits only start/end when email or landing payload is missing', async () => {
      const writer = { write: vi.fn().mockResolvedValue(undefined) };

      await streamEditResultsToUI(
        writer,
        'pid-3',
        'email-key',
        'landing-key',
        'en-gb',
        { subject: 'S', template: '<html>x</html>', summary: 'ok' },
        null,
        'from@example.com',
        'From Name',
        { pages: [], summary: 'none' },
        null,
        'POST',
        false
      );

      expect(writer.write).toHaveBeenCalledTimes(2);
      expect(writer.write).toHaveBeenNthCalledWith(1, { type: 'text-start', id: 'msg-phish' });
      expect(writer.write).toHaveBeenNthCalledWith(2, { type: 'text-end', id: 'msg-phish' });
    });

    it('handles Error instance writer exceptions', async () => {
      const writer = { write: vi.fn().mockRejectedValue(new Error('writer error')) };

      await streamEditResultsToUI(
        writer,
        'pid-4',
        null,
        null,
        'en-gb',
        null,
        null,
        undefined,
        undefined,
        null,
        null,
        undefined,
        false
      );

      expect(writer.write).toHaveBeenCalled();
    });

    it('streams landing payload when landingMeta is null', async () => {
      const writer = { write: vi.fn().mockResolvedValue(undefined) };

      await streamEditResultsToUI(
        writer,
        'pid-5',
        null,
        'landing-key',
        'en-gb',
        null,
        null,
        undefined,
        undefined,
        { pages: [{ type: 'info', template: '<html>landing</html>', edited: true, summary: 'ok' }], summary: 'ok' },
        null,
        undefined,
        false
      );

      expect(writer.write).toHaveBeenCalledWith(
        expect.objectContaining({ delta: expect.stringContaining('::ui:landing_page::') })
      );
    });
  });
});
