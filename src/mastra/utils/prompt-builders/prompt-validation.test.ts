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
    expect(LANDING_PAGE.FORM_MAX_WIDTH_PX).toBe(600);
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
    expect(prompt).toContain('OUTPUT FORMAT (MANDATORY)');
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
    expect(prompt).toContain('max-width');
    expect(prompt).toContain('px');
    expect(prompt).toContain('style=');
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
    expect(prompt).toContain('No QR Code');
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

    expect(result.systemPrompt).toContain('OUTPUT FORMAT (MANDATORY)');
    expect(result.systemPrompt).toContain('"pages"');
    expect(result.systemPrompt).toContain('"template"');
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
