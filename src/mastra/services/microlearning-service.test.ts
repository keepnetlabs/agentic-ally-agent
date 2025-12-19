import { describe, it, expect, beforeEach } from 'vitest';
import { MicrolearningService } from './microlearning-service';
import { MicrolearningContent, LanguageContent, DepartmentInbox } from '../types/microlearning';
import '../../../src/__tests__/setup';

/**
 * Test Suite: MicrolearningService
 * Tests for in-memory microlearning content storage
 * Covers: Store, retrieve, department assignment operations
 */

describe('MicrolearningService', () => {
  let service: MicrolearningService;

  beforeEach(() => {
    service = new MicrolearningService();
  });

  describe('storeMicrolearning', () => {
    it('should store microlearning content without error', async () => {
      const content: MicrolearningContent = {
        microlearning_id: 'ml-123',
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

      await expect(service.storeMicrolearning(content)).resolves.not.toThrow();
    });

    it('should allow overwriting existing content', async () => {
      const minimalContent = {
        microlearning_id: 'ml-123',
        microlearning_metadata: {
          title: 'Original',
          description: '',
          category: '',
          subcategory: '',
          industry_relevance: [],
          department_relevance: [],
          role_relevance: [],
          regulation_compliance: [],
          risk_area: '',
          content_provider: '',
          level: 'Beginner' as const,
          ethical_inclusive_language_policy: {
            title: '',
            purpose: '',
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
          language_availability: [],
          gamification_enabled: false,
          total_points: 0
        },
        scientific_evidence: {
          overview: {
            title: '',
            description: '',
            last_updated: '',
            evidence_level: '',
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
          fontFamily: { primary: '', secondary: '', monospace: '' },
          colors: { background: '' },
          logo: { src: '', darkSrc: '', minimizedSrc: '', minimizedDarkSrc: '', alt: '' }
        },
        scenes: []
      } as MicrolearningContent;

      const updatedContent = {
        ...minimalContent,
        microlearning_metadata: {
          ...minimalContent.microlearning_metadata,
          title: 'Updated',
          level: 'Advanced' as const
        }
      };

      await service.storeMicrolearning(minimalContent);
      await expect(service.storeMicrolearning(updatedContent)).resolves.not.toThrow();
    });

    it('should handle content with all required fields', async () => {
      const content: MicrolearningContent = {
        microlearning_id: 'ml-456',
        microlearning_metadata: {
          title: 'Complete Training',
          description: 'Description',
          category: 'THREAT',
          subcategory: 'Phishing',
          industry_relevance: [],
          department_relevance: ['HR'],
          role_relevance: [],
          regulation_compliance: [],
          risk_area: 'High',
          content_provider: 'Provider',
          level: 'Advanced',
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
          language: 'tr',
          language_availability: ['tr'],
          gamification_enabled: true,
          total_points: 100
        },
        scientific_evidence: {
          overview: {
            title: 'Evidence',
            description: 'Description',
            last_updated: '2024-01-01',
            evidence_level: 'High',
            peer_reviewed_sources: 5
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
        scenes: [
          {
            scene_id: '1',
            metadata: {
              scene_type: 'intro',
              points: 10,
              duration_seconds: 15,
              hasAchievementNotification: false,
              scientific_basis: 'Test basis',
              icon: { sceneIconName: 'shield' }
            }
          }
        ]
      };

      await expect(service.storeMicrolearning(content)).resolves.not.toThrow();
    });
  });

  describe('storeLanguageContent', () => {
    it('should store language-specific content without error', async () => {
      const languageContent: LanguageContent = {
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

      await expect(service.storeLanguageContent('ml-123', 'en', languageContent)).resolves.not.toThrow();
    });

    it('should store multiple languages separately', async () => {
      const baseScene = {
        iconName: 'shield',
        scene_type: 'intro',
        points: 10,
        duration_seconds: 15,
        hasAchievementNotification: false,
        scientific_basis: 'Test',
        icon: { sceneIconName: 'shield' },
        key_message: [],
        title: 'English',
        subtitle: '',
        sectionTitle: '',
        highlights: [],
        duration: '',
        level: '',
        callToActionText: { mobile: '', desktop: '' }
      };

      const enContent: LanguageContent = {
        '1': baseScene,
        '2': {} as any,
        '3': {} as any,
        '4': {} as any,
        '5': {} as any,
        '6': {} as any,
        '7': {} as any,
        '8': {} as any,
        app: {} as any
      };

      const trContent: LanguageContent = {
        '1': { ...baseScene, title: 'Türkçe' },
        '2': {} as any,
        '3': {} as any,
        '4': {} as any,
        '5': {} as any,
        '6': {} as any,
        '7': {} as any,
        '8': {} as any,
        app: {} as any
      };

      await expect(service.storeLanguageContent('ml-123', 'en', enContent)).resolves.not.toThrow();
      await expect(service.storeLanguageContent('ml-123', 'tr', trContent)).resolves.not.toThrow();
    });

    it('should handle complex language content structure', async () => {
      const languageContent: LanguageContent = {
        '1': {
          iconName: 'shield',
          scene_type: 'intro',
          points: 10,
          duration_seconds: 15,
          hasAchievementNotification: false,
          scientific_basis: 'Test',
          icon: { sceneIconName: 'shield' },
          key_message: [],
          title: 'Intro',
          subtitle: '',
          sectionTitle: '',
          highlights: [],
          duration: '',
          level: '',
          callToActionText: { mobile: '', desktop: '' }
        },
        '2': {
          iconName: 'target',
          scene_type: 'goal',
          points: 10,
          duration_seconds: 15,
          hasAchievementNotification: false,
          scientific_basis: 'Test',
          icon: { sceneIconName: 'target' },
          key_message: [],
          title: 'Goals',
          subtitle: '',
          callToActionText: '',
          goals: []
        } as any,
        '3': {
          iconName: 'play',
          scene_type: 'scenario',
          points: 10,
          duration_seconds: 15,
          hasAchievementNotification: false,
          scientific_basis: 'Test',
          icon: { sceneIconName: 'play' },
          key_message: [],
          title: 'Video',
          subtitle: '',
          callToActionText: '',
          video: {
            src: '',
            poster: null,
            disableForwardSeek: false,
            showTranscript: false,
            transcriptTitle: '',
            transcriptLanguage: '',
            transcript: ''
          }
        } as any,
        '4': {} as any,
        '5': {} as any,
        '6': {} as any,
        '7': {} as any,
        '8': {} as any,
        app: {} as any
      };

      await expect(service.storeLanguageContent('ml-789', 'de', languageContent)).resolves.not.toThrow();
    });
  });

  describe('assignMicrolearningToDepartment', () => {
    it('should create new department inbox if not exists', async () => {
      await expect(
        service.assignMicrolearningToDepartment('IT', 'en', 'ml-123', 'high')
      ).resolves.not.toThrow();
    });

    it('should add to existing department inbox', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-123', 'high');
      await expect(
        service.assignMicrolearningToDepartment('IT', 'en', 'ml-456', 'medium')
      ).resolves.not.toThrow();
    });

    it('should update existing assignment if already assigned', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-123', 'low');
      await expect(
        service.assignMicrolearningToDepartment('IT', 'en', 'ml-123', 'high')
      ).resolves.not.toThrow();
    });

    it('should handle due date', async () => {
      const dueDate = '2025-12-31';
      await expect(
        service.assignMicrolearningToDepartment('IT', 'en', 'ml-123', 'high', dueDate)
      ).resolves.not.toThrow();
    });

    it('should separate departments and languages', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-123');
      await service.assignMicrolearningToDepartment('HR', 'en', 'ml-456');
      await expect(
        service.assignMicrolearningToDepartment('IT', 'tr', 'ml-789')
      ).resolves.not.toThrow();
    });

    it('should handle all priority levels', async () => {
      await expect(service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'low')).resolves.not.toThrow();
      await expect(service.assignMicrolearningToDepartment('IT', 'en', 'ml-2', 'medium')).resolves.not.toThrow();
      await expect(service.assignMicrolearningToDepartment('IT', 'en', 'ml-3', 'high')).resolves.not.toThrow();
    });
  });

  describe('assignMicrolearningToDepartment - edge cases', () => {
    it('should handle empty department name', async () => {
      await expect(
        service.assignMicrolearningToDepartment('', 'en', 'ml-123')
      ).resolves.not.toThrow();
    });

    it('should handle empty language code', async () => {
      await expect(
        service.assignMicrolearningToDepartment('IT', '', 'ml-123')
      ).resolves.not.toThrow();
    });

    it('should handle multiple assignments to same department', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'high');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-2', 'medium');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-3', 'low');

      // Should not throw
      await expect(
        service.assignMicrolearningToDepartment('IT', 'en', 'ml-4', 'high')
      ).resolves.not.toThrow();
    });
  });
});
