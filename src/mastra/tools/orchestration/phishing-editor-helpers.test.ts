
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    loadPhishingContent,
    parseAndValidateEmailResponse,
    savePhishingContent,
    ExistingEmail,
    ExistingLanding,
    EditedLanding
} from './phishing-editor-helpers';
import { KVService } from '../../services/kv-service';
import { KV_NAMESPACES } from '../../constants';

// Mock dependencies
vi.mock('../../services/kv-service');
vi.mock('../../utils/core/logger', () => ({
    getLogger: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    })),
}));

// Mock cleanResponse to just return the input if already valid JSON or clean it simply
vi.mock('../../utils/content-processors/json-cleaner', () => ({
    cleanResponse: vi.fn((text) => text),
}));

describe('Phishing Editor Helpers', () => {

    describe('loadPhishingContent', () => {
        let mockKvGet: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            vi.clearAllMocks();
            mockKvGet = vi.fn();

            const MockKVService = vi.mocked(KVService);
            MockKVService.mockImplementation(function () {
                return {
                    get: mockKvGet,
                    put: vi.fn(),
                    delete: vi.fn(),
                    list: vi.fn()
                } as any;
            });
        });

        it('should load content successfully when all keys exist', async () => {
            const phishingId = 'test-id';
            const language = 'en-GB';

            const mockBase = { method: 'POST', isQuishing: false };
            const mockEmail: ExistingEmail = { subject: 'Test', template: '<html></html>', fromAddress: 'test@example.com' };
            const mockLanding: ExistingLanding = { pages: [{ type: 'login', template: '<html></html>', summary: 'Login' }] };

            mockKvGet.mockResolvedValueOnce(mockBase);   // base
            mockKvGet.mockResolvedValueOnce(mockEmail);  // email
            mockKvGet.mockResolvedValueOnce(mockLanding); // landing

            const result = await loadPhishingContent(phishingId, language);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.content.base).toEqual(mockBase);
                expect(result.content.email).toEqual(mockEmail);
                expect(result.content.landing).toEqual(mockLanding);
                expect(result.content.emailKey).toContain(phishingId);
                expect(result.content.emailKey).toContain('en-gb'); // Normalized language in key
            }
        });

        it('should return error if neither email nor landing exists', async () => {
            mockKvGet.mockResolvedValue(null);

            const result = await loadPhishingContent('test-id', 'en-GB');

            expect(result.success).toBe(false);
            // @ts-ignore
            expect(result.error).toBeDefined();
        });

        it('should succeed with only landing page', async () => {
            const mockLanding: ExistingLanding = { pages: [{ type: 'login', template: '<html></html>', summary: 'Login' }] };

            mockKvGet.mockResolvedValueOnce(null); // base
            mockKvGet.mockResolvedValueOnce(null); // email
            mockKvGet.mockResolvedValueOnce(mockLanding); // landing

            const result = await loadPhishingContent('test-id', 'en-US');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.content.email).toBeNull();
                expect(result.content.landing).toEqual(mockLanding);
            }
        });
    });

    describe('parseAndValidateEmailResponse', () => {
        it('should validate correct email response', () => {
            const validResponse = JSON.stringify({
                subject: "New Subject",
                template: "<html><body>New Body</body></html>",
                summary: "Updated subject and body"
            });

            const result = parseAndValidateEmailResponse(validResponse);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.email.subject).toBe("New Subject");
                expect(result.email.template).toBe("<html><body>New Body</body></html>");
            }
        });

        it('should fail on invalid JSON', () => {
            const result = parseAndValidateEmailResponse("{ invalid json");
            expect(result.success).toBe(false);
        });

        it('should fail if schema attributes validation fails', () => {
            const invalidResponse = JSON.stringify({
                subject: "Subject Only"
                // missing template and summary
            });

            const result = parseAndValidateEmailResponse(invalidResponse);
            expect(result.success).toBe(false);
        });
    });

    describe('savePhishingContent', () => {
        let mockKvPut: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            vi.clearAllMocks();
            mockKvPut = vi.fn();

            const MockKVService = vi.mocked(KVService);
            MockKVService.mockImplementation(function () {
                return {
                    get: vi.fn(),
                    put: mockKvPut,
                    delete: vi.fn(),
                    list: vi.fn()
                } as any;
            });
        });

        it('should save email if provided', async () => {
            const updatedEmail = {
                subject: 'Updated',
                template: 'Template',
                lastModified: 12345
            };

            await savePhishingContent('email-key', 'landing-key', updatedEmail, null, null);

            expect(mockKvPut).toHaveBeenCalledWith('email-key', updatedEmail);
            expect(mockKvPut).toHaveBeenCalledTimes(1);
        });

        it('should save landing if edited', async () => {
            const existingLanding: ExistingLanding = { pages: [] };
            const editedLanding: EditedLanding = { pages: [{ type: 'login', template: 'New', summary: 'Sum', edited: true }], summary: 'Sum' };

            await savePhishingContent('email-key', 'landing-key', null, existingLanding, editedLanding);

            expect(mockKvPut).toHaveBeenCalledWith('landing-key', expect.objectContaining({
                pages: editedLanding.pages
            }));
        });
    });
});
