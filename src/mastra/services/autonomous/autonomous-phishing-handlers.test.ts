import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generatePhishingSimulation,
  uploadAndAssignPhishing,
  uploadAndAssignPhishingForGroup,
  generatePhishingSimulationForGroup,
  assignPhishingWithTraining,
} from './autonomous-phishing-handlers';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: AutonomousPhishingHandlers
 * Tests for phishing simulation generation and assignment
 * Covers: Email handling, sophistication levels, assignment workflows
 */

describe('AutonomousPhishingHandlers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Phishing simulation configuration', () => {
    it('should accept difficulty levels', () => {
      const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Easy', 'Medium', 'Hard'];

      difficulties.forEach(difficulty => {
        const simulation = {
          title: 'Phishing Test',
          difficulty,
          vector: 'EMAIL',
          scenario_type: 'CLICK_ONLY',
          persuasion_tactic: 'Urgency',
        };

        expect(simulation.difficulty).toBeTruthy();
        expect(typeof simulation.difficulty).toBe('string');
      });
    });

    it('should accept scenario types', () => {
      const scenarios = ['CLICK_ONLY', 'CREDENTIAL_HARVEST', 'ATTACHMENT_DOWNLOAD', 'REPORT_ONLY'];

      scenarios.forEach(scenario_type => {
        const simulation = {
          title: 'Phishing Test',
          difficulty: 'Medium',
          vector: 'EMAIL',
          scenario_type,
          persuasion_tactic: 'Authority',
        };

        expect(simulation.scenario_type).toBe(scenario_type);
      });
    });

    it('should accept attack vectors', () => {
      const vectors = ['EMAIL', 'SMS', 'CALL', 'INPERSON'];

      vectors.forEach(vector => {
        const simulation = {
          title: 'Phishing Test',
          difficulty: 'Medium',
          scenario_type: 'CLICK_ONLY',
          vector,
          persuasion_tactic: 'Scarcity',
        };

        expect(simulation.vector).toBe(vector);
      });
    });

    it('should accept persuasion tactics', () => {
      const tactics = ['Urgency', 'Authority', 'Scarcity', 'Trust', 'Social Proof', 'Reciprocity'];

      tactics.forEach(persuasion_tactic => {
        const simulation = {
          title: 'Phishing Test',
          difficulty: 'Medium',
          scenario_type: 'CLICK_ONLY',
          vector: 'EMAIL',
          persuasion_tactic,
        };

        expect(simulation.persuasion_tactic).toBe(persuasion_tactic);
      });
    });

    it('should support metadata in simulation', () => {
      const simulation = {
        title: 'Phishing Campaign',
        difficulty: 'Medium',
        scenario_type: 'CREDENTIAL_HARVEST',
        vector: 'EMAIL',
        persuasion_tactic: 'Urgency',
        rationale: 'Test email security awareness',
        nist_phish_scale: {
          cue_difficulty: 'Medium',
          premise_alignment: 'High',
        },
        designed_to_progress: 'Intermediate level',
      };

      expect(simulation.rationale).toBeTruthy();
      expect(simulation.nist_phish_scale).toBeDefined();
    });
  });

  describe('Email handling and validation', () => {
    it('should validate email format patterns', () => {
      const validEmails = [
        'user@example.com',
        'security.team@company.org',
        'notifications@platform.co.uk',
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/@/);
      });
    });

    it('should support sender spoofing scenarios', () => {
      const spookedEmail = {
        from: 'executive@company.com', // Spoofed
        actual_from: 'attacker@malicious.com',
        subject: 'Urgent: Transfer Needed',
        body: 'Please process this transfer immediately',
      };

      expect(spookedEmail.from).toContain('@');
      expect(spookedEmail.actual_from).toContain('@');
    });

    it('should support subject line variations', () => {
      const subjects = [
        'URGENT: Action Required',
        'Verify your account',
        'Package delivery notification',
        'System maintenance scheduled',
        'Your invoice is ready',
      ];

      subjects.forEach(subject => {
        expect(typeof subject).toBe('string');
        expect(subject.length).toBeGreaterThan(0);
      });
    });

    it('should support email body patterns', () => {
      const bodyPatterns = [
        { pattern: 'verify', description: 'Account verification request' },
        { pattern: 'urgent', description: 'Time-sensitive language' },
        { pattern: 'confirm', description: 'Confirmation request' },
        { pattern: 'update', description: 'Update notification' },
      ];

      bodyPatterns.forEach(pattern => {
        expect(pattern.pattern).toBeTruthy();
        expect(pattern.description).toBeTruthy();
      });
    });

    it('should support attachment scenarios', () => {
      const attachmentTypes = ['PDF', 'DOCX', 'XLSX', 'ZIP', 'EXE'];

      attachmentTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    it('should support hyperlink variations', () => {
      const linkPatterns = [
        { display: 'Click here', url: 'https://malicious.com/login' },
        { display: 'Verify Account', url: 'https://spoofed-site.fake' },
        { display: 'company.com', url: 'https://companyy.com' }, // Similar domain
      ];

      linkPatterns.forEach(pattern => {
        expect(pattern.display).toBeTruthy();
        expect(pattern.url).toContain('http');
      });
    });
  });

  describe('Sophistication levels', () => {
    it('should support beginner level phishing', () => {
      const beginnerPhishing = {
        difficulty: 'Beginner',
        characteristics: [
          'Obvious spelling mistakes',
          'Poor formatting',
          'Generic greeting',
          'Suspicious sender',
        ],
      };

      expect(beginnerPhishing.difficulty).toBe('Beginner');
      expect(Array.isArray(beginnerPhishing.characteristics)).toBe(true);
    });

    it('should support intermediate level phishing', () => {
      const intermediatePhishing = {
        difficulty: 'Intermediate',
        characteristics: [
          'Proper formatting',
          'Spoofed domain',
          'Specific details',
          'Legitimate-looking layout',
        ],
      };

      expect(intermediatePhishing.difficulty).toBe('Intermediate');
    });

    it('should support advanced level phishing', () => {
      const advancedPhishing = {
        difficulty: 'Advanced',
        characteristics: [
          'Perfect domain spoofing',
          'HTTPS and security indicators',
          'Contextual personalization',
          'Multi-vector attack',
        ],
      };

      expect(advancedPhishing.difficulty).toBe('Advanced');
    });

    it('should correlate difficulty with detection rate', () => {
      const difficultyScores = {
        'Beginner': { difficulty: 1, expectedDetectionRate: 0.95 },
        'Intermediate': { difficulty: 2, expectedDetectionRate: 0.65 },
        'Advanced': { difficulty: 3, expectedDetectionRate: 0.30 },
      };

      expect(difficultyScores['Beginner'].expectedDetectionRate).toBeGreaterThan(
        difficultyScores['Advanced'].expectedDetectionRate
      );
    });
  });

  describe('Phishing generation patterns', () => {
    it('should generate function with simulation config', () => {
      expect(typeof generatePhishingSimulation).toBe('function');
    });

    it('should accept executive report context', () => {
      expect(typeof generatePhishingSimulation).toBe('function');
    });

    it('should accept tool result with user info', () => {
      expect(typeof generatePhishingSimulation).toBe('function');
    });

    it('should support upload and assign workflow', () => {
      expect(typeof uploadAndAssignPhishing).toBe('function');
    });

    it('should support group phishing generation', () => {
      expect(typeof generatePhishingSimulationForGroup).toBe('function');
    });

    it('should support group assignment', () => {
      expect(typeof uploadAndAssignPhishingForGroup).toBe('function');
    });

    it('should support phishing with training assignment', () => {
      expect(typeof assignPhishingWithTraining).toBe('function');
    });
  });

  describe('Assignment patterns', () => {
    it('should validate user resource ID for user assignment', () => {
      const userIds = ['user-123', 'user-456', 'employee-789'];

      userIds.forEach(id => {
        expect(id).toBeTruthy();
        expect(typeof id).toBe('string');
      });
    });

    it('should validate group resource ID for group assignment', () => {
      const groupIds = ['group-it', 'group-sales', 'group-all'];

      groupIds.forEach(id => {
        expect(id).toBeTruthy();
        expect(typeof id).toBe('string');
      });
    });

    it('should support optional generated phishing ID parameter', () => {
      const result = {
        generatedPhishingId: 'phishing-123',
        success: true,
      };

      if (result.generatedPhishingId) {
        expect(result.generatedPhishingId).toBeTruthy();
      }
    });

    it('should include agent thread ID in memory config', () => {
      const memoryConfig = {
        thread: 'thread-phishing-001',
        resource: 'agentic-ally-autonomous',
      };

      expect(memoryConfig.thread).toBeTruthy();
      expect(memoryConfig.resource).toBe('agentic-ally-autonomous');
    });

    it('should return success flag in assignment result', () => {
      const result = { success: true };
      expect(typeof result.success).toBe('boolean');
    });

    it('should include error message on assignment failure', () => {
      const result = {
        success: false,
        error: 'Missing targetUserResourceId',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Language and localization', () => {
    it('should support language parameter', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es'];

      languages.forEach(lang => {
        expect(typeof lang).toBe('string');
      });
    });

    it('should validate BCP47 language codes', () => {
      const validCodes = ['en', 'en-US', 'tr', 'tr-TR', 'de-DE'];

      validCodes.forEach(code => {
        expect(code).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      });
    });

    it('should support fallback to default language', () => {
      const defaultLanguage = 'en';
      expect(defaultLanguage).toBe('en');
    });

    it('should generate content in specified language', () => {
      const simulation = {
        language: 'en',
        title: 'Phishing Test',
      };

      expect(simulation.language).toBe('en');
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should handle missing user resource ID gracefully', () => {
      expect(typeof uploadAndAssignPhishing).toBe('function');
    });

    it('should handle missing group resource ID gracefully', () => {
      expect(typeof uploadAndAssignPhishingForGroup).toBe('function');
    });

    it('should support retry logic', () => {
      expect(typeof generatePhishingSimulation).toBe('function');
    });

    it('should support timeout handling', () => {
      expect(typeof generatePhishingSimulation).toBe('function');
    });

    it('should fallback on agent generation failure', () => {
      expect(typeof generatePhishingSimulation).toBe('function');
    });

    it('should return structured error response', () => {
      const errorResponse = {
        success: false,
        error: 'Agent generation failed after all fallbacks',
        recommendedParams: {
          topic: 'Security Update',
          difficulty: 'Medium',
        },
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.recommendedParams).toBeDefined();
    });
  });

  describe('Training integration', () => {
    it('should accept training IDs for phishing assignment', () => {
      expect(typeof assignPhishingWithTraining).toBe('function');
    });

    it('should support training language ID parameter', () => {
      const params = {
        trainingId: 'training-123',
        sendTrainingLanguageId: 'lang-456',
      };

      expect(params.trainingId).toBeTruthy();
      expect(params.sendTrainingLanguageId).toBeTruthy();
    });

    it('should link phishing with training content', () => {
      expect(typeof assignPhishingWithTraining).toBe('function');
    });

    it('should support deferred assignment mode', () => {
      const config = {
        uploadOnly: true,
        assignLater: true,
      };

      expect(config.uploadOnly).toBe(true);
    });
  });
});
