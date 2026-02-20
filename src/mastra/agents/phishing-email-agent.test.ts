import { describe, it, expect } from 'vitest';
import { phishingEmailAgent } from './phishing-email-agent';
import { AGENT_NAMES } from '../constants';

/**
 * Phishing Email Agent - Structural Verification Suite
 */
describe('Phishing Email Agent', () => {
  // ==================== BASIC CONFIGURATION TESTS ====================
  describe('Basic Configuration', () => {
    it('should have the correct agent name from constants', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
    });

    it('should have tools configured', () => {
      expect(phishingEmailAgent.tools).toBeDefined();
      expect(Object.keys(phishingEmailAgent.tools)).toContain('phishingExecutor');
      expect(Object.keys(phishingEmailAgent.tools)).toContain('phishingEditor');
      expect(Object.keys(phishingEmailAgent.tools)).toContain('uploadPhishing');
      expect(Object.keys(phishingEmailAgent.tools)).toContain('assignPhishing');
    });

    it('should have exactly 5 tools', () => {
      expect(Object.keys(phishingEmailAgent.tools)).toHaveLength(5);
    });

    it('should have name as string', () => {
      expect(typeof phishingEmailAgent.name).toBe('string');
    });

    it('should have model configured', () => {
      expect(phishingEmailAgent.model).toBeDefined();
    });
  });

  // ==================== INSTRUCTION QUALITY TESTS ====================
  describe('Agent Instructions', () => {
    it('should have substantial content', () => {
      expect(phishingEmailAgent.instructions).toBeDefined();
      expect(phishingEmailAgent.instructions.length).toBeGreaterThan(500);
    });

    it('should contain the specialist persona', () => {
      expect(phishingEmailAgent.instructions).toContain('Phishing Simulation Specialist');
    });

    it('should have the language rules', () => {
      expect(phishingEmailAgent.instructions).toContain('Language Rules');
    });

    it('should have safety rules', () => {
      expect(phishingEmailAgent.instructions).toContain('Global Rules');
      expect(phishingEmailAgent.instructions).toContain('Safety');
    });

    it('should have the tool/tech jargon restriction', () => {
      expect(phishingEmailAgent.instructions).toContain('No Tech Jargon');
    });

    it('should mention Cialdini Principles', () => {
      expect(phishingEmailAgent.instructions).toContain('Cialdini Principles');
    });

    it('should have substantial instructions', () => {
      expect(phishingEmailAgent.instructions.length).toBeGreaterThan(1000);
    });

    it('should define role with bold formatting', () => {
      expect(phishingEmailAgent.instructions).toContain('**Phishing Simulation Specialist**');
    });
  });

  // ==================== MESSAGING GUIDELINES COMPLIANCE ====================
  describe('Messaging Guidelines Compliance', () => {
    it('should list blacklist words to avoid', () => {
      expect(phishingEmailAgent.instructions).toContain('NEVER use');
    });

    it('should NOT contain unauthorized system strings', () => {
      const forbiddenStrings = ['EMPLOYEE_MATCH', 'ASSIGNMENT_SUCCESS.TRAINING', 'ASSIGNMENT_SUCCESS.SIMULATION'];

      forbiddenStrings.forEach(str => {
        expect(phishingEmailAgent.instructions).not.toContain(str);
      });
    });
  });

  // ==================== BASIC STRUCTURAL VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(phishingEmailAgent).toHaveProperty('name');
      expect(phishingEmailAgent).toHaveProperty('instructions');
      expect(phishingEmailAgent).toHaveProperty('model');
      expect(phishingEmailAgent).toHaveProperty('tools');
    });

    it('should have tools as object type', () => {
      expect(typeof phishingEmailAgent.tools).toBe('object');
      expect(Array.isArray(phishingEmailAgent.tools)).toBe(false);
    });
  });

  // ==================== TOOL CONFIGURATION ====================
  describe('Tool Configuration', () => {
    it('should have phishingExecutor tool', () => {
      expect(phishingEmailAgent.tools.phishingExecutor).toBeDefined();
      expect(typeof phishingEmailAgent.tools.phishingExecutor).toBe('object');
    });

    it('should have phishingEditor tool', () => {
      expect(phishingEmailAgent.tools.phishingEditor).toBeDefined();
      expect(typeof phishingEmailAgent.tools.phishingEditor).toBe('object');
    });

    it('should have uploadPhishing tool', () => {
      expect(phishingEmailAgent.tools.uploadPhishing).toBeDefined();
      expect(typeof phishingEmailAgent.tools.uploadPhishing).toBe('object');
    });

    it('should have assignPhishing tool', () => {
      expect(phishingEmailAgent.tools.assignPhishing).toBeDefined();
      expect(typeof phishingEmailAgent.tools.assignPhishing).toBe('object');
    });

    it('should not have getUserInfo tool', () => {
      expect(phishingEmailAgent.tools).not.toHaveProperty('getUserInfo');
    });

    it('should not have summarizePolicy tool', () => {
      expect(phishingEmailAgent.tools).not.toHaveProperty('summarizePolicy');
    });
  });

  // ==================== LANGUAGE RULES ====================
  describe('Language Rules', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should define LANGUAGE RULES section', () => {
      expect(instructions).toContain('Language Rules');
    });

    it('should define INTERACTION LANGUAGE', () => {
      expect(instructions).toContain('INTERACTION LANGUAGE');
    });

    it('should define CONTENT LANGUAGE', () => {
      expect(instructions).toContain('CONTENT LANGUAGE');
    });

    it('should mention BCP-47 codes', () => {
      expect(instructions).toContain('BCP-47');
      expect(instructions).toContain('en-gb');
      expect(instructions).toContain('tr-tr');
    });

    it('should provide language matching rules', () => {
      expect(instructions).toContain("match the user's CURRENT message language");
    });

    it('should include language examples', () => {
      expect(instructions).toContain('Create Phishing');
      expect(instructions).toContain('Respond in English');
    });

    it('should include Turkish example', () => {
      expect(instructions).toContain('Oltama yap');
      expect(instructions).toContain('Respond in Turkish');
    });

    it('should define scenario example', () => {
      expect(instructions).toContain('SCENARIO:');
      expect(instructions).toContain('Create Turkish CEO Fraud email');
    });
  });

  // ==================== SAFETY RULES ====================
  describe('Safety Rules', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have SAFETY RULES section', () => {
      expect(instructions).toContain('Global Rules');
      expect(instructions).toContain('Safety');
    });

    it('should refuse cyberattacks', () => {
      expect(instructions).toContain('Refuse real cyberattack');
    });

    it('should refuse real-world hacking', () => {
      expect(instructions).toContain('malicious hacking');
    });

    it('should refuse malicious intent', () => {
      expect(instructions).toContain('real cyberattack');
    });

    it('should accept educational requests', () => {
      expect(instructions).toContain('educational/simulation');
    });

    it('should reframe borderline requests', () => {
      expect(instructions).toContain('Accept ONLY educational/simulation requests');
    });
  });

  // ==================== PSYCHOLOGICAL PROFILER MODE ====================
  describe('Psychological Profiler Mode', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have PSYCHOLOGICAL PROFILER MODE section', () => {
      expect(instructions).toContain('Psychological Profiler');
    });

    it('should mention Cialdini Principles', () => {
      expect(instructions).toContain('Cialdini Principles');
    });

    it('should list 6 principles', () => {
      expect(instructions).toContain('Reciprocity');
      expect(instructions).toContain('Commitment');
      expect(instructions).toContain('Social Proof');
      expect(instructions).toContain('Authority');
      expect(instructions).toContain('Liking');
      expect(instructions).toContain('Scarcity');
    });

    it('should provide trigger matching examples', () => {
      expect(instructions).toContain('Finance');
      expect(instructions).toContain('Urgency');
      expect(instructions).toContain('Invoice overdue');
    });

    it('should mention HR example', () => {
      expect(instructions).toContain('HR');
      expect(instructions).toContain('Policy change');
    });

    it('should emphasize cognitive dissonance', () => {
      expect(instructions).toContain('cognitive dissonance');
    });
  });

  // ==================== AUTONOMOUS MODE ====================
  describe('Autonomous Mode', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have AUTONOMOUS MODE OVERRIDE section', () => {
      expect(instructions).toContain('AUTONOMOUS MODE OVERRIDE');
      expect(instructions).toContain('AUTONOMOUS_EXECUTION_MODE');
    });

    it('should define override behavior', () => {
      expect(instructions).toContain('IGNORE all State 1 and State 2');
    });

    it('should require immediate execution', () => {
      expect(instructions).toContain('EXECUTE the requested tool');
      expect(instructions).toContain('IMMEDIATELY');
    });

    it('should define stop behavior', () => {
      expect(instructions).toContain('STOP IMMEDIATELY');
      expect(instructions).toContain('Do NOT generate any further text');
    });

    it('should prevent looping', () => {
      expect(instructions).toContain('Do NOT loop');
      expect(instructions).toContain('ONE execution only');
    });
  });

  // ==================== WORKFLOW ROUTING ====================
  describe('Workflow Routing', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have WORKFLOW ROUTING section', () => {
      expect(instructions).toContain('Workflow Routing');
    });

    it('should define CREATION workflow', () => {
      expect(instructions).toContain('CREATION');
      expect(instructions).toContain('New Simulation');
    });

    it('should define UTILITY workflow', () => {
      expect(instructions).toContain('UTILITY');
      expect(instructions).toContain('Edit, Translate, Update');
    });

    it('should define bypass behavior', () => {
      expect(instructions).toContain('BYPASS STATES');
      expect(instructions).toContain('Execute immediately');
    });
  });

  // ==================== STATE MACHINE ====================
  describe('State Machine', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have State Machine section', () => {
      expect(instructions).toContain('State Machine');
    });

    it('should define STATE 1', () => {
      expect(instructions).toContain('STATE 1');
      expect(instructions).toContain('Information Gathering');
    });

    it('should define STATE 2', () => {
      expect(instructions).toContain('STATE 2');
      expect(instructions).toContain('Summary & Confirmation');
    });

    it('should define STATE 3', () => {
      expect(instructions).toContain('STATE 3');
      expect(instructions).toContain('Execute');
    });

    it('should define STATE 4', () => {
      expect(instructions).toContain('STATE 4');
      expect(instructions).toContain('Platform Integration');
    });

    it('should mention showReasoning in states', () => {
      expect(instructions).toContain('showReasoning');
    });

    it('should define confirmation wait', () => {
      expect(instructions).toContain('Wait for user confirmation');
    });
  });

  // ==================== SMART DEFAULTS ====================
  describe('Smart Defaults', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have Smart Defaults section', () => {
      expect(instructions).toContain('Smart Defaults');
    });

    it('should define topic randomization', () => {
      expect(instructions).toContain('RANDOMIZATION');
      expect(instructions).toContain('MUST INVENT a specific');
    });

    it('should list inspiration categories', () => {
      expect(instructions).toContain('HR');
      expect(instructions).toContain('IT');
      expect(instructions).toContain('Finance');
      expect(instructions).toContain('Operations');
    });

    it('should define difficulty default', () => {
      expect(instructions).toContain('Difficulty:');
    });

    it('should define language default', () => {
      expect(instructions).toContain('en-gb');
    });

    it('should define target profile default', () => {
      expect(instructions).toContain('Generic Employee');
    });
  });

  // ==================== SELF-CORRECTION ====================
  describe('Self-Correction', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have Self-Correction section', () => {
      expect(instructions).toContain('Self-Correction');
    });

    it('should define pre-execution check', () => {
      expect(instructions).toContain('Pre-Execution Check');
    });

    it('should have Topic Check', () => {
      expect(instructions).toContain('Topic Check');
      expect(instructions).toContain('unique and deceptive');
    });

    it('should have Profile Check', () => {
      expect(instructions).toContain('Profile Check');
      expect(instructions).toContain('difficulty match');
    });

    it('should have Attack Method Check', () => {
      expect(instructions).toContain('Attack Method Check');
    });

    it('should have Safety Check', () => {
      expect(instructions).toContain('Safety Check');
      expect(instructions).toContain('SIMULATION request');
    });
  });

  // ==================== PLATFORM INTEGRATION ====================
  describe('Platform Integration', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have Platform Integration section', () => {
      expect(instructions).toContain('Platform Integration');
    });

    it('should define upload behavior', () => {
      expect(instructions).toContain('uploadPhishing');
    });

    it('should define assign behavior', () => {
      expect(instructions).toContain('assignPhishing');
    });

    it('should require resourceId for assignment', () => {
      expect(instructions).toContain('resourceId');
      expect(instructions).toContain('NEVER** use phishingId as resourceId');
    });

    it('should define ID marker detection', () => {
      expect(instructions).toContain('phishingId=');
      expect(instructions).toContain('[ARTIFACT_IDS]');
    });

    it('should define targetUserResourceId requirement', () => {
      expect(instructions).toContain('targetUserResourceId');
      expect(instructions).toContain('REQUIRED for assignment');
    });
  });

  // ==================== QUISHING DETECTION ====================
  describe('Quishing Detection', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have QUISHING DETECTION RULE', () => {
      expect(instructions).toContain('QUISHING DETECTION');
    });

    it('should mention isQuishing parameter', () => {
      expect(instructions).toContain('isQuishing');
    });

    it('should list quishing keywords', () => {
      expect(instructions).toContain('quishing');
      expect(instructions).toContain('QR code');
    });

    it('should provide quishing examples', () => {
      expect(instructions).toContain('Create Quishing Email');
      expect(instructions).toContain('QR code phishing');
    });

    it('should require true for QR requests', () => {
      expect(instructions).toContain('MUST set isQuishing: true');
    });
  });

  // ==================== EDIT MODE ====================
  describe('Edit Mode', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have EDIT MODE section', () => {
      expect(instructions).toContain('EDIT MODE');
    });

    it('should list edit keywords', () => {
      expect(instructions).toContain('change, update, modify');
    });

    it('should define phishingEditor tool call', () => {
      expect(instructions).toContain('phishingEditor');
    });

    it('should mention edit modes', () => {
      expect(instructions).toContain('translate');
      expect(instructions).toContain('edit');
    });

    it('should define hasBrandUpdate parameter', () => {
      expect(instructions).toContain('hasBrandUpdate');
    });

    it('should provide edit examples', () => {
      expect(instructions).toContain('Change subject to Urgent');
    });

    it('should define email only behavior', () => {
      expect(instructions).toContain('email only');
    });

    it('should handle missing template', () => {
      expect(instructions).toContain('No existing template found');
    });
  });

  // ==================== TOOL PARAMETERS ====================
  describe('Tool Parameters', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should define workflowType parameter', () => {
      expect(instructions).toContain('workflowType');
    });

    it('should define topic parameter', () => {
      expect(instructions).toContain('topic');
    });

    it('should define language parameter', () => {
      expect(instructions).toContain('language');
    });

    it('should define difficulty parameter', () => {
      expect(instructions).toContain('difficulty');
    });

    it('should define method parameter', () => {
      expect(instructions).toContain('method');
    });

    it('should define includeLandingPage parameter', () => {
      expect(instructions).toContain('includeLandingPage');
    });

    it('should define includeEmail parameter', () => {
      expect(instructions).toContain('includeEmail');
    });

    it('should define targetProfile parameter', () => {
      expect(instructions).toContain('targetProfile');
    });

    it('should mention modelProvider override', () => {
      expect(instructions).toContain('modelProvider');
    });

    it('should mention model override', () => {
      expect(instructions).toContain('model');
    });
  });

  // ==================== AUTO CONTEXT CAPTURE ====================
  describe('Auto Context Capture', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have Auto Context Capture section', () => {
      expect(instructions).toContain('Auto Context Capture');
    });

    it('should define ORCHESTRATOR CONTEXT handling', () => {
      expect(instructions).toContain('CONTEXT FROM ORCHESTRATOR');
    });

    it('should require full context usage', () => {
      expect(instructions).toContain('ENTIRE ORCHESTRATOR CONTEXT');
      expect(instructions).toContain('DO NOT summarize or truncate');
    });

    it('should mention extracting triggers', () => {
      expect(instructions).toContain('behavioralTriggers');
    });

    it('should mention extracting vulnerabilities', () => {
      expect(instructions).toContain('vulnerabilities');
    });

    it('should define Preferred Language extraction', () => {
      expect(instructions).toContain('Preferred Language');
    });
  });

  // ==================== MESSAGING GUIDELINES ====================
  describe('Messaging Guidelines', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have Messaging Guidelines section', () => {
      expect(instructions).toContain('Messaging Guidelines');
    });

    it('should list blacklist words', () => {
      expect(instructions).toContain('NEVER use');
    });

    it('should be enterprise-safe', () => {
      expect(instructions).toContain('Enterprise-Safe');
    });
  });

  // ==================== EXAMPLE INTERACTION ====================
  describe('Example Interaction', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have Example Interaction section', () => {
      expect(instructions).toContain('Example Interaction');
    });

    it('should show user request', () => {
      expect(instructions).toContain('User:');
      expect(instructions).toContain('Create a phishing email');
    });

    it('should show agent response', () => {
      expect(instructions).toContain('You:');
    });

    it('should show State 2 example', () => {
      expect(instructions).toContain('State 2');
    });

    it('should show State 3 example', () => {
      expect(instructions).toContain('State 3');
    });
  });

  // ==================== NO TECH JARGON ====================
  describe('No Tech Jargon', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have NO TECH JARGON rule', () => {
      expect(instructions).toContain('No Tech Jargon');
    });

    it('should prohibit model names', () => {
      expect(instructions).toContain('Hide model names');
    });

    it('should prohibit provider mentions', () => {
      expect(instructions).toContain('providers');
    });

    it('should prohibit tool IDs', () => {
      expect(instructions).toContain('tool IDs');
    });

    it('should focus on user intent', () => {
      expect(instructions).toContain('user intent');
      expect(instructions).toContain('business logic');
    });
  });

  // ==================== CRITICAL RULES ====================
  describe('Critical Rules', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have CRITICAL marker', () => {
      expect(instructions).toContain('CRITICAL');
    });

    it('should emphasize resourceId requirement', () => {
      expect(instructions).toContain('resourceId: FROM upload.data.resourceId');
    });

    it('should emphasize targetUserResourceId requirement', () => {
      expect(instructions).toContain('targetUserResourceId is REQUIRED');
    });

    it('should prohibit guessing IDs', () => {
      expect(instructions).toContain('Do NOT use names');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle agent with all properties', () => {
      expect(phishingEmailAgent.name).toBeDefined();
      expect(phishingEmailAgent.instructions).toBeDefined();
      expect(phishingEmailAgent.model).toBeDefined();
      expect(phishingEmailAgent.tools).toBeDefined();
    });

    it('should have non-empty name', () => {
      expect(phishingEmailAgent.name.trim().length).toBeGreaterThan(0);
    });

    it('should have substantial instructions', () => {
      expect(phishingEmailAgent.instructions.length).toBeGreaterThan(2000);
    });

    it('should have valid tools object', () => {
      expect(phishingEmailAgent.tools).not.toBeNull();
      expect(Array.isArray(phishingEmailAgent.tools)).toBe(false);
    });

    it('should have all tool objects', () => {
      Object.values(phishingEmailAgent.tools).forEach(tool => {
        expect(typeof tool).toBe('object');
        expect(tool).not.toBeNull();
      });
    });
  });

  // ==================== INTEGRATION VALIDATION ====================
  describe('Integration Validation', () => {
    it('should reference correct constant for name', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
    });

    it('should be exportable', () => {
      expect(typeof phishingEmailAgent).toBe('object');
      expect(phishingEmailAgent).not.toBeNull();
    });

    it('should have complete agent structure', () => {
      const requiredProps = ['name', 'instructions', 'model', 'tools'];
      requiredProps.forEach(prop => {
        expect(phishingEmailAgent).toHaveProperty(prop);
      });
    });

    it('should have 5 tools configured', () => {
      const toolCount = Object.keys(phishingEmailAgent.tools).length;
      expect(toolCount).toBe(5);
    });
  });

  // ==================== INSTRUCTION STRUCTURE ====================
  describe('Instruction Structure', () => {
    const instructions = phishingEmailAgent.instructions;

    it('should have markdown section markers', () => {
      expect(instructions).toContain('## Global Rules');
      expect(instructions).toContain('## Language Rules');
      expect(instructions).toContain('## Psychological Profiler');
      expect(instructions).toContain('### Workflow Routing');
    });

    it('should use bold formatting for sections', () => {
      expect(instructions).toContain('**No Tech Jargon:**');
      expect(instructions).toContain('**Safety:**');
    });

    it('should have numbered lists', () => {
      expect(instructions).toContain('1.');
      expect(instructions).toContain('2.');
    });

    it('should have state definitions', () => {
      expect(instructions).toContain('STATE 1');
      expect(instructions).toContain('STATE 2');
      expect(instructions).toContain('STATE 3');
      expect(instructions).toContain('STATE 4');
    });
  });
});
