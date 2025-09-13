import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildBaseContext } from '../../utils/prompt-builders/base-context-builder';

export function generateScene8Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const baseContext = buildBaseContext(analysis, microlearning);

  // Topic-specific resource provider function
  const getTopicResources = (topic: string, category: string) => {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('phishing') || topicLower.includes('email')) {
      return [
        { title: "Cybersecurity Guidelines", url: "https://www.cisa.gov/cybersecurity" },
        { title: "Phishing Prevention", url: "https://www.ncsc.gov.uk/phishing" }
      ];
    }
    
    if (topicLower.includes('password')) {
      return [
        { title: "Password Security Best Practices", url: "https://www.nist.gov/password-guidance" },
        { title: "Multi-Factor Authentication Guide", url: "https://www.cisa.gov/mfa" }
      ];
    }
    
    if (topicLower.includes('data')) {
      return [
        { title: "Data Protection Guidelines", url: "https://www.cisa.gov/data-security" },
        { title: "GDPR Compliance Guide", url: "https://gdpr.eu/checklist" }
      ];
    }
    
    if (topicLower.includes('social engineering')) {
      return [
        { title: "Social Engineering Prevention", url: "https://www.ncsc.gov.uk/social-engineering" },
        { title: "Security Awareness Training", url: "https://www.sans.org/security-awareness" }
      ];
    }
    
    // Default fallback
    return [
      { title: "Professional Development Resources", url: "https://www.coursera.org" },
      { title: "Industry Best Practices", url: "https://www.skillsoft.com" }
    ];
  };

  return `${baseContext}

Generate scene 8 (summary):
{
  "8": {
    "iconName": "trophy",
    "texts": {
      "downloadTrainingLogsText": "Download Training Logs",
      "retryText": "Retry",
      "completionTitle": "Well done — you've completed the training",
      "completionSubtitle": "You've refreshed your ${analysis.topic.toLowerCase()} awareness",
      "achievementsTitle": "Your achievements",
      "actionPlanTitle": "Next steps",
      "resourcesTitle": "Additional resources",
      "motivationalTitle": "Stay alert",
      "motivationalMessage": "Completing this training helps keep your organisation safer.",
      "saveAndFinish": "Save and Finish",
      "savingText": "Saving…",
      "finishedText": "Saved. You can now close this window.",
      "finishErrorText": "LMS connection failed. Share the logs with your IT team.",
      "downloadButton": "Download certificate",
      "downloadingText": "Downloading…",
      "downloadedText": "Downloaded",
      "urgentLabel": "Urgent",
      "pointsLabel": "Points",
      "timeLabel": "Time",
      "completionLabel": "Completion"
    },
    "immediateActions": [
      {
        "title": "Do now",
        "description": "Write immediate next step in ${analysis.language} for ${analysis.topic} (Security topics: 'Report suspicious activity immediately', Writing topics: 'Apply professional writing standards', Password topics: 'Update weak passwords now', Data topics: 'Review data access permissions')"
      },
      {
        "title": "This week", 
        "description": "Write weekly goal in ${analysis.language} for ${analysis.topic} (Security: 'Share awareness with your team', Writing: 'Practice clear communication daily', Password: 'Enable two-factor authentication', Data: 'Complete data handling review')"
      }
    ],
    "key_message": [
      "Training completed",
      "Apply what you've practised", 
      "Share and encourage others"
    ],
    "resources": [
      {
        "title": "Write resource title in ${analysis.language} about ${analysis.topic} guidance", 
        "type": "URL",
        "url": "${getTopicResources(analysis.topic, analysis.category)[0]?.url || 'https://www.cisa.gov/cybersecurity'}"
        },
      {
        "title": "Write second resource title in ${analysis.language} about ${analysis.topic} best practices",
        "type": "URL", 
        "url": "${getTopicResources(analysis.topic, analysis.category)[1]?.url || 'https://www.ncsc.gov.uk/cyber-security'}"
      }
    ],
    "scene_type": "summary"
  }
}

CRITICAL: 
1. NEVER use placeholder text. Replace ALL content with specific ${analysis.topic} information. Generate concrete takeaways and action steps.
2. TOPIC CONSISTENCY: Summarize key ${analysis.topic} concepts and provide actionable takeaways.`;
}