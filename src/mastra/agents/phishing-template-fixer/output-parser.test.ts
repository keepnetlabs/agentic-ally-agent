import { describe, expect, it } from 'vitest';
import { parseEmailTemplateOutput, parseLandingPageOutput } from './output-parser';

// ============================================
// EMAIL TEMPLATE PARSER
// ============================================

describe('parseEmailTemplateOutput', () => {
  it('parses valid email template output wrapped in markdown', () => {
    const raw = `\`\`\`json
{
  "fixed_html": "<!DOCTYPE html><html><head></head><body>Email</body></html>",
  "change_log": [
    "FIXED: rebuilt outer wrapper table",
    "BUTTONS: normalized CTA with hybrid VML button",
    "PLACEHOLDERS: replaced recipient links with {PHISHINGURL}",
    "TAGS: selected brand, premise, and trigger"
  ],
  "tags": ["MICROSOFT", "CREDENTIAL_HARVEST", "TRIGGER_URGENCY"],
  "difficulty": "DIFFICULTY_HIGH",
  "from_address": "info@example.com",
  "from_name": "IT Helpdesk",
  "subject": "Action Required: Verify Your Account"
}
\`\`\``;

    const result = parseEmailTemplateOutput(raw);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(3);
      expect(result.data.from_address).toBe('info@example.com');
      expect(result.data.from_name).toBe('IT Helpdesk');
      expect(result.data.subject).toBe('Action Required: Verify Your Account');
      expect(result.data.fixed_html).toContain('<!DOCTYPE html>');
      expect(result.data.change_log).toHaveLength(4);
      expect(result.data.difficulty).toBe('DIFFICULTY_HIGH');
    }
  });

  it('rejects email output missing subject field', () => {
    const raw = JSON.stringify({
      fixed_html: '<!DOCTYPE html><html><head></head><body>Email</body></html>',
      change_log: [
        'FIXED: normalized wrapper table',
        'BUTTONS: rebuilt CTA button',
        'PLACEHOLDERS: replaced phishing URL placeholders',
      ],
      tags: ['MICROSOFT', 'CREDENTIAL_HARVEST', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_HIGH',
      from_address: 'info@example.com',
      from_name: 'IT Helpdesk',
    });

    const result = parseEmailTemplateOutput(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('subject');
    }
  });

  it('rejects outputs with fewer than exactly three tags', () => {
    const raw = JSON.stringify({
      fixed_html: '<!DOCTYPE html><html><head></head><body>Email</body></html>',
      change_log: [
        'FIXED: normalized wrapper table',
        'BUTTONS: rebuilt CTA button',
        'PLACEHOLDERS: replaced phishing URL placeholders',
      ],
      tags: ['MICROSOFT', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_HIGH',
      from_address: 'info@example.com',
      from_name: 'IT Helpdesk',
      subject: 'Test Subject',
    });

    const result = parseEmailTemplateOutput(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('tags');
    }
  });

  it('rejects outputs whose HTML does not start with doctype', () => {
    const raw = JSON.stringify({
      fixed_html: '<html><head></head><body>Email</body></html>',
      change_log: [
        'FIXED: normalized wrapper table',
        'BUTTONS: rebuilt CTA button',
        'PLACEHOLDERS: replaced phishing URL placeholders',
      ],
      tags: ['MICROSOFT', 'CREDENTIAL_HARVEST', 'TRIGGER_URGENCY'],
      difficulty: 'DIFFICULTY_HIGH',
      from_address: 'info@example.com',
      from_name: 'IT Helpdesk',
      subject: 'Test Subject',
    });

    const result = parseEmailTemplateOutput(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('fixed_html');
    }
  });

  it('rejects empty response', () => {
    const result = parseEmailTemplateOutput('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Empty response');
    }
  });
});

// ============================================
// LANDING PAGE PARSER
// ============================================

describe('parseLandingPageOutput', () => {
  it('parses valid landing page classification output', () => {
    const raw = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      domain: 'signin-authzone.com',
      change_log: ['BRAND: HR portal based on form layout', 'DOMAIN: Selected signin-authzone.com'],
    });

    const result = parseLandingPageOutput(raw);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(3);
      expect(result.data.difficulty).toBe('DIFFICULTY_MEDIUM');
      expect(result.data.domain).toBe('signin-authzone.com');
      expect(result.data.change_log).toHaveLength(2);
    }
  });

  it('rejects landing page output with extra email fields', () => {
    // Extra fields are stripped by Zod (passthrough not used), so this should still pass
    const raw = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      domain: 'signin-authzone.com',
      change_log: ['Classification change_log here'],
      fixed_html: '<!DOCTYPE html><html></html>',
      from_address: 'info@example.com',
    });

    const result = parseLandingPageOutput(raw);

    // Zod strips unknown keys by default — the core fields are valid
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(3);
      expect(result.data.domain).toBe('signin-authzone.com');
      // Extra fields should NOT be present
      expect((result.data as Record<string, unknown>).fixed_html).toBeUndefined();
      expect((result.data as Record<string, unknown>).from_address).toBeUndefined();
    }
  });

  it('rejects landing page output missing domain', () => {
    const raw = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      change_log: ['Some change_log'],
    });

    const result = parseLandingPageOutput(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('domain');
    }
  });

  it('rejects landing page output missing change_log', () => {
    const raw = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'DIFFICULTY_MEDIUM',
      domain: 'signin-authzone.com',
    });

    const result = parseLandingPageOutput(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('change_log');
    }
  });

  it('rejects landing page output with invalid difficulty', () => {
    const raw = JSON.stringify({
      tags: ['HR', 'DOCUMENT_SHARE', 'TRIGGER_CURIOSITY'],
      difficulty: 'EASY',
      domain: 'signin-authzone.com',
      change_log: ['Some change_log'],
    });

    const result = parseLandingPageOutput(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('difficulty');
    }
  });
});

// ============================================
// LEGACY UNIFIED PARSER
// ============================================
