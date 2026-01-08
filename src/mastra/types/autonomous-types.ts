// src/mastra/types/autonomous-types.ts

import type { CloudflareEnv } from './api-types';

export interface AutonomousRequest {
    token: string;
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
    mastra?: any; // Mastra instance for agent access - optional for backward compatibility
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
    analysisReport?: any;
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

