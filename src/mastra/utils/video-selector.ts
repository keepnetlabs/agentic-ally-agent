import { generateText } from 'ai';
import { getModel, Model, ModelProvider } from '../model-providers';
import { PromptAnalysis } from '../types/prompt-analysis';
import videoDatabase from '../data/video-database.json';

/**
 * Selects the most appropriate video from database based on topic analysis
 * @param analysis - The prompt analysis containing topic, level, and department
 * @returns Promise<string> - The selected video URL
 */
export async function selectVideoForTopic(analysis: PromptAnalysis): Promise<string> {
  console.log(`🎥 Selecting video for topic: ${analysis.topic}`);

  const fallbackUrl = "https://customer-0lll6yc8omc23rbm.cloudflarestream.com/5fdb12ff1436c991f50b698a02e2faa1/manifest/video.m3u8";

  // Multi-level matching strategy for robust video selection
  function findRelevantVideos(): typeof videoDatabase {
    const topicLower = analysis.topic.toLowerCase();
    const topicKeywords = topicLower.split(/\s+/).filter(w => w.length > 3);

    // Level 1: Exact topic match in topics array
    let matches = videoDatabase.filter(video =>
      video.topics.some(topic =>
        topicLower.includes(topic) ||
        topic.includes(topicLower)
      )
    );

    // Level 2: Keyword match in topics or title (if Level 1 finds nothing)
    if (matches.length === 0 && topicKeywords.length > 0) {
      matches = videoDatabase.filter(video =>
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
        'compliance': ['data protection', 'incident response'],
        'policy': ['security awareness', 'incident response'],
        'awareness': ['security', 'human risk'],
      };

      const relatedTopics = Object.entries(relatedTopicMap)
        .filter(([key]) => topicLower.includes(key))
        .flatMap(([, topics]) => topics);

      if (relatedTopics.length > 0) {
        matches = videoDatabase.filter(video =>
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

    // Level 4: Return all videos (last resort)
    return matches.length > 0 ? matches : videoDatabase;
  }

  try {
    const relevantVideos = findRelevantVideos();
    console.log(`📹 Found ${relevantVideos.length} relevant videos from ${videoDatabase.length} total`);

    // CRITICAL: If no relevant videos found (all database returned), use fallback
    if (relevantVideos.length === videoDatabase.length) {
      console.warn(`⚠️ No relevant videos found for "${analysis.topic}", using generic fallback video`);
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
        { role: 'system', content: 'You select the most relevant video URL based on topic. Return ONLY the URL, nothing else.' },
        { role: 'user', content: videoSelectionPrompt }
      ]
    });

    const selectedUrl = videoSelection.text.trim();

    // Validate URL exists in database
    const isValidUrl = videoDatabase.some(video => video.url === selectedUrl);

    if (isValidUrl) {
      const selectedVideo = videoDatabase.find(v => v.url === selectedUrl);
      console.log(`✅ Selected video: "${selectedVideo?.title}"`);
      return selectedUrl;
    } else {
      console.warn(`⚠️ AI returned invalid URL: "${selectedUrl}", using fallback`);
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
  Examples: "Real Phishing Emails Detected" | "Real MFA Account Takeover" | "Real Ransomware Attack" | "Spotting Real Deepfake Videos"

- Subtitle: 1 sentence (max 12 words). Focus on learner benefit with specific action.
  Examples:
  - For phishing: "Report threats instantly and protect your team"
  - For MFA: "Secure accounts with multi-factor authentication"
  - For ransomware: "Recognize attacks and safeguard critical data"

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