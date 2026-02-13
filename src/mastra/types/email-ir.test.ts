import { describe, expect, it } from 'vitest';
import { EmailIREmailDataSchema } from './email-ir';

describe('EmailIREmailDataSchema', () => {
  it('accepts minimal required payload', () => {
    const result = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Test subject',
    });

    expect(result.success).toBe(true);
  });

  it('rejects payload when required fields are missing', () => {
    expect(
      EmailIREmailDataSchema.safeParse({
        subject: 'Missing sender',
      }).success
    ).toBe(false);

    expect(
      EmailIREmailDataSchema.safeParse({
        from: 'sender@example.com',
      }).success
    ).toBe(false);
  });

  it('validates nested url/attachment/ip/header arrays', () => {
    const result = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Indicators present',
      urls: [{ url: 'https://example.com', result: 'Clean' }],
      attachments: [{ name: 'file.pdf', result: 'Clean' }],
      ips: [{ ip: '8.8.8.8', result: 'Clean' }],
      headers: [{ key: 'Authentication-Results', value: 'spf=pass' }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid nested array item shapes', () => {
    const badUrl = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Bad URL',
      urls: [{ result: 'Clean' }],
    });

    const badAttachment = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Bad attachment',
      attachments: [{ result: 'Clean' }],
    });

    const badIp = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Bad ip',
      ips: [{ result: 'Clean' }],
    });

    const badHeader = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Bad header',
      headers: [{ key: 'Authentication-Results' }],
    });

    expect(badUrl.success).toBe(false);
    expect(badAttachment.success).toBe(false);
    expect(badIp.success).toBe(false);
    expect(badHeader.success).toBe(false);
  });

  it('allows passthrough extra fields', () => {
    const result = EmailIREmailDataSchema.safeParse({
      from: 'sender@example.com',
      subject: 'Extra fields',
      customField: 'allowed',
      nestedUnknown: { a: 1 },
    });

    expect(result.success).toBe(true);
    expect((result as any).data.customField).toBe('allowed');
  });
});
