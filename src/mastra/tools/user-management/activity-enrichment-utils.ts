// src/mastra/tools/user-management/activity-enrichment-utils.ts
// Activity enrichment utilities for behavioral analysis
// Converts raw activity data into semantic, AI-friendly format

/**
 * Normalize arbitrary actionType to uppercase snake_case
 * Handles unknown types gracefully (smishing, quishing, vishing, etc.)
 * Examples:
 *   "Clicked Link from SMS" → "CLICKED_LINK_FROM_SMS"
 *   "Scanned Malicious QR" → "SCANNED_MALICIOUS_QR"
 */
const normalizeActionType = (actionType: string): string => {
  return actionType.toUpperCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
};

export interface RawActivity {
  ActionType: string;
  productType: string;
  name?: string;
  difficultyType?: string;
  categoryDescription?: string;
  campaignType?: string;
  points: number;
  ActionTime: string;
  [key: string]: unknown;
}

export interface EnrichedActivity {
  actionType: string;
  productType: string;
  campaignName: string;
  difficulty: string;
  category: string | undefined;
  points: number;
  actionTime: string;
  actionCategory: string;
  outcome: 'PASSED' | 'FAILED' | 'NEUTRAL';
  riskScore: number;
  isSecurityPositive: boolean;
  context: string;
  timeAgo: string;
  /** Active Learning: psychological tactic(s) used in this simulation (from campaign_metadata) */
  tactic?: string;
}

/**
 * Categorizes activity based on productType and actionType
 * Uses explicit patterns for known types, falls back to normalization for new patterns
 */
export const categorizeAction = (productType: string, actionType: string): string => {
  if (productType.includes('PHISHING')) {
    if (actionType.includes('Submitted Data')) return 'PHISHING_DATA_SUBMITTED';
    if (actionType.includes('Clicked Link')) return 'PHISHING_LINK_CLICKED';
    // Fallback: smishing, quishing, vishing, etc. → normalized
    return normalizeActionType(actionType);
  }

  if (productType.includes('SECURITY AWARENESS')) {
    if (actionType.includes('Training')) return 'TRAINING_COMPLETED';
    if (actionType.includes('Email Opened')) return 'EMAIL_OPENED';
    if (actionType.includes('Email Sent')) return 'EMAIL_SENT';
    // Fallback: other training types
    return normalizeActionType(actionType);
  }

  if (productType.includes('INCIDENT')) {
    if (actionType.includes('Reported')) return 'INCIDENT_REPORTED';
    // Fallback: other incident types
    return normalizeActionType(actionType);
  }

  // Fallback: preserve context for unknown product types
  return normalizeActionType(actionType);
};

/**
 * Three-state outcome inference from points
 * PASSED (points > 0) = positive reward
 * FAILED (points < 0) = penalty
 * NEUTRAL (points = 0) = no judgment (tracking funnel)
 */
export const inferOutcome = (points: number): 'PASSED' | 'FAILED' | 'NEUTRAL' => {
  if (points > 0) return 'PASSED';
  if (points < 0) return 'FAILED';
  return 'NEUTRAL';
};

/**
 * Calculate risk score (0-100) based on action category and outcome
 */
export const calculateRisk = (difficulty: string, category: string, points: number): number => {
  // NEUTRAL actions: no risk (tracking only)
  if (points === 0) return 0;

  // FAILED actions: assign risk based on severity
  if (points < 0) {
    if (category.includes('DATA')) return 90; // Worst: user submitted data
    if (category.includes('CLICK')) return 70; // Bad: user clicked link
    return 60; // Other failures
  }

  // PASSED actions: no risk (positive behavior)
  if (points > 0) return 0;

  return 50; // fallback
};

/**
 * Determine if action is security-positive (good behavior)
 */
export const isSecurityPositive = (category: string, outcome: 'PASSED' | 'FAILED' | 'NEUTRAL'): boolean => {
  // Training completion = positive
  if (category.includes('TRAINING') && outcome === 'PASSED') return true;
  // Incident reporting = positive
  if (category.includes('INCIDENT_REPORTED')) return true;
  // All failures and neutrals = not positive
  return false;
};

/**
 * Format time ago from ActionTime string (DD/MM/YYYY HH:mm format)
 */
export const formatTimeAgo = (actionTime: string): string => {
  try {
    const [dateStr, timeStr] = actionTime.split(' ');
    const [day, month, year] = dateStr.split('/');
    const date = new Date(`${year}-${month}-${day}T${timeStr}:00Z`);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  } catch {
    return actionTime;
  }
};

/**
 * Generate human-readable context description
 */
export const generateContext = (
  activity: RawActivity,
  category: string,
  outcome: 'PASSED' | 'FAILED' | 'NEUTRAL'
): string => {
  const baseAction = activity.ActionType;
  const campaign = activity.categoryDescription || activity.campaignType || 'campaign';

  // PHISHING failures
  if (category === 'PHISHING_DATA_SUBMITTED' && outcome === 'FAILED') {
    return `${baseAction} - FAILED: User submitted sensitive data to phishing email (${activity.difficultyType || 'Unknown'} difficulty). Critical vulnerability indicator.`;
  }

  if (category === 'PHISHING_LINK_CLICKED' && outcome === 'FAILED') {
    return `${baseAction} - FAILED: User clicked malicious link in phishing email (${activity.difficultyType || 'Unknown'} difficulty). Susceptible to phishing tactics.`;
  }

  // Training successes
  if (category === 'TRAINING_COMPLETED' && outcome === 'PASSED') {
    return `${baseAction} in ${campaign} - PASSED: User completed training successfully. Earned ${activity.points} points. Demonstrates awareness engagement.`;
  }

  // Email funnel (neutral)
  if (category === 'EMAIL_SENT') {
    return `${baseAction} in ${campaign} - NEUTRAL: Training campaign email delivered. System-initiated action.`;
  }

  if (category === 'EMAIL_OPENED') {
    return `${baseAction} in ${campaign} - NEUTRAL: User received and opened training email. Positive engagement signal in funnel.`;
  }

  // Incident reporting (positive)
  if (category === 'INCIDENT_REPORTED') {
    return `${baseAction} - POSITIVE: User proactively reported suspicious email using incident workflow. Good security behavior.`;
  }

  // Fallback
  return `${baseAction}: ${outcome.toLowerCase()} (${activity.points > 0 ? '+' : ''}${activity.points} points)`;
};

/**
 * Enrich raw activity with semantic context
 */
export const enrichActivity = (activity: RawActivity): EnrichedActivity => {
  const category = categorizeAction(activity.productType, activity.ActionType);
  const outcome = inferOutcome(activity.points);
  const risk = calculateRisk(activity.difficultyType || 'Medium', category, activity.points);

  return {
    // Original fields
    actionType: activity.ActionType,
    productType: activity.productType,
    campaignName: activity.name || 'Unknown Campaign',
    difficulty: activity.difficultyType || 'Unknown',
    category: activity.categoryDescription,
    points: activity.points,
    actionTime: activity.ActionTime,

    // ENRICHED fields
    actionCategory: category,
    outcome,
    riskScore: risk,
    isSecurityPositive: isSecurityPositive(category, outcome),
    context: generateContext(activity, category, outcome),
    timeAgo: formatTimeAgo(activity.ActionTime),
  };
};

/**
 * Enrich array of activities
 */
export const enrichActivities = (activities: RawActivity[]): EnrichedActivity[] => {
  return activities.map(enrichActivity);
};

/**
 * Format enriched activities into user-friendly text for AI prompt
 */
export const formatEnrichedActivitiesForPrompt = (enrichedActivities: EnrichedActivity[]): string => {
  if (enrichedActivities.length === 0) {
    return 'NO ACTIVITY DATA AVAILABLE';
  }

  return enrichedActivities
    .map(activity => {
      const tactic = typeof activity.tactic === 'string' && activity.tactic.trim() ? activity.tactic.trim() : undefined;
      const tacticSuffix = tactic ? ` [Tactic: ${tactic}]` : '';
      return `- ${activity.actionCategory} (Risk: ${activity.riskScore}/100): ${activity.context} (${activity.timeAgo})${tacticSuffix}`;
    })
    .join('\n');
};
