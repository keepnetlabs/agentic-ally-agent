/**
 * Unit tests for constants module
 * Covers KEY_TEMPLATES, RETRY, TRANSLATION_CONFIG, LANGUAGE, AGENT_NAMES, AGENT_IDS,
 * MESSAGING_GUIDELINES, PROMPT_ANALYSIS, MICROLEARNING, ERROR_CODES
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CLOUDFLARE_KV,
  RETRY,
  TRANSLATION_CONFIG,
  LANGUAGE,
  AGENT_NAMES,
  AGENT_IDS,
  MESSAGING_GUIDELINES_PROMPT_FRAGMENT,
  PROMPT_ANALYSIS,
  MICROLEARNING,
  ERROR_CODES,
  TRAINING_LEVELS,
  DEFAULT_TRAINING_LEVEL,
  PHISHING,
  SMISHING,
  ORCHESTRATOR_CONFIRMATION_EXAMPLES,
  AUTONOMOUS_DEFAULTS,
} from './constants';

describe('constants', () => {
  describe('CLOUDFLARE_KV.KEY_TEMPLATES', () => {
    it('should generate base key for microlearning', () => {
      expect(CLOUDFLARE_KV.KEY_TEMPLATES.base('ml-123')).toBe('ml:ml-123:base');
    });

    it('should generate language key', () => {
      expect(CLOUDFLARE_KV.KEY_TEMPLATES.language('ml-456', 'en-gb')).toBe('ml:ml-456:lang:en-gb');
    });

    it('should generate inbox key with department and language', () => {
      expect(CLOUDFLARE_KV.KEY_TEMPLATES.inbox('ml-789', 'IT', 'tr-tr')).toBe(
        'ml:ml-789:inbox:IT:tr-tr'
      );
    });

    it('should generate health check key with timestamp', () => {
      const before = Date.now();
      const key = CLOUDFLARE_KV.KEY_TEMPLATES.healthCheck();
      const after = Date.now();
      expect(key).toMatch(/^health_check_\d+$/);
      const ts = parseInt(key.replace('health_check_', ''), 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after + 1);
    });
  });

  describe('RETRY.getBackoffDelay', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return value in range [0, cappedDelay] when jitter enabled', () => {
      const delay = RETRY.getBackoffDelay(0);
      const baseDelay = Math.pow(2, 0) * RETRY.BASE_DELAY_MS;
      const cappedDelay = Math.min(baseDelay, RETRY.MAX_DELAY_MS);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(cappedDelay);
    });

    it('should increase base delay exponentially with attempt', () => {
      const delay0 = RETRY.getBackoffDelay(0);
      const delay1 = RETRY.getBackoffDelay(1);
      const delay2 = RETRY.getBackoffDelay(2);

      expect(delay0).toBeLessThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(4000);
    });

    it('should cap delay at MAX_DELAY_MS', () => {
      const delay = RETRY.getBackoffDelay(20); // 2^20 * 1000 >> MAX_DELAY_MS
      expect(delay).toBeLessThanOrEqual(RETRY.MAX_DELAY_MS);
    });
  });

  describe('TRANSLATION_CONFIG', () => {
    it('should have expected chunk size constants', () => {
      expect(TRANSLATION_CONFIG.MAX_JSON_CHARS).toBeGreaterThan(0);
      expect(TRANSLATION_CONFIG.INITIAL_CHUNK_SIZE).toBeGreaterThan(TRANSLATION_CONFIG.MIN_CHUNK_SIZE);
      expect(TRANSLATION_CONFIG.SIZE_REDUCTION_FACTOR).toBeLessThan(1);
    });
  });

  describe('LANGUAGE', () => {
    it('should have default source and department', () => {
      expect(LANGUAGE.DEFAULT_SOURCE).toBe('en-gb');
      expect(LANGUAGE.DEFAULT_DEPARTMENT).toBe('All');
    });
  });

  describe('AGENT_NAMES', () => {
    it('should have all expected agent names', () => {
      expect(AGENT_NAMES.PHISHING).toBe('phishingEmailAssistant');
      expect(AGENT_NAMES.SMISHING).toBe('smishingSmsAssistant');
      expect(AGENT_NAMES.MICROLEARNING).toBe('microlearningAgent');
      expect(AGENT_NAMES.USER_INFO).toBe('userInfoAssistant');
      expect(AGENT_NAMES.POLICY_SUMMARY).toBe('policySummaryAssistant');
      expect(AGENT_NAMES.VISHING_CALL).toBe('vishingCallAssistant');
      expect(AGENT_NAMES.ORCHESTRATOR).toBe('orchestrator');
      expect(AGENT_NAMES.EMAIL_IR_ANALYST).toBe('emailIrAnalyst');
      expect(AGENT_NAMES.DEEPFAKE_VIDEO).toBe('deepfakeVideoAssistant');
    });

    it('should have 9 agent name entries', () => {
      expect(Object.keys(AGENT_NAMES)).toHaveLength(9);
    });
  });

  describe('AGENT_IDS', () => {
    it('should have matching IDs for each agent name', () => {
      expect(AGENT_IDS.PHISHING).toBe('phishing-email-agent');
      expect(AGENT_IDS.SMISHING).toBe('smishing-sms-agent');
      expect(AGENT_IDS.MICROLEARNING).toBe('microlearning-agent');
      expect(AGENT_IDS.DEEPFAKE_VIDEO).toBe('deepfake-video-agent');
    });

    it('should have 9 agent ID entries', () => {
      expect(Object.keys(AGENT_IDS)).toHaveLength(9);
    });
  });

  describe('MESSAGING_GUIDELINES_PROMPT_FRAGMENT', () => {
    it('should contain NEVER use and blacklist words', () => {
      expect(MESSAGING_GUIDELINES_PROMPT_FRAGMENT).toContain('NEVER use');
      expect(MESSAGING_GUIDELINES_PROMPT_FRAGMENT).toContain('data');
      expect(MESSAGING_GUIDELINES_PROMPT_FRAGMENT).toContain('anonymized');
      expect(MESSAGING_GUIDELINES_PROMPT_FRAGMENT).toContain('personal data');
    });
  });

  describe('PROMPT_ANALYSIS', () => {
    it('should have valid input constraints', () => {
      expect(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH).toBe(5);
      expect(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH).toBe(10000);
      expect(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH).toBe(15000);
    });

    it('should have LANGUAGE_CODE_REGEX that matches valid codes', () => {
      expect('en-gb').toMatch(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX);
      expect('tr-tr').toMatch(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX);
      expect('en').toMatch(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX);
    });

    it('should have DIFFICULTY_LEVELS', () => {
      expect(PROMPT_ANALYSIS.DIFFICULTY_LEVELS).toContain('Beginner');
      expect(PROMPT_ANALYSIS.DIFFICULTY_LEVELS).toContain('Advanced');
    });
  });

  describe('MICROLEARNING', () => {
    it('should have scene configuration', () => {
      expect(MICROLEARNING.SCENE_COUNT).toBe(8);
      expect(MICROLEARNING.SCENE_TYPES).toContain('intro');
      expect(MICROLEARNING.SCENE_TYPES).toContain('quiz');
    });

    it('should have content constraints', () => {
      expect(MICROLEARNING.MAX_HIGHLIGHTS).toBe(5);
      expect(MICROLEARNING.MAX_LEARNING_OBJECTIVES).toBe(5);
      expect(MICROLEARNING.MIN_LEARNING_OBJECTIVES).toBe(1);
    });
  });

  describe('TRAINING_LEVELS', () => {
    it('should have expected levels', () => {
      expect(TRAINING_LEVELS).toContain('Beginner');
      expect(TRAINING_LEVELS).toContain('Intermediate');
      expect(TRAINING_LEVELS).toContain('Advanced');
    });

    it('should have default level Intermediate', () => {
      expect(DEFAULT_TRAINING_LEVEL).toBe('Intermediate');
    });
  });

  describe('PHISHING', () => {
    it('should have difficulty levels and workflow', () => {
      expect(PHISHING.DIFFICULTY_LEVELS).toContain('Easy');
      expect(PHISHING.WORKFLOW_TYPE).toBe('create-phishing');
    });
  });

  describe('SMISHING', () => {
    it('should have difficulty levels', () => {
      expect(SMISHING.DIFFICULTY_LEVELS).toContain('Medium');
    });
  });

  describe('ERROR_CODES', () => {
    it('should have AUTH error codes', () => {
      expect(ERROR_CODES.AUTH_TOKEN_MISSING).toBe('ERR_AUTH_001');
      expect(ERROR_CODES.AUTH_TOKEN_INVALID).toBe('ERR_AUTH_002');
    });

    it('should have VAL error codes', () => {
      expect(ERROR_CODES.VALIDATION_INPUT).toBe('ERR_VAL_001');
    });

    it('should have AI error codes', () => {
      expect(ERROR_CODES.AI_GENERATION_FAILED).toBe('ERR_AI_001');
      expect(ERROR_CODES.AI_TIMEOUT).toBe('ERR_AI_003');
    });
  });

  describe('ORCHESTRATOR_CONFIRMATION_EXAMPLES', () => {
    it('should include Yes and Proceed', () => {
      expect(ORCHESTRATOR_CONFIRMATION_EXAMPLES).toContain('Yes');
      expect(ORCHESTRATOR_CONFIRMATION_EXAMPLES).toContain('Proceed');
    });

    it('should include Turkish confirmations', () => {
      expect(ORCHESTRATOR_CONFIRMATION_EXAMPLES).toContain('Oluştur');
      expect(ORCHESTRATOR_CONFIRMATION_EXAMPLES).toContain('Tamam');
    });

    it('should include numeric options', () => {
      expect(ORCHESTRATOR_CONFIRMATION_EXAMPLES).toContain('1');
    });
  });

  describe('AUTONOMOUS_DEFAULTS', () => {
    it('should have phishing and training topics', () => {
      expect(AUTONOMOUS_DEFAULTS.PHISHING_TOPIC).toBe('Phishing & Email Security');
      expect(AUTONOMOUS_DEFAULTS.TRAINING_TOPIC).toBe('Security Awareness');
    });
  });
});
