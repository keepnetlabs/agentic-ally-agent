type ActionFamilyGuidanceParams = {
  journeyType?: string;
  offerMechanic?: string;
  method?: string;
  isQuishing?: boolean;
};

type ActionFamilyGuidance = {
  familyLabel: string;
  emailActionExamples: string[];
  loginHeadingExample: string;
  successHeadingExample: string;
  avoidMixing: string[];
};

function resolveActionFamilyGuidance(params: ActionFamilyGuidanceParams): ActionFamilyGuidance {
  const journeyType = params.journeyType || 'generic';
  const offerMechanic = params.offerMechanic || 'generic';
  if (journeyType === 'acknowledge' || offerMechanic === 'policy-ack') {
    return {
      familyLabel: 'policy acknowledgment',
      emailActionExamples: ['Review policy update', 'Acknowledge update'],
      loginHeadingExample: 'Review and acknowledge',
      successHeadingExample: 'Acknowledgment recorded',
      avoidMixing: ['verify access', 'enrol now', 'go to portal'],
    };
  }

  if (journeyType === 'review' || offerMechanic === 'document-review') {
    return {
      familyLabel: 'document review',
      emailActionExamples: ['Review document', 'Open secure document'],
      loginHeadingExample: 'Sign in to review document',
      successHeadingExample: 'Review submitted',
      avoidMixing: ['enrol now', 'activate account', 'acknowledge policy'],
    };
  }

  if (journeyType === 'pay' || offerMechanic === 'payment-fix') {
    return {
      familyLabel: 'payment review',
      emailActionExamples: ['Review payment', 'Confirm payment details'],
      loginHeadingExample: 'Sign in to review payment',
      successHeadingExample: 'Payment review submitted',
      avoidMixing: ['enrol now', 'register account', 'go to portal'],
    };
  }

  if (journeyType === 'track' || offerMechanic === 'delivery-update') {
    return {
      familyLabel: 'delivery tracking',
      emailActionExamples: ['Track delivery', 'Review delivery update'],
      loginHeadingExample: 'Sign in to track delivery',
      successHeadingExample: 'Tracking request confirmed',
      avoidMixing: ['verify account', 'enrol now', 'acknowledge policy'],
    };
  }

  if (journeyType === 'register' || offerMechanic === 'presale') {
    return {
      familyLabel: 'registration',
      emailActionExamples: ['Complete registration', 'Confirm registration'],
      loginHeadingExample: 'Sign in to complete registration',
      successHeadingExample: 'Registration confirmed',
      avoidMixing: ['verify access', 'review payment', 'acknowledge policy'],
    };
  }

  if (journeyType === 'claim' || offerMechanic === 'discount' || offerMechanic === 'giveaway') {
    return {
      familyLabel: 'claim flow',
      emailActionExamples: ['Claim offer', 'Confirm eligibility'],
      loginHeadingExample: 'Sign in to claim offer',
      successHeadingExample: 'Claim recorded',
      avoidMixing: ['verify access', 'review payment', 'acknowledge policy'],
    };
  }

  if (journeyType === 'login' || offerMechanic === 'account-access') {
    return {
      familyLabel: 'access confirmation',
      emailActionExamples: ['Verify access', 'Confirm access'],
      loginHeadingExample: 'Sign in to confirm access',
      successHeadingExample: 'Access confirmed',
      avoidMixing: ['enrol now', 'register account', 'review policy'],
    };
  }

  return {
    familyLabel: 'scenario-aligned continuation',
    emailActionExamples: ['Continue request', 'Review request'],
    loginHeadingExample: 'Sign in to continue',
    successHeadingExample: 'Request recorded',
    avoidMixing: ['verify access', 'enrol now', 'acknowledge policy'],
  };
}

export function buildActionFamilyPromptBlock(params: ActionFamilyGuidanceParams): string {
  const guidance = resolveActionFamilyGuidance(params);
  const emailSurface = params.isQuishing ? 'QR instruction text' : 'email CTA';

  return `**Action Family Guidance:**
- Primary action family: ${guidance.familyLabel}
- Keep ONE task language across the full flow: ${emailSurface}, login heading/helper text, button label, and success state.
- Good pattern for this family: ${emailSurface} like "${guidance.emailActionExamples[0]}" or "${guidance.emailActionExamples[1]}"; login heading like "${guidance.loginHeadingExample}"; success heading like "${guidance.successHeadingExample}".
- Success helper text should name what was completed and what happens next in the same action family.
- Avoid mixing unrelated verbs in one flow (for example: ${guidance.avoidMixing.map(item => `"${item}"`).join(', ')}) unless the blueprint explicitly requires a multi-step journey.`;
}
