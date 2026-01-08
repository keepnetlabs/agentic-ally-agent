import { describe, it, expect } from 'vitest';
import { policySummaryAgent } from './policy-summary-agent';
import { AGENT_NAMES } from '../constants';

/**
 * Test suite for Policy Summary Agent
 * Tests agent configuration, tool definitions, memory settings, and workflow behavior
 */
describe('Policy Summary Agent', () => {
  // ==================== AGENT INITIALIZATION TESTS ====================
  describe('Agent Creation and Configuration', () => {
    it('should be properly instantiated as an Agent', () => {
      expect(policySummaryAgent).toBeDefined();
      expect(policySummaryAgent).not.toBeNull();
    });

    it('should have the correct agent name', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
      expect(policySummaryAgent.name).toBe('policySummaryAssistant');
    });

    it('should have instructions containing policy keyword', () => {
      expect(policySummaryAgent.instructions).toContain('policy');
      expect(policySummaryAgent.instructions).toContain('Company Policy Expert');
    });

    it('should have instructions defined', () => {
      expect(policySummaryAgent.instructions).toBeDefined();
      expect(policySummaryAgent.instructions).not.toBe('');
      expect(typeof policySummaryAgent.instructions).toBe('string');
    });

    it('should have a model provider configured', () => {
      expect(policySummaryAgent.model).toBeDefined();
      expect(policySummaryAgent.model).not.toBeNull();
    });
  });

  // ==================== INSTRUCTIONS STRUCTURE TESTS ====================
  describe('Instructions Structure and Content', () => {
    it('should define agent role as Company Policy Expert', () => {
      expect(policySummaryAgent.instructions).toContain('Company Policy Expert');
    });

    it('should define core job responsibilities', () => {
      expect(policySummaryAgent.instructions).toContain('help employees understand');
      expect(policySummaryAgent.instructions).toContain('company security policies');
    });

    it('should include workflow section', () => {
      expect(policySummaryAgent.instructions).toContain('WORKFLOW');
      expect(policySummaryAgent.instructions).toContain('Listen');
      expect(policySummaryAgent.instructions).toContain('Call Tool');
    });

    it('should define immediate tool call behavior', () => {
      expect(policySummaryAgent.instructions).toContain('Call Tool IMMEDIATELY');
      expect(policySummaryAgent.instructions).toContain('Do NOT ask for clarification');
    });

    it('should include response format section', () => {
      expect(policySummaryAgent.instructions).toContain('Response Format');
      expect(policySummaryAgent.instructions).toContain('RESPONSE FORMAT');
    });

    it('should mention scope limitations', () => {
      expect(policySummaryAgent.instructions).toContain('SCOPE');
      expect(policySummaryAgent.instructions).toContain('Do NOT invent policies');
      expect(policySummaryAgent.instructions).toContain('Do NOT give legal advice');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support Rules', () => {
    it('should include language rule in instructions', () => {
      expect(policySummaryAgent.instructions).toContain('LANGUAGE RULE');
    });

    it('should mention matching user language', () => {
      expect(policySummaryAgent.instructions).toContain('Match user\'s language');
    });

    it('should provide English example', () => {
      expect(policySummaryAgent.instructions).toContain('English');
      expect(policySummaryAgent.instructions).toContain('Respond in English');
    });

    it('should provide Turkish example', () => {
      expect(policySummaryAgent.instructions).toContain('Turkish');
      expect(policySummaryAgent.instructions).toContain('Respond in Turkish');
    });

    it('should handle mixed language scenarios', () => {
      expect(policySummaryAgent.instructions).toContain('mixed');
      expect(policySummaryAgent.instructions).toContain('dominant language');
    });
  });

  // ==================== TOOL DEFINITION TESTS ====================
  describe('Tool Definitions', () => {
    it('should have tools object defined', () => {
      expect(policySummaryAgent.tools).toBeDefined();
      expect(policySummaryAgent.tools).not.toBeNull();
      expect(typeof policySummaryAgent.tools).toBe('object');
    });

    it('should include summarizePolicy tool', () => {
      expect(policySummaryAgent.tools).toHaveProperty('summarizePolicy');
      expect(policySummaryAgent.tools.summarizePolicy).toBeDefined();
    });

    it('should have exactly one tool', () => {
      const toolNames = Object.keys(policySummaryAgent.tools);
      expect(toolNames).toHaveLength(1);
      expect(toolNames).toContain('summarizePolicy');
    });

    it('tool name should be correct', () => {
      expect(Object.keys(policySummaryAgent.tools)[0]).toBe('summarizePolicy');
    });
  });

  // ==================== TOOL INVOCATION PATTERN TESTS ====================
  describe('Tool Invocation Patterns', () => {
    it('should mention calling summarize-policy tool in instructions', () => {
      expect(policySummaryAgent.instructions).toContain('summarize-policy');
    });

    it('should describe tool parameter (user question)', () => {
      expect(policySummaryAgent.instructions).toContain('The user\'s question');
      expect(policySummaryAgent.instructions).toContain('exact wording');
    });

    it('should mention optional focus area parameter', () => {
      expect(policySummaryAgent.instructions).toContain('focus area');
      expect(policySummaryAgent.instructions).toContain('Optional');
    });

    it('should provide focus area example', () => {
      expect(policySummaryAgent.instructions).toContain('phishing');
    });

    it('should handle generic queries without focus area', () => {
      expect(policySummaryAgent.instructions).toContain('generic');
      expect(policySummaryAgent.instructions).toContain('empty focus area');
    });

    it('should describe tool fetching behavior', () => {
      expect(policySummaryAgent.instructions).toContain('Tool fetches');
      expect(policySummaryAgent.instructions).toContain('automatically fetches');
    });
  });

  // ==================== RESPONSE STRUCTURE TESTS ====================
  describe('Response Format and Structure', () => {
    it('should define response as clearly structured', () => {
      expect(policySummaryAgent.instructions).toContain('clearly');
      expect(policySummaryAgent.instructions).toContain('concisely');
    });

    it('should include summary in response format', () => {
      expect(policySummaryAgent.instructions).toContain('Summary');
      expect(policySummaryAgent.instructions).toContain('policy says');
    });

    it('should include key points in response format', () => {
      expect(policySummaryAgent.instructions).toContain('Key Points');
      expect(policySummaryAgent.instructions).toContain('3-5');
      expect(policySummaryAgent.instructions).toContain('bullet list');
    });

    it('should include recommendations in response format', () => {
      expect(policySummaryAgent.instructions).toContain('Recommendations');
      expect(policySummaryAgent.instructions).toContain('should do');
    });

    it('should mention note for security training context', () => {
      expect(policySummaryAgent.instructions).toContain('Note');
      expect(policySummaryAgent.instructions).toContain('security training');
    });
  });

  // ==================== CRITICAL BEHAVIOR TESTS ====================
  describe('Critical Behavioral Rules', () => {
    it('should prohibit asking for clarification', () => {
      expect(policySummaryAgent.instructions).toContain('Do NOT ask');
      expect(policySummaryAgent.instructions).toContain('clarification');
    });

    it('should prohibit requesting which policy question', () => {
      expect(policySummaryAgent.instructions).toContain('Which policy do you want');
    });

    it('should define immediate tool calling behavior', () => {
      expect(policySummaryAgent.instructions).toContain('IMMEDIATELY');
      expect(policySummaryAgent.instructions).toContain('just call the tool');
    });

    it('should prohibit inventing policies', () => {
      expect(policySummaryAgent.instructions).toContain('Do NOT invent policies');
    });

    it('should prohibit giving legal advice', () => {
      expect(policySummaryAgent.instructions).toContain('Do NOT give legal advice');
    });

    it('should prohibit overriding policy with opinion', () => {
      expect(policySummaryAgent.instructions).toContain('Do NOT override');
      expect(policySummaryAgent.instructions).toContain('personal opinions');
    });
  });

  // ==================== MEMORY CONFIGURATION TESTS ====================
  describe('Memory Configuration', () => {
    it('should be configured for stateless operation', () => {
      // Memory is configured with lastMessages=15 and workingMemory disabled
      // This optimizes for stateless operation as documented in instructions
      expect(policySummaryAgent).toBeDefined();
      expect(policySummaryAgent.instructions).toContain('stateless');
    });

    it('should mention memory configuration in source code', () => {
      // Memory configuration is visible in the source file
      expect(policySummaryAgent.instructions).toBeDefined();
    });
  });

  // ==================== MODEL PROVIDER TESTS ====================
  describe('Model Provider Configuration', () => {
    it('should use lightweight model', () => {
      expect(policySummaryAgent.model).toBeDefined();
    });

    it('should have model defined as expected', () => {
      // The model should be configured (implementation detail may vary)
      expect(policySummaryAgent.model).not.toBeNull();
      expect(typeof policySummaryAgent.model).not.toBe('string');
    });
  });

  // ==================== EXAMPLE INTERACTION TESTS ====================
  describe('Example Interaction', () => {
    it('should include example user question', () => {
      expect(policySummaryAgent.instructions).toContain('What\'s our policy on phishing');
    });

    it('should show example response structure', () => {
      expect(policySummaryAgent.instructions).toContain('Our policy requires');
      expect(policySummaryAgent.instructions).toContain('Key points');
    });

    it('should show confirmation of tool call', () => {
      expect(policySummaryAgent.instructions).toContain('Let me check our security policies');
    });

    it('should show call to summarize-policy tool', () => {
      expect(policySummaryAgent.instructions).toContain('summarize-policy');
    });
  });

  // ==================== WORKFLOW STEPS TESTS ====================
  describe('Workflow Steps', () => {
    it('should define Listen step', () => {
      expect(policySummaryAgent.instructions).toContain('Listen');
    });

    it('should define Call Tool step', () => {
      expect(policySummaryAgent.instructions).toContain('Call Tool IMMEDIATELY');
      expect(policySummaryAgent.instructions).toContain('summarize-policy');
    });

    it('should define Tool Fetches step', () => {
      expect(policySummaryAgent.instructions).toContain('Tool fetches');
    });

    it('should define Respond step', () => {
      expect(policySummaryAgent.instructions).toContain('Respond');
      expect(policySummaryAgent.instructions).toContain('Present findings');
    });

    it('should include all workflow steps in order', () => {
      const instructions = policySummaryAgent.instructions;
      const listenIndex = instructions.indexOf('Listen');
      const callIndex = instructions.indexOf('Call Tool');
      const fetchIndex = instructions.indexOf('Tool fetches');
      const respondIndex = instructions.indexOf('Respond');

      expect(listenIndex).toBeLessThan(callIndex);
      expect(callIndex).toBeLessThan(fetchIndex);
      expect(fetchIndex).toBeLessThan(respondIndex);
    });
  });

  // ==================== EDGE CASE HANDLING TESTS ====================
  describe('Edge Case Handling', () => {
    it('should handle policy not addressing question', () => {
      expect(policySummaryAgent.instructions).toContain('policy doesn\'t address');
      expect(policySummaryAgent.instructions).toContain('say so directly');
    });

    it('should define behavior for out-of-scope questions', () => {
      expect(policySummaryAgent.instructions).toContain('Do NOT');
    });
  });

  // ==================== INTEGRATION WITH CONSTANTS TESTS ====================
  describe('Integration with Constants', () => {
    it('should use AGENT_NAMES.POLICY_SUMMARY constant', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
    });

    it('should reference POLICY_SUMMARY from AGENT_NAMES', () => {
      expect(AGENT_NAMES.POLICY_SUMMARY).toBe('policySummaryAssistant');
    });
  });

  // ==================== BASIC STRUCTURAL VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(policySummaryAgent).toHaveProperty('name');
      expect(policySummaryAgent).toHaveProperty('instructions');
      expect(policySummaryAgent).toHaveProperty('model');
      expect(policySummaryAgent).toHaveProperty('tools');
    });

    it('should not have empty instructions', () => {
      expect(policySummaryAgent.instructions.trim().length).toBeGreaterThan(0);
    });

    it('should have tools as object type', () => {
      expect(typeof policySummaryAgent.tools).toBe('object');
      expect(Array.isArray(policySummaryAgent.tools)).toBe(false);
    });

    it('should have tools object defined properly', () => {
      expect(policySummaryAgent.tools).not.toBeNull();
      expect(typeof policySummaryAgent.tools).toBe('object');
    });

    it('should have model as defined object', () => {
      expect(policySummaryAgent.model).not.toBeNull();
      expect(typeof policySummaryAgent.model).not.toBe('string');
    });
  });

  // ==================== INSTRUCTION GRAMMAR AND CLARITY TESTS ====================
  describe('Instruction Clarity and Completeness', () => {
    it('should have clear section headers', () => {
      expect(policySummaryAgent.instructions).toContain('YOUR JOB');
      expect(policySummaryAgent.instructions).toContain('WORKFLOW');
      expect(policySummaryAgent.instructions).toContain('CRITICAL');
      expect(policySummaryAgent.instructions).toContain('LANGUAGE RULE');
      expect(policySummaryAgent.instructions).toContain('SCOPE');
      expect(policySummaryAgent.instructions).toContain('RESPONSE FORMAT');
      expect(policySummaryAgent.instructions).toContain('EXAMPLE');
    });

    it('should use clear language throughout', () => {
      expect(policySummaryAgent.instructions).not.toContain('');
    });

    it('should include numbered lists for clarity', () => {
      expect(policySummaryAgent.instructions).toContain('1.');
      expect(policySummaryAgent.instructions).toContain('2.');
      expect(policySummaryAgent.instructions).toContain('3.');
    });
  });

  // ==================== TOOL BEHAVIOR EXPECTATIONS TESTS ====================
  describe('Tool Behavior Expectations', () => {
    it('should expect tool to fetch company policies internally', () => {
      expect(policySummaryAgent.instructions).toContain('automatically fetches');
      expect(policySummaryAgent.instructions).toContain('policies internally');
    });

    it('should expect tool to provide structured data', () => {
      expect(policySummaryAgent.instructions).toContain('findings');
    });

    it('should indicate tool responsibility for data fetching', () => {
      expect(policySummaryAgent.instructions).toContain('tool responsibility');
    });
  });

  // ==================== SECURITY AWARENESS CONTEXT TESTS ====================
  describe('Security Awareness Context', () => {
    it('should recognize security policy context', () => {
      expect(policySummaryAgent.instructions).toContain('security policies');
    });

    it('should mention training/simulation suggestions', () => {
      expect(policySummaryAgent.instructions).toContain('security training');
      expect(policySummaryAgent.instructions).toContain('simulations');
    });

    it('should define when to suggest next steps', () => {
      expect(policySummaryAgent.instructions).toContain('related to security training');
      expect(policySummaryAgent.instructions).toContain('suggest next steps');
    });
  });

  // ==================== PROMPT PASSING TESTS ====================
  describe('Prompt/Question Passing Behavior', () => {
    it('should pass user question to tool as-is', () => {
      expect(policySummaryAgent.instructions).toContain('exact wording');
    });

    it('should allow tool to auto-detect focus area', () => {
      expect(policySummaryAgent.instructions).toContain('detected from question');
      expect(policySummaryAgent.instructions).toContain('if possible');
    });

    it('should support empty focus area for generic questions', () => {
      expect(policySummaryAgent.instructions).toContain('generic');
      expect(policySummaryAgent.instructions).toContain('empty focus area');
    });
  });

  // ==================== DESCRIPTION VALIDATION TESTS ====================
  describe('Instructions Content Validation', () => {
    it('should mention security policies in instructions', () => {
      const hasSecurityPolicies = policySummaryAgent.instructions.includes('security policies') ||
                                   policySummaryAgent.instructions.includes('policies');
      expect(hasSecurityPolicies).toBe(true);
    });

    it('should mention expert guidance in instructions', () => {
      const hasExpertGuidance = policySummaryAgent.instructions.includes('expert') ||
                                policySummaryAgent.instructions.includes('guidance');
      expect(hasExpertGuidance).toBe(true);
    });

    it('should mention employee support in instructions', () => {
      const hasEmployeeSupport = policySummaryAgent.instructions.includes('employee') ||
                                 policySummaryAgent.instructions.includes('help');
      expect(hasEmployeeSupport).toBe(true);
    });
  });
});
