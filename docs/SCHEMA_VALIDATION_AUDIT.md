# Schema Validation Audit (validateToolResult)

**Purpose:** Ensure tool outputs are validated before return — early error detection, type safety.  
**Reference:** `validateToolResult` in `src/mastra/utils/tool-result-validation.ts`  
**Last Updated:** March 2026

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Uses validateToolResult | 13 tools |
| ✅ Added this audit | 2 tools (phishing-editor, smishing-editor) |

---

## Tools WITH validateToolResult

- assign-phishing-tool
- assign-smishing-tool
- assign-training-tool
- upload-phishing-tool
- upload-smishing-tool
- upload-training-tool
- get-target-group-info-tool
- summarize-policy-tool
- phishing-workflow-executor-tool
- smishing-workflow-executor-tool
- workflow-executor-tool (multiple branches)
- **phishing-editor-tool** — added
- **smishing-editor-tool** — added

---

## Out of Scope (Different Return Patterns)

- get-user-info-tool — complex streaming/async; outputSchema exists, validation in caller
- initiate-vishing-call-tool — outputSchema exists; consider adding if pattern aligns
- generate-deepfake-video-tool — outputSchema exists; consider adding
- email-ir tools — pipeline pattern; validation at pipeline level
