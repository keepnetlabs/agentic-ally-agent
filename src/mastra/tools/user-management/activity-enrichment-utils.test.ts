import { describe, it, expect } from 'vitest';
import { categorizeAction, inferOutcome, calculateRisk, enrichActivity } from './activity-enrichment-utils';

describe('activity-enrichment-utils', () => {
    describe('categorizeAction', () => {
        it('should categorize phishing data submission', () => {
            expect(categorizeAction('PHISHING', 'User Submitted Data')).toBe('PHISHING_DATA_SUBMITTED');
        });

        it('should categorize training completion', () => {
            expect(categorizeAction('SECURITY AWARENESS', 'Training Completed')).toBe('TRAINING_COMPLETED');
        });

        it('should normalize unknown types', () => {
            expect(categorizeAction('UNKNOWN', 'Some Action')).toBe('SOME_ACTION');
        });
    });

    describe('inferOutcome', () => {
        it('should return PASSED for positive points', () => {
            expect(inferOutcome(10)).toBe('PASSED');
        });
        it('should return FAILED for negative points', () => {
            expect(inferOutcome(-10)).toBe('FAILED');
        });
        it('should return NEUTRAL for zero points', () => {
            expect(inferOutcome(0)).toBe('NEUTRAL');
        });
    });

    describe('calculateRisk', () => {
        it('should assign high risk for data submission failure', () => {
            expect(calculateRisk('Medium', 'PHISHING_DATA_SUBMITTED', -10)).toBe(90);
        });
        it('should assign 0 risk for success', () => {
            expect(calculateRisk('Medium', 'PHISHING_LINK_CLICKED', 10)).toBe(0);
        });
    });

    describe('enrichActivity', () => {
        it('should enrich raw activity with correct fields', () => {
            const raw = {
                ActionType: 'Clicked Link',
                productType: 'PHISHING',
                points: -10,
                ActionTime: '01/01/2025 12:00',
                difficultyType: 'Hard'
            };

            const enriched = enrichActivity(raw);

            expect(enriched.actionCategory).toBe('PHISHING_LINK_CLICKED');
            expect(enriched.outcome).toBe('FAILED');
            expect(enriched.riskScore).toBeGreaterThan(0);
            expect(enriched.isSecurityPositive).toBe(false);
            expect(enriched.context).toContain('FAILED');
        });
    });
});
