/**
 * Type definitions for workflow results
 */
export interface WorkflowMetadata {
    trainingUrl?: string;
    title?: string;
    department?: string;
    microlearningId?: string;
    filesGenerated?: string[];
    [key: string]: unknown;
}

export interface CreateMicrolearningResult {
    // v1: 'error' removed, 'tripwire' and 'paused' added
    status: 'success' | 'failed' | 'suspended' | 'tripwire' | 'paused';
    result?: {
        metadata?: WorkflowMetadata;
        [key: string]: unknown;
    };
    error?: Error | string;
    [key: string]: unknown;
}

export interface AddLanguageResult {
    // v1: 'error' removed, 'tripwire' and 'paused' added
    status: 'success' | 'failed' | 'suspended' | 'tripwire' | 'paused';
    result?: {
        data?: {
            trainingUrl?: string;
            title?: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    error?: Error | string;
    [key: string]: unknown;
}

export interface LanguageResultItem {
    success?: boolean;
    trainingUrl?: string;
    language?: string;
    [key: string]: unknown;
}

export interface AddMultipleLanguagesResult {
    // v1: 'error' removed, 'tripwire' and 'paused' added
    status: 'success' | 'failed' | 'suspended' | 'tripwire' | 'paused';
    result?: {
        results?: LanguageResultItem[];
        successCount?: number;
        failureCount?: number;
        languages?: string[];
        status?: string;
        [key: string]: unknown;
    };
    error?: Error | string;
    [key: string]: unknown;
}

export interface UpdateMicrolearningResult {
    // v1: 'error' removed, 'tripwire' and 'paused' added
    status: 'success' | 'failed' | 'suspended' | 'tripwire' | 'paused';
    result?: {
        success: boolean;
        status: string;
        metadata?: {
            microlearningId: string;
            version: number;
            changes?: Record<string, unknown>;
            trainingUrl?: string;
            timestamp: string;
        };
        error?: string;
    };
    [key: string]: unknown;
}

export interface WorkflowExecutorOutput {
    success: boolean;
    title?: string;
    department?: string;
    microlearningId?: string;
    status?: string;
    successCount?: number;
    failureCount?: number;
    languages?: string[];
    results?: (WorkflowMetadata | LanguageResultItem | Record<string, unknown>)[];
    error?: string;
    [key: string]: unknown;
}
