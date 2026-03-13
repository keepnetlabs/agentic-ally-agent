import { describe, it, expect, beforeAll } from 'vitest';
import { userInfoAgent } from './user-info-agent';
import { AGENT_NAMES } from '../constants';

/**
 * User Info Agent - Comprehensive Test Suite
 */
describe('User Info Agent', () => {
  let instructions: string;
  let tools: Record<string, any>;

  beforeAll(async () => {
    instructions = (await userInfoAgent.getInstructions()) as string;
    tools = await userInfoAgent.listTools();
  });

  // ==================== BASIC CONFIGURATION TESTS ====================
  describe('Basic Configuration', () => {
    it('should have the correct agent name from constants', () => {
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
    });

    it('should have name property', () => {
      expect(userInfoAgent.name).toBeDefined();
      expect(typeof userInfoAgent.name).toBe('string');
      expect(userInfoAgent.name.length).toBeGreaterThan(0);
    });

    it('should have instructions property', () => {
      expect(instructions).toBeDefined();
      expect(typeof instructions).toBe('string');
    });

    it('should have model property', () => {
      expect(userInfoAgent.model).toBeDefined();
    });

    it('should have tools configured', () => {
      expect(tools).toBeDefined();
      expect(Object.keys(tools)).toContain('getUserInfo');
      expect(Object.keys(tools)).toContain('getTargetGroupInfo');
    });

    it('should have exactly 2 tools', () => {
      expect(Object.keys(tools)).toHaveLength(2);
    });
  });

  // ==================== INSTRUCTION QUALITY TESTS ====================
  describe('Agent Instructions', () => {
    it('should have substantial content', () => {
      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(500);
    });

    it('should be very detailed', () => {
      expect(instructions.length).toBeGreaterThan(2000);
    });

    it('should contain the executive expert persona', () => {
      expect(instructions).toContain('Executive Security Communications Expert');
    });

    it('should describe role clearly', () => {
      expect(instructions).toContain('YOUR ROLE');
    });

    it('should have the language rule', () => {
      expect(instructions).toContain('LANGUAGE RULE');
      expect(instructions).toContain("match the user's CURRENT message language");
    });

    it('should describe the available modes', () => {
      expect(instructions).toContain('ASSIGNMENT MODE');
      expect(instructions).toContain('REPORT MODE');
    });

    it('should explain mode selection', () => {
      expect(instructions).toContain('MODE SELECTION');
    });

    it('should have writing style guidelines', () => {
      expect(instructions).toContain('WRITING STYLE');
    });

    it('should have tone guidelines', () => {
      expect(instructions).toContain('TONE');
    });

    it('should specify executive communication style', () => {
      expect(instructions).toContain('Executive');
    });

    it('should emphasize non-blaming approach', () => {
      expect(instructions).toContain('non-blaming');
    });

    it('should mention growth-oriented language', () => {
      expect(instructions).toContain('Growth-oriented');
    });
  });

  // ==================== MODE INSTRUCTIONS ====================
  describe('Mode Instructions', () => {
    it('should explain ASSIGNMENT MODE triggers', () => {
      expect(instructions).toContain('Assign this');
      expect(instructions).toContain('Assign to');
    });

    it('should explain REPORT MODE triggers', () => {
      expect(instructions).toContain('Who is');
      expect(instructions).toContain('Analyze');
    });

    it('should mention skipAnalysis flag', () => {
      expect(instructions).toContain('skipAnalysis: true');
    });

    it('should explain when to use skipAnalysis', () => {
      expect(instructions).toContain('only need the ID');
    });

    it('should mention confirmation question in ASSIGNMENT MODE', () => {
      expect(instructions).toContain('confirmation question');
    });

    it('should specify one-page report requirement', () => {
      expect(instructions).toContain('ONE page');
    });
  });

  // ==================== LANGUAGE SUPPORT ====================
  describe('Language Support', () => {
    it('should require matching user language', () => {
      expect(instructions).toContain("match the user's CURRENT message language");
    });

    it('should check current message language', () => {
      expect(instructions).toContain('current message');
    });

    it('should handle English example', () => {
      expect(instructions).toContain('Analyze John');
      expect(instructions).toContain('English');
    });

    it('should handle Turkish example', () => {
      expect(instructions).toContain('Analiz et');
      expect(instructions).toContain('Turkish');
    });

    it('should handle mixed language messages', () => {
      expect(instructions).toContain('current message language');
    });

    it('should apply language to all report sections', () => {
      expect(instructions).toContain('ALL report sections');
    });
  });

  // ==================== REPORT STRUCTURE ====================
  describe('Report Structure', () => {
    it('should define Behavioral Resilience Report title', () => {
      expect(instructions).toContain('Behavioral Resilience Report');
    });

    it('should include ENISA alignment', () => {
      expect(instructions).toContain('ENISA');
    });

    it('should have Strengths section', () => {
      expect(instructions).toContain('Strengths');
    });

    it('should have Growth Opportunities section', () => {
      expect(instructions).toContain('Growth Opportunities');
    });

    it('should have AI-Recommended Next Steps section', () => {
      expect(instructions).toContain('AI-Recommended Next Steps');
    });

    it('should have Business Value section', () => {
      expect(instructions).toContain('Business Value');
    });

    it('should have References section', () => {
      expect(instructions).toContain('References');
    });

    it('should include simulation details', () => {
      expect(instructions).toContain('Next Simulation');
    });

    it('should include microlearning details', () => {
      expect(instructions).toContain('Next Microlearning');
    });

    it('should include nudge details', () => {
      expect(instructions).toContain('Nudge');
    });

    it('should mention NIST Phish Scale', () => {
      expect(instructions).toContain('NIST Phish Scale');
    });

    it('should include Operational business value', () => {
      expect(instructions).toContain('Operational');
    });

    it('should include Strategic business value', () => {
      expect(instructions).toContain('Strategic');
    });

    it('should have Program Context section', () => {
      expect(instructions).toContain('Program Context');
    });

    it('should use markdown format', () => {
      expect(instructions).toContain('MARKDOWN');
    });
  });

  // ==================== BEHAVIORAL PRINCIPLES ====================
  describe('Behavioral Principles', () => {
    it('should mention reference attribution', () => {
      expect(instructions).toContain('REFERENCE ATTRIBUTION');
    });

    it('should mention Curiosity Gap', () => {
      expect(instructions).toContain('Curiosity Gap');
      expect(instructions).toContain('Loewenstein');
    });

    it('should mention Authority Bias', () => {
      expect(instructions).toContain('Authority Bias');
      expect(instructions).toContain('Milgram');
    });

    it('should mention Habit Loop', () => {
      expect(instructions).toContain('Habit Loop');
      expect(instructions).toContain('Duhigg');
    });

    it('should mention Self-efficacy', () => {
      expect(instructions).toContain('Self-efficacy');
    });

    it('should mention lightweight references', () => {
      expect(instructions).toContain('lightweight');
    });
  });

  // ==================== JSON INTERPRETATION ====================
  describe('JSON Interpretation', () => {
    it('should explain how to interpret JSON', () => {
      expect(instructions).toContain('HOW TO INTERPRET THE JSON');
    });

    it('should mention current_stage', () => {
      expect(instructions).toContain('current_stage');
    });

    it('should mention target_stage', () => {
      expect(instructions).toContain('target_stage');
    });

    it('should mention progression_hint', () => {
      expect(instructions).toContain('progression_hint');
    });

    it('should mention strengths', () => {
      expect(instructions).toContain('strengths');
    });

    it('should mention growth_opportunities', () => {
      expect(instructions).toContain('growth_opportunities');
    });

    it('should mention business_value_zone', () => {
      expect(instructions).toContain('business_value_zone');
    });

    it('should mention maturity_mapping', () => {
      expect(instructions).toContain('maturity_mapping');
    });

    it('should warn against using internal fields', () => {
      expect(instructions).toContain('Do NOT expose internal fields');
    });

    it('should warn against using Gartner context', () => {
      expect(instructions).toContain('Do NOT use maturity_mapping.gartner');
    });
  });

  // ==================== RECOMMENDATION QUALITY ====================
  describe('Recommendation Quality', () => {
    it('should require connecting recommendations to behavior', () => {
      expect(instructions).toContain('RECOMMENDATION QUALITY');
    });

    it('should mention connecting to observed behavior patterns', () => {
      expect(instructions).toContain('observed behavior patterns');
    });

    it('should handle limited evidence', () => {
      expect(instructions).toContain('limited evidence');
    });

    it('should mention data gaps', () => {
      expect(instructions).toContain('data gaps');
    });
  });

  // ==================== NARRATIVE ACCURACY ====================
  describe('Narrative Accuracy', () => {
    it('should have accuracy rules', () => {
      expect(instructions).toContain('NARRATIVE ACCURACY');
    });

    it('should explain cadence wording', () => {
      expect(instructions).toContain('cadence');
    });

    it('should define ONE_OFF wording', () => {
      expect(instructions).toContain('ONE_OFF');
      expect(instructions).toContain('timely reminder');
    });

    it('should define WEEKLY/MONTHLY wording', () => {
      expect(instructions).toContain('WEEKLY');
      expect(instructions).toContain('regular reminder');
    });

    it('should have consistency check', () => {
      expect(instructions).toContain('CONSISTENCY CHECK');
    });

    it('should check cadence wording match', () => {
      expect(instructions).toContain('Cadence wording matches');
    });

    it('should check training recommendations', () => {
      expect(instructions).toContain('Training recommendations');
    });

    it('should check behavioral principle references', () => {
      expect(instructions).toContain('Behavioral principle references');
    });

    it('should use conservative language when uncertain', () => {
      expect(instructions).toContain('conservative reinforcement');
    });
  });

  // ==================== MESSAGING GUIDELINES COMPLIANCE ====================
  describe('Messaging Guidelines Compliance', () => {
    it('should list blacklist words to avoid', () => {
      expect(instructions).toContain('NEVER use');
    });

    it('should reference messaging guidelines', () => {
      expect(instructions).toContain('Messaging Guidelines');
    });

    it('should specify enterprise-safe messaging', () => {
      expect(instructions).toContain('Enterprise-Safe');
    });

    it('should NOT contain unauthorized system strings', () => {
      const forbiddenStrings = ['EMPLOYEE_MATCH', 'ASSIGNMENT_SUCCESS.TRAINING', 'ASSIGNMENT_SUCCESS.SIMULATION'];

      forbiddenStrings.forEach(str => {
        expect(instructions).not.toContain(str);
      });
    });

    it('should avoid technical jargon', () => {
      expect(instructions).toContain('No technical jargon');
    });

    it('should use short sentences', () => {
      expect(instructions).toContain('Short sentences');
    });

    it('should be scan-friendly', () => {
      expect(instructions).toContain('Scan-friendly');
    });
  });

  // ==================== TOOL CONFIGURATION ====================
  describe('Tool Configuration', () => {
    it('should have getUserInfo tool', () => {
      expect(tools.getUserInfo).toBeDefined();
    });

    it('should have getTargetGroupInfo tool', () => {
      expect(tools.getTargetGroupInfo).toBeDefined();
    });

    it('should have tool objects', () => {
      expect(typeof tools.getUserInfo).toBe('object');
      expect(typeof tools.getTargetGroupInfo).toBe('object');
    });
  });

  // ==================== BASIC STRUCTURAL VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(userInfoAgent).toHaveProperty('name');
      expect(userInfoAgent).toHaveProperty('getInstructions');
      expect(userInfoAgent).toHaveProperty('model');
      expect(userInfoAgent).toHaveProperty('listTools');
    });

    it('should be an agent instance', () => {
      expect(userInfoAgent).toBeDefined();
      expect(userInfoAgent.name).toBeTruthy();
    });
  });

  // ==================== READY TO PROCEED ====================
  describe('Ready to Proceed Section', () => {
    it('should have ready to proceed section', () => {
      expect(instructions).toContain('Ready to Proceed');
    });

    it('should ask about both options', () => {
      expect(instructions).toContain('microlearning');
      expect(instructions).toContain('phishing simulation');
    });

    it('should never ask about only one option', () => {
      expect(instructions).toContain('NEVER ask only about one option');
    });

    it('should offer both choices', () => {
      expect(instructions).toContain('Always offer both choices');
    });

    it('should use user language for question', () => {
      expect(instructions).toContain("SAME as user's current message language");
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle no email scenario', () => {
      expect(instructions).toContain('email if available');
    });

    it('should prefer email when available', () => {
      expect(instructions).toContain('Prefer **email**');
    });

    it('should handle name-only queries', () => {
      expect(instructions).toContain('fullName');
      expect(instructions).toContain('firstName');
      expect(instructions).toContain('lastName');
    });

    it('should handle group assignments', () => {
      expect(instructions).toContain('GROUP');
      expect(instructions).toContain('targetGroupResourceId');
    });

    it('should call getTargetGroupInfo for groups', () => {
      expect(instructions).toContain('getTargetGroupInfo');
    });

    it('should handle baseline reports', () => {
      expect(instructions).toContain('baseline');
    });

    it('should handle limited evidence', () => {
      expect(instructions).toContain('evidence is limited');
    });
  });

  // ==================== INSTRUCTION FORMATTING ====================
  describe('Instruction Formatting', () => {
    it('should use markdown headers', () => {
      expect(instructions).toMatch(/##\s+/);
    });

    it('should use bullet points', () => {
      expect(instructions).toContain('-');
    });

    it('should use bold formatting', () => {
      expect(instructions).toMatch(/\*\*[^*]+\*\*/);
    });

    it('should use tables', () => {
      expect(instructions).toContain('|');
    });
  });

  // ==================== CONSISTENCY ACROSS MODES ====================
  describe('Mode Consistency', () => {
    it('should clearly differentiate modes', () => {
      expect(instructions).toContain('2) ASSIGNMENT MODE');
      expect(instructions).toContain('3) REPORT MODE');
    });

    it('should explain assignment mode actions', () => {
      expect(instructions).toMatch(/ASSIGNMENT MODE[\s\S]*Action:/);
    });

    it('should explain report mode actions', () => {
      expect(instructions).toMatch(/REPORT MODE[\s\S]*Action:/);
    });

    it('should not generate report in assignment mode', () => {
      expect(instructions).toContain('Do NOT generate a report in this mode');
    });

    it('should not output JSON in report mode', () => {
      expect(instructions).toContain('Do NOT output JSON in this mode');
    });
  });
});
