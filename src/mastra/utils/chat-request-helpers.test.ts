import { describe, expect, it } from 'vitest';
import {
  extractMessageContent,
  parseAndValidateRequest,
  extractUserPrompt,
  buildRoutingContext,
  extractArtifactIdsFromRoutingContext,
} from './chat-request-helpers';
import type { ChatMessage } from '../types/api-types';

describe('chat-request-helpers', () => {
  describe('extractMessageContent', () => {
    it('returns simple string content', () => {
      const message: ChatMessage = { role: 'user', content: 'Hello' };
      expect(extractMessageContent(message)).toBe('Hello');
    });

    it('returns empty string for empty content', () => {
      const message: ChatMessage = { role: 'user', content: '' };
      expect(extractMessageContent(message)).toBe('');
    });

    it('handles array content (OpenAI format)', () => {
      const message: ChatMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'image' }, // Mock image part
        ],
      } as any;
      expect(extractMessageContent(message)).toBe('Hello [Image]');
    });

    it('handles Vercel AI SDK parts', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: null,
        parts: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: 'Part 2' },
        ],
      } as any;
      expect(extractMessageContent(message)).toBe('Part 1 Part 2');
    });

    it('returns [Tool Execution Result] for tool invocations', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: null,
        toolInvocations: [],
      } as any;
      expect(extractMessageContent(message)).toBe('[Tool Execution Result]');
    });

    it('returns [Tool Execution Result] for function_call', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: null,
        function_call: {},
      } as any;
      expect(extractMessageContent(message)).toBe('[Tool Execution Result]');
    });

    it('handles object fallback with text field', () => {
      const message: ChatMessage = {
        role: 'user',
        content: { text: 'Object content' },
      } as any;
      expect(extractMessageContent(message)).toBe('Object content');
    });

    it('handles object fallback without text field', () => {
      const content = { other: 'value' };
      const message: ChatMessage = {
        role: 'user',
        content,
      } as any;
      expect(extractMessageContent(message)).toBe(JSON.stringify(content));
    });

    it('returns [Empty Message] for null/undefined content if no other fields', () => {
      const message: ChatMessage = { role: 'user', content: null } as any;
      expect(extractMessageContent(message)).toBe('[Empty Message]');
    });
  });

  describe('extractUserPrompt', () => {
    it('returns undefined for empty messages', () => {
      expect(extractUserPrompt([])).toBeUndefined();
    });

    it('returns simple string content from last user message', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'response' },
        { role: 'user', content: 'last' },
      ];
      expect(extractUserPrompt(messages)).toBe('last');
    });

    it('returns undefined if no user message found', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'sys' },
        { role: 'assistant', content: 'response' },
      ];
      expect(extractUserPrompt(messages)).toBeUndefined();
    });

    it('handles Vercel AI SDK parts in user message', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: null,
          parts: [{ type: 'text', text: 'part text' }],
        } as any,
      ];
      expect(extractUserPrompt(messages)).toBe('part text');
    });
  });

  describe('parseAndValidateRequest', () => {
    it('extracts prompt from body.prompt', () => {
      const body = { prompt: 'myprompt' };
      const result = parseAndValidateRequest(body);
      expect(result).toEqual({ prompt: 'myprompt', routingContext: '' });
    });

    it('extracts prompt from body.text', () => {
      const body = { text: 'mytext' };
      const result = parseAndValidateRequest(body);
      expect(result).toEqual({ prompt: 'mytext', routingContext: '' });
    });

    it('extracts prompt from body.input', () => {
      const body = { input: 'myinput' };
      const result = parseAndValidateRequest(body);
      expect(result).toEqual({ prompt: 'myinput', routingContext: '' });
    });

    it('extracts prompt from messages array if no explicit prompt', () => {
      const messages = [{ role: 'user', content: 'msg prompt' }];
      const body = { messages };
      const result = parseAndValidateRequest(body as any);
      expect(result?.prompt).toBe('msg prompt');
      expect(result?.routingContext).toContain('Content: msg prompt');
    });

    it('returns null if no prompt found', () => {
      const body = {};
      expect(parseAndValidateRequest(body)).toBeNull();
    });

    it('builds routing context even if explicit prompt is provided', () => {
      const messages = [{ role: 'user', content: 'msg history' }];
      const body = { prompt: 'new prompt', messages };
      const result = parseAndValidateRequest(body as any);
      expect(result?.prompt).toBe('new prompt');
      expect(result?.routingContext).toContain('Content: msg history');
    });
  });

  describe('buildRoutingContext - UI signal cleaning', () => {
    it('converts smishing_sms UI signal to semantic message', () => {
      const smishingPayload = Buffer.from(JSON.stringify({ smishingId: 'sm-123456' }), 'utf-8').toString('base64');
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:smishing_sms::${smishingPayload}::/ui:smishing_sms::` } as any,
      ]);
      expect(context).toContain('[Smishing Simulation Created: smishingId=sm-123456]');
      const ids = extractArtifactIdsFromRoutingContext(context);
      expect(ids.smishingId).toBe('sm-123456');
    });

    it('converts vishing_call_started UI signal to semantic message', () => {
      const vishingPayload = Buffer.from(
        JSON.stringify({ conversationId: 'conv-xyz', callSid: 'CA-123' }),
        'utf-8'
      ).toString('base64');
      const context = buildRoutingContext([
        {
          role: 'assistant',
          content: `::ui:vishing_call_started::${vishingPayload}::/ui:vishing_call_started::`,
        } as any,
      ]);
      expect(context).toContain('[Vishing Call Initiated: conversationId=conv-xyz]');
    });

    it('converts training_uploaded UI signal with microlearningId and resourceId', () => {
      const payload = Buffer.from(JSON.stringify({ microlearningId: 'ml-up', resourceId: 'res-up' }), 'utf-8').toString(
        'base64'
      );
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:training_uploaded::${payload}::/ui:training_uploaded::` } as any,
      ]);
      expect(context).toContain('[Training Uploaded: microlearningId=ml-up, resourceId=res-up]');
    });

    it('extracts targetUserResourceId and targetGroupResourceId from routing context', () => {
      const context = buildRoutingContext([
        {
          role: 'assistant',
          content: 'Assigned (targetUserResourceId=user-123, targetGroupResourceId=group-456)',
        } as any,
      ]);
      const ids = extractArtifactIdsFromRoutingContext(context);
      expect(ids.targetUserResourceId).toBe('user-123');
      expect(ids.targetGroupResourceId).toBe('group-456');
    });
  });

  describe('buildRoutingContext', () => {
    it('returns empty string for empty messages array', () => {
      expect(buildRoutingContext([])).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(buildRoutingContext(null as any)).toBe('');
      expect(buildRoutingContext(undefined as any)).toBe('');
    });

    it('returns empty string for non-array', () => {
      expect(buildRoutingContext({} as any)).toBe('');
    });

    it('includes CONVERSATION HISTORY header', () => {
      const context = buildRoutingContext([{ role: 'user', content: 'Hi' }]);
      expect(context).toContain('CONVERSATION HISTORY');
      expect(context).toContain('Role: User');
      expect(context).toContain('Content: Hi');
    });
  });

  describe('extractArtifactIdsFromRoutingContext', () => {
    it('returns empty object for empty string', () => {
      expect(extractArtifactIdsFromRoutingContext('')).toEqual({});
    });

    it('returns empty object for null/undefined', () => {
      expect(extractArtifactIdsFromRoutingContext(null as any)).toEqual({});
      expect(extractArtifactIdsFromRoutingContext(undefined as any)).toEqual({});
    });

    it('extracts microlearningId from context', () => {
      const ids = extractArtifactIdsFromRoutingContext('Training: microlearningId=ml-abc123');
      expect(ids.microlearningId).toBe('ml-abc123');
    });

    it('extracts phishingId from context', () => {
      const ids = extractArtifactIdsFromRoutingContext('Phishing: phishingId=ph-xyz789');
      expect(ids.phishingId).toBe('ph-xyz789');
    });

    it('extracts resourceId from context', () => {
      const ids = extractArtifactIdsFromRoutingContext('resourceId=res-456');
      expect(ids.resourceId).toBe('res-456');
    });

    it('takes last match when multiple same-type IDs present', () => {
      const ids = extractArtifactIdsFromRoutingContext(
        'microlearningId=ml-first microlearningId=ml-last'
      );
      expect(ids.microlearningId).toBe('ml-last');
    });

    it('extracts languageId and sendTrainingLanguageId', () => {
      const ids = extractArtifactIdsFromRoutingContext(
        'languageId=lang-en sendTrainingLanguageId=lang-tr'
      );
      expect(ids.languageId).toBe('lang-en');
      expect(ids.sendTrainingLanguageId).toBe('lang-tr');
    });
  });

  describe('parseAndValidateRequest edge cases', () => {
    it('prefers prompt over text over input', () => {
      const body = { prompt: 'p', text: 't', input: 'i' };
      const result = parseAndValidateRequest(body);
      expect(result?.prompt).toBe('p');
    });
  });

  describe('buildRoutingContext - additional UI signals', () => {
    it('converts phishing_email UI signal to semantic message', () => {
      const payload = Buffer.from(JSON.stringify({ phishingId: 'ph-abc' }), 'utf-8').toString('base64');
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:phishing_email::${payload}::/ui:phishing_email::` } as any,
      ]);
      expect(context).toContain('[Phishing Simulation Email Created: phishingId=ph-abc]');
      const ids = extractArtifactIdsFromRoutingContext(context);
      expect(ids.phishingId).toBe('ph-abc');
    });

    it('converts landing_page UI signal with phishingId', () => {
      const payload = Buffer.from(JSON.stringify({ phishingId: 'ph-landing' }), 'utf-8').toString('base64');
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:landing_page::${payload}::/ui:landing_page::` } as any,
      ]);
      expect(context).toContain('[Phishing Simulation Landing Page Created: phishingId=ph-landing]');
    });

    it('converts training_meta UI signal with microlearningId', () => {
      const payload = Buffer.from(
        JSON.stringify({ microlearningId: 'ml-training-meta' }),
        'utf-8'
      ).toString('base64');
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:training_meta::${payload}::/ui:training_meta::` } as any,
      ]);
      expect(context).toContain('[Training Created: microlearningId=ml-training-meta]');
    });

    it('converts phishing_uploaded UI signal', () => {
      const payload = Buffer.from(
        JSON.stringify({ phishingId: 'ph-up', resourceId: 'res-up' }),
        'utf-8'
      ).toString('base64');
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:phishing_uploaded::${payload}::/ui:phishing_uploaded::` } as any,
      ]);
      expect(context).toContain('[Phishing Simulation Uploaded: phishingId=ph-up, resourceId=res-up]');
    });

    it('converts phishing_assigned UI signal with GROUP', () => {
      const payload = Buffer.from(
        JSON.stringify({
          resourceId: 'res-1',
          targetId: 'group-1',
          assignmentType: 'GROUP',
        }),
        'utf-8'
      ).toString('base64');
      const context = buildRoutingContext([
        { role: 'assistant', content: `::ui:phishing_assigned::${payload}::/ui:phishing_assigned::` } as any,
      ]);
      expect(context).toContain('targetGroupResourceId=group-1');
    });

    it('extracts smishingId from routing context', () => {
      const ids = extractArtifactIdsFromRoutingContext('Smishing: smishingId=sm-xyz123');
      expect(ids.smishingId).toBe('sm-xyz123');
    });
  });
});
