/**
 * Golden tests: orchestrator → canonical agent name (no LLM, no Mastra).
 * When these fail, orchestrator output aliases or PUBLIC_ROUTABLE_AGENT_NAMES changed.
 */

import { describe, it, expect } from 'vitest';
import { normalizeOrchestratorAgentLabel } from './agent-router';
import { AGENT_NAMES } from '../constants';

describe('normalizeOrchestratorAgentLabel (golden)', () => {
  const cases: { raw: string; expected: ReturnType<typeof normalizeOrchestratorAgentLabel> }[] = [
    { raw: 'microlearningAgent', expected: AGENT_NAMES.MICROLEARNING },
    { raw: 'Microlearning Agent', expected: AGENT_NAMES.MICROLEARNING },
    { raw: 'phishingEmailAssistant', expected: AGENT_NAMES.PHISHING },
    { raw: 'phishing-email-assistant', expected: AGENT_NAMES.PHISHING },
    { raw: 'smishingSmsAssistant', expected: AGENT_NAMES.SMISHING },
    { raw: 'emailIrAnalyst', expected: AGENT_NAMES.EMAIL_IR_ANALYST },
    { raw: 'email-ir-analyst', expected: AGENT_NAMES.EMAIL_IR_ANALYST },
    { raw: 'Email IR Analyst', expected: AGENT_NAMES.EMAIL_IR_ANALYST },
    { raw: 'vishingCallAssistant', expected: AGENT_NAMES.VISHING_CALL },
    { raw: 'policySummaryAssistant', expected: AGENT_NAMES.POLICY_SUMMARY },
    { raw: 'userInfoAssistant', expected: AGENT_NAMES.USER_INFO },
    { raw: 'deepfakeVideoAssistant', expected: AGENT_NAMES.DEEPFAKE_VIDEO },
    { raw: 'out-of-scope', expected: AGENT_NAMES.OUT_OF_SCOPE },
    { raw: 'Out of Scope', expected: AGENT_NAMES.OUT_OF_SCOPE },
    { raw: 'outofscope', expected: AGENT_NAMES.OUT_OF_SCOPE },
  ];

  it.each(cases)('normalizes $raw → $expected', ({ raw, expected }) => {
    expect(normalizeOrchestratorAgentLabel(raw)).toBe(expected);
  });

  it('returns undefined for unknown agent labels', () => {
    expect(normalizeOrchestratorAgentLabel('totallyUnknownAgent')).toBeUndefined();
    expect(normalizeOrchestratorAgentLabel('')).toBeUndefined();
  });
});
