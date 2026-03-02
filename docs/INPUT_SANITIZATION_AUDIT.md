# Input Sanitization Audit

**Purpose:** EU AI Act Art. 15 — prompt injection, security. Ensure user-provided IDs are validated.  
**Reference:** `isSafeId` in `src/mastra/utils/core/id-utils.ts` — alphanumeric, hyphen, underscore, min 3 chars.  
**Last Updated:** March 2026

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Uses isSafeId | 7 tools/handlers |
| ⚠️ Missing isSafeId | 5 tools |
| ✅ Fixed | 5 tools |

---

## Tools WITH isSafeId (Before Audit)

- `assign-phishing-tool` — resourceId, languageId, targetUserResourceId, targetGroupResourceId, trainingId, sendTrainingLanguageId
- `assign-smishing-tool` — resourceId, languageId, targetUserResourceId, targetGroupResourceId
- `assign-training-tool` — resourceId, sendTrainingLanguageId, targetUserResourceId, targetGroupResourceId
- `get-target-group-info-tool` — manual check on normalized group ID
- `autonomous-phishing-handlers` — phishingId from tool output
- `autonomous-smishing-handlers` — smishingId from tool output
- `autonomous-training-handlers` — microlearningId from tool output

---

## Tools MISSING isSafeId (Gaps — Fixed)

| Tool | Param | Risk |
|------|-------|------|
| upload-phishing-tool | phishingId | KV key injection; passed to Worker |
| upload-smishing-tool | smishingId | Same |
| upload-training-tool | microlearningId | Same |
| phishing-editor-tool | phishingId | KV key in loadPhishingContent |
| smishing-editor-tool | smishingId | KV key in loadSmishingContent |

---

## Out of Scope (Different Format)

- `generate-deepfake-video-tool` — avatarId, voiceId from HeyGen API (external format)
- `workflow-executor-tool` — existingMicrolearningId from internal workflow output
- `create-inbox-structure-tool` — microlearningId from workflow; consider adding if user-provided
