// src/mastra/tools/get-user-info-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../utils/request-storage';
import { ERROR_MESSAGES } from '../constants';
import { generatePIIHash } from '../utils/pii-masking-utils';
import { parseName, isValidName, normalizeName } from '../utils/name-parser';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers'; // Use override to pick stronger model
import { cleanResponse } from '../utils/content-processors/json-cleaner';

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
        masked_user_id: z.string(),
        role: z.string().optional(),
        department: z.string().optional(),
        location: z.string().optional(),
        language: z.string().optional(),
        access_level: z.string().nullable().optional(),
        generated_at_utc: z.string().optional(),
    }),
    header: z.object({
        title: z.string(),
        resilience_stage: z.object({
            framework: z.string(),
            level: z.string(),
        }),
        progression_target: z.string(),
        progression_hint: z.string(),
        footnote: z.string(),
    }),
    strengths: z.array(z.string()),
    growth_opportunities: z.array(z.string()),
    recommended_next_steps: z.object({
        simulations: z.array(z.object({
            vector: z.string(),
            scenario_type: z.string(),
            difficulty: z.string(),
            persuasion_tactic: z.string(),
            title: z.string(),
            rationale: z.string(),
            nist_phish_scale: z.object({
                cue_difficulty: z.string(),
                premise_alignment: z.string(),
            }),
            designed_to_progress: z.string(),
        })),
        microlearnings: z.array(z.object({
            title: z.string(),
            objective: z.string(),
            duration_min: z.number(),
            language: z.string(),
            rationale: z.string(),
        })),
        nudges: z.array(z.object({
            channel: z.string(),
            message: z.string(),
            cadence: z.string(),
            rationale: z.string(),
        })),
    }),
    maturity_mapping: z.object({
        gartner_sbcp: z.object({
            current: z.string(),
            description: z.string(),
            next: z.string(),
            what_it_takes: z.string(),
        }),
        enisa_security_culture: z.object({
            current: z.string(),
            description: z.string(),
            next: z.string(),
            what_it_takes: z.string(),
        }),
    }),
    business_value_zone: z.object({
        operational: z.array(z.string()),
        strategic: z.array(z.string()),
    }),
    references: z.array(z.string()),
});

export const getUserInfoTool = createTool({
    id: 'get-user-info',
    description: 'Searches for a user AND retrieves their recent activity timeline. Accepts either fullName or explicit firstName/lastName. Returns a structured AI analysis report.',
    inputSchema: z.object({
        fullName: z.string().optional().describe('Full name of the user (e.g., "John Doe", "Peter Parker"). Will be automatically parsed into firstName/lastName.'),
        firstName: z.string().optional().describe('First name of the user (used if fullName is not provided)'),
        lastName: z.string().optional().describe('Last name of the user (optional, used with firstName)'),
    }).refine(
        data => data.fullName || data.firstName,
        { message: 'Either fullName or firstName must be provided' }
    ),
    outputSchema: z.object({
        success: z.boolean(),
        userInfo: z.object({
            targetUserResourceId: z.string(),
            maskedId: z.string().describe('Anonymized identifier for Zero PII compliance (e.g., [USER-ABC12345])'),
            fullName: z.string().optional(),
            department: z.string().optional(),
            email: z.string().optional(),
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
    }),
    execute: async ({ context }) => {
        const { fullName: inputFullName, firstName: inputFirstName, lastName: inputLastName } = context;

        // Parse name using utility
        let parsed;
        try {
            if (inputFullName) {
                if (!isValidName(inputFullName)) {
                    return { success: false, error: `Invalid name format: "${inputFullName}"` };
                }
                const normalizedFullName = normalizeName(inputFullName);
                parsed = parseName(normalizedFullName);
                console.log(`📝 Parsed & normalized fullName "${inputFullName}" -> "${normalizedFullName}":`, parsed);
            } else if (inputFirstName) {
                const normalizedFirstName = normalizeName(inputFirstName);
                const normalizedLastName = inputLastName ? normalizeName(inputLastName) : undefined;
                parsed = parseName({ firstName: normalizedFirstName, lastName: normalizedLastName });
                console.log(`📝 Using explicit names (normalized):`, parsed);
            } else {
                return { success: false, error: 'Either fullName or firstName must be provided' };
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to parse name' };
        }

        const { firstName, lastName, fullName } = parsed;
        console.log(`🔍 Searching for user: "${fullName}" (firstName: "${firstName}", lastName: "${lastName || 'N/A'}")`);

        // Get Auth Token
        const store = requestStorage.getStore();
        const token = store?.token;
        if (!token) {
            return { success: false, error: ERROR_MESSAGES.USER_INFO.TOKEN_MISSING };
        }

        try {
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
            const userSearchResponse = await fetch('https://test-api.devkeepnet.com/api/leaderboard/get-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(userSearchPayload)
            });

            if (!userSearchResponse.ok) throw new Error(`User search API error: ${userSearchResponse.status}`);
            const userSearchData = await userSearchResponse.json();
            const users = userSearchData?.items || userSearchData?.data?.results || [];

            if (users.length === 0) {
                return { success: false, message: `User "${fullName}" not found.` };
            }

            const user = users[0];
            const userId = user.targetUserResourceId;
            const userFullName = `${user.firstName} ${user.lastName}`;
            const maskedId = `[USER-${generatePIIHash(userFullName)}]`;

            console.log(`✅ Found user: ${userFullName} (ID: ${userId}, Masked: ${maskedId})`);

            // --- STEP 2: Get Timeline ---
            const timelinePayload = JSON.parse(JSON.stringify(TIMELINE_PAYLOAD));
            timelinePayload.targetUserResourceId = userId;
            timelinePayload.pagination.ascending = false;

            console.log(`🔍 Fetching timeline for ID: ${userId}`);
            const timelineResponse = await fetch('https://test-api.devkeepnet.com/api/leaderboard/get-user-timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
                console.log(`✅ Found ${results.length} activities.`);
            } else {
                console.warn(`⚠️ Timeline API failed: ${timelineResponse.status}`);
            }

            // --- STEP 3: Generate Analysis Report (Internal LLM Call) ---
            console.log('🧠 Analyzing user data with LLM...');

            const systemPrompt = `You are the **User Security Behavior Analyst & Profiler**.
Your job is to build a deep **Psychological, Cultural & Security Behavior Profile** based on the provided user data and output a structured executive JSON report.

🚫 NO TECH JARGON:
- Never mention model names, providers, or infrastructure.
- Focus ONLY on user behavior, intent, and business logic.

🔒 ZERO PII POLICY:
- In ALL text fields of the JSON:
  - Refer to "The user", "This person", "They".
  - NEVER output real names, emails, phone numbers.
- For \`meta.user_name\`, do NOT use a real name. You may:
  - Put a masked ID (e.g., "${maskedId}"), OR
  - Leave it as an empty string "".

🎯 FRAMEWORKS & LOGIC:
- Primary framework: **Gartner Security Behavior & Culture Program (SBCP)**.
- Secondary context (optional): **ENISA Security Culture Framework (individual view)**.
- Simulation difficulty selection: **NIST Phish Scale**.
- Tone: positive, supportive, growth-oriented.

📈 BUSINESS VALUE:
When linking behavior to impact, reference industry standards (IBM Cost of a Data Breach, Verizon DBIR, etc.).

---

## ANALYSIS INSTRUCTIONS

Analyze the provided user data.
**🚨 CRITICAL PRIORITY:** The \`Recent Activities\` list is the **SINGLE MOST IMPORTANT** source of truth.
- You MUST derive the user's risk level and behavior pattern primarily from their past actions (clicks, reports, training completions).
- Role and Department are secondary context.

Analyze:
1. Role & Department (Context)
2. **Recent Activities (BEHAVIORAL CORE)**
If a data point is unknown, leave the JSON field empty. NEVER fabricate metrics.

---

## ANALYSIS LOGIC (HOW TO THINK)

1. **Stage classification (Gartner SBCP):**
   - Levels: Emerging → Developing → Established → Leading.
   - Use behavior to classify.

2. **Exception Rules:**
   - Critical Role but No Data → Emerging (prioritize baseline).
   - Very Low Performance → Developing.
   - Leading User → Leading.

3. **Behavior & triggers:**
   - Identify themes (Finance, Urgency, Curiosity, Authority) from recent activities.

4. **Simulation & Next Steps (NIST Phish Scale):**
   - Clicked & No Report → Medium difficulty, change vector.
   - Resisted & Reported → Increase difficulty.
   - Ignored → Retry same difficulty.

---

## MATURITY MAPPING & BUSINESS VALUE

- Fill maturity mapping with short descriptions.
- Add operational and strategic business value points.`;

            const userPrompt = `Analyze this user:
- Masked ID: ${maskedId}
- Role/Dept: ${user.departmentName || 'Unknown'}
- Recent Activities: ${JSON.stringify(recentActivities)}

---

## OUTPUT FORMAT (STRICT)

You MUST respond with **ONLY** a single valid JSON object that matches this contract exactly.
- Do NOT wrap it in markdown.
- Do NOT add commentary before or after.
- Do NOT add or remove keys.
- If you do not know a value, set it to "" or null.
- All text must be in English.

**RULE FOR RATIONALE:**
When writing 'rationale' fields (for simulations, microlearnings, nudges), YOU MUST CITE A SPECIFIC REFERENCE from the provided list (e.g., "Uses Authority Bias (Milgram)..." or "Aligns with Gartner SBCP...").

Use this exact JSON structure:

{
  "version": "1.0",
  "meta": {
    "user_name": "",
    "role": "",
    "department": "",
    "location": "",
    "language": "",
    "access_level": null,
    "generated_at_utc": ""
  },
  "header": {
    "title": "Behavioral Resilience Report",
    "resilience_stage": { "framework": "Gartner SBCP", "level": "" },
    "progression_target": "",
    "progression_hint": "",
    "footnote": "(aligned with Gartner SBCP framework)"
  },
  "strengths": [],
  "growth_opportunities": [],
  "recommended_next_steps": {
    "simulations": [
      {
        "vector": "EMAIL|QUISHING",
        "scenario_type": "CLICK_ONLY|DATA_SUBMISSION",
        "difficulty": "EASY|MEDIUM|HARD",
        "persuasion_tactic": "AUTHORITY|URGENCY|CURIOSITY",
        "title": "",
        "rationale": "",
        "nist_phish_scale": {
          "cue_difficulty": "LOW|MEDIUM|HIGH",
          "premise_alignment": "LOW|MEDIUM|HIGH"
        },
        "designed_to_progress": ""
      }
    ],
    "microlearnings": [
      { "title": "", "objective": "", "duration_min": 0, "language": "", "rationale": "" }
    ],
    "nudges": [
      { "channel": "TEAMS", "message": "", "cadence": "ONE_OFF|WEEKLY|MONTHLY", "rationale": "" }
    ]
  },
  "maturity_mapping": {
    "gartner_sbcp": {
      "current": "",
      "description": "",
      "next": "",
      "what_it_takes": ""
    },
    "enisa_security_culture": {
      "current": "",
      "description": "",
      "next": "",
      "what_it_takes": ""
    }
  },
  "business_value_zone": {
    "operational": [],
    "strategic": []
  },
  "references": [
    "Loewenstein (1994) – Curiosity Gap",
    "Milgram (1963) – Authority Bias",
    "Duhigg (2012) – Habit Loop",
    "Kahneman & Tversky (1979) – Loss Aversion",
    "IBM (2023) – Cost of a Data Breach",
    "Verizon DBIR (latest)",
    "Gartner SBCP"
  ]
}`;

            let analysisReport;
            try {
                // Use default model (GPT-OSS via Workers AI)
                const model = getModelWithOverride();

                const response = await generateText({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    // No temperature param to be safe with OSS models
                });

                const cleanedJson = cleanResponse(response.text, 'analysis-report');
                analysisReport = JSON.parse(cleanedJson);
                console.log('✅ Analysis report generated successfully.');
                console.log('🎯 Analysis Report', JSON.stringify(analysisReport, null, 2));
            } catch (aiError) {
                console.error('⚠️ AI Analysis failed:', aiError);
            }

            return {
                success: true,
                userInfo: {
                    targetUserResourceId: userId,
                    maskedId: maskedId,
                    fullName: userFullName,
                    department: user.departmentName || user.department || 'All',
                    email: user.email
                },
                analysisReport: analysisReport
            };

        } catch (error) {
            console.error('❌ Tool execution failed:', error);
            return { success: false, error: error instanceof Error ? error.message : ERROR_MESSAGES.USER_INFO.UNKNOWN_ERROR };
        }
    },
});
