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
});


