import { CloudflareDeployer } from "@mastra/deployer-cloudflare";

export function getDeployer() {
    return new CloudflareDeployer({
        projectName: "agentic-ally",
        env: {
            NODE_ENV: "production",
            BUILD_MODE: "production"
        },
        d1Databases: [
            {
                binding: "agentic_ally_embeddings_cache",
                database_name: "agentic-ally-embeddings-cache",
                database_id: "be23a682-b463-47a0-a300-aca930ed8749"
            }
        ],
        kvNamespaces: [
            {
                binding: "MICROLEARNING_KV",
                id: "c96ef0b5a2424edca1426f6e7a85b9dc"
            }
        ]
    });
}