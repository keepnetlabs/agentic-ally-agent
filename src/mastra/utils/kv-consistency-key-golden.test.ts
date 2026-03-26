/**
 * Golden key shapes using **real** CLOUDFLARE_KV.KEY_TEMPLATES from constants
 * (no mocks). Catches accidental template changes that break upload/KV wait paths.
 */
import { describe, it, expect } from 'vitest';
import {
  buildExpectedKVKeys,
  buildExpectedPhishingKeys,
  buildExpectedSmishingKeys,
} from './kv-consistency';

describe('kv-consistency key golden (production templates)', () => {
  it('buildExpectedKVKeys matches ml:… structure', () => {
    expect(buildExpectedKVKeys('ml-abc-123')).toEqual(['ml:ml-abc-123:base']);
    expect(buildExpectedKVKeys('ml-abc-123', 'en-GB')).toEqual([
      'ml:ml-abc-123:base',
      'ml:ml-abc-123:lang:en-gb',
    ]);
    expect(buildExpectedKVKeys('ml-abc-123', 'en-GB', 'Finance')).toEqual([
      'ml:ml-abc-123:base',
      'ml:ml-abc-123:lang:en-gb',
      'ml:ml-abc-123:inbox:Finance:en-gb',
    ]);
  });

  it('buildExpectedPhishingKeys matches phishing:… structure', () => {
    expect(buildExpectedPhishingKeys('pid-1', 'tr-TR')).toEqual([
      'phishing:pid-1:base',
      'phishing:pid-1:email:tr-tr',
      'phishing:pid-1:landing:tr-tr',
    ]);
    expect(buildExpectedPhishingKeys('pid-1', 'en-us', false, false)).toEqual(['phishing:pid-1:base']);
  });

  it('buildExpectedSmishingKeys matches smishing:… structure', () => {
    expect(buildExpectedSmishingKeys('sid-1', 'de-DE')).toEqual([
      'smishing:sid-1:base',
      'smishing:sid-1:sms:de-de',
      'smishing:sid-1:landing:de-de',
    ]);
  });
});
