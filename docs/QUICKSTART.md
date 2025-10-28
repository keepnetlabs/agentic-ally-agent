# Quick Start Guide

Get Agentic Ally running locally in 5 minutes.

## Prerequisites

- **Node.js** 18+ (download from [nodejs.org](https://nodejs.org))
- **npm** or **yarn** (comes with Node.js)
- **Git** (for cloning the repository)
- **Cloudflare account** (for API keys)
- **OpenAI API key** (for gpt-4o-mini)

## Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/agentic-ally.git
cd agentic-ally/agent

# Install dependencies
npm install

# Or with yarn
yarn install
```

## Step 2: Environment Setup

Copy the example environment file and fill in your API keys:

```bash
# Create .env.local from template
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Required
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_KV_TOKEN=your_kv_token
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_AI_GATEWAY_ID=your_gateway_id
CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY=your_auth_key
CLOUDFLARE_D1_DATABASE_ID=your_d1_id
OPENAI_API_KEY=your_openai_key

# Optional
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
```

### Getting API Keys

**OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key in Account → API keys
3. Copy and paste into `.env.local`

**Cloudflare:**
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Account Home → API Tokens → Create Token
3. Use "Edit Cloudflare Workers" template
4. Copy credentials to `.env.local`

## Step 3: Run Development Server

```bash
# Start local development server
npm run dev

# Output should show:
# ✓ Server running at http://localhost:8000
# ✓ Agent loaded: agenticAlly
# ✓ Workflows loaded: 2
```

## Step 4: Test Locally

Open a terminal and test the API:

```bash
# Test the chat endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create phishing awareness training for IT department"
  }'

# Expected response:
# Stream with training URL like:
# ::ui:canvas_open::https://microlearning.pages.dev/?baseUrl=...
```

Or use an API client like Postman:

```
Method: POST
URL: http://localhost:8000/chat
Headers: Content-Type: application/json
Body: {
  "prompt": "Create phishing training",
  "department": "IT",
  "level": "Intermediate"
}
```

## Step 5: Try the Full Workflow

The system uses a conversational approach:

1. **First message:** "Create phishing awareness training"
   - Agent gathers missing info (department, level)

2. **Second message:** "For IT, Intermediate"
   - Agent shows summary with time estimate

3. **Third message:** "Start" or "Yes"
   - Workflow executes
   - Returns training URL in 30 seconds

## Common Commands

```bash
# Development
npm run dev              # Start local dev server
npm run build            # Build for production
npm run typecheck        # Check TypeScript types

# Deployment
npm run deploy           # Deploy to Cloudflare Workers
npm run logs             # View production logs

# Maintenance
npm run test             # Run tests (if available)
npm run clean            # Clear build artifacts
```

## Troubleshooting

### "Port 8000 already in use"
```bash
# Kill process using port 8000
# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "API key invalid"
- Verify all environment variables are set correctly
- Check for extra spaces or quotes in `.env.local`
- Confirm API keys haven't expired in respective dashboards

### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Slow generation (>60 seconds)
- Check network connection
- Verify Cloudflare Workers AI is available in your region
- Check OpenAI API status at [status.openai.com](https://status.openai.com)

## What Happens Next?

After successful test:

1. **Explore the code:** Check `src/mastra/` directory structure
2. **Read architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Try variations:** Test with different topics and departments
4. **Deploy:** Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to go to production

## Next Steps

- 📖 Read [OVERVIEW.md](./OVERVIEW.md) to understand the system
- 🏗️ Read [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- 🚀 Read [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy to production
- 🛠️ Read [DEVELOPMENT.md](./DEVELOPMENT.md) for deeper development

---

**Stuck?** Check [FAQ.md](./FAQ.md) or [DEVELOPMENT.md](./DEVELOPMENT.md) troubleshooting section.

**Last Updated:** October 27, 2025
