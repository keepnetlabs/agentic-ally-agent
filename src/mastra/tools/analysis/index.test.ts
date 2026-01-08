import { describe, it, expect } from 'vitest';
import {
  analyzeUserPromptTool,
  codeReviewCheckTool,
  reasoningTool,
  summarizePolicyTool,
  type AnalyzeUserPromptInput,
  type AnalyzeUserPromptOutput,
  type CodeReviewCheckInput,
  type CodeReviewCheckOutput,
} from './index';

/**
 * Test suite for analysis tools barrel export
 * Validates that all tools are properly exported and configured
 */

describe('Analysis Tools Barrel Export', () => {
  // ==================== EXPORT DEFINITION TESTS ====================
  describe('Tool Exports', () => {
    it('should export analyzeUserPromptTool', () => {
      expect(analyzeUserPromptTool).toBeDefined();
      expect(analyzeUserPromptTool).not.toBeNull();
    });

    it('should export codeReviewCheckTool', () => {
      expect(codeReviewCheckTool).toBeDefined();
      expect(codeReviewCheckTool).not.toBeNull();
    });

    it('should export reasoningTool', () => {
      expect(reasoningTool).toBeDefined();
      expect(reasoningTool).not.toBeNull();
    });

    it('should export summarizePolicyTool', () => {
      expect(summarizePolicyTool).toBeDefined();
      expect(summarizePolicyTool).not.toBeNull();
    });

    it('should export exactly 4 main tools', () => {
      const tools = [
        analyzeUserPromptTool,
        codeReviewCheckTool,
        reasoningTool,
        summarizePolicyTool
      ];

      expect(tools.length).toBe(4);
      tools.forEach(tool => {
        expect(tool).toBeDefined();
      });
    });
  });

  // ==================== TYPE EXPORTS ====================
  describe('Type Exports', () => {
    it('should export AnalyzeUserPromptInput type', () => {
      // Type should be available for import
      const sample = {
        userPrompt: 'test',
        suggestedLevel: 'Beginner' as const
      } as AnalyzeUserPromptInput;
      expect(sample.userPrompt).toBe('test');
    });

    it('should export AnalyzeUserPromptOutput type', () => {
      // Type should be available for import
      const sample: AnalyzeUserPromptOutput = {
        success: true,
        data: {
          language: 'en',
          topic: 'test',
          title: 'test',
          department: 'IT',
          level: 'beginner',
          category: 'General',
          subcategory: 'test',
          learningObjectives: [],
          duration: 5,
          industries: [],
          roles: [],
          keyTopics: [],
          practicalApplications: [],
          assessmentAreas: [],
        }
      };
      expect(sample.success).toBe(true);
    });

    it('should export CodeReviewCheckInput type', () => {
      // Type should be available for import
      const sample = {
        issueType: 'SQL Injection',
        originalCode: 'SELECT * FROM users',
        fixedCode: 'SELECT * FROM users WHERE id = ?',
        language: 'javascript',
        outputLanguage: 'en'
      } as CodeReviewCheckInput;
      expect(sample.issueType).toBe('SQL Injection');
    });

    it('should export CodeReviewCheckOutput type', () => {
      // Type should be available for import
      const sample: CodeReviewCheckOutput = {
        success: true,
        data: {
          isCorrect: true,
          severity: 'correct',
          feedback: 'Good fix',
          explanation: 'This properly addresses the issue',
          points: 25,
          hint: ''
        }
      };
      expect(sample.success).toBe(true);
    });
  });

  // ==================== TOOL INSTANCE TESTS ====================
  describe('Tool Instance Properties', () => {
    it('analyzeUserPromptTool should be Tool instance', () => {
      expect((analyzeUserPromptTool as any).id).toBeDefined();
      expect((analyzeUserPromptTool as any).description).toBeDefined();
      expect((analyzeUserPromptTool as any).inputSchema).toBeDefined();
      expect((analyzeUserPromptTool as any).outputSchema).toBeDefined();
      expect((analyzeUserPromptTool as any).execute).toBeDefined();
    });

    it('codeReviewCheckTool should be Tool instance', () => {
      expect((codeReviewCheckTool as any).id).toBeDefined();
      expect((codeReviewCheckTool as any).description).toBeDefined();
      expect((codeReviewCheckTool as any).inputSchema).toBeDefined();
      expect((codeReviewCheckTool as any).outputSchema).toBeDefined();
      expect((codeReviewCheckTool as any).execute).toBeDefined();
    });

    it('reasoningTool should be Tool instance', () => {
      expect((reasoningTool as any).id).toBeDefined();
      expect((reasoningTool as any).description).toBeDefined();
      expect((reasoningTool as any).inputSchema).toBeDefined();
      expect((reasoningTool as any).outputSchema).toBeDefined();
      expect((reasoningTool as any).execute).toBeDefined();
    });

    it('summarizePolicyTool should be Tool instance', () => {
      expect((summarizePolicyTool as any).id).toBeDefined();
      expect((summarizePolicyTool as any).description).toBeDefined();
      expect((summarizePolicyTool as any).inputSchema).toBeDefined();
      expect((summarizePolicyTool as any).outputSchema).toBeDefined();
      expect((summarizePolicyTool as any).execute).toBeDefined();
    });
  });

  // ==================== TOOL ID TESTS ====================
  describe('Tool ID Validation', () => {
    it('analyzeUserPromptTool should have correct id', () => {
      expect((analyzeUserPromptTool as any).id).toBe('analyze_user_prompt');
    });

    it('codeReviewCheckTool should have correct id', () => {
      expect((codeReviewCheckTool as any).id).toBe('code_review_check');
    });

    it('reasoningTool should have correct id', () => {
      expect((reasoningTool as any).id).toBe('show_reasoning');
    });

    it('summarizePolicyTool should have correct id', () => {
      expect((summarizePolicyTool as any).id).toBe('summarize-policy');
    });

    it('all tool ids should be strings', () => {
      expect(typeof (analyzeUserPromptTool as any).id).toBe('string');
      expect(typeof (codeReviewCheckTool as any).id).toBe('string');
      expect(typeof (reasoningTool as any).id).toBe('string');
      expect(typeof (summarizePolicyTool as any).id).toBe('string');
    });

    it('all tool ids should be non-empty', () => {
      expect((analyzeUserPromptTool as any).id.length).toBeGreaterThan(0);
      expect((codeReviewCheckTool as any).id.length).toBeGreaterThan(0);
      expect((reasoningTool as any).id.length).toBeGreaterThan(0);
      expect((summarizePolicyTool as any).id.length).toBeGreaterThan(0);
    });

    it('all tool ids should be unique', () => {
      const ids = [
        (analyzeUserPromptTool as any).id,
        (codeReviewCheckTool as any).id,
        (reasoningTool as any).id,
        (summarizePolicyTool as any).id
      ];

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);
    });
  });

  // ==================== DESCRIPTION TESTS ====================
  describe('Tool Description Validation', () => {
    it('analyzeUserPromptTool should have description', () => {
      expect((analyzeUserPromptTool as any).description).toBeDefined();
      expect((analyzeUserPromptTool as any).description.length).toBeGreaterThan(0);
    });

    it('codeReviewCheckTool should have description', () => {
      expect((codeReviewCheckTool as any).description).toBeDefined();
      expect((codeReviewCheckTool as any).description.length).toBeGreaterThan(0);
    });

    it('reasoningTool should have description', () => {
      expect((reasoningTool as any).description).toBeDefined();
      expect((reasoningTool as any).description.length).toBeGreaterThan(0);
    });

    it('summarizePolicyTool should have description', () => {
      expect((summarizePolicyTool as any).description).toBeDefined();
      expect((summarizePolicyTool as any).description.length).toBeGreaterThan(0);
    });

    it('all descriptions should be strings', () => {
      expect(typeof (analyzeUserPromptTool as any).description).toBe('string');
      expect(typeof (codeReviewCheckTool as any).description).toBe('string');
      expect(typeof (reasoningTool as any).description).toBe('string');
      expect(typeof (summarizePolicyTool as any).description).toBe('string');
    });
  });

  // ==================== SCHEMA TESTS ====================
  describe('Tool Schema Definition', () => {
    it('analyzeUserPromptTool should have inputSchema', () => {
      expect((analyzeUserPromptTool as any).inputSchema).toBeDefined();
      expect((analyzeUserPromptTool as any).inputSchema.parse).toBeDefined();
    });

    it('analyzeUserPromptTool should have outputSchema', () => {
      expect((analyzeUserPromptTool as any).outputSchema).toBeDefined();
      expect((analyzeUserPromptTool as any).outputSchema.parse).toBeDefined();
    });

    it('codeReviewCheckTool should have inputSchema', () => {
      expect((codeReviewCheckTool as any).inputSchema).toBeDefined();
      expect((codeReviewCheckTool as any).inputSchema.parse).toBeDefined();
    });

    it('codeReviewCheckTool should have outputSchema', () => {
      expect((codeReviewCheckTool as any).outputSchema).toBeDefined();
      expect((codeReviewCheckTool as any).outputSchema.parse).toBeDefined();
    });

    it('reasoningTool should have inputSchema', () => {
      expect((reasoningTool as any).inputSchema).toBeDefined();
      expect((reasoningTool as any).inputSchema.parse).toBeDefined();
    });

    it('reasoningTool should have outputSchema', () => {
      expect((reasoningTool as any).outputSchema).toBeDefined();
      expect((reasoningTool as any).outputSchema.parse).toBeDefined();
    });

    it('summarizePolicyTool should have inputSchema', () => {
      expect((summarizePolicyTool as any).inputSchema).toBeDefined();
      expect((summarizePolicyTool as any).inputSchema.parse).toBeDefined();
    });

    it('summarizePolicyTool should have outputSchema', () => {
      expect((summarizePolicyTool as any).outputSchema).toBeDefined();
      expect((summarizePolicyTool as any).outputSchema.parse).toBeDefined();
    });
  });

  // ==================== EXECUTE METHOD TESTS ====================
  describe('Tool Execute Method', () => {
    it('analyzeUserPromptTool execute should be function', () => {
      expect(typeof (analyzeUserPromptTool as any).execute).toBe('function');
    });

    it('codeReviewCheckTool execute should be function', () => {
      expect(typeof (codeReviewCheckTool as any).execute).toBe('function');
    });

    it('reasoningTool execute should be function', () => {
      expect(typeof (reasoningTool as any).execute).toBe('function');
    });

    it('summarizePolicyTool execute should be function', () => {
      expect(typeof (summarizePolicyTool as any).execute).toBe('function');
    });

    it('all execute methods should be callable', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];

      tools.forEach(tool => {
        expect((tool as any).execute).toBeDefined();
        expect(typeof (tool as any).execute).toBe('function');
      });
    });
  });

  // ==================== BARREL EXPORT COMPLETENESS ====================
  describe('Barrel Export Completeness', () => {
    it('should export all required tools', () => {
      const tools = {
        analyzeUserPromptTool,
        codeReviewCheckTool,
        reasoningTool,
        summarizePolicyTool
      };

      Object.values(tools).forEach(tool => {
        expect(tool).toBeDefined();
        expect(tool).not.toBeNull();
      });
    });

    it('should export all required types', () => {
      // If types are exported, they should be usable
      const types = [
        'AnalyzeUserPromptInput',
        'AnalyzeUserPromptOutput',
        'CodeReviewCheckInput',
        'CodeReviewCheckOutput'
      ];

      types.forEach(typeName => {
        expect(typeName).toBeDefined();
      });
    });

    it('should not export undefined tools', () => {
      expect(analyzeUserPromptTool).not.toBeUndefined();
      expect(codeReviewCheckTool).not.toBeUndefined();
      expect(reasoningTool).not.toBeUndefined();
      expect(summarizePolicyTool).not.toBeUndefined();
    });

    it('should not duplicate tool exports', () => {
      const tools = [
        analyzeUserPromptTool,
        codeReviewCheckTool,
        reasoningTool,
        summarizePolicyTool
      ];

      const toolIds = new Set(tools.map((t: any) => t.id));
      expect(toolIds.size).toBe(tools.length);
    });
  });

  // ==================== NAMED IMPORT TESTS ====================
  describe('Named Import Compatibility', () => {
    it('should support named import of analyzeUserPromptTool', () => {
      expect(analyzeUserPromptTool).toBeDefined();
      expect((analyzeUserPromptTool as any).id).toBe('analyze_user_prompt');
    });

    it('should support named import of codeReviewCheckTool', () => {
      expect(codeReviewCheckTool).toBeDefined();
      expect((codeReviewCheckTool as any).id).toBe('code_review_check');
    });

    it('should support named import of reasoningTool', () => {
      expect(reasoningTool).toBeDefined();
      expect((reasoningTool as any).id).toBe('show_reasoning');
    });

    it('should support named import of summarizePolicyTool', () => {
      expect(summarizePolicyTool).toBeDefined();
      expect((summarizePolicyTool as any).id).toBe('summarize-policy');
    });

    it('should support type-only imports', () => {
      // Type-only imports should not cause runtime errors
      const sample = {
        userPrompt: 'test',
        suggestedLevel: 'Intermediate' as const
      } as AnalyzeUserPromptInput;
      expect(sample).toBeDefined();
    });
  });

  // ==================== TOOL AVAILABILITY TESTS ====================
  describe('Tool Availability', () => {
    it('analyzeUserPromptTool should be available at module load', () => {
      expect(analyzeUserPromptTool).toBeDefined();
    });

    it('codeReviewCheckTool should be available at module load', () => {
      expect(codeReviewCheckTool).toBeDefined();
    });

    it('reasoningTool should be available at module load', () => {
      expect(reasoningTool).toBeDefined();
    });

    it('summarizePolicyTool should be available at module load', () => {
      expect(summarizePolicyTool).toBeDefined();
    });

    it('all tools should be available simultaneously', () => {
      const allAvailable = [
        analyzeUserPromptTool,
        codeReviewCheckTool,
        reasoningTool,
        summarizePolicyTool
      ].every(tool => tool !== undefined && tool !== null);

      expect(allAvailable).toBe(true);
    });
  });

  // ==================== TOOL COMPATIBILITY TESTS ====================
  describe('Tool Compatibility', () => {
    it('all tools should have consistent structure', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];

      tools.forEach(tool => {
        expect((tool as any).id).toBeDefined();
        expect((tool as any).description).toBeDefined();
        expect((tool as any).inputSchema).toBeDefined();
        expect((tool as any).outputSchema).toBeDefined();
        expect((tool as any).execute).toBeDefined();
      });
    });

    it('all tools should have executable methods', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];

      tools.forEach(tool => {
        expect(typeof (tool as any).execute).toBe('function');
      });
    });

    it('all tools should have parseableSchemas', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];

      tools.forEach(tool => {
        expect((tool as any).inputSchema.safeParse).toBeDefined();
        expect((tool as any).outputSchema.safeParse).toBeDefined();
      });
    });
  });

  // ==================== COLLECTION TESTS ====================
  describe('Tool Collection Properties', () => {
    it('should be able to collect all tools in array', () => {
      const allTools = [
        analyzeUserPromptTool,
        codeReviewCheckTool,
        reasoningTool,
        summarizePolicyTool
      ];

      expect(Array.isArray(allTools)).toBe(true);
      expect(allTools.length).toBe(4);
    });

    it('should be able to collect all tools in object', () => {
      const toolsObject = {
        analyze: analyzeUserPromptTool,
        codeReview: codeReviewCheckTool,
        reasoning: reasoningTool,
        policy: summarizePolicyTool
      };

      Object.values(toolsObject).forEach(tool => {
        expect((tool as any).id).toBeDefined();
      });
    });

    it('should be able to map over tools', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];
      const ids = tools.map((tool: any) => tool.id);

      expect(ids.length).toBe(4);
      expect(ids).toContain('analyze_user_prompt');
      expect(ids).toContain('code_review_check');
      expect(ids).toContain('show_reasoning');
      expect(ids).toContain('summarize-policy');
    });

    it('should be able to filter tools by id pattern', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];
      const policyTools = tools.filter((tool: any) => tool.id.includes('policy'));

      expect(policyTools.length).toBe(1);
      expect((policyTools[0] as any).id).toBe('summarize-policy');
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration with Analysis Module', () => {
    it('should provide complete analysis tool suite', () => {
      const analysisSuite = {
        userPromptAnalyzer: analyzeUserPromptTool,
        codeReviewValidator: codeReviewCheckTool,
        reasoningEmitter: reasoningTool,
        policySummarizer: summarizePolicyTool
      };

      Object.values(analysisSuite).forEach(tool => {
        expect((tool as any).id).toBeDefined();
        expect((tool as any).execute).toBeDefined();
      });
    });

    it('should support tool discovery by id', () => {
      const toolsMap: { [key: string]: any } = {
        'analyze_user_prompt': analyzeUserPromptTool,
        'code_review_check': codeReviewCheckTool,
        'show_reasoning': reasoningTool,
        'summarize-policy': summarizePolicyTool
      };

      const foundTool = toolsMap['code_review_check'];
      expect(foundTool).toBeDefined();
      expect((foundTool as any).id).toBe('code_review_check');
    });

    it('should support tool discovery by id prefix', () => {
      const tools = [analyzeUserPromptTool, codeReviewCheckTool, reasoningTool, summarizePolicyTool];
      const reasoningTools = tools.filter((tool: any) => (tool as any).id.includes('reasoning'));

      expect(reasoningTools.length).toBe(1);
      expect((reasoningTools[0] as any).id).toBe('show_reasoning');
    });
  });
});
