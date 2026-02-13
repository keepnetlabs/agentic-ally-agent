# Security Policy - Agentic Ally

This document outlines security practices, credential management, and vulnerability disclosure for the Agentic Ally project.

---

## 🔐 Credentials & Secrets Management

### Environment Variables

**All environment variables are required for different deployment contexts:**

- **Development:** `.env` (git-ignored, local only)
- **Staging:** Set via Cloudflare Dashboard or Wrangler secrets
- **Production:** Set via Cloudflare Dashboard with appropriate access controls

### Never in Version Control

**The following MUST NEVER be committed to Git:**

```
❌ Real API keys in .env
❌ Real credentials in .env.local
❌ Real tokens in .env.development
❌ Database credentials in source code
❌ JWT secrets in config files
```

### Using `.env.example` Safely

`.env.example` is a template showing required variables with **placeholder values only**:

```bash
# ✅ CORRECT - placeholder values
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id

# ❌ WRONG - real credentials
OPENAI_API_KEY=sk-proj-7attrrDeYCnGX8UjSyHDRDFzNkZHCB9LMuJ0tp1f3qE3s-...
CLOUDFLARE_ACCOUNT_ID=2d35926d788c4fac8b00e362a4734323
```

### Setup for New Developers

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in actual values for your environment:
   ```bash
   # .env (git-ignored)
   OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
   CLOUDFLARE_ACCOUNT_ID=your-actual-id-here
   # ... other credentials
   ```

3. **Never commit `.env` file** - it's already in `.gitignore`

---

## 🚨 Credential Rotation

If credentials are ever exposed:

1. **Immediately revoke** the exposed credentials
2. **Generate new credentials**
3. **Update all deployments** with new values
4. **Audit logs** to check if credentials were misused
5. **Document incident** in security log

### Credential Endpoints

| Service | Revoke/Rotate Location |
|---------|----------------------|
| **OpenAI API** | https://platform.openai.com/api-keys |
| **Cloudflare** | https://dash.cloudflare.com/profile/api-tokens |
| **Turso (DB)** | https://app.turso.io → Databases → Settings |
| **Mastra Memory** | https://mastra.ai → API Keys |

---

## 🛡️ Security Features

### Input Validation

All resource IDs are validated using `isSafeId()`:

```typescript
import { isSafeId } from './utils/core/id-utils';

const schema = z.object({
  resourceId: z.string().refine(isSafeId, 'Invalid resource ID')
});
```

**Prevents:**
- SQL injection attempts
- Path traversal attacks
- Malformed ID exploitation

### Authorization Context

All phishing simulations include explicit legal notice:

```
**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise for corporate
security awareness training. This is a defensive security measure to
protect organizations from cybercrime.
```

### PII Prevention

LLM is prevented from inventing personal identities:

- ✅ Use merge tags: `{FIRSTNAME}`, `{FULLNAME}`
- ✅ Use role labels: "IT Support Team", "HR Department"
- ❌ Never generate fake names

### Rate Limiting

Prevents abuse and DDoS attacks. See `constants.ts` and `RATE_LIMIT_TIERS` for current values:

- **Chat/default:** 100 req/min
- **Health:** 300 req/min
- **Public unauthenticated** (`/smishing/chat`, `/vishing/*`, `/email-ir/analyze`): 180 req/min

### Cloudflare Worker Sandbox

- All code runs in Cloudflare's secure sandbox
- Zero cold starts
- Automatic DDoS protection
- Rate limiting at edge

---

## 🔍 Security Scanning

### Dependency Vulnerabilities

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix
```

### Secret Detection

Pre-commit hooks should prevent accidental secrets:

```bash
# Install pre-commit hook (recommended)
npx husky install
```

---

## 📋 Data Protection

### Phishing Simulations

All generated phishing content:

- ✅ Includes authorization context
- ✅ Is stored securely in Cloudflare KV
- ✅ Has access controls per department
- ✅ Is only accessed by authorized users
- ✅ Cannot be leaked to real external recipients (URLs are internal)

### User Data

- Microlearning assignments stored securely
- Training progress tracked in D1 database
- PII masked in logs (see `preparePIIMaskedInput()`)
- Historical data can be purged on request

---

## 🚨 Vulnerability Disclosure

### Reporting Security Issues

**DO NOT open public GitHub issues for security vulnerabilities.**

Instead:

1. Email security details to: **[your-security-contact@keepnetlabs.com]**
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)
3. Allow time for patch development before public disclosure

### Response Timeline

- **24 hours:** Initial acknowledgment
- **7 days:** Assessment and patch development
- **14 days:** Public disclosure (or earlier if patch is ready)

---

## 🔑 API Security

### Authentication

- No built-in auth (relies on Cloudflare Workers authentication)
- API endpoints protected via Cloudflare (Auth0, custom, etc.)
- Rate limiting prevents unauthorized access

### CORS & Headers

- Proper CORS headers set for frontend integration
- Security headers configured via Cloudflare
- No sensitive headers exposed

### Request Validation

All requests validated with Zod schemas:

```typescript
const inputSchema = z.object({
  prompt: z.string().min(10).max(1000),
  department: z.enum(['IT', 'HR', 'Sales', ...]),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced'])
});
```

---

## 📝 Logging & Monitoring

### What Gets Logged

✅ **OK to log:**
- User actions (create training, assign, translate)
- API endpoints called
- Workflow execution status
- Errors and stack traces

❌ **Never log:**
- API keys or credentials
- Personal identifiable information (PII)
- Full request/response bodies (use masked versions)
- User passwords (not applicable here)

### Masked Logging

```typescript
const masked = preparePIIMaskedInput(userInput);
logger.info('User request', { input: masked }); // PII redacted
```

---

## 🔄 Code Review Security

### Before Merging

1. Security checklist:
   - No credentials in code/config
   - No hardcoded URLs to production
   - Input validation present
   - Error messages don't leak info
   - Dependencies scanned for vulnerabilities

2. Code review by at least one other developer

3. Tests pass, including security-related tests

---

## 🛠️ Deployment Security

### Pre-Deployment Checklist

```bash
# ✅ Verify no secrets in code
npm run test
npm run build
npm run test:coverage

# ✅ Check for vulnerabilities
npm audit

# ✅ Verify environment configuration
wrangler secret list  # Check secrets are set
```

### Production Deployment

```bash
# Deploy with confidence
npm run deploy

# Verify deployment
curl https://your-agent.workers.dev/health
```

---

## 📚 Security Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Cloudflare Security:** https://www.cloudflare.com/en-gb/security/
- **OpenAI Safety:** https://platform.openai.com/docs/guides/safety-best-practices
- **Mastra Security:** https://mastra.ai/docs/security

---

## 🤝 Contributing Securely

1. Follow `.cursorrules` for code standards
2. Review `CLAUDE.md` for architectural patterns
3. Add tests for security-sensitive code
4. Use pre-commit hooks to catch secrets
5. Document security assumptions in code comments

---

## 📞 Security Contacts

- **Security Team:** [security@keepnetlabs.com]
- **DevOps/Infrastructure:** [devops@keepnetlabs.com]
- **Emergency:** [emergency-security@keepnetlabs.com]

---

**Last Updated:** February 13, 2026
**Version:** 1.1
**Status:** Production Ready
