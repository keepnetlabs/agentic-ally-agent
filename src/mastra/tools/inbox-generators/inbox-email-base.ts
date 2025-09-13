export function buildInboxEmailBaseSystem(
    topic: string,
    languageCode: string,
    category: string,
    riskArea: string,
    level: string
): string {
    return `You generate ONE ${topic} microlearning inbox simulation email as a valid JSON object in ${languageCode}. No markdown, no backticks, no explanations.

Topic: ${topic} (${category}, ${riskArea}, ${level} level)
JSON RULES:
- Use double quotes for all strings
- No trailing commas, no comments
- Escape quotes properly in content
- "type" must be one of: pdf, doc, xlsx, jpg, png, zip, txt
- "sender" must be a valid email format

CONTENT RULES (shared):
- Operational tone, not educational; avoid meta language (no "this is an example")
- Keep literal "${topic}" minimal (0–1x); convey via realistic details
- Email HTML must be multi-paragraph, realistic, and topic-specific:
  - Use <div>, <p>, <ul>, <li>, <strong>, <em>, and small inline styles for readability
  - Include concrete names, ids, dates/times, room/tool names; vary greetings/sign-offs
  - Provide at least 2 paragraphs and one small details list (<ul><li>..)</li></ul>) when natural
  - No scripts/external assets
- Include plausible specifics (names, tickets/PO, date/time, rooms/tools)
- Links & domains policy depends on variant delta; never ask for credentials in legitimate variants

STYLING (REQUIRED):
- Wrap BOTH email body and attachment HTML in a top-level <div class='text-[#1C1C1E] dark:text-[#F2F2F7]'> ... </div>
- Apply additional classes as needed but ALWAYS include text-[#1C1C1E] dark:text-[#F2F2F7] on the top-level container.

ATTACHMENT–BODY CONSISTENCY (CRITICAL - MUST FOLLOW):
- FIRST: Choose a specific file name that fits the topic and scenario
- THEN: Use that EXACT same file name in both email body text AND attachment "name" field
- Example: If email says "Please review the security_report.pdf", then attachment name MUST be "security_report.pdf"
- CONTENT CONSISTENCY: All IDs, dates, ticket numbers, employee names mentioned in email MUST appear in attachment content
- Example: Email mentions "Ticket #SR-2025-001" → attachment content must include "Ticket #SR-2025-001"
- Attachment content should be realistic preview of what that file would actually contain
- No generic placeholders - make it look like a real document preview

OUTPUT FORMAT (single JSON object only):
{
  "id": "string",
  "sender": "user@domain.com",
  "subject": "≤ 90 chars",
  "preview": "8–14 words",
  "timestamp": "relative time",
  "isPhishing": true|false,
  "content": "<div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>Rich multi-paragraph HTML email content aligned to ${topic}. MUST mention the specific attachment file name if attachment exists.</div>",
  "headers": ["Return-Path: <...>", "SPF: ...", "DMARC: ..."],
  "difficulty": "EASY|MEDIUM|MEDIUM-EASY|MEDIUM-HARD|HARD",
  "explanation": "why this should/shouldn't be reported (1–2 sentences)",
  "attachments": [
    {
      "id": "string",
      "name": "EXACT_FILENAME_FROM_EMAIL_BODY.ext",
      "size": "50KB–2MB",
      "type": "pdf|doc|xlsx|jpg|png|zip|txt",
      "content": "<div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>REAL document preview matching the filename. Example for 'security_audit_Q4.xlsx':\n<h3>Security Audit Report - Q4 2025</h3>\n<table><tr><th>Department</th><th>Score</th></tr><tr><td>IT Security</td><td>87%</td></tr></table>\n<p>Report ID: SA-Q4-2025-001</p>\n<p>Generated: 2025-09-13</p></div>"
    }
  ]
}
`;
}


