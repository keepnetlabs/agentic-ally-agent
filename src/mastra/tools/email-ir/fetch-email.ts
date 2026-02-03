import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { EmailIREmailDataSchema } from '../../types/email-ir';

export const fetchEmailInputSchema = z.object({
    id: z.string(),
    accessToken: z.string(),
    apiBaseUrl: z.string().optional().default('https://test-api.devkeepnet.com'),
});

export const fetchEmailTool = createTool({
    id: 'email-ir-fetch-email-tool',
    description: 'Fetches email data from the Keepnet API using an ID',
    inputSchema: fetchEmailInputSchema,
    outputSchema: EmailIREmailDataSchema,
    execute: async ({ context }) => {
        const { id, accessToken, apiBaseUrl } = context;
        const url = `${apiBaseUrl}/notified-emails/${id}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch email [${response.status}]: ${errorBody}`);
            }

            const data = await response.json();

            // The API returns { data: { ...emailFields } } structure based on the user's example
            // We need to extract the 'data' property
            const emailData = data.data || data;

            return emailData;
        } catch (error) {
            console.error('Error fetching email:', error);
            throw error;
        }
    },
});
