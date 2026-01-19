// src/mastra/tools/get-user-info-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ERROR_MESSAGES } from '../../constants';
import { parseName, isValidName, normalizeName } from '../../utils/parsers/name-parser';
import { generateText } from 'ai';
import { withRetry } from '../../utils/core/resilience-utils';
import { getModelWithOverride } from '../../model-providers'; // Use override to pick stronger model
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';
import { ANALYSIS_REFERENCES, ALLOWED_ENUMS_TEXT } from './behavior-analyst-constants';
import { AnalysisSchema, GET_ALL_PAYLOAD, TIMELINE_PAYLOAD, getUserInfoOutputSchema, PlatformUser, ApiActivity, PartialAnalysisReport } from './user-management-types';
import { enrichActivities, formatEnrichedActivitiesForPrompt, type EnrichedActivity } from './activity-enrichment-utils';
import { findUserByEmail, findUserByNameWithFallbacks } from './utils/user-search-utils';
import { uuidv4 } from '../../utils/core/id-utils';
export const getUserInfoTool = createTool({
  id: 'get-user-info',
  description: 'Retrieves user info AND their recent activity timeline. Accepts either targetUserResourceId (direct ID) OR fullName/firstName/lastName (search). Returns a structured AI analysis report.',
  inputSchema: z.object({
    targetUserResourceId: z.string().optional().describe('Direct user ID (skips search step, faster). Use if ID is already known.'),
    departmentName: z.string().optional().describe('Department name to use with targetUserResourceId (avoids extra API call).'),
    email: z.string().optional().describe('User email address (recommended; more reliable than fullName, especially when user has middle name).'),
    fullName: z.string().optional().describe('Full name of the user (e.g., "John Doe", "Peter Parker"). Will be automatically parsed into firstName/lastName.'),
    firstName: z.string().optional().describe('First name of the user (used if fullName is not provided)'),
    lastName: z.string().optional().describe('Last name of the user (optional, used with firstName)'),
    skipAnalysis: z.boolean().optional().describe('If true, skips the expensive AI behavioral report generation. Use when you ONLY need the user ID for assignment.'),
  }).refine(
    data => data.targetUserResourceId || data.email || data.fullName || data.firstName,
    { message: 'Either targetUserResourceId OR email OR fullName/firstName must be provided' }
  ),
  outputSchema: getUserInfoOutputSchema,
  execute: async ({ context, writer }) => {
    const logger = getLogger('GetUserInfoTool');
    const { targetUserResourceId: inputTargetUserResourceId, departmentName: inputDepartmentName, email: inputEmail, fullName: inputFullName, firstName: inputFirstName, lastName: inputLastName } = context;

    // Get Auth Token, CompanyId & baseApiUrl (needed for both paths)
    const { token, companyId, baseApiUrl } = getRequestContext();
    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.USER_INFO.TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    try {
      // Variables for both paths
      // NOTE: These are set via one of the lookup branches (ID / email / name).
      // Keep them optional until we pass a single guard; avoids "used before assigned" lint.
      let userId: string | undefined;
      let userFullName: string | undefined;
      let user: PlatformUser | null = null;
      let firstName: string = '';
      let lastName: string | undefined = undefined;
      let fullName: string = '';

      // STEP 0: Determine user lookup path
      if (inputTargetUserResourceId) {
        // Fast path: Direct ID provided - skip user search
        logger.info('Using provided targetUserResourceId, skipping user search', { targetUserResourceId: inputTargetUserResourceId });
        userId = inputTargetUserResourceId;
        // userFullName will be set to a non-identifying placeholder (avoid leaking names)
        userFullName = `User-${userId}`;
        fullName = userFullName;
      } else {
        // Slow path: Search for user (prefer email, then name with fallbacks)
        const searchDeps = { token, companyId, baseApiUrl, logger };

        if (inputEmail) {
          const email = String(inputEmail).trim().toLowerCase();
          // Mask email for logging (show only domain)
          const maskedEmail = email.replace(/^[^@]+/, '[REDACTED]');
          logger.info('Searching for user by email', { email, maskedEmail });
          try {
            user = await findUserByEmail(searchDeps, GET_ALL_PAYLOAD, email);
          } catch (err) {
            // Helper already logs; return structured error
            const errorInfo = errorService.external('User search by email failed', { error: normalizeError(err).message });
            logErrorInfo(logger, 'error', 'User search error', errorInfo);
            return createToolErrorResponse(errorInfo);
          }

          if (user) {
            userId = user.targetUserResourceId;
            userFullName = `${user.firstName} ${user.lastName}`;
            logger.debug('User found by email', { userId, userFullName });
            fullName = userFullName;
          } else {
            const errorInfo = errorService.notFound(`User "${email}" not found.`, { email });
            logErrorInfo(logger, 'warn', 'User not found', errorInfo);
            return createToolErrorResponse(errorInfo);
          }
        }

        if (!user) {
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
              logger.info('Name parsed and normalized', { original: inputFullName, normalized: normalizedFullName });
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
          logger.info('Searching for user by name', { fullName, firstName, lastName: lastName || 'N/A' });

          try {
            user = await findUserByNameWithFallbacks(searchDeps, GET_ALL_PAYLOAD, firstName, lastName, fullName);
          } catch (err) {
            const errorMsg = normalizeError(err).message;
            // If the error message is specific (like "Simulated company not found"), start with that.
            const errorInfo = errorService.external(errorMsg, { error: errorMsg });
            logErrorInfo(logger, 'error', 'User search error', errorInfo);
            return createToolErrorResponse(errorInfo);
          }

          if (!user) {
            const errorInfo = errorService.notFound(`User "${fullName}" not found.`, { fullName });
            logErrorInfo(logger, 'warn', 'User not found', errorInfo);
            return createToolErrorResponse(errorInfo);
          }

          userId = user.targetUserResourceId;
          userFullName = `${user.firstName} ${user.lastName}`;

          logger.debug('User found', { userId });
        }
      }

      // Guard: by this point we must have resolved a userId
      if (!userId) {
        const errorInfo = errorService.validation('User resolution failed (missing userId)', {
          hasUserId: !!userId,
          hasEmail: !!inputEmail,
          hasFullName: !!inputFullName,
          hasFirstName: !!inputFirstName,
        });
        logErrorInfo(logger, 'error', 'User resolution failed', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const resolvedUserId = userId;

      // --- STEP 2: Get Timeline ---
      const timelinePayload = JSON.parse(JSON.stringify(TIMELINE_PAYLOAD));
      timelinePayload.targetUserResourceId = resolvedUserId;
      timelinePayload.pagination.ascending = false;

      logger.info('Fetching timeline for user', { userId: resolvedUserId });
      const timelineHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      if (companyId) {
        timelineHeaders['x-ir-company-id'] = companyId;
      }

      // Build timeline URL dynamically from baseApiUrl (defaults to test environment)
      const timelineUrl = `${baseApiUrl || 'https://test-api.devkeepnet.com'}/api/leaderboard/get-user-timeline`;

      const timelineResponse = await fetch(timelineUrl, {
        method: 'POST',
        headers: timelineHeaders,
        body: JSON.stringify(timelinePayload)
      });

      let recentActivities = [];
      let enrichedActivities: EnrichedActivity[] = [];
      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json();
        const results = timelineData?.data?.results || [];
        recentActivities = results.map((r: ApiActivity) => ({
          actionType: r.ActionType,
          campaignName: r.name,
          productType: r.productType,
          difficulty: r.difficultyType || 'N/A',
          score: r.points || 0,
          actionTime: r.ActionTimeWithDay || r.ActionTime
        })).slice(0, 10);

        // Enrich activities with semantic context
        enrichedActivities = enrichActivities(results.slice(0, 10));
        logger.info('Timeline activities retrieved and enriched', { count: results.length });
      } else {
        const errorText = await timelineResponse.text();
        logger.warn('Timeline API request failed', {
          status: timelineResponse.status,
          errorBody: errorText.substring(0, 1000)
        });
      }

      // --- STEP 3: Generate Analysis Report (Internal LLM Call) ---
      let analysisReport: PartialAnalysisReport | undefined;

      // OPTIMIZATION: Check skipAnalysis flag
      if (context.skipAnalysis) {
        logger.info('Skipping AI analysis report generation (requested via skipAnalysis)', { userId: resolvedUserId });
      } else {
        if (recentActivities.length === 0) {
          logger.warn('No recent activities found; AI will apply Foundational defaults', { userId: resolvedUserId });
        }
        logger.info('Starting user analysis with LLM', { hasActivities: recentActivities.length > 0 });
        const systemPrompt = `
You are an Enterprise Security Behavior Analyst for a Human Risk Management platform.

GOAL
Generate a ONE-PAGE executive behavioral resilience report for a single employee based strictly on provided activity history.

STRICT OUTPUT
- Output MUST be a single valid JSON object.
- Output MUST match the JSON contract provided by the user EXACTLY (same keys, same nesting, no extra keys, no missing keys).
- Do NOT wrap in markdown. Do NOT add any text before/after JSON.
- If unknown, use "" (string) or null where appropriate. Never fabricate.
- If there is insufficient evidence for a section, keep it brief and use empty arrays [] where applicable.
- meta.generated_at_utc MUST be a UTC timestamp string (ISO 8601 preferred).

PRIMARY EVIDENCE
- Recent activities are the PRIMARY source of truth for behavior.
- Role/department/access level are SECONDARY context only. Do not infer behaviors from role.

EVIDENCE LINKING (MANDATORY)
- Every item in strengths[] and growth_opportunities[] MUST be supported by observed activity signals.
- Use conservative phrasing when evidence is weak (e.g., "Limited evidence suggests...").
- Populate internal.evidence_summary.key_signals_used with 3-8 short bullets describing the strongest signals you used.
- Populate internal.evidence_summary.data_gaps with 1-4 short bullets describing missing evidence (e.g., "No reporting events observed", "No QR simulations observed").

PRIVACY
- Do NOT output real names, emails, phone numbers.
- In narrative fields, refer to "the user", "this person", "they".
- meta.user_id is an internal identifier. Do NOT expose personal data in outputs.

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

RECOMMENDATION RUBRIC (HIGH PRIORITY)
- First, classify the primary behavior pattern from Recent activities (pick ONE as primary):
  1) SUBMITTED_DATA pattern (Submitted Data events)
  2) CLICKED_LINK pattern (Clicked Link events)
  3) REPORTED pattern (Reported Email events)
  4) TRAINING_ONLY pattern (Training Completed/Exam Passed but little simulation evidence)
  5) NO_DATA pattern (no activity evidence)
- Then choose recommendations that directly address that pattern:
  - If SUBMITTED_DATA pattern: prioritize DATA_SUBMISSION next; start EASY or MEDIUM; focus on form-trust cues; keep why_this concrete.
  - If CLICKED_LINK pattern: prioritize CLICK_ONLY next; change vector from last observed; focus on link inspection cues.
  - If REPORTED pattern: increase difficulty one step; vary premise_alignment; reinforce reporting as a strength.
  - If TRAINING_ONLY pattern: start with EASY CLICK_ONLY in EMAIL (then QR as second if you include a second simulation).
  - If NO_DATA pattern: keep recommendations foundational (EASY, CLICK_ONLY, EMAIL; ONE_OFF nudge) and explicitly note data gaps.
- Microlearning objectives MUST align with the primary pattern (e.g., reporting workflow, link verification, credential hygiene, QR safety).
- Nudge message must be short, non-blaming, and directly actionable; cadence must be ONE_OFF unless evidence supports a higher cadence need.

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

User id: ${resolvedUserId}
Role: ${user?.role || ""}
Department: ${user?.departmentName || user?.department || "All"}
Location: ${user?.location || ""}
        Language: ${validateBCP47LanguageCode(user?.preferredLanguage || DEFAULT_LANGUAGE)}
Access level: ${user?.accessLevel || ""}

Recent Activities (primary behavioral evidence):
${enrichedActivities.length === 0 ?
            'NO ACTIVITY DATA AVAILABLE - Apply Foundational defaults per system instructions.' :
            formatEnrichedActivitiesForPrompt(enrichedActivities)}

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

${ALLOWED_ENUMS_TEXT.trim()}

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
  "references": ${JSON.stringify(ANALYSIS_REFERENCES)},
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
          logger.debug('Raw cleaned AI analysis JSON retrieved', { length: cleanedJson.length, preview: cleanedJson.substring(0, 200) });
          analysisReport = JSON.parse(cleanedJson);
          const reportTyped = analysisReport as PartialAnalysisReport;

          // Ensure user_id is set in meta (required by schema)
          if (reportTyped && typeof reportTyped === 'object' && !reportTyped.meta) {
            reportTyped.meta = {};
          }
          if (reportTyped?.meta && !reportTyped.meta.user_id) {
            reportTyped.meta.user_id = resolvedUserId;
          }

          // Deterministic variation: if we have NO activity evidence, keep recommendations foundational
          // but vary the first simulation vector/tactic per user (stable across runs, avoids always identical output).
          if (analysisReport && typeof analysisReport === 'object' && recentActivities.length === 0) {
            const seed = String(resolvedUserId);
            const parity = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 2;
            const vector = parity === 0 ? 'EMAIL' : 'QR';
            const tactic = parity === 0 ? 'CURIOSITY' : 'AUTHORITY';

            const sim0 = reportTyped.ai_recommended_next_steps?.simulations?.[0];
            if (sim0 && typeof sim0 === 'object') {
              sim0.vector = vector;
              sim0.scenario_type = sim0.scenario_type || 'CLICK_ONLY';
              sim0.difficulty = sim0.difficulty || 'EASY';
              sim0.persuasion_tactic = tactic;
              if (sim0.nist_phish_scale && typeof sim0.nist_phish_scale === 'object') {
                sim0.nist_phish_scale.cue_difficulty = sim0.nist_phish_scale.cue_difficulty || 'LOW';
                sim0.nist_phish_scale.premise_alignment = sim0.nist_phish_scale.premise_alignment || 'LOW';
              }
            }
          }

          // Analysis is OPTIONAL: if the model returns invalid JSON contract, drop it and continue.
          const parsedAnalysis = AnalysisSchema.safeParse(analysisReport);
          if (!parsedAnalysis.success) {
            logger.warn('⚠️ Analysis report schema validation failed; continuing without analysisReport', {
              issueCount: parsedAnalysis.error.issues.length,
            });
            analysisReport = undefined;
          } else {
            analysisReport = parsedAnalysis.data;
          }

          logger.debug('Analysis report generated successfully', { analysisReport });
        } catch (aiError) {
          const err = normalizeError(aiError);
          const errorInfo = errorService.aiModel(err.message, {
            step: 'analysis-report-generation',
            userId: resolvedUserId,
            stack: err.stack
          });
          logErrorInfo(logger, 'error', 'AI analysis generation failed', errorInfo);
          // Don't return - analysis is optional, continue with partial data
        }
      } // End of skipAnalysis block

      // Normalize preferred language to BCP-47 (default en-gb)
      const preferredLanguageCode = validateBCP47LanguageCode(user?.preferredLanguage || DEFAULT_LANGUAGE);

      // Define department once for use in both UI signal and tool output
      const dept = inputDepartmentName || user?.departmentName || user?.department || 'All';

      // EMIT UI SIGNAL (Surgical)
      if (userId && writer) {
        try {
          const messageId = uuidv4();
          // Use non-null assertion or fallback for user object properties since userId is present
          const meta = { targetUserResourceId: userId, fullName: userFullName, email: user?.email, department: dept };
          const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

          await writer.write({ type: 'text-start', id: messageId });
          await writer.write({
            type: 'text-delta',
            id: messageId,
            delta: `::ui:target_user::${encoded}::/ui:target_user::\n`
          });
          await writer.write({ type: 'text-end', id: messageId });
        } catch (emitErr) {
          logger.warn('Failed to emit UI signal for user', { error: normalizeError(emitErr).message });
        }
      }

      const toolResult = {
        success: true,
        userInfo: {
          targetUserResourceId: userId,
          fullName: userFullName,
          // Use pre-calculated department value
          department: dept,
          email: user?.email,
          preferredLanguage: preferredLanguageCode
        },
        analysisReport: analysisReport,
        recentActivities: recentActivities
      };

      // Return as-is - analysisReport is complex optional object, skip validation
      return toolResult;

    } catch (error) {
      const err = normalizeError(error);
      // Pass the actual error message (e.g. "Simulated company not found") instead of a generic one
      const errorInfo = errorService.external(err.message, {
        step: 'tool-execution',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Tool execution failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});
