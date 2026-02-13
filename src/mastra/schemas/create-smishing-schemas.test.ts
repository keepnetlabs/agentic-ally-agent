import { describe, it, expect } from 'vitest';
import {
  createSmishingInputSchema,
  createSmishingAnalysisSchema,
  createSmishingSmsOutputSchema,
  createSmishingOutputSchema,
} from './create-smishing-schemas';

describe('Smishing Workflow Schemas', () => {
  describe('createSmishingInputSchema', () => {
    const validInput = {
      topic: 'Payment confirmation delay',
      difficulty: 'Medium',
      language: 'en-gb',
      includeLandingPage: true,
      includeSms: true,
    };

    it('should validate minimal input', () => {
      const result = createSmishingInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept with targetProfile', () => {
      const result = createSmishingInputSchema.safeParse({
        ...validInput,
        targetProfile: {
          name: 'John Doe',
          department: 'Finance',
          behavioralTriggers: ['Authority', 'Urgency'],
          vulnerabilities: ['Time pressure', 'Financial focus'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept with partial targetProfile', () => {
      const result = createSmishingInputSchema.safeParse({
        ...validInput,
        targetProfile: {
          department: 'HR',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty targetProfile', () => {
      const result = createSmishingInputSchema.safeParse({
        ...validInput,
        targetProfile: {},
      });
      expect(result.success).toBe(true);
    });

    it('should apply default difficulty when omitted', () => {
      const result = createSmishingInputSchema.safeParse({
        topic: 'Test',
        language: 'en-gb',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty).toBe('Medium');
      }
    });

    it('should apply default language when omitted', () => {
      const result = createSmishingInputSchema.safeParse({
        topic: 'Test',
        difficulty: 'Easy',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe('en-gb');
      }
    });

    it('should accept all difficulty levels', () => {
      const difficulties = ['Easy', 'Medium', 'Hard'];
      difficulties.forEach(difficulty => {
        const result = createSmishingInputSchema.safeParse({
          ...validInput,
          difficulty: difficulty as any,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid difficulty', () => {
      const result = createSmishingInputSchema.safeParse({
        ...validInput,
        difficulty: 'Impossible',
      });
      expect(result.success).toBe(false);
    });

    it('should accept both attack methods', () => {
      const methods = ['Click-Only', 'Data-Submission'];
      methods.forEach(method => {
        const result = createSmishingInputSchema.safeParse({
          ...validInput,
          method: method as any,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept optional additionalContext', () => {
      const result = createSmishingInputSchema.safeParse({
        ...validInput,
        additionalContext: 'User recently accessed payment systems',
      });
      expect(result.success).toBe(true);
    });

    it('should accept model provider and model overrides', () => {
      const result = createSmishingInputSchema.safeParse({
        ...validInput,
        modelProvider: 'OPENAI',
        model: 'gpt-4',
      });
      expect(result.success).toBe(true);
    });

    it('should require topic field', () => {
      const { topic, ...rest } = validInput;
      void topic;
      const result = createSmishingInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should apply default includeLandingPage=true', () => {
      const result = createSmishingInputSchema.safeParse({
        topic: 'Test',
        difficulty: 'Easy',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeLandingPage).toBe(true);
      }
    });

    it('should apply default includeSms=true', () => {
      const result = createSmishingInputSchema.safeParse({
        topic: 'Test',
        difficulty: 'Easy',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeSms).toBe(true);
      }
    });
  });

  describe('createSmishingAnalysisSchema', () => {
    const validAnalysis = {
      scenario: 'Delivery Update - Package Reschedule',
      name: 'Parcel Reschedule - Easy',
      description: 'User receives SMS about failed delivery requiring reschedule',
      category: 'Credential Harvesting',
      method: 'Click-Only' as const,
      psychologicalTriggers: ['Urgency', 'Authority'],
      tone: 'Friendly',
      keyRedFlags: ['Generic greeting', 'Request to click link'],
      targetAudienceAnalysis: 'Fits finance team due to payment focus',
      messageStrategy: 'Create sense of urgency around package delivery',
    };

    it('should validate complete analysis', () => {
      const result = createSmishingAnalysisSchema.safeParse(validAnalysis);
      expect(result.success).toBe(true);
    });

    it('should accept with optional reasoning fields', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        reasoning: 'Analysis step provided this reasoning',
        smsGenerationReasoning: 'SMS generation step provided this reasoning',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with brand detection fields', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        logoUrl: 'https://example.com/logo.png',
        brandName: 'UPS',
        isRecognizedBrand: true,
        brandColors: {
          primary: '#FFB81C',
          secondary: '#333333',
          accent: '#FFFFFF',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept with industry design', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        industryDesign: {
          industry: 'Logistics',
          colors: {
            primary: '#FFB81C',
            secondary: '#333333',
            accent: '#FFFFFF',
            gradient: 'linear-gradient(to right, #FFB81C, #FF6B35)',
          },
          typography: {
            headingClass: 'font-bold text-2xl',
            bodyClass: 'font-normal text-sm',
          },
          patterns: {
            cardStyle: 'rounded-lg shadow-lg',
            buttonStyle: 'rounded-md bg-primary',
            inputStyle: 'border-gray-300 rounded-md',
          },
          logoExample: 'https://example.com/industry-logo.png',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should allow brandName to be null', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        brandName: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept passthrough fields', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        difficulty: 'Hard',
        language: 'tr-tr',
        includeLandingPage: false,
        includeSms: true,
        modelProvider: 'OPENAI',
        model: 'gpt-4',
        policyContext: 'Company policy context',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all difficulty levels in analysis', () => {
      const difficulties = ['Easy', 'Medium', 'Hard'];
      difficulties.forEach(difficulty => {
        const result = createSmishingAnalysisSchema.safeParse({
          ...validAnalysis,
          difficulty: difficulty as any,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept BCP-47 language codes', () => {
      const languages = ['en-gb', 'tr-tr', 'de-de', 'es-es', 'fr-fr'];
      languages.forEach(language => {
        const result = createSmishingAnalysisSchema.safeParse({
          ...validAnalysis,
          language,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should require scenario field', () => {
      const { scenario, ...rest } = validAnalysis;
      void scenario;
      const result = createSmishingAnalysisSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should limit description length', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        description: 'A'.repeat(301), // Exceeds MAX_DESCRIPTION_LENGTH
      });
      expect(result.success).toBe(false);
    });

    it('should accept array of psychological triggers', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        psychologicalTriggers: ['Authority', 'Urgency', 'Fear', 'Curiosity', 'Scarcity'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept array of key red flags', () => {
      const result = createSmishingAnalysisSchema.safeParse({
        ...validAnalysis,
        keyRedFlags: ['Generic greeting', 'Suspicious link', 'Unusual sender', 'Urgency language'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createSmishingSmsOutputSchema', () => {
    const validSmsOutput = {
      messages: ['Hello, click here for update: {PHISHING_LINK}'],
      analysis: {
        scenario: 'Delivery Update',
        name: 'Parcel Reschedule',
        description: 'Failed delivery notice',
        category: 'Credential Harvesting',
        method: 'Click-Only' as const,
        psychologicalTriggers: ['Urgency'],
        tone: 'Friendly',
        keyRedFlags: ['Suspicious link'],
        targetAudienceAnalysis: 'Fits target profile',
        messageStrategy: 'Create urgency',
      },
    };

    it('should validate SMS output', () => {
      const result = createSmishingSmsOutputSchema.safeParse(validSmsOutput);
      expect(result.success).toBe(true);
    });

    it('should accept multiple messages', () => {
      const result = createSmishingSmsOutputSchema.safeParse({
        ...validSmsOutput,
        messages: ['Message 1', 'Message 2 variant', 'Message 3 alternative'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional additionalContext', () => {
      const result = createSmishingSmsOutputSchema.safeParse({
        ...validSmsOutput,
        additionalContext: 'Context info from analysis',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional policyContext', () => {
      const result = createSmishingSmsOutputSchema.safeParse({
        ...validSmsOutput,
        policyContext: 'Company policy context',
      });
      expect(result.success).toBe(true);
    });

    it('should accept omitted includeLandingPage', () => {
      const result = createSmishingSmsOutputSchema.safeParse(validSmsOutput);
      expect(result.success).toBe(true);
    });

    it('should accept with includeLandingPage=false', () => {
      const result = createSmishingSmsOutputSchema.safeParse({
        ...validSmsOutput,
        includeLandingPage: false,
      });
      expect(result.success).toBe(true);
    });

    it('should require at least one message', () => {
      const result = createSmishingSmsOutputSchema.safeParse({
        ...validSmsOutput,
        messages: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createSmishingOutputSchema', () => {
    const validOutput = {
      messages: ['Hello, click here: {PHISHING_LINK}'],
      landingPage: {
        name: 'Login Page',
        description: 'Fake login page',
        method: 'Data-Submission' as const,
        difficulty: 'Medium' as const,
        pages: [
          {
            type: 'login' as const,
            template: '<html>Login form</html>',
          },
          {
            type: 'success' as const,
            template: '<html>Success page</html>',
          },
        ],
      },
    };

    it('should validate complete output', () => {
      const result = createSmishingOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should accept optional smishingId', () => {
      const result = createSmishingOutputSchema.safeParse({
        ...validOutput,
        smishingId: 'smishing-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with analysis (omitting modelProvider and model)', () => {
      const result = createSmishingOutputSchema.safeParse({
        ...validOutput,
        analysis: {
          scenario: 'Delivery Update',
          name: 'Parcel Reschedule',
          description: 'Failed delivery notice',
          category: 'Credential Harvesting',
          method: 'Click-Only' as const,
          psychologicalTriggers: ['Urgency'],
          tone: 'Friendly',
          keyRedFlags: ['Suspicious link'],
          targetAudienceAnalysis: 'Fits target profile',
          messageStrategy: 'Create urgency',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional policyContext', () => {
      const result = createSmishingOutputSchema.safeParse({
        ...validOutput,
        policyContext: 'Company policy',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid landing page types', () => {
      const types = ['login', 'success', 'info'];
      types.forEach(type => {
        const result = createSmishingOutputSchema.safeParse({
          messages: ['Test'],
          landingPage: {
            name: 'Test Page',
            description: 'Test',
            method: 'Click-Only' as const,
            difficulty: 'Easy' as const,
            pages: [
              {
                type: type as any,
                template: '<html></html>',
              },
            ],
          },
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid landing page type', () => {
      const result = createSmishingOutputSchema.safeParse({
        messages: ['Test'],
        landingPage: {
          name: 'Test',
          description: 'Test',
          method: 'Click-Only' as const,
          difficulty: 'Easy' as const,
          pages: [
            {
              type: 'invalid' as any,
              template: '<html></html>',
            },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple landing pages', () => {
      const result = createSmishingOutputSchema.safeParse({
        messages: ['Test'],
        landingPage: {
          name: 'Multi-page',
          description: 'Multiple pages',
          method: 'Data-Submission' as const,
          difficulty: 'Hard' as const,
          pages: [
            { type: 'login' as const, template: '<html>Login</html>' },
            { type: 'success' as const, template: '<html>Success</html>' },
            { type: 'info' as const, template: '<html>Info</html>' },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should require at least one message', () => {
      const result = createSmishingOutputSchema.safeParse({
        messages: [],
        landingPage: {
          name: 'Test',
          description: 'Test',
          method: 'Click-Only' as const,
          difficulty: 'Easy' as const,
          pages: [{ type: 'login' as const, template: '<html></html>' }],
        },
      });
      expect(result.success).toBe(false);
    });

    it('should allow optional landing page', () => {
      const result = createSmishingOutputSchema.safeParse({
        messages: ['Message 1'],
      });
      expect(result.success).toBe(true);
    });

    it('should allow optional analysis', () => {
      const result = createSmishingOutputSchema.safeParse({
        messages: ['Message 1'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Schema composition with omit', () => {
    it('should omit modelProvider and model from analysis in output schema', () => {
      const analysisData = {
        scenario: 'Test',
        name: 'Test',
        description: 'Test',
        category: 'Test',
        method: 'Click-Only' as const,
        psychologicalTriggers: [],
        tone: 'Test',
        keyRedFlags: [],
        targetAudienceAnalysis: 'Test',
        messageStrategy: 'Test',
        modelProvider: 'OPENAI',
        model: 'gpt-4',
      };

      // Analysis schema should accept these fields
      expect(createSmishingAnalysisSchema.safeParse(analysisData).success).toBe(true);

      // Output schema with omitted fields should still validate
      const outputData = {
        messages: ['Test'],
        analysis: {
          scenario: 'Test',
          name: 'Test',
          description: 'Test',
          category: 'Test',
          method: 'Click-Only' as const,
          psychologicalTriggers: [],
          tone: 'Test',
          keyRedFlags: [],
          targetAudienceAnalysis: 'Test',
          messageStrategy: 'Test',
        },
      };

      expect(createSmishingOutputSchema.safeParse(outputData).success).toBe(true);
    });
  });
});
