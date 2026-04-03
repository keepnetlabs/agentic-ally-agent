/**
 * Prompt Validation Tests
 * Ensures all prompts follow quality standards and use constants correctly
 */

import { describe, it, expect } from 'vitest';
import { buildLandingPageSystemPrompt } from './landing-page-prompts';
import { buildAnalysisPrompts, buildEmailPrompts, buildLandingPagePrompts } from './phishing-prompts';
import { PHISHING_EMAIL, LANDING_PAGE } from '../../constants';

// Test fixtures
const mockIndustryDesign = {
  industry: 'Finance',
  colors: { primary: '#0066cc', secondary: '#999999', accent: '#ff0000' },
  patterns: {
    cardStyle: 'background: white; border-radius: 12px;',
    buttonStyle: 'background: #0066cc; color: white;',
    inputStyle: 'border: 1px solid #ccc;',
  },
};

const mockRandomLayout = {
  name: 'Card',
  id: 'CENTERED',
  description: 'Classic centered card',
  cssRule: 'display: flex;',
};

const mockRandomStyle = {
  name: 'Modern',
  rules: 'Clean, professional',
};

const mockAnalysisParams = {
  topic: 'Payment Verification',
  difficulty: 'Medium',
  language: 'en',
  method: 'Data-Submission',
  targetProfile: {
    name: 'Finance Team',
    department: 'Finance',
    behavioralTriggers: ['Authority', 'Urgency'],
    vulnerabilities: ['Trust', 'Compliance'],
  },
};

const mockBrandedAnalysisParams = {
  ...mockAnalysisParams,
  topic: 'Microsoft 365 sign-in review',
};

const mockPhishingAnalysis = {
  scenario: 'CEO Wire Transfer Request',
  name: 'CEO Fraud',
  description: 'Urgent wire transfer request from CEO',
  category: 'Financial Fraud',
  method: 'Data-Submission' as const,
  psychologicalTriggers: ['Authority', 'Urgency'],
  tone: 'Urgent',
  fromName: 'Finance Department',
  fromAddress: 'finance@company.com',
  keyRedFlags: ['Unusual urgency', 'External email'],
  targetAudienceAnalysis: 'Finance team',
  subjectLineStrategy: 'Creates time pressure',
  audienceMode: 'employee' as const,
  journeyType: 'pay' as const,
  offerMechanic: 'payment-fix' as const,
  isQuishing: false,
  isRecognizedBrand: false,
};

// ============================================
// CONSTANTS VALIDATION
// ============================================

describe('Constants Validation', () => {
  it('PHISHING_EMAIL constants are defined', () => {
    expect(PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH).toBe(300);
    expect(PHISHING_EMAIL.MAX_SUBJECT_LENGTH).toBe(200);
    expect(PHISHING_EMAIL.EMAIL_TABLE_MAX_WIDTH_PX).toBe(600);
    expect(PHISHING_EMAIL.QR_CODE_IMAGE_WIDTH_PX).toBe(200);
    expect(PHISHING_EMAIL.QR_CODE_TIMEOUT_HOURS).toBe(24);
  });

  it('PREHEADER_WORD_COUNT range is reasonable', () => {
    expect(PHISHING_EMAIL.PREHEADER_WORD_COUNT.min).toBe(10);
    expect(PHISHING_EMAIL.PREHEADER_WORD_COUNT.max).toBe(15);
    expect(PHISHING_EMAIL.PREHEADER_WORD_COUNT.min < PHISHING_EMAIL.PREHEADER_WORD_COUNT.max).toBe(true);
  });

  it('LANDING_PAGE constants are defined', () => {
    expect(LANDING_PAGE.QR_CODE_IMAGE_WIDTH_PX).toBe(200);
    expect(LANDING_PAGE.FORM_MAX_WIDTH_PX).toBe(680);
    expect(LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX).toBe(800);
  });
});

// ============================================
// LANDING PAGE SYSTEM PROMPT VALIDATION
// ============================================

describe('buildLandingPageSystemPrompt Validation', () => {
  it('generates valid prompt string', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login'],
      false,
      () => '',
      () => '',
      () => ''
    );

    expect(typeof prompt).toBe('string');
    expect(prompt.length > 1000).toBe(true);
  });

  it('includes required prompt sections', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login'],
      false,
      () => '',
      () => '',
      () => ''
    );

    // Critical sections
    expect(prompt).toContain('You are a web developer');
    expect(prompt).toContain('No Fake Personal Identities');
    expect(prompt).toContain('SINGLE QUOTES for ALL HTML attributes');
    expect(prompt).toContain('MANDATORY DESIGN DIRECTIVE');
    expect(prompt).toContain('OUTPUT FORMAT (MANDATORY');
  });

  it('uses constants for pixel measurements', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login'],
      false,
      () => '',
      () => '',
      () => ''
    );

    // Should contain design specifications
    expect(prompt).toContain('px');
    expect(prompt).toContain('style=');
    expect(prompt).toContain('96px');
  });

  it('includes quishing warnings when isQuishing is true', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login'],
      true, // isQuishing = true
      () => '',
      () => '',
      () => ''
    );

    expect(prompt).toContain('Quishing Landing Page');
    expect(prompt).toContain('No QR codes');
  });

  it('includes brand colors in prompt', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login'],
      false,
      () => '',
      () => '',
      () => ''
    );

    expect(prompt).toContain('Finance');
    expect(prompt).toContain('#0066cc');
  });

  it('guides login pages toward modern trust copy', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login'],
      false,
      () => '',
      () => '',
      () => ''
    );

    expect(prompt).toContain('Secure sign-in');
    expect(prompt).toContain('Avoid generic security cliches');
    expect(prompt).toContain('256-bit SSL encryption');
  });

  it('keeps variation guidance subtle and bounded', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login', 'success'],
      false,
      () => '',
      () => '',
      () => ''
    );

    expect(prompt).toContain('Prefer subtle variation');
    expect(prompt).toContain('Card max-width for card-based layouts');
    expect(prompt).toContain('Do **NOT** force variation for its own sake');
    expect(prompt).not.toContain('change at least **3**');
  });

  it('includes success-state logic when success page is required', () => {
    const prompt = buildLandingPageSystemPrompt(
      'Test Company',
      '',
      false,
      mockIndustryDesign,
      mockRandomLayout,
      mockRandomStyle,
      ['login', 'success'],
      false,
      () => '',
      () => '',
      () => ''
    );

    expect(prompt).toContain('Success-State Logic');
    expect(prompt).toContain('the primary CTA must not ask the user to complete the same action again');
  });
});

// ============================================
// ANALYSIS PROMPTS VALIDATION
// ============================================

describe('buildAnalysisPrompts Validation', () => {
  it('builds normal phishing analysis prompts', () => {
    const result = buildAnalysisPrompts({
      ...mockAnalysisParams,
      isQuishingDetected: false,
    });

    expect(result.systemPrompt).toBeDefined();
    expect(result.userPrompt).toBeDefined();
    expect(result.systemPrompt).toContain('Social Engineering Architect');
    expect(result.systemPrompt).toContain('DECISION LOGIC');
  });

  it('builds quishing analysis prompts when detected', () => {
    const result = buildAnalysisPrompts({
      ...mockAnalysisParams,
      isQuishingDetected: true,
    });

    expect(result.systemPrompt).toContain('Quishing');
    expect(result.systemPrompt).toContain('QR Code');
    expect(result.userPrompt).toContain('QR Code Phishing');
  });

  it('includes difficulty rules in system prompt', () => {
    const result = buildAnalysisPrompts(mockAnalysisParams);

    expect(result.systemPrompt).toContain('Difficulty Adjustment');
    expect(result.systemPrompt).toContain('Medium');
  });

  it('includes required JSON output rules', () => {
    const result = buildAnalysisPrompts(mockAnalysisParams);

    expect(result.systemPrompt).toContain('Output Format');
    expect(result.systemPrompt).toContain('Return ONLY valid JSON');
  });

  it('includes policy context when provided', () => {
    const result = buildAnalysisPrompts({
      ...mockAnalysisParams,
      policyContext: 'No fake personal identities allowed',
    });

    expect(result.systemPrompt).toContain('No fake personal identities allowed');
  });

  it('includes coherence layer guidance in analysis prompts', () => {
    const result = buildAnalysisPrompts(mockAnalysisParams);

    expect(result.systemPrompt).toContain('Coherence Layer (MANDATORY)');
    expect(result.systemPrompt).toContain('audienceMode');
    expect(result.systemPrompt).toContain('journeyType');
    expect(result.systemPrompt).toContain('offerMechanic');
  });

  it('includes structured behavioral signals in analysis context without replacing narrative context', () => {
    const result = buildAnalysisPrompts({
      ...mockAnalysisParams,
      additionalContext: 'User tends to trust urgent internal requests.',
      behavioralProfile: {
        currentStage: 'Building',
        targetStage: 'Consistent',
        progressionHint: 'Verify internal requests before clicking',
        foggTriggerType: 'FACILITATOR',
        keySignalsUsed: ['Clicked phishing link from email', 'No reporting events observed'],
        dataGaps: ['No QR simulation evidence'],
      },
    });

    expect(result.additionalContextMessage).toContain('Structured Behavioral Signals');
    expect(result.additionalContextMessage).toContain('Current Stage: Building');
    expect(result.additionalContextMessage).toContain('Trigger Type: FACILITATOR');
    expect(result.additionalContextMessage).toContain('Behavioral Narrative Context');
    expect(result.additionalContextMessage).toContain('User tends to trust urgent internal requests.');
  });

  it('requires multilingual canonical brand extraction in analysis prompts', () => {
    const result = buildAnalysisPrompts(mockBrandedAnalysisParams);

    expect(result.systemPrompt).toContain('Public Brand Resolution (Only When Evidence Exists)');
    expect(result.systemPrompt).toContain('brandSignals');
    expect(result.systemPrompt).toContain('brandIntent');
    expect(result.systemPrompt).toContain('candidateDomains');
    expect(result.userPrompt).toContain('multilingual brandSignals');
  });

  it('omits public brand resolution guidance for generic topics', () => {
    const result = buildAnalysisPrompts(mockAnalysisParams);

    expect(result.systemPrompt).not.toContain('Public Brand Resolution (Only When Evidence Exists)');
    expect(result.systemPrompt).not.toContain('candidateDomains');
    expect(result.systemPrompt).not.toContain('- **brandSignals:** Minimal requirement only.');
    expect(result.userPrompt).not.toContain('multilingual brandSignals');
  });

  it('keeps generic example outputs free of unnecessary brandSignals blocks', () => {
    const result = buildAnalysisPrompts(mockAnalysisParams);

    expect(result.systemPrompt).not.toContain('"brandIntent": "internal-brand"');
    expect(result.systemPrompt).not.toContain('"brandConfidence": "low"');
    expect(result.systemPrompt).not.toContain('"canonicalBrandName": "Microsoft"');
    expect(result.systemPrompt).not.toContain('"canonicalBrandName": "Amazon"');
  });
});

// ============================================
// EMAIL PROMPTS VALIDATION
// ============================================

describe('buildEmailPrompts Validation', () => {
  it('builds normal phishing email prompts', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toBeDefined();
    expect(result.userPrompt).toBeDefined();
    expect(result.systemPrompt).toContain('Phishing Content Generator');
  });

  it('includes merge tag requirements', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toContain('Merge Tags');
    expect(result.systemPrompt).toContain('{PHISHINGURL}');
    expect(result.systemPrompt).toContain('{FIRSTNAME}');
  });

  it('includes no disclaimers rule', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toContain('NO DISCLAIMERS');
    expect(result.systemPrompt).toContain('disclaimer');
    expect(result.systemPrompt).toContain('ignore this email');
  });

  it('includes table layout rules', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toContain('TABLE-BASED layout');
    expect(result.systemPrompt).toContain('Outlook');
  });

  it('includes greeting personalization requirements', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toContain('Greeting');
    expect(result.systemPrompt).toContain('{FIRSTNAME}');
  });

  it('passes coherence fields into email prompt guidance', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('Coherence Fields');
    expect(result.userPrompt).toContain('Audience Frame: employee');
    expect(result.userPrompt).toContain('Primary Journey: pay');
    expect(result.userPrompt).toContain('Primary Mechanic: payment-fix');
  });

  it('adds action-family guidance to keep email and landing journey language aligned', () => {
    const accessAnalysis = {
      ...mockPhishingAnalysis,
      journeyType: 'login' as const,
      offerMechanic: 'account-access' as const,
      method: 'Data-Submission' as const,
    };

    const result = buildEmailPrompts({
      analysis: accessAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('Action Family Guidance');
    expect(result.userPrompt).toContain('Primary action family: access confirmation');
    expect(result.userPrompt).toContain('Verify access');
    expect(result.userPrompt).toContain('Sign in to confirm access');
    expect(result.userPrompt).toContain('Access confirmed');
    expect(result.userPrompt).toContain('Avoid mixing unrelated verbs');
  });

  it('keeps generic data-submission flows on the neutral fallback when coherence fields are generic', () => {
    const genericAnalysis = {
      ...mockPhishingAnalysis,
      journeyType: 'generic' as const,
      offerMechanic: 'generic' as const,
      method: 'Data-Submission' as const,
    };

    const result = buildEmailPrompts({
      analysis: genericAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('Primary action family: scenario-aligned continuation');
    expect(result.userPrompt).toContain('Sign in to continue');
    expect(result.userPrompt).toContain('Request recorded');
    expect(result.userPrompt).not.toContain('Primary action family: access confirmation');
  });

  it('guides greeting placement below the logo/header area', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('after the logo/header area');
    expect(result.userPrompt).toContain('card-style emails');
    expect(result.userPrompt).not.toContain('Write greeting first');
  });

  it('includes date realism guidance to avoid stale years', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toContain('Date Realism');
    expect(result.systemPrompt).toContain('Avoid stale fixed years');
    expect(result.systemPrompt).toContain('{CURRENT_DATE}');
  });

  it('reminds final validation to reject disclaimer-like escape-hatch copy', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('ignore this email');
    expect(result.userPrompt).toContain('delete this message');
  });

  it('includes quishing-specific rules when isQuishing is true', () => {
    const quishingAnalysis = {
      ...mockPhishingAnalysis,
      isQuishing: true,
    };

    const result = buildEmailPrompts({
      analysis: quishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.systemPrompt).toContain('QR code');
    expect(result.systemPrompt).toContain('{QRCODEURLIMAGE}');
  });
});

// ============================================
// LANDING PAGE PROMPTS VALIDATION
// ============================================

describe('buildLandingPagePrompts Validation', () => {
  it('builds landing page prompts with context messages', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      audienceMode: 'employee',
      journeyType: 'review',
      offerMechanic: 'payment-fix',
      isQuishing: false,
    });

    expect(result.systemPrompt).toBeDefined();
    expect(result.userPrompt).toBeDefined();
    expect(result.userPrompt).toContain('Design landing pages');
  });

  it('includes design injection directive in system prompt', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('MANDATORY DESIGN DIRECTIVE');
    expect(result.systemPrompt).toContain('ASSIGNED LAYOUT');
    expect(result.systemPrompt).toContain('ASSIGNED VISUAL STYLE');
  });

  it('includes full HTML document requirements', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('<!DOCTYPE html>');
    expect(result.systemPrompt).toContain('<html>');
    expect(result.systemPrompt).toContain('<head>');
  });

  it('reminds success pages to keep CTA aligned with completed state', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Policy Review',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      isQuishing: false,
    });

    expect(result.userPrompt).toContain('heading, helper text, and main CTA must agree on the completed state');
  });

  it('guides success pages toward scenario-specific completion microcopy', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Policy Review',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('Use scenario-specific completion microcopy');
    expect(result.systemPrompt).toContain('Avoid generic completion copy');
    expect(result.userPrompt).toContain('avoid generic "Thank you" copy');
  });

  it('includes accessibility requirements', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('ACCESSIBILITY');
    expect(result.systemPrompt).toContain('label');
  });

  it('guides landing pages toward scenario-specific microcopy and tighter content density', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Remote Access Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      audienceMode: 'employee',
      journeyType: 'login',
      offerMechanic: 'account-access',
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('Prefer scenario-specific product wording over generic portal copy');
    expect(result.systemPrompt).toContain('Avoid oversized empty whitespace');
  });

  it('keeps password labels and forgot-password helpers left-aligned', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Password Reset',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('Field labels must be left-aligned');
    expect(result.systemPrompt).toContain('Do NOT center labels such as "Password"');
    expect(result.systemPrompt).toContain('Never place it as a centered standalone row between the password label and password input');
  });

  it('passes coherence fields into landing prompt guidance', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      audienceMode: 'employee',
      journeyType: 'review',
      offerMechanic: 'payment-fix',
      isQuishing: false,
    });

    expect(result.userPrompt).toContain('Coherence Fields');
    expect(result.userPrompt).toContain('Audience Frame: employee');
    expect(result.userPrompt).toContain('Primary Journey: review');
    expect(result.userPrompt).toContain('Primary Mechanic: payment-fix');
  });

  it('adds action-family guidance to landing prompts for login-success coherence', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Access Upgrade',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      audienceMode: 'employee',
      journeyType: 'login',
      offerMechanic: 'account-access',
      method: 'Data-Submission',
      isQuishing: false,
    });

    expect(result.userPrompt).toContain('Action Family Guidance');
    expect(result.userPrompt).toContain('Primary action family: access confirmation');
    expect(result.userPrompt).toContain('Verify access');
    expect(result.userPrompt).toContain('Sign in to confirm access');
    expect(result.userPrompt).toContain('Access confirmed');
  });

  it('passes structured behavioral signals into landing context guidance', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login', 'success'],
      audienceMode: 'employee',
      journeyType: 'review',
      offerMechanic: 'payment-fix',
      additionalContext: 'User tends to trust urgent internal notices.',
      behavioralProfile: {
        currentStage: 'Building',
        targetStage: 'Consistent',
        progressionHint: 'Verify internal notices before acting',
        foggTriggerType: 'FACILITATOR',
        keySignalsUsed: ['Clicked phishing link', 'No reporting events observed'],
        dataGaps: ['No QR simulation evidence'],
      },
      isQuishing: false,
    });

    expect(result.userContextMessage).toContain('Structured Behavioral Signals');
    expect(result.userContextMessage).toContain('Current Stage: Building');
    expect(result.userContextMessage).toContain('Trigger Type: FACILITATOR');
    expect(result.userContextMessage).toContain('Behavioral Narrative Context');
    expect(result.userContextMessage).toContain('User tends to trust urgent internal notices.');
  });

  it('includes JSON output format specification', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('OUTPUT FORMAT (MANDATORY');
    expect(result.systemPrompt).toContain('"pages"');
    expect(result.systemPrompt).toContain('"template"');
  });
});

describe('Golden Scenario Prompt Coverage', () => {
  it('keeps a recognized consumer-brand landing scenario visually grounded', () => {
    const result = buildLandingPagePrompts({
      fromName: 'NBA',
      fromAddress: 'support@nba.example.com',
      scenario: 'League Pass renewal confirmation',
      language: 'en',
      industryDesign: {
        ...mockIndustryDesign,
        colors: { primary: '#17408B', secondary: '#C9082A', accent: '#FFFFFF' },
      },
      requiredPages: ['login', 'success'],
      audienceMode: 'consumer',
      journeyType: 'claim',
      offerMechanic: 'presale',
      method: 'Data-Submission',
      isQuishing: false,
    });

    expect(result.userPrompt).toContain('Audience Frame: consumer');
    expect(result.userPrompt).toContain('Primary Journey: claim');
    expect(result.systemPrompt).toContain('#17408B');
    expect(result.systemPrompt).toContain('#C9082A');
  });

  it('keeps generic hard scenarios bounded instead of forcing a narrow action family', () => {
    const result = buildEmailPrompts({
      analysis: {
        ...mockPhishingAnalysis,
        scenario: 'General account follow-up',
        fromName: 'Operations Desk',
        fromAddress: 'ops@company.com',
        journeyType: 'generic',
        offerMechanic: 'generic',
        method: 'Data-Submission',
      },
      language: 'en',
      difficulty: 'Hard',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('Primary action family: scenario-aligned continuation');
    expect(result.userPrompt).toContain('Continue request');
    expect(result.userPrompt).not.toContain('Primary action family: access confirmation');
  });

  it('keeps quishing scenarios explicitly QR-led while preserving hard-difficulty guidance', () => {
    const result = buildAnalysisPrompts({
      ...mockAnalysisParams,
      topic: 'Visitor Wi-Fi QR access refresh',
      difficulty: 'Hard',
      method: 'Data-Submission',
      isQuishingDetected: true,
      behavioralProfile: {
        currentStage: 'Foundational',
        targetStage: 'Building',
        progressionHint: 'Verify QR-triggered access prompts before continuing.',
        foggTriggerType: 'SIGNAL',
        keySignalsUsed: ['qr_scan'],
        dataGaps: ['reporting_history'],
      },
    });

    expect(result.systemPrompt.toLowerCase()).toContain('quishing');
    expect(result.systemPrompt.toLowerCase()).toContain('difficulty');
    expect(result.userPrompt).toContain('QUISHING CONFIRMED');
    expect(result.userPrompt).toContain('Visitor Wi-Fi QR access refresh');
  });
});

// ============================================
// FORBIDDEN CONTENT CHECKS
// ============================================

describe('Forbidden Content Validation', () => {
  it('analysis prompts do not contain forbidden keywords', () => {
    const result = buildAnalysisPrompts(mockAnalysisParams);

    // System prompt should not contain basic test disclaimers
    expect(result.systemPrompt.toLowerCase()).not.toContain('this is a test');
  });

  it('email prompts do not have NO DISCLAIMERS violation', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'en',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    // Should mention the rule, but as a constraint
    expect(result.systemPrompt).toContain('NO DISCLAIMERS');
  });

  it('landing page prompts restrict personal names', () => {
    const result = buildLandingPagePrompts({
      fromName: 'Test Corp',
      fromAddress: 'test@corp.com',
      scenario: 'Payment Verification',
      language: 'en',
      industryDesign: mockIndustryDesign,
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.systemPrompt).toContain('No Fake Personal Identities');
  });
});

// ============================================
// LANGUAGE LOCALIZATION CHECKS
// ============================================

describe('Language Localization Validation', () => {
  it('supports different languages in analysis prompts', () => {
    const enResult = buildAnalysisPrompts({
      ...mockAnalysisParams,
      language: 'en',
    });

    const trResult = buildAnalysisPrompts({
      ...mockAnalysisParams,
      language: 'tr',
    });

    expect(enResult.userPrompt).toContain('en');
    expect(trResult.userPrompt).toContain('tr');
  });

  it('includes language guidance in email prompts', () => {
    const result = buildEmailPrompts({
      analysis: mockPhishingAnalysis,
      language: 'tr',
      difficulty: 'Medium',
      industryDesign: mockIndustryDesign,
    });

    expect(result.userPrompt).toContain('tr');
    expect(result.userPrompt).toContain('Must use');
  });
});
