
import { describe, it, expect } from 'vitest';
import {
    SceneMetadataSchema,
    MicrolearningMetadataSchema,
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

        it('should validate Actionable Content scene (4)', () => {
            const validActionable = {
                iconName: 'clipboard-check',
                title: 'Take Action',
                actions: [
                    { iconName: 'i1', title: 'Step 1', description: 'Do this', tip: 'Tip 1' },
                    { iconName: 'i2', title: 'Step 2', description: 'Do that', tip: 'Tip 2' }
                ],
                tipConfig: { iconName: 'info' },
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'actionable_content',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: false,
                scientific_basis: 'Procedural Knowledge',
                icon: { sceneIconName: 'clipboard-check', sparkleIconName: 'check-circle' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(validActionable);
            if (!result.success) console.error(JSON.stringify(result.error, null, 2));
            expect(result.success).toBe(true);
        });

        it('should validate Vishing Simulation scene (4)', () => {
            const validVishing = {
                iconName: 'phone',
                title: 'Stop Voice Scam Calls',
                subtitle: 'Verify identity, refuse requests, report safely',
                prompt: 'You are a realistic voice-call scam caller in a security training simulation.',
                firstMessage: 'Hello, this is John from IT Support. We detected suspicious activity on your account.',
                callToActionText: 'Start Call Practice',
                successCallToActionText: 'Continue',
                key_message: [
                    'Step 1 - Verify the caller identity before sharing any information',
                    'Step 2 - Refuse risky requests and end suspicious calls',
                    'Step 3 - Report the attempt to your IT security team'
                ],
                texts: {
                    mobileHint: '💡 Ask for caller ID and callback number',
                    feedbackCorrect: '✅ Great! You protected yourself from a vishing attack.',
                    feedbackWrong: '⚠️ This was a vishing attempt. Never share credentials over the phone.'
                },
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Behavioral Rehearsal: Simulated calls build response confidence under pressure.',
                icon: { sceneIconName: 'phone', sparkleIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(validVishing);
            if (!result.success) console.error(JSON.stringify(result.error, null, 2));
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

    describe('SceneMetadataSchema - Scene Type Validation', () => {
        it('should accept vishing_simulation as scene type', () => {
            const valid = {
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Behavioral Rehearsal',
                icon: { sceneIconName: 'phone' }
            };
            const result = SceneMetadataSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should accept code_review as scene type', () => {
            const valid = {
                scene_type: 'code_review',
                points: 15,
                duration_seconds: 60,
                hasAchievementNotification: true,
                scientific_basis: 'Code Review',
                icon: { sceneIconName: 'code' }
            };
            const result = SceneMetadataSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should accept actionable_content as scene type', () => {
            const valid = {
                scene_type: 'actionable_content',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: false,
                scientific_basis: 'Procedural Knowledge',
                icon: { sceneIconName: 'clipboard-check' }
            };
            const result = SceneMetadataSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should reject invalid scene type', () => {
            const invalid = {
                scene_type: 'invalid_type',
                points: 10,
                duration_seconds: 30,
                hasAchievementNotification: false,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'icon' }
            };
            const result = SceneMetadataSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('Vishing Simulation Schema - Validation', () => {
        it('should require all mandatory fields', () => {
            const missing = {
                iconName: 'phone',
                title: 'Vishing Test',
                // Missing subtitle, prompt, firstMessage
                callToActionText: 'Start',
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(missing);
            expect(result.success).toBe(false);
        });

        it('should validate with minimal required fields', () => {
            const minimal = {
                iconName: 'phone',
                title: 'Test',
                subtitle: 'Sub',
                prompt: 'Test prompt',
                firstMessage: 'Hello',
                callToActionText: 'Start',
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(minimal);
            expect(result.success).toBe(true);
        });

        it('should validate with optional texts field', () => {
            const withTexts = {
                iconName: 'phone',
                title: 'Test',
                subtitle: 'Sub',
                prompt: 'Test prompt',
                firstMessage: 'Hello',
                callToActionText: 'Start',
                successCallToActionText: 'Continue',
                texts: {
                    mobileHint: 'Hint',
                    feedbackCorrect: 'Correct',
                    feedbackWrong: 'Wrong'
                },
                key_message: ['msg'],
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(withTexts);
            expect(result.success).toBe(true);
        });

        it('should accept valid title string', () => {
            const valid = {
                iconName: 'phone',
                title: 'Valid Title',
                subtitle: 'Sub',
                prompt: 'Test',
                firstMessage: 'Hello',
                callToActionText: 'Start',
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should accept non-empty prompt string', () => {
            const valid = {
                iconName: 'phone',
                title: 'Test',
                subtitle: 'Sub',
                prompt: 'Valid prompt text',
                firstMessage: 'Hello',
                callToActionText: 'Start',
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should accept long prompt text', () => {
            const longPrompt = 'A'.repeat(1000);
            const valid = {
                iconName: 'phone',
                title: 'Test',
                subtitle: 'Sub',
                prompt: longPrompt,
                firstMessage: 'Hello',
                callToActionText: 'Start',
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'vishing_simulation',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: true,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'phone' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(valid);
            expect(result.success).toBe(true);
        });
    });


    describe('Actionable Content Schema - Array Validation', () => {
        it('should accept 2 actions (minimum)', () => {
            const valid = {
                iconName: 'clipboard-check',
                title: 'Take Action',
                actions: [
                    { iconName: 'i1', title: 'Step 1', description: 'Do this', tip: 'Tip 1' },
                    { iconName: 'i2', title: 'Step 2', description: 'Do that', tip: 'Tip 2' }
                ],
                tipConfig: { iconName: 'info' },
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'actionable_content',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: false,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'clipboard-check' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should accept 4 actions (maximum)', () => {
            const valid = {
                iconName: 'clipboard-check',
                title: 'Take Action',
                actions: [
                    { iconName: 'i1', title: 'Step 1', description: 'Do this', tip: 'Tip 1' },
                    { iconName: 'i2', title: 'Step 2', description: 'Do that', tip: 'Tip 2' },
                    { iconName: 'i3', title: 'Step 3', description: 'Do more', tip: 'Tip 3' },
                    { iconName: 'i4', title: 'Step 4', description: 'Do final', tip: 'Tip 4' }
                ],
                tipConfig: { iconName: 'info' },
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'actionable_content',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: false,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'clipboard-check' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should reject less than 2 actions', () => {
            const invalid = {
                iconName: 'clipboard-check',
                title: 'Take Action',
                actions: [
                    { iconName: 'i1', title: 'Step 1', description: 'Do this', tip: 'Tip 1' }
                ],
                tipConfig: { iconName: 'info' },
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'actionable_content',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: false,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'clipboard-check' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should reject more than 4 actions', () => {
            const invalid = {
                iconName: 'clipboard-check',
                title: 'Take Action',
                actions: [
                    { iconName: 'i1', title: 'Step 1', description: 'Do this', tip: 'Tip 1' },
                    { iconName: 'i2', title: 'Step 2', description: 'Do that', tip: 'Tip 2' },
                    { iconName: 'i3', title: 'Step 3', description: 'Do more', tip: 'Tip 3' },
                    { iconName: 'i4', title: 'Step 4', description: 'Do final', tip: 'Tip 4' },
                    { iconName: 'i5', title: 'Step 5', description: 'Too many', tip: 'Tip 5' }
                ],
                tipConfig: { iconName: 'info' },
                successCallToActionText: 'Continue',
                key_message: ['msg'],
                scene_type: 'actionable_content',
                points: 25,
                duration_seconds: 75,
                hasAchievementNotification: false,
                scientific_basis: 'Test',
                icon: { sceneIconName: 'clipboard-check' }
            };
            const result = LanguageContentSchema.shape['4'].safeParse(invalid);
            expect(result.success).toBe(false);
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
