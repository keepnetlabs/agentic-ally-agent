import { describe, it, expect } from 'vitest';
import {
  smishingChatMessageSchema,
  smishingChatRequestSchema,
  parsedSmishingChatResponseSchema,
} from './smishing-chat-route.schemas';

describe('smishingChatMessageSchema', () => {
  it('accepts valid user message', () => {
    const result = smishingChatMessageSchema.safeParse({ role: 'user', content: 'Hello' });
    expect(result.success).toBe(true);
  });

  it('accepts valid assistant message', () => {
    const result = smishingChatMessageSchema.safeParse({ role: 'assistant', content: 'Hi there' });
    expect(result.success).toBe(true);
  });

  it('accepts valid system message', () => {
    const result = smishingChatMessageSchema.safeParse({ role: 'system', content: 'You are helpful' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = smishingChatMessageSchema.safeParse({ role: 'invalid', content: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = smishingChatMessageSchema.safeParse({ role: 'user', content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 2000 chars', () => {
    const result = smishingChatMessageSchema.safeParse({
      role: 'user',
      content: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe('smishingChatRequestSchema', () => {
  it('accepts valid request with messages', () => {
    const result = smishingChatRequestSchema.safeParse({
      microlearningId: 'ml-123',
      language: 'en',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid request without messages', () => {
    const result = smishingChatRequestSchema.safeParse({
      microlearningId: 'ml-123',
      language: 'en',
    });
    expect(result.success).toBe(true);
  });

  it('preprocesses non-array messages to undefined', () => {
    const result = smishingChatRequestSchema.safeParse({
      microlearningId: 'ml-123',
      language: 'en',
      messages: 'not-an-array',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.messages).toBeUndefined();
  });

  it('accepts optional modelProvider and model', () => {
    const result = smishingChatRequestSchema.safeParse({
      microlearningId: 'ml-123',
      language: 'en',
      modelProvider: 'openai',
      model: 'gpt-4o-mini',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.modelProvider).toBe('openai');
    expect(result.success && result.data.model).toBe('gpt-4o-mini');
  });

  it('rejects missing microlearningId', () => {
    const result = smishingChatRequestSchema.safeParse({
      language: 'en',
    });
    expect(result.success).toBe(false);
  });

  it('rejects language shorter than 2 chars', () => {
    const result = smishingChatRequestSchema.safeParse({
      microlearningId: 'ml-123',
      language: 'x',
    });
    expect(result.success).toBe(false);
  });
});

describe('parsedSmishingChatResponseSchema', () => {
  it('accepts valid response with reply and isFinished', () => {
    const result = parsedSmishingChatResponseSchema.safeParse({
      reply: 'Here is my response',
      isFinished: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts response without isFinished', () => {
    const result = parsedSmishingChatResponseSchema.safeParse({
      reply: 'Response only',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty reply', () => {
    const result = parsedSmishingChatResponseSchema.safeParse({
      reply: '',
      isFinished: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects reply with only whitespace', () => {
    const result = parsedSmishingChatResponseSchema.safeParse({
      reply: '   ',
      isFinished: false,
    });
    expect(result.success).toBe(false);
  });
});
