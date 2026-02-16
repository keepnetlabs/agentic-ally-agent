/**
 * Autonomous service exports
 * Central export point for all autonomous generation logic
 */

// Main entry point
export { executeAutonomousGeneration } from './autonomous-service';

// Phishing handlers
export {
  generatePhishingSimulation,
  uploadAndAssignPhishing,
  uploadAndAssignPhishingForGroup,
  generatePhishingSimulationForGroup,
  assignPhishingWithTraining,
} from './autonomous-phishing-handlers';

// Training handlers
export {
  uploadTrainingOnly,
  uploadAndAssignTraining,
  uploadAndAssignTrainingForGroup,
  generateTrainingModule,
  generateTrainingModuleForGroup,
} from './autonomous-training-handlers';

// Content generators & orchestration
export { buildExecutiveReport, generateContentForUser, generateContentForGroup } from './autonomous-content-generators';
