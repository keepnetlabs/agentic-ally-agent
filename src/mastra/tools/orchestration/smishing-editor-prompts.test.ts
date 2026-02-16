import { describe, it, expect } from 'vitest';
import {
  getSmishingSmsSystemPrompt,
  getSmishingSmsUserPrompt,
  getSmishingLandingPageSystemPrompt,
  getSmishingLandingPageUserPrompt,
} from './smishing-editor-prompts';

describe('Smishing Editor Prompts', () => {
  describe('getSmishingSmsSystemPrompt', () => {
    it('should generate SMS system prompt for edit mode', () => {
      const prompt = getSmishingSmsSystemPrompt('edit');
      expect(prompt).toContain('editing an SMS template');
      expect(prompt).toContain('CYBERSECURITY TRAINING');
      expect(prompt).toContain('PRESERVE placeholder tags');
      expect(prompt).toContain('{PHISHINGURL}');
      expect(prompt).toContain('160 chars');
      expect(prompt).toContain('2-4 messages');
      expect(prompt).toContain('EDIT MODE');
    });

    it('should generate SMS system prompt for translate mode', () => {
      const prompt = getSmishingSmsSystemPrompt('translate');
      expect(prompt).toContain('editing an SMS template');
      expect(prompt).toContain('TRANSLATE MODE');
      expect(prompt).toContain('Only translate visible text');
      expect(prompt).toContain('PRESERVE placeholder tags');
      expect(prompt).toContain('JSON ONLY');
    });

    it('should enforce critical safety rules', () => {
      const prompt = getSmishingSmsSystemPrompt('edit');
      expect(prompt).toContain('PRESERVE placeholder tags');
      expect(prompt).toContain('Do NOT add markdown');
      expect(prompt).toContain('Do NOT add real links');
      expect(prompt).toContain('only use {PHISHINGURL}');
    });

    it('should specify JSON output format', () => {
      const prompt = getSmishingSmsSystemPrompt('edit');
      expect(prompt).toContain('OUTPUT FORMAT - JSON ONLY');
      expect(prompt).toContain('{"messages"');
      expect(prompt).toContain('"summary"');
    });

    it('should differ between translate and edit modes', () => {
      const editPrompt = getSmishingSmsSystemPrompt('edit');
      const translatePrompt = getSmishingSmsSystemPrompt('translate');
      expect(editPrompt).toContain('EDIT MODE');
      expect(translatePrompt).toContain('TRANSLATE MODE');
      expect(editPrompt).not.toContain('Only translate');
      expect(translatePrompt).toContain('Only translate');
    });
  });

  describe('getSmishingSmsUserPrompt', () => {
    it('should format messages with numbering', () => {
      const input = {
        messages: ['First message', 'Second message', 'Third message'],
      };
      const prompt = getSmishingSmsUserPrompt(input, 'Make it urgent');
      expect(prompt).toContain('1. First message');
      expect(prompt).toContain('2. Second message');
      expect(prompt).toContain('3. Third message');
    });

    it('should include user instruction', () => {
      const input = { messages: ['Test message'] };
      const instruction = 'Change the tone to friendly';
      const prompt = getSmishingSmsUserPrompt(input, instruction);
      expect(prompt).toContain('USER INSTRUCTION');
      expect(prompt).toContain(instruction);
    });

    it('should escape special characters in instruction', () => {
      const input = { messages: ['Test'] };
      const escapedInstruction = 'Add quotes "like this"';
      const prompt = getSmishingSmsUserPrompt(input, escapedInstruction);
      expect(prompt).toContain(escapedInstruction);
    });

    it('should request JSON only output', () => {
      const input = { messages: ['Test'] };
      const prompt = getSmishingSmsUserPrompt(input, 'edit');
      expect(prompt).toContain('return JSON only');
    });

    it('should include CURRENT SMS section', () => {
      const input = { messages: ['Message'] };
      const prompt = getSmishingSmsUserPrompt(input, 'test');
      expect(prompt).toContain('CURRENT SMS');
      expect(prompt).toContain('Messages:');
    });

    it('should handle single message', () => {
      const input = { messages: ['Solo message'] };
      const prompt = getSmishingSmsUserPrompt(input, 'edit');
      expect(prompt).toContain('1. Solo message');
    });

    it('should handle multiple messages', () => {
      const input = {
        messages: Array(10)
          .fill(null)
          .map((_, i) => `Message ${i + 1}`),
      };
      const prompt = getSmishingSmsUserPrompt(input, 'edit');
      expect(prompt).toContain('1. Message 1');
      expect(prompt).toContain('10. Message 10');
    });

    it('should preserve message content exactly', () => {
      const input = {
        messages: ['Click here {PHISHINGURL}', 'Verify account now!', 'Urgent: {PHISHINGURL}'],
      };
      const prompt = getSmishingSmsUserPrompt(input, 'edit');
      expect(prompt).toContain('Click here {PHISHINGURL}');
      expect(prompt).toContain('Verify account now!');
      expect(prompt).toContain('Urgent: {PHISHINGURL}');
    });
  });

  describe('getSmishingLandingPageSystemPrompt', () => {
    it('should generate landing page system prompt for edit mode', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('editing a smishing landing page');
      expect(prompt).toContain('CYBERSECURITY TRAINING');
      expect(prompt).toContain('PRESERVE HTML structure');
      expect(prompt).toContain('EDIT page content');
    });

    it('should generate landing page system prompt for translate mode', () => {
      const prompt = getSmishingLandingPageSystemPrompt('translate');
      expect(prompt).toContain('TRANSLATE MODE');
      expect(prompt).toContain('Only translate visible text');
      expect(prompt).toContain('preserve existing style');
    });

    it('should enforce HTML preservation rules', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('PRESERVE HTML structure');
      expect(prompt).toContain('PRESERVE all form elements');
      expect(prompt).toContain('{PHISHINGURL}');
      expect(prompt).toContain('Do NOT replace with real URLs');
    });

    it('should specify single quote requirement', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('SINGLE quotes');
      expect(prompt).toContain("style='...'");
      expect(prompt).toContain("class='...'");
    });

    it('should include logo handling rules', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('remove logo');
      expect(prompt).toContain('change logo');
      expect(prompt).toContain('REPLACE the src attribute');
      expect(prompt).toContain('DO NOT add a second img tag');
    });

    it('should forbid generated URLs', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('NEVER generate new URLs');
      expect(prompt).toContain('ONLY use image URLs provided');
    });

    it('should require complete HTML output', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('Return COMPLETE page HTML');
      expect(prompt).toContain('never empty or truncated');
    });

    it('should specify JSON output format', () => {
      const prompt = getSmishingLandingPageSystemPrompt('edit');
      expect(prompt).toContain('OUTPUT FORMAT - JSON ONLY');
      expect(prompt).toContain('{"type"');
      expect(prompt).toContain('"template"');
      expect(prompt).toContain('"edited"');
      expect(prompt).toContain('"summary"');
    });
  });

  describe('getSmishingLandingPageUserPrompt', () => {
    const validPage = {
      type: 'login',
      template: '<html><body><form action="{PHISHINGURL}"></form></body></html>',
    };

    it('should include page type', () => {
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', '');
      expect(prompt).toContain('CURRENT LANDING PAGE');
      expect(prompt).toContain('Type: login');
    });

    it('should include page template', () => {
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', '');
      expect(prompt).toContain('TEMPLATE:');
      expect(prompt).toContain(validPage.template);
    });

    it('should include user instruction', () => {
      const instruction = 'Change button color to red';
      const prompt = getSmishingLandingPageUserPrompt(validPage, instruction, '');
      expect(prompt).toContain('USER INSTRUCTION');
      expect(prompt).toContain(instruction);
    });

    it('should preserve PHISHINGURL in output requirement', () => {
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', '');
      expect(prompt).toContain('PRESERVE {PHISHINGURL}');
      expect(prompt).toContain('in all links');
    });

    it('should request JSON only output', () => {
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', '');
      expect(prompt).toContain('return JSON only');
    });

    it('should handle missing page type', () => {
      const page = { template: '<html></html>' };
      const prompt = getSmishingLandingPageUserPrompt(page as any, 'edit', '');
      expect(prompt).toContain('Type: unknown');
    });

    it('should handle missing template', () => {
      const page = { type: 'login' };
      const prompt = getSmishingLandingPageUserPrompt(page as any, 'edit', '');
      expect(prompt).toContain('Type: login');
      expect(prompt).toContain('TEMPLATE:');
    });

    it('should include brand context when provided', () => {
      const brandContext = 'Use logo URL: https://example.com/logo.png';
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', brandContext);
      expect(prompt).toContain(brandContext);
      expect(prompt).toContain('You MUST use the logo URL provided');
    });

    it('should omit brand context section when empty', () => {
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', '');
      // Should not have the "You MUST use" text without brand context
      expect(prompt).not.toContain('You MUST use the logo URL provided');
    });

    it('should handle complex brand context', () => {
      const brandContext = `Logo: https://example.com/logo.png
Primary Color: #FF0000
Secondary Color: #00FF00`;
      const prompt = getSmishingLandingPageUserPrompt(validPage, 'edit', brandContext);
      expect(prompt).toContain('Logo:');
      expect(prompt).toContain('#FF0000');
      expect(prompt).toContain('You MUST use the logo URL provided');
    });

    it('should escape instruction properly', () => {
      const instruction = 'Replace "login" with "verify"';
      const prompt = getSmishingLandingPageUserPrompt(validPage, instruction, '');
      expect(prompt).toContain(instruction);
    });
  });

  describe('Integration tests', () => {
    it('should generate consistent SMS edit workflow prompts', () => {
      const messages = ['Click here: {PHISHINGURL}', 'Verify now'];
      const systemPrompt = getSmishingSmsSystemPrompt('edit');
      const userPrompt = getSmishingSmsUserPrompt({ messages }, 'Make it more urgent');

      expect(systemPrompt).toContain('EDIT MODE');
      expect(userPrompt).toContain('1. Click here: {PHISHINGURL}');
      expect(userPrompt).toContain('2. Verify now');
      expect(userPrompt).toContain('Make it more urgent');
    });

    it('should generate consistent SMS translate workflow prompts', () => {
      const messages = ['Verify your account'];
      const systemPrompt = getSmishingSmsSystemPrompt('translate');
      const userPrompt = getSmishingSmsUserPrompt({ messages }, 'Translate to Turkish');

      expect(systemPrompt).toContain('TRANSLATE MODE');
      expect(systemPrompt).toContain('Only translate visible text');
      expect(userPrompt).toContain('Translate to Turkish');
    });

    it('should generate consistent landing page edit workflow prompts', () => {
      const page = { type: 'login', template: '<html><form></form></html>' };
      const systemPrompt = getSmishingLandingPageSystemPrompt('edit');
      const userPrompt = getSmishingLandingPageUserPrompt(page, 'Change colors', '');

      expect(systemPrompt).toContain('EDIT page content');
      expect(userPrompt).toContain('Type: login');
      expect(userPrompt).toContain('Change colors');
      expect(userPrompt).toContain('PRESERVE {PHISHINGURL}');
    });

    it('should handle complete landing page with branding', () => {
      const page = {
        type: 'login',
        template: '<html><img src="{OLD_LOGO}"/><form></form></html>',
      };
      const brandContext = 'Logo: https://brand.com/logo.png\nColor: #1234FF';
      const systemPrompt = getSmishingLandingPageSystemPrompt('edit');
      const userPrompt = getSmishingLandingPageUserPrompt(page, 'Update logo', brandContext);

      expect(systemPrompt).toContain('change logo');
      expect(userPrompt).toContain(brandContext);
      expect(userPrompt).toContain('You MUST use the logo URL');
      expect(userPrompt).toContain('Update logo');
    });
  });

  describe('Safety and constraint verification', () => {
    it('should always mention PHISHINGURL preservation', () => {
      const smsPrompt = getSmishingSmsSystemPrompt('edit');
      const lpPrompt = getSmishingLandingPageSystemPrompt('edit');

      expect(smsPrompt).toContain('{PHISHINGURL}');
      expect(lpPrompt).toContain('{PHISHINGURL}');
      expect(lpPrompt).toContain('Do NOT replace with real URLs');
    });

    it('should always emphasize training context', () => {
      const smsPrompt = getSmishingSmsSystemPrompt('edit');
      const lpPrompt = getSmishingLandingPageSystemPrompt('edit');

      expect(smsPrompt).toContain('TRAINING COMPANY');
      expect(lpPrompt).toContain('CYBERSECURITY TRAINING');
    });

    it('should never allow markdown in SMS', () => {
      const prompt = getSmishingSmsSystemPrompt('edit');
      expect(prompt).toContain('Do NOT add markdown');
    });

    it('should always require JSON output format', () => {
      const prompts = [
        getSmishingSmsSystemPrompt('edit'),
        getSmishingSmsSystemPrompt('translate'),
        getSmishingLandingPageSystemPrompt('edit'),
        getSmishingLandingPageSystemPrompt('translate'),
      ];

      prompts.forEach(prompt => {
        expect(prompt).toContain('JSON ONLY');
      });
    });
  });
});
