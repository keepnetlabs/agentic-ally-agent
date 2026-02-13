import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateTranscript } from './transcript-translator';

// Mock dependencies
const mockGenerateText = vi.fn();
vi.mock('ai', () => ({
  generateText: (...args: any[]) => mockGenerateText(...args),
  LanguageModel: {}, // Mock type
}));

vi.mock('../language/localization-language-rules', () => ({
  getLanguagePrompt: (lang: string) => `Rules for ${lang}`,
}));

vi.mock('../core/resilience-utils', () => ({
  withRetry: (fn: any) => fn(),
}));

describe('Transcript Translator', () => {
  const mockModel: any = {};

  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  describe('English Language Bypass', () => {
    it('should return original text if target language is English', async () => {
      const transcript = 'Hello world';
      const result = await translateTranscript(transcript, 'en-us', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for en-US', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'en-US', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for EN (uppercase)', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'EN', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for en-GB', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'en-GB', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for en-AU', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'en-AU', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for english', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'english', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for ENGLISH', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'ENGLISH', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for En-us (mixed case)', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'En-us', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return original for en', async () => {
      const transcript = 'Test';
      const result = await translateTranscript(transcript, 'en', mockModel);
      expect(result).toBe(transcript);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('Non-English Translation', () => {
    it('should call generateText for non-English languages', async () => {
      const transcript = '00:01 Hello';
      const translated = '00:01 Merhaba';

      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'tr-tr', mockModel);

      expect(result).toBe(translated);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: expect.stringContaining(transcript) }),
          ]),
        })
      );
    });

    it('should translate Turkish', async () => {
      const transcript = 'Hello';
      const translated = 'Merhaba';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'tr', mockModel);
      expect(result).toBe(translated);
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should translate Spanish', async () => {
      const transcript = 'Hello';
      const translated = 'Hola';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should translate French', async () => {
      const transcript = 'Hello';
      const translated = 'Bonjour';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'fr', mockModel);
      expect(result).toBe(translated);
    });

    it('should translate German', async () => {
      const transcript = 'Hello';
      const translated = 'Hallo';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'de', mockModel);
      expect(result).toBe(translated);
    });

    it('should translate Japanese', async () => {
      const transcript = 'Hello';
      const translated = 'こんにちは';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'ja', mockModel);
      expect(result).toBe(translated);
    });

    it('should translate Chinese', async () => {
      const transcript = 'Hello';
      const translated = '你好';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'zh', mockModel);
      expect(result).toBe(translated);
    });

    it('should pass model to generateText', async () => {
      const customModel: any = { id: 'custom-model' };
      mockGenerateText.mockResolvedValue({ text: 'Translated' });

      await translateTranscript('Hello', 'es', customModel);

      expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({ model: customModel }));
    });

    it('should include language rules in system message', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Translated' });

      await translateTranscript('Hello', 'fr', mockModel);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Rules for fr'),
            }),
          ]),
        })
      );
    });

    it('should include transcript in user message', async () => {
      const transcript = 'Test transcript';
      mockGenerateText.mockResolvedValue({ text: 'Translated' });

      await translateTranscript(transcript, 'es', mockModel);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(transcript),
            }),
          ]),
        })
      );
    });
  });

  describe('Timestamp Preservation', () => {
    it('should handle transcript with timestamp format 00:01', async () => {
      const transcript = '00:01 Hello world';
      const translated = '00:01 Hola mundo';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle transcript with full timestamp 00:00:04.400', async () => {
      const transcript = '00:00:04.400 Hello world';
      const translated = '00:00:04.400 Hola mundo';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle multiple timestamps', async () => {
      const transcript = '00:01 Line 1\n00:05 Line 2\n00:10 Line 3';
      const translated = '00:01 Línea 1\n00:05 Línea 2\n00:10 Línea 3';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle transcript without timestamps', async () => {
      const transcript = 'Just some text without timestamps';
      const translated = 'Solo texto sin marcas de tiempo';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim translated text', async () => {
      const transcript = 'Hello';
      const translated = '  Hola  ';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe('Hola');
    });

    it('should trim leading whitespace', async () => {
      const transcript = 'Hello';
      const translated = '\n\n  Hola';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe('Hola');
    });

    it('should trim trailing whitespace', async () => {
      const transcript = 'Hello';
      const translated = 'Hola  \n\n';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe('Hola');
    });

    it('should handle transcript with line breaks', async () => {
      const transcript = 'Line 1\nLine 2\nLine 3';
      const translated = 'Línea 1\nLínea 2\nLínea 3';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle transcript with multiple line breaks', async () => {
      const transcript = 'Line 1\n\nLine 2\n\n\nLine 3';
      const translated = 'Línea 1\n\nLínea 2\n\n\nLínea 3';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcript', async () => {
      const transcript = '';
      mockGenerateText.mockResolvedValue({ text: '' });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe('');
    });

    it('should handle whitespace-only transcript', async () => {
      const transcript = '   \t\n   ';
      mockGenerateText.mockResolvedValue({ text: '   \t\n   ' });

      const result = await translateTranscript(transcript, 'es', mockModel);
      // trim() is called on result, so whitespace-only becomes empty
      expect(result).toBe('');
    });

    it('should handle very long transcript', async () => {
      const longTranscript = 'A'.repeat(10000);
      const longTranslation = 'B'.repeat(10000);
      mockGenerateText.mockResolvedValue({ text: longTranslation });

      const result = await translateTranscript(longTranscript, 'es', mockModel);
      expect(result).toBe(longTranslation);
    });

    it('should handle unicode characters', async () => {
      const transcript = 'Hello 世界 🌍';
      const translated = 'Hola 世界 🌍';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle special characters', async () => {
      const transcript = 'Hello @#$%^&*() <html>';
      const translated = 'Hola @#$%^&*() <html>';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle newlines with \\n', async () => {
      const transcript = 'Line 1\nLine 2';
      const translated = 'Línea 1\nLínea 2';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle newlines with \\r\\n', async () => {
      const transcript = 'Line 1\r\nLine 2';
      const translated = 'Línea 1\r\nLínea 2';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle uppercase language codes', async () => {
      const transcript = 'Hello';
      const translated = 'Hola';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'ES', mockModel);
      expect(result).toBe(translated);
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should handle mixed case language codes', async () => {
      const transcript = 'Hello';
      const translated = 'Hola';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'Es-ES', mockModel);
      expect(result).toBe(translated);
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should handle hyphenated language codes', async () => {
      const transcript = 'Hello';
      const translated = 'Hola';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es-ES', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle underscore language codes', async () => {
      const transcript = 'Hello';
      const translated = 'Merhaba';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'tr_TR', mockModel);
      expect(result).toBe(translated);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully and return original transcript', async () => {
      mockGenerateText.mockRejectedValue(new Error('AI invalid'));
      const transcript = '00:01 Hello';

      const result = await translateTranscript(transcript, 'es', mockModel);

      expect(result).toBe(transcript);
    });

    it('should return original on network error', async () => {
      mockGenerateText.mockRejectedValue(new Error('Network error'));
      const transcript = 'Test';

      const result = await translateTranscript(transcript, 'fr', mockModel);
      expect(result).toBe(transcript);
    });

    it('should return original on timeout', async () => {
      mockGenerateText.mockRejectedValue(new Error('Timeout'));
      const transcript = 'Test';

      const result = await translateTranscript(transcript, 'de', mockModel);
      expect(result).toBe(transcript);
    });

    it('should return original on undefined response', async () => {
      mockGenerateText.mockResolvedValue(undefined);
      const transcript = 'Test';

      // This will likely throw, so it should catch and return original
      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(transcript);
    });

    it('should return original on null response', async () => {
      mockGenerateText.mockResolvedValue(null);
      const transcript = 'Test';

      // This will likely throw, so it should catch and return original
      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(transcript);
    });

    it('should return original when response.text is undefined', async () => {
      mockGenerateText.mockResolvedValue({ text: undefined });
      const transcript = 'Test';

      // trim() on undefined will throw, catch and return original
      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(transcript);
    });

    it('should handle empty translated text', async () => {
      mockGenerateText.mockResolvedValue({ text: '' });
      const transcript = 'Hello';

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe('');
    });

    it('should handle multiple consecutive errors', async () => {
      mockGenerateText.mockRejectedValue(new Error('Persistent error'));
      const transcript = 'Test';

      const result1 = await translateTranscript(transcript, 'es', mockModel);
      const result2 = await translateTranscript(transcript, 'fr', mockModel);

      expect(result1).toBe(transcript);
      expect(result2).toBe(transcript);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle realistic video transcript', async () => {
      const transcript = `00:00:00.100 Welcome to this video
00:00:03.500 Today we'll discuss security
00:00:07.200 First, let's cover phishing attacks`;

      const translated = `00:00:00.100 Bienvenido a este vídeo
00:00:03.500 Hoy discutiremos sobre seguridad
00:00:07.200 Primero, cubramos los ataques de phishing`;

      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle transcript with punctuation', async () => {
      const transcript = 'Hello, world! How are you?';
      const translated = '¡Hola, mundo! ¿Cómo estás?';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle transcript with quotes', async () => {
      const transcript = 'He said "Hello" to me';
      const translated = 'Él me dijo "Hola"';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle transcript with numbers', async () => {
      const transcript = 'There are 123 users and 456 messages';
      const translated = 'Hay 123 usuarios y 456 mensajes';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });

    it('should handle mixed language content', async () => {
      const transcript = 'Hello world with some 中文 content';
      const translated = 'Hola mundo con algo de contenido 中文';
      mockGenerateText.mockResolvedValue({ text: translated });

      const result = await translateTranscript(transcript, 'es', mockModel);
      expect(result).toBe(translated);
    });
  });
});
