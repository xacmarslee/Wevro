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

// ============================================
// DICTIONARY: Translate Word Senses
// ============================================

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
2. **定義要極度簡潔，用於字卡學習**（詞彙翻譯，不是定義解釋）：
   - 常見具體名詞（如動物、物品、人物）：只寫對應中文詞彙（例：frog → 青蛙；dog → 狗；computer → 電腦）
   - 常見動詞：只寫對應中文動詞（例：run → 跑；eat → 吃；sleep → 睡覺）
   - 常見形容詞：只寫對應中文形容詞（例：happy → 快樂的；big → 大的）
   - 抽象概念或複雜詞彙：用 1-2 個短句說明，不超過 15 字（例：democracy → 民主政治；photosynthesis → 植物利用光合成養分）
   
   重要：使用「詞彙翻譯」而非「定義解釋」
   ✓ 正確：create → "創造；製造"
   ✗ 錯誤：create → "製造或產生某物的行為"
   ✓ 正確：traffic → "交通；車流"
   ✗ 錯誤：traffic → "道路上的車輛移動"
   
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

