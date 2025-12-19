/**
 * Test Factory for Microlearning Types
 * Provides reusable factory functions for creating test data
 */

import { MicrolearningContent, LanguageContent } from '../../mastra/types/microlearning';

/**
 * Creates minimal valid MicrolearningContent for testing
 * @param overrides - Partial overrides for specific fields
 */
export function createMicrolearningContent(overrides?: {
  microlearning_id?: string;
  microlearning_metadata?: Partial<MicrolearningContent['microlearning_metadata']>;
  scenes?: MicrolearningContent['scenes'];
}): MicrolearningContent {
  const defaultContent: MicrolearningContent = {
    microlearning_id: 'ml-test-123',
    microlearning_metadata: {
      title: 'Test Training',
      description: 'Test description',
      category: 'Security',
      subcategory: 'Phishing',
      industry_relevance: [],
      department_relevance: ['IT'],
      role_relevance: [],
      regulation_compliance: [],
      risk_area: 'Low',
      content_provider: 'Test',
      level: 'Intermediate',
      ethical_inclusive_language_policy: {
        title: 'Policy',
        purpose: 'Purpose',
        why_standards_matter: [],
        applied_standards: { ISO: [], UN: [], Other: [] },
        implementation_in_content: {
          gender_inclusive_language: [],
          positive_and_motivational_tone: [],
          inclusive_and_universal_expression: [],
          clear_and_plain_language: [],
          accessibility: []
        },
        value_for_employees: { HR: [], CISO: [], Leaders: [] },
        conclusion: []
      },
      language: 'en',
      language_availability: ['en'],
      gamification_enabled: false,
      total_points: 0
    },
    scientific_evidence: {
      overview: {
        title: 'Evidence',
        description: 'Description',
        last_updated: '2024-01-01',
        evidence_level: 'High',
        peer_reviewed_sources: 0
      },
      learning_theories: {},
      behavioral_psychology: {},
      gamification_research: {},
      cybersecurity_specific: {},
      methodology_evidence: {},
      effectiveness_metrics: {
        learning_outcomes: {},
        engagement_metrics: {},
        business_impact: {}
      },
      research_sources: []
    },
    theme: {
      fontFamily: { primary: 'Arial', secondary: 'Arial', monospace: 'Courier' },
      colors: { background: '#fff' },
      logo: { src: '', darkSrc: '', minimizedSrc: '', minimizedDarkSrc: '', alt: '' }
    },
    scenes: []
  };

  return {
    ...defaultContent,
    ...(overrides?.microlearning_id && { microlearning_id: overrides.microlearning_id }),
    ...(overrides?.scenes && { scenes: overrides.scenes }),
    microlearning_metadata: {
      ...defaultContent.microlearning_metadata,
      ...(overrides?.microlearning_metadata || {})
    } as MicrolearningContent['microlearning_metadata']
  };
}

/**
 * Creates minimal valid LanguageContent for testing
 */
export function createLanguageContent(overrides?: Partial<LanguageContent>): LanguageContent {
  const defaultContent: LanguageContent = {
    '1': {
      iconName: 'shield',
      scene_type: 'intro',
      points: 10,
      duration_seconds: 15,
      hasAchievementNotification: false,
      scientific_basis: 'Test',
      icon: { sceneIconName: 'shield' },
      key_message: [],
      title: 'Test Scene',
      subtitle: 'Subtitle',
      sectionTitle: 'Section',
      highlights: [],
      duration: '15s',
      level: 'Intermediate',
      callToActionText: { mobile: 'Start', desktop: 'Start' }
    },
    '2': {} as any,
    '3': {} as any,
    '4': {} as any,
    '5': {} as any,
    '6': {} as any,
    '7': {} as any,
    '8': {} as any,
    app: {} as any
  };

  return {
    ...defaultContent,
    ...overrides
  };
}
