// src/mastra/tools/get-user-info-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { generatePIIHash } from '../../utils/parsers/pii-masking-utils';
import { parseName, isValidName, normalizeName } from '../../utils/parsers/name-parser';
import { generateText } from 'ai';
import { withRetry } from '../../utils/core/resilience-utils';
import { getModelWithOverride } from '../../model-providers'; // Use override to pick stronger model
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { validateToolResult } from '../../utils/tool-result-validation';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';

// Payload for Step 1: Find User
const GET_ALL_PAYLOAD = {
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
const TIMELINE_PAYLOAD = {
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

const AnalysisSchema = z.object({
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

// Output schema defined separately to avoid circular reference
const getUserInfoOutputSchema = z.object({
    success: z.boolean(),
    userInfo: z.object({
        targetUserResourceId: z.string().optional().describe('Direct user ID (skips search step, faster). Use if ID is already known.'),
        maskedId: z.string().describe('Anonymized identifier for Zero PII compliance (e.g., [USER-ABC12345])'),
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

export const getUserInfoTool = createTool({
    id: 'get-user-info',
    description: 'Retrieves user info AND their recent activity timeline. Accepts either targetUserResourceId (direct ID) OR fullName/firstName/lastName (search). Returns a structured AI analysis report.',
    inputSchema: z.object({
        targetUserResourceId: z.string().optional().describe('Direct user ID (skips search step, faster). Use if ID is already known.'),
        departmentName: z.string().optional().describe('Department name to use with targetUserResourceId (avoids extra API call).'),
        fullName: z.string().optional().describe('Full name of the user (e.g., "John Doe", "Peter Parker"). Will be automatically parsed into firstName/lastName.'),
        firstName: z.string().optional().describe('First name of the user (used if fullName is not provided)'),
        lastName: z.string().optional().describe('Last name of the user (optional, used with firstName)'),
    }).refine(
        data => data.targetUserResourceId || data.fullName || data.firstName,
        { message: 'Either targetUserResourceId OR fullName/firstName must be provided' }
    ),
    outputSchema: getUserInfoOutputSchema,
    execute: async ({ context }) => {
        const logger = getLogger('GetUserInfoTool');
        const { targetUserResourceId: inputTargetUserResourceId, departmentName: inputDepartmentName, fullName: inputFullName, firstName: inputFirstName, lastName: inputLastName } = context;

        // Get Auth Token & CompanyId (needed for both paths)
        const { token, companyId } = getRequestContext();
        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.USER_INFO.TOKEN_MISSING);
            logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
            return createToolErrorResponse(errorInfo);
        }

        try {
            // Variables for both paths
            let userId: string;
            let userFullName: string;
            let maskedId: string;
            let user: any = null;
            let firstName: string = '';
            let lastName: string | undefined = undefined;
            let fullName: string = '';

            // STEP 0: Determine user lookup path
            if (inputTargetUserResourceId) {
                // Fast path: Direct ID provided - skip user search
                logger.info('Using provided targetUserResourceId, skipping user search', { targetUserResourceId: inputTargetUserResourceId });
                userId = inputTargetUserResourceId;
                // userFullName and maskedId will be set during timeline fetch or set to placeholder
                userFullName = `User-${userId}`;
                maskedId = `[USER-${userId}]`;
                fullName = userFullName;
            } else {
                // Slow path: Search for user by name
                // Parse name using utility
                let parsed;
                try {
                    if (inputFullName) {
                        if (!isValidName(inputFullName)) {
                            const errorInfo = errorService.validation(`Invalid name format: "${inputFullName}"`);
                            logErrorInfo(logger, 'warn', 'Validation error: Invalid name format', errorInfo);
                            return createToolErrorResponse(errorInfo);
                        }
                        const normalizedFullName = normalizeName(inputFullName);
                        parsed = parseName(normalizedFullName);
                        logger.debug('Name parsed and normalized', { original: inputFullName, normalized: normalizedFullName });
                    } else if (inputFirstName) {
                        const normalizedFirstName = normalizeName(inputFirstName);
                        const normalizedLastName = inputLastName ? normalizeName(inputLastName) : undefined;
                        parsed = parseName({ firstName: normalizedFirstName, lastName: normalizedLastName });
                        logger.debug('Using explicit normalized names', { firstName: normalizedFirstName, lastName: normalizedLastName });
                    } else {
                        const errorInfo = errorService.validation('Either targetUserResourceId, fullName, or firstName must be provided');
                        logErrorInfo(logger, 'warn', 'Validation error: No identifier provided', errorInfo);
                        return createToolErrorResponse(errorInfo);
                    }
                } catch (error) {
                    const err = normalizeError(error);
                    const errorInfo = errorService.validation(err.message, { step: 'name-parsing' });
                    logErrorInfo(logger, 'error', 'Name parsing error', errorInfo);
                    return createToolErrorResponse(errorInfo);
                }

                ({ firstName, lastName, fullName } = parsed);
                logger.debug('Searching for user by name', { fullName, firstName, lastName: lastName || 'N/A' });

                // --- STEP 1: Find User ---
                const userSearchPayload = JSON.parse(JSON.stringify(GET_ALL_PAYLOAD));
                userSearchPayload.filter.FilterGroups[0].FilterItems.push({
                    Value: firstName, FieldName: "firstName", Operator: "Contains"
                });
                if (lastName) {
                    userSearchPayload.filter.FilterGroups[0].FilterItems.push({
                        Value: lastName, FieldName: "lastName", Operator: "Contains"
                    });
                }
                const userSearchHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
                if (companyId) {
                    userSearchHeaders['x-ir-company-id'] = companyId;
                }

                const userSearchResponse = await fetch(API_ENDPOINTS.USER_INFO_GET_ALL, {
                    method: 'POST',
                    headers: userSearchHeaders,
                    body: JSON.stringify(userSearchPayload)
                });

                if (!userSearchResponse.ok) {
                    const errorInfo = errorService.external(`User search API error: ${userSearchResponse.status}`, { status: userSearchResponse.status });
                    logErrorInfo(logger, 'error', 'User search API failed', errorInfo);
                    return createToolErrorResponse(errorInfo);
                }
                const userSearchData = await userSearchResponse.json();
                const users = userSearchData?.items || userSearchData?.data?.results || [];

                if (users.length === 0) {
                    const errorInfo = errorService.notFound(`User "${fullName}" not found.`, { fullName });
                    logErrorInfo(logger, 'warn', 'User not found', errorInfo);
                    return createToolErrorResponse(errorInfo);
                }

                user = users[0];
                userId = user.targetUserResourceId;
                userFullName = `${user.firstName} ${user.lastName}`;
                maskedId = `[USER-${generatePIIHash(userFullName)}]`;

                logger.debug('User found', { userId, maskedId });
            }

            // --- STEP 2: Get Timeline ---
            const timelinePayload = JSON.parse(JSON.stringify(TIMELINE_PAYLOAD));
            timelinePayload.targetUserResourceId = userId;
            timelinePayload.pagination.ascending = false;

            logger.debug('Fetching timeline for user', { userId });
            const timelineHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            if (companyId) {
                timelineHeaders['x-ir-company-id'] = companyId;
            }

            const timelineResponse = await fetch(API_ENDPOINTS.USER_INFO_GET_TIMELINE, {
                method: 'POST',
                headers: timelineHeaders,
                body: JSON.stringify(timelinePayload)
            });

            let recentActivities = [];
            if (timelineResponse.ok) {
                const timelineData = await timelineResponse.json();
                const results = timelineData?.data?.results || [];
                recentActivities = results.map((r: any) => ({
                    actionType: r.ActionType,
                    campaignName: r.name,
                    productType: r.productType,
                    difficulty: r.difficultyType || 'N/A',
                    score: r.points || 0,
                    actionTime: r.ActionTimeWithDay || r.ActionTime
                })).slice(0, 10);
                logger.debug('Timeline activities retrieved', { count: results.length });
            } else {
                logger.warn('Timeline API request failed', { status: timelineResponse.status });
            }

            // --- STEP 3: Generate Analysis Report (Internal LLM Call) ---
            logger.debug('Starting user analysis with LLM', {});
            const systemPrompt = `
You are an Enterprise Security Behavior Analyst for a Human Risk Management platform.

GOAL
Generate a ONE-PAGE executive behavioral resilience report for a single employee based strictly on provided activity history.

STRICT OUTPUT
- Output MUST be a single valid JSON object.
- Output MUST match the JSON contract provided by the user EXACTLY (same keys, same nesting, no extra keys, no missing keys).
- Do NOT wrap in markdown. Do NOT add any text before/after JSON.
- If unknown, use "" (string) or null where appropriate. Never fabricate.

PRIMARY EVIDENCE
- Recent activities are the PRIMARY source of truth for behavior.
- Role/department/access level are SECONDARY context only. Do not infer behaviors from role.

PRIVACY / PII
- Do NOT output real names, emails, phone numbers.
- In narrative fields, refer to "the user", "this person", "they".
- meta.user_id is a masked identifier only.

NO TECH JARGON
- Never mention models, providers, infrastructure, or implementation details.

SUPPORTED CAPABILITIES (HARD CONSTRAINT)
- Simulation vectors: EMAIL, QR
- Scenario types: CLICK_ONLY, DATA_SUBMISSION
- Do NOT suggest any other vector or scenario type.

PRIMARY INDIVIDUAL MODEL (ENISA-ALIGNED)
- Individual Security Behavior Stages (ONLY individual model):
  Foundational -> Building -> Consistent -> Champion
- Determine current_stage strictly from observed behaviors:
  - If data is insufficient, default to Foundational.
  - Foundational: no/very limited data OR no stable reporting habit
  - Building: some correct actions; inconsistent reporting or vector coverage
  - Consistent: regular reporting; stable performance across EMAIL and QR
  - Champion: near error-free; proactive reporting; sets a positive example
- target_stage is the next stage (Champion targets Champion).
- progression_hint: one short sentence describing what is needed to advance.

BEHAVIOR SCIENCE ENGINE (USED FOR DECISIONS)
- Diagnose barriers using COM-B: Capability, Opportunity, Motivation.
- Choose trigger type using Fogg B=MAT:
  SIGNAL (ability+motivation ok), SPARK (motivation low), FACILITATOR (ability low).
- Emphasize self-efficacy and friction reduction.
- Avoid fear-based or blaming language.

NEXT STEPS (REQUIRED)
- Recommend next phishing simulation(s) and training(s) tailored to observed patterns.
- Apply NIST Phish Scale explicitly:
  difficulty = EASY|MEDIUM|HARD
  cue_difficulty = LOW|MEDIUM|HIGH
  premise_alignment = LOW|MEDIUM|HIGH
- Progression logic:
  - Clicked & not reported -> keep MEDIUM, change vector (EMAIL <-> QR), increase premise_alignment
  - Resisted & reported -> increase difficulty one step
  - Ignored -> retry same difficulty, change cues
- Each simulation must include:
  - why_this (one short line)
  - designed_to_progress (one short line)

ONE-PAGE LIMITS (HARD)
- strengths max 4, growth_opportunities max 4
- simulations max 2, microlearnings max 2, nudges max 1
- business_value operational max 3, strategic max 3
- Short sentences only.

GARTNER SBCP (CONTEXT ONLY)
- Gartner is organizational context only.
- Never rate the individual using Gartner.
- Keep the label exactly: "Context only — not an individual rating".

REFERENCES (STATIC)
- The "references" array MUST be copied exactly from the JSON contract template.
- Do NOT add, remove, or modify references.
- In why_this fields, name the behavioral principle used (e.g., Authority Bias, Curiosity Gap, Habit Loop, self-efficacy, friction reduction).
- Optionally append a lightweight reference tag from the static list (no academic formatting), e.g.:
  "(Curiosity Gap – Loewenstein)", "(Authority Bias – Milgram)", "(Habit Loop – Duhigg)", "(ENISA)".
`;


            const userPrompt = `
USER CONTEXT (SOURCE OF TRUTH)

Masked user id: ${maskedId}
Role: ${user?.role || ""}
Department: ${user?.departmentName || user?.department || "All"}
Location: ${user?.location || ""}
        Language: ${validateBCP47LanguageCode(user?.preferredLanguage || DEFAULT_LANGUAGE)}
Access level: ${user?.accessLevel || ""}

Recent activities (primary behavioral evidence):
${JSON.stringify(recentActivities)}

---

OUTPUT INSTRUCTIONS

Using the user context above, generate a ONE-PAGE executive behavioral resilience report.

You MUST:
- Base all analysis primarily on Recent activities.
- Use role and access level as secondary context only.
- Follow the system instructions exactly.

Event parsing rules:
- Determine simulation outcomes from productType == "PHISHING SIMULATOR - CLICK-ONLY" and ActionType (Clicked Link, Submitted Data).
- Determine training completion from productType == "SECURITY AWARENESS - TRAINING" and ActionType (Training Completed, Exam Passed).
- Determine reporting events from productType == "INCIDENT RESPONDER" and ActionType == "Reported Email".
- Use difficultyType if present; otherwise leave difficulty-related inferences out of evidence bullets.

Additional rules:
- Time format: ActionTime is DD/MM/YYYY HH:mm (UTC). If uncertain, avoid relative recency claims.
- Scenario mapping:
  - If ActionType == "Submitted Data" => simulations[].scenario_type = DATA_SUBMISSION
  - Else if ActionType == "Clicked Link" => simulations[].scenario_type = CLICK_ONLY
- Reporting evidence:
  - If productType == "INCIDENT RESPONDER" and ActionType == "Reported Email", treat as positive evidence of using the reporting workflow, regardless of result value (e.g., "Undetected").

Allowed values (use ONLY these):
- meta.access_level: LOW | MEDIUM | HIGH
- header.behavioral_resilience.current_stage / target_stage: Foundational | Building | Consistent | Champion
- simulations[].vector: EMAIL | QR
- simulations[].scenario_type: CLICK_ONLY | DATA_SUBMISSION
- simulations[].difficulty: EASY | MEDIUM | HARD
- simulations[].persuasion_tactic: AUTHORITY | URGENCY | CURIOSITY
- simulations[].nist_phish_scale.cue_difficulty: LOW | MEDIUM | HIGH
- simulations[].nist_phish_scale.premise_alignment: LOW | MEDIUM | HIGH
- nudges[].channel: TEAMS | EMAIL
- nudges[].cadence: ONE_OFF | WEEKLY | MONTHLY
- internal.behavior_science_engine.fogg_trigger_type: SIGNAL | SPARK | FACILITATOR

---

JSON CONTRACT TEMPLATE (MUST MATCH EXACTLY)

Return ONLY a single valid JSON object using the structure below.
Do NOT add, remove, or rename keys.
If a value is unknown, use "" or null.

{
  "version": "1.1",
  "meta": {
    "user_id": "",
    "role": "",
    "department": "",
    "location": "",
    "language": "en",
    "access_level": "",
    "generated_at_utc": ""
  },
  "header": {
    "title": "Behavioral Resilience Report",
    "behavioral_resilience": {
      "framework": "Individual Security Behavior (ENISA-aligned)",
      "current_stage": "",
      "target_stage": ""
    },
    "progression_hint": "",
    "footnote": "(ENISA-aligned individual behavior model; Gartner mapping is context-only)"
  },
  "strengths": [],
  "growth_opportunities": [],
  "ai_recommended_next_steps": {
    "simulations": [
      {
        "vector": "",
        "scenario_type": "",
        "difficulty": "",
        "persuasion_tactic": "",
        "title": "",
        "why_this": "",
        "nist_phish_scale": {
          "cue_difficulty": "",
          "premise_alignment": ""
        },
        "designed_to_progress": ""
      }
    ],
    "microlearnings": [
      {
        "title": "",
        "duration_min": 0,
        "language": "en",
        "objective": "",
        "why_this": ""
      }
    ],
    "nudges": [
      {
        "channel": "",
        "cadence": "",
        "message": "",
        "why_this": ""
      }
    ]
  },
  "maturity_mapping": {
    "enisa_security_culture": {
      "current": "",
      "description": "",
      "next": "",
      "what_it_takes": ""
    },
    "gartner_sbcp_context_only": {
      "label": "Context only — not an individual rating",
      "description": "",
      "what_it_takes": ""
    }
  },
  "business_value_zone": {
    "operational": [],
    "strategic": []
  },
  "references": [
    "ENISA – Cybersecurity Culture Guidelines (Behavioural Aspects of Cybersecurity)",
    "Loewenstein (1994) – Curiosity Gap",
    "Milgram (1963) – Authority Bias",
    "Duhigg (2012) – Habit Loop",
    "Kahneman & Tversky (1979) – Loss Aversion",
    "IBM – Cost of a Data Breach Report",
    "Verizon – Data Breach Investigations Report (DBIR)",
    "Gartner – Security Behavior and Culture Program (Context Only)"
  ],
  "internal": {
    "evidence_summary": {
      "key_signals_used": [],
      "data_gaps": []
    },
    "behavior_science_engine": {
      "diagnosis_model": "COM-B",
      "com_b": {
        "capability": "",
        "opportunity": "",
        "motivation": ""
      },
      "trigger_model": "Fogg B=MAT",
      "fogg_trigger_type": "",
      "design_notes": ""
    }
  }
}
`;

            let analysisReport;
            try {
                // Use default model (GPT-OSS via Workers AI)
                const model = getModelWithOverride();

                const response = await withRetry(
                    () => generateText({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        // No temperature param to be safe with OSS models
                    }),
                    '[GetUserInfoTool] analysis-report-generation'
                );

                const cleanedJson = cleanResponse(response.text, 'analysis-report');
                analysisReport = JSON.parse(cleanedJson);

                // Ensure user_id is set in meta (required by schema)
                if (analysisReport && !analysisReport.meta) {
                    analysisReport.meta = {};
                }
                if (analysisReport?.meta && !analysisReport.meta.user_id) {
                    analysisReport.meta.user_id = maskedId;
                }

                logger.debug('Analysis report generated successfully', {});
            } catch (aiError) {
                const err = normalizeError(aiError);
                const errorInfo = errorService.aiModel(err.message, {
                    step: 'analysis-report-generation',
                    maskedId,
                    stack: err.stack
                });
                logErrorInfo(logger, 'error', 'AI analysis generation failed', errorInfo);
                // Don't return - analysis is optional, continue with partial data
            }

            // Normalize preferred language to BCP-47 (default en-gb)
            const preferredLanguageCode = validateBCP47LanguageCode(user?.preferredLanguage || DEFAULT_LANGUAGE);

            const toolResult = {
                success: true,
                userInfo: {
                    targetUserResourceId: userId,
                    maskedId: maskedId,
                    fullName: userFullName,
                    // Use provided departmentName if available (fast path), otherwise extract from user object
                    department: inputDepartmentName || user?.departmentName || user?.department || 'All',
                    email: user?.email,
                    preferredLanguage: preferredLanguageCode
                },
                analysisReport: analysisReport,
                recentActivities: recentActivities
            };

            // Validate result against output schema
            const validationResult = validateToolResult(toolResult, getUserInfoOutputSchema, 'get-user-info');
            if (!validationResult.success) {
                logErrorInfo(logger, 'error', 'Get user info result validation failed', validationResult.error);
                return createToolErrorResponse(validationResult.error);
            }

            return validationResult.data;

        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                step: 'tool-execution',
                stack: err.stack
            });

            logErrorInfo(logger, 'error', 'Tool execution failed', errorInfo);

            return createToolErrorResponse(errorInfo);
        }
    },
});
