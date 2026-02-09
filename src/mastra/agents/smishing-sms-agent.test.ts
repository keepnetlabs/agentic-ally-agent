import { describe, it, expect, vi } from 'vitest';
import { smishingSmsAgent } from './smishing-sms-agent';
import { AGENT_NAMES, AGENT_IDS } from '../constants';

vi.mock('../tools/orchestration', () => ({
  smishingWorkflowExecutorTool: { id: 'executor' },
  smishingEditorTool: { id: 'editor' }
}));

vi.mock('../tools/analysis', () => ({
  reasoningTool: { id: 'reasoning' }
}));

vi.mock('../tools/user-management', () => ({
  uploadSmishingTool: { id: 'upload' },
  assignSmishingTool: { id: 'assign' }
}));

vi.mock('../model-providers', () => ({
  getDefaultAgentModel: vi.fn().mockReturnValue({ id: 'default-model' })
}));

describe('smishingAgent', () => {
  it('should be defined', () => {
    expect(smishingSmsAgent).toBeDefined();
  });

  it('should have correct ID', () => {
    expect(smishingSmsAgent.id).toBe(AGENT_IDS.SMISHING);
  });

  it('should have correct name', () => {
    expect(smishingSmsAgent.name).toBe(AGENT_NAMES.SMISHING);
  });

  it('should have instructions mentioning smishing simulation', () => {
    expect(smishingSmsAgent.instructions).toContain('Smishing Simulation Specialist');
  });

  it('should have state machine workflow instructions', () => {
    expect(smishingSmsAgent.instructions).toContain('STATE 1');
    expect(smishingSmsAgent.instructions).toContain('STATE 2');
    expect(smishingSmsAgent.instructions).toContain('STATE 3');
    expect(smishingSmsAgent.instructions).toContain('STATE 4');
    expect(smishingSmsAgent.instructions).toContain('STATE 5');
  });

  it('should emphasize safety rules', () => {
    expect(smishingSmsAgent.instructions).toContain('SAFETY RULES');
    expect(smishingSmsAgent.instructions).toContain('cyberattacks');
  });

  it('should include psychological profiling via Cialdini principles', () => {
    expect(smishingSmsAgent.instructions).toContain('Cialdini');
    expect(smishingSmsAgent.instructions).toContain('Reciprocity');
    expect(smishingSmsAgent.instructions).toContain('Authority');
  });

  it('should specify language handling rules', () => {
    expect(smishingSmsAgent.instructions).toContain('LANGUAGE RULES');
    expect(smishingSmsAgent.instructions).toContain('INTERACTION LANGUAGE');
    expect(smishingSmsAgent.instructions).toContain('CONTENT LANGUAGE');
  });

  it('should mention edit mode instructions', () => {
    expect(smishingSmsAgent.instructions).toContain('EDIT MODE');
  });

  it('should prohibit tech jargon in reasoning', () => {
    expect(smishingSmsAgent.instructions).toContain('NO TECH JARGON');
  });

  it('should specify workflow routing', () => {
    expect(smishingSmsAgent.instructions).toContain('WORKFLOW ROUTING');
    expect(smishingSmsAgent.instructions).toContain('CREATION');
    expect(smishingSmsAgent.instructions).toContain('UTILITY');
  });

  it('should mention confirmation templates', () => {
    expect(smishingSmsAgent.instructions).toContain('STRICT OUTPUT TEMPLATE');
    expect(smishingSmsAgent.instructions).toContain('HTML');
  });

  it('should have model configured', () => {
    expect(smishingSmsAgent.model).toBeDefined();
  });

  it('should include BCP-47 language code requirement', () => {
    expect(smishingSmsAgent.instructions).toContain('BCP-47');
  });

  it('should specify tool requirements for state transitions', () => {
    expect(smishingSmsAgent.instructions).toContain('smishingExecutor');
    expect(smishingSmsAgent.instructions).toContain('uploadSmishing');
    expect(smishingSmsAgent.instructions).toContain('assignSmishing');
  });

  it('should specify artifact ID usage', () => {
    expect(smishingSmsAgent.instructions).toContain('[ARTIFACT_IDS]');
  });

  it('should mention psychological cognitive dissonance concept', () => {
    expect(smishingSmsAgent.instructions).toContain('cognitive dissonance');
  });

  it('should include autonomous mode override instructions', () => {
    expect(smishingSmsAgent.instructions).toContain('AUTONOMOUS MODE OVERRIDE');
    expect(smishingSmsAgent.instructions).toContain('AUTONOMOUS_EXECUTION_MODE');
    expect(smishingSmsAgent.instructions).toContain('smishingExecutor');
  });
});
