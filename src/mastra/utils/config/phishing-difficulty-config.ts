/**
 * Phishing Difficulty Configuration
 * Defines rules and guidelines for generating phishing simulations at different difficulty levels
 */

export const DIFFICULTY_CONFIG = {
  Easy: {
    sender: {
      rule: 'OBVIOUS FAKE',
      examples: [
        'support@micr0soft.com (typo)',
        'service.update.team@gmail.com (public domain)',
        'security-alert-team@hotmail.com',
      ],
    },
    grammar: {
      rule: 'POOR',
      description: 'Include 2-3 noticeable spelling or grammar mistakes. Use excessive capitalization.',
    },
    urgency: {
      rule: 'EXTREME',
      description: "Panic-inducing language. 'IMMEDIATE ACTION REQUIRED', 'ACCOUNT WILL BE DELETED'.",
    },
    visuals: {
      rule: 'BASIC',
      description: 'Simple layout. Use brand logos if available, otherwise generic icons. High contrast colors.',
    },
  },
  Medium: {
    sender: {
      rule: 'SUSPICIOUS BUT PLAUSIBLE',
      examples: [
        'support@microsoft-security-updates.net (external domain)',
        'hr-department@company-internal-portal.org',
      ],
    },
    grammar: {
      rule: 'GOOD BUT IMPERFECT',
      description: 'Generally correct, but maybe one awkward phrase or slightly robotic tone.',
    },
    urgency: {
      rule: 'HIGH',
      description: "Professional but pressing. 'Action required within 24 hours', 'Please verify details'.",
    },
    visuals: {
      rule: 'PROFESSIONAL',
      description: 'Clean, modern design. USE BRAND LOGOS (from public URL). Looks legitimate at first glance.',
    },
  },
  Hard: {
    sender: {
      rule: 'SOPHISTICATED SPOOFING',
      examples: [
        'security@microsoft.com (looks legitimate)',
        'notifications@internal.apple.com',
        'ceo-office@company.com',
      ],
    },
    grammar: {
      rule: 'FLAWLESS',
      description: 'Perfect corporate speak. Professional, helpful, and bureaucratic tone.',
    },
    urgency: {
      rule: 'SUBTLE / CURIOSITY',
      description:
        "Low apparent urgency. 'FYI: Updated Policy', 'Please review attached report', 'New benefits available'.",
    },
    visuals: {
      rule: 'PERFECT REPLICA - PROFESSIONAL',
      description:
        'Use official brand colors (HEX exact), fonts, and layout. It should look 100% indistinguishable from the real site.',
    },
  },
} as const;
