import { describe, it, expect } from 'vitest';
import { generateScene4SmishingPrompt } from './scene4-smishing-generator';

describe('generateScene4SmishingPrompt', () => {
  const analysis: any = {
    language: 'en-gb',
    topic: 'SMS phishing',
  };
  const microlearning: any = {
    microlearning_id: 'smishing-101',
    microlearning_metadata: {
      title: 'Smishing Awareness',
      description: 'Training on SMS phishing risks.',
      category: 'Social Engineering',
      subcategory: 'Smishing',
      industry_relevance: ['General'],
      department_relevance: ['All'],
      role_relevance: ['All'],
      regulation_compliance: [],
      risk_area: 'Smishing',
      content_provider: 'AI',
      level: 'Beginner',
      language: 'en-gb',
      language_availability: ['en-gb'],
      gamification_enabled: true,
      total_points: 100,
    },
    scientific_evidence: {},
    scenes: [],
    theme: {},
  };

  it('should include smishing scene type', () => {
    const prompt = generateScene4SmishingPrompt(analysis, microlearning);
    expect(prompt).toContain('"scene_type": "smishing_simulation"');
  });

  it('should include SMS role-play fields', () => {
    const prompt = generateScene4SmishingPrompt(analysis, microlearning);
    expect(prompt).toContain('"senderName"');
    expect(prompt).toContain('"senderNumber"');
    expect(prompt).toContain('"firstMessage"');
    expect(prompt).toContain('"prompt"');
  });

  it('should enforce SMS-only context', () => {
    const prompt = generateScene4SmishingPrompt(analysis, microlearning);
    expect(prompt).toContain('SMS/chat');
    expect(prompt).toContain('no email/inbox');
  });
});
