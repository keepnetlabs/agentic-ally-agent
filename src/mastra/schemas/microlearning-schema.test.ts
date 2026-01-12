
import { describe, it, expect } from 'vitest';
import {
    SceneMetadataSchema,
    SceneSchema,
    MicrolearningMetadataSchema,
    MicrolearningContentSchema,
    LanguageContentSchema,
    InboxContentSchema
} from './microlearning-schema';

describe('Microlearning Schemas', () => {

    describe('SceneMetadataSchema', () => {
        it('should validate valid metadata', () => {
            const valid = {
                scene_type: 'intro',
                points: 10,
                duration_seconds: 30,
                hasAchievementNotification: false,
                scientific_basis: 'Valid basis',
                icon: {
                    sceneIconName: 'test-icon'
                }
            };
            const result = SceneMetadataSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should fail with negative points', () => {
            const invalid = {
                scene_type: 'intro',
                points: -10, // Invalid
                duration_seconds: 30,
                hasAchievementNotification: false,
                scientific_basis: 'Valid basis',
                icon: { sceneIconName: 'test' }
            };
            const result = SceneMetadataSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('MicrolearningMetadataSchema', () => {
        it('should validate valid metadata', () => {
            const valid = {
                title: 'Training 101',
                category: 'Cyber',
                subcategory: 'Phishing',
                industry_relevance: ['Tech'],
                department_relevance: ['IT'],
                role_relevance: ['Dev'],
                regulation_compliance: ['GDPR'],
                risk_area: 'High',
                content_provider: 'Mastra',
                level: 'Beginner',
                ethical_inclusive_language_policy: {},
                language_availability: ['en'],
                gamification_enabled: true,
                total_points: 100
            };
            const result = MicrolearningMetadataSchema.safeParse(valid);
            if (!result.success) console.error(JSON.stringify(result.error, null, 2));
            expect(result.success).toBe(true);
        });
    });

    describe('LanguageContentSchema (Scenes)', () => {
        it('should validate Intro scene (1)', () => {
            const validIntro = {
                iconName: 'icon',
                title: 'Intro Title',
                sectionTitle: 'Section 1',
                highlights: [
                    { iconName: 'i1', text: 'h1' },
                    { iconName: 'i2', text: 'h2' }
                ],
                duration: '5 min',
                level: 'Beginner',
                key_message: ['msg'],
                scene_type: 'intro',
                points: 10,
                duration_seconds: 60,
                hasAchievementNotification: false,
                scientific_basis: 'Science',
                icon: { sceneIconName: 'icon' }
            };
            const result = LanguageContentSchema.shape['1'].safeParse(validIntro);
            if (!result.success) console.error(JSON.stringify(result.error, null, 2));
            expect(result.success).toBe(true);
        });

        it('should validate Goal scene (2)', () => {
            const validGoal = {
                iconName: 'icon',
                title: 'Goal Title',
                goals: [
                    { iconName: 'i1', title: 't1', subtitle: 's1', description: 'd1' },
                    { iconName: 'i2', title: 't2', subtitle: 's2', description: 'd2' }
                ],
                key_message: ['msg'],
                scene_type: 'goal',
                points: 10,
                duration_seconds: 60,
                hasAchievementNotification: false,
                scientific_basis: 'Science',
                icon: { sceneIconName: 'icon' }
            };
            const result = LanguageContentSchema.shape['2'].safeParse(validGoal);
            expect(result.success).toBe(true);
        });

        it('should validate Scenario scene (3)', () => {
            const validScenario = {
                iconName: 'icon',
                title: 'Scenario Title',
                video: {
                    src: 'https://example.com/video.mp4',
                    poster: null,
                    disableForwardSeek: true,
                    showTranscript: true,
                    transcriptTitle: 'Transcript',
                    transcriptLanguage: 'en',
                    transcript: 'Full text'
                },
                ariaTexts: { label: 'Video' },
                key_message: ['msg'],
                scene_type: 'scenario',
                points: 10,
                duration_seconds: 60,
                hasAchievementNotification: false,
                scientific_basis: 'Science',
                icon: { sceneIconName: 'icon' }
            };
            const result = LanguageContentSchema.shape['3'].safeParse(validScenario);
            expect(result.success).toBe(true);
        });

        it('should validate Quiz scene (5)', () => {
            const validQuiz = {
                iconName: 'icon',
                title: 'Quiz',
                questions: {
                    totalCount: 1,
                    maxAttempts: 3,
                    list: [{
                        id: 'q1',
                        type: 'multiple_choice',
                        title: 'Question?',
                        explanation: 'Because.',
                        options: [
                            { id: 'o1', text: 'A', isCorrect: true },
                            { id: 'o2', text: 'B', isCorrect: false }
                        ]
                    }]
                },
                quizCompletionCallToActionText: 'Done',
                ariaTexts: {},
                key_message: ['msg'],
                scene_type: 'quiz',
                points: 10,
                duration_seconds: 60,
                hasAchievementNotification: false,
                scientific_basis: 'Science',
                icon: { sceneIconName: 'icon' }
            };
            // Note: Use 'multiple_choice' literal in test data as schema requires strictly one of the enum values
            const result = LanguageContentSchema.shape['5'].safeParse(validQuiz);
            if (!result.success) console.error(JSON.stringify(result.error, null, 2));
            expect(result.success).toBe(true);
        });
    });

    describe('InboxContentSchema', () => {
        it('should validate valid inbox content', () => {
            const validInbox = {
                texts: {
                    title: 'Inbox',
                    description: 'Sim',
                    instructions: 'Click',
                    selectEmailMessage: 'Select',
                    reportButtonText: 'Report',
                    nextButtonText: 'Next',
                    phishingReportLabel: 'Report',
                    inboxLabel: 'Inbox',
                    reportsLabel: 'Reports',
                    accuracyLabel: 'Accuracy',
                    emailReportedMessage: 'Reported',
                    emailHeadersTitle: 'Headers',
                    ctaButtonText: 'CTA',
                    mobileTitle: 'Mobile',
                    backToInboxText: 'Back',
                    headersButtonText: 'Headers',
                    correctReportMessage: 'Good',
                    cautiousReportMessage: 'Caution',
                    phishingReportModal: {
                        title: 'Modal',
                        subtitle: 'Sub',
                        question: 'Q?',
                        options: ['A', 'B'],
                        reportButton: 'Report',
                        cancelButton: 'Cancel'
                    },
                    phishingResultModal: {
                        correctTitle: 'Correct',
                        correctSubtitle: 'Sub',
                        incorrectTitle: 'Incorrect',
                        incorrectSubtitle: 'Sub',
                        difficultyLabel: 'Diff',
                        emailInfoTitle: 'Info',
                        phishingExplanationTitle: 'Phishing',
                        legitimateExplanationTitle: 'Legit',
                        continueButton: 'Continue'
                    }
                },
                emails: [
                    {
                        id: 'e1',
                        sender: 'bad@actor.com',
                        subject: 'Win money',
                        preview: 'Click here',
                        timestamp: 'now',
                        isPhishing: true,
                        content: '<html>',
                        headers: ['Received: ...'],
                        difficulty: 'EASY',
                        explanation: 'Obvious',
                        attachments: []
                    }
                ]
            };

            const result = InboxContentSchema.safeParse(validInbox);
            if (!result.success) console.error(JSON.stringify(result.error, null, 2));
            expect(result.success).toBe(true);
        });
    });
});
