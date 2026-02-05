import { describe, it, expect } from 'vitest';
import { EmailIRCanvasSchema } from './email-ir';

describe('EmailIRCanvasSchema', () => {
  const validMinimalData = {
    executive_summary: {
      email_category: 'Phishing' as const,
      verdict: 'Confirmed Social Engineering Attack',
      risk_level: 'High' as const,
      confidence: 0.95,
      reported_by: 5,
      similar_emails_detected: 10,
      status: 'Active investigation',
    },
    agent_determination: 'This email exhibits clear phishing characteristics including spoofed sender and malicious link.',
    risk_indicators: {
      observed: ['Spoofed sender', 'Malicious link'],
      not_observed: ['Malware attachment'],
    },
    evidence_flow: [
      {
        step: 1,
        title: 'Initial Analysis',
        description: 'Email headers reveal spoofed domain',
      },
    ],
    blast_radius: {
      total_similar_emails: 100,
      opened_by_users: 25,
      action_taken_before_response: 'None',
      confirmed_compromise: false,
    },
    actions_taken: ['Quarantine email'],
    actions_recommended: ['Reset user passwords', 'Monitor account activity'],
    technical_details: {
      sender_analysis: {
        domain_similarity_detected: true,
        trusted_internal_alignment: false,
      },
      delivery_pattern: {
        targeted_delivery: true,
        volume: 'Low',
        intent: 'Credential theft',
      },
      content_characteristics: {
        urgency_framing: true,
        authority_misuse: true,
        verification_avoidance: true,
      },
    },
    transparency_notice: 'This analysis was performed by an AI system.',
    confidence_limitations: 'Human review is recommended for critical decisions.',
  };

  it('should validate a complete email IR canvas', () => {
    const result = EmailIRCanvasSchema.safeParse(validMinimalData);
    expect(result.success).toBe(true);
  });

  it('should accept email with optional technical details omitted', () => {
    const data = {
      ...validMinimalData,
      technical_details: {},
    };
    const result = EmailIRCanvasSchema.safeParse(data);
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

      categories.forEach((category) => {
        const data = {
          ...validMinimalData,
          executive_summary: {
            ...validMinimalData.executive_summary,
            email_category: category as any,
          },
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
      levels.forEach((level) => {
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
      const fields = [
        'email_category',
        'verdict',
        'risk_level',
        'confidence',
        'reported_by',
        'similar_emails_detected',
        'status',
      ];

      fields.forEach((field) => {
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
          { step: 1, title: 'Step 1', description: 'Analysis starts' },
          { step: 2, title: 'Step 2', description: 'Findings' },
          { step: 3, title: 'Step 3', description: 'Conclusion' },
        ],
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
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

  describe('blast_radius validation', () => {
    it('should accept zero blast radius values', () => {
      const data = {
        ...validMinimalData,
        blast_radius: {
          total_similar_emails: 0,
          opened_by_users: 0,
          action_taken_before_response: 'None',
          confirmed_compromise: false,
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept high blast radius values', () => {
      const data = {
        ...validMinimalData,
        blast_radius: {
          total_similar_emails: 10000,
          opened_by_users: 5000,
          action_taken_before_response: 'Immediate isolation',
          confirmed_compromise: true,
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require blast_radius fields', () => {
      const data = {
        ...validMinimalData,
        blast_radius: {
          total_similar_emails: 0,
        } as any,
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('technical_details optional fields', () => {
    it('should accept with only sender_analysis', () => {
      const data = {
        ...validMinimalData,
        technical_details: {
          sender_analysis: {
            domain_similarity_detected: true,
            trusted_internal_alignment: false,
          },
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept with only delivery_pattern', () => {
      const data = {
        ...validMinimalData,
        technical_details: {
          delivery_pattern: {
            targeted_delivery: true,
            volume: 'High',
            intent: 'Account takeover',
          },
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept with only content_characteristics', () => {
      const data = {
        ...validMinimalData,
        technical_details: {
          content_characteristics: {
            urgency_framing: true,
            authority_misuse: false,
            verification_avoidance: true,
          },
        },
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept completely empty technical_details', () => {
      const data = {
        ...validMinimalData,
        technical_details: {},
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('actions validation', () => {
    it('should accept empty actions arrays', () => {
      const data = {
        ...validMinimalData,
        actions_taken: [],
        actions_recommended: [],
      };
      const result = EmailIRCanvasSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept multiple actions', () => {
      const data = {
        ...validMinimalData,
        actions_taken: [
          'Quarantine email',
          'Block sender',
          'Alert users',
          'Log incident',
        ],
        actions_recommended: [
          'Reset passwords',
          'Monitor accounts',
          'Review logs',
          'Update security policies',
        ],
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

    it('should reject missing transparency_notice', () => {
      const data = { ...validMinimalData };
      delete (data as any).transparency_notice;
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

    it('should reject non-numeric reported_by', () => {
      const data = {
        ...validMinimalData,
        executive_summary: {
          ...validMinimalData.executive_summary,
          reported_by: '5' as any,
        },
      };
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });

    it('should reject non-boolean confirmed_compromise', () => {
      const data = {
        ...validMinimalData,
        blast_radius: {
          ...validMinimalData.blast_radius,
          confirmed_compromise: 'false' as any,
        },
      };
      expect(EmailIRCanvasSchema.safeParse(data).success).toBe(false);
    });
  });
});
