# Fleet Agent SSE Heartbeat Requirement

## Problem

When the Fleet Agent makes long-running external API calls (deepfake video generation, vishing calls, etc.), the SSE stream goes idle — no data flows between Fleet Agent and the UI proxy.

Cloudflare drops idle connections after approximately **100 seconds**. This causes a reliable connection error on every deepfake video creation and other long-running operations.

The UI-side proxy already injects heartbeat comments toward the browser, but it **cannot** keep the upstream connection (UI Worker ↔ Fleet Agent) alive — SSE is unidirectional and the UI Worker can only read from Fleet Agent.

## Solution

Fleet Agent must send **SSE comment lines** during long-running processing. Per the SSE specification, lines starting with `:` are comments and are silently ignored by all compliant clients.

### Implementation

Wrap any external API call that may take longer than **30 seconds** with a heartbeat interval:

```typescript
const heartbeat = setInterval(() => {
  stream.write(': heartbeat\n\n')
}, 15_000) // every 15 seconds

try {
  const result = await callExternalAPI(...)
  stream.write(`data: ${JSON.stringify(payload)}\n\n`)
} finally {
  clearInterval(heartbeat)
}
```

### Requirements

| Requirement | Detail |
|-------------|--------|
| Format | `: heartbeat\n\n` (colon prefix + double newline SSE separator) |
| Interval | 15–30 seconds (Cloudflare idle limit is ~100s) |
| When needed | During any external API wait longer than ~30s |
| Client impact | None — SSE comments are ignored per spec |

### Affected Operations

- **Deepfake video generation** — calls external rendering API, waits for videoId (can take 10–60s)
- **Vishing call initiation** — calls telephony API, waits for conversationId
- **Any future tool call** that involves a long-running external request during the SSE stream

### Verification

After implementing, the following should no longer occur:
1. "Unable to connect" error after every deepfake creation
2. Chat locking into error state after long tool calls
3. Intermittent connection drops during complex prompts that trigger external APIs
