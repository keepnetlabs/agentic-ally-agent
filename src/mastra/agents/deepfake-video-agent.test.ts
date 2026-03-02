import { describe, it, expect, vi } from 'vitest';
import { deepfakeVideoAgent } from './deepfake-video-agent';
import { AGENT_NAMES, AGENT_IDS } from '../constants';

vi.mock('../tools/deepfake', () => ({
  listHeyGenAvatarsTool: { id: 'list-heygen-avatars' },
  listHeyGenVoicesTool: { id: 'list-heygen-voices' },
  generateDeepfakeVideoTool: { id: 'generate-deepfake-video' },
}));

vi.mock('../tools/analysis', () => ({
  reasoningTool: { id: 'show-reasoning' },
}));

vi.mock('../model-providers', () => ({
  getDefaultAgentModel: vi.fn().mockReturnValue({ id: 'default-model' }),
}));

describe('deepfakeVideoAgent', () => {
  const instructions = deepfakeVideoAgent.instructions;

  describe('Basic Configuration', () => {
    it('should be defined', () => {
      expect(deepfakeVideoAgent).toBeDefined();
    });

    it('should have correct id and name', () => {
      expect(deepfakeVideoAgent.id).toBe(AGENT_IDS.DEEPFAKE_VIDEO);
      expect(deepfakeVideoAgent.name).toBe(AGENT_NAMES.DEEPFAKE_VIDEO);
    });

    it('should have tools configured', () => {
      expect(deepfakeVideoAgent.tools).toBeDefined();
      expect(Object.keys(deepfakeVideoAgent.tools)).toContain('listHeyGenAvatars');
      expect(Object.keys(deepfakeVideoAgent.tools)).toContain('listHeyGenVoices');
      expect(Object.keys(deepfakeVideoAgent.tools)).toContain('generateDeepfakeVideo');
      expect(Object.keys(deepfakeVideoAgent.tools)).toContain('showReasoning');
    });

    it('should have exactly 4 tools', () => {
      expect(Object.keys(deepfakeVideoAgent.tools)).toHaveLength(4);
    });

    it('should have model configured', () => {
      expect(deepfakeVideoAgent.model).toBeDefined();
    });
  });

  describe('6-State Machine', () => {
    it('should define all 6 states', () => {
      expect(instructions).toContain('STATE 1');
      expect(instructions).toContain('STATE 2');
      expect(instructions).toContain('STATE 3');
      expect(instructions).toContain('STATE 4');
      expect(instructions).toContain('STATE 5');
      expect(instructions).toContain('STATE 6');
    });

    it('should have Scenario Collection state', () => {
      expect(instructions).toContain('Scenario Collection');
      expect(instructions).toContain('Persona/Role');
      expect(instructions).toContain('Video Language');
    });

    it('should have Avatar Selection state', () => {
      expect(instructions).toContain('Avatar Selection');
      expect(instructions).toContain('listHeyGenAvatars');
    });

    it('should have Voice Selection state', () => {
      expect(instructions).toContain('Voice Selection');
      expect(instructions).toContain('listHeyGenVoices');
    });

    it('should have Summary & Confirmation state', () => {
      expect(instructions).toContain('Summary & Confirmation');
      expect(instructions).toContain('Deepfake Video Summary');
    });

    it('should have Script Preview & Approval state', () => {
      expect(instructions).toContain('Script Preview & Approval');
      expect(instructions).toContain('Video Script');
    });

    it('should have Video Generation state', () => {
      expect(instructions).toContain('Video Generation');
      expect(instructions).toContain('generateDeepfakeVideo');
    });
  });

  describe('Consistency Contract', () => {
    it('should enforce avatar/voice selection is never approval', () => {
      expect(instructions).toContain('Avatar/voice selection is NEVER video generation approval');
    });

    it('should require both summary and script confirmation', () => {
      expect(instructions).toContain('explicit user confirmation of the summary AND the script');
    });

    it('should define rollback rule for late changes', () => {
      expect(instructions).toContain('return to the relevant state');
      expect(instructions).toContain('re-show summary + script');
    });
  });

  describe('Safety & Privacy', () => {
    it('should have safety rules', () => {
      expect(instructions).toContain('Global Rules');
      expect(instructions).toContain('Safety');
    });

    it('should accept simulation scenario names', () => {
      expect(instructions).toContain('CEO Fraud');
      expect(instructions).toContain('Executive Impersonation');
      expect(instructions).toContain('IT Support Scam');
    });

    it('should prohibit exposing real names', () => {
      expect(instructions).toContain('Privacy');
      expect(instructions).toContain('NEVER expose real names');
    });
  });

  describe('Language Rules', () => {
    it('should have language rules section', () => {
      expect(instructions).toContain('Language Rules');
      expect(instructions).toContain('INTERACTION LANGUAGE');
      expect(instructions).toContain('VIDEO SCRIPT');
    });

    it('should require matching user message language', () => {
      expect(instructions).toContain("match the user's CURRENT message language");
    });
  });

  describe('Script Rules', () => {
    it('should define script structure (Opening, Body, Closing)', () => {
      expect(instructions).toContain('Opening');
      expect(instructions).toContain('Body');
      expect(instructions).toContain('Closing');
    });

    it('should prohibit stage directions', () => {
      expect(instructions).toContain('[pause]');
      expect(instructions).toContain('100% spoken words');
    });

    it('should define script length limits', () => {
      expect(instructions).toContain('3 minutes');
      expect(instructions).toContain('30–350 words');
    });
  });

  describe('Quality Gate', () => {
    it('should have Checkpoint A and B', () => {
      expect(instructions).toContain('Checkpoint A');
      expect(instructions).toContain('Checkpoint B');
    });

    it('should require approval chain check', () => {
      expect(instructions).toContain('BOTH approvals received');
      expect(instructions).toContain('Summary approved in STATE 4');
      expect(instructions).toContain('Script approved in STATE 5');
    });
  });

  describe('Tool References', () => {
    it('should reference showReasoning (not show_reasoning)', () => {
      expect(instructions).toContain('showReasoning');
      expect(instructions).not.toContain('show_reasoning');
    });

    it('should require avatar_id from tool response', () => {
      expect(instructions).toContain('avatar_id');
      expect(instructions).toContain('Do NOT pass the display name or index');
    });

    it('should require voice_id and emotion_support', () => {
      expect(instructions).toContain('voice_id');
      expect(instructions).toContain('emotion_support');
    });
  });

  describe('Messaging Guidelines', () => {
    it('should include blacklist words', () => {
      expect(instructions).toContain('NEVER use');
    });
  });

  describe('STATE 4 Question', () => {
    it('should ask for confirmation before script (not direct generation)', () => {
      expect(instructions).toContain('Does this look correct?');
      expect(instructions).toContain('write the script next');
    });
  });

  describe('Derived Parameters', () => {
    it('should have Emotion matrix', () => {
      expect(instructions).toContain('Emotion');
      expect(instructions).toContain('Persona');
      expect(instructions).toContain('Urgency');
    });

    it('should have Speed mapping', () => {
      expect(instructions).toContain('0.9');
      expect(instructions).toContain('1.0');
      expect(instructions).toContain('1.15');
    });

    it('should have Locale mapping', () => {
      expect(instructions).toContain('tr-TR');
      expect(instructions).toContain('en-US');
    });
  });
});
