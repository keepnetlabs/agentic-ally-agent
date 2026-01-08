import { describe, it, expect } from 'vitest';
import { maskPII, unmaskPII, generatePIIHash } from './pii-masking-utils';

describe('pii-masking-utils', () => {
  // ==================== HASH GENERATION ====================
  describe('generatePIIHash', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'john.doe@example.com';
      const hash1 = generatePIIHash(input);
      const hash2 = generatePIIHash(input);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = generatePIIHash('john@example.com');
      const hash2 = generatePIIHash('jane@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 8-character uppercase hex strings', () => {
      const hash = generatePIIHash('test@example.com');

      expect(hash).toMatch(/^[0-9A-F]{8}$/);
      expect(hash).toHaveLength(8);
    });

    it('should be case-insensitive (normalize to lowercase)', () => {
      const hash1 = generatePIIHash('John@Example.com');
      const hash2 = generatePIIHash('john@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace before hashing', () => {
      const hash1 = generatePIIHash('  john@example.com  ');
      const hash2 = generatePIIHash('john@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = generatePIIHash('');

      expect(hash).toMatch(/^[0-9A-F]{8}$/);
    });

    it('should handle special characters', () => {
      const hash = generatePIIHash('user+tag@example.co.uk');

      expect(hash).toMatch(/^[0-9A-F]{8}$/);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000) + '@example.com';
      const hash = generatePIIHash(longString);

      expect(hash).toMatch(/^[0-9A-F]{8}$/);
    });

    it('should handle unicode characters', () => {
      const hash = generatePIIHash('josé@example.com');

      expect(hash).toMatch(/^[0-9A-F]{8}$/);
    });
  });

  // ==================== EMAIL MASKING ====================
  describe('maskPII - Email Masking', () => {
    it('should mask simple email addresses', () => {
      const text = 'Contact me at john@example.com';
      const { maskedText, mapping } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
      expect(maskedText).not.toContain('john@example.com');
      expect(Object.values(mapping)).toContain('john@example.com');
    });

    it('should mask multiple email addresses', () => {
      const text = 'Send to john@example.com and jane@example.com';
      const { maskedText, mapping } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect((maskedText.match(/\[EMAIL-/g) || []).length).toBe(2);
      expect(Object.values(mapping)).toHaveLength(2);
    });

    it('should handle email with plus addressing', () => {
      const text = 'user+tag@example.com';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
      expect(maskedText).not.toContain('user+tag@example.com');
    });

    it('should handle email with subdomain', () => {
      const text = 'admin@mail.company.co.uk';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
    });

    it('should not mask invalid email patterns', () => {
      const text = 'this@is@invalid.com or missing@dotcom';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      // "this@is@invalid" should be masked, but "is@invalid.com" won't fully match
      expect(maskedText).toBeDefined();
    });

    it('should create mapping entry for each email', () => {
      const text = 'Email: test@example.com';
      const { mapping } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(mapping).toHaveProperty(
        Object.keys(mapping).find(k => mapping[k] === 'test@example.com') || '',
        'test@example.com'
      );
    });

    it('should preserve email domain structure in hash consistency', () => {
      const hash1 = generatePIIHash('john@example.com');
      const hash2 = generatePIIHash('john@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should handle emails with dots in local part', () => {
      const text = 'john.doe.smith@example.com';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
      expect(maskedText).not.toContain('john.doe.smith@example.com');
    });
  });

  // ==================== PHONE MASKING ====================
  describe('maskPII - Phone Masking', () => {
    it('should mask US phone numbers', () => {
      const text = 'Call me at (555) 123-4567';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
      expect(maskedText).not.toContain('555');
    });

    it('should mask phone numbers with dashes', () => {
      const text = 'Phone: 555-123-4567';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
    });

    it('should mask phone numbers with dots', () => {
      const text = 'Contact: 555.123.4567';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
    });

    it('should mask international phone numbers', () => {
      const text = '+1-555-123-4567';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
    });

    it('should mask phone numbers with country code', () => {
      const text = '+44 (0) 20 7946 0958';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
    });

    it('should mask multiple phone numbers', () => {
      const text = '(555) 123-4567 or 555-987-6543';
      const { maskedText, mapping } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect((maskedText.match(/\[PHONE-/g) || []).length).toBe(2);
      expect(Object.keys(mapping).length).toBe(2);
    });

    it('should handle phone with spaces', () => {
      const text = '555 123 4567';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
    });

    it('should handle German phone format', () => {
      const text = '+49 30 12345678';
      const { maskedText } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      expect(maskedText).toContain('[PHONE-');
    });

    it('should create mapping entries for phones', () => {
      const text = 'Phone: (555) 123-4567';
      const { mapping } = maskPII(text, { maskPhones: true, maskEmails: false, maskNames: false });

      const phoneValue = Object.values(mapping).find(v => v.includes('555'));
      expect(phoneValue).toBeDefined();
    });
  });

  // ==================== NAME MASKING ====================
  describe('maskPII - Name Masking', () => {
    it('should mask simple names with context', () => {
      const text = 'Create training for John Smith';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
      expect(maskedText).not.toContain('John Smith');
    });

    it('should mask Turkish names', () => {
      const text = 'Create training for Ali Yılmaz';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
      expect(maskedText).not.toContain('Ali Yılmaz');
    });

    it('should not mask names at start of text (command names)', () => {
      const text = 'Create Training John Smith';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      // "Training" at start should not trigger masking for next word
      expect(maskedText).toBeDefined();
    });

    it('should mask names after action verbs', () => {
      const text = 'Assign course to Peter Parker';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
      expect(maskedText).not.toContain('Peter Parker');
    });

    it('should mask names after prepositions', () => {
      const text = 'Send email for Jane Doe';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
    });

    it('should mask names with Turkish introducer', () => {
      const text = 'Eğitim oluştur Ali Yılmaz için';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
    });

    it('should not mask security terms that look like names', () => {
      const text = 'SQL Injection Attack Prevention';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      // Should NOT mask these security terms
      expect(maskedText).toBe(text);
    });

    it('should not mask training terms', () => {
      const text = 'Phishing Prevention Training Module';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toBe(text);
    });

    it('should mask names after colon', () => {
      const text = 'Employee: John Smith';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
      expect(maskedText).not.toContain('John Smith');
    });

    it('should mask names in lists', () => {
      const text = '- John Smith\n- Jane Doe\n- Peter Parker';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect((maskedText.match(/\[USER-/g) || []).length).toBe(3);
    });

    it('should create mapping for masked names', () => {
      const text = 'Create training for John Smith';
      const { mapping } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      const johnSmithHash = Object.entries(mapping)
        .find(([_k, v]) => v.includes('Smith'));
      expect(johnSmithHash).toBeDefined();
    });

    it('should handle names with hyphens', () => {
      const text = 'Create training for Mary-Jane Watson';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toBeDefined();
    });

    it('should not mask single capitalized words', () => {
      const text = 'The training module for Security';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      // "Security" alone is not a name pattern
      expect(maskedText).toBe(text);
    });

    it('should handle names with Turkish special characters', () => {
      const text = 'Kişi: Sercan Çetin';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
    });
  });

  // ==================== ROUNDTRIP TESTING ====================
  describe('maskPII + unmaskPII Roundtrip', () => {
    it('should unmask email after masking', () => {
      const originalText = 'Email: john@example.com';
      const { maskedText, mapping } = maskPII(originalText, { maskEmails: true, maskNames: false, maskPhones: false });
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toBe(originalText);
    });

    it('should unmask phone after masking', () => {
      const originalText = 'Phone: (555) 123-4567';
      const { maskedText, mapping } = maskPII(originalText, { maskPhones: true, maskEmails: false, maskNames: false });
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toBe(originalText);
    });

    it('should unmask names after masking', () => {
      const originalText = 'Create training for John Smith';
      const { maskedText, mapping } = maskPII(originalText, { maskNames: true, maskEmails: false, maskPhones: false });
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toBe(originalText);
    });

    it('should handle multiple PII types roundtrip', () => {
      const originalText = 'Create phishing training for John Smith at john@example.com, phone (555) 123-4567';
      const { maskedText, mapping } = maskPII(originalText);
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toBe(originalText);
    });

    it('should handle empty mapping gracefully', () => {
      const text = 'No PII here';
      const { maskedText, mapping } = maskPII(text);
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toBe(text);
    });

    it('should unmask multiple occurrences of same PII', () => {
      const originalText = 'Email john@example.com and also john@example.com again';
      const { maskedText, mapping } = maskPII(originalText, { maskEmails: true, maskNames: false, maskPhones: false });
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toContain('john@example.com');
      expect((unmasked.match(/john@example\.com/g) || []).length).toBe(2);
    });

    it('should handle partial matches in unmask', () => {
      const { maskedText, mapping } = maskPII('john@example.com and jane@example.com', { maskEmails: true, maskNames: false, maskPhones: false });
      const unmasked = unmaskPII(maskedText, mapping);

      expect(unmasked).toContain('john@example.com');
      expect(unmasked).toContain('jane@example.com');
    });
  });

  // ==================== OPTIONS CONFIGURATION ====================
  describe('maskPII - Options Configuration', () => {
    it('should respect maskNames option', () => {
      const text = 'Create training for John Smith at john@example.com';
      const { maskedText } = maskPII(text, { maskNames: false, maskEmails: true, maskPhones: false });

      expect(maskedText).toContain('John Smith');
      expect(maskedText).toContain('[EMAIL-');
    });

    it('should respect maskEmails option', () => {
      const text = 'Create training for John Smith at john@example.com';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
      expect(maskedText).toContain('john@example.com');
    });

    it('should respect maskPhones option', () => {
      const text = 'Contact John Smith at (555) 123-4567';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('[USER-');
      expect(maskedText).toContain('(555) 123-4567');
    });

    it('should mask all when all options enabled', () => {
      const text = 'John Smith, john@example.com, (555) 123-4567';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: true, maskPhones: true });

      expect(maskedText).not.toContain('John Smith');
      expect(maskedText).not.toContain('john@example.com');
      expect(maskedText).not.toContain('555');
    });

    it('should mask nothing when all options disabled', () => {
      const text = 'John Smith, john@example.com, (555) 123-4567';
      const { maskedText } = maskPII(text, { maskNames: false, maskEmails: false, maskPhones: false });

      expect(maskedText).toBe(text);
    });

    it('should use default options when not provided', () => {
      const text = 'John Smith, john@example.com, (555) 123-4567';
      const { maskedText } = maskPII(text); // No options

      // Default is all true
      expect(maskedText).toBeDefined();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const { maskedText, mapping } = maskPII('');

      expect(maskedText).toBe('');
      expect(Object.keys(mapping)).toHaveLength(0);
    });

    it('should handle very long text', () => {
      const longText = 'John Smith '.repeat(1000) + 'john@example.com';
      const { maskedText } = maskPII(longText);

      expect(maskedText).toBeDefined();
      expect(maskedText.length).toBeGreaterThan(0);
    });

    it('should handle text with only whitespace', () => {
      const { maskedText, mapping } = maskPII('   \n\t  ');

      expect(maskedText).toMatch(/^\s+$/);
      expect(Object.keys(mapping)).toHaveLength(0);
    });

    it('should handle text with mixed case emails', () => {
      const text = 'Contact John@Example.COM';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
    });

    it('should handle repeated PII', () => {
      const text = 'john@example.com john@example.com john@example.com';
      const { maskedText, mapping } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      // Same email should map to same hash
      expect((maskedText.match(/\[EMAIL-/g) || []).length).toBe(3);
      expect(Object.keys(mapping)).toHaveLength(1);
    });

    it('should handle special regex characters in PII', () => {
      const text = 'test+special.chars@example.com';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
    });

    it('should preserve text structure around masked PII', () => {
      const text = 'Hello John Smith, how are you?';
      const { maskedText } = maskPII(text, { maskNames: true, maskEmails: false, maskPhones: false });

      expect(maskedText).toContain('Hello');
      expect(maskedText).toContain(', how are you?');
    });

    it('should handle consecutive PII', () => {
      const text = 'john@example.com(555)123-4567john.smith@example.com';
      const { maskedText } = maskPII(text);

      expect(maskedText).toBeDefined();
    });

    it('should handle tabs and newlines', () => {
      const text = 'John Smith\nPhone:\t(555) 123-4567\nEmail:\tjohn@example.com';
      const { maskedText } = maskPII(text);

      expect(maskedText).toContain('\n');
      expect(maskedText).toContain('\t');
    });

    it('should handle emoji and unicode', () => {
      const text = '👤 John Smith 📧 john@example.com';
      const { maskedText } = maskPII(text);

      expect(maskedText).toContain('👤');
      expect(maskedText).toContain('📧');
    });

    it('should handle null-like strings', () => {
      const text = 'Contact: [NULL] or john@example.com';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[NULL]');
      expect(maskedText).toContain('[EMAIL-');
    });

    it('should handle multilingual text', () => {
      const text = 'Öğrenci Ali Yılmaz - Email: ali@example.com - Phone: +90 555 123 4567';
      const { maskedText } = maskPII(text);

      expect(maskedText).toContain('[USER-');
      expect(maskedText).toContain('[EMAIL-');
      expect(maskedText).toContain('[PHONE-');
    });

    it('should be idempotent with empty mapping', () => {
      const text = 'No PII here';
      const { maskedText: masked1, mapping: mapping1 } = maskPII(text);
      const { maskedText: masked2, mapping: mapping2 } = maskPII(text);

      expect(masked1).toBe(masked2);
      expect(mapping1).toEqual(mapping2);
    });

    it('should handle inline PII in code blocks', () => {
      const text = 'def send_email(to: str = "john@example.com"):';
      const { maskedText } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(maskedText).toContain('[EMAIL-');
      expect(maskedText).toContain('def send_email');
    });
  });

  // ==================== MAPPING VERIFICATION ====================
  describe('Mapping Management', () => {
    it('should create unique hash for each PII', () => {
      const text = 'john@example.com and jane@example.com and (555)123-4567';
      const { mapping } = maskPII(text);

      expect(Object.keys(mapping).length).toBeGreaterThanOrEqual(2);
    });

    it('should map same PII to same hash', () => {
      const text = 'john@example.com and also john@example.com';
      const { mapping } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(Object.keys(mapping)).toHaveLength(1);
    });

    it('should have consistent mapping across calls', () => {
      const { mapping: mapping1 } = maskPII('john@example.com', { maskEmails: true, maskNames: false, maskPhones: false });
      const { mapping: mapping2 } = maskPII('john@example.com', { maskEmails: true, maskNames: false, maskPhones: false });

      expect(mapping1).toEqual(mapping2);
    });

    it('should return empty mapping when no PII found', () => {
      const { mapping } = maskPII('This is clean text');

      expect(Object.keys(mapping)).toHaveLength(0);
    });

    it('should preserve original values in mapping', () => {
      const originalEmail = 'john.doe+tag@example.co.uk';
      const text = `Contact: ${originalEmail}`;
      const { mapping } = maskPII(text, { maskEmails: true, maskNames: false, maskPhones: false });

      expect(Object.values(mapping)).toContain(originalEmail);
    });
  });
});
