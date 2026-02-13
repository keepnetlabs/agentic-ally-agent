import { describe, it, expect } from 'vitest';
import { EmailIRCanvasSchema } from './email-ir';

describe('EmailIRCanvasSchema', () => {
  const validMinimalData = {
    executive_summary: {
      email_category: 'Phishing' as const,
      verdict: 'Confirmed Social Engineering Attack',
      risk_level: 'High' as const,
      confidence: 0.95,
      status: 'Active investigation',
    },
    agent_determination:
      'This email exhibits clear phishing characteristics including spoofed sender and malicious link.',
    risk_indicators: {
      observed: ['Spoofed sender', 'Malicious link'],
      not_observed: ['Malware attachment'],
    },
    evidence_flow: [
      {
        step: 1,
        title: 'Initial Analysis',
        description: 'Email headers reveal spoofed domain',
        finding_label: 'Phishing' as const,
      },
    ],
    actions_recommended: {
      p1_immediate: ['Reset user passwords'],
      p2_follow_up: ['Monitor account activity'],
      p3_hardening: ['Run phishing refresher training'],
    },
    confidence_limitations: 'Human review is recommended for critical decisions.',
  };

  it('should validate a complete email IR canvas', () => {
    const result = EmailIRCanvasSchema.safeParse(validMinimalData);
    expect(result.success).toBe(true);
  });

  describe('executive_summary validation', () => {
    it('should accept all email category enum values', () => {
      const categories = [
        'Spam',
        'Marketing',
        'Internal',
        'CEO Fraud',
        'Phishing',
        'Sextortion',
        'Malware',
        'Security Awareness',
        'Other Suspicious',
        'Benign',
      ];

      categories.forEach(category => {
        const data = {
          ...validMinimalData,
          executive_summary: {
            ...validMinimalData.executive_summary,
            email_category: category as any,
          },
          evidence_flow: [
            {
              step: 1,
              title: 'Final Step',
              description: 'Category alignment check',
              finding_label: category as any,
            },
          ],
        };
        const result = EmailIRCanvasSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email category', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          email_category: 'Invalid Category',
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept all risk level enum values', () => {
      const levels = ['Low', 'Medium', 'High', 'Critical'];
      levels.forEach(level => {
        const data = {
          ...validMinimalData,
          executive_summary: {
            ...validMinimalData.executive_summary,
            risk_level: level as any,
          },
        };
        const result = EmailIRCanvasSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid risk level', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          risk_level: 'Extreme',
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate confidence score boundaries', () => {
      expect(
        EmailIRCanvasSchema.safeParse({
          ...validMinimalData,
          executive_summary: { ...validMinimalData.executive_summary, confidence: 0 },
        }).success
      ).toBe(true);

      expect(
        EmailIRCanvasSchema.safeParse({
          ...validMinimalData,
          executive_summary: { ...validMinimalData.executive_summary, confidence: 1 },
        }).success
      ).toBe(true);

      expect(
        EmailIRCanvasSchema.safeParse({
          ...validMinimalData,
          executive_summary: { ...validMinimalData.executive_summary, confidence: 0.5 },
        }).success
      ).toBe(true);
    });

    it('should reject confidence score outside bounds', () => {
      expect(
        EmailIRCanvasSchema.safeParse({
          ...validMinimalData,
          executive_summary: { ...validMinimalData.executive_summary, confidence: -0.1 },
        }).success
      ).toBe(false);

      expect(
        EmailIRCanvasSchema.safeParse({
          ...validMinimalData,
          executive_summary: { ...validMinimalData.executive_summary, confidence: 1.1 },
        }).success
      ).toBe(false);
    });

    it('should require all executive summary fields', () => {
      const fields = ['email_category', 'verdict', 'risk_level', 'confidence', 'status'];

      fields.forEach(field => {
        const data = {
          ...validMinimalData,
          executive_summary: {
            ...validMinimalData.executive_summary,
            [field]: undefined,
          },
        };
        const result = EmailIRCanvasSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it('should accept optional executive summary fields when provided', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          evidence_strength: 'Strong' as const,
          confidence_basis: 'Signals converge across intent and behavior.',
          why_this_matters: 'Potential account compromise risk.',
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid evidence_strength enum value', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          evidence_strength: 'Very Strong' as any,
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject non-string optional summary fields', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          confidence_basis: 42 as any,
          why_this_matters: false as any,
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('risk_indicators validation', () => {
    it('should accept empty risk indicator arrays', () => {
      const data = {
        ...validMinimalData,
        risk_indicators: {
          observed: [],
          not_observed: [],
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept multiple risk indicators', () => {
      const data = {
        ...validMinimalData,
        risk_indicators: {
          observed: ['Indicator 1', 'Indicator 2', 'Indicator 3', 'Indicator 4', 'Indicator 5'],
          not_observed: ['Not found 1', 'Not found 2'],
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require risk_indicators object', () => {
      const data = { ...validMinimalData };
      delete (data as any).risk_indicators;
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('evidence_flow validation', () => {
    it('should accept empty evidence flow', () => {
      const data = {
        ...validMinimalData,
        evidence_flow: [],
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept multiple evidence steps', () => {
      const data = {
        ...validMinimalData,
        evidence_flow: [
          {
            step: 1,
            title: 'Step 1',
            description: 'Analysis starts',
            finding_label: 'PASS',
          },
          {
            step: 2,
            title: 'Step 2',
            description: 'Findings',
            finding_label: 'FLAG',
          },
          {
            step: 3,
            title: 'Step 3',
            description: 'Conclusion',
            finding_label: 'Phishing',
          },
        ],
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid finding_label value', () => {
      const data = {
        ...validMinimalData,
        evidence_flow: [
          {
            step: 1,
            title: 'Step 1',
            description: 'Analysis starts',
            finding_label: 'PHISH' as any,
          },
        ],
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject final finding_label mismatch with executive category', () => {
      const data = {
        ...validMinimalData,
        evidence_flow: [
          {
            step: 1,
            title: 'Final Step',
            description: 'Final verdict output',
            finding_label: 'Benign' as const,
          },
        ],
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require evidence_flow to be an array', () => {
      const data = {
        ...validMinimalData,
        evidence_flow: { step: 1 } as any,
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('actions validation', () => {
    it('should accept empty actions_recommended buckets', () => {
      const data = {
        ...validMinimalData,
        actions_recommended: {
          p1_immediate: [],
          p2_follow_up: [],
          p3_hardening: [],
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept multiple actions per priority bucket', () => {
      const data = {
        ...validMinimalData,
        actions_recommended: {
          p1_immediate: ['Reset passwords', 'Disable suspicious session tokens'],
          p2_follow_up: ['Monitor accounts', 'Review logs'],
          p3_hardening: ['Update security policies'],
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('required fields validation', () => {
    it('should reject missing agent_determination', () => {
      const data = { ...validMinimalData };
      delete (data as any).agent_determination;
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });

    it('should reject missing confidence_limitations', () => {
      const data = { ...validMinimalData };
      delete (data as any).confidence_limitations;
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-numeric confidence', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          confidence: '0.95' as any,
        },
      };
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });

    it('should reject non-numeric evidence_flow step', () => {
      const data = {
        ...validMinimalData,
        evidence_flow: [{ step: '1' as any, title: 'x', description: 'y' }],
      };
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });

    it('should reject non-string action item', () => {
      const data = {
        ...validMinimalData,
        actions_recommended: {
          p1_immediate: ['Reset passwords', 123 as any],
          p2_follow_up: [],
          p3_hardening: [],
        },
      };
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });
  });
});
