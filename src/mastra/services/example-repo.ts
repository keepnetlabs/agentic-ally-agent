import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { embed } from 'ai';
import { getModel, ModelProvider, Model } from '../model-providers';
import { EXAMPLE_REPO } from '../constants';

export interface ExampleDoc {
    path: string;
    content: string;
    embedding?: number[];
    metadata?: {
        category: string;
        topics: string[];
        complexity: number;
        lastUpdated: Date;
    };
}

interface SemanticSearchOptions {
    threshold: number;
    useHybrid: boolean;
    contextWeight: number;
    maxResults: number;
}

interface SearchResult {
    doc: ExampleDoc;
    score: number;
    similarity: number;
    tokenScore: number;
}


// D1 Database schema interface
interface D1Database {
    prepare(query: string): D1PreparedStatement;
    dump(): Promise<ArrayBuffer>;
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
    exec(query: string): Promise<D1Result>;
}

interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first(): Promise<any>;
    run(): Promise<D1Result>;
    all(): Promise<D1Result>;
}

interface D1Result {
    results?: any[];
    success: boolean;
    error?: string;
    meta: {
        changes: number;
        last_row_id: number;
        rows_read: number;
        rows_written: number;
    };
}

interface EmbeddingCacheDB {
    path: string;
    content_hash: string;
    embedding_json: string;
    metadata_json: string;
    created_at: string;
    last_used: string;
    usage_count: number;
    cache_version: string;
}

export class ExampleRepo {
    private static instance: ExampleRepo | null = null;
    private indexed: boolean = false;
    private embeddingsGenerated: boolean = false;
    private embeddingsFailed: boolean = false;
    private docs: ExampleDoc[] = [];
    private embeddingProvider?: any;
    private db?: D1Database;
    private cacheVersion = '1.0.0';
    private cacheInitialized = false;
    
    // Performance optimization: cache basic schema hints to avoid repeated semantic search
    private basicSchemaCache: string = '';
    private basicSchemaCacheGenerated: boolean = false;

    private constructor() {
        // D1 database will be injected via setDatabase method
    }
    
    // Method to inject D1 database instance (called from deployer/environment setup)
    setDatabase(database: D1Database): void {
        this.db = database;
    }
    
    static getInstance(): ExampleRepo {
        if (!ExampleRepo.instance) ExampleRepo.instance = new ExampleRepo();
        return ExampleRepo.instance;
    }

    async loadExamplesOnce(baseDir: string = path.join(process.cwd(), 'examples')): Promise<void> {
        if (this.indexed) return;
        
        // Performance optimization: Skip expensive file loading for basic microlearning use cases
        // Most microlearning creation doesn't need complex examples
        const shouldLoadExamples = false; // Set to true only if advanced schema hints needed
        
        if (!shouldLoadExamples) {
            console.log('⚡ Skipping example loading for faster performance');
            this.indexed = true;
            this.basicSchemaCacheGenerated = true; // Mark as ready with minimal setup
            return;
        }
        
        try {
            const exists = await fs.stat(baseDir).then(() => true).catch(() => false);
            if (!exists) {
                console.log('📁 Examples directory not found, using minimal setup');
                this.indexed = true;
                this.basicSchemaCacheGenerated = true;
                return;
            }
            
            console.log('📚 Loading examples for enhanced schema hints...');
            const files = await this.walk(baseDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            const docs: ExampleDoc[] = [];
            
            // Limit the number of examples to load for performance
            const maxExamples = 5; // Static limit for better performance
            const limitedFiles = jsonFiles.slice(0, maxExamples);
            
            for (const f of limitedFiles) {
                try {
                    const text = await fs.readFile(f, 'utf-8');
                    docs.push({ path: path.relative(process.cwd(), f), content: text });
                } catch (error) {
                    console.warn(`⚠️ Failed to read example file: ${f}`, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            this.docs = docs;
            this.indexed = true;
            console.log(`✅ Loaded ${docs.length} examples`);
            
            // Skip embedding generation for faster startup
            // this.initializeWithD1Cache().catch(console.error); // Disabled for performance
        } catch (error) {
            console.warn('⚠️ Example loading failed, using minimal setup:', error);
            this.indexed = true;
            this.basicSchemaCacheGenerated = true;
        }
    }

    private async walk(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results: string[] = [];
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                const nested = await this.walk(full);
                results.push(...nested);
            } else {
                results.push(full);
            }
        }
        return results;
    }

    // Structure-only hints: key sets, scene metadata keys, minimal examples list
    getSchemaHints(maxFiles: number = 3): string {
        if (!this.docs.length) return '';
        const pick = this.docs.slice(0, maxFiles);
        const hints = pick.map(doc => {
            try {
                const json = JSON.parse(doc.content);
                const topKeys = Object.keys(json);
                const metaKeys = Object.keys(json.microlearning_metadata || {});
                const scenes = Array.isArray(json.scenes) ? json.scenes : [];
                const sceneMetaKeys = new Set<string>();
                const sceneTypes = new Set<string>();
                for (const s of scenes) {
                    if (s?.metadata) {
                        Object.keys(s.metadata).forEach(k => sceneMetaKeys.add(k));
                        if (s.metadata.scene_type) sceneTypes.add(s.metadata.scene_type);
                    }
                }
                return `File: ${doc.path}
Top-level keys: ${topKeys.join(', ')}
Metadata keys: ${metaKeys.join(', ')}
Scene types: ${Array.from(sceneTypes).join(', ')}
Scene metadata keys: ${Array.from(sceneMetaKeys).join(', ')}`;
            } catch (error) {
                console.warn(`⚠️ Failed to parse schema from ${doc.path}:`, {
                    error: error instanceof Error ? error.message : String(error),
                });
                return `File: ${doc.path}
(Invalid JSON, skipped)`;
            }
        });
        return hints.join('\n\n');
    }

    async searchTopK(query: string, k: number = 3, options?: Partial<SemanticSearchOptions>): Promise<ExampleDoc[]> {
        if (!this.docs.length || !query) return [];
        
        // If embeddings failed or are not available, fallback to token search
        if (this.embeddingsFailed || (!this.embeddingsGenerated && !await this.tryGenerateEmbeddings())) {
            console.log('🔄 Semantic search unavailable, using token-based fallback');
            return this.searchTopKSync(query, k);
        }
        
        const searchOptions: SemanticSearchOptions = {
            threshold: 0.1,
            useHybrid: true,
            contextWeight: 0.7,
            maxResults: k,
            ...options
        };
        
        try {
            const results = await this.performSemanticSearch(query, searchOptions);
            return results.map(r => r.doc);
        } catch (error) {
            console.warn('❌ Semantic search failed, falling back to token search:', error);
            this.embeddingsFailed = true;
            return this.searchTopKSync(query, k);
        }
    }
    
    // Legacy method for backward compatibility
    searchTopKSync(query: string, k: number = 3): ExampleDoc[] {
        if (!this.docs.length || !query) return [];
        const q = query.toLowerCase();
        const qTokens = this.tokenize(q);
        const scored = this.docs.map(d => {
            const text = (d.path + ' ' + d.content).toLowerCase();
            const score = this.score(qTokens, text);
            return { doc: d, score };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.filter(s => s.score > 0).slice(0, k).map(s => s.doc);
    }

    private tokenize(text: string): string[] {
        return text.split(/[^a-z0-9]+/i).filter(Boolean);
    }

    private score(qTokens: string[], text: string): number {
        let s = 0;
        for (const t of qTokens) {
            if (t.length < 3) continue;
            if (text.includes(t)) s += 1;
        }
        return s;
    }
    
    private async initializeWithD1Cache(): Promise<void> {
        if (!this.db) {
            console.warn('⚠️ D1 database not available, skipping cache');
            await this.tryGenerateEmbeddings();
            return;
        }
        
        try {
            await this.initializeD1Schema();
            await this.loadFromD1Cache();
            await this.tryGenerateEmbeddings();
        } catch (error) {
            console.warn('⚠️ D1 cache initialization failed:', error);
            await this.tryGenerateEmbeddings();
        }
    }
    
    private async initializeD1Schema(): Promise<void> {
        if (!this.db || this.cacheInitialized) return;
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS embedding_cache (
                path TEXT PRIMARY KEY,
                content_hash TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                metadata_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
                usage_count INTEGER DEFAULT 1,
                cache_version TEXT DEFAULT '${this.cacheVersion}'
            )
        `;
        
        try {
            await this.db.exec(createTableSQL);
            console.log('📦 D1 embedding cache table initialized');
            this.cacheInitialized = true;
        } catch (error) {
            console.warn('⚠️ Failed to initialize D1 schema:', error);
            throw error;
        }
    }
    
    private async loadFromD1Cache(): Promise<void> {
        if (!this.db) return;
        
        try {
            // Get all cache entries
            const stmt = this.db.prepare(
                'SELECT * FROM embedding_cache WHERE cache_version = ?'
            ).bind(this.cacheVersion);
            
            const result = await stmt.all();
            
            if (!result.success || !result.results) {
                console.log('📦 No D1 cache entries found');
                return;
            }
            
            let cacheHits = 0;
            let staleEntries = 0;
            
            // Apply cached embeddings to docs
            for (const doc of this.docs) {
                const contentHash = this.getContentHash(doc.content);
                const cached = result.results.find(
                    (row: EmbeddingCacheDB) => row.path === doc.path
                );
                
                if (cached && cached.content_hash === contentHash) {
                    // Parse cached data
                    doc.embedding = JSON.parse(cached.embedding_json);
                    doc.metadata = cached.metadata_json ? 
                        JSON.parse(cached.metadata_json) : 
                        this.extractMetadata(doc);
                    
                    cacheHits++;
                    
                    // Update usage stats in background
                    this.updateUsageStats(doc.path).catch(console.warn);
                    
                } else if (cached && cached.content_hash !== contentHash) {
                    staleEntries++;
                    // Remove stale cache entry
                    this.removeCacheEntry(doc.path).catch(console.warn);
                }
            }
            
            const hitRate = Math.round(cacheHits / this.docs.length * 100);
            console.log(
                `📦 D1 Cache: ${cacheHits}/${this.docs.length} hits (${hitRate}%), ${staleEntries} stale removed`
            );
            
        } catch (error) {
            console.warn('📦 D1 cache loading failed:', error);
        }
    }
    
    private async saveCacheEntry(doc: ExampleDoc): Promise<void> {
        if (!this.db || !doc.embedding) return;
        
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO embedding_cache 
                (path, content_hash, embedding_json, metadata_json, last_used, usage_count, cache_version)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 
                    COALESCE((SELECT usage_count + 1 FROM embedding_cache WHERE path = ?), 1), ?)
            `);
            
            await stmt.bind(
                doc.path,
                this.getContentHash(doc.content),
                JSON.stringify(doc.embedding),
                JSON.stringify(doc.metadata),
                doc.path, // For the COALESCE usage_count lookup
                this.cacheVersion
            ).run();
            
        } catch (error) {
            console.warn(`💾 Failed to save cache entry for ${doc.path}:`, error);
        }
    }
    
    private async updateUsageStats(docPath: string): Promise<void> {
        if (!this.db) return;
        
        try {
            const stmt = this.db.prepare(
                'UPDATE embedding_cache SET last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1 WHERE path = ?'
            );
            await stmt.bind(docPath).run();
        } catch (error) {
            console.warn(`Failed to update usage stats for ${docPath}:`, error);
        }
    }
    
    private async removeCacheEntry(docPath: string): Promise<void> {
        if (!this.db) return;
        
        try {
            const stmt = this.db.prepare('DELETE FROM embedding_cache WHERE path = ?');
            await stmt.bind(docPath).run();
        } catch (error) {
            console.warn(`Failed to remove cache entry for ${docPath}:`, error);
        }
    }
    
    private getContentHash(content: string): string {
        return createHash('md5').update(content).digest('hex');
    }
    
    private async tryGenerateEmbeddings(): Promise<boolean> {
        if (this.embeddingsGenerated || this.embeddingsFailed) {
            return this.embeddingsGenerated;
        }
        
        try {
            // Initialize embedding provider
            if (!this.embeddingProvider) {
                this.embeddingProvider = getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B).embedding('text-embedding-3-small');
            }
            
            await this.generateEmbeddings();
            return true;
        } catch (error) {
            console.warn('🚫 Embedding provider initialization failed:', error);
            this.embeddingsFailed = true;
            return false;
        }
    }
    
    private async generateEmbeddings(): Promise<void> {
        if (this.embeddingsGenerated) return;
        
        // Count documents needing embeddings
        const docsNeedingEmbeddings = this.docs.filter(doc => !doc.embedding);
        
        if (docsNeedingEmbeddings.length === 0) {
            console.log('✅ All embeddings already cached');
            this.embeddingsGenerated = true;
            return;
        }
        
        console.log(`🔄 Generating embeddings for ${docsNeedingEmbeddings.length}/${this.docs.length} documents...`);
        
        let successCount = 0;
        let failCount = 0;
        let newCacheEntries = 0;
        
        for (const doc of docsNeedingEmbeddings) {
            try {
                // Create semantic content from document
                const semanticContent = this.extractSemanticContent(doc);
                
                const { embedding } = await embed({
                    model: this.embeddingProvider,
                    value: semanticContent
                });
                
                doc.embedding = embedding;
                doc.metadata = this.extractMetadata(doc);
                successCount++;
                
                // Save to D1 cache
                await this.saveCacheEntry(doc);
                newCacheEntries++;
                
            } catch (error) {
                console.warn(`❌ Failed to generate embedding for ${doc.path}:`, error);
                failCount++;
                
                // If too many failures, mark as failed and stop
                if (failCount > successCount && failCount > 2) {
                    console.error('🚫 Too many embedding failures, marking as failed');
                    this.embeddingsFailed = true;
                    throw new Error('Embedding generation failed for multiple documents');
                }
            }
        }
        
        // D1 cache entries are saved individually as they're generated
        
        this.embeddingsGenerated = true;
        console.log(`✅ Embeddings completed: ${successCount} new, ${failCount} failed, ${newCacheEntries} cached`);
    }
    
    private extractSemanticContent(doc: ExampleDoc): string {
        try {
            const json = JSON.parse(doc.content);
            
            // Extract key semantic elements
            const parts = [];
            
            // Add metadata if available
            if (json.microlearning_metadata) {
                const meta = json.microlearning_metadata;
                parts.push(meta.title || '');
                parts.push(meta.category || '');
                parts.push(meta.subcategory || '');
                parts.push((meta.industry_relevance || []).join(' '));
                parts.push((meta.department_relevance || []).join(' '));
            }
            
            // Add scene information
            if (json.scenes && Array.isArray(json.scenes)) {
                for (const scene of json.scenes) {
                    if (scene.metadata) {
                        parts.push(scene.metadata.scene_type || '');
                        parts.push(scene.metadata.learning_objective || '');
                    }
                }
            }
            
            // Add scientific evidence keywords
            if (json.scientific_evidence) {
                const evidence = json.scientific_evidence;
                parts.push((evidence.learning_theories || []).map((t: any) => t.theory).join(' '));
                parts.push((evidence.behavioral_psychology || []).map((p: any) => p.principle).join(' '));
            }
            
            return parts.filter(Boolean).join(' ');

        } catch (error) {
            // Fallback to file path and content preview on parse failure
            console.warn(`⚠️ Failed to extract semantic text from ${doc.path}, using fallback`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return doc.path + ' ' + doc.content.substring(0, 500);
        }
    }
    
    private extractMetadata(doc: ExampleDoc): ExampleDoc['metadata'] {
        try {
            const json = JSON.parse(doc.content);
            const meta = json.microlearning_metadata || {};
            
            return {
                category: meta.category || 'unknown',
                topics: [
                    meta.category,
                    meta.subcategory,
                    ...(meta.industry_relevance || []),
                    ...(meta.department_relevance || [])
                ].filter(Boolean),
                complexity: this.calculateComplexity(json),
                lastUpdated: new Date()
            };
        } catch {
            return {
                category: 'unknown',
                topics: [path.basename(doc.path, '.json')],
                complexity: 1,
                lastUpdated: new Date()
            };
        }
    }
    
    private calculateComplexity(json: any): number {
        let complexity = 1;
        
        // Add complexity based on scenes
        if (json.scenes && Array.isArray(json.scenes)) {
            complexity += json.scenes.length * 0.1;
        }
        
        // Add complexity based on quiz questions
        if (json.scenes) {
            for (const scene of json.scenes) {
                if (scene.metadata?.scene_type === 'quiz' && scene.questions) {
                    complexity += scene.questions.length * 0.2;
                }
            }
        }
        
        return Math.min(Math.max(complexity, EXAMPLE_REPO.COMPLEXITY_MIN), EXAMPLE_REPO.COMPLEXITY_MAX); // Clamp using constants
    }
    
    private async performSemanticSearch(query: string, options: SemanticSearchOptions): Promise<SearchResult[]> {
        // Generate query embedding with error handling
        let queryEmbedding: number[];
        try {
            const result = await embed({
                model: this.embeddingProvider,
                value: query
            });
            queryEmbedding = result.embedding;
        } catch (error) {
            console.error('❌ Query embedding generation failed:', error);
            throw error;
        }
        
        const results: SearchResult[] = [];
        
        for (const doc of this.docs) {
            if (!doc.embedding) continue;
            
            // Calculate cosine similarity
            const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
            
            // Calculate token-based score for hybrid approach
            const tokenScore = options.useHybrid ? 
                this.score(this.tokenize(query.toLowerCase()), 
                          (doc.path + ' ' + doc.content).toLowerCase()) : 0;
            
            // Combined score: weighted semantic + token similarity
            const combinedScore = options.useHybrid ? 
                (similarity * options.contextWeight) + (tokenScore * (1 - options.contextWeight)) : 
                similarity;
            
            if (combinedScore >= options.threshold) {
                results.push({
                    doc,
                    score: combinedScore,
                    similarity,
                    tokenScore
                });
            }
        }
        
        // Sort by combined score and return top results
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, options.maxResults);
    }
    
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
    
    // Smart schema hints using semantic search with fallback
    async getSmartSchemaHints(query?: string, maxFiles: number = 3): Promise<string> {
        if (!this.docs.length) return '';
        
        // Performance optimization: For most microlearning cases, basic schema hints are sufficient
        // Only use expensive semantic search if we have a very specific/complex query
        const isComplexQuery = query && (query.length > 50 || /advanced|specific|detailed|custom/.test(query.toLowerCase()));
        
        if (!isComplexQuery) {
            // Use cached basic schema hints for fast response
            if (!this.basicSchemaCacheGenerated) {
                const docs = this.getSchemaHintsSmart(maxFiles);
                this.basicSchemaCache = this.formatSchemaHints(docs);
                this.basicSchemaCacheGenerated = true;
                console.log('💾 Generated and cached basic schema hints');
            }
            return this.basicSchemaCache;
        }
        
        let docs: ExampleDoc[];
        
        // Only use semantic search for complex queries and if embeddings are available
        if (query && !this.embeddingsFailed) {
            try {
                docs = await this.searchTopK(query, maxFiles);
                console.log('🎯 Used semantic search for complex query');
            } catch (error) {
                console.warn('⚠️ Semantic search failed for complex query, using smart sampling:', error);
                docs = this.getSchemaHintsSmart(maxFiles);
            }
        } else {
            docs = this.getSchemaHintsSmart(maxFiles);
            console.log('📊 Used smart sampling for complex query');
        }
        
        return this.formatSchemaHints(docs);
    }
    
    // D1 Cache management methods
    async clearCache(): Promise<void> {
        if (!this.db) {
            console.warn('⚠️ D1 database not available');
            return;
        }
        
        try {
            await this.db.exec('DELETE FROM embedding_cache');
            console.log('🗑️ D1 cache cleared successfully');
        } catch (error) {
            console.warn('⚠️ D1 cache clear failed:', error);
        }
    }
    
    async getCacheStats(): Promise<{
        totalEntries: number;
        cacheSize: string;
        oldestEntry?: Date;
        newestEntry?: Date;
        totalUsage: number;
    }> {
        if (!this.db) {
            return {
                totalEntries: 0,
                cacheSize: '0 MB',
                totalUsage: 0
            };
        }
        
        try {
            const statsResult = await this.db.prepare(`
                SELECT 
                    COUNT(*) as total_entries,
                    SUM(usage_count) as total_usage,
                    MIN(created_at) as oldest_entry,
                    MAX(created_at) as newest_entry
                FROM embedding_cache
            `).first();
            
            // Rough size estimate (embeddings are typically 1536 dimensions * 4 bytes)
            const estimatedSize = (statsResult?.total_entries || 0) * 1536 * 4;
            
            return {
                totalEntries: statsResult?.total_entries || 0,
                cacheSize: `${(estimatedSize / 1024 / 1024).toFixed(2)} MB`,
                oldestEntry: statsResult?.oldest_entry ? new Date(statsResult.oldest_entry) : undefined,
                newestEntry: statsResult?.newest_entry ? new Date(statsResult.newest_entry) : undefined,
                totalUsage: statsResult?.total_usage || 0
            };
        } catch (error) {
            console.warn('Failed to get D1 cache stats:', error);
            return {
                totalEntries: 0,
                cacheSize: '0 MB',
                totalUsage: 0
            };
        }
    }
    
    async validateCache(): Promise<{
        valid: number;
        invalid: number;
        missing: number;
        details: string[];
    }> {
        const results = {
            valid: 0,
            invalid: 0,
            missing: 0,
            details: [] as string[]
        };
        
        if (!this.db) {
            results.details.push('D1 database not available');
            return results;
        }
        
        try {
            for (const doc of this.docs) {
                const currentHash = this.getContentHash(doc.content);
                const stmt = this.db.prepare(
                    'SELECT path, content_hash FROM embedding_cache WHERE path = ?'
                );
                const cached = await stmt.bind(doc.path).first();
                
                if (!cached) {
                    results.missing++;
                    results.details.push(`Missing cache: ${doc.path}`);
                } else if (cached.content_hash !== currentHash) {
                    results.invalid++;
                    results.details.push(`Stale cache: ${doc.path}`);
                } else {
                    results.valid++;
                }
            }
        } catch (error) {
            console.warn('Failed to validate D1 cache:', error);
            results.details.push('Validation failed: ' + error);
        }
        
        return results;
    }
    
    async optimizeCache(): Promise<{
        cleaned: number;
        kept: number;
    }> {
        if (!this.db) {
            return { cleaned: 0, kept: 0 };
        }
        
        const currentPaths = new Set(this.docs.map(doc => doc.path));
        let cleaned = 0;
        let kept = 0;
        
        try {
            // Get all cached paths
            const allCached = await this.db.prepare(
                'SELECT path FROM embedding_cache'
            ).all();
            
            if (allCached.success && allCached.results) {
                for (const row of allCached.results as {path: string}[]) {
                    if (!currentPaths.has(row.path)) {
                        await this.removeCacheEntry(row.path);
                        cleaned++;
                    } else {
                        kept++;
                    }
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 D1 Cache optimized: ${cleaned} removed, ${kept} kept`);
            }
            
        } catch (error) {
            console.warn('Failed to optimize D1 cache:', error);
        }
        
        return { cleaned, kept };
    }
    
    private getSchemaHintsSmart(maxFiles: number): ExampleDoc[] {
        if (this.docs.length <= maxFiles) return this.docs;
        
        // Try to pick diverse examples based on metadata
        const categorized = new Map<string, ExampleDoc[]>();
        
        for (const doc of this.docs) {
            const category = doc.metadata?.category || 'unknown';
            if (!categorized.has(category)) {
                categorized.set(category, []);
            }
            categorized.get(category)!.push(doc);
        }
        
        // Pick one from each category, then fill remaining slots
        const selected: ExampleDoc[] = [];
        const categories = Array.from(categorized.keys());
        
        // First, pick one from each category
        for (const category of categories) {
            if (selected.length >= maxFiles) break;
            selected.push(categorized.get(category)![0]);
        }
        
        // Fill remaining slots
        for (const doc of this.docs) {
            if (selected.length >= maxFiles) break;
            if (!selected.includes(doc)) {
                selected.push(doc);
            }
        }
        
        return selected.slice(0, maxFiles);
    }
    
    private formatSchemaHints(docs: ExampleDoc[]): string {
        const hints = docs.map(doc => {
            try {
                const json = JSON.parse(doc.content);
                const topKeys = Object.keys(json);
                const metaKeys = Object.keys(json.microlearning_metadata || {});
                const scenes = Array.isArray(json.scenes) ? json.scenes : [];
                const sceneMetaKeys = new Set<string>();
                const sceneTypes = new Set<string>();
                
                for (const s of scenes) {
                    if (s?.metadata) {
                        Object.keys(s.metadata).forEach(k => sceneMetaKeys.add(k));
                        if (s.metadata.scene_type) sceneTypes.add(s.metadata.scene_type);
                    }
                }
                
                let hint = `File: ${doc.path}\nTop-level keys: ${topKeys.join(', ')}\nMetadata keys: ${metaKeys.join(', ')}\nScene types: ${Array.from(sceneTypes).join(', ')}\nScene metadata keys: ${Array.from(sceneMetaKeys).join(', ')}`;
                
                // Add semantic metadata if available
                if (doc.metadata) {
                    hint += `\nCategory: ${doc.metadata.category}\nTopics: ${doc.metadata.topics.join(', ')}\nComplexity: ${doc.metadata.complexity}/5`;
                }
                
                return hint;
            } catch {
                return `File: ${doc.path}\n(Invalid JSON, skipped)`;
            }
        });
        
        return hints.join('\n\n');
    }
    
    // Development/Debug helpers
    async rebuildCache(): Promise<void> {
        console.log('🔄 Rebuilding D1 cache from scratch...');
        
        // Clear D1 cache
        await this.clearCache();
        
        // Reset state
        this.embeddingsGenerated = false;
        this.embeddingsFailed = false;
        
        // Clear embeddings from docs
        for (const doc of this.docs) {
            delete doc.embedding;
            delete doc.metadata;
        }
        
        // Regenerate everything
        await this.tryGenerateEmbeddings();
    }
    
    async printCacheReport(): Promise<void> {
        const stats = await this.getCacheStats();
        console.log('📊 D1 Cache Report:');
        console.log(`  Total entries: ${stats.totalEntries}`);
        console.log(`  Cache size: ${stats.cacheSize}`);
        console.log(`  Total usage: ${stats.totalUsage}`);
        console.log(`  Oldest entry: ${stats.oldestEntry?.toLocaleDateString()}`);
        console.log(`  Newest entry: ${stats.newestEntry?.toLocaleDateString()}`);
        
        if (!this.db) {
            console.log('  D1 database not available');
            return;
        }
        
        try {
            // Get top used examples
            const topUsed = await this.db.prepare(`
                SELECT path, usage_count, last_used 
                FROM embedding_cache 
                ORDER BY usage_count DESC 
                LIMIT 5
            `).all();
            
            if (topUsed.success && topUsed.results && topUsed.results.length > 0) {
                console.log('  Top used examples:');
                topUsed.results.forEach((entry: any, i: number) => {
                    console.log(`    ${i+1}. ${entry.path} (used ${entry.usage_count} times, last: ${new Date(entry.last_used).toLocaleDateString()})`);
                });
            }
        } catch (error) {
            console.warn('  Failed to get top used examples:', error);
        }
    }
}
