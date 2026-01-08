# Operational Playbook (Upload / Assign / IDs / Troubleshooting)

This document explains **which tool produces which IDs**, how **`[ARTIFACT_IDS]`** is used, and how to troubleshoot the most common operational issues.

---

## Tool → ID outputs (source of truth)

### Training (microlearning)

- **Create training**
  - **Agent/Workflow**: microlearning creation workflow (via `workflow-executor` / create microlearning workflow)
  - **Primary ID produced**: `microlearningId`
  - **Where it shows up**: conversation history + `::ui:training_meta::...` + `[ARTIFACT_IDS] microlearningId=...`

- **Upload training**
  - **Tool**: `upload-training` (`src/mastra/tools/user-management/upload-training-tool.ts`)
  - **Produces IDs**:
    - `resourceId` (assignment resource)
    - `sendTrainingLanguageId` (language id for sending)
    - `microlearningId` (echo)
  - **Message format**: standardized via `formatToolSummary` (key=value list)

- **Assign training**
  - **Tool**: `assign-training` (`src/mastra/tools/user-management/assign-training-tool.ts`)
  - **Required inputs**:
    - `resourceId`
    - `sendTrainingLanguageId`
    - Exactly one of: `targetUserResourceId` **OR** `targetGroupResourceId`
  - **Optional inputs** (for better UX summaries only):
    - `targetUserEmail`
    - `targetUserFullName`
  - **Outputs**:
    - `data.assignmentType`, `data.targetLabel`, `data.resourceId`, `data.sendTrainingLanguageId`

### Phishing simulation

- **Create phishing simulation**
  - **Agent/Workflow**: phishing creation workflow (via `phishingExecutor`)
  - **Primary ID produced**: `phishingId`
  - **Where it shows up**: conversation history + `::ui:phishing_email::...` / `::ui:landing_page::...` + `[ARTIFACT_IDS] phishingId=...`

- **Upload phishing simulation**
  - **Tool**: `upload-phishing` (`src/mastra/tools/user-management/upload-phishing-tool.ts`)
  - **Produces IDs**:
    - `resourceId` (assignment resource; **prefers scenario resource**)
    - `scenarioResourceId`
    - `landingPageResourceId`
    - `phishingId` (echo)
    - `scenarioName` (and `title`)
  - **Important**:
    - Assignment should use **scenarioResourceId** when available (this is handled by returning `data.resourceId = scenarioResourceId || templateResourceId`).
  - **Message format**: standardized via `formatToolSummary` (always high-signal, not worker-generic).

- **Assign phishing simulation**
  - **Tool**: `assign-phishing` (`src/mastra/tools/user-management/assign-phishing-tool.ts`)
  - **Required inputs**:
    - `resourceId`
    - Exactly one of: `targetUserResourceId` **OR** `targetGroupResourceId`
  - **Optional inputs** (for better UX summaries only):
    - `targetUserEmail`
    - `targetUserFullName`
  - **Outputs**:
    - `data.campaignName`, `data.assignmentType`, `data.targetLabel`, `data.resourceId`

---

## `[ARTIFACT_IDS]` standard

The system injects a canonical, machine-readable block into the prompt:

- **Format**: `[ARTIFACT_IDS] key=value key=value ...` (stable, allowlisted keys only)
- **Filtering**: values are passed through safe ID normalization to avoid placeholders/unsafe strings.

### Current keys (allowlist)

- **Training**
  - `microlearningId`
  - `resourceId`
  - `sendTrainingLanguageId`

- **Phishing**
  - `phishingId`
  - `resourceId`
  - `scenarioResourceId`
  - `landingPageResourceId`
  - `languageId`

- **Assignment targets**
  - `targetUserResourceId`
  - `targetGroupResourceId`

---

## Standard flows (what to do in ops)

### Training: create → upload → assign

- **Create** → get `microlearningId`
- **Upload**: `uploadTraining({ microlearningId })`
  - Use the returned `resourceId` + `sendTrainingLanguageId`
- **Assign**:
  - User: `assignTraining({ resourceId, sendTrainingLanguageId, targetUserResourceId, targetUserEmail?, targetUserFullName? })`
  - Group: `assignTraining({ resourceId, sendTrainingLanguageId, targetGroupResourceId })`

### Phishing: create → upload → assign

- **Create** → get `phishingId`
- **Upload**: `uploadPhishing({ phishingId })`
  - Use the returned `resourceId` (already scenario-first)
- **Assign**:
  - User: `assignPhishing({ resourceId, languageId?, targetUserResourceId, targetUserEmail?, targetUserFullName? })`
  - Group: `assignPhishing({ resourceId, languageId?, targetGroupResourceId })`

---

## Troubleshooting

### “It didn’t show IDs / it gave a generic success message”

- **Upload phishing** now always returns a high-signal summary (scenarioName + IDs).
- If you still see generic text, verify you’re reading **the tool result message** (not a model-generated paraphrase).

### “Provide EXACTLY ONE: targetUserResourceId OR targetGroupResourceId”

- This is XOR validation. Fix by sending only one assignment target.

### “Invalid … format”

- IDs are validated using `isSafeId` (min length + safe characters).
- Do not use placeholders like `[USER-...]` (these are rejected).

### “Authentication token missing”

- The request context is missing `token`. Ensure auth middleware is setting request storage correctly.

### “Phishing scenario not found”

- Use `scenarioResourceId` when present.
- The upload tool already returns `data.resourceId` as scenario-first; use that value for assignment.

### “Landing page not centered (max-width but left aligned)”

- The landing page centering normalizer now auto-adds `margin: 0 auto` for max-width containers missing margin.

---

## Notes

- **Do not log raw HTML templates/policy text** in production. The codebase uses redacted logging utilities to avoid leakage.


