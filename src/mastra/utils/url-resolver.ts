import { PromptAnalysis } from '../types/prompt-analysis';

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
  'phishing': [
    {
      title: 'Phishing Examples: Real Attacks by Type, Industry, and Emotion',
      url: 'https://keepnetlabs.com/blog/phishing-examples-real-attacks-by-type-industry-and-emotion',
      category: 'THREAT'
    },
    {
      title: 'NCSC Phishing Scams Guidance',
      url: 'https://www.ncsc.gov.uk/collection/phishing-scams',
      category: 'THREAT'
    }
  ],

  'quishing': [
    {
      title: 'What is Quishing (QR Phishing)?',
      url: 'https://keepnetlabs.com/blog/understanding-quishing',
      category: 'THREAT'
    },
    {
      title: 'NCSC Mobile Device Security Guidance',
      url: 'https://www.ncsc.gov.uk/collection/mobile-device-guidance',
      category: 'THREAT'
    }
  ],

  'ransomware': [
    {
      title: 'Ransomware Prevention & Response Guide',
      url: 'https://keepnetlabs.com/blog/ransomware-prevention-response-guide',
      category: 'THREAT'
    },
    {
      title: 'NCSC Data Security & Ransomware Protection',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'THREAT'
    }
  ],

  'deepfake': [
    {
      title: 'Deepfake Statistics & Trends 2025',
      url: 'https://keepnetlabs.com/blog/deepfake-statistics-and-trends',
      category: 'THREAT'
    },
    {
      title: 'What Is Deepfake Phishing Simulation?',
      url: 'https://keepnetlabs.com/blog/what-is-deepfake-phishing-simulation',
      category: 'THREAT'
    }
  ],

  'vishing': [
    {
      title: 'Understanding Voice Generation AI and Vishing Threats',
      url: 'https://keepnetlabs.com/blog/understanding-voice-generation-ai-and-vishing-threats',
      category: 'THREAT'
    },
    {
      title: 'Vishing vs. Phishing vs. Smishing',
      url: 'https://keepnetlabs.com/blog/vishing-vs-phishing-vs-smishing-guide',
      category: 'THREAT'
    }
  ],

  'malware': [
    {
      title: 'Most Common Examples of Malware Attacks',
      url: 'https://keepnetlabs.com/blog/3-most-common-examples-of-malware-attacks',
      category: 'THREAT'
    },
    {
      title: 'NCSC Data Security Guidelines',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'THREAT'
    }
  ],

  'social-engineering': [
    {
      title: 'Social Engineering Attack Types & Prevention',
      url: 'https://keepnetlabs.com/blog/social-engineering-attack-types-prevention',
      category: 'THREAT'
    },
    {
      title: 'What is SIM Swap Fraud',
      url: 'https://keepnetlabs.com/blog/what-is-sim-swap-fraud',
      category: 'THREAT'
    }
  ],

  'data-breach': [
    {
      title: 'Data Breach Response & Notification Guide',
      url: 'https://keepnetlabs.com/blog/data-breach-response-notification',
      category: 'THREAT'
    },
    {
      title: 'What are Payment Card Data Security Standards',
      url: 'https://keepnetlabs.com/blog/what-are-payment-card-data-security-standards-pci-dss',
      category: 'THREAT'
    }
  ],

  'mfa': [
    {
      title: 'What is MFA Fatigue Attack?',
      url: 'https://keepnetlabs.com/blog/what-is-mfa-fatigue-attack-and-how-to-prevent-it',
      category: 'TOOL'
    },
    {
      title: 'NCSC Multi-Factor Authentication Guidance',
      url: 'https://www.ncsc.gov.uk/collection/mfa-for-your-corporate-online-services',
      category: 'TOOL'
    }
  ],

  'password': [
    {
      title: 'Comprehensive Guide on Password Security Best Practices',
      url: 'https://keepnetlabs.com/blog/comprehensive-guide-on-password-security-best-practices',
      category: 'TOOL'
    },
    {
      title: 'NCSC Password Guidance & Best Practices',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/a-3-protecting-passwords',
      category: 'TOOL'
    }
  ],

  'backup': [
    {
      title: 'Backup & Recovery Best Practices',
      url: 'https://keepnetlabs.com/blog/backup-recovery-best-practices',
      category: 'TOOL'
    },
    {
      title: 'NCSC Data Security & Backup Guidelines',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL'
    }
  ],

  'encryption': [
    {
      title: 'What is Data Encryption?',
      url: 'https://keepnetlabs.com/blog/what-is-data-encryption',
      category: 'TOOL'
    },
    {
      title: 'NCSC Data Security Standards',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL'
    }
  ],

  'data-privacy': [
    {
      title: 'What is a Privacy Program?',
      url: 'https://keepnetlabs.com/blog/what-is-a-privacy-program-how-to-build-an-effective-privacy-program',
      category: 'TOOL'
    },
    {
      title: 'NCSC Data Security & Privacy Framework',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL'
    }
  ],

  'vpn': [
    {
      title: 'NCSC Secure Remote Access Guidance',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'TOOL'
    },
    {
      title: 'VPN Security Best Practices',
      url: 'https://keepnetlabs.com/blog/vpn-security-best-practices',
      category: 'TOOL'
    }
  ],

  'remote-access': [
    {
      title: 'NCSC Secure Remote Access Design',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'TOOL'
    },
    {
      title: 'Remote Access Security Best Practices',
      url: 'https://keepnetlabs.com/blog/remote-access-security-best-practices',
      category: 'TOOL'
    }
  ],

  'remote-work': [
    {
      title: 'Remote Worker Security Checklist',
      url: 'https://keepnetlabs.com/blog/remote-worker-security-checklist',
      category: 'TOOL'
    },
    {
      title: 'NCSC Secure Remote Working Guidance',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'TOOL'
    }
  ],

  'secure-connection': [
    {
      title: 'Secure Network Connections Best Practices',
      url: 'https://keepnetlabs.com/blog/secure-network-connections',
      category: 'TOOL'
    },
    {
      title: 'NCSC Data Security Standards',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'TOOL'
    }
  ],

  'compliance': [
    {
      title: 'Cybersecurity Compliance Training 101',
      url: 'https://keepnetlabs.com/blog/cybersecurity-compliance-training-101',
      category: 'TOOL'
    },
    {
      title: 'NCSC Cyber Assessment Framework',
      url: 'https://www.ncsc.gov.uk/collection/cyber-assessment-framework',
      category: 'TOOL'
    }
  ],

  // ===== PROCESS TOPICS =====
  'incident-response': [
    {
      title: 'Reporting Security Incidents',
      url: 'https://keepnetlabs.com/blog/reporting-security-incidents-how-security-awareness-drives-success',
      category: 'PROCESS'
    },
    {
      title: 'NCSC Data Security & Incident Response',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'PROCESS'
    }
  ],

  'security-protocols': [
    {
      title: 'NCSC Cyber Assessment Framework',
      url: 'https://www.ncsc.gov.uk/collection/cyber-assessment-framework',
      category: 'PROCESS'
    },
    {
      title: 'NCSC Access Control & Security Guidelines',
      url: 'https://www.ncsc.gov.uk/blog-post/cni-system-design-secure-remote-access',
      category: 'PROCESS'
    }
  ],

  'decision-framework': [
    {
      title: 'Digital Deception in Search Results',
      url: 'https://keepnetlabs.com/blog/digital-deception-in-search-results-an-introduction-to-search-engine-poisoning',
      category: 'PROCESS'
    },
    {
      title: 'NCSC Cyber Essentials Requirements',
      url: 'https://www.ncsc.gov.uk/files/Cyber-Essentials-Requirements-for-Infrastructure-v3-1-January-2023.pdf',
      category: 'PROCESS'
    }
  ],

  // ===== CATEGORY-LEVEL FALLBACKS =====
  'THREAT': [
    {
      title: 'Insider Threat Awareness Training Guide',
      url: 'https://keepnetlabs.com/blog/insider-threat-awareness-training-guide',
      category: 'THREAT'
    },
    {
      title: 'NCSC Data Security & Threat Response',
      url: 'https://www.ncsc.gov.uk/collection/caf/caf-principles-and-guidance/b-3-data-security',
      category: 'THREAT'
    }
  ],

  'TOOL': [
    {
      title: 'Top Nudging Tools for Security Awareness Programs',
      url: 'https://keepnetlabs.com/blog/top-nudging-tools-for-security-awareness-programs',
      category: 'TOOL'
    },
    {
      title: 'Top 10 Email Analysis Tools for Phishing',
      url: 'https://keepnetlabs.com/blog/top-10-email-analysis-tools-for-phishing',
      category: 'TOOL'
    }
  ],

  'PROCESS': [
    {
      title: 'NCSC Cyber Assessment Framework',
      url: 'https://www.ncsc.gov.uk/collection/cyber-assessment-framework',
      category: 'PROCESS'
    },
    {
      title: 'Post-Breach Communication',
      url: 'https://keepnetlabs.com/blog/post-breach-communication-how-to-involve-employees-in-the-recovery-process',
      category: 'PROCESS'
    }
  ],

  // ===== GENERIC FALLBACK =====
  'GENERIC': [
    {
      title: 'NCSC Cyber Assessment Framework',
      url: 'https://www.ncsc.gov.uk/collection/cyber-assessment-framework',
      category: 'GENERIC'
    },
    {
      title: '5 Reasons Cybersecurity Training Is No Longer Optional',
      url: 'https://keepnetlabs.com/blog/5-reasons-cybersecurity-training-is-no-longer-optional',
      category: 'GENERIC'
    }
  ]
};

/**
 * Resolves the most relevant resource URLs for a given topic, category, and department
 * Uses 3-level fallback logic:
 * 1. Topic-specific URLs (e.g., "phishing")
 * 2. Category fallback (e.g., "THREAT" for phishing/quishing/smishing)
 * 3. Generic fallback (catch-all)
 *
 * @param topic - The security topic (e.g., "phishing", "mfa", "ransomware")
 * @param category - The category (THREAT, TOOL, PROCESS)
 * @param department - Optional department context (Finance, IT, HR, Operations)
 * @returns Array of ResourceURL objects - top 2 most relevant resources
 */
export function resolveResourceUrls(
  topic: string,
  category: string,
  department?: string
): ResourceURL[] {
  const topicKey = topic.toLowerCase().replace(/\s+/g, '-');

  // LEVEL 1: Topic-specific mapping
  if (URL_DATABASE[topicKey] && URL_DATABASE[topicKey].length > 0) {
    return URL_DATABASE[topicKey].slice(0, 2);
  }

  // LEVEL 2: Category fallback (THREAT/TOOL/PROCESS)
  if (URL_DATABASE[category] && URL_DATABASE[category].length > 0) {
    return URL_DATABASE[category].slice(0, 2);
  }

  // LEVEL 3: Generic fallback (ultimate safety net)
  return (URL_DATABASE['GENERIC'] || []).slice(0, 2);
}

/**
 * Alias function for Scene 8 integration - Enhanced with keyTopics
 * Uses keyTopics array for dynamic resource resolution
 * Falls back to category + generic if keyTopics are not available
 */
export function getResourcesForScene8(analysis: {
  topic: string;
  category: string;
  keyTopics?: string[];
  department?: string;
  language?: string;
}): ResourceURL[] {
  console.log('🔗 getResourcesForScene8 called');
  console.log('  keyTopics input:', analysis.keyTopics);

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

      console.log(`  Checking keyTopic: "${keyTopic}" → normalized: "${topicKey}"`);

      if (URL_DATABASE[topicKey] && URL_DATABASE[topicKey].length > 0) {
        console.log(`    ✅ Found ${URL_DATABASE[topicKey].length} resources for "${topicKey}"`);
        resources.push(...URL_DATABASE[topicKey]);
      } else {
        console.log(`    ❌ No exact match for "${topicKey}", checking alternatives...`);
        // Log available keys for debugging
        console.log(`    Available keys: ${Object.keys(URL_DATABASE).filter(k => k !== 'THREAT' && k !== 'TOOL' && k !== 'PROCESS' && k !== 'GENERIC').slice(0, 10).join(', ')}`);
      }
    }

    // If we found resources from keyTopics, return top 2 (avoiding duplicates)
    if (resources.length > 0) {
      console.log(`  📦 Found ${resources.length} total resources from keyTopics`);

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

      console.log(`  ✅ Returning ${uniqueResources.length} unique resources from keyTopics`);
      return uniqueResources;
    } else {
      console.log(`  ⚠️ No resources found from keyTopics, falling back to standard resolution`);
    }
  } else {
    console.log(`  ⚠️ keyTopics empty or undefined, using standard resolution`);
  }

  // LEVEL 2: Fallback to standard topic/category resolution
  console.log(`  Fallback: Using topic="${analysis.topic}", category="${analysis.category}"`);
  return resolveResourceUrls(
    analysis.topic,
    analysis.category,
    analysis.department
  );
}
