import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';

export const bodyBehavioralAnalysisOutputSchema = z.object({
    urgency_level: z.enum(['none', 'low', 'medium', 'high']).describe('Degree of time pressure/urgency framing in body'),
    emotional_pressure: z.enum(['none', 'fear', 'urgency', 'reward']).describe('Type of emotional manipulation detected'),
    social_engineering_pattern: z.enum(['none', 'pretexting', 'extortion', 'baiting']).describe('Social engineering tactic used'),
    verification_avoidance: z.boolean().describe('True if email discourages verification/validation'),
    verification_avoidance_tactics: z.string().describe('Examples: "Don\'t call the number", "keep confidential", etc. or "none"'),
    urgency_indicators: z.string().describe('List of urgency framing phrases found in body (e.g., "immediate action", "act now") or "none"'),
    emotional_pressure_indicators: z.string().describe('Examples of emotional manipulation phrases or "none"'),
    behavioral_summary: z.string().describe('1-2 sentence summary of behavioral manipulation tactics detected'),

    // Pass-through context
    original_email: EmailIREmailDataSchema,
});

export const bodyBehavioralAnalysisTool = createTool({
    id: 'email-ir-body-behavioral-analysis-tool',
    description: 'Analyzes email body for behavioral manipulation and social engineering tactics',
    inputSchema: EmailIREmailDataSchema,
    outputSchema: bodyBehavioralAnalysisOutputSchema,
    execute: async ({ context }) => {
        const email = context;
        const emailBody = email.htmlBody || email.subject || 'No body content';
        const senderDisplay = email.senderName || email.from;

        const prompt = `
# Task: Body Behavioral Analysis

Analyze the email body for manipulation tactics, urgency framing, emotional pressure, and social engineering patterns.
Focus purely on HOW the email tries to manipulate the reader, NOT what it's asking for (that's Intent Analysis).

## BEHAVIORAL MANIPULATION SIGNALS

### Urgency Framing (Time Pressure)
Detect phrases that create artificial deadline pressure:
- "Immediate action required"
- "Act now"
- "Limited time offer"
- "Your account will be closed if..."
- "Deadline: TODAY"
- "Expires in 24 hours"
- "Urgent: respond within 1 hour"

**Urgency Levels:**
- **high**: Multiple urgent phrases, emphasis on immediate action (caps, exclamation marks)
- **medium**: Clear deadline or time pressure mentioned
- **low**: Mild time reference without strong pressure
- **none**: No time pressure

### Emotional Pressure - FEAR
Threat-based manipulation:
- "Your account has been compromised"
- "We detected unusual activity"
- "Legal action will be taken"
- "Your data will be deleted"
- "Account suspended"
- "Verify immediately or lose access"

### Emotional Pressure - URGENCY
Time-sensitive incentive:
- "Limited slots available"
- "Offer expires soon"
- "Bonus available this week only"
- "Last chance to claim"

### Emotional Pressure - REWARD
Too-good-to-be-true incentives:
- "You've won a prize!"
- "Claim your bonus"
- "Free money transfer"
- "Unexpected inheritance"
- "You're specially selected"

### Social Engineering Patterns

#### Pretexting (False Scenario)
- Inventing a fake scenario to build trust
- Example: "I'm your IT team doing a security audit"
- Creates false authority/legitimacy

#### Extortion
- Explicit threat with demand
- Example: "Pay \$500 or I'll send your data to everyone"
- Blackmail, sextortion, threat-based

#### Baiting
- Suspicious offer that's too good to be true
- "Click here for free gift cards"
- "Download your refund"
- Designed to trigger curiosity/greed

### Verification Avoidance
Phrases that discourage independent verification:
- "Don't call the bank, they're in on it"
- "Keep this confidential"
- "Don't forward this to anyone"
- "Don't tell your manager"
- "Don't verify through official channels"
- "Use the link in this email only"

---

## EMAIL DATA

**From**: ${senderDisplay}
**Subject**: ${email.subject}

**Body** (full content):
\`\`\`
${emailBody}
\`\`\`

---

## OUTPUT

Analyze purely for BEHAVIORAL signals (manipulation tactics, not intent):

1. **urgency_level**: Degree of time pressure (none/low/medium/high)
2. **emotional_pressure**: Type detected (none/fear/urgency/reward)
3. **social_engineering_pattern**: Tactic detected (none/pretexting/extortion/baiting)
4. **verification_avoidance**: true if email discourages verification, false otherwise
5. **verification_avoidance_tactics**: Quote specific phrases if present, or "none"
6. **urgency_indicators**: List phrases creating time pressure, or "none"
7. **emotional_pressure_indicators**: List phrases using fear/urgency/reward, or "none"
8. **behavioral_summary**: 1-2 sentence summary of manipulation tactics

**Note**: You are analyzing HOW the email manipulates, not WHAT it's asking for.
Example: If email says "Verify your password immediately or lose access" - that's:
- urgency_level: high (time pressure)
- emotional_pressure: fear (threat of loss)
- social_engineering_pattern: pretexting (false IT scenario)

Even if the body is empty or short, provide honest assessment: "No behavioral manipulation detected" or describe what IS present.
`;

        const result = await emailIRAnalyst.generate(prompt, {
            output: bodyBehavioralAnalysisOutputSchema.omit({ original_email: true }),
        });

        return {
            ...result.object,
            original_email: email,
        };
    },
});
