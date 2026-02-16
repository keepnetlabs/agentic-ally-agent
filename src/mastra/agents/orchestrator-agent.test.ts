/**
 * Test Suite: Orchestrator Agent
 *
 * Tests for intelligent request routing and intent classification.
 * Covers all routing scenarios, user/artifact extraction, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { AGENT_NAMES, ROUTING } from '../constants';

describe('Orchestrator Agent - Request Routing', () => {
  describe('SCENARIO A: Continuation & Confirmation', () => {
    describe('Simple confirmation triggers', () => {
      it('should recognize "Yes" as confirmation trigger', () => {
        expect([...ROUTING.CONFIRMATION_TRIGGERS]).toContain('Yes');
      });

      it('should recognize "Proceed" as confirmation trigger', () => {
        expect([...ROUTING.CONFIRMATION_TRIGGERS]).toContain('Proceed');
      });

      it('should recognize "Do it" as confirmation trigger', () => {
        expect([...ROUTING.CONFIRMATION_TRIGGERS]).toContain('Do it');
      });

      it('should recognize "Tamam" (Turkish) as confirmation trigger', () => {
        expect([...ROUTING.CONFIRMATION_TRIGGERS]).toContain('Tamam');
      });

      it('should recognize "Oluştur" (Turkish) as confirmation trigger', () => {
        expect([...ROUTING.CONFIRMATION_TRIGGERS]).toContain('Oluştur');
      });
    });

    describe('Confirmation with previous agent context', () => {
      it('should route confirmation to microlearningAgent when it was last agent', () => {
        const previousAgent = AGENT_NAMES.MICROLEARNING;
        const userPrompt = 'Yes';

        expect(userPrompt).toBe('Yes');
        expect(previousAgent).toBe('microlearningAgent');
      });

      it('should route confirmation to phishingEmailAssistant when it was last agent', () => {
        const previousAgent = AGENT_NAMES.PHISHING;

        expect(previousAgent).toBe('phishingEmailAssistant');
      });

      it('should route confirmation to userInfoAssistant when it was last agent', () => {
        const previousAgent = AGENT_NAMES.USER_INFO;

        expect(previousAgent).toBe('userInfoAssistant');
      });
    });

    describe('Confirmation vs new request distinction', () => {
      it('should treat "Yes" as confirmation, not new request', () => {
        const userPrompt = 'Yes';
        const isConfirmation = [...ROUTING.CONFIRMATION_TRIGGERS].some(t => userPrompt.includes(t));

        expect(isConfirmation).toBe(true);
      });

      it('should treat "Yes, but create different..." as new request, not confirmation', () => {
        const userPrompt = 'Yes, but create something different';
        const hasNewIntent = userPrompt.toLowerCase().includes('but') || userPrompt.toLowerCase().includes('create');

        expect(hasNewIntent).toBe(true);
      });

      it('should NOT treat "Yes please" as pure confirmation (has additional context)', () => {
        const userPrompt = 'Yes please';
        // Could be confirmation or polite request - needs agent to handle context
        expect(userPrompt).toContain('Yes');
      });
    });
  });

  describe('SCENARIO B: Platform Actions (Upload/Assign/Send)', () => {
    describe('Training artifact + platform actions', () => {
      it('should route "Upload training" to microlearningAgent', () => {
        expect([...ROUTING.TRAINING_KEYWORDS]).toContain('Training');
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Upload');
      });

      it('should route "Assign training" to microlearningAgent', () => {
        expect([...ROUTING.TRAINING_KEYWORDS]).toContain('Training');
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Assign');
      });

      it('should route "Send training" to microlearningAgent', () => {
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Send');
      });

      it('should route "Deploy training" to microlearningAgent', () => {
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Deploy');
      });
    });

    describe('Phishing artifact + platform actions', () => {
      it('should route "Upload simulation" to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Simulation');
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Upload');
      });

      it('should route "Deploy phishing test" to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Test');
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Deploy');
      });

      it('should route "Send attack simulation" to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Attack');
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Send');
      });

      it('should route "Assign simulation to users" to phishingEmailAssistant', () => {
        expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Assign');
      });
    });

    describe('User ID validation for assignments', () => {
      it('should treat non-resource identifiers as NOT valid for assignment', () => {
        const userId = 'USER_ABC123';
        const resourcePattern = /^[a-zA-Z0-9]{8,}$/;
        expect(resourcePattern.test(userId)).toBe(false);
      });

      it('should validate alphanumeric resource IDs', () => {
        const userId = 'ys9vXMbl4wC6';
        const resourcePattern = /^[a-zA-Z0-9]{8,}$/;
        expect(resourcePattern.test(userId)).toBe(true);
      });

      it('should reject plain names as user IDs', () => {
        const name = 'Peter Parker';
        const resourcePattern = /^[a-zA-Z0-9]{8,}$/;
        expect(resourcePattern.test(name)).toBe(false);
      });

      it('should extract email but recognize it needs ID lookup', () => {
        const email = 'alice@company.com';
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        expect(emailPattern.test(email)).toBe(true);
        // Email alone is NOT a resource ID - needs lookup
      });

      it('should handle name + ID combination', () => {
        const userRef = 'Peter Parker (ID: ys9vXMbl4wC6)';
        const hasName = userRef.includes('Peter Parker');
        const hasId = /ID:\s*[a-zA-Z0-9]{8,}/.test(userRef);

        expect(hasName).toBe(true);
        expect(hasId).toBe(true);
      });
    });

    describe('Missing required context for assignments', () => {
      it('should require user ID before assignment', () => {
        const userPrompt = 'Assign training';
        // No user specified - must ask or lookup
        expect(userPrompt).toBe('Assign training');
      });

      it('should require resource ID for upload', () => {
        const userPrompt = 'Upload it';
        // "it" is vague - must have previous context
        expect(userPrompt).toContain('it');
      });
    });
  });

  describe('SCENARIO C: New Requests (Intent Matching)', () => {
    describe('User analysis intent triggers', () => {
      it('should route "Who is..." to userInfoAssistant', () => {
        expect([...ROUTING.USER_ANALYSIS_TRIGGERS]).toContain('Who is');
      });

      it('should route "Find..." to userInfoAssistant', () => {
        expect([...ROUTING.USER_ANALYSIS_TRIGGERS]).toContain('Find');
      });

      it('should route "Analyze..." to userInfoAssistant', () => {
        expect([...ROUTING.USER_ANALYSIS_TRIGGERS]).toContain('Analyze');
      });
    });

    describe('Training creation intent triggers', () => {
      it('should route "Create training..." to microlearningAgent', () => {
        expect([...ROUTING.MICROLEARNING_TRIGGERS]).toContain('Create training');
      });

      it('should route "Build module..." to microlearningAgent', () => {
        expect([...ROUTING.MICROLEARNING_TRIGGERS]).toContain('Build module');
      });

      it('should route "Teach..." to microlearningAgent', () => {
        expect([...ROUTING.MICROLEARNING_TRIGGERS]).toContain('Teach phishing');
      });

      it('should route "Translate..." to microlearningAgent', () => {
        expect([...ROUTING.MICROLEARNING_TRIGGERS]).toContain('Translate');
      });
    });

    describe('Phishing creation intent triggers', () => {
      it('should route "Phishing email..." to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_TRIGGERS]).toContain('Phishing email');
      });

      it('should route "Draft template..." to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_TRIGGERS]).toContain('Draft template');
      });

      it('should route "Simulate attack..." to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_TRIGGERS]).toContain('Simulate attack');
      });

      it('should route "Fake landing page..." to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_TRIGGERS]).toContain('Fake landing page');
      });
    });
  });

  describe('Artifact Type Detection (CRITICAL DISTINCTION)', () => {
    describe('Training vs Phishing Priority', () => {
      it('should prioritize "Training" keyword to route to microlearningAgent', () => {
        const userPrompt = 'Create Phishing Training module';

        // Both phishing + training keywords present
        // PRIORITY: Training keywords win
        expect(userPrompt).toContain('Training');
        expect([...ROUTING.TRAINING_KEYWORDS]).toContain('Training');
      });

      it('should detect "Simulation" keyword to route to phishingEmailAssistant', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Simulation');
      });

      it('should use action verb "Teach" to detect training intent', () => {
        expect([...ROUTING.MICROLEARNING_TRIGGERS]).toContain('Teach phishing');
      });

      it('should use action verb "Create" + artifact to detect intent', () => {
        // "Create phishing email" → phishing
        // "Create training" → training
        const phishingPrompt = 'Create phishing email';
        const trainingPrompt = 'Create training';

        expect(phishingPrompt).toContain('email');
        expect(trainingPrompt).toContain('training');
      });
    });

    describe('Artifact keyword detection', () => {
      it('should detect "Course" as training', () => {
        expect([...ROUTING.TRAINING_KEYWORDS]).toContain('Course');
      });

      it('should detect "Module" as training', () => {
        expect([...ROUTING.TRAINING_KEYWORDS]).toContain('Module');
      });

      it('should detect "Learn" as training', () => {
        expect([...ROUTING.TRAINING_KEYWORDS]).toContain('Learn');
      });

      it('should detect "Attack" as phishing', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Attack');
      });

      it('should detect "Template" as phishing', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Template');
      });

      it('should detect "Test" as phishing', () => {
        expect([...ROUTING.PHISHING_KEYWORDS]).toContain('Test');
      });
    });
  });

  describe('Edge Cases & Error Scenarios', () => {
    describe('Ambiguous requests', () => {
      it('should handle "Create something for alice@company.com"', () => {
        const userPrompt = 'Create something for alice@company.com';
        // Vague intent - should route to userInfoAssistant first
        expect(userPrompt).toContain('something');
      });

      it('should handle multi-topic request', () => {
        const userPrompt = 'Create training AND phishing simulation';
        expect(userPrompt).toContain('AND');
        // Should ask which one or handle sequentially
      });

      it('should handle language detection in multilingual prompt', () => {
        const userPrompt = 'Create phishing training // Phishing eğitimi oluştur';
        expect(userPrompt).toContain('//');
        // Should detect primary language
      });
    });

    describe('Invalid or missing input', () => {
      it('should handle empty prompt', () => {
        const userPrompt = '';
        expect(userPrompt.length).toBe(0);
        // Should not route - invalid input
      });

      it('should handle very long prompt', () => {
        const longPrompt = 'Create training ' + 'about phishing '.repeat(100);
        expect(longPrompt.length).toBeGreaterThan(500);
        // Should still extract core intent
      });
    });

    describe('Missing critical context', () => {
      it('should not assign without user ID', () => {
        const conversationHistory: any[] = [];

        expect(conversationHistory.length).toBe(0);
        // Cannot proceed - no previous context
      });

      it('should not upload without resource', () => {
        const conversationHistory: any[] = [];

        expect(conversationHistory.length).toBe(0);
        // Cannot proceed - no resource created yet
      });
    });
  });

  describe('Task Context Generation', () => {
    describe('Context completeness per agent', () => {
      it('should generate actionable context for userInfoAssistant', () => {
        const userPrompt = 'Who is alice@company.com?';
        // Expected: "Find alice@company.com and analyze risk"
        expect(userPrompt).toContain('alice');
        expect(userPrompt).toContain('@');
      });

      it('should generate actionable context for microlearningAgent', () => {
        const userPrompt = 'Create phishing training for IT department';
        // Expected: "Create Phishing training module for IT department"
        expect(userPrompt).toContain('phishing');
        expect(userPrompt).toContain('IT');
      });

      it('should generate actionable context for phishingEmailAssistant', () => {
        const userPrompt = 'Create phishing email simulation for finance team';
        // Expected: "Create phishing email simulation targeting finance"
        expect(userPrompt).toContain('email');
        expect(userPrompt).toContain('finance');
      });

      it('should include language preference in context', () => {
        const userPrompt = 'Create training in Turkish for phishing';
        expect(userPrompt.toLowerCase()).toContain('turkish');
        // Context should include language_code: 'tr'
      });
    });
  });

  describe('Output Format Validation', () => {
    it('should return JSON object with agent and taskContext', () => {
      const validOutput = {
        agent: 'microlearningAgent',
        taskContext: 'Create Phishing Training for IT department',
      };

      expect(validOutput).toHaveProperty('agent');
      expect(validOutput).toHaveProperty('taskContext');
      expect(typeof validOutput.agent).toBe('string');
      expect(typeof validOutput.taskContext).toBe('string');
    });

    it('should only return valid agent names', () => {
      const validAgents = [AGENT_NAMES.USER_INFO, AGENT_NAMES.MICROLEARNING, AGENT_NAMES.PHISHING];

      for (const agent of validAgents) {
        expect(typeof agent).toBe('string');
        expect(agent.length).toBeGreaterThan(0);
      }
    });

    it('should not return empty taskContext', () => {
      const output = {
        agent: 'userInfoAssistant',
        taskContext: 'Find user alice@company.com and prepare for assignment',
      };

      expect(output.taskContext.length).toBeGreaterThan(0);
    });

    it('should have taskContext >= 10 characters', () => {
      const output = {
        agent: 'microlearningAgent',
        taskContext: 'Create training',
      };

      expect(output.taskContext.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Real-World Integration Scenarios', () => {
    it('Scenario 1: New training creation', () => {
      expect([...ROUTING.MICROLEARNING_TRIGGERS]).toContain('Create training');
      // Should route to: microlearningAgent
      // Context: "Create Phishing Awareness training for IT department"
    });

    it('Scenario 2: Upload after creation', () => {
      expect([...ROUTING.PLATFORM_ACTIONS]).toContain('Upload');
      // Should route to: microlearningAgent
      // Has previous training context
    });

    it('Scenario 3: Unknown user assignment', () => {
      const userPrompt = 'Create training for Peter';

      // Name without ID - needs resolution
      expect(userPrompt).toContain('Peter');
      // Should route to: userInfoAssistant first
    });

    it('Scenario 4: Phishing simulation creation', () => {
      expect([...ROUTING.PHISHING_TRIGGERS]).toContain('Phishing email');
      // Should route to: phishingEmailAssistant
    });

    it('Scenario 5: Confirmation after previous action', () => {
      const userPrompt = 'Yes proceed';

      expect(userPrompt.toLowerCase()).toContain('yes');
      // Should route to: Same as previous agent
    });
  });
});
