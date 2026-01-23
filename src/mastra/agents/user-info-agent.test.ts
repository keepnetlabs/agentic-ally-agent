import { describe, it, expect } from 'vitest';
import { userInfoAgent } from './user-info-agent';
import { AGENT_NAMES } from '../constants';

/**
 * User Info Agent - Comprehensive Test Suite
 */
describe('User Info Agent', () => {
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
      expect(userInfoAgent.instructions).toBeDefined();
      expect(typeof userInfoAgent.instructions).toBe('string');
    });

    it('should have model property', () => {
      expect(userInfoAgent.model).toBeDefined();
    });

    it('should have tools configured', () => {
      expect(userInfoAgent.tools).toBeDefined();
      expect(Object.keys(userInfoAgent.tools)).toContain('getUserInfo');
      expect(Object.keys(userInfoAgent.tools)).toContain('getTargetGroupInfo');
    });

    it('should have exactly 2 tools', () => {
      expect(Object.keys(userInfoAgent.tools)).toHaveLength(2);
    });
  });

  // ==================== INSTRUCTION QUALITY TESTS ====================
  describe('Agent Instructions', () => {
    it('should have substantial content', () => {
      expect(userInfoAgent.instructions).toBeDefined();
      expect(userInfoAgent.instructions.length).toBeGreaterThan(500);
    });

    it('should be very detailed', () => {
      expect(userInfoAgent.instructions.length).toBeGreaterThan(2000);
    });

    it('should contain the executive expert persona', () => {
      expect(userInfoAgent.instructions).toContain('Executive Security Communications Expert');
    });

    it('should describe role clearly', () => {
      expect(userInfoAgent.instructions).toContain('YOUR ROLE');
    });

    it('should have the language rule', () => {
      expect(userInfoAgent.instructions).toContain('LANGUAGE RULE');
      expect(userInfoAgent.instructions).toContain('Match user\'s exact language');
    });

    it('should describe the available modes', () => {
      expect(userInfoAgent.instructions).toContain('ASSIGNMENT MODE');
      expect(userInfoAgent.instructions).toContain('REPORT MODE');
    });

    it('should explain mode selection', () => {
      expect(userInfoAgent.instructions).toContain('MODE SELECTION');
    });

    it('should have writing style guidelines', () => {
      expect(userInfoAgent.instructions).toContain('WRITING STYLE');
    });

    it('should have tone guidelines', () => {
      expect(userInfoAgent.instructions).toContain('TONE');
    });

    it('should specify executive communication style', () => {
      expect(userInfoAgent.instructions).toContain('Executive');
    });

    it('should emphasize non-blaming approach', () => {
      expect(userInfoAgent.instructions).toContain('non-blaming');
    });

    it('should mention growth-oriented language', () => {
      expect(userInfoAgent.instructions).toContain('Growth-oriented');
    });
  });

  // ==================== MODE INSTRUCTIONS ====================
  describe('Mode Instructions', () => {
    it('should explain ASSIGNMENT MODE triggers', () => {
      expect(userInfoAgent.instructions).toContain('Assign this');
      expect(userInfoAgent.instructions).toContain('Assign to');
    });

    it('should explain REPORT MODE triggers', () => {
      expect(userInfoAgent.instructions).toContain('Who is');
      expect(userInfoAgent.instructions).toContain('Analyze');
    });

    it('should mention skipAnalysis flag', () => {
      expect(userInfoAgent.instructions).toContain('skipAnalysis: true');
    });

    it('should explain when to use skipAnalysis', () => {
      expect(userInfoAgent.instructions).toContain('only need the ID');
    });

    it('should mention confirmation question in ASSIGNMENT MODE', () => {
      expect(userInfoAgent.instructions).toContain('confirmation question');
    });

    it('should specify one-page report requirement', () => {
      expect(userInfoAgent.instructions).toContain('ONE page');
    });
  });

  // ==================== LANGUAGE SUPPORT ====================
  describe('Language Support', () => {
    it('should require matching user language', () => {
      expect(userInfoAgent.instructions).toContain('Match user\'s exact language');
    });

    it('should check current message language', () => {
      expect(userInfoAgent.instructions).toContain('current message');
    });

    it('should handle English example', () => {
      expect(userInfoAgent.instructions).toContain('Analyze...');
      expect(userInfoAgent.instructions).toContain('English');
    });

    it('should handle Turkish example', () => {
      expect(userInfoAgent.instructions).toContain('Analiz et...');
      expect(userInfoAgent.instructions).toContain('Turkish');
    });

    it('should handle mixed language messages', () => {
      expect(userInfoAgent.instructions).toContain('dominant language');
    });

    it('should apply language to all report sections', () => {
      expect(userInfoAgent.instructions).toContain('ALL report sections');
    });
  });

  // ==================== REPORT STRUCTURE ====================
  describe('Report Structure', () => {
    it('should define Behavioral Resilience Report title', () => {
      expect(userInfoAgent.instructions).toContain('Behavioral Resilience Report');
    });

    it('should include ENISA alignment', () => {
      expect(userInfoAgent.instructions).toContain('ENISA');
    });

    it('should have Strengths section', () => {
      expect(userInfoAgent.instructions).toContain('Strengths');
    });

    it('should have Growth Opportunities section', () => {
      expect(userInfoAgent.instructions).toContain('Growth Opportunities');
    });

    it('should have AI-Recommended Next Steps section', () => {
      expect(userInfoAgent.instructions).toContain('AI-Recommended Next Steps');
    });

    it('should have Business Value section', () => {
      expect(userInfoAgent.instructions).toContain('Business Value');
    });

    it('should have References section', () => {
      expect(userInfoAgent.instructions).toContain('References');
    });

    it('should include simulation details', () => {
      expect(userInfoAgent.instructions).toContain('Next Simulation');
    });

    it('should include microlearning details', () => {
      expect(userInfoAgent.instructions).toContain('Next Microlearning');
    });

    it('should include nudge details', () => {
      expect(userInfoAgent.instructions).toContain('Nudge');
    });

    it('should mention NIST Phish Scale', () => {
      expect(userInfoAgent.instructions).toContain('NIST Phish Scale');
    });

    it('should include Operational business value', () => {
      expect(userInfoAgent.instructions).toContain('Operational');
    });

    it('should include Strategic business value', () => {
      expect(userInfoAgent.instructions).toContain('Strategic');
    });

    it('should have Program Context section', () => {
      expect(userInfoAgent.instructions).toContain('Program Context');
    });

    it('should use markdown format', () => {
      expect(userInfoAgent.instructions).toContain('MARKDOWN');
    });
  });

  // ==================== BEHAVIORAL PRINCIPLES ====================
  describe('Behavioral Principles', () => {
    it('should mention reference attribution', () => {
      expect(userInfoAgent.instructions).toContain('REFERENCE ATTRIBUTION');
    });

    it('should mention Curiosity Gap', () => {
      expect(userInfoAgent.instructions).toContain('Curiosity Gap');
      expect(userInfoAgent.instructions).toContain('Loewenstein');
    });

    it('should mention Authority Bias', () => {
      expect(userInfoAgent.instructions).toContain('Authority Bias');
      expect(userInfoAgent.instructions).toContain('Milgram');
    });

    it('should mention Habit Loop', () => {
      expect(userInfoAgent.instructions).toContain('Habit Loop');
      expect(userInfoAgent.instructions).toContain('Duhigg');
    });

    it('should mention Self-efficacy', () => {
      expect(userInfoAgent.instructions).toContain('Self-efficacy');
    });

    it('should mention lightweight references', () => {
      expect(userInfoAgent.instructions).toContain('lightweight');
    });
  });

  // ==================== JSON INTERPRETATION ====================
  describe('JSON Interpretation', () => {
    it('should explain how to interpret JSON', () => {
      expect(userInfoAgent.instructions).toContain('HOW TO INTERPRET THE JSON');
    });

    it('should mention current_stage', () => {
      expect(userInfoAgent.instructions).toContain('current_stage');
    });

    it('should mention target_stage', () => {
      expect(userInfoAgent.instructions).toContain('target_stage');
    });

    it('should mention progression_hint', () => {
      expect(userInfoAgent.instructions).toContain('progression_hint');
    });

    it('should mention strengths', () => {
      expect(userInfoAgent.instructions).toContain('strengths');
    });

    it('should mention growth_opportunities', () => {
      expect(userInfoAgent.instructions).toContain('growth_opportunities');
    });

    it('should mention business_value_zone', () => {
      expect(userInfoAgent.instructions).toContain('business_value_zone');
    });

    it('should mention maturity_mapping', () => {
      expect(userInfoAgent.instructions).toContain('maturity_mapping');
    });

    it('should warn against using internal fields', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT expose internal fields');
    });

    it('should warn against using Gartner context', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT use maturity_mapping.gartner');
    });
  });

  // ==================== RECOMMENDATION QUALITY ====================
  describe('Recommendation Quality', () => {
    it('should require connecting recommendations to behavior', () => {
      expect(userInfoAgent.instructions).toContain('RECOMMENDATION QUALITY');
    });

    it('should mention connecting to observed behavior patterns', () => {
      expect(userInfoAgent.instructions).toContain('observed behavior patterns');
    });

    it('should handle limited evidence', () => {
      expect(userInfoAgent.instructions).toContain('limited evidence');
    });

    it('should mention data gaps', () => {
      expect(userInfoAgent.instructions).toContain('data gaps');
    });
  });

  // ==================== NARRATIVE ACCURACY ====================
  describe('Narrative Accuracy', () => {
    it('should have accuracy rules', () => {
      expect(userInfoAgent.instructions).toContain('NARRATIVE ACCURACY');
    });

    it('should explain cadence wording', () => {
      expect(userInfoAgent.instructions).toContain('cadence');
    });

    it('should define ONE_OFF wording', () => {
      expect(userInfoAgent.instructions).toContain('ONE_OFF');
      expect(userInfoAgent.instructions).toContain('timely reminder');
    });

    it('should define WEEKLY/MONTHLY wording', () => {
      expect(userInfoAgent.instructions).toContain('WEEKLY');
      expect(userInfoAgent.instructions).toContain('regular reminder');
    });

    it('should have consistency check', () => {
      expect(userInfoAgent.instructions).toContain('CONSISTENCY CHECK');
    });

    it('should check cadence wording match', () => {
      expect(userInfoAgent.instructions).toContain('Cadence wording matches');
    });

    it('should check training recommendations', () => {
      expect(userInfoAgent.instructions).toContain('Training recommendations');
    });

    it('should check behavioral principle references', () => {
      expect(userInfoAgent.instructions).toContain('Behavioral principle references');
    });

    it('should use conservative language when uncertain', () => {
      expect(userInfoAgent.instructions).toContain('conservative reinforcement');
    });
  });

  // ==================== MESSAGING GUIDELINES COMPLIANCE ====================
  describe('Messaging Guidelines Compliance', () => {
    it('should list blacklist words to avoid', () => {
      expect(userInfoAgent.instructions).toContain('NEVER use');
    });

    it('should reference messaging guidelines', () => {
      expect(userInfoAgent.instructions).toContain('Messaging Guidelines');
    });

    it('should specify enterprise-safe messaging', () => {
      expect(userInfoAgent.instructions).toContain('Enterprise-Safe');
    });

    it('should NOT contain unauthorized system strings', () => {
      const forbiddenStrings = [
        'EMPLOYEE_MATCH',
        'ASSIGNMENT_SUCCESS.TRAINING',
        'ASSIGNMENT_SUCCESS.SIMULATION',
      ];

      forbiddenStrings.forEach((str) => {
        expect(userInfoAgent.instructions).not.toContain(str);
      });
    });

    it('should avoid technical jargon', () => {
      expect(userInfoAgent.instructions).toContain('No technical jargon');
    });

    it('should use short sentences', () => {
      expect(userInfoAgent.instructions).toContain('Short sentences');
    });

    it('should be scan-friendly', () => {
      expect(userInfoAgent.instructions).toContain('Scan-friendly');
    });
  });

  // ==================== TOOL CONFIGURATION ====================
  describe('Tool Configuration', () => {
    it('should have getUserInfo tool', () => {
      expect(userInfoAgent.tools.getUserInfo).toBeDefined();
    });

    it('should have getTargetGroupInfo tool', () => {
      expect(userInfoAgent.tools.getTargetGroupInfo).toBeDefined();
    });

    it('should have tool objects', () => {
      expect(typeof userInfoAgent.tools.getUserInfo).toBe('object');
      expect(typeof userInfoAgent.tools.getTargetGroupInfo).toBe('object');
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

    it('should be an agent instance', () => {
      expect(userInfoAgent).toBeDefined();
      expect(userInfoAgent.name).toBeTruthy();
    });
  });

  // ==================== READY TO PROCEED ====================
  describe('Ready to Proceed Section', () => {
    it('should have ready to proceed section', () => {
      expect(userInfoAgent.instructions).toContain('Ready to Proceed');
    });

    it('should ask about both options', () => {
      expect(userInfoAgent.instructions).toContain('microlearning');
      expect(userInfoAgent.instructions).toContain('phishing simulation');
    });

    it('should never ask about only one option', () => {
      expect(userInfoAgent.instructions).toContain('NEVER ask only about one option');
    });

    it('should offer both choices', () => {
      expect(userInfoAgent.instructions).toContain('Always offer both choices');
    });

    it('should use user language for question', () => {
      expect(userInfoAgent.instructions).toContain('SAME as user\'s current message language');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle no email scenario', () => {
      expect(userInfoAgent.instructions).toContain('email if available');
    });

    it('should prefer email when available', () => {
      expect(userInfoAgent.instructions).toContain('Prefer **email**');
    });

    it('should handle name-only queries', () => {
      expect(userInfoAgent.instructions).toContain('fullName');
      expect(userInfoAgent.instructions).toContain('firstName');
      expect(userInfoAgent.instructions).toContain('lastName');
    });

    it('should handle group assignments', () => {
      expect(userInfoAgent.instructions).toContain('GROUP');
      expect(userInfoAgent.instructions).toContain('targetGroupResourceId');
    });

    it('should call getTargetGroupInfo for groups', () => {
      expect(userInfoAgent.instructions).toContain('getTargetGroupInfo');
    });

    it('should handle baseline reports', () => {
      expect(userInfoAgent.instructions).toContain('baseline');
    });

    it('should handle limited evidence', () => {
      expect(userInfoAgent.instructions).toContain('evidence is limited');
    });
  });

  // ==================== INSTRUCTION FORMATTING ====================
  describe('Instruction Formatting', () => {
    it('should use markdown headers', () => {
      expect(userInfoAgent.instructions).toMatch(/##\s+/);
    });

    it('should use bullet points', () => {
      expect(userInfoAgent.instructions).toContain('-');
    });

    it('should use bold formatting', () => {
      expect(userInfoAgent.instructions).toMatch(/\*\*[^*]+\*\*/);
    });

    it('should use tables', () => {
      expect(userInfoAgent.instructions).toContain('|');
    });
  });

  // ==================== CONSISTENCY ACROSS MODES ====================
  describe('Mode Consistency', () => {
    it('should clearly differentiate modes', () => {
      expect(userInfoAgent.instructions).toContain('1) ASSIGNMENT MODE');
      expect(userInfoAgent.instructions).toContain('2) REPORT MODE');
    });

    it('should explain assignment mode actions', () => {
      expect(userInfoAgent.instructions).toMatch(/ASSIGNMENT MODE[\s\S]*Action:/);
    });

    it('should explain report mode actions', () => {
      expect(userInfoAgent.instructions).toMatch(/REPORT MODE[\s\S]*Action:/);
    });

    it('should not generate report in assignment mode', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT generate a report in this mode');
    });

    it('should not output JSON in report mode', () => {
      expect(userInfoAgent.instructions).toContain('Do NOT output JSON in this mode');
    });
  });
});
