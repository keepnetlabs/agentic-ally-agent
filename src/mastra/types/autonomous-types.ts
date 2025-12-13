// src/mastra/types/autonomous-types.ts

export interface AutonomousRequest {
    token: string;
    firstName: string;
    lastName?: string;
    actions: ('training' | 'phishing')[];
}

export interface AutonomousResponse {
    success: boolean;
    userInfo?: {
        targetUserResourceId: string;
        maskedId: string;
        fullName?: string;
        department?: string;
        email?: string;
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

