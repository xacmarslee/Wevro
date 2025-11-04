/**
 * AI Translator Service
 * 
 * Strictly translates English dictionary content to Traditional Chinese (Taiwan).
 * Does NOT create new content - only translates what the dictionary provides.
 * 
 * Key principles:
 * - Translate faithfully from source
 * - Use Taiwan-style Chinese
 * - Keep definitions concise
 * - Don't add new examples or senses
 */

import OpenAI from "openai";
import { type WordSense } from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

/**
 * Translate word senses to Traditional Chinese
 * 
 * Input: Array of senses with English content
 * Output: Array of partial senses with Chinese translations
 */
export async function translateWordSenses(
  headword: string,
  senses: any[]
): Promise<Partial<WordSense>[]> {
  try {
    // Prepare translation payload (English only)
    const translationInput = senses.map((sense, index) => ({
      id: sense.id || `s${index + 1}`,
      pos: sense.pos,
      defEn: sense.defEn,
      examples: (sense.examples || []).map((ex: any) => ex.en).filter(Boolean),
      collocations: (sense.collocations || []).map((coll: any) => coll.phrase).filter(Boolean),
    }));

    // System prompt - strict translation guidelines
    const systemPrompt = `你是專業的英→繁中（台灣）字典編輯。請「只翻譯」我提供的英文定義與例句，不要新增或杜撰任何義項。

要求：
1. 使用台灣繁體中文用詞（例：「電腦」而非「計算機」、「公司」而非「公司行號」）
2. 定義要簡潔準確，保留關鍵語義區分
3. 例句以直譯為主，必要時意譯使其自然、簡短
4. 詞組搭配（collocations）翻成常用說法
5. 不要加入你自己的新例句或新義項
6. 詞性保持英文原樣（verb, noun, adjective 等）
7. 如果某個欄位沒有內容，留空或返回 null

輸出必須符合 JSON schema，不要有多餘文字。`;

    const userPrompt = `請翻譯單字 "${headword}" 的以下義項：

${JSON.stringify(translationInput, null, 2)}

返回 JSON 格式：
{
  "translations": [
    {
      "id": "s1",
      "defZhTw": "中文定義",
      "examplesZhTw": ["中文例句1", "中文例句2"],
      "collocationsZhTw": ["詞組翻譯1", "詞組翻譯2"],
      "notesZhTw": "（選填）使用說明"
    }
  ]
}`;

    // Call GPT-4o with strict JSON mode
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
      temperature: 0.3,  // Lower temperature for more consistent translation
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(content);
    const translations = parsed.translations || [];

    // Validate and map back to WordSense structure
    const result: Partial<WordSense>[] = translations.map((t: any, index: number) => ({
      id: t.id || senses[index]?.id,
      defZhTw: t.defZhTw || undefined,
      examples: (t.examplesZhTw || []).map((zhTw: string, exIndex: number) => ({
        en: senses[index]?.examples?.[exIndex]?.en || "",
        zhTw,
      })),
      collocations: (t.collocationsZhTw || []).map((zhTw: string, collIndex: number) => ({
        phrase: senses[index]?.collocations?.[collIndex]?.phrase || "",
        zhTw,
      })),
      notesZhTw: t.notesZhTw || undefined,
    }));

    console.log(`✓ Translated ${result.length} senses for "${headword}"`);
    
    return result;

  } catch (error) {
    console.error(`Translation error for "${headword}":`, error);
    throw new Error(`Failed to translate word senses: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate batch Chinese definitions for flashcards (legacy support)
 * This is a simplified version for when we don't have full dictionary data
 */
export async function generateBatchDefinitions(
  words: string[]
): Promise<Array<{ word: string; definition: string; partOfSpeech: string }>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `你是英中雙語詞彙專家。提供準確的台灣繁體中文定義。`,
        },
        {
          role: "user",
          content: `為以下英文單字提供台灣繁體中文定義：${words.join(", ")}

對每個單字返回：
- "word": 原始英文單字
- "definition": 簡潔的繁體中文定義（最多20字）
- "partOfSpeech": 詞性（名詞、動詞、形容詞、副詞等）

重要：定義保持簡潔（最多20個繁體中文字）。

返回 JSON：
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
    
    // Validate and sanitize
    const validDefinitions = rawDefinitions
      .filter((def: any) => def.word && def.definition && def.partOfSpeech)
      .map((def: any) => ({
        word: def.word,
        definition: def.definition.length > 20 
          ? def.definition.substring(0, 20)
          : def.definition,
        partOfSpeech: def.partOfSpeech || "未知",
      }));
    
    console.log(`Generated ${validDefinitions.length} definitions out of ${words.length} words`);
    
    return validDefinitions;
  } catch (error) {
    console.error("Error generating batch definitions:", error);
    throw new Error("Failed to generate batch definitions");
  }
}
