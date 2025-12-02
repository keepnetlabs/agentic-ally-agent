import { z } from 'zod';
import { TRAINING_LEVELS } from '../constants';

export const SceneMetadataSchema = z.object({
    scene_type: z.enum(['intro', 'goal', 'scenario', 'actionable_content', 'quiz', 'survey', 'nudge', 'summary']),
    points: z.number().int().nonnegative(),
    duration_seconds: z.number().int().positive(),
    hasAchievementNotification: z.boolean(),
    scientific_basis: z.string().min(1),
    icon: z.object({
        sceneIconName: z.string().min(1),
        sparkleIconName: z.string().optional(),
    }),
});

export const SceneSchema = z.object({
    scene_id: z.string().min(1),
    metadata: SceneMetadataSchema,
});

export const MicrolearningMetadataSchema = z.object({
    title: z.string().min(1),
    category: z.string().min(1),
    subcategory: z.string().min(1),
    industry_relevance: z.array(z.string()),
    department_relevance: z.array(z.string()),
    role_relevance: z.array(z.string()),
    regulation_compliance: z.array(z.string()),
    risk_area: z.string().min(1),
    content_provider: z.string().min(1),
    level: z.enum(TRAINING_LEVELS),
    ethical_inclusive_language_policy: z.record(z.any()),
    language_availability: z.array(z.string()),
    gamification_enabled: z.boolean(),
    total_points: z.number().int().positive(),
});

export const ScientificEvidenceSchema = z.record(z.any());
export const ThemeSchema = z.object({
    fontFamily: z.record(z.string()).optional(),
    colors: z.record(z.string()).optional(),
    logo: z.object({
        src: z.string(),
        darkSrc: z.string().optional(),
        minimizedSrc: z.string().optional(),
        minimizedDarkSrc: z.string().optional(),
        alt: z.string().optional(),
    }).optional(),
}).partial();

export const MicrolearningContentSchema = z.object({
    microlearning_id: z.string().min(1),
    microlearning_metadata: MicrolearningMetadataSchema,
    scientific_evidence: ScientificEvidenceSchema,
    theme: ThemeSchema,
    scenes: z.array(SceneSchema).min(8),
});

// Base schema with common fields
const BaseSceneContentSchema = z.object({
    iconName: z.string(),
    title: z.string().optional(), // Some scenes might not have title
    subtitle: z.string().optional(),
    callToActionText: z.union([
        z.string(),
        z.object({
            mobile: z.string().optional(),
            desktop: z.string().optional(),
        })
    ]).optional(),
    key_message: z.array(z.string()),
    texts: z.record(z.any()).optional(),
    scene_type: z.string(),
    points: z.number(),
    duration_seconds: z.number(),
    hasAchievementNotification: z.boolean(),
    scientific_basis: z.string(),
    icon: z.object({
        sceneIconName: z.string(),
        sparkleIconName: z.string().optional(),
    }),
});

// Scene-specific schemas
const IntroSceneSchema = BaseSceneContentSchema.extend({
    title: z.string(), // Required for intro
    sectionTitle: z.string(),
    highlights: z.array(z.object({
        iconName: z.string(),
        text: z.string(),
    })).min(2).max(5), // AI can decide 2-5 highlights based on content complexity
    duration: z.string(),
    level: z.string(),
});

const GoalSceneSchema = BaseSceneContentSchema.extend({
    title: z.string(), // Required
    goals: z.array(z.object({
        iconName: z.string(),
        title: z.string(),
        subtitle: z.string(),
        description: z.string(),
    })).min(2).max(4), // AI decides 2-4 goals based on training scope
});

const ScenarioSceneSchema = BaseSceneContentSchema.extend({
    title: z.string(), // Required
    video: z.object({
        src: z.string().url(), // Video URL validation
        poster: z.string().url().nullable(), // Poster image URL or null
        disableForwardSeek: z.boolean(),
        showTranscript: z.boolean(),
        transcriptTitle: z.string(),
        transcriptLanguage: z.string(),
        transcript: z.union([
            z.string().min(1), // Full transcript text
            z.string().url()   // Transcript URL
        ]), // AI can provide either full text or URL to transcript
    }),
    texts: z.record(z.string()).optional(), // Video-specific UI texts
    ariaTexts: z.record(z.string()),
});

const ActionableContentSceneSchema = BaseSceneContentSchema.extend({
    title: z.string(), // Required
    actions: z.array(z.object({
        iconName: z.string(),
        title: z.string(),
        description: z.string(),
        tip: z.string(),
    })).min(2).max(4), // AI decides 2-4 actions based on training complexity
    tipConfig: z.object({
        iconName: z.string(),
    }),
    successCallToActionText: z.string(),
});

// Base quiz question schema
const BaseQuizQuestionSchema = z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'true_false', 'multi_select', 'drag_drop']),
    title: z.string(),
    description: z.string().optional(),
    explanation: z.string(),
});

// Multiple choice question
const MultipleChoiceQuestionSchema = BaseQuizQuestionSchema.extend({
    type: z.literal('multiple_choice'),
    options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean(),
    })).min(2).max(6), // AI can generate 2-6 options
});

// True/False question  
const TrueFalseQuestionSchema = BaseQuizQuestionSchema.extend({
    type: z.literal('true_false'),
    statement: z.string(),
    correctAnswer: z.boolean(),
    options: z.object({
        true: z.object({
            label: z.string(),
            icon: z.string(),
        }),
        false: z.object({
            label: z.string(),
            icon: z.string(),
        }),
    }),
});

// Union of all question types
const QuizQuestionSchema = z.discriminatedUnion('type', [
    MultipleChoiceQuestionSchema,
    TrueFalseQuestionSchema,
    // Future: MultiSelectQuestionSchema, DragDropQuestionSchema
]);

const QuizSceneSchema = BaseSceneContentSchema.extend({
    title: z.string(), // Required
    questions: z.object({
        totalCount: z.number().min(1).max(10), // AI can generate 1-10 questions based on complexity
        maxAttempts: z.number().min(1).max(5), // 1-5 attempts allowed
        list: z.array(QuizQuestionSchema).min(1), // Strongly typed questions
    }),
    quizCompletionCallToActionText: z.string(),
    ariaTexts: z.record(z.string()),
});

const SurveySceneSchema = BaseSceneContentSchema.extend({
    title: z.string(), // Required
    topics: z.array(z.string()).min(1).max(8), // AI can generate 1-8 topics based on training scope
    texts: z.object({
        // Rating section
        ratingQuestion: z.string(),
        // Topics section  
        topicsQuestion: z.string(),
        // Feedback section
        feedbackQuestion: z.string(),
        feedbackPlaceholder: z.string(),
        // Submit states
        submitButton: z.string(),
        submittingText: z.string(),
        submittedText: z.string(),
        ratingRequiredText: z.string(),
        // Privacy & Success
        dataSecurityNotice: z.string(),
        successTitle: z.string(),
        successMessage1: z.string(),
        successMessage2: z.string(),
        successMessage3: z.string(),
        thankYouMessage: z.string(),
    }).partial(), // Some texts may be optional
    ariaTexts: z.record(z.string()),
});

const NudgeSceneSchema = BaseSceneContentSchema.extend({
    // Note: Nudge scene doesn't have main title, only subtitle
    texts: z.object({
        title: z.string(),        // "Action Plan" - internal title for UI
        subtitle: z.string(),     // "Next time a suspicious email appears, you will do this:"
        actionsTitle: z.string(), // "Your next steps" - section header
    }).partial(), // Some texts may be optional based on UI design
}).omit({ title: true }); // Explicitly remove title from base schema since nudge doesn't use it

const SummarySceneSchema = BaseSceneContentSchema.extend({
    immediateActions: z.array(z.object({
        title: z.string(),
        description: z.string(),
    })).min(1).max(5), // AI can generate 1-5 immediate actions
    resources: z.array(z.object({
        title: z.string(),
        type: z.enum(['URL', 'PDF', 'DOC', 'VIDEO']), // Structured resource types
        url: z.string().url(),
    })).min(0).max(10), // AI can generate 0-10 additional resources
    texts: z.object({
        // Download & Retry options
        downloadTrainingLogsText: z.string(),
        retryText: z.string(),
        // Completion messages
        completionTitle: z.string(),
        completionSubtitle: z.string(),
        // Section titles
        achievementsTitle: z.string(),
        actionPlanTitle: z.string(),
        resourcesTitle: z.string(),
        motivationalTitle: z.string(),
        motivationalMessage: z.string(),
        // Save & Finish workflow
        saveAndFinish: z.string(),
        savingText: z.string(),
        finishedText: z.string(),
        finishErrorText: z.string(),
        // Download certificate
        downloadButton: z.string(),
        downloadingText: z.string(),
        downloadedText: z.string(),
        // UI labels
        urgentLabel: z.string(),
        pointsLabel: z.string(),
        timeLabel: z.string(),
        completionLabel: z.string(),
    }).partial(), // Some texts may be optional
}).omit({ title: true }); // Summary scene doesn't have main title, only texts.completionTitle

export const LanguageContentSchema = z.object({
    '1': IntroSceneSchema,
    '2': GoalSceneSchema,  
    '3': ScenarioSceneSchema,
    '4': ActionableContentSceneSchema,
    '5': QuizSceneSchema,
    '6': SurveySceneSchema,
    '7': NudgeSceneSchema,
    '8': SummarySceneSchema,
    app: z.record(z.any()),
});

// Inbox Schema for email simulation content
const EmailAttachmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.string(),
    type: z.enum(['pdf', 'doc', 'xlsx', 'jpg', 'png', 'zip', 'txt']),
    content: z.string(), // HTML content for preview
});

const EmailItemSchema = z.object({
    id: z.string(),
    sender: z.string().email(),
    subject: z.string().min(1),
    preview: z.string().min(1),
    timestamp: z.string(), // ISO string or relative time
    isPhishing: z.boolean(), // True if this should be reported
    content: z.string().min(1), // HTML email content
    headers: z.array(z.string()), // Email headers for technical analysis
    difficulty: z.enum(['EASY', 'MEDIUM', 'MEDIUM-EASY', 'MEDIUM-HARD', 'HARD']),
    explanation: z.string().min(1), // Why this should/shouldn't be reported
    attachments: z.array(EmailAttachmentSchema),
});

const PhishingReportModalSchema = z.object({
    title: z.string(),
    subtitle: z.string(),
    question: z.string(),
    options: z.array(z.string()).min(2).max(5),
    reportButton: z.string(),
    cancelButton: z.string(),
});

const PhishingResultModalSchema = z.object({
    correctTitle: z.string(),
    correctSubtitle: z.string(),
    incorrectTitle: z.string(),
    incorrectSubtitle: z.string(),
    difficultyLabel: z.string(),
    emailInfoTitle: z.string(),
    phishingExplanationTitle: z.string(),
    legitimateExplanationTitle: z.string(),
    continueButton: z.string(),
});

const InboxTextsSchema = z.object({
    title: z.string(),
    description: z.string(),
    instructions: z.string(),
    selectEmailMessage: z.string(),
    reportButtonText: z.string(),
    nextButtonText: z.string(),
    phishingReportLabel: z.string(),
    inboxLabel: z.string(),
    reportsLabel: z.string(),
    accuracyLabel: z.string(),
    emailReportedMessage: z.string(),
    emailHeadersTitle: z.string(),
    ctaButtonText: z.string(),
    mobileTitle: z.string(),
    backToInboxText: z.string(),
    headersButtonText: z.string(),
    correctReportMessage: z.string(),
    cautiousReportMessage: z.string(),
    phishingReportModal: PhishingReportModalSchema,
    phishingResultModal: PhishingResultModalSchema,
});

export const InboxContentSchema = z.object({
    texts: InboxTextsSchema,
    emails: z.array(EmailItemSchema).min(1).max(10), // 1-10 emails for simulation
});
