import { describe, it, expect } from 'vitest';
import {
  smishingEditorSchema,
  smsResponseSchema,
} from './smishing-editor-schemas';

describe('Smishing Editor Schemas', () => {
  describe('smishingEditorSchema', () => {
    const validInput = {
      smishingId: 'smishing-123',
      editInstruction: 'Make the message more urgent',
    };

    it('should validate minimal editor input', () => {
      const result = smishingEditorSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should apply default mode as "edit"', () => {
      const result = smishingEditorSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('edit');
      }
    });

    it('should apply default hasBrandUpdate as false', () => {
      const result = smishingEditorSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasBrandUpdate).toBe(false);
      }
    });

    it('should apply default language as "en-gb"', () => {
      const result = smishingEditorSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe('en-gb');
      }
    });

    it('should accept "edit" mode', () => {
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        mode: 'edit',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('edit');
      }
    });

    it('should accept "translate" mode', () => {
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        mode: 'translate',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('translate');
      }
    });

    it('should reject invalid mode', () => {
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        mode: 'invalid-mode',
      });
      expect(result.success).toBe(false);
    });

    it('should accept hasBrandUpdate as true', () => {
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        hasBrandUpdate: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasBrandUpdate).toBe(true);
      }
    });

    it('should accept various language codes', () => {
      const languages = ['en-gb', 'tr-tr', 'de-de', 'es-es', 'fr-fr', 'it-it'];
      languages.forEach((lang) => {
        const result = smishingEditorSchema.safeParse({
          ...validInput,
          language: lang,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.language).toBe(lang);
        }
      });
    });

    it('should accept model provider override', () => {
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        modelProvider: 'OPENAI',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modelProvider).toBe('OPENAI');
      }
    });

    it('should accept model override', () => {
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        model: 'gpt-4',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('gpt-4');
      }
    });

    it('should require smishingId field', () => {
      const { smishingId, ...rest } = validInput;
      const result = smishingEditorSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should require editInstruction field', () => {
      const { editInstruction, ...rest } = validInput;
      const result = smishingEditorSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should handle complete input with all optional fields', () => {
      const result = smishingEditorSchema.safeParse({
        smishingId: 'smishing-456',
        editInstruction: 'Translate to Turkish and update colors',
        mode: 'translate',
        hasBrandUpdate: true,
        language: 'tr-tr',
        modelProvider: 'GOOGLE',
        model: 'gemini-pro',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('translate');
        expect(result.data.hasBrandUpdate).toBe(true);
        expect(result.data.language).toBe('tr-tr');
        expect(result.data.modelProvider).toBe('GOOGLE');
        expect(result.data.model).toBe('gemini-pro');
      }
    });

    it('should accept long edit instructions', () => {
      const longInstruction = 'Change the tone to be more friendly and add more emojis, but keep it professional. Also make sure the urgency is still there but soften the language a bit.';
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        editInstruction: longInstruction,
      });
      expect(result.success).toBe(true);
    });

    it('should accept edit instructions with special characters', () => {
      const specialInstruction = 'Replace "click here" with "verify account" (use quotes)';
      const result = smishingEditorSchema.safeParse({
        ...validInput,
        editInstruction: specialInstruction,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('smsResponseSchema', () => {
    const validResponse = {
      messages: ['Click here: {PHISHINGURL}'],
      summary: 'Updated SMS message for urgency',
    };

    it('should validate SMS response', () => {
      const result = smsResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should accept single message', () => {
      const result = smsResponseSchema.safeParse({
        messages: ['Single message'],
        summary: 'This is a summary',
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple messages', () => {
      const result = smsResponseSchema.safeParse({
        messages: [
          'First variant',
          'Second variant',
          'Third variant',
          'Fourth variant',
        ],
        summary: 'Added multiple variants',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty messages array', () => {
      const result = smsResponseSchema.safeParse({
        messages: [],
        summary: 'No messages',
      });
      expect(result.success).toBe(false);
    });

    it('should reject messages with empty strings', () => {
      const result = smsResponseSchema.safeParse({
        messages: ['Valid message', ''],
        summary: 'One empty message',
      });
      expect(result.success).toBe(false);
    });

    it('should accept messages with placeholders', () => {
      const result = smsResponseSchema.safeParse({
        messages: [
          'Verify: {PHISHINGURL}',
          'Click {PHISHINGURL} to confirm',
          'Confirm account: {PHISHINGURL}',
        ],
        summary: 'Multiple variants with URL placeholder',
      });
      expect(result.success).toBe(true);
    });

    it('should require summary field', () => {
      const result = smsResponseSchema.safeParse({
        messages: ['Message'],
      });
      expect(result.success).toBe(false);
    });

    it('should require at least 5 characters in summary', () => {
      expect(
        smsResponseSchema.safeParse({
          messages: ['Message'],
          summary: 'four',
        }).success
      ).toBe(false);

      expect(
        smsResponseSchema.safeParse({
          messages: ['Message'],
          summary: 'five!',
        }).success
      ).toBe(true);
    });

    it('should reject summary with fewer than 5 characters', () => {
      const results = [
        smsResponseSchema.safeParse({
          messages: ['Test'],
          summary: '',
        }),
        smsResponseSchema.safeParse({
          messages: ['Test'],
          summary: 'a',
        }),
        smsResponseSchema.safeParse({
          messages: ['Test'],
          summary: 'abcd',
        }),
      ];

      results.forEach((result) => {
        expect(result.success).toBe(false);
      });
    });

    it('should accept long summary', () => {
      const longSummary =
        'Updated the SMS message to include more urgent language, changed the tone to be more formal, and added the verification link placeholder for the phishing URL tracking system.';
      const result = smsResponseSchema.safeParse({
        messages: ['Message'],
        summary: longSummary,
      });
      expect(result.success).toBe(true);
    });

    it('should accept summary with special characters', () => {
      const result = smsResponseSchema.safeParse({
        messages: ['Message'],
        summary: 'Changed "old text" to "new text" (10 chars min)',
      });
      expect(result.success).toBe(true);
    });

    it('should handle response with many messages', () => {
      const manyMessages = Array(20)
        .fill(null)
        .map((_, i) => `Message variant ${i + 1}`);
      const result = smsResponseSchema.safeParse({
        messages: manyMessages,
        summary: 'Generated many message variants',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Schema constraints and edge cases', () => {
    it('should enforce message content requirements', () => {
      // Non-empty strings
      expect(
        smsResponseSchema.safeParse({
          messages: ['Valid'],
          summary: 'Valid summary',
        }).success
      ).toBe(true);

      // Empty string should fail
      expect(
        smsResponseSchema.safeParse({
          messages: [''],
          summary: 'Valid summary',
        }).success
      ).toBe(false);
    });

    it('should enforce minimum message count', () => {
      // Zero messages should fail
      expect(
        smsResponseSchema.safeParse({
          messages: [],
          summary: 'Summary text',
        }).success
      ).toBe(false);

      // One message should pass
      expect(
        smsResponseSchema.safeParse({
          messages: ['One message'],
          summary: 'Summary text',
        }).success
      ).toBe(true);
    });

    it('should preserve PHISHINGURL in SMS messages', () => {
      const result = smsResponseSchema.safeParse({
        messages: [
          'Verify account: {PHISHINGURL}',
          'Click link: {PHISHINGURL}',
        ],
        summary: 'SMS with URL placeholders',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messages[0]).toContain('{PHISHINGURL}');
        expect(result.data.messages[1]).toContain('{PHISHINGURL}');
      }
    });

    it('should validate message and summary independently', () => {
      // Invalid message, valid summary
      expect(
        smsResponseSchema.safeParse({
          messages: [''],
          summary: 'This is a valid summary',
        }).success
      ).toBe(false);

      // Valid message, invalid summary
      expect(
        smsResponseSchema.safeParse({
          messages: ['Valid message'],
          summary: 'bad',
        }).success
      ).toBe(false);

      // Both valid
      expect(
        smsResponseSchema.safeParse({
          messages: ['Valid message'],
          summary: 'Valid summary',
        }).success
      ).toBe(true);
    });
  });

  describe('Integration with editor workflow', () => {
    it('should validate editor input and response together', () => {
      const editorInput = {
        smishingId: 'smishing-789',
        editInstruction: 'Make it shorter and more direct',
        mode: 'edit' as const,
        language: 'en-gb',
      };

      const response = {
        messages: ['Verify now: {PHISHINGURL}'],
        summary: 'Shortened message for better engagement',
      };

      const inputResult = smishingEditorSchema.safeParse(editorInput);
      const responseResult = smsResponseSchema.safeParse(response);

      expect(inputResult.success).toBe(true);
      expect(responseResult.success).toBe(true);
    });

    it('should support translate workflow', () => {
      const editorInput = {
        smishingId: 'smishing-translate',
        editInstruction: 'Translate to Turkish',
        mode: 'translate' as const,
        language: 'tr-tr',
      };

      const response = {
        messages: ['Hesabınızı doğrulayın: {PHISHINGURL}'],
        summary: 'Turkish translation completed',
      };

      const inputResult = smishingEditorSchema.safeParse(editorInput);
      const responseResult = smsResponseSchema.safeParse(response);

      expect(inputResult.success).toBe(true);
      expect(responseResult.success).toBe(true);
      if (inputResult.success && responseResult.success) {
        expect(inputResult.data.language).toBe('tr-tr');
        expect(responseResult.data.messages[0]).toContain('{PHISHINGURL}');
      }
    });

    it('should support brand update workflow', () => {
      const editorInput = {
        smishingId: 'smishing-brand',
        editInstruction: 'Update brand to TechCorp colors and logo',
        mode: 'edit' as const,
        hasBrandUpdate: true,
      };

      const response = {
        messages: ['Updated TechCorp verification: {PHISHINGURL}'],
        summary: 'Updated SMS with new brand identity',
      };

      const inputResult = smishingEditorSchema.safeParse(editorInput);
      const responseResult = smsResponseSchema.safeParse(response);

      expect(inputResult.success).toBe(true);
      expect(responseResult.success).toBe(true);
      if (inputResult.success) {
        expect(inputResult.data.hasBrandUpdate).toBe(true);
      }
    });
  });
});
