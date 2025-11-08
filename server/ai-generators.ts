/**
 * AI Generators Service
 * 
 * All AI-powered content generation functions:
 * - Mind map word expansion (generateRelatedWords)
 * - Example sentences generation (generateExampleSentences)
 * - Flashcard definitions generation (generateBatchDefinitions)
 */

import OpenAI from "openai";
import { type WordCategory } from "../shared/schema.js";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ============================================
// 1. MIND MAP: Generate Related Words
// ============================================

// Category descriptions for better AI prompts
const categoryDescriptions: Record<WordCategory, string> = {
  derivatives: "word forms and derivatives (noun, verb, adjective, adverb forms)",
  synonyms: "words with similar meanings (can be used interchangeably)",
  antonyms: "words with opposite meanings",
  collocations: "common word combinations - for verbs: preposition partners (intransitive) or typical objects (transitive); for nouns: common adjectives and verbs that take this noun as object",
  idioms: "idiomatic expressions and phrases",
  root: "root words and etymological origins",
  prefix: "words with the same prefix",
  suffix: "words with the same suffix",
  "topic-related": "related words from the same topic or semantic field (NOT synonyms, but words commonly discussed together in the same context)",
};

export async function generateRelatedWords(
  word: string,
  category: WordCategory
): Promise<string[]> {
  try {
    const examples: Record<WordCategory, string> = {
      derivatives: `For "happy": ["happiness", "happily", "happier", "happiest", "unhappy"]`,
      synonyms: `For "happy": ["joyful", "cheerful", "content", "pleased", "delighted"] ← CAN replace "happy". For "sad": ["unhappy", "miserable", "sorrowful", "dejected", "gloomy"] ← CAN replace "sad"`,
      antonyms: `For "happy": ["sad", "unhappy", "miserable", "depressed", "gloomy"]`,
      collocations: `For "make" (transitive verb): ["make a decision", "make progress", "make sense", "make time", "make an effort"]. For "look" (intransitive): ["look at", "look for", "look after", "look into"]. For "decision" (noun): ["make a decision", "tough decision", "final decision"]`,
      idioms: `For "happy": ["happy as a clam", "happy camper", "happy medium", "trigger happy", "happy hour"]`,
      root: `For "dictionary": ["diction", "dictate", "dictator", "predict", "verdict"]`,
      prefix: `For "unhappy": ["unable", "uncertain", "unfair", "unkind", "unusual"]`,
      suffix: `For "happiness": ["kindness", "sadness", "darkness", "weakness", "fitness"]`,
      "topic-related": `For "happy": ["emotion", "mood", "feeling", "smile", "laughter"] ← CANNOT replace "happy", just related topic. For "sad": ["emotion", "tear", "cry", "depression", "grief"] ← CANNOT replace "sad". For "computer": ["keyboard", "mouse", "monitor", "technology", "internet"]`,
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 使用 mini 版本：成本降低 94%，品質足夠
      messages: [
        {
          role: "system",
          content: `You are a vocabulary expert helping students learn English words. 

CRITICAL DISTINCTION between categories:
- SYNONYMS: Words that can SUBSTITUTE the target word in sentences (same meaning, interchangeable)
- TOPIC-RELATED: Words from the same semantic field but CANNOT substitute the target word (related concepts, not interchangeable)

Always use the substitution test to verify if a word is a synonym or just topic-related.

Generate related words if they exist. If there are no appropriate related words for a category, return an empty array.`,
        },
        {
          role: "user",
          content: `Task: Generate ${categoryDescriptions[category]} for the word "${word}".

Example: ${examples[category]}

${category === "idioms" ? `IMPORTANT: For idioms, ALL idioms must contain the word "${word}" in them. If no idioms exist with this word, return an empty array.` : ""}

${category === "derivatives" ? `CRITICAL for derivatives:
- ONLY include attested word forms you can find in major learner dictionaries such as Oxford Learner's Dictionaries, Cambridge, Merriam-Webster, Collins, or Longman.
- Do NOT invent or guess rare spellings (e.g., "cakelet", "caker").
- Prefer common inflectional forms (plural, past tense, comparative, adverb form) and widely used derivations with standard affixes (e.g., "-ness", "-ly", "-able").
- If unsure whether a form is real or lacks reliable evidence, exclude it.
- If no trustworthy derivatives exist, return an empty array.` : ""}

${category === "synonyms" ? `CRITICAL for synonyms - Use the SUBSTITUTION TEST:
- ✓ CORRECT: Words that can REPLACE "${word}" in sentences. Test: "I feel ${word}" → "I feel [synonym]" should work.
- ✗ WRONG: Topic-related words that describe the same theme but CANNOT replace the word.
- Example for "happy": ✓ "joyful", "cheerful" (can say "I feel joyful") ✗ "emotion", "smile" (cannot say "I feel emotion")
- Example for "sad": ✓ "unhappy", "miserable", "sorrowful" (can say "I feel miserable") ✗ "tear", "cry", "depression" (cannot say "I feel tear")` : ""}

${category === "topic-related" ? `CRITICAL for topic-related words - OPPOSITE of synonyms:
- ✓ CORRECT: Words from the same topic/field that CANNOT replace "${word}" but are discussed together.
- ✗ WRONG: Synonyms that can replace the word.
- Example for "happy": ✓ "emotion", "mood", "feeling", "smile", "laughter" (related concepts) ✗ "joyful", "cheerful" (these are synonyms)
- Example for "sad": ✓ "emotion", "tear", "cry", "depression", "grief" (related concepts) ✗ "unhappy", "miserable" (these are synonyms)
- Example for "computer": ✓ "keyboard", "mouse", "monitor", "internet", "technology" (related devices/concepts)` : ""}

${category === "collocations" ? `IMPORTANT for collocations:
- If "${word}" is a VERB:
  * INTRANSITIVE VERB: Return common preposition combinations (e.g., "look at", "look for", "look after")
  * TRANSITIVE VERB: Return common object combinations (e.g., "make a decision", "take action", "give advice")
- If "${word}" is a NOUN:
  * Return common adjective + noun combinations (e.g., "tough decision", "final decision")
  * Return common verb + noun combinations where this noun is the object (e.g., "make a decision", "reach a decision")` : ""}

Instructions:
- Generate as many ACCURATE ${categoryDescriptions[category]} as you can find (up to 7 words maximum)
- Only include words that are truly related to "${word}" in the "${category}" category
${category === "synonyms" ? `- VERIFY each synonym: Can you say "I am/feel ${word}" → "I am/feel [word]"? If NO, it's NOT a synonym.` : ""}
${category === "topic-related" ? `- VERIFY each word: Can it REPLACE "${word}" in sentences? If YES, it's a synonym (WRONG category). Only include words that CANNOT replace "${word}".` : ""}
- If the word doesn't have a ${category === "prefix" || category === "suffix" ? category : `meaningful ${category} relationship`}, return an empty array
- Do not include the original word "${word}" by itself
- Quality over quantity - it's better to return fewer accurate words than to force irrelevant ones

For each candidate, assign two scores between 0 and 1:
- "similarity": how strongly the word matches the target word in meaning within this category (1.0 = perfect match)
- "usage": how frequently the word or phrase appears in contemporary English (1.0 = extremely common)

Ranking rules:
1. Order primarily by higher similarity.
2. When similarity ties (difference < 0.05), place the word with higher usage earlier.
3. Do not include items with similarity lower than 0.4.

Return a JSON object:
{
  "words": [
    {
      "word": "word1",
      "similarity": 0.92,
      "usage": 0.78
    }
  ]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const items = parsed.words || [];

    const cleaned = Array.isArray(items)
      ? items
          .filter(
            (item: any) =>
              item &&
              typeof item.word === "string" &&
              typeof item.similarity === "number" &&
              item.similarity >= 0.4
          )
          .map((item: any) => ({
            word: item.word.trim(),
            similarity: Math.max(0, Math.min(1, Number(item.similarity))),
            usage:
              typeof item.usage === "number"
                ? Math.max(0, Math.min(1, Number(item.usage)))
                : 0,
          }))
          .filter((item) => item.word.length > 0)
      : [];

    cleaned.sort((a, b) => {
      if (Math.abs(b.similarity - a.similarity) > 0.05) {
        return b.similarity - a.similarity;
      }
      return b.usage - a.usage;
    });

    const words = cleaned.map((item) => item.word).slice(0, 7);
    
    console.log(`✓ Generated ${words.length} ${category} for "${word}":`, words.length > 0 ? words : "[No related words found]");
    
    return words.slice(0, 7);
  } catch (error) {
    console.error("Error generating related words:", error);
    throw new Error("Failed to generate related words");
  }
}

// ============================================
// 2. EXAMPLES: Generate Example Sentences
// ============================================

export async function generateExampleSentences(
  query: string,
  sensesCount: number = 2,
  phraseCount: number = 1
): Promise<any> {
  try {
    const systemPrompt = `你是英語教學專家，專門為學習者生成高品質、自然的例句。

你的任務：
1. 根據詞義（sense）、慣用語（idiom）、搭配詞（collocation）生成英文例句
2. 為每個例句提供準確的繁體中文翻譯（臺灣用語）
3. 標註每個例句的難度（A2/B1/B2/C1）、主題、長度

規則：
- 例句必須包含目標詞或其屈折形式
- 慣用語/搭配詞必須整串完整出現
- 難度分級：A2（基礎）、B1（進階）、B2（中高）、C1（高級）
- 主題：daily-life, school, work, travel, health, tech, news, social
- 長度：short (6-10詞)、medium (11-18詞)、long (19-28詞)
- 同一詞義的例句不得使用完全相同的難度+主題+長度組合
- 翻譯要自然、忠實，使用臺灣用語
- 例句要實用、自然，避免生硬

輸出格式：
僅輸出單一 JSON 物件，不要額外文字。結構如下：

{
  "query": "查詢的單字",
  "senses": [
    {
      "sense_id": "唯一ID",
      "pos": "詞性（n./v./adj./adv./prep./phr./pron./aux.）",
      "gloss_zh": "繁體中文翻譯（詞彙翻譯，如：創造；製造）",
      "gloss": "英文簡短定義",
      "examples": [
        {
          "en": "英文例句",
          "zh_tw": "繁體中文翻譯",
          "difficulty": "A2|B1|B2|C1",
          "topic": "主題",
          "length": "short|medium|long"
        }
      ]
    }
  ],
  "idioms": [
    {
      "phrase": "慣用語完整片語",
      "gloss_zh": "繁體中文翻譯（詞彙翻譯）",
      "gloss": "英文意思",
      "examples": [同上格式]
    }
  ],
  "collocations": [
    {
      "phrase": "搭配詞",
      "gloss_zh": "繁體中文翻譯（詞彙翻譯）",
      "examples": [同上格式]
    }
  ]
}

範例：
- create (verb) → gloss_zh: "創造；製造" （不是「製造或產生某物」）
- happy (adj) → gloss_zh: "快樂的；高興的" （不是「感到快樂的狀態」）
- break down (phr.v) → gloss_zh: "故障；崩潰" （不是「停止運作」）`;

    const userPrompt = `請為「${query}」生成例句。

要求：
- 找出該詞的 2-3 個**真正不同的**詞義，每個詞義生成 ${sensesCount} 個例句
- 找出 2-3 個常見慣用語（idiom），每個生成 ${phraseCount} 個例句
- 找出 2-3 個常見搭配詞（collocation），每個生成 ${phraseCount} 個例句

搭配詞（collocation）定義：
- 如果「${query}」是**動詞**：
  * 不及物動詞：返回常用的「介系詞搭配」（如 look at, look for, look after）
  * 及物動詞：返回常搭配的「受詞」（如 make a decision, take action, give advice）
- 如果「${query}」是**名詞**：
  * 返回常搭配的「形容詞」（如 tough decision, final decision）
  * 返回「以此名詞為受詞的動詞」（如 make a decision, reach a decision）

如果該詞沒有常見的慣用語或搭配詞，可以返回空陣列。

重要：不要重複相同意思的詞義！
- 如果兩個詞義本質上是相同的（例如：「最近」和「近來」都表示 recently），只需要列出一個
- 只有在詞義真正不同時才分開列出（例如：「set」作為動詞「設定」vs 作為名詞「集合」）

重要：
- gloss_zh 必須是「詞彙翻譯」，不是定義解釋
  ✓ 正確：create → "創造；製造"
  ✗ 錯誤：create → "製造或產生某物的行為"
  ✓ 正確：traffic → "交通；車流"
  ✗ 錯誤：traffic → "道路上的車輛移動"
- 每個 sense 必須包含 gloss_zh（繁體中文翻譯）和 gloss（英文定義）
- 每個 idiom 必須包含 gloss_zh（繁體中文翻譯）和 gloss（英文意思）
- 每個 collocation 必須包含 gloss_zh（繁體中文翻譯）
- 中文翻譯要簡潔，用分號分隔多個意思

確保：
1. 例句涵蓋不同難度（A2/B1/B2/C1）
2. 例句涵蓋不同主題
3. 例句有不同長度（short/medium/long）
4. 翻譯準確自然，使用臺灣用語
5. 輸出為標準 JSON，格式完全符合上述結構`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 保持 4o：例句品質很重要
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    console.log(`✓ Generated examples for "${query}":`, {
      senses: parsed.senses?.length || 0,
      idioms: parsed.idioms?.length || 0,
      collocations: parsed.collocations?.length || 0,
    });
    
    return parsed;
  } catch (error: any) {
    console.error("Error generating example sentences:", error);
    
    // 提供更詳細的錯誤訊息
    let errorMessage = "Failed to generate example sentences";
    
    if (error.response) {
      // OpenAI API 回應錯誤
      console.error("OpenAI API error response:", {
        status: error.response.status,
        data: error.response.data,
      });
      
      if (error.response.status === 401) {
        errorMessage = "OpenAI API 金鑰無效或過期，請檢查 .env 設定";
      } else if (error.response.status === 429) {
        errorMessage = "OpenAI API 配額用盡或請求過於頻繁，請稍後再試";
      } else if (error.response.status === 500) {
        errorMessage = "OpenAI API 伺服器錯誤，請稍後再試";
      } else {
        errorMessage = `OpenAI API 錯誤: ${error.response.data?.error?.message || error.message}`;
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = "無法連線到 OpenAI API，請檢查網路連線";
    } else if (error.message) {
      errorMessage = `例句生成失敗: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

// ============================================
// 3. FLASHCARDS: Generate Batch Definitions
// ============================================

export async function generateBatchDefinitions(
  words: string[]
): Promise<Array<{ word: string; definition: string; partOfSpeech: string }>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 使用 mini 版本：翻譯任務成本降低 94%
      messages: [
        {
          role: "system",
          content: `你是英中雙語詞彙專家。提供準確的台灣繁體中文「詞彙翻譯」。`,
        },
        {
          role: "user",
          content: `為以下英文單字提供台灣繁體中文翻譯：${words.join(", ")}

對每個單字返回：
- "word": 原始英文單字
- "definition": 繁體中文翻譯，格式為「詞性代號. 翻譯」，多個詞性用換行分隔
- "partOfSpeech": 主要詞性的英文縮寫（n., v., adj., adv., prep., pron., aux., phr. 等）

重要：definition 格式規則！
1. 必須是「詞彙翻譯」，不是定義解釋
2. 每個詞性單獨一行，格式：「詞性代號. 翻譯」
3. 詞性代號必須用英文：n., v., adj., adv., prep., pron., aux., phr. 等
4. partOfSpeech 欄位也必須用英文縮寫

範例：
  ✓ 正確：
    top → definition: "n. 頂端；最高位\nadj. 最高的", partOfSpeech: "n., adj."
  ✓ 正確：
    create → definition: "v. 創造；製造", partOfSpeech: "v."
  ✓ 正確：
    happy → definition: "adj. 快樂的；高興的", partOfSpeech: "adj."
  ✗ 錯誤：
    create → partOfSpeech: "動詞"（應該用 "v."）
  ✗ 錯誤：
    create → definition: "創造；製造"（缺少詞性代號）

返回 JSON：
{
  "definitions": [
    {
      "word": "top",
      "definition": "n. 頂端；最高位\nadj. 最高的",
      "partOfSpeech": "n., adj."
    },
    {
      "word": "happy",
      "definition": "adj. 快樂的；高興的",
      "partOfSpeech": "adj."
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
      .map((def: any) => {
        // Remove duplicate POS tags (e.g., "phr., phr." -> "phr.")
        let cleanedPos = def.partOfSpeech;
        if (cleanedPos && (cleanedPos.includes(',') || cleanedPos.includes('、'))) {
          const posParts = cleanedPos.split(/[,、]/).map((p: string) => p.trim()).filter(Boolean);
          const uniqueParts = Array.from(new Set(posParts));
          cleanedPos = uniqueParts.join(', ');
        }
        
        return {
          word: def.word,
          // Keep full definition - no arbitrary truncation
          definition: def.definition,
          partOfSpeech: cleanedPos || "未知",
        };
      });
    
    console.log(`✓ Generated ${validDefinitions.length} definitions out of ${words.length} words`);
    
    return validDefinitions;
  } catch (error) {
    console.error("Error generating batch definitions:", error);
    throw new Error("Failed to generate batch definitions");
  }
}

// ============================================
// 4. SYNONYMS: Generate Synonym Comparison
// ============================================

export async function generateSynonymComparison(
  query: string
): Promise<any> {
  try {
    const systemPrompt = `你是英語詞彙專家，專門幫助學習者理解同義字之間的細微差異。

你的任務：
1. 找出該單字的主要同義字（3-7 個，有多少算多少，不要強求）
2. 為每個同義字說明與原字的主要差異（用繁體中文）
3. 為每個同義字提供 2 個例句（英文 + 繁體中文翻譯）

規則：
- 同義字必須是真正的同義詞，不是相關詞
- 按相似度由高到低排序（最相似的在前）
- 如果該字的同義字不多，返回 3-5 個即可；如果很多，最多返回 7 個
- 品質優先：寧可少而精，不要為了湊數而加入勉強的同義字
- 差異說明要簡潔（20-40 字），用繁體中文（臺灣用語）
- 例句要自然、實用，能清楚展現該同義字的特點
- 例句的中文翻譯要準確、自然

輸出格式：
僅輸出單一 JSON 物件，不要額外文字。結構如下：

{
  "query": "查詢的單字",
  "synonyms": [
    {
      "word": "同義字",
      "pos": "詞性（n./v./adj./adv./prep./pron./aux./phr.）",
      "similarity": 0.95,
      "difference_zh": "與原字的主要差異（繁體中文說明）",
      "examples": [
        {
          "en": "英文例句",
          "zh_tw": "繁體中文翻譯"
        },
        {
          "en": "英文例句",
          "zh_tw": "繁體中文翻譯"
        }
      ]
    }
  ]
}

範例：
查詢 "happy" 的同義字：
- joyful (adj., 0.90) - 強調充滿喜悅，程度比 happy 更強烈
- cheerful (adj., 0.85) - 強調樂觀開朗的態度，帶有積極向上的感覺
- delighted (adj., 0.80) - 表示極度高興，通常因特定事件而感到愉悅
- content (adj., 0.75) - 強調滿足、知足的狀態，較為平靜
- pleased (adj., 0.70) - 表示對某事感到滿意或高興`;

    const userPrompt = `請為「${query}」找出同義字並說明差異。

要求：
- 找出 3-7 個真正的同義字（有多少算多少，不要硬湊）
- 每個同義字必須標註詞性（pos: n., v., adj., adv., prep., pron., aux., phr.）
- 按相似度由高到低排序（similarity: 0.0-1.0，最相似為 1.0）
- 每個同義字提供繁體中文的差異說明（20-40字）
- 每個同義字提供 2 個例句（英文 + 繁體中文翻譯）
- 例句要能展現該同義字的特點和用法
- 使用臺灣繁體中文用語
- 品質優先：如果同義字不多，3-5 個也可以

輸出為標準 JSON，格式完全符合上述結構。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 保持 4o：同義詞比較需要深度語義理解
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    console.log(`✓ Generated ${parsed.synonyms?.length || 0} synonyms for "${query}"`);
    
    return parsed;
  } catch (error: any) {
    console.error("Error generating synonym comparison:", error);
    
    // 提供更詳細的錯誤訊息
    let errorMessage = "Failed to generate synonym comparison";
    
    if (error.response) {
      console.error("OpenAI API error response:", {
        status: error.response.status,
        data: error.response.data,
      });
      
      if (error.response.status === 401) {
        errorMessage = "OpenAI API 金鑰無效或過期，請檢查 .env 設定";
      } else if (error.response.status === 429) {
        errorMessage = "OpenAI API 配額用盡或請求過於頻繁，請稍後再試";
      } else if (error.response.status === 500) {
        errorMessage = "OpenAI API 伺服器錯誤，請稍後再試";
      } else {
        errorMessage = `OpenAI API 錯誤: ${error.response.data?.error?.message || error.message}`;
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = "無法連線到 OpenAI API，請檢查網路連線";
    } else if (error.message) {
      errorMessage = `同義字生成失敗: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}
