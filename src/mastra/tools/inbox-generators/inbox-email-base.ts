export function buildInboxEmailBaseSystem(
  topic: string,
  languageCode: string,
  category: string,
  riskArea: string,
  level: string
): string {
  return `Generate ONE realistic business email as a single valid JSON object in ${languageCode}.
OUTPUT MUST BE: A single object (not wrapped in array, not nested). Return ONLY the JSON object, no markdown, no code blocks.

CRITICAL LOGIC:
- If isPhishing=true: Simulate realistic business attack related to ${topic}. Use common tactics (urgency, authority, attachments) but MUST relate to the training topic context. NEVER mention "security", "phishing", "training" - look like normal business communication.
- If isPhishing=false: Generate normal business email that could realistically appear alongside ${topic}-related scenarios. Choose everyday workplace topics but consider topic context when relevant.

TOPIC CONTEXT: ${topic}
- For deepfake/video topics → emails may involve: video messages, video calls, media files, CEO announcements, training videos, video conferencing
- For phishing/email topics → emails may involve: account verification, password resets, suspicious links, invoice requests
- For malware/file topics → emails may involve: software updates, file downloads, document attachments, system patches
- For password/MFA topics → emails may involve: account security, authentication, login alerts, credential updates
- Use topic context to make emails realistic and relevant to what users are learning

SENDER DIVERSITY (critical - vary each time):
- Pick sender from domainHint options provided in variant instructions
- Use different departments across emails: finance@, hr@, operations@, facilities@, legal@, training@, compliance@, marketing@, projects@
- NEVER reuse same sender department (e.g., if email 1 uses finance@, email 2 must use different dept like hr@ or operations@)
- Each email in inbox must have unique sender role/department

PHISHING EMAILS: Professional business tone with subtle urgency. Sound legitimate and authoritative.
LEGITIMATE EMAILS: Normal workplace communications on everyday topics.
GREETING RULE: Use ONLY ONE greeting at the start of content. Pick one from hints provided, never stack multiple greetings.
NEVER mention "security", "phishing", "training", "simulation", or any security-related terms in ANY email content.

STYLING: Wrap in <div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>. Start greeting with <p>, not <h1> or <h2>.
ATTACHMENTS: Maximum 1 attachment. CRITICAL: Attachment name and content MUST match email subject and body content.
- Match email context: If email mentions "password reset", attachment should be password-related (e.g., password_reset_instructions.pdf, account_verification_form.pdf). If email mentions "invoice", use invoice attachment. NEVER mismatch topics.
- Content must be REALISTIC DOCUMENT PREVIEW with actual data (numbers, dates, names) that matches email scenario.
- PDF/DOC → Include: Title (<h2 class='text-lg font-bold mb-2'>) matching email topic, 2-3 sections (<h3 class='text-md font-semibold mt-3'>), bullet lists or paragraphs
- XLSX → Include: Table with headers (<table class='border border-gray-300 w-full'><thead><tr class='bg-gray-100'><th class='border p-2'>), 3-5 data rows related to email content
- All types → Use Tailwind spacing (mb-2, mb-4, mt-3), keep simple but professional. Include specific data relevant to email scenario.
File types: pdf, doc, xlsx, jpg, png, zip, txt.

EXACT FORMAT (return as-is, single object):
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
  "explanation": "Point out 2-3 observable red flags or legitimacy indicators. Describe WHAT is suspicious or normal, NOT what the user should do.",
  "attachments": [{"id": "string", "name": "filename.ext", "size": "KB", "type": "pdf|doc|xlsx", "content": "<div>...</div>"}]
}

CRITICAL: "attachments" must be array of objects, NOT nested arrays. If no attachment, use empty array [].
`;
}


