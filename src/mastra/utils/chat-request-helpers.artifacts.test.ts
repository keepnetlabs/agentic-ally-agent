import { describe, expect, it } from 'vitest';
import { buildRoutingContext, extractArtifactIdsFromRoutingContext } from './chat-request-helpers';

describe('chat-request-helpers artifact id extraction', () => {
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


