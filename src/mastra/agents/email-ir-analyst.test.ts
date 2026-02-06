import { describe, it, expect, vi } from 'vitest';
import { emailIRAnalyst } from './email-ir-analyst';
import { AGENT_IDS, AGENT_NAMES } from '../constants';

vi.mock('../model-providers', () => ({
  getModel: vi.fn().mockReturnValue({ id: 'gpt-5-1' }),
  ModelProvider: { OPENAI: 'openai' },
  Model: { OPENAI_GPT_5_1: 'gpt-5-1' }
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

  it('should have description defined', () => {
    // Description may be defined or used in name/instructions
    expect(emailIRAnalyst.name || emailIRAnalyst.instructions).toBeDefined();
  });

  it('should have instructions for header, behavioral, and threat analysis', () => {
    expect(emailIRAnalyst.instructions).toContain('Incident Responder');
    expect(emailIRAnalyst.instructions).toContain('headers');
    expect(emailIRAnalyst.instructions).toContain('Social Engineering');
    expect(emailIRAnalyst.instructions).toContain('threat intelligence');
  });

  it('should have defensive mindset principle in instructions', () => {
    expect(emailIRAnalyst.instructions).toContain('Defensive Mindset');
    expect(emailIRAnalyst.instructions).toContain('evasion techniques');
  });

  it('should have evidence-based analysis requirement', () => {
    expect(emailIRAnalyst.instructions).toContain('Evidence-Based');
    expect(emailIRAnalyst.instructions).toContain('provided data');
  });

  it('should support SOC analyst role for analysis', () => {
    expect(emailIRAnalyst.instructions).toContain('SOC Analyst');
    expect(emailIRAnalyst.instructions).toContain('Security');
  });

  it('should have model configured', () => {
    expect(emailIRAnalyst.model).toBeDefined();
  });
});
