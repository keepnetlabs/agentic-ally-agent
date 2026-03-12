/**
 * Phishing Template Fixer — Zod Schemas & TypeScript Types
 *
 * Defines the structured input/output contract for the phishing-template-fixer agent.
 *
 * Two distinct flows:
 *   - email_template: Full HTML rewrite (Outlook compat) + classification
 *   - landing_page:   Classification only (tags, difficulty, domain) — no HTML rewrite
 */

import { z } from 'zod';

// ============================================
// INPUT SCHEMA
// ============================================

export const PhishingTemplateFixerTypeSchema = z.enum(['email_template', 'landing_page']);

export type PhishingTemplateFixerType = z.infer<typeof PhishingTemplateFixerTypeSchema>;

export const PhishingTemplateFixerInputSchema = z.object({
  /** Raw HTML content to analyze and fix */
  html: z.string().min(1, 'HTML content is required'),

  /** Template type determines prompt specialization and output fields */
  type: PhishingTemplateFixerTypeSchema,

  /**
   * @deprecated Auth is now handled via X-AGENTIC-ALLY-TOKEN header.
   * Kept optional for backward compatibility with existing frontend clients.
   */
  accessToken: z.string().optional(),
});

export type PhishingTemplateFixerInput = z.infer<typeof PhishingTemplateFixerInputSchema>;

// ============================================
// OUTPUT SCHEMA
// ============================================

/**
 * NIST Phish Scale detection difficulty levels.
 * Maps to Keepnet difficultyResourceId values upstream.
 */
export const DifficultyLevel = z.enum([
  'DIFFICULTY_HIGH',
  'DIFFICULTY_MEDIUM',
  'DIFFICULTY_LOW',
]);

export type DifficultyLevel = z.infer<typeof DifficultyLevel>;

const HtmlDocumentSchema = z
  .string()
  .trim()
  .min(1, 'fixed_html is required')
  .regex(/^<!DOCTYPE html>/i, 'fixed_html must start with <!DOCTYPE html>');

const ChangeLogEntrySchema = z.string().trim().min(1, 'change_log entries cannot be empty');

const TagSchema = z
  .string()
  .trim()
  .min(1, 'tags cannot be empty')
  .regex(/^[A-Z0-9_]+$/, 'tags must be uppercase tokens');

const BasePhishingTemplateFixerOutputSchema = z.object({
  /** Outlook/Gmail/mobile-compatible normalized HTML document */
  fixed_html: HtmlDocumentSchema,

  /** Itemized list of changes made during normalization */
  change_log: z.array(ChangeLogEntrySchema).min(3, 'change_log must include at least 3 entries').max(10, 'change_log must not exceed 10 entries'),

  /**
   * Exactly 3 NIST Phish Scale taxonomy tags:
   * 1. BRAND — Impersonated brand (e.g. MICROSOFT, DHL, HR, CEO)
   * 2. PREMISE — Attack type (e.g. CREDENTIAL_HARVEST, FINANCIAL, DELIVERY)
   * 3. TRIGGER — Psychological trigger (e.g. TRIGGER_URGENCY, TRIGGER_FEAR)
   */
  tags: z.array(TagSchema).length(3, 'tags must contain exactly 3 items'),

  /** NIST Phish Scale overall detection difficulty */
  difficulty: DifficultyLevel,
});

export const EmailTemplateFixerOutputSchema = BasePhishingTemplateFixerOutputSchema.extend({
  /** AI-selected sender email address. Format: "prefix@domain" (e.g. "info@insan-kaynaklari.me") */
  from_address: z.string().trim().email('from_address must be a valid email address'),

  /** AI-selected sender display name (e.g. "WeTransfer", "İnsan Kaynakları", "IT Destek") */
  from_name: z.string().trim().min(1, 'from_name is required'),

  /** AI-generated email subject line matching the template content, tone, and language */
  subject: z.string().trim().min(1, 'subject is required'),
});

// ============================================
// LANDING PAGE CLASSIFIER OUTPUT SCHEMA
// ============================================

/**
 * Landing page flow: classification only — no HTML rewrite.
 * Agent analyzes the page content and returns tags, difficulty, and domain.
 */
export const LandingPageClassifierOutputSchema = z.object({
  /** NIST Phish Scale taxonomy tags (3 tags) */
  tags: z.array(TagSchema).length(3, 'tags must contain exactly 3 items'),

  /** NIST Phish Scale overall detection difficulty */
  difficulty: DifficultyLevel,

  /**
   * AI-selected phishing domain for the landing page URL.
   * Format: bare domain (e.g. "signin-authzone.com")
   */
  domain: z.string().trim().min(1, 'domain is required'),

  /**
   * Classification reasoning: why these tags, difficulty, and domain were chosen.
   * Same field name as email template for consistent UI handling.
   */
  change_log: z.array(z.string().trim().min(1)).min(1, 'change_log must include at least 1 entry').max(5, 'change_log must not exceed 5 entries'),
});

export type LandingPageClassifierOutput = z.infer<typeof LandingPageClassifierOutputSchema>;

// ============================================
// SPLIT AGENT SCHEMAS (Rewriter + Classifier)
// ============================================

/** Rewriter output: HTML fix only, no classification */
export const EmailRewriterOutputSchema = z.object({
  fixed_html: HtmlDocumentSchema,
  change_log: z.array(ChangeLogEntrySchema).min(1, 'change_log must include at least 1 entry').max(10, 'change_log must not exceed 10 entries'),
});

export type EmailRewriterOutput = z.infer<typeof EmailRewriterOutputSchema>;

/** Classifier output: tags, difficulty, from_address, from_name, subject */
export const EmailClassifierOutputSchema = z.object({
  tags: z.array(TagSchema).length(3, 'tags must contain exactly 3 items'),
  difficulty: DifficultyLevel,
  from_address: z.string().trim().email('from_address must be a valid email address'),
  from_name: z.string().trim().min(1, 'from_name is required'),
  subject: z.string().trim().min(1, 'subject is required'),
});

export type EmailClassifierOutput = z.infer<typeof EmailClassifierOutputSchema>;

// ============================================
// TYPE ALIASES
// ============================================

export type PhishingTemplateFixerOutput = z.infer<typeof EmailTemplateFixerOutputSchema>;
