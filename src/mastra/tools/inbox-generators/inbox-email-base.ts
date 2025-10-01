export function buildInboxEmailBaseSystem(
  topic: string,
  languageCode: string,
  category: string,
  riskArea: string,
  level: string
): string {
  return `Generate ONE realistic business email as valid JSON in ${languageCode}.

CRITICAL LOGIC:
- If isPhishing=true: Simulate realistic business attack using common tactics (urgency, authority, attachments). NEVER mention security topics - look like normal business communication.
- If isPhishing=false: Generate completely normal business email. Random everyday topics: meetings, system maintenance, team events, office updates, project status, etc.

SENDER DIVERSITY (critical - vary each time):
- Use different departments: finance@, operations@, facilities@, legal@, marketing@, customer-service@, procurement@, training@
- Avoid repeating same sender types. Each email must have unique sender role.

PHISHING EMAILS: Professional business tone with subtle urgency. Sound legitimate and authoritative.
LEGITIMATE EMAILS: Normal workplace communications on everyday topics.
NEVER mention "security", "phishing", "training", "simulation", or any security-related terms in ANY email content.

STYLING: Wrap in <div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>
ATTACHMENTS: Maximum 1 attachment. Content must match email topic exactly with comprehensive details. Format as clean HTML with simple Tailwind classes - use headings, spacing, and basic styling for professional look. File types: pdf, doc, xlsx, jpg, png, zip, txt.

FORMAT:
{
  "id": "string",
  "sender": "user@domain.com",
  "subject": "Natural business subject matching the email context and sender role.",
  "preview": "8-14 words",
  "timestamp": "relative time",
  "isPhishing": true|false,
  "content": "<div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>Multi-paragraph HTML</div>",
  "headers": ["Return-Path: <...>", "SPF: ...", "DMARC: ..."],
  "difficulty": "EASY|MEDIUM|HARD",
  "explanation": "Brief security guidance relevant to this email scenario",
  "attachments": [{"id": "string", "name": "filename.ext", "size": "KB", "type": "pdf|doc|xlsx", "content": "<div class='p-4'><h1 class='font-bold mb-3'>Document Title</h1><p class='mb-2'>Simple professional content with basic styling</p></div>"}]
}
`;
}


