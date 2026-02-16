/**
 * Smishing Workflow Zod Schemas
 * Defines input/output validation schemas for the smishing (SMS) simulation workflow
 */

import { z } from 'zod';
import { SMISHING, LANDING_PAGE, PHISHING_EMAIL } from '../constants';
import { StreamWriterSchema } from '../types/stream-writer';

/**
 * Input Schema - Workflow entry point
 * Defines the input parameters for creating a smishing simulation
 */
export const createSmishingInputSchema = z.object({
  topic: z.string().describe('The main theme or topic of the smishing simulation'),
  targetProfile: z
    .object({
      name: z.string().optional(),
      department: z.string().optional(),
      behavioralTriggers: z.array(z.string()).optional().describe('e.g. Authority, Urgency, Curiosity'),
      vulnerabilities: z.array(z.string()).optional(),
    })
    .optional(),
  difficulty: z.enum(SMISHING.DIFFICULTY_LEVELS).default(SMISHING.DEFAULT_DIFFICULTY),
  language: z.string().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
  method: z.enum(SMISHING.ATTACK_METHODS).optional().describe('Type of smishing attack'),
  includeLandingPage: z.boolean().default(true).describe('Whether to generate a landing page'),
  includeSms: z.boolean().default(true).describe('Whether to generate SMS message templates'),
  additionalContext: z
    .string()
    .optional()
    .describe('User behavior context / vulnerability analysis for targeted smishing'),
  modelProvider: z.string().optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
  policyContext: z.string().optional().describe('Company policy context (prepared at workflow start)'),
});

/**
 * Analysis Schema (The Blueprint)
 * Output from Step 1 (analyzeRequest), input to Step 2 (generateSms)
 */
export const createSmishingAnalysisSchema = z.object({
  scenario: z.string().describe('The specific scenario chosen (e.g. Delivery Update, Account Alert)'),
  name: z.string().describe('Short display name for the template (e.g. "Parcel Reschedule - Easy")'),
  description: z
    .string()
    .max(PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH)
    .describe('Brief description of the smishing scenario'),
  category: z.string().describe('Smishing category: Credential Harvesting, Financial Fraud, etc.'),
  method: z
    .enum(SMISHING.ATTACK_METHODS)
    .default(SMISHING.DEFAULT_ATTACK_METHOD)
    .describe('The determined attack method for this scenario'),
  psychologicalTriggers: z.array(z.string()).describe('Triggers used: Authority, Urgency, Fear, Curiosity'),
  tone: z.string().describe('SMS tone: Friendly, Urgent, Formal, etc.'),
  keyRedFlags: z.array(z.string()).describe('List of subtle indicators (red flags) to educate the user'),
  targetAudienceAnalysis: z.string().describe('Brief explanation of why this scenario fits the target profile'),
  messageStrategy: z.string().describe('Reasoning behind the SMS content strategy'),
  reasoning: z.string().optional().describe('AI reasoning about scenario design (if available)'),
  smsGenerationReasoning: z.string().optional().describe('AI reasoning about SMS content generation (if available)'),
  additionalContext: z
    .string()
    .optional()
    .describe('User behavior context / vulnerability analysis for targeted smishing'),
  // Brand detection (resolved during analysis)
  logoUrl: z.string().optional().describe('Resolved logo URL for landing page branding'),
  brandName: z.string().nullable().optional().describe('Detected brand name if recognized, null for generic senders'),
  isRecognizedBrand: z.boolean().optional().describe('Whether the sender is a recognized brand'),
  brandColors: z
    .object({
      primary: z.string().describe('Primary brand color in hex format'),
      secondary: z.string().describe('Secondary brand color in hex format'),
      accent: z.string().describe('Accent brand color in hex format'),
    })
    .optional()
    .describe('Authentic brand colors for recognized brands'),
  // Industry detection (detected once in analysis step, reused in landing page step)
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
  // Passthrough fields
  difficulty: z.enum(SMISHING.DIFFICULTY_LEVELS).optional(),
  language: z.string().optional(),
  includeLandingPage: z.boolean().default(true).optional(),
  includeSms: z.boolean().default(true).optional(),
  modelProvider: z.string().optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
  policyContext: z.string().optional().describe('Company policy context (prepared at workflow start)'),
});

/**
 * SMS Output Schema
 * Output from Step 2 (generateSms), input to Step 3 (generateLandingPage)
 */
export const createSmishingSmsOutputSchema = z.object({
  messages: z.array(z.string()).min(1).optional(),
  analysis: createSmishingAnalysisSchema,
  additionalContext: z.string().optional(),
  includeLandingPage: z.boolean().default(true).optional(),
  policyContext: z.string().optional(),
});

/**
 * Final Output Schema
 * Output from Step 3 (generateLandingPage), input to Step 4 (saveSmishingContent)
 */
export const createSmishingOutputSchema = z.object({
  smishingId: z.string().optional(),
  messages: z.array(z.string()).min(1).optional(),
  landingPage: z
    .object({
      name: z.string(),
      description: z.string().max(PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH),
      method: z.enum(SMISHING.ATTACK_METHODS).default(SMISHING.DEFAULT_ATTACK_METHOD),
      difficulty: z.enum(SMISHING.DIFFICULTY_LEVELS),
      pages: z.array(
        z.object({
          type: z.enum(LANDING_PAGE.PAGE_TYPES),
          template: z.string(),
        })
      ),
    })
    .optional(),
  analysis: createSmishingAnalysisSchema.omit({ modelProvider: true, model: true }).optional(),
  policyContext: z.string().optional(),
});
