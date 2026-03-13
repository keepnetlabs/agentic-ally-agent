import { describe, it, expect, vi, beforeAll } from 'vitest';
import { smishingSmsAgent } from './smishing-sms-agent';
import { AGENT_NAMES, AGENT_IDS } from '../constants';

vi.mock('../tools/orchestration', () => ({
  smishingWorkflowExecutorTool: { id: 'executor' },
  smishingEditorTool: { id: 'editor' },
}));

vi.mock('../tools/analysis', () => ({
  reasoningTool: { id: 'reasoning' },
}));

vi.mock('../tools/user-management', () => ({
  uploadSmishingTool: { id: 'upload' },
  assignSmishingTool: { id: 'assign' },
}));

vi.mock('../model-providers', () => ({
  getDefaultAgentModel: vi.fn().mockReturnValue({ id: 'default-model' }),
}));

describe('smishingAgent', () => {
  let instructions: string;
  let tools: Record<string, any>;

  beforeAll(async () => {
    instructions = (await smishingSmsAgent.getInstructions()) as string;
    tools = await smishingSmsAgent.listTools();
  });

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
    expect(instructions).toContain('Smishing Simulation Specialist');
  });

  it('should have state machine workflow instructions', () => {
    expect(instructions).toContain('STATE 1');
    expect(instructions).toContain('STATE 2');
    expect(instructions).toContain('STATE 3');
    expect(instructions).toContain('STATE 4');
  });

  it('should emphasize safety rules', () => {
    expect(instructions).toContain('Global Rules');
    expect(instructions).toContain('Safety');
    expect(instructions).toContain('cyberattack');
  });

  it('should include psychological profiling via Cialdini principles', () => {
    expect(instructions).toContain('Cialdini');
    expect(instructions).toContain('Reciprocity');
    expect(instructions).toContain('Authority');
  });

  it('should specify language handling rules', () => {
    expect(instructions).toContain('Language Rules');
    expect(instructions).toContain('INTERACTION LANGUAGE');
    expect(instructions).toContain('CONTENT LANGUAGE');
  });

  it('should mention edit mode instructions', () => {
    expect(instructions).toContain('EDIT MODE');
  });

  it('should prohibit tech jargon in reasoning', () => {
    expect(instructions).toContain('No Tech Jargon');
  });

  it('should specify workflow routing', () => {
    expect(instructions).toContain('Workflow Routing');
    expect(instructions).toContain('CREATION');
    expect(instructions).toContain('UTILITY');
  });

  it('should mention confirmation templates', () => {
    expect(instructions).toContain('STRICT OUTPUT TEMPLATE');
    expect(instructions).toContain('HTML');
  });

  it('should have model configured', () => {
    expect(smishingSmsAgent.model).toBeDefined();
  });

  it('should include BCP-47 language code requirement', () => {
    expect(instructions).toContain('BCP-47');
  });

  it('should specify tool requirements for state transitions', () => {
    expect(instructions).toContain('smishingExecutor');
    expect(instructions).toContain('uploadSmishing');
    expect(instructions).toContain('assignSmishing');
  });

  it('should specify artifact ID usage', () => {
    expect(instructions).toContain('[ARTIFACT_IDS]');
  });

  it('should mention psychological cognitive dissonance concept', () => {
    expect(instructions).toContain('cognitive dissonance');
  });

  it('should include autonomous mode override instructions', () => {
    expect(instructions).toContain('AUTONOMOUS MODE OVERRIDE');
    expect(instructions).toContain('AUTONOMOUS_EXECUTION_MODE');
    expect(instructions).toContain('smishingExecutor');
  });

  it('should have exactly 5 tools', () => {
    expect(Object.keys(tools)).toHaveLength(5);
  });

  it('should include messaging guidelines (blacklist words)', () => {
    expect(instructions).toContain('NEVER use');
    expect(instructions).toContain('Messaging Guidelines');
  });

  it('should have substantial instructions', () => {
    expect(instructions.length).toBeGreaterThan(2000);
  });

  it('should include SCENARIO block for language rules', () => {
    expect(instructions).toContain('SCENARIO');
    expect(instructions).toContain('Pass this to');
  });
});
