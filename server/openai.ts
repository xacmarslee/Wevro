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
      idioms: `For "happy": ["happy as a clam", "happy camper", "happy medium", "trigger happy", "happy hour"]`,
      root: `For "dictionary": ["diction", "dictate", "dictator", "predict", "verdict"]`,
      prefix: `For "unhappy": ["unable", "uncertain", "unfair", "unkind", "unusual"]`,
      suffix: `For "happiness": ["kindness", "sadness", "darkness", "weakness", "fitness"]`,
      "topic-related": `For "computer": ["keyboard", "mouse", "monitor", "software", "hardware", "internet"]`,
    };

    // Using gpt-4o for more reliable word generation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a vocabulary expert helping students learn English words. Generate related words if they exist. If there are no appropriate related words for a category, return an empty array.`,
        },
        {
          role: "user",
          content: `Task: Generate ${categoryDescriptions[category]} for the word "${word}".

Example: ${examples[category]}

${category === "idioms" ? `IMPORTANT: For idioms, ALL idioms must contain the word "${word}" in them. If no idioms exist with this word, return an empty array.` : ""}

Instructions:
- Generate as many ACCURATE ${categoryDescriptions[category]} as you can find (up to 7 words maximum)
- Only include words that are truly related to "${word}" in the "${category}" category
- If the word doesn't have a ${category === "prefix" || category === "suffix" ? category : `meaningful ${category} relationship`}, return an empty array
- Do not include the original word "${word}" by itself
- Quality over quantity - it's better to return fewer accurate words than to force irrelevant ones

Return a JSON object with a "words" array (can be empty if no related words exist):
{
  "words": ["word1", "word2", "word3"]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const words = parsed.words || [];
    
    console.log(`Generated ${words.length} ${category} for "${word}":`, words.length > 0 ? words : "[No related words found]");
    
    // Return up to 7 words, or empty array if none found
    return words.slice(0, 7);
  } catch (error) {
    console.error("Error generating related words:", error);
    throw new Error("Failed to generate related words");
  }
}

export async function generateChineseDefinition(
  word: string
): Promise<{ definition: string; partOfSpeech: string }> {
  try {
    // Using gpt-4o for more reliable definition generation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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

export async function generateBatchDefinitions(
  words: string[]
): Promise<Array<{ word: string; definition: string; partOfSpeech: string }>> {
  try {
    // Using gpt-4o for batch definition generation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a bilingual English-Chinese vocabulary expert. Provide accurate Traditional Chinese definitions for multiple words.`,
        },
        {
          role: "user",
          content: `Provide Traditional Chinese definitions for the following English words: ${words.join(", ")}

For each word, return:
- "word": The original English word
- "definition": A clear, concise Traditional Chinese definition (繁體中文), maximum 20 characters
- "partOfSpeech": The part of speech in Traditional Chinese (e.g., 名詞, 動詞, 形容詞, 副詞, etc.)

IMPORTANT: Keep definitions concise (max 20 Traditional Chinese characters).

Return a JSON object with an array of word definitions:
{
  "definitions": [
    {
      "word": "happy",
      "definition": "快樂的；高興的",
      "partOfSpeech": "形容詞"
    }
  ]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const rawDefinitions = parsed.definitions || [];
    
    // Validate and sanitize definitions
    const validDefinitions = rawDefinitions
      .filter((def: any) => {
        // Must have all required fields
        return def.word && def.definition && def.partOfSpeech;
      })
      .map((def: any) => ({
        word: def.word,
        // Trim definition to 20 Traditional Chinese characters max
        definition: def.definition.length > 20 
          ? def.definition.substring(0, 20)
          : def.definition,
        partOfSpeech: def.partOfSpeech || "未知",
      }));
    
    console.log(`Generated ${validDefinitions.length} valid definitions out of ${words.length} requested words`);
    
    return validDefinitions;
  } catch (error) {
    console.error("Error generating batch definitions:", error);
    throw new Error("Failed to generate batch definitions");
  }
}
