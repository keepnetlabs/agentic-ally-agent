import { describe, it, expect } from 'vitest';
import { detectPII, maskPIIValue, type PIIMatch } from './pii-detection-scorer';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const types = (matches: PIIMatch[]) => matches.map((m) => m.type);

// ---------------------------------------------------------------------------
// Email detection
// ---------------------------------------------------------------------------

describe('PII Detection — Email', () => {
  it('detects a real-looking email address', () => {
    const matches = detectPII('Please contact john.smith@accenture.co.uk for details.');
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe('email');
    expect(matches[0].value).toBe('john.smith@accenture.co.uk');
  });

  it('detects multiple emails', () => {
    const text = 'CC alice@bigcorp.de and bob@fintech.io on this thread.';
    const matches = detectPII(text);
    expect(matches.filter((m) => m.type === 'email')).toHaveLength(2);
  });

  it('ignores placeholder emails — example.com domain', () => {
    expect(detectPII('Send to user@example.com')).toHaveLength(0);
  });

  it('ignores placeholder emails — test.com domain', () => {
    expect(detectPII('Reach out to admin@test.com')).toHaveLength(0);
  });

  it('ignores placeholder emails — company.com domain', () => {
    expect(detectPII('Contact hr@company.com for onboarding')).toHaveLength(0);
  });

  it('ignores placeholder emails — contoso.com domain', () => {
    expect(detectPII('Email: admin@contoso.com')).toHaveLength(0);
  });

  it('ignores placeholder-prefix emails on any domain', () => {
    expect(detectPII('noreply@securityplatform.io')).toHaveLength(0);
  });

  it('ignores compound role-based emails with dot separator', () => {
    expect(detectPII('security.team@outlook.com')).toHaveLength(0);
  });

  it('ignores compound role-based emails with dash separator', () => {
    expect(detectPII('hr-department@bigcorp.com')).toHaveLength(0);
  });

  it('ignores compound role-based emails with underscore separator', () => {
    expect(detectPII('billing_support@fintech.io')).toHaveLength(0);
  });

  it('ignores deeply compound role-based emails', () => {
    expect(detectPII('service.update.team@gmail.com')).toHaveLength(0);
    expect(detectPII('security-alert-noreply@outlook.com')).toHaveLength(0);
  });

  it('does NOT ignore personal names that start with a prefix substring', () => {
    const matches = detectPII('harry.potter@gmail.com');
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe('email');
  });

  it('ignores merge-tag style locals', () => {
    expect(detectPII('Dear {{email}}@company.com')).toHaveLength(0);
  });

  it('flags a real email even when placeholder emails are also present', () => {
    const text = 'Reply to user@example.com or actual.person@realcorp.com';
    const matches = detectPII(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('actual.person@realcorp.com');
  });
});

// ---------------------------------------------------------------------------
// Phone number detection
// ---------------------------------------------------------------------------

describe('PII Detection — Phone', () => {
  it('detects Turkish mobile (+90 5xx)', () => {
    const matches = detectPII('Aramak için: +90 532 123 4567');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('detects international E.164 format', () => {
    const matches = detectPII('Call +442071234567 now');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('detects US format with dashes', () => {
    const matches = detectPII('Phone: +1-202-555-0123');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('does not flag short digit sequences as phone numbers', () => {
    const matches = detectPII('Order #12345 is confirmed.');
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });

  it('does not flag 4-digit years', () => {
    const matches = detectPII('Founded in 2024, the company grew rapidly.');
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC Kimlik No detection
// ---------------------------------------------------------------------------

describe('PII Detection — TC Kimlik No', () => {
  // Well-known valid TC Kimlik for testing: 10000000146
  it('detects a valid TC Kimlik number', () => {
    const matches = detectPII('TC Kimlik No: 10000000146');
    expect(matches.some((m) => m.type === 'tc_kimlik')).toBe(true);
  });

  it('does not flag a random 11-digit number that fails mod check', () => {
    const matches = detectPII('ID: 12345678901');
    expect(matches.filter((m) => m.type === 'tc_kimlik')).toHaveLength(0);
  });

  it('does not flag numbers starting with 0', () => {
    const matches = detectPII('Ref: 01234567890');
    expect(matches.filter((m) => m.type === 'tc_kimlik')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Credit card detection
// ---------------------------------------------------------------------------

describe('PII Detection — Credit Card', () => {
  // Luhn-valid test card numbers
  it('detects a Visa test card (spaced)', () => {
    const matches = detectPII('Card: 4111 1111 1111 1111');
    expect(matches.some((m) => m.type === 'credit_card')).toBe(true);
  });

  it('detects a Visa test card (dashed)', () => {
    const matches = detectPII('Card: 4111-1111-1111-1111');
    expect(matches.some((m) => m.type === 'credit_card')).toBe(true);
  });

  it('does not flag a number that fails Luhn', () => {
    const matches = detectPII('Card: 1234 5678 9012 3456');
    expect(matches.filter((m) => m.type === 'credit_card')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed / edge cases
// ---------------------------------------------------------------------------

describe('PII Detection — Mixed & Edge Cases', () => {
  it('detects multiple PII types in one text', () => {
    const text = `
      Contact: john.smith@accenture.co.uk
      Phone: +90 532 123 4567
      Card on file: 4111 1111 1111 1111
    `;
    const matches = detectPII(text);
    const foundTypes = new Set(types(matches));
    expect(foundTypes.has('email')).toBe(true);
    expect(foundTypes.has('phone')).toBe(true);
    expect(foundTypes.has('credit_card')).toBe(true);
  });

  it('returns empty array for clean text', () => {
    const text =
      'Dear colleague, please review the attached security awareness training module about phishing attacks.';
    expect(detectPII(text)).toHaveLength(0);
  });

  it('handles empty string', () => {
    expect(detectPII('')).toHaveLength(0);
  });

  it('handles text with only placeholder data', () => {
    const text = `
      From: noreply@company.com
      To: user@example.com
      Subject: Your training is ready
    `;
    expect(detectPII(text)).toHaveLength(0);
  });

  it('does not flag HTML/template merge tags', () => {
    const text = 'Hello {{firstName}}, click <a href="{{link}}">here</a>';
    expect(detectPII(text)).toHaveLength(0);
  });

  it('detects mail.com as a real email domain (not placeholder)', () => {
    const matches = detectPII('Contact sarah@mail.com for the report.');
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe('email');
    expect(matches[0].value).toBe('sarah@mail.com');
  });
});

// ---------------------------------------------------------------------------
// SSN detection
// ---------------------------------------------------------------------------

describe('PII Detection — US SSN', () => {
  it('detects a valid SSN with dashes', () => {
    const matches = detectPII('SSN: 123-45-6789');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
    expect(matches.find((m) => m.type === 'ssn')!.value).toBe('123-45-6789');
  });

  it('detects a valid SSN with spaces', () => {
    const matches = detectPII('SSN: 123 45 6789');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
  });

  it('detects a valid SSN without separators', () => {
    const matches = detectPII('SSN: 123456789');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
  });

  it('rejects SSN with area 000', () => {
    const matches = detectPII('SSN: 000-12-3456');
    expect(matches.filter((m) => m.type === 'ssn')).toHaveLength(0);
  });

  it('rejects SSN with area 666', () => {
    const matches = detectPII('SSN: 666-12-3456');
    expect(matches.filter((m) => m.type === 'ssn')).toHaveLength(0);
  });

  it('rejects SSN with area >= 900', () => {
    const matches = detectPII('SSN: 900-12-3456');
    expect(matches.filter((m) => m.type === 'ssn')).toHaveLength(0);
  });

  it('rejects SSN with group 00', () => {
    const matches = detectPII('SSN: 123-00-3456');
    expect(matches.filter((m) => m.type === 'ssn')).toHaveLength(0);
  });

  it('rejects SSN with serial 0000', () => {
    const matches = detectPII('SSN: 123-45-0000');
    expect(matches.filter((m) => m.type === 'ssn')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// IBAN detection
// ---------------------------------------------------------------------------

describe('PII Detection — IBAN', () => {
  it('detects a valid German IBAN', () => {
    const matches = detectPII('Transfer to DE89370400440532013000');
    expect(matches.some((m) => m.type === 'iban')).toBe(true);
  });

  it('detects a valid UK IBAN with spaces', () => {
    const matches = detectPII('IBAN: GB29 NWBK 6016 1331 9268 19');
    expect(matches.some((m) => m.type === 'iban')).toBe(true);
  });

  it('detects a valid French IBAN', () => {
    const matches = detectPII('IBAN: FR7630006000011234567890189');
    expect(matches.some((m) => m.type === 'iban')).toBe(true);
  });

  it('rejects an IBAN with bad check digits', () => {
    const matches = detectPII('IBAN: DE00370400440532013000');
    expect(matches.filter((m) => m.type === 'iban')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// UK NIN detection
// ---------------------------------------------------------------------------

describe('PII Detection — UK NIN', () => {
  it('detects a valid UK NIN with spaces', () => {
    const matches = detectPII('NI Number: AB 12 34 56 C');
    expect(matches.some((m) => m.type === 'uk_nin')).toBe(true);
  });

  it('detects a valid UK NIN without spaces', () => {
    const matches = detectPII('NIN: AB123456C');
    expect(matches.some((m) => m.type === 'uk_nin')).toBe(true);
  });

  it('rejects invalid prefix BG', () => {
    const matches = detectPII('NIN: BG123456A');
    expect(matches.filter((m) => m.type === 'uk_nin')).toHaveLength(0);
  });

  it('rejects invalid prefix GB', () => {
    const matches = detectPII('NIN: GB123456A');
    expect(matches.filter((m) => m.type === 'uk_nin')).toHaveLength(0);
  });

  it('rejects invalid prefix TN', () => {
    const matches = detectPII('NIN: TN123456A');
    expect(matches.filter((m) => m.type === 'uk_nin')).toHaveLength(0);
  });

  it('rejects suffix outside A-D range', () => {
    const matches = detectPII('NIN: AB123456E');
    expect(matches.filter((m) => m.type === 'uk_nin')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PII value masking
// ---------------------------------------------------------------------------

describe('maskPIIValue', () => {
  it('masks email — shows first char of local and domain', () => {
    const result = maskPIIValue({ type: 'email', value: 'john.doe@accenture.co.uk' });
    expect(result).toBe('j***@a***');
  });

  it('masks phone — replaces digits except last two', () => {
    const result = maskPIIValue({ type: 'phone', value: '+90 532 123 4567' });
    expect(result).toContain('*');
    expect(result).toMatch(/67$/);
  });

  it('masks TC Kimlik — shows first 2 and last 2', () => {
    const result = maskPIIValue({ type: 'tc_kimlik', value: '10000000146' });
    expect(result).toBe('10*******46');
  });

  it('masks credit card — shows first 4 and last 4', () => {
    const result = maskPIIValue({ type: 'credit_card', value: '4111 1111 1111 1111' });
    expect(result).toBe('4111-****-****-1111');
  });

  it('masks SSN — shows only last 4', () => {
    const result = maskPIIValue({ type: 'ssn', value: '123-45-6789' });
    expect(result).toBe('***-**-6789');
  });

  it('masks IBAN — shows only country code', () => {
    const result = maskPIIValue({ type: 'iban', value: 'DE89 3704 0044 0532 0130 00' });
    expect(result).toBe('DE**-****-****');
  });

  it('masks UK NIN — fully redacted', () => {
    const result = maskPIIValue({ type: 'uk_nin', value: 'AB 12 34 56 C' });
    expect(result).toBe('**-**-**-**-*');
  });
});
