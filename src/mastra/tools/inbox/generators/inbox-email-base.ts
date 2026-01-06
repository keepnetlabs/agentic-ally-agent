export function buildInboxEmailBaseSystem(
  topic: string,
  languageCode: string,
  _category: string,
  _riskArea: string,
  _level: string
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
- For quishing/QR code topics → MANDATORY: emails MUST include QR code visual. Email content should ask recipient to "scan QR code" for verification, payment, authentication, or access. Use exact QR image: <img src="https://imagedelivery.net/KxWh-mxPGDbsqJB3c5_fmA/16344751-9716-4ff4-8fe7-5b77c311eb00/public" alt="QR Code" style="width:200px;height:auto;">
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
CRITICAL HTML VALIDATION: ALL HTML tags MUST be properly closed. Every opening tag (<div>, <p>, <h2>, <h3>, <table>, <thead>, <tbody>, <tr>, <td>, <th>, <span>, <ul>, <li>) MUST have a corresponding closing tag (</div>, </p>, </h2>, etc.). Self-closing tags like <img> are allowed. Count open and close tags before output - they MUST match.

ATTACHMENTS: Maximum 1 attachment. CRITICAL: Attachment name and content MUST match email subject and body content.
- Match email context: If email mentions "password reset", attachment should be password-related (e.g., password_reset_instructions.pdf). If email mentions "invoice", use invoice attachment. NEVER mismatch topics.
- Content must be REALISTIC DOCUMENT PREVIEW with actual data (numbers, dates, names, IDs) that matches email scenario.

TOPIC-SPECIFIC ATTACHMENT CONTENT (Use realistic data matching topic):
- INVOICE/PAYMENT → Include: Invoice number (e.g., INV-2024-0847), date, line items with quantities/prices, tax, total (e.g., "Service Fee - $450.00", "Tax (8%) - $36.00", "Total - $486.00"), company details, payment terms.
- PASSWORD/AUTH → Include: Account details (masked), timestamp, IP address (e.g., 192.168.1.45), device info (e.g., "Windows 11, Chrome"), location (e.g., "New York, USA"), verification steps, security recommendations.
- CONTRACT/AGREEMENT → Include: Contract number (e.g., CNT-2024-0123), parties, effective date, key terms, signature sections.
- REPORT/ANALYTICS → Include: Report title, period (e.g., "Q4 2024"), data tables with actual numbers (e.g., "Revenue: $125,000", "Growth: +12.5%"), key findings.
- SOFTWARE/UPDATE → Include: Version number (e.g., "v2.4.1"), release date, changelog, installation instructions.
- POLICY/COMPLIANCE → Include: Policy number (e.g., "POL-2024-089"), effective date, sections, compliance checklist.
- QUISHING/QR CODE (MANDATORY) → Include QR code image: <img src="https://imagedelivery.net/KxWh-mxPGDbsqJB3c5_fmA/16344751-9716-4ff4-8fe7-5b77c311eb00/public" alt="QR Code" style="width:200px;height:auto;"> + verification instructions.

ATTACHMENT FORMAT:
- PDF/DOC → Wrap in <div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>. Include: Title (<h2 class='text-lg font-bold mb-2'>), 2-3 sections (<h3 class='text-md font-semibold mt-3'>), realistic data (numbers, dates, IDs), bullet lists/paragraphs. CRITICAL: Close ALL tags - every <div>, <h2>, <h3>, <p>, <ul>, <li> must have closing tag.
- XLSX → Wrap in <div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>. Include: Table with headers (<table class='border border-gray-300 w-full'><thead><tr class='bg-gray-100'><th class='border p-2'>), 3-5 data rows with realistic values, totals if applicable. CRITICAL: Close ALL table tags - <table>, <thead>, <tbody>, <tr>, <th>, <td> must all have closing tags.
- All types → Use Tailwind spacing (mb-2, mb-4, mt-3). Include specific data (invoice numbers, IPs, versions, etc.). DARK MODE: Wrap in <div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>. CRITICAL: Validate HTML tag pairs - open tags count MUST equal close tags count.
File types: pdf, doc, xlsx, jpg, png, zip, txt.

EXACT FORMAT (return as-is, single object):
{
  "id": "string",
  "sender": "user@domain.com",
  "subject": "Natural business subject in ${languageCode}, matching email context and sender role. MUST sound native-professional, NOT formal/mechanical translation.",
  "preview": "8-14 words, in ${languageCode}, natural and conversational",
  "timestamp": "MUST use different timestamp for EACH email, written naturally in ${languageCode} (e.g., for Turkish: '15 dakika önce', 'dün', 'bu sabah'; for Arabic: 'منذ 15 دقيقة', 'أمس', etc.). Generate natural native expressions for relative time (15-30 min ago, 1-2 hours ago, yesterday, this morning, etc.) that have NOT been used in previous emails. NEVER repeat timestamps.",
  "isPhishing": true|false,
  "content": "<div class='text-[#1C1C1E] dark:text-[#F2F2F7]'>Multi-paragraph HTML content in ${languageCode}, natural business tone</div>",
  "headers": ["Return-Path: <...>", "SPF: ...", "DMARC: ..."],
  "difficulty": "EASY|MEDIUM|MEDIUM-HARD|HARD",
  "explanation": "Written in ${languageCode}: Point out 2-3 observable red flags or legitimacy indicators. Describe WHAT is suspicious/normal, NOT what user should do. Natural, professional tone.",
  "attachments": [{"id": "string", "name": "filename (in ${languageCode}).ext", "size": "KB", "type": "pdf|doc|xlsx", "content": "<div>HTML content in ${languageCode}</div> (CRITICAL: ALL HTML tags must be properly closed)"}]
}

DIFFICULTY CALIBRATION:
- EASY: External domain + failing SPF/DMARC + obvious urgency (clear phishing indicators)
- MEDIUM: Some legitimate signals mixed with subtle red flags
- MEDIUM-HARD: Near-legitimate domain + mixed SPF/DMARC + colleague impersonation (harder to detect)
- HARD: Official internal domain + clean headers + minimal red flags (requires context analysis)

CRITICAL: "attachments" must be array of objects, NOT nested arrays. If no attachment, use empty array [].
`;
}


