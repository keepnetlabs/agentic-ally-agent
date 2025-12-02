import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../utils/request-storage';
import { ERROR_MESSAGES } from '../constants';

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

export const getUserInfoTool = createTool({
    id: 'get-user-info',
    description: 'Searches for a user AND retrieves their recent activity timeline. Useful for understanding user history.',
    inputSchema: z.object({
        firstName: z.string().describe('First name of the user'),
        lastName: z.string().optional().describe('Last name of the user'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        userInfo: z.object({
            targetUserResourceId: z.string(),
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
        message: z.string().optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const { firstName, lastName } = context;
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;

        console.log(`🔍 Searching for user: "${fullName}"`);

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
            console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${userId})`);

            // --- STEP 2: Get Timeline ---
            const timelinePayload = JSON.parse(JSON.stringify(TIMELINE_PAYLOAD));
            timelinePayload.targetUserResourceId = userId;
            timelinePayload.pagination.ascending = false; // Get NEWEST activities first

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

                // Enrich activity data
                recentActivities = results.map((r: any) => ({
                    actionType: r.ActionType,
                    campaignName: r.name,
                    productType: r.productType,
                    difficulty: r.difficultyType || 'N/A',
                    score: r.points || 0,
                    actionTime: r.ActionTimeWithDay || r.ActionTime
                })).slice(0, 10); // Get last 10 activities

                console.log(`✅ Found ${results.length} activities.`);
            } else {
                console.warn(`⚠️ Timeline API failed: ${timelineResponse.status}`);
            }

            return {
                success: true,
                userInfo: {
                    targetUserResourceId: userId,
                    fullName: `${user.firstName} ${user.lastName}`,
                    department: user.departmentName || user.department || 'Unknown',
                    email: user.email
                },
                recentActivities: recentActivities
            };

        } catch (error) {
            console.error('❌ Tool execution failed:', error);
            return { success: false, error: error instanceof Error ? error.message : ERROR_MESSAGES.USER_INFO.UNKNOWN_ERROR };
        }
    },
});
