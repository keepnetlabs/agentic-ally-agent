/**
 * Phishing Workflow Zod Schemas
 * Defines input/output validation schemas for the phishing email generation workflow
 */

import { z } from 'zod';
import { PHISHING, LANDING_PAGE, PHISHING_EMAIL } from '../constants';
import { StreamWriterSchema } from '../types/stream-writer';

export const PHISHING_AUDIENCE_MODES = ['consumer', 'employee', 'partner', 'student', 'citizen', 'general'] as const;
export const PHISHING_JOURNEY_TYPES = [
  'login',
  'claim',
  'register',
  'review',
  'pay',
  'track',
  'acknowledge',
  'download',
  'generic',
] as const;
export const PHISHING_OFFER_MECHANICS = [
  'account-access',
  'discount',
  'giveaway',
  'presale',
  'document-review',
  'payment-fix',
  'delivery-update',
  'policy-ack',
  'survey',
  'generic',
] as const;
export const PHISHING_BRAND_INTENTS = ['public-brand', 'internal-brand', 'generic'] as const;
export const PHISHING_BRAND_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

const phishingBehavioralProfileSchema = z.object({
  currentStage: z.string().optional().describe('Current behavioral resilience stage from user analysis'),
  targetStage: z.string().optional().describe('Next behavioral resilience stage from user analysis'),
  progressionHint: z.string().optional().describe('Short progression hint for the next behavioral step'),
  foggTriggerType: z.string().optional().describe('Behavioral trigger type from Fogg B=MAT (e.g. SIGNAL, SPARK, FACILITATOR)'),
  keySignalsUsed: z.array(z.string()).optional().describe('Top behavioral evidence signals extracted from the report'),
  dataGaps: z.array(z.string()).optional().describe('Missing evidence or coverage gaps noted in the report'),
});

const phishingBrandSignalsSchema = z.object({
  brandIntent: z
    .enum(PHISHING_BRAND_INTENTS)
    .catch('generic')
    .default('generic')
    .describe('Whether the topic implies a public brand, an internal sender, or a generic/unbranded scenario'),
  canonicalBrandName: z
    .string()
    .optional()
    .describe('Canonical public brand entity if a multilingual or localized brand reference is strongly implied'),
  localizedBrandSurface: z
    .string()
    .optional()
    .describe('Original localized or product-level wording that implied the brand in the source prompt'),
  brandEvidence: z
    .array(z.string())
    .optional()
    .describe('Short evidence bullets supporting the canonical brand inference'),
  candidateDomains: z
    .array(z.string())
    .optional()
    .describe('Candidate public domains associated with the brand inference'),
  brandConfidence: z
    .enum(PHISHING_BRAND_CONFIDENCE_LEVELS)
    .catch('low')
    .default('low')
    .describe('Confidence that the canonical public brand inference is correct'),
  scriptOrLocaleHint: z
    .string()
    .optional()
    .describe('Detected script, locale, or language hint useful for multilingual canonicalization'),
});

/**
 * Input Schema - Workflow entry point
 * Defines the input parameters for creating a phishing simulation
 */
export const createPhishingInputSchema = z.object({
  topic: z.string().describe('The main theme or topic of the phishing simulation'),
  isQuishing: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether this is a quishing (QR code phishing) simulation. Set by agent based on user request.'),
  targetProfile: z
    .object({
      name: z.string().optional(),
      department: z.string().optional(),
      behavioralTriggers: z.array(z.string()).optional().describe('e.g. Authority, Urgency, Greed'),
      vulnerabilities: z.array(z.string()).optional(),
    })
    .optional(),
  behavioralProfile: phishingBehavioralProfileSchema
    .optional()
    .describe('Structured behavioral guidance extracted from the user resilience report'),
  difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS).default(PHISHING.DEFAULT_DIFFICULTY),
  language: z.string().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
  method: z.enum(PHISHING.ATTACK_METHODS).optional().describe('Type of phishing attack'),
  includeLandingPage: z.boolean().default(true).describe('Whether to generate a landing page'),
  includeEmail: z.boolean().default(true).describe('Whether to generate an email'),
  additionalContext: z
    .string()
    .optional()
    .describe('User behavior context / vulnerability analysis for targeted phishing'),
  modelProvider: z.string().optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
  policyContext: z.string().optional().describe('Company policy context (prepared at workflow start)'),
});

/**
 * v1 Migration: Step input schema with resolved types (defaults applied)
 * Use this for step inputSchema to match workflow's output type
 */
export type CreatePhishingInput = z.output<typeof createPhishingInputSchema>;
export const createPhishingStepInputSchema = createPhishingInputSchema as z.ZodType<CreatePhishingInput>;

/**
 * Analysis Schema (The Blueprint)
 * Output from Step 1 (analyzeRequest), input to Step 2 (generateEmail)
 * Contains the complete scenario design and analysis
 */
export const createPhishingAnalysisSchema = z.object({
  scenario: z.string().describe('The specific scenario chosen (e.g. CEO Fraud, IT Update, HR Policy)'),
  name: z.string().describe('Short display name for the template (e.g. "Password Reset - Easy")'),
  description: z
    .string()
    .max(PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH)
    .describe('Brief description of the phishing scenario'),
  category: z.string().describe('Phishing category: Credential Harvesting, Malware, Financial Fraud, etc.'),
  method: z
    .enum(PHISHING.ATTACK_METHODS)
    .default(PHISHING.DEFAULT_ATTACK_METHOD)
    .describe('The determined attack method for this scenario'),
  psychologicalTriggers: z
    .array(z.string())
    .describe('Triggers used: Authority, Urgency, Fear, Greed, Curiosity, Helpfulness'),
  tone: z.string().describe('Email tone: Formal, Urgent, Friendly, Threatening, etc.'),
  fromAddress: z.string().describe('Spoofed sender email address'),
  fromName: z.string().describe('Spoofed sender display name'),
  keyRedFlags: z.array(z.string()).describe('List of subtle indicators (red flags) to educate the user'),
  targetAudienceAnalysis: z.string().describe('Brief explanation of why this scenario fits the target profile'),
  subjectLineStrategy: z.string().describe('Reasoning behind the subject line choice'),
  audienceMode: z
    .enum(PHISHING_AUDIENCE_MODES)
    .catch('general')
    .default('general')
    .describe('Primary audience frame for the scenario: consumer, employee, partner, student, citizen, or general'),
  journeyType: z
    .enum(PHISHING_JOURNEY_TYPES)
    .catch('generic')
    .default('generic')
    .describe('Primary user journey implied by the campaign: login, claim, register, review, pay, track, acknowledge, download, or generic'),
  offerMechanic: z
    .enum(PHISHING_OFFER_MECHANICS)
    .catch('generic')
    .default('generic')
    .describe('Primary scenario mechanic: account-access, discount, giveaway, presale, document-review, payment-fix, delivery-update, policy-ack, survey, or generic'),
  reasoning: z.string().optional().describe('AI reasoning about scenario design (if available)'),
  emailGenerationReasoning: z
    .string()
    .optional()
    .describe('AI reasoning about email content generation (if available)'),
  userContextReasoning: z
    .string()
    .optional()
    .describe(
      'If user behavior context was provided: 1-2 sentence explanation of WHY this specific scenario was chosen for this user based on their behavioral profile, risk signals, and activity history. Reference specific behavioral evidence.'
    ),
  behavioralProfile: phishingBehavioralProfileSchema
    .optional()
    .describe('Structured behavioral guidance carried from workflow input for scenario continuity'),
  brandSignals: phishingBrandSignalsSchema
    .optional()
    .describe('Structured multilingual brand-intent signals extracted during scenario analysis'),
  additionalContext: z
    .string()
    .optional()
    .describe('User behavior context / vulnerability analysis for targeted phishing'),
  // Brand detection (resolved during analysis)
  logoUrl: z
    .string()
    .optional()
    .describe(
      'Resolved logo URL (using alternative logo services for recognized brands, default logo for generic companies)'
    ),
  brandName: z.string().nullable().optional().describe('Detected brand name if recognized, null for generic companies'),
  isRecognizedBrand: z.boolean().optional().describe('Whether the company/brand is a recognized well-known brand'),
  brandColors: z
    .object({
      primary: z.string().describe('Primary brand color in hex format (e.g., #FF9900 for Amazon)'),
      secondary: z.string().describe('Secondary brand color in hex format (e.g., #000000 for Amazon)'),
      accent: z.string().describe('Accent brand color in hex format'),
    })
    .optional()
    .describe('Authentic brand colors for recognized brands (primary, secondary, accent)'),
  // Industry detection (detected once in analysis step, reused in email/landing page steps)
  industryDesign: z
    .object({
      industry: z.string(),
      colors: z.object({
        primary: z.string(),
        secondary: z.string(),
        accent: z.string(),
        gradient: z.string(),
      }),
      typography: z.object({
        headingClass: z.string(),
        bodyClass: z.string(),
      }),
      patterns: z.object({
        cardStyle: z.string(),
        buttonStyle: z.string(),
        inputStyle: z.string(),
      }),
      logoExample: z.string(),
    })
    .optional()
    .describe('Detected industry design system (colors, typography, patterns)'),
  // Quishing detection (determined by AI during analysis)
  isQuishing: z
    .boolean()
    .describe(
      'Whether this is a quishing (QR code phishing) simulation. Set to true if the topic/scenario involves QR codes or quishing attacks.'
    ),
  // Passthrough fields
  difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS).optional(),
  language: z.string().optional(),
  includeLandingPage: z.boolean().default(true).optional(),
  includeEmail: z.boolean().default(true).optional(),
  modelProvider: z.string().optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
  policyContext: z.string().optional().describe('Company policy context (prepared at workflow start)'),
});

/**
 * Email Output Schema
 * Output from Step 2 (generateEmail), input to Step 3 (generateLandingPage)
 * Contains the generated email content and analysis context
 */
export const createPhishingEmailOutputSchema = z.object({
  subject: z.string().optional(),
  template: z.string().optional(),
  fromAddress: z.string(),
  fromName: z.string(),
  analysis: createPhishingAnalysisSchema, // Full analysis context
  additionalContext: z
    .string()
    .optional()
    .describe('User behavior context (also available in analysis.additionalContext)'),
  includeLandingPage: z.boolean().default(true).optional(), // Pass explicit flag
  policyContext: z.string().optional(),
});

/**
 * Final Output Schema
 * Output from Step 3 (generateLandingPage), input to Step 4 (savePhishingContent)
 * Final workflow output containing email and landing page content
 */
export const createPhishingOutputSchema = z.object({
  phishingId: z.string().optional(), // ID of the saved content in KV
  subject: z.string().optional(),
  template: z.string().optional(), // Renamed from bodyHtml for backend compatibility
  fromAddress: z.string(),
  fromName: z.string(),
  landingPage: z
    .object({
      name: z.string(),
      description: z.string().max(PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH),
      method: z.enum(PHISHING.ATTACK_METHODS).default(PHISHING.DEFAULT_ATTACK_METHOD),
      difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS),
      pages: z.array(
        z.object({
          type: z.enum(LANDING_PAGE.PAGE_TYPES),
          template: z.string(),
        })
      ),
    })
    .optional(),
  analysis: createPhishingAnalysisSchema.omit({ language: true, modelProvider: true, model: true }).optional(), // Include analysis in output for reasoning display
  language: z.string().optional().describe('Content language (BCP-47 code, e.g. en-gb, tr-tr). Passed through from analysis for KV storage.'),
  policyContext: z.string().optional(),
});
