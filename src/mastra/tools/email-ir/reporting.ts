import { createTool } from '@mastra/core/tools';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIRCanvasSchema } from '../../schemas/email-ir';
import { riskAssessmentOutputSchema } from './risk-assessment';

export const reportingTool = createTool({
    id: 'email-ir-reporting-tool',
    description: 'Generates Final Canvas JSON Report',
    inputSchema: riskAssessmentOutputSchema,
    outputSchema: EmailIRCanvasSchema,
    execute: async ({ context }) => {
        const inputData = context;
        const prompt = `
You are the **Reporting Agent**.
Generate the Final Analyst Report strictly following the provided Canvas JSON schema.

Using all the accumulated analysis data, construct the final JSON report.
Ensure the 'agent_determination' is a clear, human-readable narrative.
Fill 'evidence_flow' with the logical steps taken.

Data Context:
- Email: ${inputData.original_email.subject}
- Triage: ${JSON.stringify(inputData.triage_result)}
- Features: ${JSON.stringify(inputData.feature_result)}
- Risk: ${inputData.risk_level} (${inputData.justification})

Notes:
- 'blast_radius' logic is currently mocked (assume 1 user affected).
- 'transparency_notice' must explain that this is AI-generated.
`;

        const result = await emailIRAnalyst.generate(prompt, {
            output: EmailIRCanvasSchema,
        });

        return result.object;
    }
});
