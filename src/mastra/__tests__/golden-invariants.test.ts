import { describe, expect, it } from 'vitest';
import { formatToolSummary } from '../utils/core/tool-summary-formatter';
import { normalizeLandingCentering } from '../utils/landing-page/form-centering-normalizer';

describe('golden invariants (regression guardrails)', () => {
  describe('formatToolSummary', () => {
    it('tool summary formatter outputs stable key=value list and includes title', () => {
      const msg = formatToolSummary({
        prefix: '✅ Phishing uploaded',
        title: 'Test Scenario',
        suffix: 'Ready to assign',
        kv: [
          { key: 'scenarioName', value: 'Test Scenario' },
          { key: 'resourceId', value: 'res-123' },
          { key: 'phishingId', value: 'ph-777777' },
        ],
      });

      // Stable/parseable invariants (do not snapshot full string)
      expect(msg).toContain('✅ Phishing uploaded: "Test Scenario".');
      expect(msg).toContain('Ready to assign');
      expect(msg).toContain('scenarioName=Test Scenario');
      expect(msg).toContain('resourceId=res-123');
      expect(msg).toContain('phishingId=ph-777777');
    });

    it('tool summary formatter drops empty values and never emits empty ()', () => {
      const msg = formatToolSummary({
        prefix: '✅ Training assigned to USER user@company.com',
        kv: [
          { key: 'resourceId', value: 'r1' },
          { key: 'sendTrainingLanguageId', value: '' }, // dropped
        ],
      });
      expect(msg).toContain('resourceId=r1');
      expect(msg).not.toContain('sendTrainingLanguageId=');
      expect(msg).not.toContain('()');
    });

    it('should format message with only prefix', () => {
      const msg = formatToolSummary({
        prefix: '✅ Action completed',
      });
      expect(msg).toContain('✅ Action completed');
      expect(msg).not.toContain('undefined');
    });

    it('should format message with only suffix', () => {
      const msg = formatToolSummary({
        suffix: 'Operation finished',
      });
      expect(msg).toContain('Operation finished');
    });

    it('should handle multiple kv pairs consistently', () => {
      const msg = formatToolSummary({
        prefix: '✅ Created',
        kv: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' },
          { key: 'key3', value: 'value3' },
        ],
      });
      expect(msg).toContain('key1=value1');
      expect(msg).toContain('key2=value2');
      expect(msg).toContain('key3=value3');
    });

    it('should drop all empty kv values', () => {
      const msg = formatToolSummary({
        prefix: '✅ Test',
        kv: [
          { key: 'valid', value: 'data' },
          { key: 'empty1', value: '' },
          { key: 'empty2', value: '' },
        ],
      });
      expect(msg).toContain('valid=data');
      expect(msg).not.toContain('empty1=');
      expect(msg).not.toContain('empty2=');
    });

    it('should handle special characters in values', () => {
      const msg = formatToolSummary({
        prefix: '✅ Test',
        kv: [
          { key: 'email', value: 'user@example.com' },
          { key: 'path', value: '/api/v1/resource' },
        ],
      });
      expect(msg).toContain('email=user@example.com');
      expect(msg).toContain('path=/api/v1/resource');
    });

    it('should handle numeric values in kv pairs', () => {
      const msg = formatToolSummary({
        prefix: '✅ Created',
        kv: [
          { key: 'count', value: '123' },
          { key: 'id', value: '456789' },
        ],
      });
      expect(msg).toContain('count=123');
      expect(msg).toContain('id=456789');
    });

    it('should quote title correctly', () => {
      const msg = formatToolSummary({
        prefix: '✅ Created',
        title: 'My Test Title',
      });
      expect(msg).toContain('"My Test Title"');
    });

    it('should handle empty kv array', () => {
      const msg = formatToolSummary({
        prefix: '✅ Done',
        kv: [],
      });
      expect(msg).toContain('✅ Done');
      expect(msg).not.toContain('()');
    });

    it('should format with all fields present', () => {
      const msg = formatToolSummary({
        prefix: '✅ Complete',
        title: 'Full Test',
        suffix: 'All done',
        kv: [
          { key: 'id', value: '123' },
        ],
      });
      expect(msg).toContain('✅ Complete');
      expect(msg).toContain('"Full Test"');
      expect(msg).toContain('All done');
      expect(msg).toContain('id=123');
    });
  });

  describe('normalizeLandingCentering', () => {
    it('landing centering normalizer adds margin:0 auto when max-width container lacks margin', () => {
      const input = `<div style='max-width: 480px; width: 100%; padding: 24px; background: #fff;'>X</div>`;
      const out = normalizeLandingCentering(input);
      expect(out).toMatch(/margin:\s*0 auto/i);
    });

    it('should not duplicate margin if already present', () => {
      const input = `<div style='max-width: 480px; margin: 0 auto;'>X</div>`;
      const out = normalizeLandingCentering(input);
      const marginCount = (out.match(/margin:\s*0 auto/gi) || []).length;
      expect(marginCount).toBeLessThanOrEqual(1);
    });

    it('should handle max-width without space', () => {
      const input = `<div style='max-width:480px; width: 100%;'>X</div>`;
      const out = normalizeLandingCentering(input);
      expect(out).toMatch(/margin:\s*0 auto/i);
    });

    it('should handle multiple max-width containers', () => {
      const input = `
        <div style='max-width: 480px; width: 100%;'>First</div>
        <div style='max-width: 600px; width: 100%;'>Second</div>
      `;
      const out = normalizeLandingCentering(input);
      expect(out).toMatch(/margin:\s*0 auto/i);
    });

    it('should preserve existing styles when adding margin', () => {
      const input = `<div style='max-width: 480px; width: 100%; background: red; padding: 10px;'>X</div>`;
      const out = normalizeLandingCentering(input);
      expect(out).toContain('background: red');
      expect(out).toContain('padding: 10px');
      expect(out).toMatch(/margin:\s*0 auto/i);
    });

    it('should handle empty input', () => {
      const out = normalizeLandingCentering('');
      expect(out).toBe('');
    });

    it('should handle input without max-width', () => {
      const input = `<div style='width: 100%; padding: 20px;'>X</div>`;
      const out = normalizeLandingCentering(input);
      expect(out).toBe(input);
    });

    it('should handle nested containers with max-width', () => {
      const input = `
        <div style='max-width: 600px; width: 100%;'>
          <div style='max-width: 480px; width: 100%;'>Nested</div>
        </div>
      `;
      const out = normalizeLandingCentering(input);
      expect(out).toMatch(/margin:\s*0 auto/i);
    });

    it('should handle max-width with different units', () => {
      const input = `<div style='max-width: 30rem; width: 100%;'>X</div>`;
      const out = normalizeLandingCentering(input);
      // Should add margin if max-width is present
      expect(out).toMatch(/margin:\s*0 auto/i);
    });

    it('should handle inline styles with double quotes', () => {
      const input = `<div style="max-width: 480px; width: 100%;">X</div>`;
      const out = normalizeLandingCentering(input);
      expect(out).toMatch(/margin:\s*0 auto/i);
    });
  });

  describe('cross-component invariants', () => {
    it('tool summary never produces malformed output', () => {
      const testCases = [
        { prefix: '✅ Test', kv: [] },
        { prefix: '', kv: [{ key: 'a', value: 'b' }] },
        { title: 'Only Title' },
        { suffix: 'Only Suffix' },
      ];

      testCases.forEach(testCase => {
        const msg = formatToolSummary(testCase as any);
        expect(msg).toBeDefined();
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      });
    });

    it('landing centering maintains HTML validity', () => {
      const validInputs = [
        `<div style='max-width: 480px;'>Content</div>`,
        `<section style='max-width: 600px;'><p>Text</p></section>`,
        `<main style='max-width: 720px; padding: 20px;'>Main content</main>`,
      ];

      validInputs.forEach(input => {
        const out = normalizeLandingCentering(input);
        expect(out).toContain('<');
        expect(out).toContain('>');
        expect(out).toMatch(/max-width/i);
      });
    });

    it('formatToolSummary maintains consistent key=value format', () => {
      const msg = formatToolSummary({
        prefix: '✅ Test',
        kv: [
          { key: 'alpha', value: 'A' },
          { key: 'beta', value: 'B' },
          { key: 'gamma', value: 'C' },
        ],
      });

      // All kv pairs should follow key=value format
      expect(msg).toMatch(/alpha=A/);
      expect(msg).toMatch(/beta=B/);
      expect(msg).toMatch(/gamma=C/);
    });

    it('normalizeLandingCentering is idempotent', () => {
      const input = `<div style='max-width: 480px;'>X</div>`;
      const firstPass = normalizeLandingCentering(input);
      const secondPass = normalizeLandingCentering(firstPass);
      expect(firstPass).toBe(secondPass);
    });

    it('formatToolSummary handles boundary values gracefully', () => {
      const longValue = 'x'.repeat(1000);
      const msg = formatToolSummary({
        prefix: '✅ Test',
        kv: [{ key: 'longKey', value: longValue }],
      });
      expect(msg).toContain('longKey=');
      expect(msg).toContain(longValue);
    });

    it('normalizeLandingCentering preserves content integrity', () => {
      const input = `<div style='max-width: 480px;'>Important content that must not be lost</div>`;
      const out = normalizeLandingCentering(input);
      expect(out).toContain('Important content that must not be lost');
    });
  });
});


