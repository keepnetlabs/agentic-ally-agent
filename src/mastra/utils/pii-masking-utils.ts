// src/mastra/utils/pii-masking-utils.ts
// Zero PII - Mask personally identifiable information before sending to LLMs

import crypto from 'crypto';

/**
 * PII Masking Configuration
 */
interface PIIMaskingOptions {
  maskNames?: boolean;
  maskEmails?: boolean;
  maskPhones?: boolean;
  preserveStructure?: boolean; // Keep "User [ID]" format vs random hash
}

/**
 * Mapping store to reverse PII masking if needed
 */
interface PIIMapping {
  [hashedId: string]: string;
}

const defaultOptions: PIIMaskingOptions = {
  maskNames: true,
  maskEmails: true,
  maskPhones: true,
  preserveStructure: true,
};

/**
 * Generate consistent hash for PII
 */
function generatePIIHash(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex').substring(0, 8);
}

/**
 * Mask person names (Turkish & English) with context-aware position analysis
 * Detects: "Ali Yılmaz", "John Smith", "Gürkan Demir", etc.
 * Prevents false positives: "SQL Injection", "Create Training"
 */
function maskNames(text: string, mapping: PIIMapping): string {
  // Pattern: Capitalized word followed by capitalized word (common name pattern)
  // Turkish letters: ğ, ü, ş, ı, ö, ç, Ğ, Ü, Ş, İ, Ö, Ç
  const namePattern = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+)\b/g;

  // Introducer words that should NOT be part of a name
  const introducerWords = /^(for|to|by|from|with|için|kullanıcı|kişi|para|pour|für|von|por|par|de|an|ad|isim)$/i;

  return text.replace(namePattern, (match, name, offset) => {
    // Check if match starts with an introducer word
    const words = match.split(/\s+/);
    const firstWord = words[0];

    if (introducerWords.test(firstWord) && words.length > 1) {
      // Match includes introducer + name (e.g., "For Gürkan Uğurlu")
      // Strip the introducer and mask only the actual name
      const actualName = words.slice(1).join(' ');
      const hash = generatePIIHash(actualName);
      mapping[hash] = actualName;
      return `${firstWord} [USER-${hash.toUpperCase()}]`;
    }

    // Context analysis: 20 chars before/after the match
    const before = text.substring(Math.max(0, offset - 20), offset);
    const after = text.substring(offset + match.length, offset + match.length + 20);

    // ✅ STRONG SIGNALS: These indicate the match is likely a real name
    const strongSignals = [
      /:\s*$/,                    // "User: ", "Name: " (universal)
      /\(\s*$/,                   // "Training (" (universal)
      /@[A-Za-z0-9.-]+/,          // Email nearby (strong indicator)
      /^\s*[-–—]\s*/,             // "- John Doe" (list item)

      // English introducers (word boundary + space, no $ end anchor)
      /\b(for|to|by|from|with)\s+$/i,

      // Turkish introducers
      /\b(için|kullanıcı|kişi|ad|isim)\s+$/i,

      // Spanish introducers
      /\b(para|por|de)\s+$/i,

      // French introducers
      /\b(pour|par|de)\s+$/i,

      // German introducers
      /\b(für|von|an)\s+$/i,

      // Portuguese introducers
      /\b(para|por|de)\s+$/i,
    ];

    // ❌ COMMAND/TECHNICAL SIGNALS: These indicate it's NOT a name
    const commandSignals = [
      // English keywords
      /training/i,                // "Phishing Training"
      /prevention/i,              // "SQL Injection Prevention"
      /attack/i,                  // "Ransomware Attack"
      /injection/i,               // "SQL Injection"
      /course/i,                  // "Security Course"
      /simulation/i,              // "Phishing Simulation"
      /awareness/i,               // "Security Awareness"
      /protection/i,              // "Data Protection"
      /security/i,                // "Information Security"
      /create/i,                  // "Create Training"
      /build/i,                   // "Build Course"
      /make/i,                    // "Make Training"
      /generate/i,                // "Generate Content"

      // Turkish keywords
      /eğitim/i,                  // "Phishing Eğitimi"
      /kurs/i,                    // "Güvenlik Kursu"
      /saldırı/i,                 // "Ransomware Saldırısı"
      /güvenlik/i,                // "Bilgi Güvenliği"
      /oluştur/i,                 // "Eğitim Oluştur"
      /yap/i,                     // "Eğitim Yap"
      /önleme/i,                  // "SQL Injection Önleme"
      /koruma/i,                  // "Veri Koruma"
      /simülasyon/i,              // "Phishing Simülasyonu"
    ];

    // Check if match appears at start of text or line
    const isAtStart = offset === 0 || /^\s*$/.test(text.substring(0, offset)) || /\n\s*$/.test(before);

    // Evaluate context
    const hasStrongSignal = strongSignals.some(r => r.test(before) || r.test(after));
    const hasCommandSignal = commandSignals.some(r => r.test(before) || r.test(match) || r.test(after));

    // Decision logic
    if (hasStrongSignal && !hasCommandSignal) {
      // Definite name (has strong indicator, no command keywords)
      const hash = generatePIIHash(name);
      mapping[hash] = name;
      return `[USER-${hash.toUpperCase()}]`;
    }

    if (isAtStart || hasCommandSignal) {
      // Sentence start or command keyword present → Don't mask
      return match;
    }

    // Default: Conservative approach - don't mask unless confident
    return match;
  });
}

/**
 * Mask email addresses
 */
function maskEmails(text: string, mapping: PIIMapping): string {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  return text.replace(emailPattern, (match) => {
    const hash = generatePIIHash(match);
    mapping[hash] = match;
    return `[EMAIL-${hash.toUpperCase()}]`;
  });
}

/**
 * Mask phone numbers (international formats)
 */
function maskPhones(text: string, mapping: PIIMapping): string {
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  return text.replace(phonePattern, (match) => {
    const hash = generatePIIHash(match);
    mapping[hash] = match;
    return `[PHONE-${hash.toUpperCase()}]`;
  });
}

/**
 * Main PII masking function
 * Removes personally identifiable information from text before sending to LLMs
 */
export function maskPII(
  text: string,
  options: PIIMaskingOptions = defaultOptions
): { maskedText: string; mapping: PIIMapping } {
  const mapping: PIIMapping = {};
  let maskedText = text;

  if (options.maskNames) {
    maskedText = maskNames(maskedText, mapping);
  }

  if (options.maskEmails) {
    maskedText = maskEmails(maskedText, mapping);
  }

  if (options.maskPhones) {
    maskedText = maskPhones(maskedText, mapping);
  }

  return { maskedText, mapping };
}

/**
 * Unmask PII (reverse operation)
 * Useful if you need to restore original names in final output
 */
export function unmaskPII(text: string, mapping: PIIMapping): string {
  let unmaskedText = text;

  Object.entries(mapping).forEach(([hash, original]) => {
    const maskPattern = new RegExp(`\\[USER-${hash.toUpperCase()}\\]`, 'g');
    unmaskedText = unmaskedText.replace(maskPattern, original);

    const emailPattern = new RegExp(`\\[EMAIL-${hash.toUpperCase()}\\]`, 'g');
    unmaskedText = unmaskedText.replace(emailPattern, original);

    const phonePattern = new RegExp(`\\[PHONE-${hash.toUpperCase()}\\]`, 'g');
    unmaskedText = unmaskedText.replace(phonePattern, original);
  });

  return unmaskedText;
}

/**
 * Extract user IDs from masked text
 * Useful for tracking which users were mentioned
 */
export function extractMaskedUserIDs(text: string): string[] {
  const pattern = /\[USER-([A-F0-9]+)\]/g;
  const matches = [...text.matchAll(pattern)];
  return matches.map(m => m[1]);
}

/**
 * Test helper - check if text contains PII
 */
export function containsPII(text: string): boolean {
  const namePattern = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\b/;
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  return namePattern.test(text) || emailPattern.test(text) || phonePattern.test(text);
}
