import { describe, it, expect } from 'vitest';
import { companySearchAgent } from './company-search-agent';
import { CS_AGENT_NAMES, CS_AGENT_IDS } from './cs-constants';
import '../../../__tests__/setup';

describe('CompanySearchAgent', () => {
  describe('agent configuration', () => {
    it('should have correct agent ID', () => {
      expect(companySearchAgent.id).toBe(CS_AGENT_IDS.COMPANY_SEARCH);
    });

    it('should have correct agent name', () => {
      expect(companySearchAgent.name).toBe(CS_AGENT_NAMES.COMPANY_SEARCH);
    });

    it('should be properly instantiated with tools in definition', () => {
      expect(companySearchAgent).toBeDefined();
      expect(companySearchAgent.id).toBeTruthy();
      expect(companySearchAgent.name).toBeTruthy();
    });
  });

  describe('instructions', () => {
    it('should include CURRENT message language rule', async () => {
      const instructions = await companySearchAgent.getInstructions();
      expect(instructions).toContain('CURRENT message');
    });

    it('should include filter reference for structured queries', async () => {
      const instructions = await companySearchAgent.getInstructions();
      expect(instructions).toContain('CompanyName');
      expect(instructions).toContain('IndustryResourceId');
      expect(instructions).toContain('LicenseTypeResourceId');
    });

    it('should include field definitions to prevent confusion', async () => {
      const instructions = await companySearchAgent.getInstructions();
      expect(instructions).toContain('numberOfUsers');
      expect(instructions).toContain('targetUserCount');
      expect(instructions).toContain('monthlyActiveUserCount');
    });

    it('should include semantic context tag instructions', async () => {
      const instructions = await companySearchAgent.getInstructions();
      expect(instructions).toContain('[Company Selected');
      expect(instructions).toContain('companyResourceId');
    });

    it('should include no-hallucination rule', async () => {
      const instructions = await companySearchAgent.getInstructions();
      expect(instructions).toContain('No hallucination');
    });
  });
});
