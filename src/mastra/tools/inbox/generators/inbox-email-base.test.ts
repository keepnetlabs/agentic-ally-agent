import { describe, it, expect } from 'vitest';
import { buildInboxEmailBaseSystem } from './inbox-email-base';

/**
 * Test suite for Inbox Email Base System Prompt Builder
 * Tests system prompt generation for email creation
 */
describe('Inbox Email Base System', () => {
  describe('buildInboxEmailBaseSystem', () => {
    it('should generate a system prompt string', () => {
      const prompt = buildInboxEmailBaseSystem(
        'Phishing Prevention',
        'en',
        'Security',
        'Email Threats',
        'intermediate'
      );
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include language code in output', () => {
      const prompt = buildInboxEmailBaseSystem(
        'Phishing Prevention',
        'tr',
        'Security',
        'Email Threats',
        'intermediate'
      );
      expect(prompt).toContain('tr');
    });

    it('should support English language', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('en');
      expect(prompt).toContain('LANGUAGE CONSISTENCY');
    });

    it('should support Turkish language', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'tr', 'Category', 'Risk', 'level');
      expect(prompt).toContain('tr');
    });

    it('should support German language', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'de', 'Category', 'Risk', 'level');
      expect(prompt).toContain('de');
    });

    it('should include topic context', () => {
      const topic = 'Ransomware Prevention';
      const prompt = buildInboxEmailBaseSystem(topic, 'en', 'Security', 'Malware', 'intermediate');
      expect(prompt).toContain(topic);
      expect(prompt).toContain('TOPIC CONTEXT:');
    });

    it('should include language consistency warnings', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('LANGUAGE CONSISTENCY - MANDATORY');
      expect(prompt).toContain('OUTPUT: en ONLY');
    });

    it('should include critical logic for phishing emails', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('CRITICAL LOGIC:');
      expect(prompt).toContain('isPhishing=true');
      expect(prompt).toContain('isPhishing=false');
    });

    it('should include sender diversity requirements', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('SENDER DIVERSITY (CRITICAL)');
      expect(prompt).toContain('NEVER reuse same department');
    });

    it('should include phishing tactics for security topics', () => {
      const prompt = buildInboxEmailBaseSystem('Phishing Prevention', 'en', 'Security', 'Email', 'intermediate');
      expect(prompt).toContain('account verification');
      expect(prompt).toContain('password resets');
    });

    it('should include malware context for malware topics', () => {
      const prompt = buildInboxEmailBaseSystem('Malware Prevention', 'en', 'Security', 'Malware', 'intermediate');
      expect(prompt).toContain('software updates');
      expect(prompt).toContain('file downloads');
    });

    it('should include QR code context for quishing topics', () => {
      const prompt = buildInboxEmailBaseSystem('QR Code Phishing', 'en', 'Security', 'Phishing', 'intermediate');
      expect(prompt).toContain('QR code');
      expect(prompt).toContain('scan QR code');
      expect(prompt).toContain('imagedelivery.net');
    });

    it('should include vishing context for voice phishing topics', () => {
      const prompt = buildInboxEmailBaseSystem('Vishing Prevention', 'en', 'Security', 'Phishing', 'intermediate');
      expect(prompt).toContain('video conference');
      expect(prompt).toContain('meeting invitations');
    });

    it('should include deepfake context for deepfake topics', () => {
      const prompt = buildInboxEmailBaseSystem('Deepfake Detection', 'en', 'Security', 'Deepfake', 'intermediate');
      expect(prompt).toContain('video messages');
      expect(prompt).toContain('video calls');
    });

    it('should include styling requirements', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('STYLING:');
      expect(prompt).toContain('text-[#1C1C1E]');
      expect(prompt).toContain('dark:text-[#F2F2F7]');
    });

    it('should include HTML validation rules', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('CRITICAL HTML VALIDATION');
      expect(prompt).toContain('properly closed');
    });

    it('should include attachment requirements', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('ATTACHMENTS:');
      expect(prompt).toContain('Maximum 1 attachment');
      expect(prompt).toContain('REALISTIC DOCUMENT PREVIEW');
    });

    it('should include topic-specific attachment content', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('TOPIC-SPECIFIC ATTACHMENT CONTENT');
      expect(prompt).toContain('INVOICE/PAYMENT');
      expect(prompt).toContain('PASSWORD/AUTH');
      expect(prompt).toContain('CONTRACT/AGREEMENT');
    });

    it('should include exact format specification', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('EXACT FORMAT');
      expect(prompt).toContain('"id":');
      expect(prompt).toContain('"sender":');
      expect(prompt).toContain('"subject":');
      expect(prompt).toContain('"isPhishing":');
    });

    it('should include warnings about security terms', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('NEVER mention "security", "phishing", "training"');
    });

    it('should include timestamp naturalness requirements', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('MUST use different timestamp');
      expect(prompt).toContain('written naturally');
    });

    it('should handle empty strings gracefully', () => {
      const prompt = buildInboxEmailBaseSystem('', '', '', '', '');
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('should handle special characters in topic', () => {
      const prompt = buildInboxEmailBaseSystem('SQL & XSS (OWASP)', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('SQL & XSS');
    });

    it('should handle Unicode characters in topic', () => {
      const prompt = buildInboxEmailBaseSystem('Phishing Prävention', 'de', 'Category', 'Risk', 'level');
      expect(prompt).toContain('Phishing Prävention');
    });

    it('should include all required email fields in format', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      const requiredFields = [
        '"id"',
        '"sender"',
        '"subject"',
        '"preview"',
        '"timestamp"',
        '"isPhishing"',
        '"content"',
        '"headers"',
        '"difficulty"',
      ];
      requiredFields.forEach(field => {
        expect(prompt).toContain(field);
      });
    });

    it('should include header requirements', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('"headers"');
      expect(prompt).toContain('Return-Path');
      expect(prompt).toContain('SPF');
      expect(prompt).toContain('DMARC');
    });

    it('should include difficulty levels', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('EASY');
      expect(prompt).toContain('MEDIUM');
      expect(prompt).toContain('HARD');
    });

    it('should warn against using topic name in content', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('NEVER use the topic name literally');
      expect(prompt).toContain('WRONG:');
      expect(prompt).toContain('RIGHT:');
    });

    it('should include attachment format specifications', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('ATTACHMENT FORMAT:');
      expect(prompt).toContain('PDF/DOC');
      expect(prompt).toContain('XLSX');
    });

    it('should include file type options', () => {
      const prompt = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt).toContain('pdf');
      expect(prompt).toContain('doc');
      expect(prompt).toContain('xlsx');
      expect(prompt).toContain('jpg');
      expect(prompt).toContain('png');
      expect(prompt).toContain('zip');
    });

    it('should be consistent across multiple calls with same params', () => {
      const prompt1 = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      const prompt2 = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      expect(prompt1).toBe(prompt2);
    });

    it('should differ when language changes', () => {
      const promptEn = buildInboxEmailBaseSystem('Topic', 'en', 'Category', 'Risk', 'level');
      const promptTr = buildInboxEmailBaseSystem('Topic', 'tr', 'Category', 'Risk', 'level');
      expect(promptEn).not.toBe(promptTr);
      expect(promptEn).toContain('en');
      expect(promptTr).toContain('tr');
    });

    it('should differ when topic changes', () => {
      const prompt1 = buildInboxEmailBaseSystem('Topic A', 'en', 'Category', 'Risk', 'level');
      const prompt2 = buildInboxEmailBaseSystem('Topic B', 'en', 'Category', 'Risk', 'level');
      expect(prompt1).not.toBe(prompt2);
    });
  });
});
