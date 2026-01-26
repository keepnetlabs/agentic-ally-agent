import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTheme, generateSceneStructure, enhanceMicrolearningContent, generateMicrolearningJsonWithAI } from './microlearning-generator';
import * as ai from 'ai';

vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

vi.mock('../../../utils/content-processors/json-cleaner', () => ({
    cleanResponse: vi.fn((text) => text)
}));

// Define mock function outside to allow hoisting references
const mockGetWhitelabelingConfig = vi.fn();

// Mock the module so ProductService is a class (using a mock implementation)
// that returns an object with our mocked method.
vi.mock('../../../services/product-service', () => {
    return {
        ProductService: class {
            getWhitelabelingConfig = mockGetWhitelabelingConfig;
        }
    };
});

describe('microlearning-generator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateTheme', () => {
        it('should use default config if no whitelabeling', async () => {
            mockGetWhitelabelingConfig.mockResolvedValue(null);

            const theme = await generateTheme();
            expect(theme.colors.background).toContain('gray');
            expect(theme.logo.src).toBeDefined();
        });

        it('should use whitelabeling config if present', async () => {
            mockGetWhitelabelingConfig.mockResolvedValue({
                mainLogoUrl: 'custom-logo.png',
                brandName: 'Brand',
                minimizedMenuLogoUrl: 'min-logo.png'
            });

            const theme = await generateTheme('bg-gradient-blue');
            expect(theme.colors.background).toBe('bg-gradient-blue');
            expect(theme.logo.src).toBe('custom-logo.png');
            expect(theme.logo.alt).toBe('Brand');
        });

        it('should fall back to defaults if whitelabel config fetch fails', async () => {
            mockGetWhitelabelingConfig.mockRejectedValue(new Error('DB Error'));

            const theme = await generateTheme();
            // Just verifying it doesn't throw and returns defaults
            expect(theme.colors.background).toContain('gray');
            expect(theme.logo.src).toBeDefined();
        });
    });

    describe('generateSceneStructure', () => {
        it('should generate 8 scenes', () => {
            const scenes = generateSceneStructure(5);
            expect(scenes).toHaveLength(8);
        });

        it('should set scene 4 based on type', () => {
            const scenesCode = generateSceneStructure(5, 'code_review');
            expect(scenesCode[3].metadata.scene_type).toBe('code_review'); // Scene 4 is index 3

            const scenesAction = generateSceneStructure(5, 'actionable_content');
            expect(scenesAction[3].metadata.scene_type).toBe('actionable_content');

            const scenesVishing = generateSceneStructure(5, 'vishing_simulation');
            expect(scenesVishing[3].metadata.scene_type).toBe('vishing_simulation');
        });
    });

    describe('enhanceMicrolearningContent', () => {
        it('should return enhanced content from AI', async () => {
            const mockEnhanced = { some: 'data' };
            (ai.generateText as any).mockResolvedValue({
                text: JSON.stringify(mockEnhanced)
            });

            const input = {
                microlearning_metadata: { title: 'Old' },
                scenes: []
            } as any;

            const result = await enhanceMicrolearningContent(input, {} as any);
            expect(result).toEqual(mockEnhanced);
        });

        it('should return original content on AI failure', async () => {
            (ai.generateText as any).mockRejectedValue(new Error('AI Failed'));

            const input = {
                microlearning_metadata: { title: 'Old' },
                scenes: []
            } as any;

            const result = await enhanceMicrolearningContent(input, {} as any);
            expect(result).toBe(input);
        });
    });

    describe('generateMicrolearningJsonWithAI', () => {
        const mockModel = { provider: 'OPENAI', modelId: 'gpt-4' };
        const baseAnalysis = {
            title: 'Test Title',
            category: 'Security',
            subcategory: 'Phishing',
            industries: ['Tech'],
            department: 'IT',
            roles: ['Dev'],
            topic: 'Code Safety',
            level: 'intermediate',
            language: 'en',
            learningObjectives: ['Obj1'],
            duration: 5,
            isCodeTopic: false,
            regulationCompliance: ['ISO27001']
        };

        it('should construct correct metadata from analysis', async () => {
            (ai.generateText as any).mockResolvedValue({ text: JSON.stringify({ microlearning_id: 'test-id-1' }) });

            await generateMicrolearningJsonWithAI(baseAnalysis as any, 'test-id-1', mockModel as any);

            const callArgs = (ai.generateText as any).mock.calls[0][0];
            const prompt = callArgs.messages[1].content;

            expect(prompt).toContain('"microlearning_id": "test-id-1"');
            expect(prompt).toContain('"title": "Test Title"');
            // Check level casing transformation (intermediate -> Intermediate)
            expect(prompt).toContain('"level": "Intermediate"');
            expect(prompt).toContain('ISO27001');
            expect(prompt).toContain('"gamification_enabled": true');
        });

        it('should use code_review scene type for scene 4 when isCodeTopic is true', async () => {
            (ai.generateText as any).mockResolvedValue({ text: JSON.stringify({}) });

            const analysis = { ...baseAnalysis, isCodeTopic: true };
            await generateMicrolearningJsonWithAI(analysis as any, 'id', mockModel as any);

            const callArgs = (ai.generateText as any).mock.calls[0][0];
            const prompt = callArgs.messages[1].content;
            expect(prompt).toContain('"scene_type": "code_review"');
        });

        it('should use vishing_simulation scene type for scene 4 when isVishing is true', async () => {
            (ai.generateText as any).mockResolvedValue({ text: JSON.stringify({}) });

            const analysis = { ...baseAnalysis, isVishing: true };
            await generateMicrolearningJsonWithAI(analysis as any, 'id', mockModel as any);

            const callArgs = (ai.generateText as any).mock.calls[0][0];
            const prompt = callArgs.messages[1].content;
            expect(prompt).toContain('"scene_type": "vishing_simulation"');
        });

        it('should use actionable_content scene type for scene 4 when isCodeTopic is false', async () => {
            (ai.generateText as any).mockResolvedValue({ text: JSON.stringify({}) });

            const analysis = { ...baseAnalysis, isCodeTopic: false };
            await generateMicrolearningJsonWithAI(analysis as any, 'id', mockModel as any);

            const callArgs = (ai.generateText as any).mock.calls[0][0];
            const prompt = callArgs.messages[1].content;
            expect(prompt).toContain('"scene_type": "actionable_content"');
        });

        it('should parse and merge enhanced content from AI', async () => {
            const enhancedData = {
                microlearning_metadata: {
                    title: 'Enhanced Title'
                }
            };
            (ai.generateText as any).mockResolvedValue({ text: JSON.stringify(enhancedData) });

            const result = await generateMicrolearningJsonWithAI(baseAnalysis as any, 'id', mockModel as any);
            expect(result).toEqual(enhancedData);
        });

        it('should pass correct context to AI enhancement', async () => {
            (ai.generateText as any).mockResolvedValue({ text: '{}' });

            const analysis = { ...baseAnalysis, additionalContext: 'Must focus on OWASP top 10' };
            await generateMicrolearningJsonWithAI(analysis as any, 'id', mockModel as any);

            const callArgs = (ai.generateText as any).mock.calls[0][0];
            expect(callArgs.messages[1].content).toContain('Must focus on OWASP top 10');
        });

        it('should handle theme color correctly', async () => {
            (ai.generateText as any).mockResolvedValue({ text: JSON.stringify({ theme: { colors: { background: 'red' } } }) });

            await generateMicrolearningJsonWithAI({ ...baseAnalysis, themeColor: 'custom-bg' } as any, 'id', mockModel as any);

            const callArgs = (ai.generateText as any).mock.calls[0][0];
            const promptContent = callArgs.messages[1].content;
            expect(promptContent).toContain('custom-bg');
        });
    });
});
