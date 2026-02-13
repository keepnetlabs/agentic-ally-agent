import { describe, it, expect } from 'vitest';
import { policySummaryAgent } from './policy-summary-agent';
import { AGENT_NAMES } from '../constants';

describe('Policy Summary Agent', () => {
  describe('Agent Configuration', () => {
    it('should be properly instantiated', () => {
      expect(policySummaryAgent).toBeDefined();
    });

    it('should have the correct name', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
    });

    it('should have name as string', () => {
      expect(typeof policySummaryAgent.name).toBe('string');
      expect(policySummaryAgent.name.length).toBeGreaterThan(0);
    });

    it('should have tools configured', () => {
      expect(policySummaryAgent.tools).toHaveProperty('summarizePolicy');
    });

    it('should have only summarizePolicy tool', () => {
      const toolKeys = Object.keys(policySummaryAgent.tools);
      expect(toolKeys).toHaveLength(1);
      expect(toolKeys[0]).toBe('summarizePolicy');
    });

    it('should have summarizePolicy as object', () => {
      expect(typeof policySummaryAgent.tools.summarizePolicy).toBe('object');
    });

    it('should have description-like mission in instructions', () => {
      expect(policySummaryAgent.instructions).toContain('analyze company security policies');
    });

    it('should have instructions as string', () => {
      expect(typeof policySummaryAgent.instructions).toBe('string');
    });

    it('should have non-empty instructions', () => {
      expect(policySummaryAgent.instructions.length).toBeGreaterThan(100);
    });

    it('should have model configured', () => {
      expect(policySummaryAgent.model).toBeDefined();
    });
  });

  describe('Agent Instructions', () => {
    const instructions = policySummaryAgent.instructions;

    it('should define role as Policy Intelligence Specialist', () => {
      expect(instructions).toContain('Policy Intelligence Specialist');
    });

    it('should have role definition with bold formatting', () => {
      expect(instructions).toContain('**Policy Intelligence Specialist**');
    });

    it('should include MISSION section', () => {
      expect(instructions).toContain('MISSION');
      expect(instructions).toContain('Translate complex policy legalese');
    });

    it('should have mission with emoji marker', () => {
      expect(instructions).toContain('🎯 **MISSION:**');
    });

    it('should include mission to align with user language', () => {
      expect(instructions).toContain("ALWAYS align with the user's language");
    });

    it('should mention summarizePolicy tool', () => {
      expect(instructions).toContain('summarizePolicy');
    });

    it('should mention tool usage in mission', () => {
      expect(instructions).toContain("Use the 'summarizePolicy' tool");
    });

    it('should have NO HALLUCINATIONS section', () => {
      expect(instructions).toContain('NO HALLUCINATIONS');
      expect(instructions).toContain("couldn't find a specific policy");
      expect(instructions).toContain('Do NOT invent rules');
    });

    it('should have no hallucinations with emoji marker', () => {
      expect(instructions).toContain('🚫 **NO HALLUCINATIONS:**');
    });

    it('should specify behavior when policy not found', () => {
      expect(instructions).toContain('No policy found');
      expect(instructions).toContain("I couldn't find a specific policy");
    });

    it('should have LANGUAGE RULES section', () => {
      expect(instructions).toContain('LANGUAGE RULES');
      expect(instructions).toContain("Match the user's CURRENT message language");
      expect(instructions).toContain('Respond in Turkish');
      expect(instructions).toContain('Respond in English');
    });

    it('should have language rules with emoji marker', () => {
      expect(instructions).toContain('🌍 **LANGUAGE RULES:**');
    });

    it('should define INTERACTION LANGUAGE', () => {
      expect(instructions).toContain('INTERACTION LANGUAGE');
    });

    it('should have Turkish language rule', () => {
      expect(instructions).toContain('User writes in Turkish');
      expect(instructions).toContain('Respond in Turkish');
    });

    it('should have English language rule', () => {
      expect(instructions).toContain('User writes in English');
      expect(instructions).toContain('Respond in English');
    });

    it('should handle mixed language', () => {
      expect(instructions).toContain('Mixed');
      expect(instructions).toContain('dominant language');
    });

    it('should have WORKFLOW section', () => {
      expect(instructions).toContain('WORKFLOW');
      expect(instructions).toContain('Listen');
      expect(instructions).toContain('IMMEDIATELY Call Tool');
      expect(instructions).toContain('Analyze Tool Output');
      expect(instructions).toContain('Respond');
    });

    it('should have workflow with emoji marker', () => {
      expect(instructions).toContain('📋 **WORKFLOW:**');
    });

    it('should have workflow as numbered list', () => {
      expect(instructions).toContain("1. **Listen** to the user's question");
      expect(instructions).toContain('2. **IMMEDIATELY Call Tool**');
      expect(instructions).toContain('3. **Analyze Tool Output:**');
      expect(instructions).toContain('4. **Respond** using the STRICT HTML FORMAT');
    });

    it('should mention query parameter in workflow', () => {
      expect(instructions).toContain('query');
      expect(instructions).toContain("User's exact natural language question");
    });

    it('should mention focusArea parameter in workflow', () => {
      expect(instructions).toContain('focusArea');
      expect(instructions).toContain('Extracted keyword');
    });

    it('should include tool call examples', () => {
      expect(instructions).toContain('Şifre kuralları neler?');
      expect(instructions).toContain('focusArea="password"');
    });

    it('should include focusArea examples', () => {
      expect(instructions).toContain('password');
      expect(instructions).toContain('remote work');
      expect(instructions).toContain('phishing');
    });

    it('should define RESPONSE FORMAT', () => {
      expect(instructions).toContain('RESPONSE FORMAT (Strict HTML)');
      expect(instructions).toContain('SINGLE block of HTML');
      expect(instructions).toContain('<strong>{Topic_Summary_Header}</strong>');
      expect(instructions).toContain('<ul>');
    });

    it('should have response format with emoji marker', () => {
      expect(instructions).toContain('✅ **RESPONSE FORMAT (Strict HTML):**');
    });

    it('should prohibit markdown in response', () => {
      expect(instructions).toContain('Do not use markdown');
    });

    it('should prohibit plain text lists', () => {
      expect(instructions).toContain('plain text lists');
    });

    it('should include HTML template structure', () => {
      expect(instructions).toContain('TEMPLATE');
      expect(instructions).toContain('<strong>{Topic_Summary_Header}</strong><br>');
      expect(instructions).toContain('{Verification_Line}<br>');
      expect(instructions).toContain('<strong>{Key_Points_Header}:</strong>');
    });

    it('should include HTML list structure', () => {
      expect(instructions).toContain('<ul>');
      expect(instructions).toContain('<li>{Point_1}</li>');
      expect(instructions).toContain('<li>{Point_2}</li>');
      expect(instructions).toContain('<li>{Point_3}</li>');
      expect(instructions).toContain('</ul>');
    });

    it('should include recommendation in template', () => {
      expect(instructions).toContain('<strong>{Recommendation_Header}:</strong>');
      expect(instructions).toContain('{Actionable_Advice}');
    });

    it('should have Variable Dictionary', () => {
      expect(instructions).toContain('Variable Dictionary');
    });

    it('should define Topic_Summary_Header variable', () => {
      expect(instructions).toContain('{Topic_Summary_Header}');
      expect(instructions).toContain('Policy Summary: Passwords');
    });

    it('should define Verification_Line variable', () => {
      expect(instructions).toContain('{Verification_Line}');
      expect(instructions).toContain('Based on the');
      expect(instructions).toContain('Information Security Standard');
    });

    it('should define Key_Points_Header variable', () => {
      expect(instructions).toContain('{Key_Points_Header}');
      expect(instructions).toContain('Key Takeaways');
      expect(instructions).toContain('Önemli Noktalar');
    });

    it('should define Recommendation_Header variable', () => {
      expect(instructions).toContain('{Recommendation_Header}');
      expect(instructions).toContain('Action Required');
      expect(instructions).toContain('Ne Yapmalısınız?');
    });

    it('should include CRITICAL RULES', () => {
      expect(instructions).toContain('CRITICAL RULES');
      expect(instructions).toContain('conciseness');
      expect(instructions).toContain('clarity');
      expect(instructions).toContain('safety');
      expect(instructions).toContain('Security Team');
    });

    it('should have critical rules with emoji marker', () => {
      expect(instructions).toContain('⚠️ **CRITICAL RULES:**');
    });

    it('should define conciseness rule', () => {
      expect(instructions).toContain('**conciseness:**');
      expect(instructions).toContain('Limit lists to 3-5');
    });

    it('should define clarity rule', () => {
      expect(instructions).toContain('**clarity:**');
      expect(instructions).toContain('Use active voice');
      expect(instructions).toContain('You must...');
    });

    it('should define safety rule', () => {
      expect(instructions).toContain('**safety:**');
      expect(instructions).toContain('If policy is ambiguous');
      expect(instructions).toContain('recommend contacting');
    });

    it('should mention Security Team in safety rule', () => {
      expect(instructions).toContain('Security Team');
    });
  });

  describe('Tool Configuration', () => {
    it('should have tools object', () => {
      expect(policySummaryAgent.tools).toBeDefined();
      expect(typeof policySummaryAgent.tools).toBe('object');
    });

    it('should have summarizePolicy tool', () => {
      expect(policySummaryAgent.tools.summarizePolicy).toBeDefined();
    });

    it('should only have one tool', () => {
      const toolCount = Object.keys(policySummaryAgent.tools).length;
      expect(toolCount).toBe(1);
    });

    it('should not have getUserInfo tool', () => {
      expect(policySummaryAgent.tools).not.toHaveProperty('getUserInfo');
    });

    it('should not have getTargetGroupInfo tool', () => {
      expect(policySummaryAgent.tools).not.toHaveProperty('getTargetGroupInfo');
    });
  });

  describe('Model Configuration', () => {
    it('should have model property', () => {
      expect(policySummaryAgent.model).toBeDefined();
    });

    it('should use light agent model', () => {
      // Model is configured via getLightAgentModel()
      expect(policySummaryAgent.model).toBeDefined();
    });
  });

  describe('Instructions Structure', () => {
    const instructions = policySummaryAgent.instructions;

    it('should have all major sections', () => {
      expect(instructions).toContain('Policy Intelligence Specialist');
      expect(instructions).toContain('MISSION');
      expect(instructions).toContain('NO HALLUCINATIONS');
      expect(instructions).toContain('LANGUAGE RULES');
      expect(instructions).toContain('WORKFLOW');
      expect(instructions).toContain('RESPONSE FORMAT');
      expect(instructions).toContain('CRITICAL RULES');
    });

    it('should have sections in order', () => {
      const roleIndex = instructions.indexOf('Policy Intelligence Specialist');
      const missionIndex = instructions.indexOf('MISSION');
      const noHallucinationIndex = instructions.indexOf('NO HALLUCINATIONS');
      const languageIndex = instructions.indexOf('LANGUAGE RULES');
      const workflowIndex = instructions.indexOf('WORKFLOW');
      const responseIndex = instructions.indexOf('RESPONSE FORMAT');
      const criticalIndex = instructions.indexOf('CRITICAL RULES');

      expect(roleIndex).toBeLessThan(missionIndex);
      expect(missionIndex).toBeLessThan(noHallucinationIndex);
      expect(noHallucinationIndex).toBeLessThan(languageIndex);
      expect(languageIndex).toBeLessThan(workflowIndex);
      expect(workflowIndex).toBeLessThan(responseIndex);
      expect(responseIndex).toBeLessThan(criticalIndex);
    });

    it('should use emoji markers for sections', () => {
      expect(instructions).toContain('🎯');
      expect(instructions).toContain('🚫');
      expect(instructions).toContain('🌍');
      expect(instructions).toContain('📋');
      expect(instructions).toContain('✅');
      expect(instructions).toContain('⚠️');
    });

    it('should use bold formatting for headers', () => {
      expect(instructions).toContain('**MISSION:**');
      expect(instructions).toContain('**NO HALLUCINATIONS:**');
      expect(instructions).toContain('**LANGUAGE RULES:**');
      expect(instructions).toContain('**WORKFLOW:**');
      expect(instructions).toContain('**RESPONSE FORMAT (Strict HTML):**');
      expect(instructions).toContain('**CRITICAL RULES:**');
    });
  });

  describe('Workflow Instructions', () => {
    const instructions = policySummaryAgent.instructions;

    it('should have 4 workflow steps', () => {
      expect(instructions).toContain('1. **Listen**');
      expect(instructions).toContain('2. **IMMEDIATELY Call Tool**');
      expect(instructions).toContain('3. **Analyze Tool Output:**');
      expect(instructions).toContain('4. **Respond**');
    });

    it('should emphasize immediate tool calling', () => {
      expect(instructions).toContain('IMMEDIATELY Call Tool');
    });

    it('should describe tool parameters', () => {
      expect(instructions).toContain('query');
      expect(instructions).toContain('focusArea');
    });

    it('should provide parameter descriptions', () => {
      expect(instructions).toContain("User's exact natural language question");
      expect(instructions).toContain('Extracted keyword');
    });

    it('should include concrete example', () => {
      expect(instructions).toContain('Example:');
      expect(instructions).toContain('Şifre kuralları neler?');
    });

    it('should show tool call format', () => {
      expect(instructions).toContain('query="Şifre kuralları neler?"');
      expect(instructions).toContain('focusArea="password"');
    });
  });

  describe('Response Format Instructions', () => {
    const instructions = policySummaryAgent.instructions;

    it('should require single HTML block', () => {
      expect(instructions).toContain('SINGLE block of HTML');
    });

    it('should prohibit markdown formatting', () => {
      expect(instructions).toContain('Do not use markdown');
    });

    it('should require HTML template usage', () => {
      expect(instructions).toContain('TEMPLATE');
      expect(instructions).toContain('Localize labels');
    });

    it('should include br tags for spacing', () => {
      expect(instructions).toContain('<br>');
    });

    it('should include strong tags for emphasis', () => {
      expect(instructions).toContain('<strong>');
    });

    it('should include ul/li tags for lists', () => {
      expect(instructions).toContain('<ul>');
      expect(instructions).toContain('<li>');
    });

    it('should define all template variables', () => {
      expect(instructions).toContain('{Topic_Summary_Header}');
      expect(instructions).toContain('{Verification_Line}');
      expect(instructions).toContain('{Key_Points_Header}');
      expect(instructions).toContain('{Recommendation_Header}');
      expect(instructions).toContain('{Actionable_Advice}');
    });

    it('should provide Turkish translations', () => {
      expect(instructions).toContain('Önemli Noktalar');
      expect(instructions).toContain('Ne Yapmalısınız?');
    });
  });

  describe('Language Rules', () => {
    const instructions = policySummaryAgent.instructions;

    it('should define language matching behavior', () => {
      expect(instructions).toContain("Match the user's CURRENT message language");
    });

    it('should specify Turkish handling', () => {
      expect(instructions).toContain('User writes in Turkish');
      expect(instructions).toContain('Respond in Turkish');
    });

    it('should specify English handling', () => {
      expect(instructions).toContain('User writes in English');
      expect(instructions).toContain('Respond in English');
    });

    it('should handle mixed language scenarios', () => {
      expect(instructions).toContain('Mixed');
      expect(instructions).toContain('dominant language');
    });

    it('should emphasize interaction language', () => {
      expect(instructions).toContain('INTERACTION LANGUAGE');
    });
  });

  describe('Critical Rules', () => {
    const instructions = policySummaryAgent.instructions;

    it('should have conciseness requirement', () => {
      expect(instructions).toContain('conciseness');
      expect(instructions).toContain('3-5');
    });

    it('should have clarity requirement', () => {
      expect(instructions).toContain('clarity');
      expect(instructions).toContain('active voice');
    });

    it('should have safety requirement', () => {
      expect(instructions).toContain('safety');
      expect(instructions).toContain('ambiguous');
    });

    it('should recommend Security Team contact', () => {
      expect(instructions).toContain('Security Team');
    });

    it('should prefer active voice over passive', () => {
      expect(instructions).toContain('You must...');
      expect(instructions).toContain('It is required...');
    });
  });

  describe('Edge Cases', () => {
    it('should handle agent with all properties', () => {
      expect(policySummaryAgent.name).toBeDefined();
      expect(policySummaryAgent.instructions).toBeDefined();
      expect(policySummaryAgent.model).toBeDefined();
      expect(policySummaryAgent.tools).toBeDefined();
    });

    it('should have non-empty name', () => {
      expect(policySummaryAgent.name.trim().length).toBeGreaterThan(0);
    });

    it('should have substantial instructions', () => {
      expect(policySummaryAgent.instructions.length).toBeGreaterThan(500);
    });

    it('should have valid tools object', () => {
      expect(policySummaryAgent.tools).not.toBeNull();
      expect(Array.isArray(policySummaryAgent.tools)).toBe(false);
    });
  });

  describe('HTML Format Validation', () => {
    const instructions = policySummaryAgent.instructions;

    it('should include all required HTML tags', () => {
      expect(instructions).toContain('<strong>');
      expect(instructions).toContain('<br>');
      expect(instructions).toContain('<ul>');
      expect(instructions).toContain('<li>');
    });

    it('should show closing tags', () => {
      expect(instructions).toContain('</strong>');
      expect(instructions).toContain('</li>');
      expect(instructions).toContain('</ul>');
    });

    it('should include multiple list items', () => {
      expect(instructions).toContain('{Point_1}');
      expect(instructions).toContain('{Point_2}');
      expect(instructions).toContain('{Point_3}');
    });

    it('should structure template properly', () => {
      expect(instructions).toContain('{Topic_Summary_Header}</strong><br>');
      expect(instructions).toContain('{Verification_Line}<br>');
      expect(instructions).toContain('{Key_Points_Header}:</strong>');
    });
  });

  describe('Tool Examples', () => {
    const instructions = policySummaryAgent.instructions;

    it('should include Turkish query example', () => {
      expect(instructions).toContain('Şifre kuralları neler?');
    });

    it('should map Turkish to focusArea', () => {
      expect(instructions).toContain('focusArea="password"');
    });

    it('should list multiple focusArea examples', () => {
      expect(instructions).toContain('password');
      expect(instructions).toContain('remote work');
      expect(instructions).toContain('phishing');
    });
  });

  describe('No Hallucination Rules', () => {
    const instructions = policySummaryAgent.instructions;

    it('should define no policy found behavior', () => {
      expect(instructions).toContain('No policy found');
    });

    it('should provide exact response for no policy', () => {
      expect(instructions).toContain("I couldn't find a specific policy");
    });

    it('should explicitly prohibit inventing rules', () => {
      expect(instructions).toContain('Do NOT invent rules');
    });

    it('should require tool-based facts', () => {
      expect(instructions).toContain("Use the 'summarizePolicy' tool to fetch the absolute truth");
    });
  });

  describe('Integration Validation', () => {
    it('should reference correct constant for name', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
    });

    it('should be exportable', () => {
      expect(typeof policySummaryAgent).toBe('object');
      expect(policySummaryAgent).not.toBeNull();
    });

    it('should have complete agent structure', () => {
      const requiredProps = ['name', 'instructions', 'model', 'tools'];
      requiredProps.forEach(prop => {
        expect(policySummaryAgent).toHaveProperty(prop);
      });
    });
  });
});
