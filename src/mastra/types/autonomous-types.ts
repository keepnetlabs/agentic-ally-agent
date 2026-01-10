// src/mastra/types/autonomous-types.ts

import type { CloudflareEnv } from './api-types';
import { Mastra } from '@mastra/core';
import type { AnalysisReport } from '../tools/user-management/user-management-types';

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
    actions: ('training' | 'phishing')[];
    sendAfterPhishingSimulation?: boolean;
    preferredLanguage?: string;
    env?: CloudflareEnv;
    mastra?: Mastra; // Mastra instance for agent access
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
    phishingResult?: {
        success: boolean;
        message?: string;
        agentResponse?: string;
        error?: string;
    };
    trainingResult?: {
        success: boolean;
        message?: string;
        agentResponse?: string;
        uploadAssignResult?: {
            success: boolean;
            agentResponse?: string;
            error?: string;
        };
        error?: string;
    };
    actions: ('training' | 'phishing')[];
    message?: string;
    error?: string;
}

