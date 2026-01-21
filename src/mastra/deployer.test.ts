
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeployer } from './deployer';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';

// Create a spy function to track constructor calls
const constructorCallsSpy = vi.fn();

// Mock the dependency
vi.mock('@mastra/deployer-cloudflare', () => {
    return {
        CloudflareDeployer: class {
            public config: any;
            constructor(config: any) {
                this.config = config;
                constructorCallsSpy(config);
            }
        },
    };
});

describe('getDeployer', () => {
    beforeEach(() => {
        constructorCallsSpy.mockClear();
    });

    describe('Basic Functionality', () => {
        it('should create a CloudflareDeployer with correct configuration', () => {
            getDeployer();

            expect(constructorCallsSpy).toHaveBeenCalledTimes(1);
            expect(constructorCallsSpy).toHaveBeenCalledWith(expect.objectContaining({
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

        it('should call CloudflareDeployer constructor once', () => {
            getDeployer();
            expect(constructorCallsSpy).toHaveBeenCalledTimes(1);
        });

        it('should return the created deployer instance', () => {
            const result = getDeployer();
            expect(result).toBeInstanceOf(CloudflareDeployer);
        });

        it('should create new instance on each call', () => {
            getDeployer();
            getDeployer();
            expect(constructorCallsSpy).toHaveBeenCalledTimes(2);
        });

        it('should work without any parameters', () => {
            expect(() => getDeployer()).not.toThrow();
        });
    });

    describe('Project Configuration', () => {
        it('should use correct project name', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.projectName).toBe('agentic-ally');
        });

        it('should have hyphenated project name format', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.projectName).toMatch(/^[a-z]+(-[a-z]+)*$/);
        });

        it('should have lowercase project name', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.projectName).toBe(callArgs.projectName.toLowerCase());
        });
    });

    describe('Environment Variables', () => {
        it('should set NODE_ENV to production', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.env.NODE_ENV).toBe('production');
        });

        it('should set BUILD_MODE to production', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.env.BUILD_MODE).toBe('production');
        });

        it('should have exactly 2 environment variables', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(Object.keys(callArgs.env)).toHaveLength(2);
        });

        it('should include NODE_ENV key', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.env).toHaveProperty('NODE_ENV');
        });

        it('should include BUILD_MODE key', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.env).toHaveProperty('BUILD_MODE');
        });

        it('should use same value for NODE_ENV and BUILD_MODE', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.env.NODE_ENV).toBe(callArgs.env.BUILD_MODE);
        });
    });

    describe('D1 Databases', () => {
        it('should configure exactly 2 D1 databases', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.d1Databases).toHaveLength(2);
        });

        it('should configure embeddings cache database', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const embeddingsDb = callArgs.d1Databases.find((db: any) => db.binding === 'agentic_ally_embeddings_cache');
            expect(embeddingsDb).toBeDefined();
        });

        it('should configure memory database', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const memoryDb = callArgs.d1Databases.find((db: any) => db.binding === 'agentic_ally_memory');
            expect(memoryDb).toBeDefined();
        });

        describe('Embeddings Cache Database', () => {
            it('should have correct binding', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(db.binding).toBe('agentic_ally_embeddings_cache');
            });

            it('should have correct database name', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(db.database_name).toBe('agentic-ally-embeddings-cache');
            });

            it('should have database_id', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(db.database_id).toBeDefined();
            });

            it('should have UUID format database_id', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(db.database_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            });

            it('should use underscores in binding', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(db.binding).toContain('_');
            });

            it('should use hyphens in database_name', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(db.database_name).toContain('-');
            });

            it('should have exactly 3 properties', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_embeddings_cache');
                expect(Object.keys(db)).toHaveLength(3);
            });
        });

        describe('Memory Database', () => {
            it('should have correct binding', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(db.binding).toBe('agentic_ally_memory');
            });

            it('should have correct database name', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(db.database_name).toBe('agentic-ally-memory');
            });

            it('should have database_id', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(db.database_id).toBeDefined();
            });

            it('should have UUID format database_id', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(db.database_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            });

            it('should use underscores in binding', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(db.binding).toContain('_');
            });

            it('should use hyphens in database_name', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(db.database_name).toContain('-');
            });

            it('should have exactly 3 properties', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const db = callArgs.d1Databases.find((d: any) => d.binding === 'agentic_ally_memory');
                expect(Object.keys(db)).toHaveLength(3);
            });
        });

        describe('D1 Database Naming Conventions', () => {
            it('should have consistent naming pattern for bindings', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                callArgs.d1Databases.forEach((db: any) => {
                    expect(db.binding).toMatch(/^agentic_ally_[a-z_]+$/);
                });
            });

            it('should have consistent naming pattern for database_names', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                callArgs.d1Databases.forEach((db: any) => {
                    expect(db.database_name).toMatch(/^agentic-ally-[a-z-]+$/);
                });
            });

            it('should have unique bindings', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const bindings = callArgs.d1Databases.map((db: any) => db.binding);
                const uniqueBindings = new Set(bindings);
                expect(uniqueBindings.size).toBe(bindings.length);
            });

            it('should have unique database names', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const names = callArgs.d1Databases.map((db: any) => db.database_name);
                const uniqueNames = new Set(names);
                expect(uniqueNames.size).toBe(names.length);
            });

            it('should have unique database IDs', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                const ids = callArgs.d1Databases.map((db: any) => db.database_id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(ids.length);
            });

            it('should use underscores in bindings instead of hyphens', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                callArgs.d1Databases.forEach((db: any) => {
                    expect(db.binding).not.toContain('-');
                    expect(db.binding).toContain('_');
                });
            });

            it('should use hyphens in database_names instead of underscores', () => {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[0][0];
                callArgs.d1Databases.forEach((db: any) => {
                    expect(db.database_name).not.toContain('_');
                    expect(db.database_name).toContain('-');
                });
            });
        });
    });

    describe('KV Namespaces', () => {
        it('should configure exactly 1 KV namespace', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs.kvNamespaces).toHaveLength(1);
        });

        it('should configure MICROLEARNING_KV namespace', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv.binding).toBe('MICROLEARNING_KV');
        });

        it('should have binding property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv).toHaveProperty('binding');
        });

        it('should have id property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv).toHaveProperty('id');
        });

        it('should have exactly 2 properties', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(Object.keys(kv)).toHaveLength(2);
        });

        it('should use UPPERCASE_SNAKE_CASE for binding', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv.binding).toMatch(/^[A-Z_]+$/);
        });

        it('should have hex format id', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv.id).toMatch(/^[0-9a-f]+$/);
        });

        it('should have 32-character hex id', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv.id).toHaveLength(32);
        });

        it('should have non-empty binding', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv.binding.length).toBeGreaterThan(0);
        });

        it('should have non-empty id', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            const kv = callArgs.kvNamespaces[0];
            expect(kv.id.length).toBeGreaterThan(0);
        });
    });

    describe('Configuration Structure', () => {
        it('should have exactly 4 top-level properties', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(Object.keys(callArgs)).toHaveLength(4);
        });

        it('should include projectName property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs).toHaveProperty('projectName');
        });

        it('should include env property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs).toHaveProperty('env');
        });

        it('should include d1Databases property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs).toHaveProperty('d1Databases');
        });

        it('should include kvNamespaces property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs).toHaveProperty('kvNamespaces');
        });

        it('should have object type for env', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(typeof callArgs.env).toBe('object');
        });

        it('should have array type for d1Databases', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(Array.isArray(callArgs.d1Databases)).toBe(true);
        });

        it('should have array type for kvNamespaces', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(Array.isArray(callArgs.kvNamespaces)).toBe(true);
        });

        it('should not have serviceBindings property', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];
            expect(callArgs).not.toHaveProperty('serviceBindings');
        });
    });

    describe('Consistency', () => {
        it('should return same configuration on multiple calls', () => {
            getDeployer();
            getDeployer();

            const call1Args = constructorCallsSpy.mock.calls[0][0];
            const call2Args = constructorCallsSpy.mock.calls[1][0];

            expect(call1Args).toEqual(call2Args);
        });

        it('should use consistent configuration structure', () => {
            getDeployer();

            const callArgs = constructorCallsSpy.mock.calls[0][0];

            // All D1 databases should have the same structure
            const dbKeys = callArgs.d1Databases.map((db: any) => Object.keys(db).sort());
            expect(dbKeys[0]).toEqual(dbKeys[1]);
        });

        it('should create new instance each time (not cached)', () => {
            const result1 = getDeployer();
            const result2 = getDeployer();

            // Each call should create a new instance
            expect(result1).not.toBe(result2);
            expect(constructorCallsSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Edge Cases', () => {
        it('should work when called multiple times rapidly', () => {
            expect(() => {
                for (let i = 0; i < 10; i++) {
                    getDeployer();
                }
            }).not.toThrow();
        });

        it('should maintain configuration integrity across calls', () => {
            for (let i = 0; i < 5; i++) {
                getDeployer();

                const callArgs = constructorCallsSpy.mock.calls[i][0];
                expect(callArgs.projectName).toBe('agentic-ally');
                expect(callArgs.d1Databases).toHaveLength(2);
                expect(callArgs.kvNamespaces).toHaveLength(1);
            }
        });

        it('should not mutate the configuration object', () => {
            getDeployer();

            const firstCallArgs = constructorCallsSpy.mock.calls[0][0];
            const originalProjectName = firstCallArgs.projectName;

            // Try to mutate
            firstCallArgs.projectName = 'modified';

            getDeployer();
            const secondCallArgs = constructorCallsSpy.mock.calls[1][0];

            // Second call should still have original value
            expect(secondCallArgs.projectName).toBe(originalProjectName);
        });
    });
});
