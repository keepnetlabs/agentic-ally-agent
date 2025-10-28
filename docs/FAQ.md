# Frequently Asked Questions

Quick answers to common questions.

## Getting Started

### Q: What do I need to get started?
**A:** Node.js 18+, npm/yarn, Cloudflare account, OpenAI API key. Follow [QUICKSTART.md](./QUICKSTART.md).

### Q: How long does it take to generate training?
**A:** 25-35 seconds for a complete 8-scene module.

### Q: Can I use this without a Cloudflare account?
**A:** No, the platform runs on Cloudflare Workers. You'll need a Cloudflare account and API keys.

### Q: What's the cost to run this?
**A:** Costs depend on: Cloudflare Workers (cheap or free tier), OpenAI API (pay-per-token), KV storage. Estimate: $0.50-$5 per training generated.

### Q: Can I run this locally without deploying?
**A:** Yes! Use `npm run dev` for local development. You still need API keys for OpenAI and Cloudflare.

---

## Features & Capabilities

### Q: What languages does it support?
**A:** 12 languages: English, Turkish, German, French, Spanish, Portuguese, Italian, Russian, Chinese, Japanese, Arabic, Korean. See [MULTI_LANGUAGE.md](./MULTI_LANGUAGE.md).

### Q: Can I add a new language?
**A:** Yes! Add detection pattern, UI strings, and transcripts. See [DEVELOPMENT.md](./DEVELOPMENT.md) "Adding a New Language".

### Q: What training topics work best?
**A:** Security awareness (phishing, passwords, data protection), compliance (GDPR, AML, KYC), operational (onboarding, procedures, safety).

### Q: Can I customize the generated content?
**A:** Yes! The training URL opens an editor where you can modify all content before deploying.

### Q: Does it support video upload?
**A:** It selects from a video database automatically. You can replace videos in the editor.

### Q: Can I translate existing training?
**A:** Yes! Use the "add language" workflow. See [WORKFLOWS.md](./WORKFLOWS.md).

---

## Technical Questions

### Q: What AI models does it use?
**A:**
- **Agent:** OpenAI gpt-4o-mini (conversational)
- **Content:** Cloudflare Workers AI gpt-oss-120b (generation)

### Q: Is my data secure?
**A:** Yes. Runs on Cloudflare Workers edge compute. Storage in Cloudflare KV (encrypted). No data leaves the edge network.

### Q: What happens if content generation fails?
**A:** 3-level fallback system ensures graceful degradation. Generation still completes, quality might vary.

### Q: How is memory/state managed?
**A:** Via Mastra Memory + threadId. Allows multi-turn conversations while maintaining context.

### Q: Can I integrate this with other systems?
**A:** Yes! The `/chat` endpoint returns structured data. You can build custom integrations.

### Q: Does it support custom branding/themes?
**A:** Yes! The theme can be customized: fonts, colors, logo. Edit in the generated content.

---

## Troubleshooting

### Q: "Module not found" error
**A:**
```bash
rm -rf node_modules
npm install
npm run dev
```

### Q: "API key invalid" error
**A:**
- Check `.env.local` for extra spaces
- Verify keys in Cloudflare/OpenAI dashboards
- Generate new keys if expired

### Q: Generation is very slow (>60 seconds)
**A:**
- Check network connection
- Verify Cloudflare Workers AI availability
- Check OpenAI quota/rate limits
- Try again (might be temporary)

### Q: Getting JSON parsing errors
**A:** The system auto-repairs JSON. Check logs for fallback messages. Usually recovers automatically.

### Q: "Port 8000 already in use"
**A:**
```bash
# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Q: Training URL not opening
**A:**
- Verify URL copied correctly
- Check if microlearning.pages.dev is accessible
- Try incognito/private mode
- Clear browser cache

### Q: Translated content doesn't look right
**A:**
- Check if language code is correct (e.g., tr-TR)
- Verify translations in editor before publishing
- Use manual editing for critical content

---

## Deployment

### Q: How do I deploy to production?
**A:** Follow [DEPLOYMENT.md](./DEPLOYMENT.md). Uses `wrangler deploy`.

### Q: Can I deploy to AWS/Google Cloud?
**A:** Current version is Cloudflare Workers only. Porting to other platforms would require significant changes.

### Q: How do I monitor production?
**A:** Use Cloudflare dashboard for Workers metrics, KV usage. See [MONITORING.md](./MONITORING.md).

### Q: What's the uptime SLA?
**A:** Cloudflare Workers has >99.95% uptime. See Cloudflare's SLA documentation.

### Q: Can I have multiple deployments (dev, staging, prod)?
**A:** Yes, using environment-based configurations and separate KV namespaces. See [CONFIGURATION.md](./CONFIGURATION.md).

---

## Development

### Q: How do I add a new tool?
**A:** Create tool file, define schemas, implement execute(), register in agent. See [DEVELOPMENT.md](./DEVELOPMENT.md).

### Q: Can I modify scene generation?
**A:** Yes! Edit the prompt in `src/mastra/tools/scene-generators/sceneX-generator.ts`.

### Q: How do I debug workflow issues?
**A:** Check console logs (look for 🔍 and ❌ emoji prefixes). See [DEVELOPMENT.md](./DEVELOPMENT.md) debugging section.

### Q: What's the testing setup?
**A:** Local testing via API. See [DEVELOPMENT.md](./DEVELOPMENT.md) "Testing Locally".

### Q: Can I use different LLMs?
**A:** Currently hard-coded to OpenAI + Workers AI. Supporting others would require model abstraction layer.

---

## Content & Learning

### Q: How are the 8 scenes structured?
**A:**
1. Introduction (3 highlights)
2. Learning Goals (3-4 SMART objectives)
3. Video Scenario (with transcript)
4. Action Items (4 steps)
5. Knowledge Quiz (questions)
6. Feedback Survey (user feedback)
7. Behavior Nudge (action plan)
8. Summary (takeaways + resources)

See [DATA_MODEL.md](./DATA_MODEL.md) for details.

### Q: Is the content WCAG compliant?
**A:** Yes, generated content follows WCAG 2.1 AA standards for accessibility.

### Q: Can I create non-security training?
**A:** The system is flexible. Currently optimized for security/compliance, but can handle other topics.

### Q: How is learning effectiveness measured?
**A:** Via quiz scores and survey feedback in Scene 5 & 6. Can be extended with analytics.

---

## Multi-Language

### Q: How is language detected?
**A:** Automatic via character patterns (Turkish ş/ğ, Arabic script, CJK, etc.). See language-utils.ts.

### Q: What if language detection fails?
**A:** Falls back to English. You can specify language manually in API call.

### Q: Are translations human-proofread?
**A:** Currently AI-translated. Recommended: Review before deploying to production.

### Q: Can I have mixed-language content?
**A:** Each training has one language. Create separate versions for mixed-language audience.

---

## Billing & Costs

### Q: What's the cheapest way to run this?
**A:**
- Cloudflare: Free or $20/month
- OpenAI: $0.15-0.30 per training (estimated)
- KV: Included in free tier up to limits

Estimate: $0-20/month + usage.

### Q: Is there a self-hosted option?
**A:** Not officially. Would require significant refactoring for Docker/AWS deployment.

### Q: Can I use my own API keys for cost control?
**A:** Yes, configure in `.env.local`. You pay OpenAI directly.

---

## Community & Support

### Q: How do I report a bug?
**A:** Create an issue on GitHub with: steps to reproduce, expected behavior, actual behavior.

### Q: Can I contribute?
**A:** Yes! Fork the repo, make changes, submit PR. See contributing guidelines.

### Q: Is there a community?
**A:** Check GitHub Discussions for Q&A. Community-driven examples welcome.

### Q: Where's the roadmap?
**A:** See GitHub Issues with "roadmap" label.

---

## Still Have Questions?

- **Technical issues?** See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Deployment problems?** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Want to contribute?** See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Need architectural understanding?** See [ARCHITECTURE.md](./ARCHITECTURE.md)

**Last Updated:** October 27, 2025
