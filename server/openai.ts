import OpenAI from "openai";
import { type WordCategory } from "@shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Category descriptions for better AI prompts
const categoryDescriptions: Record<WordCategory, string> = {
  derivatives: "word forms and derivatives (noun, verb, adjective, adverb forms)",
  synonyms: "words with similar meanings",
  antonyms: "words with opposite meanings",
  collocations: "common word combinations and phrases",
  idioms: "idiomatic expressions and phrases",
  root: "root words and etymological origins",
  prefix: "words with the same prefix",
  suffix: "words with the same suffix",
  "topic-related": "related words from the same topic or semantic field",
};

export async function generateRelatedWords(
  word: string,
  category: WordCategory
): Promise<string[]> {
  try {
    const examples: Record<WordCategory, string> = {
      derivatives: `For "happy": ["happiness", "happily", "happier", "happiest", "unhappy"]`,
      synonyms: `For "happy": ["joyful", "cheerful", "content", "pleased", "delighted"]`,
      antonyms: `For "happy": ["sad", "unhappy", "miserable", "depressed", "gloomy"]`,
      collocations: `For "make": ["make a decision", "make progress", "make sense", "make time", "make an effort"]`,
      idioms: `For "happy": ["happy as a clam", "happy camper", "happy medium", "trigger happy"]`,
      root: `For "dictionary": ["diction", "dictate", "dictator", "predict", "verdict"]`,
      prefix: `For "unhappy": ["unable", "uncertain", "unfair", "unkind", "unusual"]`,
      suffix: `For "happiness": ["kindness", "sadness", "darkness", "weakness", "fitness"]`,
      "topic-related": `For "computer": ["keyboard", "mouse", "monitor", "software", "hardware", "internet"]`,
    };

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a vocabulary expert helping students learn English words. Always generate at least 5 related words. Be specific and helpful.`,
        },
        {
          role: "user",
          content: `Task: Generate 5-8 ${categoryDescriptions[category]} for the word "${word}".

Example: ${examples[category]}

Return a JSON object with a "words" array. IMPORTANT: You must include at least 5 words. Do not include the original word "${word}".

JSON format:
{
  "words": ["word1", "word2", "word3", "word4", "word5"]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const words = parsed.words || [];
    
    console.log(`Generated ${words.length} ${category} for "${word}":`, words);
    
    // Return up to 8 words
    return words.slice(0, 8);
  } catch (error) {
    console.error("Error generating related words:", error);
    throw new Error("Failed to generate related words");
  }
}

export async function generateChineseDefinition(
  word: string
): Promise<{ definition: string; partOfSpeech: string }> {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a bilingual English-Chinese vocabulary expert. Provide accurate Traditional Chinese definitions.`,
        },
        {
          role: "user",
          content: `Provide a Traditional Chinese definition for the English word "${word}". Return a JSON object with:
- "definition": A clear, concise Traditional Chinese definition (繁體中文)
- "partOfSpeech": The part of speech in Traditional Chinese (e.g., 名詞, 動詞, 形容詞, 副詞, etc.)

Example format:
{
  "definition": "快樂的；高興的",
  "partOfSpeech": "形容詞"
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      definition: parsed.definition || "定義未找到",
      partOfSpeech: parsed.partOfSpeech || "未知",
    };
  } catch (error) {
    console.error("Error generating definition:", error);
    throw new Error("Failed to generate definition");
  }
}
