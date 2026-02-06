import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@mastra/ai-sdk', () => ({
    // v1: toAISdkFormat renamed to toAISdkStream
    toAISdkStream: vi.fn().mockReturnValue((async function* () { /* empty */ })())
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
    it('should initialize module without errors', async () => {
        // Just verify the module can be imported with all mocks in place
        const moduleImport = import('./index');
        await expect(moduleImport).resolves.toBeDefined();
    });
});
