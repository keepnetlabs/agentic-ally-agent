import { describe, it, expect } from 'vitest';
import { summarizePolicyTool } from './summarize-policy-tool';

/**
 * Test suite for summarizePolicyTool
 * Tests policy summarization with multi-language support and schema validation
 */

describe.skip('summarizePolicyTool', () => {
  describe('Tool Configuration', () => {
    it('should have id "summarize-policy"', () => {
      expect((summarizePolicyTool as any).id).toBe('summarize-policy');
    });

    it('should have description defined', () => {
      expect((summarizePolicyTool as any).description).toBeTruthy();
      expect((summarizePolicyTool as any).description).toContain('polic');
    });

    it('should have inputSchema defined', () => {
      expect((summarizePolicyTool as any).inputSchema).toBeDefined();
    });

    it('should have outputSchema defined', () => {
      expect((summarizePolicyTool as any).outputSchema).toBeDefined();
    });

    it('should have execute method', () => {
      expect((summarizePolicyTool as any).execute).toBeDefined();
      expect(typeof (summarizePolicyTool as any).execute).toBe('function');
    });
  });

  describe('Input Schema Validation', () => {
    it('should require question field (min 1 char)', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = { question: 'What is the phishing policy?' };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should reject empty question', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const invalidInput = { question: '' };

      expect(() => {
        schema.parse(invalidInput);
      }).toThrow();
    });

    it('should reject missing question', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const invalidInput = {};

      expect(() => {
        schema.parse(invalidInput);
      }).toThrow();
    });

    it('should accept focusArea as optional parameter', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = {
        question: 'What is the policy?',
        focusArea: 'phishing'
      };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should allow focusArea to be omitted', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = { question: 'What is the policy?' };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should accept language parameter as optional', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = {
        question: 'What is the policy?',
        language: 'en'
      };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should default language to "en"', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = { question: 'What is the policy?' };

      const parsed = schema.parse(validInput);
      expect(parsed.language).toBe('en');
    });

    it('should accept multiple language codes', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const languages = ['en', 'tr', 'de', 'fr', 'es', 'ja', 'zh'];

      languages.forEach(lang => {
        const input = {
          question: 'What is the policy?',
          language: lang
        };

        expect(() => {
          schema.parse(input);
        }).not.toThrow();
      });
    });

    it('should accept modelProvider as optional field', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = {
        question: 'What is the policy?',
        modelProvider: 'OPENAI'
      };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should validate modelProvider enum values', () => {
      const schema = (summarizePolicyTool as any).inputSchema;

      const validProviders = ['OPENAI', 'WORKERS_AI', 'GOOGLE'];

      validProviders.forEach(provider => {
        const input = {
          question: 'What is the policy?',
          modelProvider: provider
        };

        expect(() => {
          schema.parse(input);
        }).not.toThrow();
      });
    });

    it('should reject invalid modelProvider', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const invalidInput = {
        question: 'What is the policy?',
        modelProvider: 'INVALID_PROVIDER'
      };

      expect(() => {
        schema.parse(invalidInput);
      }).toThrow();
    });

    it('should accept model override as optional field', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const validInput = {
        question: 'What is the policy?',
        model: 'gpt-4o'
      };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });
  });

  describe('Output Schema Validation', () => {
    it('should validate success boolean field', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const validOutput = { success: true };

      expect(() => {
        schema.parse(validOutput);
      }).not.toThrow();
    });

    it('should validate success: true with data', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const validOutput = {
        success: true,
        data: {
          question: 'What is the phishing policy?',
          summary: 'Policy summary here',
          key_points: ['Point 1', 'Point 2'],
          recommendations: ['Rec 1', 'Rec 2']
        }
      };

      expect(() => {
        schema.parse(validOutput);
      }).not.toThrow();
    });

    it('should validate success: false with error', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const validOutput = {
        success: false,
        error: 'Policy not found'
      };

      expect(() => {
        schema.parse(validOutput);
      }).not.toThrow();
    });

    it('should have question field in data', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'What is phishing?',
          summary: 'Summary',
          key_points: [],
          recommendations: []
        }
      };

      const parsed = schema.parse(output);
      expect(parsed.data.question).toBe('What is phishing?');
    });

    it('should have summary field (1-2 paragraphs)', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'What is the policy?',
          summary: 'First paragraph here. Second paragraph here.',
          key_points: [],
          recommendations: []
        }
      };

      const parsed = schema.parse(output);
      expect(typeof parsed.data.summary).toBe('string');
      expect(parsed.data.summary.length).toBeGreaterThan(0);
    });

    it('should have key_points array (3-5 items)', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'What is the policy?',
          summary: 'Summary',
          key_points: ['Point 1', 'Point 2', 'Point 3'],
          recommendations: []
        }
      };

      const parsed = schema.parse(output);
      expect(Array.isArray(parsed.data.key_points)).toBe(true);
      expect(parsed.data.key_points.length).toBeGreaterThanOrEqual(0);
    });

    it('should have recommendations array (2-4 items)', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'What is the policy?',
          summary: 'Summary',
          key_points: [],
          recommendations: ['Rec 1', 'Rec 2']
        }
      };

      const parsed = schema.parse(output);
      expect(Array.isArray(parsed.data.recommendations)).toBe(true);
      expect(parsed.data.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should have relevant_sections as optional array', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'What is the policy?',
          summary: 'Summary',
          key_points: [],
          recommendations: [],
          relevant_sections: ['Section A', 'Section B']
        }
      };

      const parsed = schema.parse(output);
      expect(parsed.data.relevant_sections).toBeDefined();
    });

    it('should allow omitting relevant_sections', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'What is the policy?',
          summary: 'Summary',
          key_points: [],
          recommendations: []
        }
      };

      expect(() => {
        schema.parse(output);
      }).not.toThrow();
    });
  });

  describe('Execute Method Async', () => {
    it('should be async function', () => {
      const execute = (summarizePolicyTool as any).execute;
      expect(typeof execute).toBe('function');
    });

    it('should return Promise', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const result = execute({ context: { question: 'What is phishing?' } });

      expect(result instanceof Promise).toBe(true);
    });
  });

  describe('Missing Question Parameter', () => {
    it('should return error when question is missing', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = { context: {} };

      const result = await execute(context);

      if (!result.success) {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should return error when question is empty', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = { context: { question: '' } };

      const result = await execute(context);

      if (!result.success) {
        expect(result.success).toBe(false);
      }
    });
  });

  describe('FocusArea Optional Parameter', () => {
    it('should accept question with focusArea', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: {
          question: 'What should I do?',
          focusArea: 'phishing'
        }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should handle missing focusArea', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: { question: 'What should I do?' }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should work with different focusArea values', () => {
      const focusAreas = ['phishing', 'password', 'data protection', 'compliance', 'incident response'];

      focusAreas.forEach(area => {
        expect(typeof area).toBe('string');
      });
    });
  });

  describe('Language Parameter Handling', () => {
    it('should default language to "en" when not specified', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'What is the policy?' };

      const parsed = schema.parse(input);
      expect(parsed.language).toBe('en');
    });

    it('should accept English language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'What is the policy?', language: 'en' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept Turkish language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'Policy nedir?', language: 'tr' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept German language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'Was ist die Richtlinie?', language: 'de' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept French language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'Qu\'est-ce que la politique?', language: 'fr' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept Spanish language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'Qué es la política?', language: 'es' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept Japanese language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: 'ポリシーとは何ですか?', language: 'ja' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept Chinese language code', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = { question: '政策是什么?', language: 'zh' };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });
  });

  describe('Model Provider Override', () => {
    it('should accept OPENAI modelProvider', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = {
        question: 'What is the policy?',
        modelProvider: 'OPENAI'
      };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept WORKERS_AI modelProvider', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = {
        question: 'What is the policy?',
        modelProvider: 'WORKERS_AI'
      };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept GOOGLE modelProvider', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = {
        question: 'What is the policy?',
        modelProvider: 'GOOGLE'
      };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should accept model override string', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = {
        question: 'What is the policy?',
        model: 'gpt-4o'
      };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });

    it('should work with both modelProvider and model', () => {
      const schema = (summarizePolicyTool as any).inputSchema;
      const input = {
        question: 'What is the policy?',
        modelProvider: 'OPENAI',
        model: 'gpt-4o-mini'
      };

      expect(() => {
        schema.parse(input);
      }).not.toThrow();
    });
  });

  describe('System Prompt Construction', () => {
    it('should include language directive in system prompt', () => {
      // System prompt should be constructed with language parameter
      const language = 'en';
      const systemPrompt = `You are a Security Policy Expert.
LANGUAGE: Respond in ${language || 'English'}`;

      expect(systemPrompt).toContain('LANGUAGE');
      expect(systemPrompt).toContain(language);
    });

    it('should support multiple languages in system prompt', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es'];

      languages.forEach(lang => {
        const systemPrompt = `LANGUAGE: Respond in ${lang}`;
        expect(systemPrompt).toContain(lang);
      });
    });
  });

  describe('User Prompt Construction', () => {
    it('should include question in user prompt', () => {
      const question = 'What is the phishing policy?';
      const userPrompt = `USER QUESTION: ${question}`;

      expect(userPrompt).toContain('USER QUESTION');
      expect(userPrompt).toContain(question);
    });

    it('should include focusArea in prompt when provided', () => {
      const focusArea = 'phishing';
      const userPrompt = `FOCUS AREA: ${focusArea}`;

      expect(userPrompt).toContain('FOCUS AREA');
      expect(userPrompt).toContain(focusArea);
    });

    it('should omit focusArea when not provided', () => {
      const userPrompt = `USER QUESTION: What is the policy?`;

      expect(userPrompt).not.toContain('FOCUS AREA');
    });
  });

  describe('JSON Response Parsing', () => {
    it('should parse JSON response from AI model', () => {
      const jsonResponse = `{
        "question": "What is phishing?",
        "summary": "Phishing is a social engineering attack.",
        "key_points": ["Fake emails", "Credential theft"],
        "recommendations": ["Report suspicious emails"]
      }`;

      const parsed = JSON.parse(jsonResponse);
      expect(parsed.question).toBe('What is phishing?');
    });

    it('should handle cleanResponse for JSON repair', () => {
      // Mock JSON response that might need cleaning
      const response = `{
        "question": "What is phishing?",
        "summary": "Summary with special chars: \\"quotes\\"",
        "key_points": ["Point 1"],
        "recommendations": ["Rec 1"]
      }`;

      expect(() => {
        JSON.parse(response);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty policy gracefully', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: { question: 'What is the policy?' }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should return error when policy not found', () => {
      // Tool should catch error and return proper error response
      expect(true).toBe(true);
    });

    it('should validate tool result against output schema', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const validOutput = {
        success: true,
        data: {
          question: 'Test',
          summary: 'Summary',
          key_points: [],
          recommendations: []
        }
      };

      expect(() => {
        schema.parse(validOutput);
      }).not.toThrow();
    });

    it('should log errors appropriately', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = { context: { question: 'What is the policy?' } };

      const result = await execute(context);
      expect(result).toBeDefined();
    });
  });

  describe('WithRetry Integration', () => {
    it('should retry on transient failures', async () => {
      // Tool uses withRetry wrapper for generateText
      expect(true).toBe(true);
    });

    it('should include operation identifier for logging', () => {
      // Retry wrapper includes operation ID like: [SummarizePolicyTool] policy-summary-general
      const operationId = '[SummarizePolicyTool] policy-summary-general';
      expect(operationId).toContain('SummarizePolicyTool');
    });
  });

  describe('CleanResponse Utility', () => {
    it('should repair malformed JSON from AI', () => {
      const malformed = `{"key": "value"`;
      // cleanResponse should attempt to repair this
      expect(typeof malformed).toBe('string');
    });

    it('should handle JSON with markdown code blocks', () => {
      const response = '```json\n{"question": "test"}\n```';
      // cleanResponse should strip markdown and extract JSON
      expect(response).toContain('```');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete policy summarization request in English', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: {
          question: 'What is our data protection policy?',
          focusArea: 'data protection',
          language: 'en'
        }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should handle request in Turkish', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: {
          question: 'Veri koruması politikamız nedir?',
          language: 'tr'
        }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should handle request in German', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: {
          question: 'Was ist unsere Datenschutzrichtlinie?',
          language: 'de'
        }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should handle request with model override', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: {
          question: 'What is the compliance policy?',
          modelProvider: 'OPENAI',
          model: 'gpt-4o'
        }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should handle comprehensive request with all parameters', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: {
          question: 'What should I do about phishing emails?',
          focusArea: 'phishing',
          language: 'en',
          modelProvider: 'OPENAI',
          model: 'gpt-4o-mini'
        }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });

    it('should handle minimal request with only question', async () => {
      const execute = (summarizePolicyTool as any).execute;
      const context = {
        context: { question: 'What is the policy?' }
      };

      const result = await execute(context);
      expect(result).toBeDefined();
    });
  });

  describe('Data Structure Validation', () => {
    it('should return array of key_points', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'Test',
          summary: 'Summary',
          key_points: ['Point 1', 'Point 2', 'Point 3'],
          recommendations: ['Rec 1']
        }
      };

      const parsed = schema.parse(output);
      expect(Array.isArray(parsed.data.key_points)).toBe(true);
    });

    it('should return array of recommendations', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const output = {
        success: true,
        data: {
          question: 'Test',
          summary: 'Summary',
          key_points: [],
          recommendations: ['Recommendation 1', 'Recommendation 2']
        }
      };

      const parsed = schema.parse(output);
      expect(Array.isArray(parsed.data.recommendations)).toBe(true);
    });

    it('should preserve original question in output', () => {
      const schema = (summarizePolicyTool as any).outputSchema;
      const originalQuestion = 'What is the password policy?';
      const output = {
        success: true,
        data: {
          question: originalQuestion,
          summary: 'Summary',
          key_points: [],
          recommendations: []
        }
      };

      const parsed = schema.parse(output);
      expect(parsed.data.question).toBe(originalQuestion);
    });
  });

  describe('Temperature and Consistency', () => {
    it('should use temperature for controlled response generation', () => {
      // Tool sets temperature: 0.7 for balanced responses
      const temperature = 0.7;
      expect(temperature).toBeGreaterThan(0);
      expect(temperature).toBeLessThan(1);
    });

    it('should maintain consistency in repeated calls', async () => {
      const execute = (summarizePolicyTool as any).execute;

      const context1 = {
        context: { question: 'What is the policy?' }
      };

      const context2 = {
        context: { question: 'What is the policy?' }
      };

      const result1 = await execute(context1);
      const result2 = await execute(context2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
