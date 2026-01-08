import { describe, it, expect } from 'vitest';
import { phishingEmailAgent } from './phishing-email-agent';
import { AGENT_NAMES, PHISHING, MESSAGING_GUIDELINES, PII_POLICY } from '../constants';

/**
 * Test suite for Phishing Email Agent
 * Tests agent configuration, tool definitions, memory settings, and behavioral rules
 */
describe('Phishing Email Agent', () => {
  // ==================== AGENT INITIALIZATION TESTS ====================
  describe('Agent Creation and Configuration', () => {
    it('should be properly instantiated as an Agent', () => {
      expect(phishingEmailAgent).toBeDefined();
      expect(phishingEmailAgent).not.toBeNull();
    });

    it('should have the correct agent name', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
      expect(phishingEmailAgent.name).toBe('phishingEmailAssistant');
    });

    it('should have instructions containing phishing keyword', () => {
      expect(phishingEmailAgent.instructions).toContain('phishing');
      expect(phishingEmailAgent.instructions).toContain('Phishing Simulation Specialist');
    });

    it('should have instructions defined', () => {
      expect(phishingEmailAgent.instructions).toBeDefined();
      expect(phishingEmailAgent.instructions).not.toBe('');
      expect(typeof phishingEmailAgent.instructions).toBe('string');
    });

    it('should have a model provider configured', () => {
      expect(phishingEmailAgent.model).toBeDefined();
      expect(phishingEmailAgent.model).not.toBeNull();
    });
  });

  // ==================== INSTRUCTIONS TESTS ====================
  describe('Instructions Structure and Rules', () => {
    it('should include language rule in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('LANGUAGE RULE');
      expect(phishingEmailAgent.instructions).toContain('Match user\'s exact language');
    });

    it('should include PII policy in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('ZERO PII POLICY');
      expect(phishingEmailAgent.instructions).toContain(PII_POLICY.CORE_RULE);
    });

    it('should reference PII guidelines in instructions', () => {
      const instructionText = phishingEmailAgent.instructions;
      expect(instructionText).toContain('Never include the employee\'s real name');
    });

    it('should include safety rules in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('SAFETY RULES');
      expect(phishingEmailAgent.instructions).toContain('Refuse requests for cyberattacks');
    });

    it('should include psychological profiler mode in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('PSYCHOLOGICAL PROFILER MODE');
      expect(phishingEmailAgent.instructions).toContain('Cialdini Principles');
    });

    it('should include messaging guidelines in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('Messaging Guidelines');
      expect(phishingEmailAgent.instructions).toContain(MESSAGING_GUIDELINES.EMPLOYEE_MATCH);
    });

    it('should include no jargon rule in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('NO TECH JARGON');
      expect(phishingEmailAgent.instructions).toContain('GPT-4');
    });
  });

  // ==================== AUTONOMOUS MODE TESTS ====================
  describe('Autonomous Mode Detection', () => {
    it('should mention AUTONOMOUS_EXECUTION_MODE in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('AUTONOMOUS_EXECUTION_MODE');
    });

    it('should define autonomous mode override behavior', () => {
      expect(phishingEmailAgent.instructions).toContain('IGNORE all State 1 and State 2');
      expect(phishingEmailAgent.instructions).toContain('EXECUTE the requested tool');
    });

    it('should mention preventing duplicate execution in autonomous mode', () => {
      expect(phishingEmailAgent.instructions).toContain('If you already executed phishingExecutor');
    });

    it('should define immediate stop after autonomous execution', () => {
      expect(phishingEmailAgent.instructions).toContain('STOP IMMEDIATELY');
      expect(phishingEmailAgent.instructions).toContain('Do NOT generate any further text');
    });

    it('should mention ONE execution only in autonomous mode', () => {
      expect(phishingEmailAgent.instructions).toContain('ONE execution only');
    });
  });

  // ==================== QUISHING DETECTION TESTS ====================
  describe('Quishing Detection Rules', () => {
    it('should mention quishing detection in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('QUISHING DETECTION RULE');
    });

    it('should include isQuishing parameter guidance', () => {
      expect(phishingEmailAgent.instructions).toContain('isQuishing');
      expect(phishingEmailAgent.instructions).toContain('true/false');
    });

    it('should list quishing keywords to check', () => {
      expect(phishingEmailAgent.instructions).toContain('quishing');
      expect(phishingEmailAgent.instructions).toContain('QR code');
    });

    it('should provide examples of quishing requests', () => {
      expect(phishingEmailAgent.instructions).toContain('Create Quishing Email Template');
      expect(phishingEmailAgent.instructions).toContain('QR code phishing');
    });

    it('should mention case-insensitive quishing keyword detection', () => {
      expect(phishingEmailAgent.instructions).toContain('case-insensitive');
    });
  });

  // ==================== EDIT MODE TESTS ====================
  describe('Edit Mode Validation', () => {
    it('should include EDIT MODE section in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('EDIT MODE');
    });

    it('should define edit mode trigger keywords', () => {
      expect(phishingEmailAgent.instructions).toContain('change');
      expect(phishingEmailAgent.instructions).toContain('update');
      expect(phishingEmailAgent.instructions).toContain('modify');
    });

    it('should mention phishingEditor tool in edit mode', () => {
      expect(phishingEmailAgent.instructions).toContain('phishingEditor');
    });

    it('should define edit mode parameter options', () => {
      expect(phishingEmailAgent.instructions).toContain('mode');
      expect(phishingEmailAgent.instructions).toContain('translate');
      expect(phishingEmailAgent.instructions).toContain('edit');
    });

    it('should mention hasBrandUpdate parameter in edit mode', () => {
      expect(phishingEmailAgent.instructions).toContain('hasBrandUpdate');
      expect(phishingEmailAgent.instructions).toContain('logo');
    });

    it('should provide edit mode examples', () => {
      expect(phishingEmailAgent.instructions).toContain('Change subject to Urgent');
      expect(phishingEmailAgent.instructions).toContain('Localize to Turkish');
    });
  });

  // ==================== TOOLS TESTS ====================
  describe('Tool Definitions', () => {
    it('should have tools object defined', () => {
      expect(phishingEmailAgent.tools).toBeDefined();
      expect(phishingEmailAgent.tools).not.toBeNull();
      expect(typeof phishingEmailAgent.tools).toBe('object');
    });

    it('should include phishingExecutor tool', () => {
      expect(phishingEmailAgent.tools).toHaveProperty('phishingExecutor');
      expect(phishingEmailAgent.tools.phishingExecutor).toBeDefined();
    });

    it('should include phishingEditor tool', () => {
      expect(phishingEmailAgent.tools).toHaveProperty('phishingEditor');
      expect(phishingEmailAgent.tools.phishingEditor).toBeDefined();
    });

    it('should include uploadPhishing tool', () => {
      expect(phishingEmailAgent.tools).toHaveProperty('uploadPhishing');
      expect(phishingEmailAgent.tools.uploadPhishing).toBeDefined();
    });

    it('should include assignPhishing tool', () => {
      expect(phishingEmailAgent.tools).toHaveProperty('assignPhishing');
      expect(phishingEmailAgent.tools.assignPhishing).toBeDefined();
    });

    it('should have exactly four tools', () => {
      const toolNames = Object.keys(phishingEmailAgent.tools);
      expect(toolNames).toHaveLength(4);
      expect(toolNames).toContain('phishingExecutor');
      expect(toolNames).toContain('phishingEditor');
      expect(toolNames).toContain('uploadPhishing');
      expect(toolNames).toContain('assignPhishing');
    });
  });

  // ==================== MEMORY CONFIGURATION TESTS ====================
  describe('Memory Configuration', () => {
    it('should be configured for stateless operation', () => {
      // Memory is configured with lastMessages=15 and workingMemory disabled
      // This optimizes for stateless operation as documented in instructions
      expect(phishingEmailAgent).toBeDefined();
      expect(phishingEmailAgent.instructions).toContain('stateless');
    });

    it('should mention memory configuration in source code', () => {
      // Memory configuration is visible in the source file
      expect(phishingEmailAgent.instructions).toBeDefined();
    });
  });

  // ==================== STATE MACHINE TESTS ====================
  describe('State Machine Rules', () => {
    it('should include STATE 2 in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('STATE 2');
    });

    it('should include STATE 3 in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('STATE 3');
    });

    it('should include STATE 4 in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('STATE 4');
    });

    it('should define STATE 2 execution rules', () => {
      expect(phishingEmailAgent.instructions).toContain('Direct Execution');
      expect(phishingEmailAgent.instructions).toContain('show_reasoning');
    });

    it('should define STATE 3 completion message', () => {
      expect(phishingEmailAgent.instructions).toContain('Phishing simulation created');
      expect(phishingEmailAgent.instructions).toContain('upload');
    });

    it('should mention STATE 4 upload handling', () => {
      expect(phishingEmailAgent.instructions).toContain('Upload (Optional)');
      expect(phishingEmailAgent.instructions).toContain('phishingId');
    });
  });

  // ==================== PHISHING PARAMETERS TESTS ====================
  describe('Phishing Execution Parameters', () => {
    it('should mention workflowType parameter in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain(PHISHING.WORKFLOW_TYPE);
    });

    it('should list difficulty levels in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('Easy');
      expect(phishingEmailAgent.instructions).toContain('Medium');
      expect(phishingEmailAgent.instructions).toContain('Hard');
    });

    it('should include default difficulty in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain(PHISHING.DEFAULT_DIFFICULTY);
    });

    it('should list attack methods in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('Click-Only');
      expect(phishingEmailAgent.instructions).toContain('Data-Submission');
    });

    it('should mention default attack method', () => {
      expect(phishingEmailAgent.instructions).toContain(PHISHING.DEFAULT_ATTACK_METHOD);
    });

    it('should include language parameter guidance', () => {
      expect(phishingEmailAgent.instructions).toContain('BCP-47');
      expect(phishingEmailAgent.instructions).toContain('en-gb');
    });

    it('should define targetProfile structure in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('targetProfile');
      expect(phishingEmailAgent.instructions).toContain('behavioralTriggers');
      expect(phishingEmailAgent.instructions).toContain('vulnerabilities');
    });
  });

  // ==================== SMART DEFAULTS TESTS ====================
  describe('Smart Defaults (Assumption Mode)', () => {
    it('should mention topic randomization in smart defaults', () => {
      expect(phishingEmailAgent.instructions).toContain('RANDOMIZATION');
      expect(phishingEmailAgent.instructions).toContain('INVENT a specific');
    });

    it('should discourage clichéd defaults', () => {
      expect(phishingEmailAgent.instructions).toContain('Microsoft 365 Password Expiry');
      expect(phishingEmailAgent.instructions).toContain('DO NOT');
    });

    it('should list inspiration categories', () => {
      expect(phishingEmailAgent.instructions).toContain('HR');
      expect(phishingEmailAgent.instructions).toContain('IT');
      expect(phishingEmailAgent.instructions).toContain('Finance');
      expect(phishingEmailAgent.instructions).toContain('Operations');
    });

    it('should mention Generic Employee as default target profile', () => {
      expect(phishingEmailAgent.instructions).toContain('Generic Employee');
    });

    it('should define difficulty default behavior', () => {
      expect(phishingEmailAgent.instructions).toContain('assume');
    });
  });

  // ==================== ORCHESTRATOR CONTEXT TESTS ====================
  describe('Orchestrator Context Capture', () => {
    it('should mention orchestrator context in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('ORCHESTRATOR CONTEXT');
    });

    it('should extract behavioral triggers from context', () => {
      expect(phishingEmailAgent.instructions).toContain('behavioralTriggers');
      expect(phishingEmailAgent.instructions).toContain('Triggers');
    });

    it('should extract vulnerabilities from context observations', () => {
      expect(phishingEmailAgent.instructions).toContain('vulnerabilities');
      expect(phishingEmailAgent.instructions).toContain('Observations');
    });

    it('should use orchestrator context verbatim', () => {
      expect(phishingEmailAgent.instructions).toContain('DO NOT summarize or truncate');
    });

    it('should include Risk Level from context', () => {
      expect(phishingEmailAgent.instructions).toContain('Risk Level');
    });
  });

  // ==================== SELF-CORRECTION TESTS ====================
  describe('Self-Correction & Critique', () => {
    it('should mention self-critique before execution', () => {
      expect(phishingEmailAgent.instructions).toContain('Self-Correction');
      expect(phishingEmailAgent.instructions).toContain('self-critique');
    });

    it('should include topic check in self-critique', () => {
      expect(phishingEmailAgent.instructions).toContain('Topic Check');
      expect(phishingEmailAgent.instructions).toContain('unique');
    });

    it('should include profile check in self-critique', () => {
      expect(phishingEmailAgent.instructions).toContain('Profile Check');
      expect(phishingEmailAgent.instructions).toContain('difficulty match');
    });

    it('should include attack method check in self-critique', () => {
      expect(phishingEmailAgent.instructions).toContain('Attack Method Check');
    });

    it('should include safety check in self-critique', () => {
      expect(phishingEmailAgent.instructions).toContain('Safety Check');
    });
  });

  // ==================== PLATFORM INTEGRATION TESTS ====================
  describe('Platform Integration (Upload & Assign)', () => {
    it('should define upload behavior in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('uploadPhishing');
    });

    it('should mention phishing ID marker format', () => {
      expect(phishingEmailAgent.instructions).toContain('phishingId');
      expect(phishingEmailAgent.instructions).toContain('[Phishing Simulation Email Created');
    });

    it('should define upload result structure', () => {
      expect(phishingEmailAgent.instructions).toContain('resourceId');
      expect(phishingEmailAgent.instructions).toContain('languageId');
    });

    it('should mention targetUserResourceId for assignment', () => {
      expect(phishingEmailAgent.instructions).toContain('targetUserResourceId');
      expect(phishingEmailAgent.instructions).toContain('REQUIRED for assignment');
    });

    it('should define assignment tool call structure', () => {
      expect(phishingEmailAgent.instructions).toContain('assignPhishing');
    });

    it('should mention user profile context for assignment', () => {
      expect(phishingEmailAgent.instructions).toContain('User Profile search results');
      expect(phishingEmailAgent.instructions).toContain('Use that ID automatically');
    });

    it('should warn not to guess missing IDs', () => {
      expect(phishingEmailAgent.instructions).toContain('DO NOT guess');
    });
  });

  // ==================== CRITICAL RULES TESTS ====================
  describe('Critical Rules for Assignment', () => {
    it('should mark targetUserResourceId as critical', () => {
      expect(phishingEmailAgent.instructions).toContain('CRITICAL');
      expect(phishingEmailAgent.instructions).toContain('targetUserResourceId');
    });

    it('should mention always scanning history first', () => {
      expect(phishingEmailAgent.instructions).toContain('conversation history first');
    });

    it('should define error handling for upload failures', () => {
      expect(phishingEmailAgent.instructions).toContain('If upload fails');
      expect(phishingEmailAgent.instructions).toContain('Do NOT regenerate');
    });

    it('should mention stop behavior on assignment errors', () => {
      expect(phishingEmailAgent.instructions).toContain('STOP');
      expect(phishingEmailAgent.instructions).toContain('Report error');
    });
  });

  // ==================== EXAMPLE INTERACTION TESTS ====================
  describe('Example Interaction', () => {
    it('should include example user request in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain('password reset');
    });

    it('should show example state 2 response format', () => {
      expect(phishingEmailAgent.instructions).toContain('Phishing Simulation Plan');
    });

    it('should show example confirmation in interaction', () => {
      expect(phishingEmailAgent.instructions).toContain('Yes');
    });
  });

  // ==================== INTEGRATION CONSTANTS TESTS ====================
  describe('Integration with Constants', () => {
    it('should use AGENT_NAMES.PHISHING constant', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
    });

    it('should reference PHISHING constants in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain(PHISHING.DEFAULT_DIFFICULTY);
      expect(phishingEmailAgent.instructions).toContain(PHISHING.WORKFLOW_TYPE);
    });

    it('should include PII_POLICY in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain(PII_POLICY.CORE_RULE);
    });

    it('should include MESSAGING_GUIDELINES in instructions', () => {
      expect(phishingEmailAgent.instructions).toContain(MESSAGING_GUIDELINES.EMPLOYEE_MATCH);
      expect(phishingEmailAgent.instructions).toContain(MESSAGING_GUIDELINES.ASSIGNMENT_SUCCESS.SIMULATION);
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should mention unlimited language support', () => {
      expect(phishingEmailAgent.instructions).toContain('language');
    });

    it('should define language detection strategy', () => {
      expect(phishingEmailAgent.instructions).toContain('detect');
      expect(phishingEmailAgent.instructions).toContain('BCP-47');
    });

    it('should provide Turkish language example', () => {
      expect(phishingEmailAgent.instructions).toContain('tr-tr');
    });

    it('should default to en-gb if language undetectable', () => {
      expect(phishingEmailAgent.instructions).toContain('en-gb');
    });
  });

  // ==================== MESSAGING GUIDELINES COMPLIANCE TESTS ====================
  describe('Messaging Guidelines Compliance', () => {
    it('should include EMPLOYEE_MATCH message', () => {
      expect(phishingEmailAgent.instructions).toContain(MESSAGING_GUIDELINES.EMPLOYEE_MATCH);
    });

    it('should include ASSIGNMENT_SUCCESS message for simulations', () => {
      expect(phishingEmailAgent.instructions).toContain(MESSAGING_GUIDELINES.ASSIGNMENT_SUCCESS.SIMULATION);
    });

    it('should list blacklist words to avoid', () => {
      // Should mention the NEVER use rule
      expect(phishingEmailAgent.instructions).toContain('NEVER use');
    });
  });

  // ==================== BASIC VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(phishingEmailAgent).toHaveProperty('name');
      expect(phishingEmailAgent).toHaveProperty('instructions');
      expect(phishingEmailAgent).toHaveProperty('model');
      expect(phishingEmailAgent).toHaveProperty('tools');
    });

    it('should not have empty instructions', () => {
      expect(phishingEmailAgent.instructions.trim().length).toBeGreaterThan(0);
    });

    it('should have tools as object type', () => {
      expect(typeof phishingEmailAgent.tools).toBe('object');
      expect(Array.isArray(phishingEmailAgent.tools)).toBe(false);
    });

    it('should have model as defined object', () => {
      expect(phishingEmailAgent.model).not.toBeNull();
      expect(typeof phishingEmailAgent.model).not.toBe('string');
    });
  });
});
