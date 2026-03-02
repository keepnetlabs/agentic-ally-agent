import { describe, it, expect } from 'vitest';
import {
  vishingConversationsSummaryRequestSchema,
  vishingConversationsSummaryMessageSchema,
} from './vishing-conversations-summary-route.schemas';

describe('vishingConversationsSummaryRequestSchema', () => {
  it('accepts valid request with accessToken and messages', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'a'.repeat(32),
      messages: [
        { role: 'user' as const, text: 'Hello', timestamp: 0 },
        { role: 'agent' as const, text: 'Hi there', timestamp: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects accessToken shorter than 32 chars', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'short',
      messages: [{ role: 'user' as const, text: 'Hi' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty messages array', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'a'.repeat(32),
      messages: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts message with message field instead of text', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'a'.repeat(32),
      messages: [{ role: 'user' as const, message: 'Hello from message field' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages[0].text).toBe('Hello from message field');
    }
  });

  it('prefers text over message when both present', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'a'.repeat(32),
      messages: [
        { role: 'user' as const, text: 'Text wins', message: 'Message loses' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages[0].text).toBe('Text wins');
    }
  });

  it('filters out empty messages via preprocess and keeps valid ones', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'a'.repeat(32),
      messages: [
        { role: 'user' as const, text: 'Valid message' },
        { role: 'agent' as const, text: '' },
        { role: 'user' as const },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages).toHaveLength(1);
      expect(result.data.messages[0].text).toBe('Valid message');
    }
  });

  it('rejects message with empty text after transform', () => {
    const result = vishingConversationsSummaryRequestSchema.safeParse({
      accessToken: 'a'.repeat(32),
      messages: [{ role: 'user' as const, text: '   ', message: '' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('vishingConversationsSummaryMessageSchema', () => {
  it('accepts valid message with text', () => {
    const result = vishingConversationsSummaryMessageSchema.safeParse({
      role: 'user' as const,
      text: 'Hello',
      timestamp: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid message with message field', () => {
    const result = vishingConversationsSummaryMessageSchema.safeParse({
      role: 'agent' as const,
      message: 'Response here',
    });
    expect(result.success).toBe(true);
  });

  it('rejects message with empty text', () => {
    const result = vishingConversationsSummaryMessageSchema.safeParse({
      role: 'user' as const,
      text: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = vishingConversationsSummaryMessageSchema.safeParse({
      role: 'invalid',
      text: 'Hi',
    });
    expect(result.success).toBe(false);
  });
});
