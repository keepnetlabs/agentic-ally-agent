/**
 * KV Service type definitions
 *
 * Input types describe what callers pass to save methods.
 * Bundle types describe what get methods return.
 * All fields are optional (?) because the methods use optional chaining internally.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Landing page data — uses index signature to support spread into KV records. */
export interface LandingPageData extends Record<string, unknown> {
  name?: string;
  description?: string;
  method?: string;
  difficulty?: string;
  pages?: Array<{ type: string; template: string }>;
}

// ---------------------------------------------------------------------------
// Phishing
// ---------------------------------------------------------------------------

export interface PhishingAnalysisFields {
  name?: string;
  description?: string;
  scenario?: string;
  difficulty?: string;
  method?: string;
  isQuishing?: boolean;
  targetAudienceAnalysis?: string;
  psychologicalTriggers?: string[] | string;
  tone?: string;
  category?: string;
  reasoning?: string;
  subjectLineStrategy?: string;
  userContextReasoning?: string;
  keyRedFlags?: string[];
}

/** Input shape for savePhishingBase / savePhishingEmail / savePhishingLandingPage. */
export interface PhishingKvInput {
  subject?: string;
  template?: string;
  fromAddress?: string;
  fromName?: string;
  landingPage?: LandingPageData;
  analysis?: PhishingAnalysisFields;
  model?: string;
  modelProvider?: string;
}

/** Aggregate returned by getPhishing(). Inner values are deserialized KV JSON. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- KV records are arbitrary JSON until callers adopt typed reads
export interface PhishingKvBundle {
  base: any;
  email?: any;
  landing?: any;
}

// ---------------------------------------------------------------------------
// Smishing
// ---------------------------------------------------------------------------

export interface SmishingAnalysisFields {
  name?: string;
  description?: string;
  scenario?: string;
  difficulty?: string;
  method?: string;
  targetAudienceAnalysis?: string;
  psychologicalTriggers?: string[] | string;
  reasoning?: string;
  messageStrategy?: string;
  userContextReasoning?: string;
  keyRedFlags?: string[];
}

/** Input shape for saveSmishingBase / saveSmishingSms / saveSmishingLandingPage. */
export interface SmishingKvInput {
  messages?: string[];
  landingPage?: LandingPageData;
  analysis?: SmishingAnalysisFields;
  model?: string;
  modelProvider?: string;
}

/** Aggregate returned by getSmishing(). Inner values are deserialized KV JSON. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SmishingKvBundle {
  base: any;
  sms?: any;
  landing?: any;
}

// ---------------------------------------------------------------------------
// Microlearning
// ---------------------------------------------------------------------------

/** Payload passed to saveMicrolearning(). */
export interface MicrolearningKvPayload {
  microlearning: Record<string, unknown>;
  languageContent: Record<string, unknown>;
  inboxContent?: Record<string, unknown>;
  model?: string;
  modelProvider?: string;
}

/** Analysis fields passed as the optional `analysis` param to saveMicrolearning(). */
export interface MicrolearningAnalysisFields {
  reasoning?: string;
  targetAudienceReasoning?: string;
  contentStrategy?: string;
  userContextReasoning?: string;
  learningObjectives?: string[];
}

/** Base record shape for updateMicrolearning(). */
export interface MicrolearningBaseRecord extends Record<string, unknown> {
  microlearning_id?: string;
}

/** Aggregate returned by getMicrolearning(). Inner values are deserialized KV JSON. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MicrolearningKvBundle {
  base: any;
  language?: any;
}
