import { describe, expect, it } from 'vitest';
import { buildRoutingContext, extractArtifactIdsFromRoutingContext } from './chat-request-helpers';

describe('chat-request-helpers artifact id extraction', () => {
    // ==================== BASIC EXTRACTION ====================
    describe('Basic Artifact Extraction', () => {
        it('extracts phishingId from phishing_email UI payload after routingContext cleaning', () => {
            const emailPayload = Buffer.from(JSON.stringify({ phishingId: 'ph-123', subject: 'x' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:phishing_email::${emailPayload}::/ui:phishing_email::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.phishingId).toBe('ph-123');
        });

        it('extracts microlearningId from training_meta UI payload after routingContext cleaning', () => {
            const trainingMeta = Buffer.from(JSON.stringify({ microlearningId: 'ml-999', trainingUrl: 'https://x/y' }), 'utf-8').toString(
                'base64'
            );

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:training_meta::${trainingMeta}::/ui:training_meta::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBe('ml-999');
        });

        it('returns the most recent ids when multiple are present', () => {
            // Use realistic ID lengths (our extractor expects >= 6 chars)
            const email1 = Buffer.from(JSON.stringify({ phishingId: 'ph-111111' }), 'utf-8').toString('base64');
            const email2 = Buffer.from(JSON.stringify({ phishingId: 'ph-222222' }), 'utf-8').toString('base64');
            const trainingMeta = Buffer.from(JSON.stringify({ microlearningId: 'ml-22222222' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:phishing_email::${email1}::/ui:phishing_email::\n` } as any,
                { role: 'assistant', content: `::ui:training_meta::${trainingMeta}::/ui:training_meta::\n` } as any,
                { role: 'assistant', content: `::ui:phishing_email::${email2}::/ui:phishing_email::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBe('ml-22222222');
            expect(ids.phishingId).toBe('ph-222222');
        });

        it('extracts operational IDs from tool summary lines', () => {
            const routingContext = buildRoutingContext([
                {
                    role: 'assistant',
                    content: `✅ Phishing uploaded: "Test Scenario". Ready to assign (resourceId=scenario-123, scenarioResourceId=scenario-123, landingPageResourceId=landing-999, phishingId=ph-777777).`
                } as any,
                {
                    role: 'assistant',
                    content: `✅ Training uploaded: "Security Basics". Ready to assign (resourceId=res-555, sendTrainingLanguageId=lang-456, microlearningId=ml-88888888).`
                } as any,
                {
                    role: 'assistant',
                    content: `✅ Phishing campaign assigned to USER user@company.com (campaignName="Phishing Campaign - user-789 (USER) Agentic Ally", resourceId=scenario-123, languageId=lang-abc).`
                } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('scenario-123');
            expect(ids.scenarioResourceId).toBe('scenario-123');
            expect(ids.landingPageResourceId).toBe('landing-999');
            expect(ids.phishingId).toBe('ph-777777');
            expect(ids.sendTrainingLanguageId).toBe('lang-456');
            expect(ids.microlearningId).toBe('ml-88888888');
            expect(ids.languageId).toBe('lang-abc');
        });
    });

    // ==================== MULTIPLE OCCURRENCES ====================
    describe('Multiple Occurrences', () => {
        it('returns most recent microlearningId when multiple present', () => {
            const training1 = Buffer.from(JSON.stringify({ microlearningId: 'ml-111111' }), 'utf-8').toString('base64');
            const training2 = Buffer.from(JSON.stringify({ microlearningId: 'ml-222222' }), 'utf-8').toString('base64');
            const training3 = Buffer.from(JSON.stringify({ microlearningId: 'ml-333333' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:training_meta::${training1}::/ui:training_meta::\n` } as any,
                { role: 'assistant', content: `::ui:training_meta::${training2}::/ui:training_meta::\n` } as any,
                { role: 'assistant', content: `::ui:training_meta::${training3}::/ui:training_meta::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBe('ml-333333');
        });

        it('returns most recent phishingId when multiple present', () => {
            const email1 = Buffer.from(JSON.stringify({ phishingId: 'ph-aaa111' }), 'utf-8').toString('base64');
            const email2 = Buffer.from(JSON.stringify({ phishingId: 'ph-bbb222' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:phishing_email::${email1}::/ui:phishing_email::\n` } as any,
                { role: 'assistant', content: `::ui:phishing_email::${email2}::/ui:phishing_email::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.phishingId).toBe('ph-bbb222');
        });

        it('returns most recent resourceId from tool summaries', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=first-123' } as any,
                { role: 'assistant', content: 'resourceId=second-456' } as any,
                { role: 'assistant', content: 'resourceId=third-789' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('third-789');
        });
    });

    // ==================== EDGE CASES ====================
    describe('Edge Cases', () => {
        it('returns empty object for empty routing context', () => {
            const ids = extractArtifactIdsFromRoutingContext('');
            expect(ids).toEqual({});
        });

        it('returns empty object for null routing context', () => {
            // @ts-ignore - testing runtime behavior
            const ids = extractArtifactIdsFromRoutingContext(null);
            expect(ids).toEqual({});
        });

        it('returns empty object for undefined routing context', () => {
            // @ts-ignore - testing runtime behavior
            const ids = extractArtifactIdsFromRoutingContext(undefined);
            expect(ids).toEqual({});
        });

        it('handles routing context with no IDs', () => {
            const routingContext = buildRoutingContext([
                { role: 'user', content: 'Hello' } as any,
                { role: 'assistant', content: 'Hi there!' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBeUndefined();
            expect(ids.phishingId).toBeUndefined();
            expect(ids.resourceId).toBeUndefined();
        });

        it('handles malformed base64 payload gracefully', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: '::ui:training_meta::INVALID_BASE64::/ui:training_meta::\n' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBeUndefined();
        });

        it('handles JSON without expected fields', () => {
            const payload = Buffer.from(JSON.stringify({ someOtherField: 'value' }), 'utf-8').toString('base64');
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:training_meta::${payload}::/ui:training_meta::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBeUndefined();
        });

        it('handles IDs shorter than minimum length (6 chars for microlearning/phishing)', () => {
            const payload = Buffer.from(JSON.stringify({ microlearningId: 'ml-1' }), 'utf-8').toString('base64');
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:training_meta::${payload}::/ui:training_meta::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBeUndefined();
        });

        it('extracts IDs with exactly 6 characters', () => {
            const payload = Buffer.from(JSON.stringify({ microlearningId: 'ml-123' }), 'utf-8').toString('base64');
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:training_meta::${payload}::/ui:training_meta::\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBe('ml-123');
        });

        it('extracts resourceId with minimum 3 characters', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=abc' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('abc');
        });

        it('ignores resourceId shorter than 3 characters', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=ab' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBeUndefined();
        });
    });

    // ==================== ID FORMATS ====================
    describe('ID Format Variations', () => {
        it('extracts IDs with hyphens', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=my-resource-123' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('my-resource-123');
        });

        it('extracts IDs with underscores', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=my_resource_456' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('my_resource_456');
        });

        it('extracts IDs with mixed alphanumeric and symbols', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=Res-123_ABC' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('Res-123_ABC');
        });

        it('extracts numeric-only IDs', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=123456' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('123456');
        });

        it('extracts letter-only IDs', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=abcdef' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('abcdef');
        });
    });

    // ==================== ALL ID TYPES ====================
    describe('All ID Type Extraction', () => {
        it('extracts targetUserResourceId', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'targetUserResourceId=user-123' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.targetUserResourceId).toBe('user-123');
        });

        it('extracts targetGroupResourceId', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'targetGroupResourceId=group-456' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.targetGroupResourceId).toBe('group-456');
        });

        it('extracts all ID types simultaneously', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=res-123, scenarioResourceId=scenario-456, landingPageResourceId=landing-789, languageId=lang-abc, sendTrainingLanguageId=lang-def, targetUserResourceId=user-ghi, targetGroupResourceId=group-jkl, phishingId=ph-123456, microlearningId=ml-789012' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('res-123');
            expect(ids.scenarioResourceId).toBe('scenario-456');
            expect(ids.landingPageResourceId).toBe('landing-789');
            expect(ids.languageId).toBe('lang-abc');
            expect(ids.sendTrainingLanguageId).toBe('lang-def');
            expect(ids.targetUserResourceId).toBe('user-ghi');
            expect(ids.targetGroupResourceId).toBe('group-jkl');
            expect(ids.phishingId).toBe('ph-123456');
            expect(ids.microlearningId).toBe('ml-789012');
        });
    });

    // ==================== UI SIGNAL VARIATIONS ====================
    describe('UI Signal Format Variations', () => {
        it('handles phishing_email without closing tag', () => {
            const emailPayload = Buffer.from(JSON.stringify({ phishingId: 'ph-999999' }), 'utf-8').toString('base64');
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:phishing_email::${emailPayload}\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.phishingId).toBe('ph-999999');
        });

        it('handles training_meta without closing tag', () => {
            const trainingMeta = Buffer.from(JSON.stringify({ microlearningId: 'ml-888888' }), 'utf-8').toString('base64');
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:training_meta::${trainingMeta}\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBe('ml-888888');
        });

        it('handles mixed UI signals with and without closing tags', () => {
            const email1 = Buffer.from(JSON.stringify({ phishingId: 'ph-111111' }), 'utf-8').toString('base64');
            const training1 = Buffer.from(JSON.stringify({ microlearningId: 'ml-222222' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:phishing_email::${email1}::/ui:phishing_email::\n` } as any,
                { role: 'assistant', content: `::ui:training_meta::${training1}\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.phishingId).toBe('ph-111111');
            expect(ids.microlearningId).toBe('ml-222222');
        });
    });

    // ==================== BOUNDARY CONDITIONS ====================
    describe('Boundary Conditions', () => {
        it('handles very long IDs', () => {
            const longId = 'a'.repeat(100);
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `resourceId=${longId}` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe(longId);
        });

        it('handles IDs at word boundaries', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'The resourceId=test-123 was created' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('test-123');
        });

        it('handles IDs at line boundaries', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=test-456\nNext line' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('test-456');
        });

        it('handles IDs with parentheses around them', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'Created (resourceId=test-789)' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('test-789');
        });
    });

    // ==================== MIXED CONTENT ====================
    describe('Mixed Content', () => {
        it('extracts IDs from messages with both UI payloads and tool summaries', () => {
            const emailPayload = Buffer.from(JSON.stringify({ phishingId: 'ph-aaa111' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:phishing_email::${emailPayload}::/ui:phishing_email::\n` } as any,
                { role: 'assistant', content: 'resourceId=res-bbb222, scenarioResourceId=scenario-ccc333' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.phishingId).toBe('ph-aaa111');
            expect(ids.resourceId).toBe('res-bbb222');
            expect(ids.scenarioResourceId).toBe('scenario-ccc333');
        });

        it('handles interleaved user and assistant messages', () => {
            const emailPayload = Buffer.from(JSON.stringify({ phishingId: 'ph-xyz123' }), 'utf-8').toString('base64');

            const routingContext = buildRoutingContext([
                { role: 'user', content: 'Create a phishing email' } as any,
                { role: 'assistant', content: `::ui:phishing_email::${emailPayload}::/ui:phishing_email::\n` } as any,
                { role: 'user', content: 'Upload it' } as any,
                { role: 'assistant', content: 'resourceId=res-456' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.phishingId).toBe('ph-xyz123');
            expect(ids.resourceId).toBe('res-456');
        });
    });

    // ==================== SPECIAL CHARACTERS ====================
    describe('Special Characters in Context', () => {
        it('handles IDs with special characters in surrounding text', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: '✅ Success! resourceId=test-123 ✓' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('test-123');
        });

        it('handles IDs in quoted text', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'Created "Campaign" (resourceId=campaign-456)' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('campaign-456');
        });

        it('handles IDs with commas and periods nearby', () => {
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: 'resourceId=test-789, languageId=en-US.' } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.resourceId).toBe('test-789');
            expect(ids.languageId).toBe('en-US');
        });
    });

    // ==================== CANVAS OPEN SIGNAL ====================
    describe('Canvas Open Signal', () => {
        it('extracts microlearningId from canvas_open URL', () => {
            const trainingUrl = 'https://example.com/training/ml-12345678';
            const routingContext = buildRoutingContext([
                { role: 'assistant', content: `::ui:canvas_open::${trainingUrl}\n` } as any,
            ]);

            const ids = extractArtifactIdsFromRoutingContext(routingContext);
            expect(ids.microlearningId).toBe('ml-12345678');
        });
    });

    // ==================== RETURN VALUE STRUCTURE ====================
    describe('Return Value Structure', () => {
        it('returns all fields even when undefined', () => {
            const ids = extractArtifactIdsFromRoutingContext('no ids here');
            expect(ids).toHaveProperty('microlearningId');
            expect(ids).toHaveProperty('phishingId');
            expect(ids).toHaveProperty('resourceId');
            expect(ids).toHaveProperty('scenarioResourceId');
            expect(ids).toHaveProperty('landingPageResourceId');
            expect(ids).toHaveProperty('languageId');
            expect(ids).toHaveProperty('sendTrainingLanguageId');
            expect(ids).toHaveProperty('targetUserResourceId');
            expect(ids).toHaveProperty('targetGroupResourceId');
        });

        it('returns object with undefined values when no IDs found', () => {
            const ids = extractArtifactIdsFromRoutingContext('plain text');
            expect(ids.microlearningId).toBeUndefined();
            expect(ids.phishingId).toBeUndefined();
            expect(ids.resourceId).toBeUndefined();
        });
    });
});
