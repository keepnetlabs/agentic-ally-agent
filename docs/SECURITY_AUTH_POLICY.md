# Security Auth Policy

## Purpose
This document defines endpoints that intentionally bypass `X-AGENTIC-ALLY-TOKEN` authentication and the mandatory compensating controls.

## Public Unauthenticated Endpoints
- `/autonomous`
- `/code-review-validate`
- `/vishing/prompt`
- `/smishing/chat`
- `/email-ir/analyze`

These endpoints are configured in `src/mastra/middleware/public-endpoint-policy.ts`.

## Internal Auth-Skip Endpoints
- `/health`
- `/__refresh`
- `/__hot-reload-status`
- `/api/telemetry`

## Mandatory Controls For Public Unauthenticated Endpoints
1. Strict request schema validation (`zod`) with bounded field sizes.
2. Endpoint-specific rate limiting stricter than global defaults.
3. No sensitive request payload logging (PII/secrets).
4. Standardized error handling/logging via `errorService` and `logErrorInfo`.

## Current Implementation Notes
- Public endpoint detection is centralized in:
  - `src/mastra/middleware/public-endpoint-policy.ts`
- Additional stricter rate limiting for public unauthenticated endpoints is applied in:
  - `src/mastra/index.ts`
- Public unauthenticated rate tier:
  - `180 req/min` with key prefix `ratelimit:public:`
- Global rate limiting remains active for all endpoints except `/health`:
  - `100 req/min` default tier
- Every response includes `X-Correlation-ID` from `context-storage` middleware:
  - request header value is propagated when provided
  - generated UUID is returned when not provided
