import { LAYOUT_OPTIONS, STYLE_OPTIONS } from '../config/landing-page-design-config';
import type { LayoutOption, StyleOption } from '../config/landing-page-design-config';

export type LandingScenarioBucket = 'login-portal' | 'policy-ack' | 'consumer-notice' | 'generic';

interface LandingDesignPreference {
  layouts?: readonly LayoutOption['id'][];
  styles?: readonly StyleOption['id'][];
}

interface SelectLandingDesignParams {
  scenario: string;
  subject?: string;
  fromName: string;
  requiredPages: readonly string[];
  isQuishing: boolean;
}

const LANDING_BUCKET_DESIGN_PREFERENCES: Record<LandingScenarioBucket, LandingDesignPreference> = {
  'login-portal': {
    layouts: ['CENTERED', 'SPLIT'],
    styles: ['SHARP', 'FLAT'],
  },
  'policy-ack': {
    layouts: ['MINIMAL', 'CENTERED'],
    styles: ['SHARP', 'SOFT'],
  },
  'consumer-notice': {
    layouts: ['HERO', 'CENTERED'],
    styles: ['SOFT', 'FLAT'],
  },
  generic: {},
};

function pickRandomFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getLayoutById(id: LayoutOption['id']): LayoutOption {
  return LAYOUT_OPTIONS.find(layout => layout.id === id) || LAYOUT_OPTIONS[0];
}

function getStyleById(id: StyleOption['id']): StyleOption {
  return STYLE_OPTIONS.find(style => style.id === id) || STYLE_OPTIONS[0];
}

function resolveLayoutCandidates(bucket: LandingScenarioBucket): readonly LayoutOption[] {
  const preferredLayouts = LANDING_BUCKET_DESIGN_PREFERENCES[bucket].layouts;
  return preferredLayouts?.length ? preferredLayouts.map(getLayoutById) : LAYOUT_OPTIONS;
}

function resolveStyleCandidates(bucket: LandingScenarioBucket): readonly StyleOption[] {
  const preferredStyles = LANDING_BUCKET_DESIGN_PREFERENCES[bucket].styles;
  return preferredStyles?.length ? preferredStyles.map(getStyleById) : STYLE_OPTIONS;
}

export function inferLandingScenarioBucket(params: SelectLandingDesignParams): LandingScenarioBucket {
  const haystack = `${params.scenario} ${params.subject || ''} ${params.fromName}`.toLowerCase();
  const hasLoginFlow = params.requiredPages.includes('login');

  if (params.isQuishing) return 'login-portal';

  if (
    /policy|handbook|acknowledg|compliance|training|survey|benefit|remote work|hr /.test(haystack) ||
    (haystack.includes('hr') && !hasLoginFlow)
  ) {
    return 'policy-ack';
  }

  if (
    /order|delivery|package|shipment|tracking|invoice|billing|payment|subscription|customer|shopping|amazon|paypal|dhl|fedex/.test(
      haystack
    )
  ) {
    return 'consumer-notice';
  }

  if (
    /password|sign in|signin|login|log in|sso|mfa|security|verify|verification|vpn|okta|microsoft|google|work account|identity/.test(
      haystack
    ) ||
    (hasLoginFlow && /portal|credentials|mailbox|employee access|single sign-on|secure access/.test(haystack))
  ) {
    return 'login-portal';
  }

  return 'generic';
}

export function selectLandingDesign(params: SelectLandingDesignParams): {
  bucket: LandingScenarioBucket;
  layout: LayoutOption;
  style: StyleOption;
} {
  const bucket = inferLandingScenarioBucket(params);
  const layoutCandidates = resolveLayoutCandidates(bucket);
  const styleCandidates = resolveStyleCandidates(bucket);

  return {
    bucket,
    layout: pickRandomFrom(layoutCandidates),
    style: pickRandomFrom(styleCandidates),
  };
}

export function buildLandingContinuityGuidance(bucket: LandingScenarioBucket): string {
  if (bucket === 'login-portal') {
    return `- Use product-like sign-in language: short heading, short helper text, no marketing fluff.
- Keep the form plausible for the promised action: usually email/username + password, optionally one supporting control.
- Trust signals should feel standard and restrained, like a real identity provider or employee portal.`;
  }

  if (bucket === 'policy-ack') {
    return `- The page should feel like an internal employee workflow, acknowledgement, or policy review step.
- Prefer calm operational wording over dramatic security language unless the scenario explicitly requires urgency.
- If a login is present, frame it as access to an internal document or acknowledgement portal, not a generic consumer login.`;
  }

  if (bucket === 'consumer-notice') {
    return `- The page should feel like a customer-facing brand workflow with polished, reassuring copy.
- Match the tone of a delivery, billing, or account service page rather than a generic enterprise admin screen.
- Headlines and helper text should reference the promised customer task, not vague verification language.`;
  }

  return `- Keep the page specific to the scenario and avoid filler wording.
- The landing page should feel like the direct next step from the email, with one clear action and product-like microcopy.
- Avoid generic headings such as "Verify your account" unless the scenario genuinely revolves around account verification.`;
}
