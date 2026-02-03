import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { emailIRAnalyst } from '../../agents/email-ir-analyst';
import { EmailIREmailDataSchema } from '../../types/email-ir';

export const headerAnalysisOutputSchema = z.object({
    spf_pass: z.boolean().describe('True if SPF authentication passed'),
    dkim_pass: z.boolean().describe('True if DKIM signature verified'),
    dmarc_pass: z.boolean().describe('True if DMARC alignment verified'),
    domain_similarity: z.string().describe('Detected domain spoofing or similarity (e.g., "keepnetlabs.co vs keepnetlabs.com" or "none"'),
    sender_ip_reputation: z.string().describe('Sender IP reputation status (clean/suspicious/blocklisted)'),
    geolocation_anomaly: z.string().describe('Geographic anomaly if detected (e.g., "Sender IP from China but email claims to be from USA" or "none")'),
    routing_anomaly: z.string().describe('Suspicious routing or relay patterns detected (e.g., "unusual hop count" or "none")'),
    threat_intel_findings: z.string().describe('Summary of external threat intelligence findings (VirusTotal, etc.) from input data'),
    header_summary: z.string().describe('1-2 sentence summary of authentication and routing assessment'),

    // Pass-through context
    original_email: EmailIREmailDataSchema,
});

export const headerAnalysisTool = createTool({
    id: 'email-ir-header-analysis-tool',
    description: 'Analyzes email headers for authentication and routing signals',
    inputSchema: EmailIREmailDataSchema,
    outputSchema: headerAnalysisOutputSchema,
    execute: async ({ context }) => {
        const email = context;
        const emailId = email.from?.split('@')[0] || 'unknown-sender';

        // Import logging utilities
        const { loggerHeader } = await import('./logger-setup');
        const { createLogContext, TimingTracker, logStepStart, logStepComplete, logStepError, logSignalDetected, logAuthResults, logPerformance } = await import('./logger-setup');

        const ctx = createLogContext(emailId, 'header-analysis');
        const timing = new TimingTracker(emailId);

        try {
            logStepStart(loggerHeader, ctx, {
                sender: email.from,
                domain: email.from?.split('@')[1],
                sender_ip: email.senderIp
            });

            // Parse headers into key-value map for easier access
            const headerMap = new Map<string, string>();
            if (email.headers) {
                email.headers.forEach(h => {
                    headerMap.set(h.key.toLowerCase(), h.value);
                });
            }

            // Extract relevant header values
            const authResults = headerMap.get('authentication-results') || 'Not provided';
            const senderIP = email.senderIp || 'Unknown';
            const geoLocation = email.geoLocation || 'Unknown';
            const headerList = email.headers ? email.headers.map(h => `${h.key}: ${h.value}`).join('\n') : 'No headers available';

            // Helper to summarize scans and reduce token count
            const summarizeScans = (items: any[], type: 'url' | 'ip' | 'name') => {
                return items
                    .slice(0, 10) // Limit to top 10 items to prevent context overflow
                    .map(item => {
                        const val = item[type];
                        const cleanScans = (item.analysisList || []).filter((s: any) => s.result !== 'Error');

                        if (cleanScans.length === 0) return null;

                        const malicious = cleanScans.filter((s: any) => s.result === 'Malicious' || s.result === 'Phishing');

                        // We only care about Malicious or clean. Suspicious is not a valid verdict in our intake.
                        if (malicious.length > 0) {
                            return { value: val, status: 'MALICIOUS', engines: malicious.map((m: any) => m.analysisEngineType) };
                        }

                        return { value: val, status: 'CLEAN', scanned_by: cleanScans.length };
                    })
                    .filter(Boolean); // Remove nulls
            };

            const cleanThreatIntel = summarizeScans(email.urls || [], 'url');
            const cleanIpIntel = summarizeScans(email.ips || [], 'ip');
            const cleanAttachmentIntel = summarizeScans(email.attachments || [], 'name');

            // Conditional Attachment Section
            const attachmentSection = cleanAttachmentIntel.length > 0
                ? `**Attachments**:\n${JSON.stringify(cleanAttachmentIntel, null, 2)}`
                : '';

            const prompt = `
# Task: Header & Threat Intel Analysis
Analyze the provided email headers and threat intelligence data.
Your goal is to validate authentication (SPF/DKIM/DMARC), check for routing anomalies, and synthesize external threat scan results.

## ANALYSIS CRITERIA & RULES

### SPF (Sender Policy Framework)
- Check if sender IP is authorized in sender domain's SPF record
- Look for "spf=pass", "spf=fail", "spf=neutral", "spf=softfail" in Authentication-Results
- SPF pass = legitimate sender domain (harder to spoof)
- SPF fail = sender not authorized by domain owner

### DKIM (DomainKeys Identified Mail)
- Check if email signature is cryptographically verified
- Look for "dkim=pass", "dkim=fail", "dkim=none" in Authentication-Results
- DKIM pass = email not tampered with, comes from domain
- DKIM fail = signature invalid or missing

### DMARC (Domain-based Message Authentication, Reporting & Conformance)
- Check domain alignment (does From domain match SPF/DKIM domain?)
- Look for "dmarc=pass", "dmarc=fail", "dmarc=none" in Authentication-Results
- DMARC pass = strong indicator of legitimate source
- DMARC fail = likely domain spoofing attempt

### Domain Similarity Attack Detection
- Does sender domain closely mimic a trusted brand? (keepnetlabs.co vs keepnetlabs.com)
- Look for typosquatting patterns (1 character off from legitimate domain)
- Common attacks: o→0, i→1, rn→m, etc.

### IP Reputation
- Is sender IP known to be malicious, blocklisted, or suspicious?
- Legitimate corporate emails from clean IPs
- Phishing often from compromised/residential IPs

### Geographic Anomalies
- Does sender IP geolocation match claimed origin?
- Example: Email claims to be from USA HQ but IP is from Nigeria
- May indicate compromised account or spoofed sender

### Routing Anomalies
- Check Received headers for unusual hop counts
- Look for re-mailing through suspicious relays
- Legitimate emails have predictable routing paths

---

## 2. INPUT DATA

### Headers
**From**: ${email.from}
**Sender Name**: ${email.senderName || 'None'}
**Sender IP**: ${senderIP}
**Geolocation**: ${geoLocation}

### Threat Intelligence (External Scans)
**URLs**:
${JSON.stringify(cleanThreatIntel, null, 2)}

**IPs**:
${JSON.stringify(cleanIpIntel, null, 2)}

${attachmentSection}

**Authentication-Results Header**:
${authResults}

### Raw Header Dump
\`\`\`
${headerList}
\`\`\`

---

## OUTPUT

Based on headers provided:
1. **spf_pass**: true/false (true only if explicitly SPF=PASS)
2. **dkim_pass**: true/false (true only if explicitly DKIM=PASS)
3. **dmarc_pass**: true/false (true only if explicitly DMARC=PASS)
4. **domain_similarity**: Describe any domain spoofing detected, or "none"
5. **sender_ip_reputation**: Status of sender IP (clean/suspicious/blocklisted) or "Unknown"
6. **geolocation_anomaly**: Geographic mismatch if detected, or "none"
7. **routing_anomaly**: Suspicious routing patterns if detected, or "none"
8. **threat_intel_findings**: Summary of Malicious URLs, IPs, or Attachments found, or "No external threats detected"
9. **header_summary**: 1-2 sentence assessment of authentication trust level

Note: If header data is incomplete or missing, state "Insufficient data" for fields you cannot assess.
`;

            const result = await emailIRAnalyst.generate(prompt, {
                output: headerAnalysisOutputSchema.omit({ original_email: true }),
            });

            timing.mark('llm-analysis-complete');

            // Log authentication results
            logAuthResults(
                loggerHeader,
                emailId,
                result.object.spf_pass,
                result.object.dkim_pass,
                result.object.dmarc_pass,
                result.object.domain_similarity
            );

            // Log detected signals
            if (!result.object.spf_pass) {
                logSignalDetected(loggerHeader, emailId, 'authentication', 'SPF_FAILED', 'high');
            }
            if (!result.object.dkim_pass) {
                logSignalDetected(loggerHeader, emailId, 'authentication', 'DKIM_FAILED', 'high');
            }
            if (!result.object.dmarc_pass) {
                logSignalDetected(loggerHeader, emailId, 'authentication', 'DMARC_FAILED', 'high');
            }
            if (result.object.domain_similarity !== 'none') {
                logSignalDetected(loggerHeader, emailId, 'domain', 'TYPOSQUATTING_DETECTED', 'high');
            }
            if (result.object.geolocation_anomaly !== 'none') {
                logSignalDetected(loggerHeader, emailId, 'geolocation', result.object.geolocation_anomaly, 'medium');
            }

            // Log performance
            logPerformance(loggerHeader, emailId, 'header-analysis', timing.getTotal());

            // Log completion
            logStepComplete(loggerHeader, ctx, {
                spf_pass: result.object.spf_pass,
                dkim_pass: result.object.dkim_pass,
                dmarc_pass: result.object.dmarc_pass
            });

            return {
                ...result.object,
                original_email: email,
            };
        } catch (error) {
            logStepError(loggerHeader, ctx, error as Error, {
                sender: email.from,
                duration_ms: timing.getTotal()
            });
            throw error;
        }
    },
});
