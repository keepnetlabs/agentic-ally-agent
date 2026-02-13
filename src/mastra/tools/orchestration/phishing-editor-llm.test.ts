import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmailEditPromise, createLandingEditPromises } from './phishing-editor-llm';
import { generateText } from 'ai';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import * as prompts from './phishing-editor-prompts';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: any) => await fn()),
  withTimeout: vi.fn(async (p: any) => await p),
}));

vi.mock('./phishing-editor-prompts', () => ({
  getPhishingEditorSystemPrompt: vi.fn(() => 'SYSTEM_EMAIL'),
  getPhishingEmailUserPrompt: vi.fn(() => 'USER_EMAIL'),
  getLandingPageSystemPrompt: vi.fn(() => 'SYSTEM_LANDING'),
  getLandingPageUserPrompt: vi.fn(() => 'USER_LANDING'),
}));

describe('phishing-editor-llm', () => {
  const logger = { info: vi.fn() };
  const model = { modelId: 'test-model' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({ text: '{"ok":true}' });
  });

  // ==================== EMAIL EDIT PROMISE ====================
  describe('createEmailEditPromise', () => {
    it('should call generateText with system+user messages', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Sub', template: '<html></html>' },
        escapedInstruction: 'Make it English',
        brandContext: '',
        logger,
      });

      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), 'Phishing email editing');
      expect(withTimeout).toHaveBeenCalled();
      expect(generateText).toHaveBeenCalledTimes(1);

      const callArg = (generateText as any).mock.calls[0][0];
      expect(callArg.model).toBe(model);
      expect(callArg.messages).toEqual([
        { role: 'system', content: 'SYSTEM_EMAIL' },
        { role: 'user', content: 'USER_EMAIL' },
      ]);
      expect(logger.info).toHaveBeenCalledWith('Calling LLM for email editing');
    });

    it('uses temperature 0.3', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      const callArg = (generateText as any).mock.calls[0][0];
      expect(callArg.temperature).toBe(0.3);
    });

    it('passes email to prompt generator', async () => {
      const email = { subject: 'Important', template: '<html>Content</html>' };

      await createEmailEditPromise({
        aiModel: model,
        email,
        escapedInstruction: 'Make formal',
        brandContext: 'Brand X',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(email, 'Make formal', 'Brand X');
    });

    it('calls system prompt generator', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(prompts.getPhishingEditorSystemPrompt).toHaveBeenCalled();
    });

    it('wraps call with retry and timeout', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), 'Phishing email editing');
      expect(withTimeout).toHaveBeenCalled();
    });

    it('returns generateText result', async () => {
      const mockResult = { text: '{"edited": true}' };
      (generateText as any).mockResolvedValue(mockResult);

      const result = await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(result).toBe(mockResult);
    });

    it('handles empty brand context', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(expect.any(Object), 'Edit', '');
    });

    it('handles non-empty brand context', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: 'Acme Corp',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(expect.any(Object), 'Edit', 'Acme Corp');
    });

    it('handles complex email templates', async () => {
      const email = {
        subject: 'Complex Subject',
        template: '<html><body><div>Very long template</div></body></html>',
      };

      await createEmailEditPromise({
        aiModel: model,
        email,
        escapedInstruction: 'Simplify',
        brandContext: '',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(email, 'Simplify', '');
    });

    it('handles special characters in instruction', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Make it "professional" & formal',
        brandContext: '',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(
        expect.any(Object),
        'Make it "professional" & formal',
        ''
      );
    });
  });

  // ==================== LANDING EDIT PROMISES ====================
  describe('createLandingEditPromises', () => {
    it('should create one promise per page and call generateText', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [
          { type: 'login', template: '<html>1</html>' },
          { type: 'login', template: '<html>2</html>' },
        ],
        mode: 'edit',
        escapedInstruction: 'Make it English',
        brandContext: '',
        logger,
      });

      expect(promises).toHaveLength(2);

      await Promise.all(promises);

      expect(generateText).toHaveBeenCalledTimes(2);
      const firstCall = (generateText as any).mock.calls[0][0];
      expect(firstCall.messages[0]).toEqual({ role: 'system', content: 'SYSTEM_LANDING' });
      expect(firstCall.messages[1]).toEqual({ role: 'user', content: 'USER_LANDING' });
    });

    it('returns empty array for empty pages', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(promises).toEqual([]);
      expect(generateText).not.toHaveBeenCalled();
    });

    it('uses temperature 0.3 for all pages', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [
          { type: 'login', template: '<html>1</html>' },
          { type: 'survey', template: '<html>2</html>' },
        ],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      const calls = (generateText as any).mock.calls;
      expect(calls[0][0].temperature).toBe(0.3);
      expect(calls[1][0].temperature).toBe(0.3);
    });

    it('passes mode to system prompt generator', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'create',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageSystemPrompt).toHaveBeenCalledWith('create');
    });

    it('passes page data to user prompt generator', async () => {
      const page1 = { type: 'login', template: '<html>Login</html>' };
      const page2 = { type: 'survey', template: '<html>Survey</html>' };

      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [page1, page2],
        mode: 'edit',
        escapedInstruction: 'Improve',
        brandContext: 'Company',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageUserPrompt).toHaveBeenCalledWith(page1, 'Improve', 'Company');
      expect(prompts.getLandingPageUserPrompt).toHaveBeenCalledWith(page2, 'Improve', 'Company');
    });

    it('wraps each call with retry and timeout', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [
          { type: 'login', template: '<html>1</html>' },
          { type: 'login', template: '<html>2</html>' },
        ],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), 'Phishing landing page 1 editing');
      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), 'Phishing landing page 2 editing');
      expect(withTimeout).toHaveBeenCalledTimes(2);
    });

    it('logs for each page with correct index', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [
          { type: 'login', template: '<html>1</html>' },
          { type: 'login', template: '<html>2</html>' },
          { type: 'login', template: '<html>3</html>' },
        ],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(logger.info).toHaveBeenCalledWith('Calling LLM for landing page 1 editing');
      expect(logger.info).toHaveBeenCalledWith('Calling LLM for landing page 2 editing');
      expect(logger.info).toHaveBeenCalledWith('Calling LLM for landing page 3 editing');
    });

    it('returns array of promises that resolve to generateText results', async () => {
      (generateText as any).mockResolvedValueOnce({ text: 'result1' });
      (generateText as any).mockResolvedValueOnce({ text: 'result2' });

      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [
          { type: 'login', template: '<html>1</html>' },
          { type: 'login', template: '<html>2</html>' },
        ],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      const results = await Promise.all(promises);

      expect(results[0]).toEqual({ text: 'result1' });
      expect(results[1]).toEqual({ text: 'result2' });
    });

    it('handles single page', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(promises).toHaveLength(1);
      await Promise.all(promises);
      expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('handles many pages', async () => {
      const pages = Array(10)
        .fill(null)
        .map((_, i) => ({
          type: 'login',
          template: `<html>${i}</html>`,
        }));

      const promises = createLandingEditPromises({
        aiModel: model,
        pages,
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      expect(promises).toHaveLength(10);
      await Promise.all(promises);
      expect(generateText).toHaveBeenCalledTimes(10);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles empty instruction in email edit', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: '',
        brandContext: '',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(expect.any(Object), '', '');
    });

    it('handles empty instruction in landing edit', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: '',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageUserPrompt).toHaveBeenCalledWith(expect.any(Object), '', '');
    });

    it('handles very long brand context', async () => {
      const longBrand = 'A'.repeat(10000);

      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: longBrand,
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(expect.any(Object), 'Edit', longBrand);
    });

    it('handles unicode in instruction', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Make it 中文 and use émojis 🎉',
        brandContext: '',
        logger,
      });

      expect(prompts.getPhishingEmailUserPrompt).toHaveBeenCalledWith(
        expect.any(Object),
        'Make it 中文 and use émojis 🎉',
        ''
      );
    });
  });

  // ==================== MODEL CONFIGURATION ====================
  describe('Model Configuration', () => {
    it('passes model correctly to email edit', async () => {
      const customModel = { modelId: 'custom-model', config: {} } as any;

      await createEmailEditPromise({
        aiModel: customModel,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      const callArg = (generateText as any).mock.calls[0][0];
      expect(callArg.model).toBe(customModel);
    });

    it('passes model correctly to landing edits', async () => {
      const customModel = { modelId: 'custom-model' } as any;

      const promises = createLandingEditPromises({
        aiModel: customModel,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      const callArg = (generateText as any).mock.calls[0][0];
      expect(callArg.model).toBe(customModel);
    });
  });

  // ==================== MESSAGE STRUCTURE ====================
  describe('Message Structure', () => {
    it('email edit creates messages in correct order', async () => {
      await createEmailEditPromise({
        aiModel: model,
        email: { subject: 'Test', template: '<html></html>' },
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      const callArg = (generateText as any).mock.calls[0][0];
      expect(callArg.messages).toHaveLength(2);
      expect(callArg.messages[0].role).toBe('system');
      expect(callArg.messages[1].role).toBe('user');
    });

    it('landing edit creates messages in correct order', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      const callArg = (generateText as any).mock.calls[0][0];
      expect(callArg.messages).toHaveLength(2);
      expect(callArg.messages[0].role).toBe('system');
      expect(callArg.messages[1].role).toBe('user');
    });
  });

  // ==================== DIFFERENT PAGE TYPES ====================
  describe('Different Page Types', () => {
    it('handles login page type', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageUserPrompt).toHaveBeenCalledWith(
        { type: 'login', template: '<html></html>' },
        'Edit',
        ''
      );
    });

    it('handles survey page type', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'survey', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageUserPrompt).toHaveBeenCalledWith(
        { type: 'survey', template: '<html></html>' },
        'Edit',
        ''
      );
    });

    it('handles mixed page types', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [
          { type: 'login', template: '<html>1</html>' },
          { type: 'survey', template: '<html>2</html>' },
          { type: 'login', template: '<html>3</html>' },
        ],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(generateText).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== DIFFERENT MODES ====================
  describe('Different Modes', () => {
    it('handles edit mode', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'edit',
        escapedInstruction: 'Edit',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageSystemPrompt).toHaveBeenCalledWith('edit');
    });

    it('handles create mode', async () => {
      const promises = createLandingEditPromises({
        aiModel: model,
        pages: [{ type: 'login', template: '<html></html>' }],
        mode: 'create',
        escapedInstruction: 'Create',
        brandContext: '',
        logger,
      });

      await Promise.all(promises);

      expect(prompts.getLandingPageSystemPrompt).toHaveBeenCalledWith('create');
    });
  });
});
