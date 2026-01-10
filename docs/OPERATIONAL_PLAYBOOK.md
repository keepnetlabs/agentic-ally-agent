# Operational Playbook

**Last Updated:** January 10, 2026

Runbooks for maintaining the reliability of Agentic Ally.

---

## 🚨 Incident Response

### Scenario 1: Autonomous Loop Stuck / Retrying
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

### Scenario 2: Hallucinating Thread IDs
**Symptoms:** Agent says "I generated this" but content is missing.
**Root Cause:** Recycling thread IDs (`phishing-{userId}`).
**Fix:**
1.  Verify IDs use timestamp format: `phishing-{userId}-{timestamp}`.
2.  Clear the user's thread history in KV if needed (`autonomous:thread:*`).

### Scenario 3: Rate Limiting Errors
**Symptoms:** `429 Too Many Requests`.
**Fix:**
1.  Check `RateLimitMiddleware`.
2.  If during bulk generation, implement `p-limit` in `autonomous-service.ts` to throttle concurrency.

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

---

## 📊 Monitoring Dashboard (Recommended)

Tracking the following metrics in Datadog/Grafana:
1.  `generation_duration_ms` (avg should be < 240s).
2.  `autonomous_run_count` (daily).
3.  `json_repair_count` (spike indicates Prompt Drift).
