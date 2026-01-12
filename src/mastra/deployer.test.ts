
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeployer } from './deployer';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';

// Mock the dependency
vi.mock('@mastra/deployer-cloudflare', () => {
    return {
        CloudflareDeployer: vi.fn(),
    };
});

describe('getDeployer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a CloudflareDeployer with correct configuration', () => {
        getDeployer();

        expect(CloudflareDeployer).toHaveBeenCalledTimes(1);
        expect(CloudflareDeployer).toHaveBeenCalledWith(expect.objectContaining({
            projectName: "agentic-ally",
            env: {
                NODE_ENV: "production",
                BUILD_MODE: "production"
            },
            d1Databases: expect.arrayContaining([
                expect.objectContaining({
                    binding: "agentic_ally_embeddings_cache",
                    database_name: "agentic-ally-embeddings-cache"
                }),
                expect.objectContaining({
                    binding: "agentic_ally_memory",
                    database_name: "agentic-ally-memory"
                })
            ]),
            kvNamespaces: expect.arrayContaining([
                expect.objectContaining({
                    binding: "MICROLEARNING_KV"
                })
            ])
        }));
    });
});
