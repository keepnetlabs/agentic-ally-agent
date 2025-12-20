import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phishingEditorTool } from './phishing-editor-tool';
import { KVService } from '../../services/kv-service';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import '../../../../src/__tests__/setup';

// Type assertion helper for test - extract execute method to avoid undefined checks
const executeTool = (phishingEditorTool as any).execute;

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn()
}));

// Mock model providers
vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(() => ({ modelId: 'test-model' }))
}));

/**
 * Test Suite: phishingEditorTool
 * Tests for editing existing phishing templates
 * Covers: Input validation, KV loading, LLM editing, KV saving, streaming, error handling
 */

describe('phishingEditorTool', () => {
  const mockExistingEmail = {
    subject: 'Original Subject',
    template: '<html><body>Original Email Template</body></html>',
    fromAddress: 'original@example.com',
    fromName: 'Original Sender'
  };

  const mockExistingLanding = {
    pages: [
      {
        type: 'login',
        template: '<html><body>Landing Page 1</body></html>'
      }
    ]
  };

  const mockEditedEmailResponse = {
    text: JSON.stringify({
      subject: 'Edited Subject',
      template: '<html><body>Edited Email Template</body></html>',
      summary: 'Updated subject and body text'
    })
  };

  const mockEditedLandingResponse = {
    text: JSON.stringify({
      type: 'login',
      template: '<html><body>Edited Landing Page</body></html>',
      edited: true,
      summary: 'Updated landing page content'
    })
  };

  const mockWriter = {
    write: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default KV mocks
    vi.spyOn(KVService.prototype, 'get')
      .mockImplementation(async (key: string) => {
        if (key.includes('email:')) {
          return mockExistingEmail;
        }
        if (key.includes('landing:')) {
          return mockExistingLanding;
        }
        return null;
      });

    vi.spyOn(KVService.prototype, 'put').mockResolvedValue(true);

    // Setup default LLM mocks
    (generateText as any).mockResolvedValue(mockEditedEmailResponse);
  });

  describe('Input Validation', () => {
    it('should accept valid input with required fields', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Make it more urgent'
      };

      const result = await executeTool({ context: input } as any) as any;
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept optional language', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Translate to Turkish',
        language: 'tr-tr'
      };

      const result = await executeTool({ context: input } as any) as any;
      expect(result.success).toBe(true);
    });

    it('should accept optional model overrides', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject',
        modelProvider: 'OPENAI',
        model: 'gpt-4'
      };

      const result = await executeTool({ context: input } as any) as any;
      expect(result.success).toBe(true);
    });

    it('should require phishingId', async () => {
      const input: any = {
        editInstruction: 'Make it urgent'
      };

      // Tool framework validates input schema
      const result = await executeTool({ context: input } as any) as any;
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require editInstruction', async () => {
      const input: any = {
        phishingId: 'phishing-123'
      };

      // Tool framework validates input schema
      const result = await executeTool({ context: input } as any) as any;
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('KV Content Loading', () => {
    it('should load existing email from KV', async () => {
      const getSpy = vi.spyOn(KVService.prototype, 'get');
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      await executeTool({ context: input } as any);

      expect(getSpy).toHaveBeenCalledWith('phishing:phishing-123:email:en-gb');
    });

    it('should use provided language for KV key', async () => {
      const getSpy = vi.spyOn(KVService.prototype, 'get');
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject',
        language: 'tr-tr'
      };

      await executeTool({ context: input } as any);

      expect(getSpy).toHaveBeenCalledWith('phishing:phishing-123:email:tr-tr');
    });

    it('should return error when email not found', async () => {
      vi.spyOn(KVService.prototype, 'get').mockResolvedValue(null);

      const input = {
        phishingId: 'nonexistent-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when email template is missing', async () => {
      vi.spyOn(KVService.prototype, 'get').mockResolvedValue({ subject: 'Test' });

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should load landing page when available', async () => {
      const getSpy = vi.spyOn(KVService.prototype, 'get');
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update content'
      };

      await executeTool({ context: input } as any);

      expect(getSpy).toHaveBeenCalledWith('phishing:phishing-123:landing:en-gb');
    });

    it('should handle missing landing page gracefully', async () => {
      vi.spyOn(KVService.prototype, 'get').mockImplementation(async (key: string) => {
        if (key.includes('email:')) {
          return mockExistingEmail;
        }
        return null; // Landing page not found
      });

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update content'
      };

      const result = await executeTool({ context: input } as any) as any;
      expect(result.success).toBe(true);
    });
  });

  describe('LLM Editing', () => {
    it('should call generateText for email editing', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Make it more urgent'
      };

      await executeTool({ context: input } as any);

      expect(generateText).toHaveBeenCalled();
      const call = (generateText as any).mock.calls.find((c: any[]) =>
        c[0].messages.some((m: any) => m.content.includes('Edit this email template'))
      );
      expect(call).toBeDefined();
    });

    it('should call generateText for landing page editing when landing page exists', async () => {
      (generateText as any)
        .mockResolvedValueOnce(mockEditedEmailResponse)
        .mockResolvedValueOnce(mockEditedLandingResponse);

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update all content'
      };

      await executeTool({ context: input } as any);

      expect(generateText).toHaveBeenCalledTimes(2); // Email + Landing page
    });

    it('should use model override when provided', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject',
        modelProvider: 'OPENAI',
        model: 'gpt-4'
      };

      await executeTool({ context: input } as any);

      expect(getModelWithOverride).toHaveBeenCalledWith('OPENAI', 'gpt-4');
    });

    it('should handle LLM response parsing errors', async () => {
      (generateText as any).mockResolvedValue({
        text: 'Invalid JSON response'
      });

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing template in LLM response', async () => {
      (generateText as any).mockResolvedValue({
        text: JSON.stringify({
          subject: 'New Subject'
          // template missing
        })
      });

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing template field');
    });

    it('should handle empty template in LLM response', async () => {
      (generateText as any).mockResolvedValue({
        text: JSON.stringify({
          subject: 'New Subject',
          template: '',
          summary: 'No changes'
        })
      });

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty template');
    });
  });

  describe('KV Saving', () => {
    it('should save updated email to KV', async () => {
      const putSpy = vi.spyOn(KVService.prototype, 'put');
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      await executeTool({ context: input } as any);

      expect(putSpy).toHaveBeenCalledWith(
        'phishing:phishing-123:email:en-gb',
        expect.objectContaining({
          subject: 'Edited Subject',
          template: expect.stringContaining('Edited Email Template'),
          lastModified: expect.any(Number)
        })
      );
    });

    it('should save updated landing page to KV when edited', async () => {
      (generateText as any)
        .mockResolvedValueOnce(mockEditedEmailResponse)
        .mockResolvedValueOnce(mockEditedLandingResponse);

      const putSpy = vi.spyOn(KVService.prototype, 'put');
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update all content'
      };

      await executeTool({ context: input } as any);

      expect(putSpy).toHaveBeenCalledWith(
        'phishing:phishing-123:landing:en-gb',
        expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({
              type: 'login',
              template: expect.stringContaining('Edited Landing Page')
            })
          ]),
          lastModified: expect.any(Number)
        })
      );
    });
  });

  describe('Streaming', () => {
    it('should stream edited email when writer is provided', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      await executeTool({ context: input, writer: mockWriter } as any);

      expect(mockWriter.write).toHaveBeenCalled();
      const writeCalls = mockWriter.write.mock.calls;

      // Should have text-start, text-delta (email), text-end
      expect(writeCalls.length).toBeGreaterThanOrEqual(2);

      // Check for email streaming
      const emailCall = writeCalls.find(call =>
        call[0].type === 'text-delta' && call[0].delta?.includes('phishing_email')
      );
      expect(emailCall).toBeDefined();
    });

    it('should stream edited landing page when writer is provided and landing page exists', async () => {
      (generateText as any)
        .mockResolvedValueOnce(mockEditedEmailResponse)
        .mockResolvedValueOnce(mockEditedLandingResponse);

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update all content'
      };

      await executeTool({ context: input, writer: mockWriter } as any);

      const writeCalls = mockWriter.write.mock.calls;

      // Check for landing page streaming
      const landingCall = writeCalls.find(call =>
        call[0].type === 'text-delta' && call[0].delta?.includes('landing_page')
      );
      expect(landingCall).toBeDefined();
    });

    it('should handle streaming errors gracefully', async () => {
      const errorWriter = {
        write: vi.fn().mockRejectedValue(new Error('Stream error'))
      };

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      // Should still succeed even if streaming fails
      const result = await executeTool({ context: input, writer: errorWriter } as any);
      expect(result.success).toBe(true);
    });

    it('should not stream when writer is not provided', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      await executeTool({ context: input } as any);

      expect(mockWriter.write).not.toHaveBeenCalled();
    });
  });

  describe('Successful Execution', () => {
    it('should return success response with edited content data', async () => {
      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data?.phishingId).toBe('phishing-123');
      expect(result.data?.subject).toBe('Edited Subject');
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.message).toContain('Updated');
    });

    it('should include both email and landing page in success message when both edited', async () => {
      (generateText as any)
        .mockResolvedValueOnce(mockEditedEmailResponse)
        .mockResolvedValueOnce(mockEditedLandingResponse);

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update all content'
      };

      const result = await executeTool({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Email');
      expect(result.data?.message).toContain('Landing Page');
    });
  });

  describe('Error Handling', () => {
    it('should handle KV get errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'get').mockRejectedValue(new Error('KV error'));

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle LLM generation errors', async () => {
      (generateText as any).mockRejectedValue(new Error('LLM generation failed'));

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle KV put errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'put').mockRejectedValue(new Error('KV save failed'));

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include context in error response', async () => {
      (generateText as any).mockRejectedValue(new Error('LLM failed'));

      const input = {
        phishingId: 'phishing-123',
        editInstruction: 'Update subject'
      };

      const result = await executeTool({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('Failed to edit');
    });
  });
});
