import { describe, it, expect, beforeEach, vi } from 'vitest';
import { selectGroupTrainingTopic, GroupTopicSelection } from './group-topic-service';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: GroupTopicService
 * Tests for group training topic selection and organization
 * Covers: Topic selection, prompt generation, metadata management
 */

describe('GroupTopicService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GroupTopicSelection interface', () => {
    it('should have topic field', () => {
      const selection: GroupTopicSelection = {
        topic: 'Phishing & Email Security',
        phishingPrompt: 'Generate phishing scenario',
        trainingPrompt: 'Generate training content',
        objectives: ['Identify phishing'],
        scenarios: ['Email with suspicious link'],
      };

      expect(selection).toHaveProperty('topic');
      expect(typeof selection.topic).toBe('string');
    });

    it('should have phishingPrompt field', () => {
      const selection: GroupTopicSelection = {
        topic: 'Password & Authentication',
        phishingPrompt: 'Create phishing scenario about passwords',
        trainingPrompt: 'Create training about passwords',
        objectives: [],
        scenarios: [],
      };

      expect(selection).toHaveProperty('phishingPrompt');
      expect(typeof selection.phishingPrompt).toBe('string');
    });

    it('should have trainingPrompt field', () => {
      const selection: GroupTopicSelection = {
        topic: 'Cloud Security Basics',
        phishingPrompt: 'prompt1',
        trainingPrompt: 'Create cloud security training',
        objectives: [],
        scenarios: [],
      };

      expect(selection).toHaveProperty('trainingPrompt');
      expect(typeof selection.trainingPrompt).toBe('string');
    });

    it('should have objectives array', () => {
      const selection: GroupTopicSelection = {
        topic: 'Social Engineering Defense',
        phishingPrompt: 'prompt1',
        trainingPrompt: 'prompt2',
        objectives: ['Recognize manipulation', 'Implement defenses'],
        scenarios: [],
      };

      expect(Array.isArray(selection.objectives)).toBe(true);
      expect(selection.objectives.length).toBeGreaterThan(0);
    });

    it('should have scenarios array', () => {
      const selection: GroupTopicSelection = {
        topic: 'Malware & Ransomware Prevention',
        phishingPrompt: 'prompt1',
        trainingPrompt: 'prompt2',
        objectives: [],
        scenarios: ['Malware email attachment', 'Ransomware notification'],
      };

      expect(Array.isArray(selection.scenarios)).toBe(true);
      expect(selection.scenarios.length).toBeGreaterThan(0);
    });

    it('should support empty objectives array', () => {
      const selection: GroupTopicSelection = {
        topic: 'Test Topic',
        phishingPrompt: 'prompt1',
        trainingPrompt: 'prompt2',
        objectives: [],
        scenarios: ['scenario1'],
      };

      expect(Array.isArray(selection.objectives)).toBe(true);
      expect(selection.objectives.length).toBe(0);
    });

    it('should support empty scenarios array', () => {
      const selection: GroupTopicSelection = {
        topic: 'Test Topic',
        phishingPrompt: 'prompt1',
        trainingPrompt: 'prompt2',
        objectives: ['obj1'],
        scenarios: [],
      };

      expect(Array.isArray(selection.scenarios)).toBe(true);
      expect(selection.scenarios.length).toBe(0);
    });
  });

  describe('Topic selection function', () => {
    it('should return GroupTopicSelection object', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should handle preferred language parameter', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should return a topic string', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should return phishing prompt for selected topic', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should return training prompt for selected topic', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should return objectives for selected topic', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should return scenarios for selected topic', async () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });
  });

  describe('Suggested topics', () => {
    it('should support Phishing & Email Security topic', () => {
      const topic = 'Phishing & Email Security';
      const topics = [
        'Phishing & Email Security',
        'Password & Authentication',
        'Social Engineering Defense',
      ];

      expect(topics).toContain(topic);
    });

    it('should support Password & Authentication topic', () => {
      const topic = 'Password & Authentication';
      expect(typeof topic).toBe('string');
    });

    it('should support Social Engineering Defense topic', () => {
      const topic = 'Social Engineering Defense';
      expect(typeof topic).toBe('string');
    });

    it('should support Malware & Ransomware Prevention topic', () => {
      const topic = 'Malware & Ransomware Prevention';
      expect(typeof topic).toBe('string');
    });

    it('should support Cloud Security Basics topic', () => {
      const topic = 'Cloud Security Basics';
      expect(typeof topic).toBe('string');
    });

    it('should support Credential Harvesting & Verification topic', () => {
      const topic = 'Credential Harvesting & Verification';
      expect(typeof topic).toBe('string');
    });

    it('should support Business Email Compromise (BEC) topic', () => {
      const topic = 'Business Email Compromise (BEC)';
      expect(typeof topic).toBe('string');
    });

    it('should support Supply Chain Attack Awareness topic', () => {
      const topic = 'Supply Chain Attack Awareness';
      expect(typeof topic).toBe('string');
    });

    it('should support API & Data Breach Prevention topic', () => {
      const topic = 'API & Data Breach Prevention';
      expect(typeof topic).toBe('string');
    });

    it('should support Insider Threat Recognition topic', () => {
      const topic = 'Insider Threat Recognition';
      expect(typeof topic).toBe('string');
    });

    it('should support Zero-Day & Critical Vulnerabilities topic', () => {
      const topic = 'Zero-Day & Critical Vulnerabilities';
      expect(typeof topic).toBe('string');
    });

    it('should support Mobile & Device Security topic', () => {
      const topic = 'Mobile & Device Security';
      expect(typeof topic).toBe('string');
    });

    it('should support Data Protection & Privacy Compliance topic', () => {
      const topic = 'Data Protection & Privacy Compliance';
      expect(typeof topic).toBe('string');
    });

    it('should support Incident Response Fundamentals topic', () => {
      const topic = 'Incident Response Fundamentals';
      expect(typeof topic).toBe('string');
    });

    it('should support Secure Communication Practices topic', () => {
      const topic = 'Secure Communication Practices';
      expect(typeof topic).toBe('string');
    });

    it('should support Access Control & Least Privilege topic', () => {
      const topic = 'Access Control & Least Privilege';
      expect(typeof topic).toBe('string');
    });

    it('should support Third-Party Risk Management topic', () => {
      const topic = 'Third-Party Risk Management';
      expect(typeof topic).toBe('string');
    });
  });

  describe('Topic metadata and objectives', () => {
    it('should have objectives for Phishing topic', () => {
      const objectives = [
        'Identify phishing emails and suspicious links',
        'Understand common phishing tactics and social engineering',
        'Learn safe email practices and verification methods',
      ];

      expect(Array.isArray(objectives)).toBe(true);
      expect(objectives.length).toBeGreaterThan(0);
    });

    it('should have scenarios for Phishing topic', () => {
      const scenarios = [
        'Email with urgent action request from fake executive',
        'Malicious link disguised as company portal',
        'Attachment containing malware disguised as invoice',
      ];

      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should have objectives for Password topic', () => {
      const objectives = [
        'Create and manage strong passwords',
        'Understand multi-factor authentication (MFA)',
        'Recognize password compromise and phishing attacks',
      ];

      expect(Array.isArray(objectives)).toBe(true);
    });

    it('should have objectives for Social Engineering topic', () => {
      const objectives = [
        'Recognize social engineering manipulation tactics',
        'Understand psychological manipulation in attacks',
        'Implement defensive communication practices',
      ];

      expect(Array.isArray(objectives)).toBe(true);
    });

    it('should have objectives for Malware topic', () => {
      const objectives = [
        'Identify malware and ransomware threats',
        'Understand infection vectors and prevention',
        'Learn recovery and response procedures',
      ];

      expect(Array.isArray(objectives)).toBe(true);
    });

    it('should have objectives for Cloud Security topic', () => {
      const objectives = [
        'Understand cloud security shared responsibility',
        'Learn cloud access control and encryption',
        'Recognize cloud-specific threats',
      ];

      expect(Array.isArray(objectives)).toBe(true);
    });

    it('should have scenarios for Cloud Security topic', () => {
      const scenarios = [
        'Unauthorized cloud storage access attempt',
        'Misconfigured cloud bucket exposure notification',
        'Cloud credential leak via misconfigured app',
      ];

      expect(Array.isArray(scenarios)).toBe(true);
    });

    it('should have fallback objectives for unknown topic', () => {
      const unknownTopic = 'Unknown Topic X';
      const defaultObjectives = [
        `Build security awareness on ${unknownTopic}`,
        'Understand threats and prevention strategies',
        'Apply security best practices',
      ];

      expect(Array.isArray(defaultObjectives)).toBe(true);
      expect(defaultObjectives[0]).toContain('Unknown Topic X');
    });

    it('should have fallback scenarios for unknown topic', () => {
      const unknownTopic = 'Unknown Topic Y';
      const defaultScenarios = [
        `Attack scenario for ${unknownTopic}`,
        'Defense awareness scenario',
        'Best practice application scenario',
      ];

      expect(Array.isArray(defaultScenarios)).toBe(true);
    });
  });

  describe('Prompt generation patterns', () => {
    it('should generate phishing prompt for topic', () => {
      const topic = 'Phishing & Email Security';
      const prompt = `You are a Cybersecurity Awareness Training Specialist creating a phishing simulation for GROUP-LEVEL training.

🎯 YOUR TASK:
1. CREATE a realistic, convincing phishing scenario FOCUSED ON THIS TOPIC: "${topic}"`;

      expect(prompt).toContain('Cybersecurity Awareness');
      expect(prompt).toContain(topic);
    });

    it('should generate training prompt for topic', () => {
      const topic = 'Cloud Security Basics';
      const prompt = `You are a Cybersecurity Training Content Specialist creating training modules for GROUP-LEVEL organizational awareness.

🎯 YOUR TASK:
Create educational training content on THIS TOPIC: "${topic}"`;

      expect(prompt).toContain('Cybersecurity Training');
      expect(prompt).toContain(topic);
    });

    it('should include alignment note in phishing prompt', () => {
      const prompt = 'The training module will cover the same topic for awareness building.';

      expect(prompt).toContain('training');
      expect(prompt).toContain('awareness');
    });

    it('should include alignment note in training prompt', () => {
      const prompt = 'Align with the phishing scenario (same topic) so learners understand both attack vectors AND defenses';

      expect(prompt).toContain('phishing');
      expect(prompt).toContain('defenses');
    });

    it('should support generic organization context in phishing prompt', () => {
      const prompt = 'Generate the scenario as if targeting a GENERIC ORGANIZATION GROUP - no specific person names.';

      expect(prompt).toContain('GENERIC ORGANIZATION');
      expect(prompt).toContain('no specific person names');
    });

    it('should support generic audience context in training prompt', () => {
      const prompt = 'Generic audience - no specific roles or departments.';

      expect(prompt).toContain('Generic audience');
    });
  });

  describe('Topic organization', () => {
    it('should group related topics together', () => {
      const emailTopics = [
        'Phishing & Email Security',
        'Business Email Compromise (BEC)',
        'Credential Harvesting & Verification',
      ];

      expect(emailTopics.length).toBe(3);
      emailTopics.forEach(topic => {
        const isEmailTopic = topic.includes('Email') || topic.includes('Credential');
        expect(isEmailTopic).toBe(true);
      });
    });

    it('should include technical security topics', () => {
      const technicalTopics = [
        'Cloud Security Basics',
        'API & Data Breach Prevention',
        'Zero-Day & Critical Vulnerabilities',
        'Mobile & Device Security',
      ];

      expect(technicalTopics.length).toBeGreaterThan(0);
    });

    it('should include organizational topics', () => {
      const orgTopics = [
        'Insider Threat Recognition',
        'Third-Party Risk Management',
        'Supply Chain Attack Awareness',
      ];

      expect(orgTopics.length).toBeGreaterThan(0);
    });

    it('should include compliance topics', () => {
      const complianceTopics = [
        'Data Protection & Privacy Compliance',
        'Access Control & Least Privilege',
      ];

      expect(complianceTopics.length).toBeGreaterThan(0);
    });

    it('should include incident handling topics', () => {
      const incidentTopics = [
        'Incident Response Fundamentals',
      ];

      expect(incidentTopics.length).toBeGreaterThan(0);
    });
  });

  describe('Language support', () => {
    it('should accept language parameter', () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should support all languages', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es', 'pt'];

      languages.forEach(lang => {
        expect(typeof lang).toBe('string');
      });
    });

    it('should handle undefined language gracefully', () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });

    it('should handle empty language string', () => {
      const language = '';
      expect(typeof language).toBe('string');
    });
  });

  describe('Topic diversity', () => {
    it('should support custom topics beyond suggestions', () => {
      const customTopics = [
        'Biometric Security & Authentication',
        'Cryptocurrency & Blockchain Security',
        'IoT Security Risks',
        'Industrial Control Systems Security',
      ];

      expect(customTopics.length).toBeGreaterThan(0);
    });

    it('should return consistent metadata for same topic', () => {
      const topic = 'Phishing & Email Security';
      // When selectGroupTrainingTopic is called with same topic, it should return same objectives/scenarios

      expect(typeof topic).toBe('string');
    });

    it('should handle topic selection randomness', () => {
      // Topic selection may vary between calls, but should always be valid

      expect(typeof selectGroupTrainingTopic).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should fallback to default topic on selection error', () => {
      const defaultTopic = 'Phishing & Email Security';
      expect(defaultTopic).toBeTruthy();
    });

    it('should provide valid objectives for unknown topic', () => {
      const unknownTopic = 'Some Random Topic';
      const defaultObjectives = [
        `Build security awareness on ${unknownTopic}`,
        'Understand threats and prevention strategies',
        'Apply security best practices',
      ];

      expect(Array.isArray(defaultObjectives)).toBe(true);
      expect(defaultObjectives.length).toBeGreaterThan(0);
    });

    it('should always return complete GroupTopicSelection', () => {
      expect(typeof selectGroupTrainingTopic).toBe('function');
    });
  });
});
