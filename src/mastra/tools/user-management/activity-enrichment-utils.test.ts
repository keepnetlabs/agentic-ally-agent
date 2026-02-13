import { describe, it, expect } from 'vitest';
import {
  categorizeAction,
  inferOutcome,
  calculateRisk,
  enrichActivity,
  enrichActivities,
  formatEnrichedActivitiesForPrompt,
  isSecurityPositive,
  formatTimeAgo,
  generateContext,
} from './activity-enrichment-utils';

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
        difficultyType: 'Hard',
      };

      const enriched = enrichActivity(raw);

      expect(enriched.actionCategory).toBe('PHISHING_LINK_CLICKED');
      expect(enriched.outcome).toBe('FAILED');
      expect(enriched.riskScore).toBeGreaterThan(0);
      expect(enriched.isSecurityPositive).toBe(false);
      expect(enriched.context).toContain('FAILED');
    });
  });

  describe('categorizeAction - Extended', () => {
    it('should handle smishing attacks', () => {
      // "Clicked Link" matches the pattern, so it returns PHISHING_LINK_CLICKED
      expect(categorizeAction('PHISHING', 'Clicked Link from SMS')).toBe('PHISHING_LINK_CLICKED');
    });

    it('should handle quishing attacks', () => {
      expect(categorizeAction('PHISHING', 'Scanned Malicious QR')).toBe('SCANNED_MALICIOUS_QR');
    });

    it('should handle vishing attacks', () => {
      expect(categorizeAction('PHISHING', 'Responded to Voice Call')).toBe('RESPONDED_TO_VOICE_CALL');
    });

    it('should categorize email opened', () => {
      expect(categorizeAction('SECURITY AWARENESS', 'Email Opened')).toBe('EMAIL_OPENED');
    });

    it('should categorize email sent', () => {
      expect(categorizeAction('SECURITY AWARENESS', 'Email Sent')).toBe('EMAIL_SENT');
    });

    it('should categorize incident reported', () => {
      expect(categorizeAction('INCIDENT', 'Reported Suspicious Email')).toBe('INCIDENT_REPORTED');
    });

    it('should handle unknown incident types', () => {
      expect(categorizeAction('INCIDENT', 'Created Ticket')).toBe('CREATED_TICKET');
    });
  });

  describe('calculateRisk - Extended', () => {
    it('should return 0 risk for neutral actions', () => {
      expect(calculateRisk('Easy', 'EMAIL_SENT', 0)).toBe(0);
    });

    it('should assign 70 risk for click actions', () => {
      expect(calculateRisk('Medium', 'PHISHING_LINK_CLICKED', -10)).toBe(70);
    });

    it('should assign 60 risk for other failures', () => {
      expect(calculateRisk('Hard', 'SCANNED_MALICIOUS_QR', -5)).toBe(60);
    });

    it('should return 0 for passed actions', () => {
      expect(calculateRisk('Medium', 'TRAINING_COMPLETED', 20)).toBe(0);
    });
  });

  describe('isSecurityPositive', () => {
    it('should return true for completed training', () => {
      expect(isSecurityPositive('TRAINING_COMPLETED', 'PASSED')).toBe(true);
    });

    it('should return true for incident reporting', () => {
      expect(isSecurityPositive('INCIDENT_REPORTED', 'NEUTRAL')).toBe(true);
    });

    it('should return false for failed phishing', () => {
      expect(isSecurityPositive('PHISHING_DATA_SUBMITTED', 'FAILED')).toBe(false);
    });

    it('should return false for neutral email actions', () => {
      expect(isSecurityPositive('EMAIL_OPENED', 'NEUTRAL')).toBe(false);
    });

    it('should return false for failed training', () => {
      expect(isSecurityPositive('TRAINING_COMPLETED', 'FAILED')).toBe(false);
    });
  });

  describe('formatTimeAgo', () => {
    it('should format recent time as minutes', () => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
      const formatted = `${String(fiveMinAgo.getDate()).padStart(2, '0')}/${String(fiveMinAgo.getMonth() + 1).padStart(2, '0')}/${fiveMinAgo.getFullYear()} ${String(fiveMinAgo.getHours()).padStart(2, '0')}:${String(fiveMinAgo.getMinutes()).padStart(2, '0')}`;
      expect(formatTimeAgo(formatted)).toContain('min ago');
    });

    it('should handle invalid date format gracefully', () => {
      // Invalid date still gets parsed by new Date() and produces a result
      // The function returns formatted output even for invalid inputs
      const result = formatTimeAgo('invalid-date');
      expect(typeof result).toBe('string');
    });

    it('should format empty string gracefully', () => {
      // Empty string gets parsed and produces a formatted result
      const result = formatTimeAgo('');
      expect(typeof result).toBe('string');
    });
  });

  describe('generateContext', () => {
    it('should generate context for data submission failure', () => {
      const raw = {
        ActionType: 'User Submitted Data',
        productType: 'PHISHING',
        points: -20,
        difficultyType: 'Hard',
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'PHISHING_DATA_SUBMITTED', 'FAILED');
      expect(context).toContain('FAILED');
      expect(context).toContain('submitted sensitive data');
      expect(context).toContain('Hard');
    });

    it('should generate context for link click failure', () => {
      const raw = {
        ActionType: 'Clicked Link',
        productType: 'PHISHING',
        points: -10,
        difficultyType: 'Medium',
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'PHISHING_LINK_CLICKED', 'FAILED');
      expect(context).toContain('FAILED');
      expect(context).toContain('clicked malicious link');
      expect(context).toContain('Medium');
    });

    it('should generate context for training completion', () => {
      const raw = {
        ActionType: 'Training Completed',
        productType: 'SECURITY AWARENESS',
        points: 50,
        categoryDescription: 'Phishing Awareness',
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'TRAINING_COMPLETED', 'PASSED');
      expect(context).toContain('PASSED');
      expect(context).toContain('completed training successfully');
      expect(context).toContain('50 points');
    });

    it('should generate context for email sent', () => {
      const raw = {
        ActionType: 'Email Sent',
        productType: 'SECURITY AWARENESS',
        points: 0,
        campaignType: 'Q1 Security Campaign',
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'EMAIL_SENT', 'NEUTRAL');
      expect(context).toContain('NEUTRAL');
      expect(context).toContain('Training campaign email delivered');
    });

    it('should generate context for email opened', () => {
      const raw = {
        ActionType: 'Email Opened',
        productType: 'SECURITY AWARENESS',
        points: 0,
        categoryDescription: 'Monthly Newsletter',
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'EMAIL_OPENED', 'NEUTRAL');
      expect(context).toContain('NEUTRAL');
      expect(context).toContain('opened training email');
    });

    it('should generate context for incident reporting', () => {
      const raw = {
        ActionType: 'Reported Suspicious Email',
        productType: 'INCIDENT',
        points: 10,
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'INCIDENT_REPORTED', 'NEUTRAL');
      expect(context).toContain('POSITIVE');
      expect(context).toContain('proactively reported');
    });

    it('should generate fallback context for unknown actions', () => {
      const raw = {
        ActionType: 'Unknown Action',
        productType: 'UNKNOWN',
        points: 5,
        ActionTime: '01/01/2025 12:00',
      };
      const context = generateContext(raw, 'UNKNOWN_ACTION', 'PASSED');
      expect(context).toContain('passed');
      expect(context).toContain('+5 points');
    });
  });

  describe('enrichActivities', () => {
    it('should enrich array of activities', () => {
      const activities = [
        {
          ActionType: 'Clicked Link',
          productType: 'PHISHING',
          points: -10,
          ActionTime: '01/01/2025 12:00',
          difficultyType: 'Hard',
        },
        {
          ActionType: 'Training Completed',
          productType: 'SECURITY AWARENESS',
          points: 20,
          ActionTime: '01/01/2025 13:00',
          difficultyType: 'Medium',
        },
      ];

      const enriched = enrichActivities(activities);

      expect(enriched).toHaveLength(2);
      expect(enriched[0].actionCategory).toBe('PHISHING_LINK_CLICKED');
      expect(enriched[1].actionCategory).toBe('TRAINING_COMPLETED');
    });

    it('should handle empty array', () => {
      expect(enrichActivities([])).toEqual([]);
    });
  });

  describe('formatEnrichedActivitiesForPrompt', () => {
    it('should format activities into prompt text', () => {
      const enriched = [
        {
          actionType: 'Clicked Link',
          productType: 'PHISHING',
          campaignName: 'Test Campaign',
          difficulty: 'Hard',
          category: undefined,
          points: -10,
          actionTime: '01/01/2025 12:00',
          actionCategory: 'PHISHING_LINK_CLICKED',
          outcome: 'FAILED' as const,
          riskScore: 70,
          isSecurityPositive: false,
          context: 'User clicked malicious link',
          timeAgo: '1h ago',
        },
      ];

      const formatted = formatEnrichedActivitiesForPrompt(enriched);

      expect(formatted).toContain('PHISHING_LINK_CLICKED');
      expect(formatted).toContain('Risk: 70/100');
      expect(formatted).toContain('1h ago');
    });

    it('should return NO DATA message for empty array', () => {
      expect(formatEnrichedActivitiesForPrompt([])).toBe('NO ACTIVITY DATA AVAILABLE');
    });

    it('should format multiple activities with newlines', () => {
      const activities = [
        {
          actionType: 'Action 1',
          productType: 'TYPE1',
          campaignName: 'Campaign 1',
          difficulty: 'Easy',
          category: undefined,
          points: 10,
          actionTime: '01/01/2025 12:00',
          actionCategory: 'CAT1',
          outcome: 'PASSED' as const,
          riskScore: 0,
          isSecurityPositive: true,
          context: 'Context 1',
          timeAgo: '1h ago',
        },
        {
          actionType: 'Action 2',
          productType: 'TYPE2',
          campaignName: 'Campaign 2',
          difficulty: 'Hard',
          category: undefined,
          points: -20,
          actionTime: '01/01/2025 13:00',
          actionCategory: 'CAT2',
          outcome: 'FAILED' as const,
          riskScore: 90,
          isSecurityPositive: false,
          context: 'Context 2',
          timeAgo: '2h ago',
        },
      ];

      const formatted = formatEnrichedActivitiesForPrompt(activities);

      expect(formatted).toContain('\n');
      expect(formatted.split('\n')).toHaveLength(2);
      expect(formatted).toContain('CAT1');
      expect(formatted).toContain('CAT2');
    });
  });
});
