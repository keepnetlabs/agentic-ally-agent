// src/mastra/tools/user-management/user-management-types.ts
// Centralized types, payloads, and schemas for user management tools

import { z } from 'zod';

// ============================================================================
// API PAYLOADS
// ============================================================================

// Payload for Step 1: Find User
export const GET_ALL_PAYLOAD = {
    datePeriod: 0,
    startDate: null,
    endDate: null,
    filter: {
        Condition: "AND",
        SearchInputTextValue: "",
        FilterGroups: [
            { Condition: "AND", FilterItems: [], FilterGroups: [] },
            { Condition: "OR", FilterItems: [], FilterGroups: [] }
        ]
    },
    pagination: { pageNumber: 1, pageSize: 50, orderBy: "rank", ascending: true }
};

// Payload for Step 2: Get Timeline
export const TIMELINE_PAYLOAD = {
    targetUserResourceId: "",
    actionTypes: [],
    difficultyTypes: [],
    products: [],
    datePeriod: 0,
    startDate: null,
    endDate: null,
    pagination: {
        pageNumber: 1,
        pageSize: 25,
        orderBy: "ActionTime",
        ascending: true
    },
    showOnlyFailedEvents: false
};

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Analysis report schema (for AI-generated behavioral resilience report)
export const AnalysisSchema = z.object({
    version: z.string(),
    meta: z.object({
        user_id: z.string(),
        role: z.string().optional(),
        department: z.string().optional(),
        location: z.string().optional(),
        language: z.string().optional(),
        access_level: z.string().nullable().optional(),
        generated_at_utc: z.string().optional(),
    }),
    header: z.object({
        title: z.string(),
        behavioral_resilience: z.object({
            framework: z.string(),
            current_stage: z.string(),
            target_stage: z.string(),
        }),
        progression_hint: z.string(),
        footnote: z.string(),
    }),
    strengths: z.array(z.string()),
    growth_opportunities: z.array(z.string()),
    ai_recommended_next_steps: z.object({
        simulations: z.array(z.object({
            vector: z.string(),
            scenario_type: z.string(),
            difficulty: z.string(),
            persuasion_tactic: z.string(),
            title: z.string(),
            why_this: z.string(),
            nist_phish_scale: z.object({
                cue_difficulty: z.string(),
                premise_alignment: z.string(),
            }),
            designed_to_progress: z.string(),
        })),
        microlearnings: z.array(z.object({
            title: z.string(),
            duration_min: z.number(),
            language: z.string(),
            objective: z.string(),
            why_this: z.string(),
        })),
        nudges: z.array(z.object({
            channel: z.string(),
            cadence: z.string(),
            message: z.string(),
            why_this: z.string(),
        })),
    }),
    maturity_mapping: z.object({
        enisa_security_culture: z.object({
            current: z.string(),
            description: z.string(),
            next: z.string(),
            what_it_takes: z.string(),
        }),
        gartner_sbcp_context_only: z.object({
            label: z.string(),
            description: z.string(),
            what_it_takes: z.string(),
        }),
    }),
    business_value_zone: z.object({
        operational: z.array(z.string()),
        strategic: z.array(z.string()),
    }),
    references: z.array(z.string()),
    internal: z.object({
        evidence_summary: z.object({
            key_signals_used: z.array(z.string()),
            data_gaps: z.array(z.string()),
        }),
        behavior_science_engine: z.object({
            diagnosis_model: z.string(),
            com_b: z.object({
                capability: z.string(),
                opportunity: z.string(),
                motivation: z.string(),
            }),
            trigger_model: z.string(),
            fogg_trigger_type: z.string(),
            design_notes: z.string(),
        }),
    }),
});

// Output schema for get-user-info tool
export const getUserInfoOutputSchema = z.object({
    success: z.boolean(),
    userInfo: z.object({
        targetUserResourceId: z.string().optional().describe('Direct user ID (skips search step, faster). Use if ID is already known.'),
        fullName: z.string().optional(),
        department: z.string().optional(),
        email: z.string().optional(),
        preferredLanguage: z.string().optional().describe('User preferred language (e.g., "English (United Kingdom)", "Arabic (Saudi Arabia)", "Turkish (Turkey)")'),
    }).optional(),
    recentActivities: z.array(z.object({
        actionType: z.string().optional(),
        campaignName: z.string().optional(),
        productType: z.string().optional(),
        difficulty: z.string().optional(),
        score: z.number().optional(),
        actionTime: z.string().optional(),
    })).optional(),
    analysisReport: AnalysisSchema.optional().describe('The structured executive report JSON generated by AI analysis.'),
    message: z.string().optional(),
    error: z.string().optional(),
});

// Type exports for convenience
export type AnalysisReport = z.infer<typeof AnalysisSchema>;
export type GetUserInfoOutput = z.infer<typeof getUserInfoOutputSchema>;
