/**
 * Email IR Pipeline - Comprehensive Logging Setup
 * Structured logging for debugging, monitoring, and performance tracking
 */

import { getLogger } from '../../utils/core/logger';

// ============================================================================
// LOGGER INSTANCES FOR EACH STAGE
// ============================================================================

export const loggerFetch = getLogger('email-ir:fetch');
export const loggerHeader = getLogger('email-ir:header-analysis');
export const loggerBehavioral = getLogger('email-ir:behavioral-analysis');
export const loggerIntent = getLogger('email-ir:intent-analysis');
export const loggerTriage = getLogger('email-ir:triage');
export const loggerFeatureExtract = getLogger('email-ir:feature-extraction');
export const loggerRiskAssessment = getLogger('email-ir:risk-assessment');
export const loggerReporting = getLogger('email-ir:reporting');
export const loggerWorkflow = getLogger('email-ir:workflow');

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

export interface LogContext {
  email_id: string;
  step: string;
  timestamp: string;
  duration_ms?: number;
}

/**
 * Log a pipeline step execution with structured data
 */
export function logStepStart(logger: any, context: LogContext, metadata: Record<string, any> = {}) {
  logger.info('🔄 Step Started', {
    ...context,
    ...metadata,
    level: 'START',
  });
}

export function logStepComplete(logger: any, context: LogContext, result: Record<string, any> = {}) {
  logger.info('✅ Step Complete', {
    ...context,
    ...result,
    level: 'COMPLETE',
  });
}

export function logStepError(logger: any, context: LogContext, error: Error, metadata: Record<string, any> = {}) {
  logger.error('❌ Step Failed', {
    ...context,
    ...metadata,
    error: error.message,
    stack: error.stack,
    level: 'ERROR',
  });
}

/**
 * Log signal detection (for behavioral/intent analysis)
 */
export function logSignalDetected(
  logger: any,
  emailId: string,
  signalType: string,
  signal: string,
  severity: 'low' | 'medium' | 'high'
) {
  logger.info('🚩 Signal Detected', {
    email_id: emailId,
    signal_type: signalType,
    signal,
    severity,
  });
}

/**
 * Log confidence score changes
 */
export function logConfidenceScore(logger: any, emailId: string, stage: string, confidence: number, reasoning: string) {
  logger.info('📊 Confidence Score', {
    email_id: emailId,
    stage,
    confidence,
    reasoning,
  });
}

/**
 * Log risk verdict
 */
export function logRiskVerdict(
  logger: any,
  emailId: string,
  riskLevel: 'low' | 'medium' | 'high',
  confidence: number,
  justification: string
) {
  logger.info('⚠️ Risk Verdict', {
    email_id: emailId,
    risk_level: riskLevel,
    confidence,
    justification: justification.substring(0, 200), // Truncate long text
  });
}

/**
 * Log performance metrics
 */
export function logPerformance(logger: any, emailId: string, stage: string, durationMs: number, tokens?: number) {
  const performanceClass = durationMs < 2000 ? '⚡ FAST' : durationMs < 5000 ? '🟡 MEDIUM' : '🐢 SLOW';

  logger.info(`${performanceClass} Performance`, {
    email_id: emailId,
    stage,
    duration_ms: durationMs,
    tokens_used: tokens,
  });
}

/**
 * Log authentication check results
 */
export function logAuthResults(
  logger: any,
  emailId: string,
  spf: boolean,
  dkim: boolean,
  dmarc: boolean,
  domainSimilarity: string
) {
  logger.info('🔐 Authentication Results', {
    email_id: emailId,
    spf_pass: spf,
    dkim_pass: dkim,
    dmarc_pass: dmarc,
    domain_similarity: domainSimilarity,
    auth_score: spf && dkim && dmarc ? 'SECURE' : 'SUSPICIOUS',
  });
}

/**
 * Log workflow execution start/end
 */
export function logWorkflowStart(logger: any, emailId: string, inputMetadata: Record<string, any>) {
  logger.info('🚀 Workflow Started', {
    email_id: emailId,
    ...inputMetadata,
    timestamp: new Date().toISOString(),
  });
}

export function logWorkflowComplete(
  logger: any,
  emailId: string,
  durationMs: number,
  resultSummary: Record<string, any>
) {
  logger.info('🏁 Workflow Complete', {
    email_id: emailId,
    total_duration_ms: durationMs,
    ...resultSummary,
    timestamp: new Date().toISOString(),
  });
}

export function logWorkflowError(logger: any, emailId: string, error: Error, stage: string) {
  logger.error('💥 Workflow Failed', {
    email_id: emailId,
    failed_at_stage: stage,
    error: error.message,
    stack: error.stack?.substring(0, 500),
  });
}

// ============================================================================
// UTILITY: CREATE EXECUTION CONTEXT
// ============================================================================

export function createLogContext(emailId: string, step: string): LogContext {
  return {
    email_id: emailId,
    step,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// UTILITY: MEASURE EXECUTION TIME
// ============================================================================

export class TimingTracker {
  private startTime: number = Date.now();
  private marks: Record<string, number> = {};

  constructor(private emailId: string) {}

  mark(stageName: string) {
    this.marks[stageName] = Date.now() - this.startTime;
  }

  getTotal(): number {
    return Date.now() - this.startTime;
  }

  getStageTime(stageName: string): number {
    return this.marks[stageName] || 0;
  }

  getReport() {
    const total = this.getTotal();
    return {
      email_id: this.emailId,
      total_ms: total,
      stages: this.marks,
      summary: `Total: ${total}ms`,
    };
  }
}

// ============================================================================
// SAMPLE USAGE IN TOOLS
// ============================================================================

/**
 * Example: How to use logging in a tool
 *
 * execute: async ({ context, runtimeContext }) => {
 *   const emailId = context.from?.split('@')[0] || 'unknown';
 *   const ctx = createLogContext(emailId, 'header-analysis');
 *   const timing = new TimingTracker(emailId);
 *
 *   try {
 *     logStepStart(loggerHeader, ctx, { domain: context.from });
 *
 *     // ... analysis logic ...
 *
 *     if (spfFail) {
 *       logSignalDetected(loggerHeader, emailId, 'authentication', 'SPF_FAIL', 'high');
 *     }
 *
 *     timing.mark('header-analysis-complete');
 *     logPerformance(loggerHeader, emailId, 'header-analysis', timing.getTotal());
 *     logStepComplete(loggerHeader, ctx, { result });
 *
 *     return result;
 *   } catch (error) {
 *     logStepError(loggerHeader, ctx, error as Error);
 *     throw error;
 *   }
 * }
 */
