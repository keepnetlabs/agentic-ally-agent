import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAutonomousGeneration } from './services';

// Mock dependencies BEFORE importing index.ts
vi.mock('@mastra/core/mastra', () => ({
    Mastra: class {
        constructor() {}
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

vi.mock('@mastra/core/server', () => ({
    registerApiRoute: vi.fn()
}));

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
    smishingSmsAgent: {},
    policySummaryAgent: {},
    userInfoAgent: {}
}));

describe('Mastra API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    async function getAutonomousHandler() {
        const { registerApiRoute } = await import('@mastra/core/server');
        await import('./index');

        const registerApiRouteMock = vi.mocked(registerApiRoute);
        const autonomousCall = registerApiRouteMock.mock.calls.find(
            ([path]) => path === '/autonomous'
        );

        if (!autonomousCall) {
            throw new Error('Autonomous route not registered');
        }

        const routeConfig = autonomousCall[1] as { handler: (c: any) => Promise<unknown> };
        return routeConfig.handler;
    }

    it('should initialize module without errors', async () => {
        const moduleImport = import('./index');
        await expect(moduleImport).resolves.toBeDefined();
    });

    it('autonomous endpoint returns processing contract when waitUntil is available', async () => {
        const handler = await getAutonomousHandler();
        const executeAutonomousGenerationMock = vi.mocked(executeAutonomousGeneration);
        executeAutonomousGenerationMock.mockResolvedValue({
            success: true,
            actions: ['smishing'],
        } as any);

        const json = vi.fn();
        const waitUntil = vi.fn();

        const ctx = {
            req: {
                json: vi.fn().mockResolvedValue({
                    token: 'token-123',
                    actions: ['smishing'],
                    targetGroupResourceId: 'group-1',
                }),
            },
            env: {},
            executionCtx: { waitUntil },
            json,
        } as any;

        await handler(ctx);

        expect(waitUntil).toHaveBeenCalledTimes(1);
        expect(json).toHaveBeenCalledTimes(1);

        const [payload, status] = json.mock.calls[0];
        expect(status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            status: 'processing',
            assignmentType: 'group',
            actions: ['smishing'],
        });
    });

    it('autonomous endpoint returns completed contract on inline fallback', async () => {
        const handler = await getAutonomousHandler();
        const executeAutonomousGenerationMock = vi.mocked(executeAutonomousGeneration);
        executeAutonomousGenerationMock.mockResolvedValue({
            success: true,
            actions: ['training', 'smishing'],
            message: 'User analysis and content generation completed',
            userInfo: {
                targetUserResourceId: 'user-42',
                preferredLanguage: 'en-gb',
            },
            trainingResult: { success: true, message: 'training ok' },
            smishingResult: { success: false, error: 'No recommended smishing content found in analysis report' },
        } as any);

        const json = vi.fn();
        const ctx = {
            req: {
                json: vi.fn().mockResolvedValue({
                    token: 'token-123',
                    actions: ['training', 'smishing'],
                    targetUserResourceId: 'user-42',
                }),
            },
            env: {},
            // no executionCtx.waitUntil => inline fallback
            json,
        } as any;

        await handler(ctx);

        expect(json).toHaveBeenCalledTimes(1);
        const [payload, status] = json.mock.calls[0];

        expect(status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            status: 'completed',
            actions: ['training', 'smishing'],
            message: 'User analysis and content generation completed',
            userInfo: {
                targetUserResourceId: 'user-42',
            },
            trainingResult: {
                success: true,
            },
            smishingResult: {
                success: false,
            },
        });
    });
});
