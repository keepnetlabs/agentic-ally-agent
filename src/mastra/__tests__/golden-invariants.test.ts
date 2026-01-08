import { describe, expect, it } from 'vitest';
import { formatToolSummary } from '../utils/core/tool-summary-formatter';
import { normalizeLandingCentering } from '../utils/landing-page/form-centering-normalizer';

describe('golden invariants (regression guardrails)', () => {
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

  it('landing centering normalizer adds margin:0 auto when max-width container lacks margin', () => {
    const input = `<div style='max-width: 480px; width: 100%; padding: 24px; background: #fff;'>X</div>`;
    const out = normalizeLandingCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });
});


