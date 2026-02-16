# Operational Playbook

**Last Updated:** February 13, 2026

Runbooks for maintaining the reliability of Agentic Ally. Follow industry-standard incident response (severity-based, runbook format).

---

## Severity Levels

| Level | Response Time | Examples |
|-------|----------------|----------|
| **P0 Critical** | Immediate | Full outage, data breach |
| **P1 High** | < 1 hour | Major feature down |
| **P2 Medium** | < 4 hours | Degraded performance |
| **P3 Low** | Next business day | Minor issues |

---

## 🚨 Incident Response

### Scenario 1: Autonomous Loop Stuck / Retrying (P1)
**Symptoms:** Logs show `Timeout after 90000ms`, Cron job timing out.
**Root Cause:** Microlearning generation taking > 90s.
**Fix:**
1.  Verify `LONG_RUNNING_AGENT_TIMEOUT_MS` is set to `600,000` (10 mins) in `constants.ts`.
2.  Check Workers AI latency/status.
3.  **Quick Fix:** Manually trigger the lighter `debug-workflow.ts` locally or use the API:
    ```bash
    curl -X POST https://<worker>/autonomous \
      -H "X-AGENTIC-ALLY-TOKEN: <key>" \
      -d '{"actions": ["training"], "targetGroupResourceId": "ALL"}'
    ```

### Scenario 2: Hallucinating Thread IDs (P2)
**Symptoms:** Agent says "I generated this" but content is missing.
**Root Cause:** Recycling thread IDs (`phishing-{userId}`).
**Fix:**
1.  Verify IDs use timestamp format: `phishing-{userId}-{timestamp}`.
2.  Clear the user's thread history in KV if needed (`autonomous:thread:*`).

### Scenario 3: Rate Limiting Errors (P2)
**Symptoms:** `429 Too Many Requests`.
**Fix:**
1.  Check `RateLimitMiddleware` (config in `constants.ts`).

### Scenario 4: Vishing / ElevenLabs Failures (P2)
**Symptoms:** `/vishing/prompt` or `/vishing/conversations/summary` returns 5xx.
**Fix:**
1.  Verify `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in env.
2.  Check ElevenLabs status: https://status.elevenlabs.io
3.  Validate token via `GET /auth/validate` if using product API.

### Scenario 5: Email IR Analysis Failures (P2)
**Symptoms:** `/email-ir/analyze` returns 5xx or validation errors.
**Fix:**
1.  Verify `accessToken` and `apiBaseUrl` in request.
2.  Check product API connectivity for email fetch.
3.  Review `email-ir-workflow.ts` logs for stage-specific failures.

### Scenario 6: Sentry / Observability Not Receiving Events (P3)
**Symptoms:** No errors in Sentry dashboard.
**Fix:**
1.  Verify `SENTRY_DSN` and `SENTRY_ENVIRONMENT` in env.
2.  Check `error-handler.ts` Sentry initialization.
3.  Test with `curl` to trigger 500 and verify event appears.

---

## 🧹 Maintenance (Hygiene)

### Data Retention Policy
| Data Type | Retention | Action |
|-----------|-----------|--------|
| **Thread History** | 7 Days | Delete keys `autonomous:thread:*` |
| **Old Simulations** | 1 Year | Archive to R2, delete from KV |
| **Logs** | 30 Days | Managed by Cloudflare Logpush |

### Weekly Checks
1.  **Cost Monitoring:** Check OpenAI usage dashboard.
2.  **Error Rate:** Check Cloudflare Analytics for 5xx errors.
3.  **Consistency:** Run `kv-consistency.ts` check manually if suspicious.
4.  **Sentry:** Review error trends and new issues.

---

## 📊 Monitoring Dashboard (Recommended)

Tracking the following metrics in Datadog/Grafana:
1.  `generation_duration_ms` (avg should be < 240s).
2.  `autonomous_run_count` (daily).
3.  `json_repair_count` (spike indicates Prompt Drift).
4.  `vishing_summary_duration_ms` (for `/vishing/conversations/summary`).
5.  `email_ir_analysis_duration_ms` (for `/email-ir/analyze`).

