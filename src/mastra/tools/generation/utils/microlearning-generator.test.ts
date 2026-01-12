import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTheme, generateSceneStructure, enhanceMicrolearningContent } from './microlearning-generator';
import * as ai from 'ai';

vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

// Define mock function outside to allow hoisting references
const mockGetWhitelabelingConfig = vi.fn();

// Mock the module so ProductService is a class (using a mock implementation)
// that returns an object with our mocked method.
vi.mock('../../../services/product-service', () => {
    return {
        ProductService: vi.fn().mockImplementation(() => {
            return {
                getWhitelabelingConfig: mockGetWhitelabelingConfig
            };
        })
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
});
