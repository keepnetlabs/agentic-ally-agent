import type { PromptAnalysis } from '../types/prompt-analysis';

export type SmishingChannel = 'sms' | 'slack' | 'whatsapp' | 'teams';

export interface SmishingChannelPromptRules {
  channelLabel: string;
  channelFocusRule: string;
  channelToneRule: string;
  channelPromptLabel: string;
  channelFirstMessageLabel: string;
}

const CHANNEL_LABELS: Record<SmishingChannel, string> = {
  sms: 'SMS',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  teams: 'Teams',
};

export function normalizeSmishingChannel(input?: string | null): SmishingChannel | undefined {
  const candidate = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (candidate === 'sms' || candidate === 'slack' || candidate === 'whatsapp' || candidate === 'teams') {
    return candidate;
  }
  return undefined;
}

export function detectSmishingChannelFromText(text: string): SmishingChannel | undefined {
  const t = text.toLowerCase();

  if (t.includes('slack') || t.includes('workspace chat') || t.includes('slack dm') || t.includes('slack message')) {
    return 'slack';
  }
  if (t.includes('microsoft teams') || t.includes('teams chat') || t.includes('teams dm') || t.includes('teams message')) {
    return 'teams';
  }
  if (t.includes('whatsapp')) return 'whatsapp';
  if (t.includes('sms') || t.includes('text message') || t.includes('text-message') || t.includes('texting') || t.includes('text msg')) {
    return 'sms';
  }

  return undefined;
}

export function resolveSmishingChannel(
  analysis: PromptAnalysis,
  defaultChannel: SmishingChannel = 'sms'
): SmishingChannel {
  const direct = normalizeSmishingChannel(analysis.deliveryChannel);
  if (direct) return direct;

  const context = `${analysis.topic} ${analysis.description} ${analysis.additionalContext || ''} ${analysis.customRequirements || ''}`;
  const detected = detectSmishingChannelFromText(context);
  return detected ?? defaultChannel;
}

export function buildSmishingChannelPromptRules(channel: SmishingChannel): SmishingChannelPromptRules {
  const channelLabel = CHANNEL_LABELS[channel];
  const channelFocusRule = channel === 'sms'
    ? 'This scene is ALWAYS SMS/chat focused (no email/inbox language)'
    : `This scene is ALWAYS ${channelLabel} chat focused (no email/inbox or SMS language)`;
  const channelToneRule = channel === 'sms'
    ? 'Keep SMS tone: short, conversational, no markdown'
    : `Keep ${channelLabel} chat tone: short, conversational, no markdown; use natural ${channelLabel} cues (DM, @mentions, channel context)`;
  const channelPromptLabel = channel === 'sms' ? 'SMS' : `${channelLabel} chat`;
  const channelFirstMessageLabel = channel === 'sms'
    ? 'First SMS line'
    : `First ${channelLabel} chat line`;

  return {
    channelLabel,
    channelFocusRule,
    channelToneRule,
    channelPromptLabel,
    channelFirstMessageLabel,
  };
}
