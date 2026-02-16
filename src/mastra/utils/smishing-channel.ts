import type { PromptAnalysis } from '../types/prompt-analysis';

export type SmishingChannel = 'sms' | 'slack' | 'whatsapp' | 'teams' | 'telegram' | 'instagram' | 'linkedin';

export interface SmishingChannelPromptRules {
  channelLabel: string;
  channelFocusRule: string;
  channelToneRule: string;
  channelInteractionRule: string;
  channelPromptLabel: string;
  channelFirstMessageLabel: string;
}

const CHANNEL_LABELS: Record<SmishingChannel, string> = {
  sms: 'SMS',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  teams: 'Teams',
  telegram: 'Telegram',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const CHANNEL_INTERACTION_RULES: Record<SmishingChannel, string> = {
  sms: 'Use very short bursts (1 sentence per turn), minimal context, and concise urgency',
  whatsapp: 'Use natural WhatsApp chat flow (brief, informal, quick back-and-forth)',
  slack: 'Use workplace DM framing without over-formality',
  teams: 'Use corporate Teams phrasing with internal-work context',
  telegram: 'Use concise Telegram-style chat flow (fast, informal, direct asks)',
  instagram: 'Use Instagram DM style (brief social tone)',
  linkedin: 'Use professional DM style',
};

export function normalizeSmishingChannel(input?: string | null): SmishingChannel | undefined {
  const candidate = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (candidate === 'text' || candidate === 'texting') return 'sms';
  if (candidate === 'wa' || candidate === 'whats app') return 'whatsapp';
  if (candidate === 'ms teams' || candidate === 'msteams') return 'teams';
  if (candidate === 'tg') return 'telegram';
  if (candidate === 'insta' || candidate === 'ig') return 'instagram';
  if (
    candidate === 'sms' ||
    candidate === 'slack' ||
    candidate === 'whatsapp' ||
    candidate === 'teams' ||
    candidate === 'telegram' ||
    candidate === 'instagram' ||
    candidate === 'linkedin'
  ) {
    return candidate;
  }
  return undefined;
}

export function detectSmishingChannelFromText(text: string): SmishingChannel | undefined {
  const t = text.toLowerCase();
  const hasStandaloneText = /\btext\b/.test(t);
  const hasStandaloneWa = /\bwa\b/.test(t);
  const hasStandaloneIg = /\big\b/.test(t);
  const hasStandaloneTg = /\btg\b/.test(t);

  if (t.includes('slack') || t.includes('workspace chat') || t.includes('slack dm') || t.includes('slack message')) {
    return 'slack';
  }
  if (
    t.includes('microsoft teams') ||
    t.includes('teams chat') ||
    t.includes('teams dm') ||
    t.includes('teams message')
  ) {
    return 'teams';
  }
  if (t.includes('linkedin') || t.includes('linkedin dm') || t.includes('linkedin message') || t.includes('inmail')) {
    return 'linkedin';
  }
  if (
    t.includes('instagram') ||
    t.includes('insta') ||
    t.includes('instagram dm') ||
    t.includes('instagram message') ||
    hasStandaloneIg
  ) {
    return 'instagram';
  }
  if (t.includes('telegram') || t.includes('telegram dm') || t.includes('telegram message') || hasStandaloneTg) {
    return 'telegram';
  }
  if (t.includes('ms teams') || t.includes('msteams')) return 'teams';
  if (t.includes('whatsapp') || t.includes('whats app') || hasStandaloneWa) return 'whatsapp';
  if (
    t.includes('sms') ||
    t.includes('text message') ||
    t.includes('text-message') ||
    t.includes('texting') ||
    t.includes('text msg') ||
    hasStandaloneText
  ) {
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
  const channelFocusRule =
    channel === 'sms'
      ? 'This scene is ALWAYS SMS/chat focused (no email/inbox language)'
      : `This scene is ALWAYS ${channelLabel} chat focused (no email/inbox or SMS language)`;
  const channelToneRule =
    channel === 'sms'
      ? 'Keep SMS tone: short, conversational, no markdown'
      : `Keep ${channelLabel} chat tone: short, conversational, no markdown; use natural ${channelLabel} cues (DM, @mentions, channel context)`;
  const channelInteractionRule = CHANNEL_INTERACTION_RULES[channel];
  const channelPromptLabel = channel === 'sms' ? 'SMS' : `${channelLabel} chat`;
  const channelFirstMessageLabel = channel === 'sms' ? 'First SMS line' : `First ${channelLabel} chat line`;

  return {
    channelLabel,
    channelFocusRule,
    channelToneRule,
    channelInteractionRule,
    channelPromptLabel,
    channelFirstMessageLabel,
  };
}
