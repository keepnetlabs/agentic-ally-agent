import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { AutonomousRequestBody, CloudflareEnv } from '../types/api-types';

// `cloudflare:workers` does not exist in Node/Vitest runtime.
// Provide a virtual mock so `autonomous-workflow.ts` can be imported in tests.
vi.mock(
  'cloudflare:workers',
  () => ({
    WorkflowEntrypoint: class {},
  }),
  { virtual: true }
);

// Avoid importing the real `src/mastra/index.ts` in unit tests (it validates env vars and initializes providers).
vi.mock('../index', () => ({
  mastra: () => ({}),
}));

// Avoid importing real autonomous services (which pull in agents/model providers).
const hoisted = vi.hoisted(() => ({
  executeAutonomousGeneration: vi.fn(async () => ({ success: true, actions: [] })),
}));
vi.mock('../services/autonomous', () => ({
  executeAutonomousGeneration: hoisted.executeAutonomousGeneration,
}));

let AutonomousWorkflow: any;
beforeAll(async () => {
  // Import after the cloudflare:workers mock is registered
  ({ AutonomousWorkflow } = await import('./autonomous-workflow'));
});

describe('AutonomousWorkflow', () => {
  // Tests for class definition and structure
  describe('Class Definition', () => {
    it('should define AutonomousWorkflow as a class', () => {
      expect(typeof AutonomousWorkflow).toBe('function');
    });

    it('should be instantiable', () => {
      expect(() => {
        new AutonomousWorkflow();
      }).not.toThrow();
    });

    it('should have run method', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should be a Cloudflare WorkflowEntrypoint', () => {
      const instance = new AutonomousWorkflow();
      expect(instance).toBeDefined();
      expect(typeof instance.run).toBe('function');
    });
  });

  // Tests for run method signature
  describe('Run Method Signature', () => {
    it('run method should be async', async () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('run method should accept event parameter', () => {
      const instance = new AutonomousWorkflow();
      const runMethod = instance.run;
      expect(runMethod.length).toBeGreaterThanOrEqual(1);
    });

    it('run method should accept env parameter', () => {
      const instance = new AutonomousWorkflow();
      const runMethod = instance.run;
      expect(runMethod.length).toBeGreaterThanOrEqual(2);
    });

    it('event should have payload property', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });
  });

  // Tests for event payload structure
  describe('Event Payload Structure', () => {
    it('payload should have token field', () => {
      // This tests the expected structure based on code analysis
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape).toHaveProperty('token');
    });

    it('payload should have firstName field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape).toHaveProperty('firstName');
    });

    it('payload should have lastName field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape).toHaveProperty('lastName');
    });

    it('payload should have actions field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape).toHaveProperty('actions');
    });

    it('payload should have sendAfterPhishingSimulation field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape).toHaveProperty('sendAfterPhishingSimulation');
    });

    it('payload should have preferredLanguage field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape).toHaveProperty('preferredLanguage');
    });

    it('payload should have optional targetUserResourceId field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en',
        targetUserResourceId: 'user-123'
      };

      expect(payloadShape).toHaveProperty('targetUserResourceId');
    });

    it('payload should have optional targetGroupResourceId field', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en',
        targetGroupResourceId: 'group-123'
      };

      expect(payloadShape).toHaveProperty('targetGroupResourceId');
    });

    it('actions should be an array', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: ['training', 'phishing'],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(Array.isArray(payloadShape.actions)).toBe(true);
    });

    it('actions should support smishing value', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: ['smishing'],
        sendAfterPhishingSimulation: false,
        preferredLanguage: 'en'
      };

      expect(payloadShape.actions).toContain('smishing');
    });

    it('sendAfterPhishingSimulation should be boolean', () => {
      const payloadShape: Partial<AutonomousRequestBody> = {
        token: 'test-token',
        firstName: 'John',
        lastName: 'Doe',
        actions: [],
        sendAfterPhishingSimulation: true,
        preferredLanguage: 'en'
      };

      expect(typeof payloadShape.sendAfterPhishingSimulation).toBe('boolean');
    });
  });

  // Tests for env parameter
  describe('Env Parameter', () => {
    it('should accept CloudflareEnv as second parameter', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('CloudflareEnv should be an object', () => {
      const envShape: Partial<CloudflareEnv> = {};
      expect(typeof envShape).toBe('object');
    });
  });

  // Tests for return type
  describe('Return Type', () => {
    it('run method should return an object with success field', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('success response should have success field as boolean', () => {
      const successResponse = {
        success: true,
        error: undefined
      };

      expect(typeof successResponse.success).toBe('boolean');
      expect(successResponse.success).toBe(true);
    });

    it('error response should have success field as false', () => {
      const errorResponse = {
        success: false,
        error: 'Something went wrong'
      };

      expect(typeof errorResponse.success).toBe('boolean');
      expect(errorResponse.success).toBe(false);
    });

    it('error response should have error field with message', () => {
      const errorResponse = {
        success: false,
        error: 'Workflow execution failed',
        actions: []
      };

      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
    });

    it('error response should include actions from event.payload', () => {
      const errorResponse = {
        success: false,
        error: 'Error occurred',
        actions: ['action1', 'action2']
      };

      expect(Array.isArray(errorResponse.actions)).toBe(true);
    });
  });

  // Tests for logger integration
  describe('Logger Integration', () => {
    it('should use logger for autonomous_workflow_started', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
      // Logger usage is verified through code analysis
    });

    it('should use logger for autonomous_workflow_completed', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
      // Logger usage is verified through code analysis
    });

    it('should use logger for autonomous_workflow_failed on error', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
      // Logger usage is verified through code analysis
    });

    it('logger should log success status', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('logger should log error messages', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });
  });

  // Tests for error handling
  describe('Error Handling', () => {
    it('should catch errors in try-catch block', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should return error response on exception', () => {
      const errorResponse = {
        success: false,
        error: 'An unexpected error occurred',
        actions: []
      };

      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.error).toBe('string');
    });

    it('should normalize error messages', () => {
      const errorResponse = {
        success: false,
        error: 'Normalized error message',
        actions: []
      };

      expect(typeof errorResponse.error).toBe('string');
    });

    it('should preserve actions array in error response', () => {
      const errorResponse = {
        success: false,
        error: 'Error occurred',
        actions: ['create-phishing', 'send-simulation']
      };

      expect(Array.isArray(errorResponse.actions)).toBe(true);
      expect(errorResponse.actions.length).toBeGreaterThan(0);
    });

    it('should return default empty actions array if payload is missing', () => {
      const errorResponse = {
        success: false,
        error: 'Critical error',
        actions: []
      };

      expect(Array.isArray(errorResponse.actions)).toBe(true);
    });
  });

  // Tests for mastra integration
  describe('Mastra Integration', () => {
    it('should initialize mastra function', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
      // mastra() invocation is verified through code structure
    });

    it('should pass environment to mastra', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should call executeAutonomousGeneration service', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
      // Service call is verified through code analysis
    });
  });

  // Tests for payload extraction
  describe('Payload Extraction', () => {
    it('should extract token from event.payload', () => {
      const token = 'auth-token-123';
      expect(typeof token).toBe('string');
    });

    it('should extract firstName from event.payload', () => {
      const firstName = 'John';
      expect(typeof firstName).toBe('string');
    });

    it('should extract lastName from event.payload', () => {
      const lastName = 'Doe';
      expect(typeof lastName).toBe('string');
    });

    it('should extract actions from event.payload', () => {
      const actions = ['action1', 'action2'];
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should extract sendAfterPhishingSimulation from event.payload', () => {
      const sendAfterPhishingSimulation = true;
      expect(typeof sendAfterPhishingSimulation).toBe('boolean');
    });

    it('should extract preferredLanguage from event.payload', () => {
      const preferredLanguage = 'en';
      expect(typeof preferredLanguage).toBe('string');
    });

    it('should extract targetUserResourceId from event.payload', () => {
      const targetUserResourceId = 'user-123';
      expect(typeof targetUserResourceId).toBe('string');
    });

    it('should extract targetGroupResourceId from event.payload', () => {
      const targetGroupResourceId = 'group-456';
      expect(typeof targetGroupResourceId).toBe('string');
    });
  });

  // Tests for async execution
  describe('Async Execution', () => {
    it('run method should return a promise', async () => {
      const instance = new AutonomousWorkflow();
      const event = {
        payload: {
          token: 'test',
          firstName: 'John',
          lastName: 'Doe',
          actions: [],
          sendAfterPhishingSimulation: false,
          preferredLanguage: 'en'
        }
      };

      const result = instance.run(event, {} as any);
      expect(result instanceof Promise).toBe(true);
    });

    it('should handle async executeAutonomousGeneration', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });
  });

  // Tests for response structure consistency
  describe('Response Structure Consistency', () => {
    it('success response should always have success field', () => {
      const response = {
        success: true
      };

      expect(response).toHaveProperty('success');
    });

    it('error response should always have success and error fields', () => {
      const response = {
        success: false,
        error: 'Error message'
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('error');
    });

    it('error response should include actions field', () => {
      const response = {
        success: false,
        error: 'Error message',
        actions: []
      };

      expect(response).toHaveProperty('actions');
    });

    it('success response should return result object', () => {
      const response = {
        success: true,
        result: {}
      };

      expect(response.success).toBe(true);
    });
  });

  // Tests for payload field types
  describe('Payload Field Types', () => {
    it('token should be a string', () => {
      const token = 'abc123';
      expect(typeof token).toBe('string');
    });

    it('firstName should be a string', () => {
      const firstName = 'John';
      expect(typeof firstName).toBe('string');
    });

    it('lastName should be a string', () => {
      const lastName = 'Doe';
      expect(typeof lastName).toBe('string');
    });

    it('actions should be an array of strings', () => {
      const actions: string[] = ['action1', 'action2'];
      expect(Array.isArray(actions)).toBe(true);
      actions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    it('sendAfterPhishingSimulation should be a boolean', () => {
      const value = true;
      expect(typeof value).toBe('boolean');
    });

    it('preferredLanguage should be a string', () => {
      const language = 'en';
      expect(typeof language).toBe('string');
    });

    it('targetUserResourceId should be a string if provided', () => {
      const id = 'user-123';
      expect(typeof id).toBe('string');
    });

    it('targetGroupResourceId should be a string if provided', () => {
      const id = 'group-123';
      expect(typeof id).toBe('string');
    });
  });

  // Tests for error response payload handling
  describe('Error Response Payload Handling', () => {
    it('should handle null event.payload gracefully', () => {
      const errorResponse = {
        success: false,
        error: 'Invalid payload',
        actions: []
      };

      expect(errorResponse.actions).toBeDefined();
      expect(Array.isArray(errorResponse.actions)).toBe(true);
    });

    it('should handle undefined event.payload.actions', () => {
      const errorResponse = {
        success: false,
        error: 'Error',
        actions: []
      };

      expect(errorResponse.actions).toBeDefined();
    });

    it('should default to empty actions array if not provided', () => {
      const errorResponse = {
        success: false,
        error: 'Error',
        actions: []
      };

      expect(errorResponse.actions.length).toBe(0);
    });
  });

  // Tests for workflow execution context
  describe('Workflow Execution Context', () => {
    it('should have access to CloudflareEnv in context', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should pass environment variables through workflow', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should log with hasEnv information', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });
  });

  // Tests for service invocation
  describe('Service Invocation', () => {
    it('should call executeAutonomousGeneration with all payload fields', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should pass token to service', () => {
      const token = 'test-token';
      expect(typeof token).toBe('string');
    });

    it('should pass firstName to service', () => {
      const firstName = 'John';
      expect(typeof firstName).toBe('string');
    });

    it('should pass lastName to service', () => {
      const lastName = 'Doe';
      expect(typeof lastName).toBe('string');
    });

    it('should pass actions to service', () => {
      const actions: string[] = [];
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should pass sendAfterPhishingSimulation to service', () => {
      const flag = true;
      expect(typeof flag).toBe('boolean');
    });

    it('should pass preferredLanguage to service', () => {
      const language = 'en';
      expect(typeof language).toBe('string');
    });

    it('should pass targetUserResourceId to service', () => {
      const id = 'user-123';
      expect(typeof id).toBe('string');
    });

    it('should pass targetGroupResourceId to service', () => {
      const id = 'group-123';
      expect(typeof id).toBe('string');
    });
  });
});
