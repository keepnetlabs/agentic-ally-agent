import { ETHICAL_POLICY } from '../../constants/microlearning-templates';

export const CLARITY_ACCESSIBILITY_POLICY =
  '**Clarity & Cultural Safeguards:** Ensure analysis is clear, neutral, and policy-compliant while preserving technical accuracy; align with WCAG accessibility guidance where relevant; keep AI actions/messages explainable (OECD/EU fairness); keep language culturally appropriate and respectful.';

export const DEFAULT_MICROLEARNING_ETHICAL_POLICY = `**Ethical & Inclusive Policy (Reference):**
Title: ${ETHICAL_POLICY.title}
Purpose: ${ETHICAL_POLICY.purpose}
Standards:
- ISO: ${ETHICAL_POLICY.applied_standards.ISO.join(', ')}
- UN: ${ETHICAL_POLICY.applied_standards.UN.join(', ')}
- Other: ${ETHICAL_POLICY.applied_standards.Other.join(', ')}
Implementation:
- Gender-inclusive language: ${ETHICAL_POLICY.implementation_in_content.gender_inclusive_language.join('; ')}
- Positive & motivational tone: ${ETHICAL_POLICY.implementation_in_content.positive_and_motivational_tone.join('; ')}
- Inclusive & universal expression: ${ETHICAL_POLICY.implementation_in_content.inclusive_and_universal_expression.join('; ')}
- Clear & plain language: ${ETHICAL_POLICY.implementation_in_content.clear_and_plain_language.join('; ')}
- Accessibility: ${ETHICAL_POLICY.implementation_in_content.accessibility.join('; ')}
Conclusion: ${ETHICAL_POLICY.conclusion.join(', ')}`;

export const DEFAULT_PHISHING_ETHICAL_POLICY =
  '**Ethical Policy (ISO/UN):** Follow ISO 26000/37000/30415 and UN/UDHR inclusive language; use neutral, respectful language; avoid discriminatory or biased phrasing.';
