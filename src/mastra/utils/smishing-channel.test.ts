import { describe, it, expect } from 'vitest';
import { detectSmishingChannelFromText, normalizeSmishingChannel, resolveSmishingChannel } from './smishing-channel';

describe('smishing-channel utils', () => {
  describe('normalizeSmishingChannel', () => {
    it('should normalize valid channels', () => {
      expect(normalizeSmishingChannel('sms')).toBe('sms');
      expect(normalizeSmishingChannel('Slack')).toBe('slack');
      expect(normalizeSmishingChannel('WHATSAPP')).toBe('whatsapp');
      expect(normalizeSmishingChannel('teams')).toBe('teams');
    });

    it('should return undefined for invalid channels', () => {
      expect(normalizeSmishingChannel('email')).toBeUndefined();
    });
  });

  describe('detectSmishingChannelFromText', () => {
    it('should detect slack', () => {
      expect(detectSmishingChannelFromText('Slack DM from IT')).toBe('slack');
      expect(detectSmishingChannelFromText('workspace chat request')).toBe('slack');
    });

    it('should detect teams', () => {
      expect(detectSmishingChannelFromText('Microsoft Teams security notice')).toBe('teams');
      expect(detectSmishingChannelFromText('teams chat from support')).toBe('teams');
    });

    it('should detect whatsapp', () => {
      expect(detectSmishingChannelFromText('WhatsApp message from HR')).toBe('whatsapp');
    });

    it('should detect sms', () => {
      expect(detectSmishingChannelFromText('SMS alert for delivery')).toBe('sms');
      expect(detectSmishingChannelFromText('text message from bank')).toBe('sms');
    });
  });

  describe('resolveSmishingChannel', () => {
    it('should prefer explicit analysis channel', () => {
      const analysis = { deliveryChannel: 'slack', topic: '', description: '' } as any;
      expect(resolveSmishingChannel(analysis)).toBe('slack');
    });

    it('should fallback to text detection', () => {
      const analysis = { topic: 'Slack security notice', description: '' } as any;
      expect(resolveSmishingChannel(analysis)).toBe('slack');
    });

    it('should default to sms when nothing matches', () => {
      const analysis = { topic: 'General security', description: '' } as any;
      expect(resolveSmishingChannel(analysis)).toBe('sms');
    });
  });
});
