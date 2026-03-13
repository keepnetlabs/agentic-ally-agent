import { describe, it, expect, vi, beforeAll } from 'vitest';
import { AGENT_IDS, AGENT_NAMES } from '../constants';
import { vishingCallAgent } from './vishing-call-agent';

vi.mock('../tools/vishing-call', () => ({
  listPhoneNumbersTool: { id: 'list-phone-numbers' },
  initiateVishingCallTool: { id: 'initiate-vishing-call' },
}));

vi.mock('../tools/user-management/get-user-info-tool', () => ({
  getUserInfoTool: { id: 'get-user-info' },
}));

vi.mock('../tools/analysis', () => ({
  reasoningTool: { id: 'show-reasoning' },
}));

vi.mock('../model-providers', () => ({
  getDefaultAgentModel: vi.fn().mockReturnValue({ id: 'default-model' }),
}));

describe('vishingCallAgent', () => {
  let instructions: string;
  let tools: Record<string, any>;

  beforeAll(async () => {
    instructions = (await vishingCallAgent.getInstructions()) as string;
    tools = await vishingCallAgent.listTools();
  });

  it('should be defined with correct id and name', () => {
    expect(vishingCallAgent).toBeDefined();
    expect(vishingCallAgent.id).toBe(AGENT_IDS.VISHING_CALL);
    expect(vishingCallAgent.name).toBe(AGENT_NAMES.VISHING_CALL);
  });

  it('should register required tools', () => {
    expect(tools).toBeDefined();
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining(['getUserInfo', 'listPhoneNumbers', 'initiateVishingCall', 'showReasoning'])
    );
  });

  it('should contain 4-state workflow instructions', () => {
    expect(instructions).toContain('STATE 1');
    expect(instructions).toContain('STATE 2');
    expect(instructions).toContain('STATE 3');
    expect(instructions).toContain('STATE 4');
  });

  it('should enforce deterministic caller-number selection behavior', () => {
    expect(instructions).toContain('OUTPUT RULE (DETERMINISTIC)');
    expect(instructions).toContain('HARD RULE: When auto-selection succeeds, NEVER ask "Which number should I use?"');
    expect(instructions).toContain('Apply this exact decision order (first match wins)');
  });

  it('should enforce auto-select path to skip list and jump to summary', () => {
    expect(instructions).toContain('DO NOT show a numbered caller list');
    expect(instructions).toContain('immediately output the STATE 4 summary block');
  });

  it('should still support manual choice branch when no auto-selection exists', () => {
    expect(instructions).toContain('For the manual-choice branch only');
    expect(instructions).toContain('{Localized: "Available Caller Numbers"}');
    expect(instructions).toContain('{Localized: "Which number should I use to place the call?"}');
  });

  it('should enforce summary-before-confirmation protocol', () => {
    expect(instructions).toContain('STRICT SUMMARY OUTPUT CONTRACT (MANDATORY)');
    expect(instructions).toContain('Should I initiate the call now?');
    expect(instructions).toContain('Never combine Step A and call initiation in the same turn');
  });

  it('should prevent number selection from being treated as call-start confirmation', () => {
    expect(instructions).toContain('Number/label selections ("1", "2", "US", "UK")');
    expect(instructions).toContain('are NEVER call-start confirmation in STATE 4');
  });

  it('should require prompt and firstMessage before call tool invocation', () => {
    expect(instructions).toContain('NEVER call this tool with an empty prompt or firstMessage');
    expect(instructions).toContain('If prompt or firstMessage is missing or empty, **STOP. DO NOT call the tool.**');
  });

  it('should require debrief behavior in call prompt rules', () => {
    expect(instructions).toContain('Debrief format: 1 sentence "this was a simulation", 2-3 red flags, 1 correct next step.');
    expect(instructions).toContain('When limit reached: do full debrief + goodbye');
    expect(instructions).toContain('After debrief: say one goodbye, then STOP.');
  });

  it('should include updated post-initiation user-facing success messaging', () => {
    expect(instructions).toContain('Call started. The recipient is being called now.');
    expect(instructions).toContain('The transcript will appear here after the call ends.');
  });

  it('should enforce exact decision order for caller-number selection branches', () => {
    const noNumbersIndex = instructions.indexOf('If NO numbers are available');
    const oneNumberIndex = instructions.indexOf('Else if only ONE number is available');
    const countryCodeIndex = instructions.indexOf('Else if one or more numbers match the target country code');
    const manualIndex = instructions.indexOf('Else: present the numbered caller list and ask the user to choose');

    expect(noNumbersIndex).toBeGreaterThan(-1);
    expect(oneNumberIndex).toBeGreaterThan(-1);
    expect(countryCodeIndex).toBeGreaterThan(-1);
    expect(manualIndex).toBeGreaterThan(-1);
    expect(noNumbersIndex).toBeLessThan(oneNumberIndex);
    expect(oneNumberIndex).toBeLessThan(countryCodeIndex);
    expect(countryCodeIndex).toBeLessThan(manualIndex);
  });

  it('should require all six summary fields before asking call-start confirmation', () => {
    expect(instructions).toContain('{Localized: "Persona"}');
    expect(instructions).toContain('{Localized: "Recipient"}');
    expect(instructions).toContain('{Localized: "Recipient Number"}');
    expect(instructions).toContain('{Localized: "Pretext"}');
    expect(instructions).toContain('{Localized: "Caller ID"}');
    expect(instructions).toContain('{Localized: "Language"}');
    expect(instructions).toContain('Before any call-initiation confirmation question, you MUST output the full summary block above with all 6 list items.');
  });

  it('should enforce getUserInfo contact lookup with skipAnalysis true', () => {
    expect(instructions).toContain('skipAnalysis');
    expect(instructions).toContain('MUST be `true`');
    expect(instructions).toContain('NEVER call getUserInfo without skipAnalysis=true');
  });

  it('should enforce E.164 phone number validation in state flow', () => {
    expect(instructions).toContain('Phone number MUST be in E.164 format');
    expect(instructions).toContain('starts with +');
    expect(instructions).toContain('attempt to normalize it and confirm with the user');
  });

  it('should require pre-call validation against explicit post-summary confirmation', () => {
    expect(instructions).toContain("Confirm the user's CURRENT message expresses explicit confirmation intent");
    expect(instructions).toContain('Do NOT try to validate the previous assistant turn');
    expect(instructions).toContain('must never trigger call initiation');
  });

  it('should include hard stop rule when prompt or firstMessage is missing', () => {
    expect(instructions).toContain('If prompt or firstMessage is missing or empty, **STOP. DO NOT call the tool.**');
    expect(instructions).toContain('Build the missing piece first');
  });

  it('should define debrief triggers for refuse, detect, comply, and time/turn limit', () => {
    expect(instructions).toContain('At count 3: STOP and debrief');
    expect(instructions).toContain('If target DETECTS the vishing');
    expect(instructions).toContain('then debrief and end call');
    expect(instructions).toContain('If target COMPLIES');
    expect(instructions).toContain('When limit reached: do full debrief + goodbye');
  });

  it('should keep enterprise-safe messaging and no-tech-jargon requirements', () => {
    expect(instructions).toContain('No Tech Jargon');
    expect(instructions).toContain('Hide model names, providers, tool IDs, API details');
    expect(instructions).toContain('Messaging Guidelines (Enterprise-Safe)');
  });

  it('should have exactly 4 tools', () => {
    expect(Object.keys(tools)).toHaveLength(4);
  });

  it('should include vishing-specific language rules (Do NOT mix)', () => {
    expect(instructions).toContain('Do NOT mix languages');
    expect(instructions).toContain('transitions, lists, questions, confirmations');
  });

  it('should have substantial instructions', () => {
    expect(instructions.length).toBeGreaterThan(3000);
  });

  it('should include CALL LANGUAGE for voice content', () => {
    expect(instructions).toContain('CALL');
    expect(instructions).toContain('Language Rules');
  });
});
