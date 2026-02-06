import { describe, it, expect } from 'vitest';
import { detectSmishingChannelFromText, normalizeSmishingChannel, resolveSmishingChannel } from './smishing-channel';

describe('smishing-channel utils', () => {
  describe('normalizeSmishingChannel', () => {
    it('should normalize valid channels', () => {
      expect(normalizeSmishingChannel('sms')).toBe('sms');
      expect(normalizeSmishingChannel('Slack')).toBe('slack');
      expect(normalizeSmishingChannel('WHATSAPP')).toBe('whatsapp');
      expect(normalizeSmishingChannel('teams')).toBe('teams');
      expect(normalizeSmishingChannel('telegram')).toBe('telegram');
      expect(normalizeSmishingChannel('instagram')).toBe('instagram');
      expect(normalizeSmishingChannel('linkedin')).toBe('linkedin');
    });

    it('should return undefined for invalid channels', () => {
      expect(normalizeSmishingChannel('email')).toBeUndefined();
    });

    it('should normalize common aliases', () => {
      expect(normalizeSmishingChannel('text')).toBe('sms');
      expect(normalizeSmishingChannel('wa')).toBe('whatsapp');
      expect(normalizeSmishingChannel('ms teams')).toBe('teams');
      expect(normalizeSmishingChannel('tg')).toBe('telegram');
      expect(normalizeSmishingChannel('insta')).toBe('instagram');
      expect(normalizeSmishingChannel('ig')).toBe('instagram');
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
      expect(detectSmishingChannelFromText('ms teams alert from IT')).toBe('teams');
    });

    it('should detect whatsapp', () => {
      expect(detectSmishingChannelFromText('WhatsApp message from HR')).toBe('whatsapp');
      expect(detectSmishingChannelFromText('whats app update notice')).toBe('whatsapp');
    });

    it('should detect telegram', () => {
      expect(detectSmishingChannelFromText('Telegram message from IT')).toBe('telegram');
      expect(detectSmishingChannelFromText('tg alert from support')).toBe('telegram');
    });

    it('should detect instagram', () => {
      expect(detectSmishingChannelFromText('Instagram DM from recruiter')).toBe('instagram');
      expect(detectSmishingChannelFromText('insta security message')).toBe('instagram');
    });

    it('should detect linkedin', () => {
      expect(detectSmishingChannelFromText('LinkedIn message from HR')).toBe('linkedin');
      expect(detectSmishingChannelFromText('InMail verification request')).toBe('linkedin');
    });

    it('should detect sms', () => {
      expect(detectSmishingChannelFromText('SMS alert for delivery')).toBe('sms');
      expect(detectSmishingChannelFromText('text message from bank')).toBe('sms');
      expect(detectSmishingChannelFromText('text from manager')).toBe('sms');
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

    it('should resolve newly supported explicit channels', () => {
      expect(resolveSmishingChannel({ deliveryChannel: 'telegram', topic: '', description: '' } as any)).toBe('telegram');
      expect(resolveSmishingChannel({ deliveryChannel: 'instagram', topic: '', description: '' } as any)).toBe('instagram');
      expect(resolveSmishingChannel({ deliveryChannel: 'linkedin', topic: '', description: '' } as any)).toBe('linkedin');
    });
  });
});
