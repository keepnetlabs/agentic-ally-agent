export interface PromptAnalysis {
  language: string;
  topic: string;
  description: string;
  title: string;
  department: string;
  level: string;
  category: string;
  subcategory: string;
  learningObjectives: string[];
  duration: number;
  industries: string[];
  roles: string[];
  keyTopics: string[];
  practicalApplications: string[];
  assessmentAreas: string[];
  regulationCompliance?: string[];
  themeColor?: string;
  hasRichContext?: boolean;
  contextSummary?: string;
  customRequirements?: string;
  isCodeTopic?: boolean;
}