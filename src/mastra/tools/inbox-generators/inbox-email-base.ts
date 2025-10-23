export function buildInboxEmailBaseSystem(
  topic: string,
  languageCode: string,
  category: string,
  riskArea: string,
  level: string
): string {
  return `Generate ONE realistic business email as a single valid JSON object in ${languageCode} ONLY.

⚠️ LANGUAGE CONSISTENCY - MANDATORY:
OUTPUT: ${languageCode} ONLY. Every field, every word.

• Subject, preview, content, explanation, attachment names: ALL in ${languageCode}
• ZERO other languages (except proper nouns, unavoidable technical terms)
• ZERO language mixing
• Natural business language (NOT formal/mechanical/translated style)
• Like native professional in ${languageCode} wrote it

OUTPUT MUST BE: A single object (not wrapped in array, not nested). Return ONLY the JSON object, no markdown, no code blocks.

CRITICAL LOGIC:
- If isPhishing=true: Simulate realistic business attack related to ${topic}. Use common tactics (urgency, authority, attachments) but MUST relate to the training topic context. NEVER mention "security", "phishing", "training" - look like normal business communication.
- If isPhishing=false: Generate normal business email that could realistically appear alongside ${topic}-related scenarios. Choose everyday workplace topics but consider topic context when relevant.

TOPIC CONTEXT: ${topic}
- For deepfake/video topics → emails may involve: video messages, video calls, media files, CEO announcements, training videos, video conferencing
- For vishing/voice phishing topics → emails may involve: calendar invites, video conference links, meeting invitations, urgent call requests, Zoom/Teams/WebEx links, executive briefing links
- For smishing/SMS phishing topics → emails may involve: SMS notifications forwarded, text message alerts, delivery notifications, account alerts, package tracking, message forwarding context
- For quishing/QR code topics → emails may involve: QR codes in attachments or content. For QR code images: <img src="https://imagedelivery.net/KxWh-mxPGDbsqJB3c5_fmA/16344751-9716-4ff4-8fe7-5b77c311eb00/public" alt="QR Code" style="width:200px;height:auto;">
- For phishing/email topics → emails may involve: account verification, password resets, suspicious links, invoice requests
- For malware/file topics → emails may involve: software updates, file downloads, document attachments, system patches
- For password/MFA topics → emails may involve: account security, authentication, login alerts, credential updates
- For security protocols/incident response → emails may involve: policy compliance, protocol violations, remote work procedures, security guidelines, procedural checklist
- Use topic context to make emails realistic and relevant to what users are learning

SENDER DIVERSITY (CRITICAL):
- Pick sender from domainHint options in variant instructions
- NEVER reuse same department across emails (e.g., email 1: finance@, email 2: hr@, email 3: operations@)
- Each email must have UNIQUE department name

PHISHING EMAILS: Professional business tone with subtle urgency. Sound legitimate and authoritative.
LEGITIMATE EMAILS: Normal workplace communications on everyday topics.
NEVER mention "security", "phishing", "training", "simulation", or any security-related terms in ANY email content.
CRITICAL: NEVER use the topic name literally in email content (e.g., "Deepfake Verification", "Ransomware Protection", "Malware Detection"). Use topic CONTEXT instead:
- ❌ WRONG: "Deepfake Verification Signals review", "Phishing Awareness Module"
- ✅ RIGHT: "CEO video message review", "Account verification required"

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
  "subject": "Natural business subject in ${languageCode}, matching email context and sender role. MUST sound native-professional, NOT formal/mechanical translation.",
  "preview": "8-14 words, in ${languageCode}, natural and conversational",
  "timestamp": "MUST use different timestamp for EACH email. Options: '2 hours ago', 'Yesterday', 'This morning', '30 minutes ago', '1 day ago', '4 hours ago'. Pick ONE option that has NOT been used in previous emails. NEVER repeat.",
  "isPhishing": true|false,
  "content": "<div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>Multi-paragraph HTML content in ${languageCode}, natural business tone</div>",
  "headers": ["Return-Path: <...>", "SPF: ...", "DMARC: ..."],
  "difficulty": "EASY|MEDIUM|MEDIUM-HARD|HARD",
  "explanation": "Written in ${languageCode}: Point out 2-3 observable red flags or legitimacy indicators. Describe WHAT is suspicious/normal, NOT what user should do. Natural, professional tone.",
  "attachments": [{"id": "string", "name": "filename (in ${languageCode}).ext", "size": "KB", "type": "pdf|doc|xlsx", "content": "<div>HTML content in ${languageCode}</div>"}]
}

DIFFICULTY CALIBRATION:
- EASY: External domain + failing SPF/DMARC + obvious urgency (clear phishing indicators)
- MEDIUM: Some legitimate signals mixed with subtle red flags
- MEDIUM-HARD: Near-legitimate domain + mixed SPF/DMARC + colleague impersonation (harder to detect)
- HARD: Official internal domain + clean headers + minimal red flags (requires context analysis)

CRITICAL: "attachments" must be array of objects, NOT nested arrays. If no attachment, use empty array [].
`;
}


