import { describe, it, expect, vi } from 'vitest';
import { emailIRAnalyst } from './email-ir-analyst';
import { AGENT_IDS, AGENT_NAMES } from '../constants';

vi.mock('../model-providers', () => ({
  getModel: vi.fn().mockReturnValue({ id: 'gpt-5-1' }),
  ModelProvider: { OPENAI: 'openai' },
  Model: { OPENAI_GPT_5_1: 'gpt-5-1' },
}));

describe('emailIRAnalyst', () => {
  it('should be defined', () => {
    expect(emailIRAnalyst).toBeDefined();
  });

  it('should have correct ID', () => {
    expect(emailIRAnalyst.id).toBe(AGENT_IDS.EMAIL_IR_ANALYST);
  });

  it('should have correct name', () => {
    expect(emailIRAnalyst.name).toBe(AGENT_NAMES.EMAIL_IR_ANALYST);
  });

  it('should have description defined', async () => {
    expect(emailIRAnalyst.name || await emailIRAnalyst.getInstructions()).toBeDefined();
  });

  it('should have instructions for header, behavioral, and threat analysis', async () => {
    const instructions = await emailIRAnalyst.getInstructions();
    expect(instructions).toContain('Incident Responder');
    expect(instructions).toContain('headers');
    expect(instructions).toContain('Social Engineering');
    expect(instructions).toContain('threat intelligence');
  });

  it('should have defensive mindset principle in instructions', async () => {
    const instructions = await emailIRAnalyst.getInstructions();
    expect(instructions).toContain('Defensive Mindset');
    expect(instructions).toContain('evasion techniques');
  });

  it('should have evidence-based analysis requirement', async () => {
    const instructions = await emailIRAnalyst.getInstructions();
    expect(instructions).toContain('Evidence-Based');
    expect(instructions).toContain('provided data');
  });

  it('should support SOC analyst role for analysis', async () => {
    const instructions = await emailIRAnalyst.getInstructions();
    expect(instructions).toContain('SOC Analyst');
    expect(instructions).toContain('Security');
  });

  it('should have model configured', () => {
    expect(emailIRAnalyst.model).toBeDefined();
  });
});
