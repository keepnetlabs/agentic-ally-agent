export interface MicrolearningMetadata {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  industry_relevance: string[];
  department_relevance: string[];
  role_relevance: string[];
  regulation_compliance: string[];
  risk_area: string;
  content_provider: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  ethical_inclusive_language_policy: {
    title: string;
    purpose: string;
    why_standards_matter: string[];
    applied_standards: {
      ISO: string[];
      UN: string[];
      Other: string[];
    };
    implementation_in_content: {
      gender_inclusive_language: string[];
      positive_and_motivational_tone: string[];
      inclusive_and_universal_expression: string[];
      clear_and_plain_language: string[];
      accessibility: string[];
    };
    value_for_employees: {
      HR: string[];
      CISO: string[];
      Leaders: string[];
    };
    conclusion: string[];
  };
  language: string;  // Primary language code (e.g., en-US, tr-TR) - used for translation detection
  language_availability: string[];
  gamification_enabled: boolean;
  total_points: number;
}

export interface ScientificEvidence {
  overview: {
    title: string;
    description: string;
    last_updated: string;
    evidence_level: string;
    peer_reviewed_sources: number;
  };
  learning_theories: Record<string, {
    theory: string;
    application: string;
    evidence: string;
  }>;
  behavioral_psychology: Record<string, {
    theory: string;
    application: string;
    evidence: string;
  }>;
  gamification_research: Record<string, {
    theory: string;
    application: string;
    evidence: string;
  }>;
  cybersecurity_specific: Record<string, {
    study: string;
    findings: string;
    application: string;
  }>;
  methodology_evidence: Record<string, {
    meta_analysis?: string;
    study?: string;
    findings: string;
    application: string;
  }>;
  effectiveness_metrics: {
    learning_outcomes: Record<string, string>;
    engagement_metrics: Record<string, string>;
    business_impact: Record<string, string>;
  };
  research_sources: Array<{
    author: string;
    year: number;
    title: string;
    journal?: string;
    publisher?: string;
    conference?: string;
    doi?: string;
  }>;
}

export interface Theme {
  fontFamily: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  colors: {
    background: string;
  };
  logo: {
    src: string;
    darkSrc: string;
    minimizedSrc: string;
    minimizedDarkSrc: string;
    alt: string;
  };
}

export interface SceneMetadata {
  scene_type: "intro" | "goal" | "scenario" | "actionable_content" | "code_review" | "vishing_simulation" | "smishing_simulation" | "quiz" | "survey" | "nudge" | "summary";
  points: number;
  duration_seconds: number;
  hasAchievementNotification: boolean;
  scientific_basis: string;
  icon: {
    sparkleIconName?: string;
    sceneIconName: string;
  };
}

export interface Scene {
  scene_id: string;
  metadata: SceneMetadata;
}

export interface MicrolearningContent {
  microlearning_id: string;
  microlearning_metadata: MicrolearningMetadata;
  scientific_evidence: ScientificEvidence;
  theme: Theme;
  scenes: Scene[];
}

// Scene Metadata Aliases for Rewriter Tools
export type Scene1Metadata = IntroScene;
export type Scene2Metadata = GoalScene;
export type Scene3Metadata = ScenarioScene;
export type Scene4Metadata = ActionableScene | CodeReviewScene | VishingSimulationScene | SmishingSimulationScene;
export type Scene5Metadata = QuizScene;
export type Scene6Metadata = SurveyScene;
export type Scene7Metadata = ActionPlanScene;
export type Scene8Metadata = SummaryScene;

// Base scene interface
interface BaseScene {
  iconName: string;
  scene_type: string;
  points: number;
  duration_seconds: number;
  hasAchievementNotification: boolean;
  scientific_basis: string;
  icon: {
    sparkleIconName?: string;
    sceneIconName: string;
  };
  key_message: string[];
  texts?: Record<string, string>;
  ariaTexts?: Record<string, string>;
}

// Scene 1: Intro
interface IntroScene extends BaseScene {
  title: string;
  subtitle: string;
  sectionTitle: string;
  highlights: Array<{
    iconName: string;
    text: string;
  }>;
  duration: string;
  level: string;
  callToActionText: {
    mobile: string;
    desktop: string;
  };
}

// Scene 2: Goal  
interface GoalScene extends BaseScene {
  title: string;
  subtitle: string;
  callToActionText: string;
  goals: Array<{
    iconName: string;
    title: string;
    subtitle: string;
    description: string;
  }>;
}

// Scene 3: Scenario
interface ScenarioScene extends BaseScene {
  title: string;
  subtitle: string;
  callToActionText: string;
  video: {
    src: string;
    poster: string | null;
    disableForwardSeek: boolean;
    showTranscript: boolean;
    transcriptTitle: string;
    transcriptLanguage: string;
    transcript: string;
  };
}

// Scene 4: Actionable Content
interface ActionableScene extends BaseScene {
  title: string;
  subtitle: string;
  callToActionText: string;
  successCallToActionText: string;
  actions: Array<{
    iconName: string;
    title: string;
    description: string;
    tip: string;
  }>;
  tipConfig: {
    iconName: string;
  };
}

// Scene 4 Alternative: Code Review
interface CodeReviewScene extends BaseScene {
  title: string;
  subtitle: string;
  callToActionText: string;
  code: {
    language: string;
    content: string;
    lineNumbers: boolean;
  };
  vulnerability: {
    name: string;
    severity: "critical" | "high" | "medium";
    description: string;
    explanation: string;
    cwe: string;
  };
  hints: string[];
}

// Scene 4 Alternative: Vishing Simulation
interface VishingSimulationScene extends BaseScene {
  title: string;
  subtitle: string;
  callerName: string;
  callerNumber: string;
  prompt: string;
  firstMessage: string;
  callToActionText: string;
  successCallToActionText: string;
}

// Scene 4 Alternative: Smishing Simulation
interface SmishingSimulationScene extends BaseScene {
  title: string;
  subtitle: string;
  channel?: "sms" | "slack" | "whatsapp" | "teams";
  senderName?: string;
  senderNumber?: string;
  prompt: string;
  firstMessage: string;
  callToActionText: string;
  successCallToActionText: string;
}

// Scene 5: Quiz
interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'multi_select' | 'drag_drop' | 'slider';
  title: string;
  description?: string;
  statement?: string; // for true/false
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  correctAnswer?: boolean; // for true/false
  explanation: string;
}

interface QuizScene extends BaseScene {
  title: string;
  subtitle: string;
  callToActionText: string;
  quizCompletionCallToActionText: string;
  questions: {
    totalCount: number;
    maxAttempts: number;
    list: QuizQuestion[];
  };
}

// Scene 6: Survey
interface SurveyScene extends BaseScene {
  title: string;
  subtitle: string;
  topics: string[];
}

// Scene 7: Action Plan
interface ActionPlanScene extends BaseScene {
  subtitle: string;
  callToActionText: string;
}

// Scene 8: Summary
interface SummaryScene extends BaseScene {
  immediateActions: Array<{
    title: string;
    description: string;
  }>;
  resources: Array<{
    title: string;
    type: string;
    url: string;
  }>;
}

// App-level content
export interface AppContent {
  texts: {
    loading: string;
    languageNotFound: string;
    scrollHint: string;
    nextSection: string;
    achievementNotification: string;
    closeNotification: string;
    startLabel: string;
    completedLabel: string;
    progressLabel: string;
    points: string;
    popularLanguages: string;
    toggleButtonLightMode: string;
    toggleButtonDarkMode: string;
    hintTitle: string;
    hintDescription: string;
    surveySubmittedToast: string;
  };
  ariaTexts: {
    appLabel: string;
    appDescription: string;
    loadingLabel: string;
    headerLabel: string;
    logoLabel: string;
    progressLabel: string;
    pointsLabel: string;
    pointsDescription: string;
    themeToggleDescription: string;
    languageSelectorLabel: string;
    languageSelectorDescription: string;
    languageListLabel: string;
    languageListDescription: string;
    languageSearchDescription: string;
    contentLabel: string;
    contentDescription: string;
    achievementLabel: string;
    quizCompletionLabel: string;
    scrollToTopLabel: string;
  };
}

export interface LanguageContent {
  language_code?: string;
  "1": IntroScene;
  "2": GoalScene;
  "3": ScenarioScene;
  "4": ActionableScene | CodeReviewScene | VishingSimulationScene | SmishingSimulationScene;
  "5": QuizScene;
  "6": SurveyScene;
  "7": ActionPlanScene;
  "8": SummaryScene;
  app: AppContent;
}

export interface DepartmentInbox {
  department: string;
  inbox_items: Array<{
    microlearning_id: string;
    assigned_date: string;
    due_date?: string;
    status: "pending" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
    completion_date?: string;
    score?: number;
  }>;
  last_updated: string;
}

// Email Simulation Types (for all departments inbox)
export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  content: string;
}

export interface SimulatedEmail {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  timestamp: string;
  isPhishing: boolean;
  content: string;
  headers: string[];
  difficulty: "EASY" | "MEDIUM" | "MEDIUM-EASY" | "MEDIUM-HARD" | "HARD";
  explanation: string;
  attachments: EmailAttachment[];
}

export interface EmailSimulationTexts {
  title: string;
  description: string;
  instructions: string;
  selectEmailMessage: string;
  reportButtonText: string;
  nextButtonText: string;
  phishingReportLabel: string;
  inboxLabel: string;
  reportsLabel: string;
  accuracyLabel: string;
  emailReportedMessage: string;
  emailHeadersTitle: string;
  ctaButtonText: string;
  mobileTitle: string;
  backToInboxText: string;
  headersButtonText: string;
  correctReportMessage: string;
  cautiousReportMessage: string;
  phishingReportModal: {
    title: string;
    subtitle: string;
    question: string;
    options: string[];
    reportButton: string;
    cancelButton: string;
  };
  phishingResultModal: {
    correctTitle: string;
    correctSubtitle: string;
    incorrectTitle: string;
    incorrectSubtitle: string;
    difficultyLabel: string;
    emailInfoTitle: string;
    phishingExplanationTitle: string;
    legitimateExplanationTitle: string;
    continueButton: string;
  };
}

export interface EmailSimulationInbox {
  texts: EmailSimulationTexts;
  emails: SimulatedEmail[];
}
