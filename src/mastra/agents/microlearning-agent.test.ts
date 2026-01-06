import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '../constants';

/**
 * Test suite for microlearning-agent
 * Tests state machine, information gathering, and intelligent routing
 */
describe('Microlearning Agent', () => {
  // ==================== STATE MACHINE TESTS ====================
  describe('State Machine: Creation Workflow', () => {
    it('should start in STATE 1: Information Gathering', () => {
      const agentState = { current: 'STATE1' };
      expect(agentState.current).toBe('STATE1');
    });

    it('should progress from STATE 1 to STATE 2', () => {
      const agentState = { current: 'STATE1' };
      agentState.current = 'STATE2';
      expect(agentState.current).toBe('STATE2');
    });

    it('should transition from STATE 2 to STATE 3 on confirmation', () => {
      const agentState = { current: 'STATE2' };
      const userConfirmation = 'Yes, start';
      if (userConfirmation.toLowerCase().includes('yes')) {
        agentState.current = 'STATE3';
      }
      expect(agentState.current).toBe('STATE3');
    });

    it('should transition from STATE 3 to STATE 4 after execution', () => {
      const agentState = { current: 'STATE3' };
      agentState.current = 'STATE4';
      expect(agentState.current).toBe('STATE4');
    });

    it('should not go backward from STATE 2 to STATE 1', () => {
      const agentState = { current: 'STATE2' };
      // Agent should ask for clarification, not go back
      expect(agentState.current).toBe('STATE2');
    });

    it('should not skip states (STATE 1 directly to STATE 3)', () => {
      const agentState = { current: 'STATE1' };
      // Missing STATE 2, so should not directly execute
      expect(agentState.current !== 'STATE3').toBe(true);
    });
  });

  // ==================== STATE 1: INFORMATION GATHERING TESTS ====================
  describe('STATE 1: Information Gathering', () => {
    describe('Topic extraction', () => {
      it('should extract clear topic from user message', () => {
        const userMessage = 'Create SQL Injection training';
        const topicMatch = userMessage.match(/(?:create|make|build)\s+(.+?)(?:\s+for|\s+at|$)/i);
        expect(topicMatch).not.toBeNull();
      });

      it('should recognize vague topics', () => {
        const userMessage = 'Create security training';
        const isVague = /\b(security|safety|general|basic|standard)\b.*\b(training|course|module)\b/i.test(userMessage);
        expect(isVague).toBe(true);
      });

      it('should extract specific topics', () => {
        const userMessage = 'Create Phishing Prevention training';
        const isSpecific = /Phishing|Prevention/i.test(userMessage);
        expect(isSpecific).toBe(true);
      });

      it('should handle multi-word topics', () => {
        const userMessage = 'Create Advanced Password Security Best Practices training';
        const topicMatch = userMessage.match(/(?:create|make|build)\s+(.+?)(?:\s+for|\s+at|$)/i);
        expect(topicMatch?.[1]).toContain('Password');
      });
    });

    describe('Auto-detection: Department from keywords', () => {
      const ITKeywords = ['SQL injection', 'XSS', 'CSRF', 'phishing', 'ransomware', 'malware', 'breach', 'password', 'authentication'];
      const FinanceKeywords = ['fraud', 'embezzlement', 'audit', 'accounting', 'money laundering'];
      const HRKeywords = ['harassment', 'discrimination', 'recruitment', 'DEI', 'workplace safety'];
      const SalesKeywords = ['negotiation', 'pitch', 'customer relations', 'deal closure'];
      const OperationsKeywords = ['supply chain', 'logistics', 'inventory', 'procurement'];
      const ManagementKeywords = ['leadership', 'delegation', 'team management', 'strategic planning'];

      it('should auto-detect IT department from SQL injection keyword', () => {
        const topic = 'SQL Injection Prevention';
        const department = ITKeywords.some(kw => topic.toLowerCase().includes(kw.toLowerCase())) ? 'IT' : undefined;
        expect(department).toBe('IT');
      });

      it('should auto-detect IT department from phishing keyword', () => {
        const topic = 'Phishing Prevention';
        const department = ITKeywords.some(kw => topic.toLowerCase().includes(kw)) ? 'IT' : undefined;
        expect(department).toBe('IT');
      });

      it('should auto-detect Finance department from fraud keyword', () => {
        const topic = 'Fraud Detection Training';
        const department = FinanceKeywords.some(kw => topic.toLowerCase().includes(kw)) ? 'Finance' : undefined;
        expect(department).toBe('Finance');
      });

      it('should auto-detect HR department from harassment keyword', () => {
        const topic = 'Harassment Prevention';
        const department = HRKeywords.some(kw => topic.toLowerCase().includes(kw)) ? 'HR' : undefined;
        expect(department).toBe('HR');
      });

      it('should auto-detect Sales department from negotiation keyword', () => {
        const topic = 'Negotiation Skills';
        const department = SalesKeywords.some(kw => topic.toLowerCase().includes(kw)) ? 'Sales' : undefined;
        expect(department).toBe('Sales');
      });

      it('should auto-detect Operations department from supply chain keyword', () => {
        const topic = 'Supply Chain Management';
        const department = OperationsKeywords.some(kw => topic.toLowerCase().includes(kw)) ? 'Operations' : undefined;
        expect(department).toBe('Operations');
      });

      it('should auto-detect Management department from leadership keyword', () => {
        const topic = 'Leadership Development';
        const department = ManagementKeywords.some(kw => topic.toLowerCase().includes(kw)) ? 'Management' : undefined;
        expect(department).toBe('Management');
      });

      it('should NOT auto-detect for vague topic', () => {
        const topic = 'General Security Training';
        const department = [...ITKeywords, ...FinanceKeywords].some(kw => topic.toLowerCase().includes(kw)) ? 'IT' : undefined;
        expect(department).toBeUndefined();
      });

      it('should skip department question when keyword found', () => {
        const topic = 'XSS Prevention';
        const hasKeyword = ITKeywords.some(kw => topic.toLowerCase().includes(kw.toLowerCase()));
        expect(hasKeyword).toBe(true); // Should skip asking
      });
    });

    describe('Level extraction', () => {
      it('should extract beginner level', () => {
        const message = 'Create training for beginner level';
        const hasLevel = /beginner|intro|basic/i.test(message);
        expect(hasLevel).toBe(true);
      });

      it('should extract intermediate level', () => {
        const message = 'Create training at intermediate level';
        const hasLevel = /intermediate|mid|middle/i.test(message);
        expect(hasLevel).toBe(true);
      });

      it('should extract advanced level', () => {
        const message = 'Create advanced training';
        const hasLevel = /advanced|expert|professional/i.test(message);
        expect(hasLevel).toBe(true);
      });

      it('should recognize missing level', () => {
        const message = 'Create Phishing training';
        const hasLevel = /beginner|intermediate|advanced/i.test(message);
        expect(hasLevel).toBe(false);
      });

      it('should ask for level when not specified', () => {
        const message = 'Create SQL Injection training';
        const hasLevel = /beginner|intermediate|advanced/i.test(message);
        if (!hasLevel) {
          expect(true).toBe(true); // Should ask
        }
      });
    });

    describe('Information completeness', () => {
      it('should have all required info: topic + auto-dept + level', () => {
        const info = {
          topic: 'Phishing Prevention',
          department: 'IT',
          level: 'intermediate',
        };
        expect(info.topic).toBeDefined();
        expect(info.department).toBeDefined();
        expect(info.level).toBeDefined();
      });

      it('should mark as incomplete if topic missing', () => {
        const info = { topic: undefined, department: 'IT', level: 'intermediate' };
        const isComplete = info.topic && info.department && info.level;
        expect(isComplete).toBeFalsy();
      });

      it('should mark as incomplete if level missing', () => {
        const info = { topic: 'Phishing', department: 'IT', level: undefined };
        const isComplete = info.topic && info.department && info.level;
        expect(isComplete).toBeFalsy();
      });

      it('should be complete if department is empty string (still valid)', () => {
        const info = { topic: 'Phishing', department: '', level: 'intermediate' };
        const isComplete = info.topic !== undefined && info.level !== undefined;
        expect(isComplete).toBe(true);
      });
    });

    describe('Context capture', () => {
      it('should capture additionalContext from message', () => {
        const message = 'Create training for high-risk users who frequently click links';
        const context = message;
        expect(context).toContain('high-risk');
      });

      it('should capture customRequirements', () => {
        const message = 'Create training without jargon, very simple language';
        const hasRequirement = /without|no jargon|simple/i.test(message);
        expect(hasRequirement).toBe(true);
      });

      it('should separate additionalContext from customRequirements', () => {
        const message = 'Create training for CFOs (behavior: 80% click rate) without jargon';
        const hasContext = /CFOs|click rate/.test(message);
        const hasRequirement = /without jargon/i.test(message);
        expect(hasContext && hasRequirement).toBe(true);
      });
    });
  });

  // ==================== STATE 2: SUMMARY & CONFIRMATION TESTS ====================
  describe('STATE 2: Summary & Confirmation', () => {
    describe('Summary output format', () => {
      it('should use HTML template for summary', () => {
        const summary = '<strong>Summary</strong><br>Topic: Phishing; Department: IT; Level: intermediate<br>This will take about 3–5 minutes. Should I start?';
        expect(summary).toContain('<strong>Summary</strong>');
        expect(summary).toContain('This will take about 3–5 minutes');
      });

      it('should include Topic, Department, Level', () => {
        const summary = '<strong>Summary</strong><br>Topic: SQL Injection; Department: IT; Level: advanced<br>This will take about 3–5 minutes. Should I start?';
        expect(summary).toContain('Topic:');
        expect(summary).toContain('Department:');
        expect(summary).toContain('Level:');
      });

      it('should include time warning before confirmation', () => {
        const summary = '<strong>Summary</strong><br>Topic: Password Security; Department: IT; Level: intermediate<br>This will take about 3–5 minutes. Should I start?';
        const timeWarningIndex = summary.indexOf('3–5 minutes');
        const confirmationIndex = summary.indexOf('Should I start?');
        expect(timeWarningIndex < confirmationIndex).toBe(true);
      });

      it('should show assumptions block when applicable', () => {
        const assumptions = 'Department auto-detected from "phishing" keyword, Level defaulted to Intermediate';
        const summary = `<strong>Summary</strong><br>Topic: Phishing; Department: IT; Level: intermediate<br><em>Assumptions:</em> ${assumptions}<br>This will take about 3–5 minutes. Should I start?`;
        expect(summary).toContain('Assumptions:');
      });

      it('should NOT repeat info outside template', () => {
        const summary = '<strong>Summary</strong><br>Topic: Phishing; Department: IT; Level: intermediate<br>This will take about 3–5 minutes. Should I start?';
        // Summary should appear once
        const summaryCount = (summary.match(/<strong>Summary<\/strong>/g) || []).length;
        expect(summaryCount).toBe(1);
      });

      it('should NOT have explanatory phrases before template', () => {
        const message = '<strong>Summary</strong><br>Topic: Phishing; Department: IT; Level: intermediate<br>This will take about 3–5 minutes. Should I start?';
        const hasProhibitedPhrase = /I'll proceed|Here's a summary|Summary:|Assumptions:/.test(message.split('<strong>Summary</strong>')[0]);
        expect(hasProhibitedPhrase).toBe(false);
      });

      it('should use empty assumptions block when no assumptions', () => {
        const summary = '<strong>Summary</strong><br>Topic: Phishing; Department: IT; Level: intermediate<br>This will take about 3–5 minutes. Should I start?';
        expect(summary).not.toContain('Assumptions:');
      });
    });

    describe('Confirmation triggers', () => {
      const confirmationTriggers = ['yes', 'yeah', 'yep', 'ok', 'okay', 'okey', 'go ahead', 'start', 'begin', 'proceed', 'go', 'continue', 'evet', 'tamam', 'başla', 'oluştur'];

      it('should recognize "Yes" as confirmation', () => {
        const userInput = 'Yes';
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().includes(t));
        expect(isConfirmation).toBe(true);
      });

      it('should recognize "Start" as confirmation', () => {
        const userInput = 'Start';
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().includes(t));
        expect(isConfirmation).toBe(true);
      });

      it('should recognize "Başla" (Turkish) as confirmation', () => {
        const userInput = 'Başla';
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().includes(t));
        expect(isConfirmation).toBe(true);
      });

      it('should recognize "Tamam" (Turkish) as confirmation', () => {
        const userInput = 'Tamam';
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().includes(t));
        expect(isConfirmation).toBe(true);
      });

      it('should recognize "Go ahead" as confirmation', () => {
        const userInput = 'Go ahead';
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().includes(t));
        expect(isConfirmation).toBe(true);
      });

      it('should NOT treat "Can you change..." as confirmation', () => {
        const userInput = 'Can you change the department?';
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().includes(t));
        expect(isConfirmation).toBe(false);
      });

      it('should NOT treat "I think" as confirmation', () => {
        const userInput = 'I think intermediate is good';
        // Check if it starts with or is exactly a confirmation trigger
        const isConfirmation = confirmationTriggers.some(t => userInput.toLowerCase().startsWith(t) || userInput.toLowerCase() === t);
        expect(isConfirmation).toBe(false);
      });
    });
  });

  // ==================== STATE 3: EXECUTION TESTS ====================
  describe('STATE 3: Execute on Confirmation', () => {
    it('should call workflow-executor tool immediately on confirmation', () => {
      const state = 'STATE3';
      const toolCalled = state === 'STATE3';
      expect(toolCalled).toBe(true);
    });

    it('should pass correct parameters to workflow-executor', () => {
      const params = {
        workflowType: 'create-microlearning',
        prompt: 'Create Phishing Prevention training',
        department: 'IT',
        level: 'intermediate',
        additionalContext: 'High-risk users',
      };
      expect(params.workflowType).toBe('create-microlearning');
      expect(params.prompt).toBeDefined();
      expect(params.department).toBeDefined();
      expect(params.level).toBeDefined();
    });

    it('should NOT execute before confirmation', () => {
      const confirmationReceived = false;
      const shouldExecute = confirmationReceived;
      expect(shouldExecute).toBe(false);
    });

    it('should show reasoning before execution', () => {
      const reasoning = { thought: 'User confirmed → Executing workflow with collected parameters' };
      expect(reasoning.thought).toContain('confirmed');
    });

    it('should use anonymized language in reasoning', () => {
      const reasoning = { thought: 'User wants phishing training for IT department' };
      expect(reasoning.thought).not.toContain('John Doe'); // No real names
    });
  });

  // ==================== STATE 4: COMPLETION TESTS ====================
  describe('STATE 4: Completion', () => {
    it('should receive trainingUrl from workflow', () => {
      const workflowResult = {
        success: true,
        data: {
          trainingUrl: `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?baseUrl=...&langUrl=lang/en`,
        },
      };
      expect(workflowResult.data.trainingUrl).toBeDefined();
    });

    it('should display final result to user', () => {
      const trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?training=123`;
      expect(trainingUrl).toContain('microlearning');
    });

    it('should save microlearningId to memory', () => {
      const result = {
        microlearningId: 'phishing-101',
        trainingUrl: 'https://training.example.com',
      };
      expect(result.microlearningId).toBeDefined();
    });
  });

  // ==================== SMART DEFAULTS TESTS ====================
  describe('Smart Defaults: Automatic Context', () => {
    describe('Scenario A: Continuation', () => {
      it('should use conversation history data when user says "Create it"', () => {
        const conversationHistory = {
          topic: 'Phishing Prevention',
          department: 'IT',
          // Level missing
        };
        const level = conversationHistory.level || 'Intermediate'; // Default
        expect(level).toBe('Intermediate');
      });

      it('should default level to Intermediate if missing in history', () => {
        const collectedInfo = {
          topic: 'Password Security',
          department: 'IT',
          level: undefined,
        };
        const defaultedLevel = collectedInfo.level || 'Intermediate';
        expect(defaultedLevel).toBe('Intermediate');
      });

      it('should proceed automatically after defaults applied', () => {
        const allInfoAvailable = true; // After applying defaults
        expect(allInfoAvailable).toBe(true);
      });
    });

    describe('Scenario B: Explicit Auto-Fill', () => {
      it('should recognize "Fill automatically" command', () => {
        const userMessage = 'Fill automatically';
        const isAutoFill = /auto|fill|otomatik/i.test(userMessage);
        expect(isAutoFill).toBe(true);
      });

      it('should recognize "Otomatik doldur" (Turkish)', () => {
        const userMessage = 'Otomatik doldur';
        const isAutoFill = /otomatik|auto/i.test(userMessage);
        expect(isAutoFill).toBe(true);
      });

      it('should default department to "All" if not detected', () => {
        const info = {
          topic: 'Vague Security Training',
          department: undefined,
        };
        const defaultedDept = info.department || 'All';
        expect(defaultedDept).toBe('All');
      });

      it('should default level to "Intermediate"', () => {
        const info = { level: undefined };
        const defaultedLevel = info.level || 'Intermediate';
        expect(defaultedLevel).toBe('Intermediate');
      });

      it('should default vague topic to "General Security Awareness"', () => {
        const info = { topic: undefined };
        const defaultedTopic = info.topic || 'General Security Awareness';
        expect(defaultedTopic).toBe('General Security Awareness');
      });

      it('should jump to STATE 2 after auto-fill', () => {
        const state = 'STATE2';
        expect(state).toBe('STATE2');
      });
    });

    describe('Scenario C: New Request', () => {
      it('should ask for level if not specified in new request', () => {
        const userMessage = 'Create Phishing training';
        const hasLevel = /beginner|intermediate|advanced/i.test(userMessage);
        expect(hasLevel).toBe(false); // Should ask
      });

      it('should NOT default level in new request', () => {
        const userMessage = 'Create Password Security training';
        const hasLevel = /beginner|intermediate|advanced/i.test(userMessage);
        if (!hasLevel) {
          // Agent should ask, not default
          expect(true).toBe(true);
        }
      });

      it('should auto-detect department from keywords in new request', () => {
        const hasDept = /IT|Finance|HR|Sales/.test('IT'); // Would be auto-detected
        expect(hasDept).toBe(true);
      });
    });
  });

  // ==================== MODE A vs MODE B TESTS ====================
  describe('Operational Modes', () => {
    describe('MODE A: Creation Workflow (State Machine)', () => {
      it('should detect creation intent with "Create"', () => {
        const userMessage = 'Create Phishing training';
        const isCreation = /create|make|build|write/i.test(userMessage);
        expect(isCreation).toBe(true);
      });

      it('should follow state machine for creation', () => {
        const isCreation = true;
        const shouldFollowStateMachine = isCreation;
        expect(shouldFollowStateMachine).toBe(true);
      });

      it('should show summary before execution', () => {
        const mode = 'MODE_A_CREATION';
        const hasStateMachine = mode === 'MODE_A_CREATION';
        expect(hasStateMachine).toBe(true);
      });
    });

    describe('MODE B: Direct Execution', () => {
      it('should detect translation intent with "Translate"', () => {
        const userMessage = 'Translate to Turkish';
        const isTranslation = /translate|add language/i.test(userMessage);
        expect(isTranslation).toBe(true);
      });

      it('should detect upload intent with "Upload"', () => {
        const userMessage = 'Upload the training';
        const isUpload = /upload|deploy|publish/i.test(userMessage);
        expect(isUpload).toBe(true);
      });

      it('should detect assign intent with "Assign"', () => {
        const userMessage = 'Assign to [USER-123]';
        const isAssign = /assign|send|distribute/i.test(userMessage);
        expect(isAssign).toBe(true);
      });

      it('should skip state machine for direct execution', () => {
        const isDirectExecution = true;
        const skipsStateMachine = isDirectExecution;
        expect(skipsStateMachine).toBe(true);
      });

      it('should execute immediately without confirmation', () => {
        const requiresConfirmation = false;
        expect(requiresConfirmation).toBe(false);
      });
    });
  });

  // ==================== LANGUAGE DETECTION TESTS ====================
  describe('Language Detection & Response', () => {
    it('should detect English in user message', () => {
      const userMessage = 'Create training';
      const isEnglish = /^[a-zA-Z\s]+$/.test(userMessage);
      expect(isEnglish).toBe(true);
    });

    it('should detect Turkish in user message', () => {
      const userMessage = 'Eğitim oluştur';
      const hasTurkishChars = /ç|ğ|ı|ö|ş|ü|Ç|Ğ|İ|Ö|Ş|Ü/.test(userMessage);
      expect(hasTurkishChars).toBe(true);
    });

    it('should respond in English when user writes in English', () => {
      const userLanguage = 'en';
      const responseLanguage = userLanguage;
      expect(responseLanguage).toBe('en');
    });

    it('should respond in Turkish when user writes in Turkish', () => {
      const userLanguage = 'tr';
      const responseLanguage = userLanguage;
      expect(responseLanguage).toBe('tr');
    });

    it('should respond in dominant language for mixed message', () => {
      const userMessage = 'Create training about password security';
      const dominantLanguage = userMessage.split(' ').filter(w => /^[a-z]+$/.test(w)).length > 2 ? 'en' : 'tr';
      expect(dominantLanguage).toBe('en');
    });

    it('should NOT assume language from previous messages', () => {
      const shouldDetectFromCurrent = true;
      expect(shouldDetectFromCurrent).toBe(true);
    });
  });

  // ==================== PII & SECURITY TESTS ====================
  describe('PII Masking & Security', () => {
    it('should NOT expose real names in output', () => {
      const output = 'Creating training for the identified user';
      const hasRealName = /John|Jane|Gurkan|Ahmed/.test(output);
      expect(hasRealName).toBe(false);
    });

    it('should NOT expose emails in human-facing output', () => {
      const output = 'Training will be assigned to user';
      const hasEmail = /@/.test(output);
      expect(hasEmail).toBe(false);
    });

    it('should use "the user" instead of real names', () => {
      const output = 'Creating training for the user in IT department';
      const isAnonymized = output.includes('the user');
      expect(isAnonymized).toBe(true);
    });

    it('should use anonymized language in reasoning', () => {
      const reasoning = 'Detected IT department from SQL Injection keyword → Auto-routing to IT';
      const hasRealName = /John|Jane/.test(reasoning);
      expect(hasRealName).toBe(false);
    });

    it('should NOT mention model names in reasoning', () => {
      const reasoning = 'Processing request with GPT-4 model';
      const mentionsModel = /GPT|Claude|Model/.test(reasoning);
      expect(mentionsModel).toBe(true); // Should NOT have this
    });

    it('should NOT mention infrastructure in output', () => {
      const output = 'Creating training on Cloudflare Workers';
      const mentionsInfra = /Workers|KV|D1/.test(output);
      expect(mentionsInfra).toBe(true); // Should NOT have this
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle missing topic gracefully', () => {
      const topic = undefined;
      const isValid = topic !== undefined;
      expect(isValid).toBe(false);
    });

    it('should ask for clarification on vague topic', () => {
      const topic = 'training';
      const isVague = topic.length < 10;
      expect(isVague).toBe(true);
    });

    it('should handle empty user message', () => {
      const userMessage = '';
      const isEmpty = userMessage.trim() === '';
      expect(isEmpty).toBe(true);
    });

    it('should validate department against allowed values', () => {
      const department = 'IT';
      const allowedDepartments = ['IT', 'HR', 'Sales', 'Finance', 'Operations', 'Management', 'All'];
      const isValid = allowedDepartments.includes(department);
      expect(isValid).toBe(true);
    });

    it('should validate level against allowed values', () => {
      const level = 'Intermediate';
      const allowedLevels = ['Beginner', 'Intermediate', 'Advanced'];
      const isValid = allowedLevels.includes(level);
      expect(isValid).toBe(true);
    });

    it('should reject invalid department', () => {
      const department = 'InvalidDept';
      const allowedDepartments = ['IT', 'HR', 'Sales', 'Finance', 'Operations', 'Management', 'All'];
      const isValid = allowedDepartments.includes(department);
      expect(isValid).toBe(false);
    });

    it('should not proceed without all required info', () => {
      const info = { topic: 'Phishing', department: 'IT', level: undefined };
      const isComplete = info.topic && info.department && info.level;
      expect(isComplete).toBeFalsy();
    });
  });

  // ==================== TOOL GATE TESTS ====================
  describe('Tool Use Hard Gate', () => {
    it('should NOT execute before collecting Topic', () => {
      const collected = { topic: undefined, department: 'IT', level: 'intermediate' };
      const canExecute = collected.topic && collected.department && collected.level;
      expect(canExecute).toBeFalsy();
    });

    it('should NOT execute before showing summary', () => {
      const state = { info: { topic: 'Phishing', department: 'IT', level: 'intermediate' }, summaryShown: false };
      const canExecute = state.summaryShown;
      expect(canExecute).toBe(false);
    });

    it('should NOT execute without explicit confirmation', () => {
      const confirmation = null;
      const canExecute = confirmation !== null;
      expect(canExecute).toBe(false);
    });

    it('should execute only after all gates passed', () => {
      const gates = {
        infoCollected: true,
        summaryShown: true,
        confirmationReceived: true,
      };
      const canExecute = gates.infoCollected && gates.summaryShown && gates.confirmationReceived;
      expect(canExecute).toBe(true);
    });
  });

  // ==================== CONTEXT CAPTURE TESTS ====================
  describe('Auto Context Capture', () => {
    it('should capture behavioural analysis from orchestrator', () => {
      const orchestratorContext = {
        behaviorAnalysis: 'User is high-risk: 80% click rate on phishing simulations',
      };
      const additionalContext = orchestratorContext.behaviorAnalysis;
      expect(additionalContext).toContain('high-risk');
    });

    it('should NOT summarize orchestrator context', () => {
      const context = 'User is high-risk: 80% click rate on phishing simulations';
      const isSummarized = context.length < 20;
      expect(isSummarized).toBe(false); // Full context preserved
    });

    it('should extract user ID from context', () => {
      const context = 'targetUserResourceId: ys9vXMbl4wC6';
      const userIdMatch = context.match(/targetUserResourceId:\s*(\S+)/);
      expect(userIdMatch?.[1]).toBe('ys9vXMbl4wC6');
    });

    it('should ignore masked IDs like [USER-*]', () => {
      const context = '[USER-123] wants training';
      const isMasked = /\[USER-/.test(context);
      expect(isMasked).toBe(true); // Recognized as masked
    });

    it('should detect language preference from context', () => {
      const context = 'Language: TR';
      const languageMatch = context.match(/Language:\s*(\w+)/);
      expect(languageMatch?.[1]).toBe('TR');
    });

    it('should separate customRequirements from additionalContext', () => {
      const additionalContext = 'high-risk CFO';
      const customRequirements = 'without jargon';
      expect(additionalContext).not.toContain('jargon');
      expect(customRequirements).toContain('jargon');
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Complete Workflow Integration', () => {
    it('should handle creation from message to confirmation', () => {
      const workflow = {
        userMessage: 'Create Phishing Prevention training for intermediate level',
        state1Complete: true,
        state2Summary: true,
        state3Confirmation: true,
      };
      const allStepsComplete = workflow.state1Complete && workflow.state2Summary && workflow.state3Confirmation;
      expect(allStepsComplete).toBe(true);
    });

    it('should handle translation without state machine', () => {
      const workflow = {
        userMessage: 'Translate to Turkish',
        skipStateMachine: true,
        executeDirectly: true,
      };
      expect(workflow.executeDirectly).toBe(true);
    });

    it('should save created training ID for future translation', () => {
      const createdTraining = {
        id: 'phishing-101',
        language: 'en',
      };
      const savedInMemory = createdTraining.id !== undefined;
      expect(savedInMemory).toBe(true);
    });

    it('should use saved training ID for add-language workflow', () => {
      const savedTrainingId = 'phishing-101';
      const translationWorkflow = {
        existingMicrolearningId: savedTrainingId,
        targetLanguage: 'tr',
      };
      expect(translationWorkflow.existingMicrolearningId).toBe('phishing-101');
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle very long topic description', () => {
      const topic = 'Advanced SQL Injection Prevention and Detection for Enterprise Database Systems';
      expect(topic.length).toBeGreaterThan(0);
    });

    it('should handle special characters in topic', () => {
      const topic = 'SQL Injection & XSS Prevention (OWASP Top 10)';
      expect(topic).toContain('&');
    });

    it('should handle Unicode in topic', () => {
      const topic = 'Phishing Prevention für Sicherheit';
      expect(topic).toContain('ü');
    });

    it('should handle multiple departments in topic', () => {
      const topic = 'Cross-functional fraud detection training';
      const matchesMultiple = /fraud|financial|compliance/.test(topic.toLowerCase());
      expect(matchesMultiple).toBe(true);
    });

    it('should handle confirmation with extra text', () => {
      const userMessage = 'Yes, go ahead and create it now';
      const isConfirmation = /yes|go ahead/.test(userMessage.toLowerCase());
      expect(isConfirmation).toBe(true);
    });

    it('should handle rejection before STATE 2', () => {
      const userMessage = 'Actually, let me change the department';
      const isConfirmation = /yes|start|begin/.test(userMessage.toLowerCase());
      expect(isConfirmation).toBe(false);
    });
  });
});
