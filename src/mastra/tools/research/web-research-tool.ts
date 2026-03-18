/**
 * Web Research Tool
 *
 * Two-step research: Jina Search (snippets) → optional Jina Reader (full page markdown)
 * Free tier: 10M tokens/month, no API key required for basic usage
 *
 * Available for ALL agents — report, phishing, microlearning, etc.
 *
 * @see https://jina.ai/reader
 */

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';

const logger = getLogger('WebResearchTool');

const JINA_SEARCH_URL = 'https://s.jina.ai';
const JINA_READER_URL = 'https://r.jina.ai';
const FETCH_TIMEOUT_MS = 30000;

// ============================================
// Types
// ============================================

interface SearchResult {
  title: string
  url: string
  description: string
}

// ============================================
// Jina Search — returns snippets + URLs
// ============================================

function getJinaHeaders(search = false): Record<string, string> {
  const apiKey = process.env.JINA_API_KEY || ''
  const headers: Record<string, string> = { 'Accept': 'text/plain' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  if (search) headers['X-Respond-With'] = 'no-content' // faster search, snippets only
  return headers
}

async function jinaSearch(query: string): Promise<SearchResult[]> {
  const url = `${JINA_SEARCH_URL}/?q=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: getJinaHeaders(true),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Jina Search failed: ${response.status}`)
  }

  const text = await response.text()

  // Parse the response — Jina returns markdown-style results
  const results: SearchResult[] = []
  const blocks = text.split(/\n\[\d+\]\s+Title:/).filter(Boolean)

  for (const block of blocks) {
    const titleMatch = block.match(/^(.+?)$/m)
    const urlMatch = block.match(/URL Source:\s*(.+?)$/m)
    const descMatch = block.match(/Description:\s*(.+?)$/m)

    if (titleMatch && urlMatch) {
      results.push({
        title: titleMatch[1].trim(),
        url: urlMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : '',
      })
    }
  }

  // Fallback: if JSON response
  if (results.length === 0) {
    try {
      const json = JSON.parse(text)
      if (Array.isArray(json.data)) {
        return json.data.map((item: any) => ({
          title: item.title || '',
          url: item.url || '',
          description: item.description || item.content || '',
        }))
      }
    } catch {
      // Not JSON, try line-by-line parse
      const lines = text.split('\n').filter(l => l.trim())
      for (const line of lines) {
        const match = line.match(/\[(\d+)\].*?Title:\s*(.+)/)
        if (match) {
          results.push({ title: match[2], url: '', description: '' })
        }
      }
    }
  }

  return results.slice(0, 10)
}

// ============================================
// Jina Reader — fetches URL as clean markdown
// ============================================

async function jinaReadUrl(url: string): Promise<string> {
  const readerUrl = `${JINA_READER_URL}/${url}`

  const response = await fetch(readerUrl, {
    headers: getJinaHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Jina Reader failed for ${url}: ${response.status}`)
  }

  const markdown = await response.text()

  // Trim to reasonable size (max 8000 chars per page — industry standard for RAG)
  return markdown.slice(0, 8000)
}

// ============================================
// Tool Definition
// ============================================

const inputSchema = z.object({
  query: z.string().min(1).describe('Search query — what to research'),
  fetchTopUrls: z.number().min(0).max(5).default(0).describe('How many top URLs to fetch full content from (0 = snippets only, max 5)'),
})

const outputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    query: z.string(),
    snippets: z.array(z.object({
      title: z.string(),
      url: z.string(),
      description: z.string(),
    })),
    fullPages: z.array(z.object({
      url: z.string(),
      markdown: z.string(),
    })),
    summary: z.string(),
  }).optional(),
  error: z.string().optional(),
})

export const webResearchTool = createTool({
  id: 'web_research',
  description: 'Research a topic using web search. Returns snippets from top results, optionally fetches full page content as markdown. Use for gathering current data, statistics, and facts.',
  inputSchema,
  outputSchema,
  execute: async (input, _ctx?: ToolExecutionContext) => {
    const { query } = input
    const fetchTopUrls = input.fetchTopUrls ?? 0

    const hasApiKey = !!process.env.JINA_API_KEY
    logger.info('Web research started', { query, fetchTopUrls, hasApiKey })
    const startTime = Date.now()

    try {
      // Step 1: Search
      const snippets = await jinaSearch(query)
      logger.info('Search completed', { query, resultCount: snippets.length })

      // Step 2: Optionally fetch full pages
      const fullPages: Array<{ url: string; markdown: string }> = []

      if (fetchTopUrls > 0 && snippets.length > 0) {
        const urlsToFetch = snippets
          .filter(s => s.url && !s.url.includes('youtube.com')) // skip video URLs
          .slice(0, fetchTopUrls)

        for (const snippet of urlsToFetch) {
          try {
            const markdown = await jinaReadUrl(snippet.url)
            fullPages.push({ url: snippet.url, markdown })
            logger.debug('Page fetched', { url: snippet.url, length: markdown.length })
          } catch (err) {
            logger.warn('Failed to fetch page', { url: snippet.url, error: (err as Error).message })
          }
        }
      }

      // Build summary from snippets
      const summary = snippets
        .slice(0, 5)
        .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
        .join('\n')

      const durationMs = Date.now() - startTime
      logger.info('Web research completed', {
        query,
        snippetCount: snippets.length,
        fullPageCount: fullPages.length,
        durationMs,
      })

      return {
        success: true,
        data: { query, snippets, fullPages, summary },
      }
    } catch (err) {
      // Graceful degradation — research failure should NEVER block report generation
      const normalized = normalizeError(err)
      logger.warn('Web research failed, continuing without research data', {
        query,
        error: normalized.message,
      })
      return {
        success: true,
        data: {
          query,
          snippets: [],
          fullPages: [],
          summary: `Research unavailable: ${normalized.message}. Report will be generated using AI knowledge only.`,
        },
      }
    }
  },
})
