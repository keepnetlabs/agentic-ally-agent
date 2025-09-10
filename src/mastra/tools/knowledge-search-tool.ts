import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ExampleRepo } from '../services/example-repo';
import { KVService } from '../services/kv-service';

// Simple schema for knowledge search
const knowledgeSearchSchema = z.object({
  query: z.string().describe('Search query for knowledge base'),
  maxResults: z.number().default(3).describe('Maximum number of results to return')
});

// Test tool using existing ExampleRepo
export const knowledgeSearchTool = createTool({
  id: 'knowledge-search',
  description: 'Search through microlearning examples using semantic search',
  inputSchema: knowledgeSearchSchema,

  execute: async ({ context }) => {
    const { query, maxResults } = context;

    try {
      // First try to search existing microlearnings in KV
      let microlearningResults: Array<{
        type: string;
        id: string;
        title: string;
        category: string;
        level: string;
        languages: string[];
      }> = [];
      
      try {
        const kvService = new KVService();
        const searchResults = await kvService.searchMicrolearnings(query);
        
        if (searchResults.length > 0) {
          microlearningResults = searchResults.slice(0, maxResults).map(ml => ({
            type: 'microlearning',
            id: ml.microlearning_id,
            title: ml.microlearning_metadata?.title || 'Unknown Title',
            category: ml.microlearning_metadata?.category || 'Unknown',
            level: ml.microlearning_metadata?.level || 'Unknown',
            languages: ml.microlearning_metadata?.language_availability || []
          }));
        }
      } catch (kvError) {
        console.warn('KV search failed, continuing with examples:', kvError);
      }

      // Then search through examples
      const repo = ExampleRepo.getInstance();
      await repo.loadExamplesOnce();
      const exampleResults = await repo.searchTopK(query, maxResults);

      const formattedExamples = exampleResults.map(doc => ({
        type: 'example',
        path: doc.path,
        relevance: doc.metadata ? `${doc.metadata.category}` : 'Unknown',
        preview: doc.content.substring(0, 150) + '...'
      }));

      const allResults = [...microlearningResults, ...formattedExamples];

      if (!allResults.length) {
        return {
          success: true,
          message: 'No relevant microlearnings or examples found',
          results: [],
          query
        };
      }

      return {
        success: true,
        message: `Found ${microlearningResults.length} microlearnings and ${formattedExamples.length} examples`,
        results: allResults,
        microlearnings: microlearningResults,
        examples: formattedExamples,
        query
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        results: [],
        query
      };
    }
  }
});