/**
 * Agents Barrel Exports
 * Clean imports: import { microlearningAgent, orchestratorAgent } from './agents';
 */

export { microlearningAgent } from './microlearning-agent';
export { orchestratorAgent } from './orchestrator-agent';
export { phishingEmailAgent } from './phishing-email-agent';
export { smishingSmsAgent } from './smishing-sms-agent';
export { policySummaryAgent } from './policy-summary-agent';
export { userInfoAgent } from './user-info-agent';
export { vishingCallAgent } from './vishing-call-agent';
export { deepfakeVideoAgent } from './deepfake-video-agent';
export { outOfScopeAgent } from './out-of-scope-agent';

// Phishing Template Fixer
export {
  phishingTemplateFixerAgent,
  phishingLandingPageClassifierAgent,
} from './phishing-template-fixer';

// Customer Service Agent Swarm
export { companySearchAgent, trainingStatsAgent, csOrchestratorAgent } from './customer-service';
