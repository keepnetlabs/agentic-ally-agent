import { generateText } from 'ai';
import { getModel, Model, ModelProvider } from '../model-providers';
import { PromptAnalysis } from '../types/prompt-analysis';
import videoDatabase from '../data/video-database.json';

/**
 * Selects the most appropriate SCENARIO video from database based on topic analysis
 * CRITICAL: Only returns scenario videos, filters out tutorials/tool demos
 * @param analysis - The prompt analysis containing topic, level, and department
 * @returns Promise<string> - The selected scenario video URL
 */
export async function selectVideoForTopic(analysis: PromptAnalysis): Promise<string> {
  console.log(`🎥 Selecting video for topic: ${analysis.topic}, audience: ${analysis.isCodeTopic ? 'development' : 'general'}`);

  const fallbackUrl = "https://customer-0lll6yc8omc23rbm.cloudflarestream.com/5fdb12ff1436c991f50b698a02e2faa1/manifest/video.m3u8";

  // Multi-level matching strategy for robust SCENARIO video selection with audience filtering
  function findRelevantVideos(): typeof videoDatabase {
    const topicLower = analysis.topic.toLowerCase();
    const topicKeywords = topicLower.split(/\s+/).filter(w => w.length > 3);
    const userAudience = analysis.isCodeTopic ? 'development' : 'general';

    // CRITICAL: Filter for SCENARIO videos only (not tutorials, tool demos, or how-to guides)
    const isScenarioVideo = (video: any) => {
      const videoTitle = (video.title || '').toLowerCase();
      const videoDesc = (video.description || '').toLowerCase();
      const fullText = `${videoTitle} ${videoDesc}`;

      // Include scenario keywords
      const scenarioKeywords = ['scenario', 'real case', 'real story', 'case study', 'example', 'incident', 'attack', 'threat'];
      const isScenario = scenarioKeywords.some(kw => fullText.includes(kw));

      // Exclude tutorial/tool keywords
      const excludeKeywords = ['tutorial', 'how to', 'how-to', 'guide', 'setup', 'install', 'configure', 'demo', 'feature'];
      const isTutorial = excludeKeywords.some(kw => fullText.includes(kw));

      return isScenario || !isTutorial;
    };

    // Level 1: Exact topic match in topics array (scenario-only, audience-matched)
    let matches = videoDatabase.filter(video =>
      (video.audience || 'general') === userAudience &&
      isScenarioVideo(video) &&
      video.topics.some(topic =>
        topicLower.includes(topic) ||
        topic.includes(topicLower)
      )
    );

    // Level 2: Keyword match in topics or title (scenario-only, audience-matched)
    if (matches.length === 0 && topicKeywords.length > 0) {
      matches = videoDatabase.filter(video =>
        (video.audience || 'general') === userAudience &&
        isScenarioVideo(video) &&
        topicKeywords.some(keyword =>
          video.topics.some(topic => topic.includes(keyword) || keyword.includes(topic)) ||
          video.title.toLowerCase().includes(keyword)
        )
      );
    }

    // Level 3: Related topic fallback (MFA→password, authentication→data protection, etc)
    if (matches.length === 0) {
      const relatedTopicMap: Record<string, string[]> = {
        'mfa': ['password', 'authentication', 'account security'],
        'multi-factor': ['password', 'authentication'],
        'authentication': ['password', 'mfa'],
        'login': ['password', 'authentication'],
        'quishing': ['phishing', 'email security', 'social engineering', 'spoofing'],
        'ransomware': ['data protection', 'incident response', 'backup', 'recovery'],
        'malware': ['ransomware', 'data protection', 'threat response', 'security'],
        'social-engineering': ['phishing', 'vishing', 'smishing', 'quishing'],
        'deepfake': ['phishing', 'email security', 'spoofing', 'threat'],
        'smishing': ['phishing', 'social engineering', 'email security'],
        'compliance': ['data protection', 'incident response', 'human risk'],
        'policy': ['security awareness', 'incident response', 'human risk'],
        'awareness': ['security', 'human risk', 'data protection'],
      };

      const relatedTopics = Object.entries(relatedTopicMap)
        .filter(([key]) => topicLower.includes(key))
        .flatMap(([, topics]) => topics);

      if (relatedTopics.length > 0) {
        matches = videoDatabase.filter(video =>
          (video.audience || 'general') === userAudience &&
          isScenarioVideo(video) &&
          video.topics.some(topic =>
            relatedTopics.some(relatedTopic =>
              topic.includes(relatedTopic) || relatedTopic.includes(topic)
            )
          )
        );
        if (matches.length > 0) {
          console.log(`📌 No exact match found, using related topic: ${relatedTopics.join(', ')}`);
        }
      }
    }

    // Level 4: Return scenario videos only (last resort - no fallback to tutorials)
    if (matches.length === 0) {
      matches = videoDatabase.filter(video =>
        (video.audience || 'general') === userAudience &&
        isScenarioVideo(video)
      );
      if (matches.length > 0) {
        console.log(`⚠️ No topic match found, returning generic ${userAudience} scenario video`);
      }
    }

    // Level 5: Cross-audience fallback - if no videos found in primary audience, try the other
    if (matches.length === 0) {
      const fallbackAudience = userAudience === 'development' ? 'general' : 'development';
      matches = videoDatabase.filter(video =>
        (video.audience || 'general') === fallbackAudience &&
        isScenarioVideo(video)
      );
      if (matches.length > 0) {
        console.log(`⚠️ No ${userAudience} scenario videos found, using ${fallbackAudience} audience fallback`);
      }
    }

    return matches.length > 0 ? matches : [];  // Return empty if no scenarios found
  }

  try {
    const relevantVideos = findRelevantVideos();
    console.log(`📹 Found ${relevantVideos.length} relevant SCENARIO videos from ${videoDatabase.length} total`);

    // CRITICAL: If no scenario videos found, return fallback
    if (relevantVideos.length === 0) {
      console.warn(`⚠️ No SCENARIO videos found for "${analysis.topic}", using fallback video`);
      return fallbackUrl;
    }

    // Proceed with AI selection for relevant videos
    const videoSelectionPrompt = `Topic: "${analysis.topic}"

Available videos:
${relevantVideos.map((v, i) => `${i + 1}. ${v.title}\n   Topics: ${v.topics.join(', ')}\n   URL: ${v.url}`).join('\n\n')}

Return the best matching video URL only:`;

    const model = getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B);
    const videoSelection = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a video selector. From the available videos list, select the SINGLE most relevant video URL for the given topic. Return ONLY the complete URL from the list (starting with https://), nothing else - no explanation, no markdown, no extra text. If you cannot find a good match, return the first video URL from the list.'
        },
        { role: 'user', content: videoSelectionPrompt }
      ]
    });

    let selectedUrl = videoSelection.text.trim();

    // Clean up common AI response patterns
    // Remove markdown links: [text](url) → url
    const markdownMatch = selectedUrl.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (markdownMatch) {
      selectedUrl = markdownMatch[2];
    }

    // Remove backticks or quotes
    selectedUrl = selectedUrl.replace(/^[`"]+|[`"]+$/g, '');

    // If empty or whitespace, use first available video
    if (!selectedUrl || selectedUrl.length === 0) {
      console.warn(`⚠️ AI returned empty URL, using first available video`);
      if (relevantVideos.length > 0) {
        selectedUrl = relevantVideos[0].url;
      } else {
        return fallbackUrl;
      }
    }

    // Validate URL exists in database
    const isValidUrl = videoDatabase.some(video => video.url === selectedUrl);

    if (isValidUrl) {
      const selectedVideo = videoDatabase.find(v => v.url === selectedUrl);
      console.log(`✅ Selected video: "${selectedVideo?.title}"`);
      return selectedUrl;
    } else {
      console.warn(`⚠️ AI returned invalid URL: "${selectedUrl}", using first available video`);
      // Fallback to first relevant video
      if (relevantVideos.length > 0) {
        return relevantVideos[0].url;
      }
      return fallbackUrl;
    }

  } catch (error) {
    console.error(`❌ Video selection failed: ${error}, using fallback`);
    return fallbackUrl;
  }
}

/**
 * Generates video title and subtitle with AI awareness of topic and department
 * Creates more contextual and engaging metadata than generic extraction
 *
 * @param topic - The microlearning topic (e.g., "Phishing", "MFA")
 * @param language - Target language for localization
 * @param department - Department context for scenario relevance
 * @param transcript - Video transcript (first 800 chars used for context)
 * @returns Promise with {title, subtitle} generated by AI
 */
export async function generateVideoMetadata(
  topic: string,
  language: string,
  department: string | undefined,
  transcript: string
): Promise<{ title: string; subtitle: string }> {
  try {
    const model = getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B);

    const departmentContext = department
      ? `\nDepartment context: ${department}. Tailor title/subtitle to this department's typical security concerns.`
      : '';

    const generationPrompt = `Generate a compelling video title and subtitle for security awareness training.

Topic: "${topic}"
Language: ${language}${departmentContext}

TRANSCRIPT EXCERPT:
${transcript.substring(0, 800)}...

REQUIREMENTS:
- Title: 3-5 words, pattern "Real [Threat/Topic] [Outcome]". Must match topic "${topic}".
  Topic-specific examples:
  - Phishing: "Real Phishing Attack Detected" | "Spotting Email Threats"
  - Quishing: "Real QR Code Attack" | "Detecting Quishing Threats"
  - Vishing: "Real Voice Impersonation Attack" | "Identifying Vishing Calls"
  - Ransomware: "Real Ransomware Attack" | "Recognizing Encryption Threats"
  - Deepfake: "Spotting Real Deepfake Videos" | "Detecting AI-Generated Media"
  - Smishing: "Real SMS Phishing Attack" | "Identifying Text Message Threats"
  - Malware: "Real Malware Attack" | "Recognizing Suspicious Files"

- Subtitle: 1 sentence (max 12 words). Focus on learner benefit with specific action.
  Topic-specific examples:
  - For phishing: "Spot email threats and report instantly"
  - For quishing: "Verify QR codes before scanning"
  - For vishing: "Identify caller impersonation and report fraud"
  - For ransomware: "Recognize attacks and safeguard critical data"
  - For deepfake: "Verify media authenticity and report deepfakes"
  - For MFA: "Secure accounts with multi-factor authentication"

- Generate in ${language} language
- NO instructions, NO patterns, NO "Write..." directives - just the final text

Return ONLY valid JSON, no markdown:
{
  "title": "...",
  "subtitle": "..."
}`;

    const result = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a video metadata expert. Generate engaging, contextual titles and subtitles for security awareness videos. Return ONLY valid JSON with no markdown or backticks.`
        },
        {
          role: 'user',
          content: generationPrompt
        }
      ]
    });

    // Parse the JSON response
    const cleanedResponse = result.text.trim();
    const metadata = JSON.parse(cleanedResponse);

    console.log(`✅ Generated video metadata for "${topic}" in ${language}`);
    return {
      title: metadata.title || `Real ${topic} Scenario`,
      subtitle: metadata.subtitle || 'Learn to recognize and respond to threats'
    };

  } catch (error) {
    console.warn(`⚠️ Video metadata generation failed: ${error}, using fallback`);

    // Fallback values if AI generation fails
    return {
      title: `Real ${topic} Scenario`,
      subtitle: 'Learn to recognize and respond to threats'
    };
  }
}