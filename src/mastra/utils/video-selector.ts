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
  console.log(`🎥 Selecting video for topic: ${analysis.topic}, level: ${analysis.level}, department: ${analysis.department}`);

  const fallbackUrl = "https://customer-0lll6yc8omc23rbm.cloudflarestream.com/5fdb12ff1436c991f50b698a02e2faa1/manifest/video.m3u8";

  try {
    const videoSelectionPrompt = `Select the most relevant video from this database for the training topic.

Topic: ${analysis.topic}
Level: ${analysis.level || 'Intermediate'}
Department: ${analysis.department || 'All'}

Video Database:
${JSON.stringify(videoDatabase, null, 2)}

INSTRUCTIONS:
- Analyze the topic "${analysis.topic}" and find the best matching video
- Consider topic relevance, level appropriateness, and department fit
- Return ONLY the URL of the selected video, nothing else
- Choose from the URLs in the database above

Return only the selected video URL:`;

    const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);
    const videoSelection = await generateText({
      model,
      messages: [
        { role: 'user', content: videoSelectionPrompt }
      ]
    });

    const selectedUrl = videoSelection.text.trim();

    // Validate the URL exists in database
    const isValidUrl = videoDatabase.some(video => video.url === selectedUrl);

    if (isValidUrl) {
      console.log(`✅ Selected video URL: ${selectedUrl}`);
      return selectedUrl;
    } else {
      console.warn(`⚠️ AI selected invalid URL, using fallback: ${selectedUrl}`);
      return fallbackUrl;
    }

  } catch (error) {
    console.error(`❌ Video selection failed: ${error}, using fallback`);
    return fallbackUrl;
  }
}