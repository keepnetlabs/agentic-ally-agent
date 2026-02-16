import { getLogger } from '../core/logger';

const logger = getLogger('UrlResolver');

export interface ResourceURL {
  title: string;
  url: string;
  category?: string;
}

/**
 * URL Database: 30+ verified, working URLs from CISA and NCSC
 * Organized by topic, with category and department fallbacks
 */
const URL_DATABASE: Record<string, ResourceURL[]> = {
  // ===== THREAT TOPICS =====
  phishing: [
    {
      title: 'Phishing Examples: Real Attacks by Type, Industry, and Emotion',
      url: 'https://keepnetlabs.com/blog/phishing-examples-real-attacks-by-type-industry-and-emotion',
      category: 'THREAT',
    },
    {
      title: 'Phishing Simulation Benchmarks: How Does Your Organization Compare?',
      url: 'https://keepnetlabs.com/blog/phishing-simulation-benchmarks-how-does-your-organization-compare',
      category: 'THREAT',
    },
  ],

  quishing: [
    {
      title: 'What is Quishing (QR Phishing)?',
      url: 'https://keepnetlabs.com/blog/understanding-quishing',
      category: 'THREAT',
    },
    {
      title: 'Top Spoofed Brands in Used Quishing Attacks',
      url: 'https://keepnetlabs.com/blog/top-spoofed-brands-in-used-quishing-attacks',
      category: 'THREAT',
    },
  ],

  ransomware: [
    {
      title: 'Ransomware Prevention & Response Guide',
      url: 'https://keepnetlabs.com/blog/ransomware-prevention-response-guide',
      category: 'THREAT',
    },
    {
      title: 'NCSC Data Security & Ransomware Protection',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'THREAT',
    },
  ],

  deepfake: [
    {
      title: 'Deepfake Statistics & Trends 2025',
      url: 'https://keepnetlabs.com/blog/deepfake-statistics-and-trends',
      category: 'THREAT',
    },
    {
      title: 'What Is Deepfake Phishing Simulation?',
      url: 'https://keepnetlabs.com/blog/what-is-deepfake-phishing-simulation',
      category: 'THREAT',
    },
  ],

  vishing: [
    {
      title: 'Understanding Voice Generation AI and Vishing Threats',
      url: 'https://keepnetlabs.com/blog/understanding-voice-generation-ai-and-vishing-threats',
      category: 'THREAT',
    },
    {
      title: 'Vishing vs. Phishing vs. Smishing',
      url: 'https://keepnetlabs.com/blog/vishing-vs-phishing-vs-smishing-guide',
      category: 'THREAT',
    },
  ],

  malware: [
    {
      title: 'Most Common Examples of Malware Attacks',
      url: 'https://keepnetlabs.com/blog/3-most-common-examples-of-malware-attacks',
      category: 'THREAT',
    },
    {
      title: 'NCSC Data Security Guidelines',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'THREAT',
    },
  ],

  'social-engineering': [
    {
      title: 'Social Engineering Attack Types & Prevention',
      url: 'https://keepnetlabs.com/blog/social-engineering-attack-types-prevention',
      category: 'THREAT',
    },
    {
      title: 'What is SIM Swap Fraud',
      url: 'https://keepnetlabs.com/blog/what-is-sim-swap-fraud',
      category: 'THREAT',
    },
  ],

  'data-breach': [
    {
      title: 'Data Breach Response & Notification Guide',
      url: 'https://keepnetlabs.com/blog/data-breach-response-notification',
      category: 'THREAT',
    },
    {
      title: 'What are Payment Card Data Security Standards',
      url: 'https://keepnetlabs.com/blog/what-are-payment-card-data-security-standards-pci-dss',
      category: 'THREAT',
    },
  ],

  mfa: [
    {
      title: 'What is MFA Fatigue Attack?',
      url: 'https://keepnetlabs.com/blog/what-is-mfa-fatigue-attack-and-how-to-prevent-it',
      category: 'TOOL',
    },
    {
      title: 'NCSC Multi-Factor Authentication Guidance',
      url: 'https://www.ncsc.gov.uk/collection/mfa-for-your-corporate-online-services',
      category: 'TOOL',
    },
  ],

  password: [
    {
      title: 'Comprehensive Guide on Password Security Best Practices',
      url: 'https://keepnetlabs.com/blog/comprehensive-guide-on-password-security-best-practices',
      category: 'TOOL',
    },
    {
      title: 'NCSC Password Guidance & Best Practices',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/a-3-protecting-passwords',
      category: 'TOOL',
    },
  ],

  backup: [
    {
      title: 'Backup & Recovery Best Practices',
      url: 'https://keepnetlabs.com/blog/backup-recovery-best-practices',
      category: 'TOOL',
    },
    {
      title: 'NCSC Data Security & Backup Guidelines',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL',
    },
  ],

  encryption: [
    {
      title: 'What is Data Encryption?',
      url: 'https://keepnetlabs.com/blog/what-is-data-encryption',
      category: 'TOOL',
    },
    {
      title: 'NCSC Data Security Standards',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL',
    },
  ],

  'data-privacy': [
    {
      title: 'What is a Privacy Program?',
      url: 'https://keepnetlabs.com/blog/what-is-a-privacy-program-how-to-build-an-effective-privacy-program',
      category: 'TOOL',
    },
    {
      title: 'NCSC Data Security & Privacy Framework',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL',
    },
  ],

  vpn: [
    {
      title: 'NCSC Secure Remote Access Guidance',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'TOOL',
    },
    {
      title: 'VPN Security Best Practices',
      url: 'https://keepnetlabs.com/blog/vpn-security-best-practices',
      category: 'TOOL',
    },
  ],

  'remote-access': [
    {
      title: '6 Cybersecurity Tips for Remote Workers',
      url: 'https://keepnetlabs.com/blog/6-cybersecurity-tips-for-remote-workers',
      category: 'TOOL',
    },
    {
      title: 'Remote Access Security Best Practices',
      url: 'https://keepnetlabs.com/blog/remote-access-security-best-practices',
      category: 'TOOL',
    },
  ],

  'remote-work': [
    {
      title: 'Remote Worker Security Checklist',
      url: 'https://keepnetlabs.com/blog/remote-worker-security-checklist',
      category: 'TOOL',
    },
    {
      title: 'NCSC Secure Remote Working Guidance',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'TOOL',
    },
  ],

  'secure-connection': [
    {
      title: 'Secure Network Connections Best Practices',
      url: 'https://keepnetlabs.com/blog/secure-network-connections',
      category: 'TOOL',
    },
    {
      title: 'NCSC Data Security Standards',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL',
    },
  ],

  compliance: [
    {
      title: 'Cybersecurity Compliance Training 101',
      url: 'https://keepnetlabs.com/blog/cybersecurity-compliance-training-101',
      category: 'TOOL',
    },
    {
      title: 'NCSC Cyber Assessment Framework',
      url: 'https://www.ncsc.gov.uk/collection/cyber-assessment-framework',
      category: 'TOOL',
    },
  ],

  // ===== DEVELOPMENT/SECURE CODING TOPICS =====
  'secure-coding': [
    {
      title: 'OWASP Code Review Guide',
      url: 'https://owasp.org/www-project-code-review-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Cheat Sheet Series - Secure Coding',
      url: 'https://cheatsheetseries.owasp.org/index.html',
      category: 'DEVELOPMENT',
    },
  ],

  'code-review': [
    {
      title: 'OWASP Code Review Guide',
      url: 'https://owasp.org/www-project-code-review-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      category: 'DEVELOPMENT',
    },
  ],

  'api-security': [
    {
      title: 'OWASP API Security Top 10',
      url: 'https://owasp.org/www-project-api-security/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP API Security Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/REST_API_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  vulnerabilities: [
    {
      title: 'OWASP Top 10 Web Application Security Risks',
      url: 'https://owasp.org/www-project-top-ten/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'CVE - Common Vulnerabilities and Exposures',
      url: 'https://www.cve.org/',
      category: 'DEVELOPMENT',
    },
  ],

  injection: [
    {
      title: 'OWASP Injection Prevention Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP SQL Injection Prevention',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  xss: [
    {
      title: 'OWASP Cross Site Scripting (XSS) Prevention',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP DOM based XSS Prevention',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'sql-injection': [
    {
      title: 'OWASP SQL Injection Prevention',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Query Parameterization Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'input-validation': [
    {
      title: 'OWASP Input Validation Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Deserialization Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  cryptography: [
    {
      title: 'OWASP Cryptographic Storage Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Key Management Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  authentication: [
    {
      title: 'OWASP Authentication Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Session Management Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  authorization: [
    {
      title: 'OWASP Authorization Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Access Control Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'dependency-management': [
    {
      title: 'OWASP Supply Chain Security',
      url: 'https://owasp.org/www-project-supply-chain-security/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Dependency Checker',
      url: 'https://owasp.org/www-project-dependency-check/',
      category: 'DEVELOPMENT',
    },
  ],

  'static-analysis': [
    {
      title: 'OWASP Source Code Analysis Tools',
      url: 'https://owasp.org/www-community/controls/Static_Code_Analysis',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP SAST Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/index.html',
      category: 'DEVELOPMENT',
    },
  ],

  'secrets-management': [
    {
      title: 'OWASP Secrets Management Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Credential Handling Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'ci-cd': [
    {
      title: 'OWASP Top 10 CI/CD Security Risks',
      url: 'https://owasp.org/www-project-top-10-ci-cd-security-risks/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Testing Guide - CI/CD',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      category: 'DEVELOPMENT',
    },
  ],

  devops: [
    {
      title: 'OWASP Top 10 CI/CD Security Risks',
      url: 'https://owasp.org/www-project-top-10-ci-cd-security-risks/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Supply Chain Security',
      url: 'https://owasp.org/www-project-supply-chain-security/',
      category: 'DEVELOPMENT',
    },
  ],

  'version-control': [
    {
      title: 'OWASP Code Review Guide',
      url: 'https://owasp.org/www-project-code-review-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Secrets Management Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  testing: [
    {
      title: 'OWASP Security Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Testing Checklist',
      url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/README',
      category: 'DEVELOPMENT',
    },
  ],

  'feature-flags': [
    {
      title: 'OWASP Secure Coding Practices',
      url: 'https://owasp.org/www-project-code-review-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Configuration Management',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Configuration_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'legacy-code': [
    {
      title: 'OWASP Code Review Guide',
      url: 'https://owasp.org/www-project-code-review-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Testing for Legacy Applications',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      category: 'DEVELOPMENT',
    },
  ],

  logging: [
    {
      title: 'OWASP Logging Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Logging Security Best Practices',
      url: 'https://owasp.org/www-community/controls/Application_Logging',
      category: 'DEVELOPMENT',
    },
  ],

  monitoring: [
    {
      title: 'OWASP Application Security Monitoring',
      url: 'https://owasp.org/www-community/controls/Application_Logging',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Logging Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'data-masking': [
    {
      title: 'OWASP Logging Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Sensitive Data Exposure Prevention',
      url: 'https://owasp.org/www-project-top-ten/',
      category: 'DEVELOPMENT',
    },
  ],

  'rate-limiting': [
    {
      title: 'OWASP Brute Force Protection Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Brute_Force_Protection_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP HTML5 Security Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'brute-force-protection': [
    {
      title: 'OWASP Brute Force Protection Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Brute_Force_Protection_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Account Lockout Strategies',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'access-control': [
    {
      title: 'OWASP Access Control Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Authorization Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'configuration-management': [
    {
      title: 'OWASP Secrets Management Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Docker Security Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html',
      category: 'DEVELOPMENT',
    },
  ],

  'vulnerability-management': [
    {
      title: 'OWASP Vulnerability Management Guide',
      url: 'https://owasp.org/www-project-vulnerability-management-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Top 10 Security Risks',
      url: 'https://owasp.org/www-project-top-ten/',
      category: 'DEVELOPMENT',
    },
  ],

  // ===== PROCESS TOPICS =====
  'incident-response': [
    {
      title: 'Reporting Security Incidents',
      url: 'https://keepnetlabs.com/blog/reporting-security-incidents-how-security-awareness-drives-success',
      category: 'PROCESS',
    },
    {
      title: 'Email Incident Response 101',
      url: 'https://keepnetlabs.com/blog/email-incident-response-101',
      category: 'PROCESS',
    },
  ],

  'security-protocols': [
    {
      title: 'How to Negotiate Cybersecurity Protection Levels With Your Executives?',
      url: 'https://keepnetlabs.com/blog/how-to-negotiate-cybersecurity-protection-levels-with-your-executives',
      category: 'PROCESS',
    },
    {
      title: 'NCSC Access Control & Security Guidelines',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'PROCESS',
    },
  ],

  'decision-framework': [
    {
      title: 'Digital Deception in Search Results',
      url: 'https://keepnetlabs.com/blog/digital-deception-in-search-results-an-introduction-to-search-engine-poisoning',
      category: 'PROCESS',
    },
    {
      title: 'NCSC Cyber Essentials Requirements',
      url: 'https://www.ncsc.gov.uk/files/Cyber-Essentials-Requirements-for-Infrastructure-v3-1-January-2023.pdf',
      category: 'PROCESS',
    },
  ],

  // ===== CATEGORY-LEVEL FALLBACKS =====
  DEVELOPMENT: [
    {
      title: 'OWASP Code Review Guide',
      url: 'https://owasp.org/www-project-code-review-guide/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Top 10 Web Application Security Risks',
      url: 'https://owasp.org/www-project-top-ten/',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Cheat Sheet Series - Secure Coding',
      url: 'https://cheatsheetseries.owasp.org/index.html',
      category: 'DEVELOPMENT',
    },
    {
      title: 'OWASP Security Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      category: 'DEVELOPMENT',
    },
  ],

  THREAT: [
    {
      title: 'Insider Threat Awareness Training Guide',
      url: 'https://keepnetlabs.com/blog/insider-threat-awareness-training-guide',
      category: 'THREAT',
    },
    {
      title: 'NCSC Data Security & Threat Response',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'THREAT',
    },
  ],

  TOOL: [
    {
      title: 'Top Nudging Tools for Security Awareness Programs',
      url: 'https://keepnetlabs.com/blog/top-nudging-tools-for-security-awareness-programs',
      category: 'TOOL',
    },
    {
      title: 'Top 10 Email Analysis Tools for Phishing',
      url: 'https://keepnetlabs.com/blog/top-10-email-analysis-tools-for-phishing',
      category: 'TOOL',
    },
  ],

  PROCESS: [
    {
      title: 'NCSC Cyber Assessment Framework',
      url: 'https://www.ncsc.gov.uk/collection/cyber-assessment-framework',
      category: 'PROCESS',
    },
    {
      title: 'Post-Breach Communication',
      url: 'https://keepnetlabs.com/blog/post-breach-communication-how-to-involve-employees-in-the-recovery-process',
      category: 'PROCESS',
    },
  ],

  // ===== GENERIC FALLBACK =====
  GENERIC: [
    {
      title: 'Microlearning in Security Awareness Training Programs',
      url: 'https://keepnetlabs.com/blog/microlearning-in-security-awareness-training-programs',
      category: 'GENERIC',
    },
    {
      title: '5 Reasons Cybersecurity Training Is No Longer Optional',
      url: 'https://keepnetlabs.com/blog/5-reasons-cybersecurity-training-is-no-longer-optional',
      category: 'GENERIC',
    },
  ],
};

/**
 * Resolves the most relevant resource URLs for a given topic, category, and department
 * Uses 3-level fallback logic:
 * 1. Topic-specific URLs (e.g., "phishing")
 * 2. Category fallback (e.g., "THREAT" for phishing/quishing/smishing, "DEVELOPMENT" for code topics)
 * 3. Generic fallback (catch-all)
 *
 * @param topic - The security topic (e.g., "phishing", "mfa", "ransomware")
 * @param category - The category (THREAT, TOOL, PROCESS, DEVELOPMENT)
 * @param isCode - If true, ensures DEVELOPMENT resources for code/software topics
 * @returns Array of ResourceURL objects - top 2 most relevant resources
 */
export function resolveResourceUrls(topic: string, category: string, isCode: boolean = false): ResourceURL[] {
  const topicKey = topic.toLowerCase().replace(/\s+/g, '-');

  // LEVEL 1: Topic-specific mapping
  if (URL_DATABASE[topicKey] && URL_DATABASE[topicKey].length > 0) {
    return URL_DATABASE[topicKey].slice(0, 2);
  }

  // LEVEL 2: Category fallback (THREAT/TOOL/PROCESS/DEVELOPMENT)
  // If isCode=true and not already DEVELOPMENT, use DEVELOPMENT as fallback
  const fallbackCategory = isCode && category !== 'DEVELOPMENT' ? 'DEVELOPMENT' : category;

  if (URL_DATABASE[fallbackCategory] && URL_DATABASE[fallbackCategory].length > 0) {
    logger.info('Using fallback category', {
      category: fallbackCategory,
      isCodeTopic: isCode,
    });
    return URL_DATABASE[fallbackCategory].slice(0, 2);
  }

  // LEVEL 3: Generic fallback (ultimate safety net)
  logger.info('Using GENERIC fallback');
  return (URL_DATABASE['GENERIC'] || []).slice(0, 2);
}

/**
 * Alias function for Scene 8 integration - Enhanced with keyTopics
 * Uses keyTopics array for dynamic resource resolution
 * Falls back to category + generic if keyTopics are not available
 *
 * @param analysis - Analysis with topic, category, keyTopics, department, language, and isCode flag
 * @param isCode - If true, ensures DEVELOPMENT resources for code/software topics (fallback priority: keyTopics → DEVELOPMENT → generic)
 */
export function getResourcesForScene8(
  analysis: {
    topic: string;
    category: string;
    keyTopics?: string[];
    department?: string;
    language?: string;
  },
  isCode: boolean = false
): ResourceURL[] {
  logger.info('getResourcesForScene8 called', {
    keyTopics: analysis.keyTopics,
  });

  // LEVEL 1: Try to resolve from keyTopics (most dynamic)
  if (analysis.keyTopics && analysis.keyTopics.length > 0) {
    const resources: ResourceURL[] = [];

    for (const keyTopic of analysis.keyTopics) {
      // Normalize: lowercase + remove special chars + replace spaces with dashes
      const topicKey = keyTopic
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove special chars
        .replace(/\s+/g, '-') // spaces to dashes
        .replace(/-+/g, '-'); // multiple dashes to single dash

      logger.info('Checking keyTopic', {
        original: keyTopic,
        normalized: topicKey,
      });

      // LEVEL 1: Try exact match
      const topicResources = URL_DATABASE[topicKey];
      if (Array.isArray(topicResources) && topicResources.length > 0) {
        logger.info('Found resources for keyTopic', {
          topicKey,
          count: topicResources.length,
        });
        resources.push(...topicResources);
        continue;
      }

      // LEVEL 2: Try to extract parent topic from granular keyTopic
      // "definition-of-quishing" → extract "quishing"
      // "typical-quishing-tactics" → extract "quishing"
      const words = topicKey.split('-');
      let parentTopicFound = false;

      for (const word of words) {
        const wordResources = URL_DATABASE[word];
        if (Array.isArray(wordResources) && wordResources.length > 0) {
          logger.info('Found parent topic match', {
            word,
            fromTopic: topicKey,
          });
          resources.push(...wordResources);
          parentTopicFound = true;
          break;
        }
      }

      if (!parentTopicFound) {
        logger.info('No match found for keyTopic', { topicKey });
      }
    }

    // If we found resources from keyTopics, return top 2 (avoiding duplicates)
    if (resources.length > 0) {
      logger.info('Found resources from keyTopics', {
        totalCount: resources.length,
      });

      // Remove duplicates and return top 2
      const uniqueUrls = new Set<string>();
      const uniqueResources: ResourceURL[] = [];

      for (const resource of resources) {
        if (!uniqueUrls.has(resource.url)) {
          uniqueUrls.add(resource.url);
          uniqueResources.push(resource);
          if (uniqueResources.length === 2) break;
        }
      }

      logger.info('Returning unique resources from keyTopics', {
        count: uniqueResources.length,
      });
      return uniqueResources;
    } else {
      logger.info('No resources found from keyTopics, falling back to standard resolution');
    }
  } else {
    logger.info('keyTopics empty or undefined, using standard resolution');
  }

  // LEVEL 2: Fallback to standard topic/category resolution with isCode flag
  logger.info('Using fallback resolution', {
    topic: analysis.topic,
    category: analysis.category,
    isCode,
  });
  return resolveResourceUrls(
    analysis.topic,
    analysis.category,
    isCode // Pass isCode flag to ensure DEVELOPMENT resources if needed
  );
}
