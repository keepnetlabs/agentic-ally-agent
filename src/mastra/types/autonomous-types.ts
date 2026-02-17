// src/mastra/types/autonomous-types.ts

import type { CloudflareEnv } from './api-types';
import { Mastra } from '@mastra/core';
import type { AnalysisReport } from '../tools/user-management/user-management-types';

/** All supported autonomous action types (single source of truth) */
export const AUTONOMOUS_ACTIONS = ['training', 'phishing', 'smishing', 'vishing-call'] as const;

/** Union type derived from AUTONOMOUS_ACTIONS */
export type AutonomousAction = (typeof AUTONOMOUS_ACTIONS)[number];

/** Actions eligible for group assignment (vishing-call requires user phone) */
export const GROUP_ELIGIBLE_ACTIONS = ['training', 'phishing', 'smishing'] as const;

/** Union type for content-generatable actions (excludes vishing-call) */
export type ContentGeneratableAction = (typeof GROUP_ELIGIBLE_ACTIONS)[number];

/** Type guard: returns true if value is a valid autonomous action */
export function isValidAutonomousAction(value: unknown): value is AutonomousAction {
  return typeof value === 'string' && (AUTONOMOUS_ACTIONS as readonly string[]).includes(value);
}

/** Filters actions to those eligible for group assignment (excludes vishing-call) */
export function getGroupEligibleActions(actions: AutonomousAction[]): ContentGeneratableAction[] {
  return actions.filter((a): a is ContentGeneratableAction => a !== 'vishing-call');
}

export interface AutonomousRequest {
  token: string;
  baseApiUrl?: string; // Optional: API base URL (e.g., https://test-api.devkeepnet.com)
  // User assignment (individual user)
  firstName?: string;
  lastName?: string;
  targetUserResourceId?: string;
  departmentName?: string; // Optional: for direct user ID, provide department to avoid extra API call
  // Group assignment (bulk)
  targetGroupResourceId?: string;
  // Common
  actions: AutonomousAction[];
  sendAfterPhishingSimulation?: boolean;
  preferredLanguage?: string;
  env?: CloudflareEnv;
  mastra?: Mastra; // Mastra instance for agent access
}

export interface AutonomousActionResult {
  success?: boolean;
  message?: string;
  agentResponse?: string;
  error?: string;
  data?: {
    resourceId?: string;
    languageId?: string;
    sendTrainingLanguageId?: string;
    [key: string]: unknown;
  };
  uploadResult?: {
    data?: {
      resourceId?: string;
      languageId?: string;
      isQuishing?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  uploadAssignResult?: {
    success?: boolean;
    agentResponse?: string;
    error?: string;
    trainingId?: string;
    resourceId?: string;
    languageId?: string;
    sendTrainingLanguageId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AutonomousResponse {
  success: boolean;
  userInfo?: {
    targetUserResourceId: string;
    fullName?: string;
    department?: string;
    email?: string;
    preferredLanguage?: string;
  };
  recentActivities?: Array<{
    actionType?: string;
    campaignName?: string;
    productType?: string;
    difficulty?: string;
    score?: number;
    actionTime?: string;
  }>;
  // NOTE: This is the GetUserInfoTool behavioral resilience report (NOT microlearning PromptAnalysis)
  analysisReport?: AnalysisReport;
  executiveReport?: string; // Human-readable report from agent
  phishingResult?: AutonomousActionResult;
  smishingResult?: AutonomousActionResult;
  trainingResult?: AutonomousActionResult;
  vishingCallResult?: AutonomousActionResult;
  actions: AutonomousAction[];
  message?: string;
  error?: string;
}
