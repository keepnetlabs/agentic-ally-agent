/**
 * Services Barrel Exports
 * Clean imports: import { KVService, errorService } from './services';
 */

// Core services
export { KVService } from './kv-service';
export { errorService, ErrorCategory, type ErrorInfo } from './error-service';
export { ExampleRepo } from './example-repo';
export { MicrolearningService } from './microlearning-service';
export { ProductService } from './product-service';
export { AgentRouter } from './agent-router';

// Autonomous service (re-export from subdirectory)
export { executeAutonomousGeneration } from './autonomous';

