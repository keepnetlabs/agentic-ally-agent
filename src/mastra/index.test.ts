
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Context } from 'hono';

// Mock data
const mockAgents = {
    getAgent: vi.fn(),
    getAgents: vi.fn().mockReturnValue({}),
    getWorkflows: vi.fn().mockReturnValue({})
};

// Mock dependencies BEFORE importing index.ts
vi.mock('@mastra/core/mastra', () => ({
    Mastra: class {
        constructor() {
            Object.assign(this, mockAgents);
        }
    }
}));

vi.mock('@mastra/loggers', () => ({
    PinoLogger: class {
        info = vi.fn();
        error = vi.fn();
        warn = vi.fn();
        debug = vi.fn();
    }
}));

const mockRegisterApiRoute = vi.fn();
vi.mock('@mastra/core/server', () => ({
    registerApiRoute: mockRegisterApiRoute
}));

// Mock helpers
vi.mock('./utils/chat-request-helpers', () => ({
    parseAndValidateRequest: vi.fn(),
    extractArtifactIdsFromRoutingContext: vi.fn().mockReturnValue({})
}));

vi.mock('./utils/chat-orchestration-helpers', () => ({
    extractAndPrepareThreadId: vi.fn(),
    buildFinalPromptWithModelOverride: vi.fn(),
    routeToAgent: vi.fn(),
    createAgentStream: vi.fn()
}));

vi.mock('./services', () => ({
    ExampleRepo: { getInstance: vi.fn() },
    executeAutonomousGeneration: vi.fn(),
    performHealthCheck: vi.fn()
}));

vi.mock('./utils/core', () => ({
    validateEnvironmentOrThrow: vi.fn()
}));

vi.mock('./deployer', () => ({
    getDeployer: vi.fn()
}));

vi.mock('./tools', () => ({
    codeReviewCheckTool: { execute: vi.fn() }
}));

vi.mock('./workflows', () => ({
    createMicrolearningWorkflow: {},
    addLanguageWorkflow: {},
    addMultipleLanguagesWorkflow: {},
    updateMicrolearningWorkflow: {}
}));


vi.mock('./agents', () => ({
    microlearningAgent: {},
    orchestratorAgent: {},
    phishingEmailAgent: {},
    userInfoAgent: {},
    policySummaryAgent: {}
}));


// Helper to get a mocked Context
const createMockContext = (body: any = {}, env: any = {}) => ({
    req: {
        json: vi.fn().mockResolvedValue(body),
        path: '/test'
    },
    env,
    get: vi.fn().mockReturnValue(mockAgents),
    json: vi.fn().mockImplementation((data, status) => ({ data, status })),
    executionCtx: {
        waitUntil: vi.fn()
    }
} as unknown as Context);

describe('Mastra API Routes (Integration)', () => {
    const handlers: Record<string, Function> = {};

    beforeEach(async () => {
        vi.clearAllMocks();
        mockRegisterApiRoute.mockClear();

        // Dynamic import to ensure mocks apply and to re-evaluate module if needed
        // (Though in Vitest modules are cached, so we rely on the initial load or setup)
        // Since we mocked registerApiRoute, we expect it to be called when index.ts is imported.
        // If it was already imported in other tests, we might need to resetModules.

        vi.resetModules();
        await import('./index');

        // Capture handlers from the mock calls
        // registerApiRoute(path, config)
        mockRegisterApiRoute.mock.calls.forEach((args: any[]) => {
            const [path, config] = args;
            handlers[path] = config.handler;
        });
    });

    describe('/chat endpoint', () => {
        it('should handle a valid chat request flow', async () => {
            const chatHandler = handlers['/chat'];
            expect(chatHandler).toBeDefined();

            // Setup mocks for success flow
            const { parseAndValidateRequest } = await import('./utils/chat-request-helpers');
            const { routeToAgent, createAgentStream } = await import('./utils/chat-orchestration-helpers');

            vi.mocked(parseAndValidateRequest).mockReturnValue({
                prompt: 'Hello',
                routingContext: 'User: test'
            } as any);

            vi.mocked(routeToAgent).mockResolvedValue({
                agentName: 'mockAgent' as any,
                taskContext: 'unmasked context'
            });

            mockAgents.getAgent.mockReturnValue({ name: 'mockAgent' });

            const mockStream = { toUIMessageStreamResponse: vi.fn().mockReturnValue('STREAM_RESPONSE') };
            vi.mocked(createAgentStream).mockResolvedValue(mockStream as any);

            const ctx = createMockContext({ prompt: 'Hello' });

            const response = await chatHandler(ctx);

            expect(response).toBe('STREAM_RESPONSE');
            expect(routeToAgent).toHaveBeenCalled();
            expect(createAgentStream).toHaveBeenCalled();
        });

        it('should return 400 if prompt parsing fails', async () => {
            const chatHandler = handlers['/chat'];
            const { parseAndValidateRequest } = await import('./utils/chat-request-helpers');

            vi.mocked(parseAndValidateRequest).mockReturnValue(null); // Fail validation

            const ctx = createMockContext({});
            const response = await chatHandler(ctx);

            expect(response.status).toBe(400);
            expect(response.data.message).toContain('Missing prompt');
        });

        it('should return 500 if routing fails', async () => {
            const chatHandler = handlers['/chat'];
            const { routeToAgent } = await import('./utils/chat-orchestration-helpers') as any;
            const helpers = await import('./utils/chat-request-helpers');

            vi.mocked(helpers.parseAndValidateRequest).mockReturnValue({ prompt: 'Hi', routingContext: '' } as any);

            vi.mocked(routeToAgent).mockRejectedValue(new Error('Routing died'));

            const ctx = createMockContext({ prompt: 'Hi' });
            const response = await chatHandler(ctx);

            expect(response.status).toBe(500);
            expect(response.data.error).toBe('Agent routing failed');
        });
    });

    describe('/health endpoint', () => {
        it('should return health status', async () => {
            const healthHandler = handlers['/health'];
            expect(healthHandler).toBeDefined();

            const { performHealthCheck } = await import('./services');
            vi.mocked(performHealthCheck).mockResolvedValue({ status: 'healthy', details: {} } as any);

            const ctx = createMockContext();
            const response = await healthHandler(ctx);

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
        });
    });

    describe('/autonomous endpoint', () => {
        it('should trigger workflow if binding exists', async () => {
            const autoHandler = handlers['/autonomous'];
            expect(autoHandler).toBeDefined();

            const mockWorkflow = { create: vi.fn().mockResolvedValue({ id: 'wf-123' }) };
            const env = { AUTONOMOUS_WORKFLOW: mockWorkflow };

            const body = {
                token: 'valid',
                firstName: 'John',
                actions: ['training']
            };

            const ctx = createMockContext(body, env);
            const response = await autoHandler(ctx);

            expect(response.status).toBe(202);
            expect(response.data.workflowId).toBe('wf-123');
            expect(mockWorkflow.create).toHaveBeenCalled();
        });

        it('should fall back to executeAutonomousGeneration if workflow binding missing', async () => {
            const autoHandler = handlers['/autonomous'];
            const { executeAutonomousGeneration } = await import('./services');

            vi.mocked(executeAutonomousGeneration).mockResolvedValue({ success: true } as any);

            const ctx = createMockContext({
                token: 'valid',
                firstName: 'John',
                actions: ['training']
            }, {}); // Empty env

            const response = await autoHandler(ctx);

            // The handler calls executeAutonomousGeneration inline as fallback 2 (since waintUntil failed/not mocked deeply enough or intended)
            // or via executionCtx if mocked. 
            // In my mockContext, executionCtx.waitUntil is a mock.

            // If waitUntil exists, it returns 200 processing.
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('processing');
            expect(ctx.executionCtx.waitUntil).toHaveBeenCalled();
        });

        it('should return 400 for invalid request body', async () => {
            const autoHandler = handlers['/autonomous'];
            const ctx = createMockContext({ token: '' }); // Missing token
            const response = await autoHandler(ctx);

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('Missing token');
        });
    });
});
