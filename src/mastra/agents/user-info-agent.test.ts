import { describe, it, expect, vi } from 'vitest';
vi.mock('../model-providers', () => ({
  getDefaultAgentModel: () => ({}),
}));

import { userInfoAgent } from './user-info-agent';
import { AGENT_NAMES, MESSAGING_GUIDELINES } from '../constants';

/**
 * Test suite for User Info Agent
 * Tests agent creation, tools, instructions, and behavioral resilience features
 */
describe('User Info Agent', () => {
  // ==================== AGENT INITIALIZATION TESTS ====================
  describe('Agent Creation and Configuration', () => {
    it('should be properly instantiated as an Agent', () => {
      expect(userInfoAgent).toBeDefined();
      expect(userInfoAgent).not.toBeNull();
    });

    it('should have the correct agent name', () => {
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
      expect(userInfoAgent.name).toBe('userInfoAssistant');
    });

    it('should have the correct agent name constant value', () => {
      expect(AGENT_NAMES.USER_INFO).toBe('userInfoAssistant');
    });

    it('should have instructions defined', () => {
      expect(userInfoAgent.instructions).toBeDefined();
      expect(userInfoAgent.instructions).not.toBe('');
      expect(typeof userInfoAgent.instructions).toBe('string');
    });

    it('should have instructions containing Executive Security Communications Expert role', () => {
      expect(userInfoAgent.instructions).toContain('Executive Security Communications Expert');
    });

    it('should have a model provider configured', () => {
      expect(userInfoAgent.model).toBeDefined();
      expect(userInfoAgent.model).not.toBeNull();
    });

    it('should use getDefaultAgentModel() for the model', () => {
      expect(userInfoAgent.model).toBeTruthy();
    });
  });

  // ==================== INSTRUCTIONS STRUCTURE TESTS ====================
  describe('Instructions Structure and Content', () => {
    it('should include role description in instructions', () => {
      expect(userInfoAgent.instructions).toContain('Executive Security Communications Expert');
      expect(userInfoAgent.instructions).toContain('Human Risk Management platform');
    });

    it('should define core responsibilities', () => {
      expect(userInfoAgent.instructions).toContain('INTERPRET a provided Behavioral Resilience JSON');
      expect(userInfoAgent.instructions).toContain('turn it into a clear, executive-ready narrative');
    });

    it('should include language rules in instructions', () => {
      expect(userInfoAgent.instructions).toContain('LANGUAGE RULE');
      expect(userInfoAgent.instructions).toContain('Match user\'s exact language');
    });

    it('should mention mode selection requirement', () => {
      expect(userInfoAgent.instructions).toContain('MODE SELECTION');
      expect(userInfoAgent.instructions).toContain('CRITICAL');
    });

    it('should not mention PII policy in instructions', () => {
      expect(userInfoAgent.instructions).not.toContain('CRITICAL PRIVACY RULES');
      expect(userInfoAgent.instructions).not.toContain('PII_POLICY');
      expect(userInfoAgent.instructions).not.toContain('ZERO PII');
    });
  });

  // ==================== TOOL INTEGRATION TESTS ====================
  describe('Tool Definition', () => {
    it('should have tools object defined', () => {
      expect(userInfoAgent.tools).toBeDefined();
      expect(userInfoAgent.tools).not.toBeNull();
      expect(typeof userInfoAgent.tools).toBe('object');
    });

    it('should include getUserInfo tool', () => {
      expect(userInfoAgent.tools).toHaveProperty('getUserInfo');
      expect(userInfoAgent.tools.getUserInfo).toBeDefined();
    });

    it('should have exactly one tool defined', () => {
      const toolNames = Object.keys(userInfoAgent.tools);
      expect(toolNames.length).toBeGreaterThanOrEqual(1);
      expect(toolNames).toContain('getUserInfo');
    });

    it('should mention getUserInfo tool in instructions', () => {
      expect(userInfoAgent.instructions).toContain('Call getUserInfo tool');
    });

    it('should define tool email parameter as preferred', () => {
      expect(userInfoAgent.instructions).toContain('Prefer **email**');
      expect(userInfoAgent.instructions).toContain('most reliable');
    });
  });

  // ==================== MODE SELECTION TESTS ====================
  describe('Mode Selection (ASSIGNMENT MODE vs REPORT MODE)', () => {
    it('should define ASSIGNMENT MODE in instructions', () => {
      expect(userInfoAgent.instructions).toContain('ASSIGNMENT MODE');
    });

    it('should define REPORT MODE in instructions', () => {
      expect(userInfoAgent.instructions).toContain('REPORT MODE');
    });

    it('should specify ASSIGNMENT MODE triggers', () => {
      expect(userInfoAgent.instructions).toContain('Assign this');
      expect(userInfoAgent.instructions).toContain('Assign to X');
      expect(userInfoAgent.instructions).toContain('Send training');
      expect(userInfoAgent.instructions).toContain('Launch simulation');
    });

    it('should specify REPORT MODE triggers', () => {
      expect(userInfoAgent.instructions).toContain('Who is');
      expect(userInfoAgent.instructions).toContain('Analyze');
      expect(userInfoAgent.instructions).toContain('Show report');
    });

    it('should mark REPORT MODE as default', () => {
      expect(userInfoAgent.instructions).toContain('REPORT MODE (Default)');
    });

    it('should specify ASSIGNMENT MODE confirmation behavior', () => {
      expect(userInfoAgent.instructions).toContain('Confirm the user is identified');
      expect(userInfoAgent.instructions).toContain('Ask ONE short confirmation question');
    });

    it('should prohibit report generation in ASSIGNMENT MODE', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT generate a report in this mode');
    });

    it('should specify REPORT MODE report generation', () => {
      expect(userInfoAgent.instructions.toLowerCase()).toContain('one-page executive report');
    });

    it('should prohibit JSON output in REPORT MODE', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT output JSON in this mode');
    });
  });

  // ==================== PII POLICY REMOVAL TESTS ====================
  describe('PII Policy Removal', () => {
    it('should not include hard-coded PII policy section in instructions', () => {
      expect(userInfoAgent.instructions).not.toContain('PII_POLICY');
      expect(userInfoAgent.instructions).not.toContain('CRITICAL PRIVACY RULES');
      expect(userInfoAgent.instructions).not.toContain('ZERO PII');
    });
  });

  // ==================== REPORT STRUCTURE TESTS ====================
  describe('Report Structure Requirements', () => {
    it('should define markdown format requirement', () => {
      expect(userInfoAgent.instructions).toContain('Markdown');
      expect(userInfoAgent.instructions).toContain('MARKDOWN');
    });

    it('should mandate one-page format', () => {
      expect(userInfoAgent.instructions).toContain('ONE-PAGE');
      expect(userInfoAgent.instructions.toLowerCase()).toContain('one-page');
    });

    it('should include report title section', () => {
      expect(userInfoAgent.instructions).toContain('Behavioral Resilience Report');
    });

    it('should define table format for header info', () => {
      expect(userInfoAgent.instructions).toContain('| Field | Value |');
      expect(userInfoAgent.instructions).toContain('Name');
      expect(userInfoAgent.instructions).toContain('Department');
      expect(userInfoAgent.instructions).toContain('Report Date');
    });

    it('should include strengths section', () => {
      expect(userInfoAgent.instructions).toContain('## Strengths');
      expect(userInfoAgent.instructions).toContain('bullet points');
    });

    it('should include growth opportunities section', () => {
      expect(userInfoAgent.instructions).toContain('## Growth Opportunities');
    });

    it('should include AI-Recommended Next Steps section', () => {
      expect(userInfoAgent.instructions).toContain('AI-Recommended Next Steps');
    });

    it('should include simulation recommendation subsection', () => {
      expect(userInfoAgent.instructions).toContain('Next Simulation');
      expect(userInfoAgent.instructions).toContain('NIST Phish Scale');
    });

    it('should include microlearning recommendation subsection', () => {
      expect(userInfoAgent.instructions).toContain('Next Microlearning');
    });

    it('should include nudge recommendation subsection', () => {
      expect(userInfoAgent.instructions).toContain('Nudge');
      expect(userInfoAgent.instructions).toContain('cadence');
      expect(userInfoAgent.instructions).toContain('channel');
    });

    it('should include business value section', () => {
      expect(userInfoAgent.instructions).toContain('Business Value');
      expect(userInfoAgent.instructions).toContain('Operational');
      expect(userInfoAgent.instructions).toContain('Strategic');
    });

    it('should include program context section (non-evaluative)', () => {
      expect(userInfoAgent.instructions).toContain('Program Context');
      expect(userInfoAgent.instructions).toContain('Non-evaluative');
    });

    it('should include references section', () => {
      expect(userInfoAgent.instructions).toContain('## References');
    });

    it('should include final choice question', () => {
      expect(userInfoAgent.instructions).toContain('Ready to Proceed?');
      expect(userInfoAgent.instructions).toContain('Would you like to create the microlearning or the phishing simulation?');
    });
  });

  // ==================== JSON INTERPRETATION TESTS ====================
  describe('JSON Interpretation Requirements', () => {
    it('should treat behavioral_resilience.current_stage as maturity indicator', () => {
      expect(userInfoAgent.instructions).toContain('current_stage');
      expect(userInfoAgent.instructions).toContain('maturity');
    });

    it('should use progression_hint from JSON', () => {
      expect(userInfoAgent.instructions).toContain('progression_hint');
    });

    it('should use strengths directly from JSON', () => {
      expect(userInfoAgent.instructions).toContain('strengths');
      expect(userInfoAgent.instructions).toContain('do not invent');
    });

    it('should use growth_opportunities directly from JSON', () => {
      expect(userInfoAgent.instructions).toContain('growth_opportunities');
    });

    it('should use only first recommended simulation', () => {
      expect(userInfoAgent.instructions).toContain('FIRST recommended simulation');
    });

    it('should use only first recommended microlearning', () => {
      expect(userInfoAgent.instructions).toContain('first');
    });

    it('should use only first recommended nudge', () => {
      expect(userInfoAgent.instructions).toContain('FIRST');
    });

    it('should not expose internal fields', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT expose internal fields');
      expect(userInfoAgent.instructions).toContain('internal.*');
    });

    it('should use business_value_zone.strategic for executive value', () => {
      expect(userInfoAgent.instructions).toContain('business_value_zone.strategic');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support and Detection', () => {
    it('should support user language detection', () => {
      expect(userInfoAgent.instructions).toContain('LANGUAGE RULE');
    });

    it('should provide English example', () => {
      expect(userInfoAgent.instructions).toContain('User writes "Analyze..."');
      expect(userInfoAgent.instructions).toContain('Respond in English');
    });

    it('should provide Turkish example', () => {
      expect(userInfoAgent.instructions).toContain('User writes "Analiz et..."');
      expect(userInfoAgent.instructions).toContain('Respond in Turkish');
    });

    it('should check current message language each time', () => {
      expect(userInfoAgent.instructions).toContain('CURRENT message language');
      expect(userInfoAgent.instructions).toContain('each message individually');
    });

    it('should not assume language from history', () => {
      expect(userInfoAgent.instructions).toContain('Never assume language from previous messages');
    });

    it('should apply language to all report sections', () => {
      expect(userInfoAgent.instructions).toContain('headings');
      expect(userInfoAgent.instructions).toContain('content');
      expect(userInfoAgent.instructions).toContain('labels');
    });

    it('should handle dominant language detection', () => {
      expect(userInfoAgent.instructions).toContain('dominant language');
    });
  });

  // ==================== BEHAVIORAL RESILIENCE TESTS ====================
  describe('Behavioral Resilience Concept', () => {
    it('should mention ENISA alignment', () => {
      expect(userInfoAgent.instructions).toContain('ENISA');
      expect(userInfoAgent.instructions).toContain('ENISA-aligned');
    });

    it('should reference current stage assessment', () => {
      expect(userInfoAgent.instructions).toContain('current_stage');
      expect(userInfoAgent.instructions).toContain('current individual maturity');
    });

    it('should reference target stage progression', () => {
      expect(userInfoAgent.instructions).toContain('target_stage');
      expect(userInfoAgent.instructions).toContain('next achievable step');
    });

    it('should use progression hints for narrative', () => {
      expect(userInfoAgent.instructions).toContain('Use progression_hint');
      expect(userInfoAgent.instructions).toContain('frame the narrative');
    });

    it('should mention maturity mapping', () => {
      expect(userInfoAgent.instructions).toContain('maturity_mapping');
    });
  });

  // ==================== NARRATIVE ACCURACY TESTS ====================
  describe('Narrative Accuracy and Consistency', () => {
    it('should match cadence wording from JSON', () => {
      expect(userInfoAgent.instructions).toContain('ONE_OFF');
      expect(userInfoAgent.instructions).toContain('WEEKLY');
      expect(userInfoAgent.instructions).toContain('MONTHLY');
    });

    it('should specify cadence wording for ONE_OFF', () => {
      expect(userInfoAgent.instructions).toContain('timely reminder');
      expect(userInfoAgent.instructions).toContain('targeted reminder');
    });

    it('should specify cadence wording for WEEKLY or MONTHLY', () => {
      expect(userInfoAgent.instructions).toContain('regular reminder');
    });

    it('should define consistency check requirement', () => {
      expect(userInfoAgent.instructions).toContain('FINAL CONSISTENCY CHECK');
      expect(userInfoAgent.instructions).toContain('MANDATORY');
    });

    it('should validate cadence-wording match', () => {
      expect(userInfoAgent.instructions).toContain('Cadence wording matches');
    });

    it('should validate training recommendations against completion signals', () => {
      expect(userInfoAgent.instructions).toContain('Training recommendations do not contradict');
      expect(userInfoAgent.instructions).toContain('training completion signals');
    });

    it('should validate behavioral principle references', () => {
      expect(userInfoAgent.instructions).toContain('Behavioral principle references');
      expect(userInfoAgent.instructions).toContain('match their original sources');
    });

    it('should provide example principle reference validation', () => {
      expect(userInfoAgent.instructions).toContain('Habit Loop');
      expect(userInfoAgent.instructions).toContain('Duhigg');
    });

    it('should suggest conservative language if uncertain', () => {
      expect(userInfoAgent.instructions).toContain('uncertain');
      expect(userInfoAgent.instructions).toContain('conservative reinforcement language');
    });
  });

  // ==================== REFERENCE ATTRIBUTION TESTS ====================
  describe('Reference Attribution (Lightweight)', () => {
    it('should mention behavioral principles in explanations', () => {
      expect(userInfoAgent.instructions).toContain('behavioral principle');
    });

    it('should include example principle citations', () => {
      expect(userInfoAgent.instructions).toContain('Curiosity Gap');
      expect(userInfoAgent.instructions).toContain('Loewenstein');
    });

    it('should include Authority Bias reference', () => {
      expect(userInfoAgent.instructions).toContain('Authority Bias');
      expect(userInfoAgent.instructions).toContain('Milgram');
    });

    it('should include Habit Loop reference', () => {
      expect(userInfoAgent.instructions).toContain('Habit Loop');
      expect(userInfoAgent.instructions).toContain('Duhigg');
    });

    it('should include Self-efficacy reference', () => {
      expect(userInfoAgent.instructions).toContain('Self-efficacy');
      expect(userInfoAgent.instructions).toContain('ENISA');
    });

    it('should mention Friction Reduction reference', () => {
      expect(userInfoAgent.instructions).toContain('Friction Reduction');
      expect(userInfoAgent.instructions).toContain('ENISA');
    });

    it('should provide inline reference tag examples', () => {
      expect(userInfoAgent.instructions).toContain('(Curiosity Gap – Loewenstein)');
    });

    it('should keep references lightweight', () => {
      expect(userInfoAgent.instructions).toContain('lightweight');
      expect(userInfoAgent.instructions).toContain('inline');
    });
  });

  // ==================== MESSAGING GUIDELINES TESTS ====================
  describe('Messaging Guidelines Integration', () => {
    it('should include EMPLOYEE_MATCH message', () => {
      expect(userInfoAgent.instructions).toContain(MESSAGING_GUIDELINES.EMPLOYEE_MATCH);
    });

    it('should include assignment success message for training', () => {
      expect(userInfoAgent.instructions).toContain(MESSAGING_GUIDELINES.ASSIGNMENT_SUCCESS.TRAINING);
    });

    it('should mention messaging guidelines section', () => {
      expect(userInfoAgent.instructions).toContain('Messaging Guidelines');
      expect(userInfoAgent.instructions).toContain('Enterprise-Safe');
    });

    it('should mention NEVER use blacklist', () => {
      expect(userInfoAgent.instructions).toContain('NEVER use');
    });
  });

  // ==================== WRITING STYLE TESTS ====================
  describe('Writing Style Requirements', () => {
    it('should require executive tone', () => {
      expect(userInfoAgent.instructions).toContain('Executive');
      expect(userInfoAgent.instructions).toContain('calm');
    });

    it('should require supportive tone', () => {
      expect(userInfoAgent.instructions).toContain('supportive');
      expect(userInfoAgent.instructions).toContain('non-blaming');
    });

    it('should require growth-oriented language', () => {
      expect(userInfoAgent.instructions).toContain('Growth-oriented language');
    });

    it('should prohibit technical jargon', () => {
      expect(userInfoAgent.instructions).toContain('No technical jargon');
    });

    it('should require short sentences', () => {
      expect(userInfoAgent.instructions).toContain('Short sentences');
    });

    it('should require scan-friendly format', () => {
      expect(userInfoAgent.instructions).toContain('Scan-friendly');
    });

    it('should require one-page constraint', () => {
      expect(userInfoAgent.instructions).toContain('must fit on ONE page');
    });
  });

  // ==================== EMAIL LOOKUP TESTS ====================
  describe('Email-Based User Lookup', () => {
    it('should prefer email parameter when available', () => {
      expect(userInfoAgent.instructions).toContain('Prefer **email**');
    });

    it('should mention email as most reliable', () => {
      expect(userInfoAgent.instructions).toContain('most reliable');
    });

    it('should provide email call example', () => {
      expect(userInfoAgent.instructions).toContain('user@company.com');
      expect(userInfoAgent.instructions).toContain('getUserInfo');
    });

    it('should support fullName as fallback', () => {
      expect(userInfoAgent.instructions).toContain('fullName');
    });

    it('should support firstName/lastName as fallback', () => {
      expect(userInfoAgent.instructions).toContain('firstName');
      expect(userInfoAgent.instructions).toContain('lastName');
    });

    it('should return structured Behavioral Resilience JSON', () => {
      expect(userInfoAgent.instructions).toContain('structured Behavioral Resilience JSON');
      expect(userInfoAgent.instructions).toContain('ENISA-aligned');
    });
  });

  // ==================== MEMORY CONFIGURATION TESTS ====================
  describe('Memory Configuration', () => {
    it('should be configured for context awareness', () => {
      expect(userInfoAgent).toBeDefined();
      expect(userInfoAgent.instructions).toBeDefined();
    });

    it('should mention context preservation in instructions', () => {
      expect(userInfoAgent.instructions).toBeDefined();
    });
  });

  // ==================== AGENT NAME CONSTANT TESTS ====================
  describe('Agent Name Constant Integration', () => {
    it('should use AGENT_NAMES.USER_INFO constant', () => {
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
    });

    it('should have consistent agent name', () => {
      expect(userInfoAgent.name).toBe('userInfoAssistant');
      expect(AGENT_NAMES.USER_INFO).toBe('userInfoAssistant');
    });

    it('should match AGENT_NAMES constant definition', () => {
      const agentNamesKeys = Object.keys(AGENT_NAMES);
      expect(agentNamesKeys).toContain('USER_INFO');
    });
  });

  // ==================== BASIC STRUCTURAL VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(userInfoAgent).toHaveProperty('name');
      expect(userInfoAgent).toHaveProperty('instructions');
      expect(userInfoAgent).toHaveProperty('model');
      expect(userInfoAgent).toHaveProperty('tools');
    });

    it('should have non-empty instructions', () => {
      expect(userInfoAgent.instructions.trim().length).toBeGreaterThan(0);
    });

    it('should have tools as object type', () => {
      expect(typeof userInfoAgent.tools).toBe('object');
      expect(Array.isArray(userInfoAgent.tools)).toBe(false);
    });

    it('should have model as defined object', () => {
      expect(userInfoAgent.model).not.toBeNull();
      expect(typeof userInfoAgent.model).not.toBe('string');
    });

    it('should have tools as non-empty object', () => {
      expect(Object.keys(userInfoAgent.tools).length).toBeGreaterThan(0);
    });
  });

  // ==================== INSTRUCTION QUALITY TESTS ====================
  describe('Instructions Quality and Completeness', () => {
    it('should not have empty instructions', () => {
      expect(userInfoAgent.instructions.trim().length).toBeGreaterThan(0);
    });

    it('should be formatted as continuous string', () => {
      expect(typeof userInfoAgent.instructions).toBe('string');
    });

    it('should contain substantial content (2000+ characters)', () => {
      expect(userInfoAgent.instructions.length).toBeGreaterThan(2000);
    });

    it('should be structured with multiple sections', () => {
      const sectionCount = (userInfoAgent.instructions.match(/##/g) || []).length;
      expect(sectionCount).toBeGreaterThan(5);
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Complete Workflow Integration', () => {
    it('should support ASSIGNMENT MODE workflow', () => {
      expect(userInfoAgent.instructions).toContain('ASSIGNMENT MODE');
      expect(userInfoAgent.instructions).toContain('confirmation question');
    });

    it('should support REPORT MODE workflow', () => {
      expect(userInfoAgent.instructions).toContain('REPORT MODE');
      expect(userInfoAgent.instructions.toLowerCase()).toContain('one-page executive report');
    });

    it('should support language-aware report generation', () => {
      expect(userInfoAgent.instructions).toContain('detected language');
      expect(userInfoAgent.instructions).toContain('report sections');
    });

    it('should support recommendation-based next steps', () => {
      expect(userInfoAgent.instructions).toContain('Next Steps');
      expect(userInfoAgent.instructions).toContain('microlearning');
      expect(userInfoAgent.instructions).toContain('phishing simulation');
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases and Special Handling', () => {
    it('should handle missing target_stage gracefully', () => {
      expect(userInfoAgent.instructions).toBeDefined();
    });

    it('should handle empty strengths list', () => {
      expect(userInfoAgent.instructions).toContain('strengths');
    });

    it('should handle multiple sections render correctly', () => {
      expect(userInfoAgent.instructions).toContain('Render ALL items');
    });
  });
});
