import { describe, it, expect } from 'vitest';
import { buildPolicyContextBlock, buildPolicySystemPrompt, buildPolicyScenePrompt } from './policy-context-builder';

/**
 * Test suite for Policy Context Builder
 * Tests policy context formatting for AI prompt integration
 */
describe('Policy Context Builder', () => {
  const samplePolicy = 'Company must comply with GDPR. All data handling must be secure.';

  describe('buildPolicyContextBlock', () => {
    describe('Input Validation', () => {
      it('should return empty string for undefined policy', () => {
        const result = buildPolicyContextBlock(undefined, 'system');
        expect(result).toBe('');
      });

      it('should return empty string for empty policy', () => {
        const result = buildPolicyContextBlock('', 'system');
        expect(result).toBe('');
      });

      it('should return empty string for whitespace-only policy', () => {
        const result = buildPolicyContextBlock('   ', 'system');
        expect(result).toBe('');
      });

      it('should accept valid policy and return non-empty string', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).not.toBe('');
        expect(typeof result).toBe('string');
      });
    });

    describe('System Format', () => {
      it('should include critical marker for system format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).toContain('🔴 CRITICAL - COMPANY POLICIES (HIGHEST PRIORITY):');
      });

      it('should include policy content for system format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).toContain(samplePolicy);
      });

      it('should include reference instruction for system format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).toContain('Ensure ALL content generation complies');
      });

      it('should include mandatory guidelines text for system format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).toContain('POLICY HANDLING RULES (MANDATORY)');
      });
    });

    describe('Scene Format', () => {
      it('should include critical marker for scene format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'scene');
        expect(result).toContain('🔴 CRITICAL - COMPANY POLICIES (HIGHEST PRIORITY):');
      });

      it('should include policy content for scene format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'scene');
        expect(result).toContain(samplePolicy);
      });

      it('should include generate instruction for scene format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'scene');
        expect(result).toContain('Generate scene content that is strictly policy-compliant');
      });

      it('should include every section reference for scene format', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'scene');
        expect(result).toContain('<COMPANY_POLICIES>');
      });
    });

    describe('Default Format', () => {
      it('should use system as default format when not specified', () => {
        const result1 = buildPolicyContextBlock(samplePolicy);
        const result2 = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result1).toBe(result2);
      });

      it('should handle invalid format gracefully', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'invalid' as any);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('Content Preservation', () => {
      it('should preserve exact policy text', () => {
        const policy = 'Custom policy with special chars: @#$%^&*()';
        const result = buildPolicyContextBlock(policy, 'system');
        expect(result).toContain(policy);
      });

      it('should preserve multiline policies', () => {
        const policy = `Policy 1: First policy
Policy 2: Second policy
Policy 3: Third policy`;
        const result = buildPolicyContextBlock(policy, 'system');
        expect(result).toContain('Policy 1');
        expect(result).toContain('Policy 2');
        expect(result).toContain('Policy 3');
      });

      it('should preserve long policies', () => {
        const policy = 'A'.repeat(1000);
        const result = buildPolicyContextBlock(policy, 'system');
        expect(result).toContain(policy);
      });

      it('should preserve Unicode characters in policies', () => {
        const policy = 'Richtlinien: Prävention von Sicherheitsverletzungen';
        const result = buildPolicyContextBlock(policy, 'system');
        expect(result).toContain(policy);
      });
    });

    describe('Formatting Structure', () => {
      it('should include newlines for readability', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).toContain('\n');
      });

      it('should start with newline for proper prompt separation', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result.startsWith('\n')).toBe(true);
      });

      it('should have proper spacing before critical marker', () => {
        const result = buildPolicyContextBlock(samplePolicy, 'system');
        expect(result).toContain('\n\n🔴');
      });
    });
  });

  describe('buildPolicySystemPrompt', () => {
    it('should call buildPolicyContextBlock with system format', () => {
      const expected = buildPolicyContextBlock(samplePolicy, 'system');
      const result = buildPolicySystemPrompt(samplePolicy);
      expect(result).toBe(expected);
    });

    it('should return empty string for undefined policy', () => {
      const result = buildPolicySystemPrompt(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for empty policy', () => {
      const result = buildPolicySystemPrompt('');
      expect(result).toBe('');
    });

    it('should include system format instruction', () => {
      const result = buildPolicySystemPrompt(samplePolicy);
      expect(result).toContain('Ensure ALL content generation complies');
    });
  });

  describe('buildPolicyScenePrompt', () => {
    it('should call buildPolicyContextBlock with scene format', () => {
      const expected = buildPolicyContextBlock(samplePolicy, 'scene');
      const result = buildPolicyScenePrompt(samplePolicy);
      expect(result).toBe(expected);
    });

    it('should return empty string for undefined policy', () => {
      const result = buildPolicyScenePrompt(undefined);
      expect(result).toBe('');
    });

    it('should include scene format instruction', () => {
      const result = buildPolicyScenePrompt(samplePolicy);
      expect(result).toContain('Generate scene content that is strictly policy-compliant');
    });

    it('should reference every section', () => {
      const result = buildPolicyScenePrompt(samplePolicy);
      expect(result).toContain('<COMPANY_POLICIES>');
    });
  });

  describe('Consistency Across Helpers', () => {
    it('should all include critical marker', () => {
      const system = buildPolicySystemPrompt(samplePolicy);
      const scene = buildPolicyScenePrompt(samplePolicy);

      expect(system).toContain('🔴 CRITICAL');
      expect(scene).toContain('🔴 CRITICAL');
    });

    it('should all include policy content', () => {
      const system = buildPolicySystemPrompt(samplePolicy);
      const scene = buildPolicyScenePrompt(samplePolicy);

      expect(system).toContain(samplePolicy);
      expect(scene).toContain(samplePolicy);
    });

    it('should all include INSTRUCTION directive', () => {
      const system = buildPolicySystemPrompt(samplePolicy);
      const scene = buildPolicyScenePrompt(samplePolicy);

      expect(system).toContain('INSTRUCTION:');
      expect(scene).toContain('INSTRUCTION:');
    });
  });

  describe('Use Cases', () => {
    it('should work for GDPR compliance policies', () => {
      const gdprPolicy = 'All data processing must comply with GDPR Article 5 principles.';
      const result = buildPolicySystemPrompt(gdprPolicy);
      expect(result).toContain('GDPR');
    });

    it('should work for security policies', () => {
      const securityPolicy = 'All content must follow ISO 27001 security standards.';
      const result = buildPolicySystemPrompt(securityPolicy);
      expect(result).toContain('ISO 27001');
    });

    it('should work for multiple policies concatenated', () => {
      const multiPolicy = `Policy 1: Comply with GDPR
Policy 2: Follow ISO 27001
Policy 3: Maintain data privacy`;
      const result = buildPolicySystemPrompt(multiPolicy);
      expect(result).toContain('GDPR');
      expect(result).toContain('ISO 27001');
      expect(result).toContain('data privacy');
    });

    it('should work for enhancement scenarios', () => {
      const policy = 'Content must be family-friendly and inclusive.';
      const result = buildPolicySystemPrompt(policy);
      expect(result).toContain('family-friendly');
    });

    it('should work for scene generation with policies', () => {
      const policy = 'Training must include real-world examples.';
      const result = buildPolicyScenePrompt(policy);
      expect(result).toContain('real-world');
    });
  });
});
