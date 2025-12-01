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
import { ensureTraditional } from "./utils/chinese.js";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ============================================
// 1. MIND MAP: Generate Related Words
// ============================================

// Category descriptions for better AI prompts
const categoryDescriptions: Record<WordCategory, string> = {
  derivatives:
    "attested derivational forms (e.g., noun, adjective, adverb variants) that create new dictionary headwords; exclude mere inflections (plural, tense, participle)",
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
  category: WordCategory,
  existingWords: string[] = []
): Promise<string[]> {
  try {
    const examples: Record<WordCategory, string> = {
      derivatives: `For "happy": ["happiness", "unhappiness", "unhappy"]`,
      synonyms: `For "happy": ["joyful", "cheerful", "content", "pleased", "delighted"] ← CAN replace "happy". For "sad": ["unhappy", "miserable", "sorrowful", "dejected", "gloomy"] ← CAN replace "sad"`,
      antonyms: `For "happy": ["sad", "unhappy", "miserable", "depressed", "gloomy"]`,
      collocations: `For "make" (transitive verb): ["make a decision", "make progress", "make sense", "make time", "make an effort"]. For "look" (intransitive): ["look at", "look for", "look after", "look into"]. For "decision" (noun): ["make a decision", "tough decision", "final decision"]`,
      idioms: `For "happy": ["happy as a clam", "happy camper", "happy medium", "trigger happy", "happy hour"]`,
      root: `For "dictionary": ["diction", "dictate", "dictator", "predict", "verdict"]`,
      prefix: `For "unhappy": ["unable", "uncertain", "unfair", "unkind", "unusual"]`,
      suffix: `For "happiness": ["kindness", "sadness", "darkness", "weakness", "fitness"]`,
      "topic-related": `For "happy": ["emotion", "mood", "feeling", "smile", "laughter"] ← CANNOT replace "happy", just related topic. For "sad": ["emotion", "tear", "cry", "depression", "grief"] ← CANNOT replace "sad". For "computer": ["keyboard", "mouse", "monitor", "technology", "internet"]`,
    };

    const normalizedExistingWords = Array.isArray(existingWords)
      ? existingWords
          .filter((w) => typeof w === "string")
          .map((w) => w.trim())
          .filter((w) => w.length > 0)
      : [];

    if (!normalizedExistingWords.includes(word)) {
      normalizedExistingWords.push(word);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 升級完整 4o：提升心智圖精準度
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

${category === "idioms" ? `IMPORTANT for idioms:
- **CRITICAL DISTINCTION**: Idioms are NON-LITERAL, figurative expressions (meaning cannot be inferred from the words)
- **DO NOT** include collocations (literal meaning combinations) - those belong in the collocations category
- ALL idioms must contain the word "${word}" in them. If no idioms exist with this word, return an empty array.
- **Phrasal Verbs**: Include phrasal verbs ONLY if they have non-literal meaning (e.g., "give up" = abandon, cannot infer from "give" + "up")
- **Exclude**: Literal phrasal verbs like "settle in" (can infer "settle into" from words) - these are collocations
- **Test**: Can you understand the meaning from the literal words? If NO (figurative) → idiom. If YES → collocation.
- Examples: "settle the score" (figurative: get revenge) → idiom ✓, "settle in" (literal: settle into) → collocation ✗` : ""}

${category === "derivatives" ? `CRITICAL for derivatives:
- ONLY include derivational forms that appear as separate entries (headwords) in major learner dictionaries such as Oxford Learner's Dictionaries, Cambridge, Merriam-Webster, Collins, or Longman.
- Accept common derivational affixes (-y, -ly, -ful, -less, -ness, -able, -ous, -ment, -tion, etc.) and compounds built from the base word, as long as the resulting word is a dictionary headword.
- For each derivative provide the verifying dictionary name in a separate "dictionary" field. If you cannot name the dictionary source, exclude the word.
- EXCLUDE ALL inflectional changes: plural nouns, verb tenses/participles, comparative/superlative adjectives, -ly adverbs formed from the same root, or other grammatical inflections. These are NOT derivatives.
- EXCLUDE invented, rare, or unattested forms. If the word is not an established dictionary headword, DO NOT include it.
- If you cannot confirm any valid derivatives, return an empty array and add "_reason": "no verified derivatives" to the JSON.` : ""}

${normalizedExistingWords.length > 0 ? `ALREADY PROVIDED WORDS (do NOT repeat): ${JSON.stringify(normalizedExistingWords)}` : ""}

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
- **CRITICAL DISTINCTION**: Collocations are LITERAL meaning combinations (meaning can be inferred from the words)
- **DO NOT** include idioms (non-literal, figurative expressions) - those belong in the idioms category
- If "${word}" is a VERB:
  * INTRANSITIVE VERB: Return common preposition combinations with LITERAL meaning (e.g., "look at", "settle in", "set up")
  * TRANSITIVE VERB: Return common object combinations with LITERAL meaning (e.g., "make a decision", "settle a dispute")
- If "${word}" is a NOUN:
  * Return common adjective + noun combinations (e.g., "tough decision", "final decision")
  * Return common verb + noun combinations where this noun is the object (e.g., "make a decision", "reach a decision")
- **Phrasal Verbs**: Include phrasal verbs ONLY if they have literal meaning (e.g., "settle in" = settle into a place, "set up" = establish)
- **Exclude**: Non-literal phrasal verbs like "give up" (cannot infer "abandon" from "give" + "up") - these are idioms` : ""}

${category === "collocations" ? `ABSOLUTE RULE for collocations:
- Every collocation MUST explicitly contain the base word "${word}" (with its preposition, modifier, or object). Examples: "restrict access", "restrict someone", "restrict from doing".
- **Test**: Can you understand the meaning from the literal words? If YES → collocation. If NO (figurative) → idiom.
- Examples: "settle in" (literal: settle into) → collocation ✓, "settle the score" (figurative: get revenge) → idiom ✗
- DO NOT output synonyms, related concepts, idioms, or collocations that omit "${word}". If you cannot find valid collocations that include "${word}", return an empty array.` : ""}

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
      "usage": 0.78${category === "derivatives" ? `,
      "dictionary": "Oxford Learner's Dictionaries"` : ""}
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

    const lowerExistingWords = new Set(
      normalizedExistingWords.map((w) => w.toLowerCase())
    );

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

    const seen = new Set<string>();
    const words = cleaned
      .map((item) => item.word)
      .filter((w) => {
        const lower = w.toLowerCase();
        if (lowerExistingWords.has(lower) || seen.has(lower)) {
          return false;
        }
        seen.add(lower);
        return true;
      })
      .slice(0, 7);
    
    console.log(`✓ Generated ${words.length} ${category} for "${word}":`, words.length > 0 ? words : "[No related words found]");
    
    return words.slice(0, 7);
  } catch (error) {
    console.error("Error generating related words:", error);
    throw new Error("Failed to generate related words");
  }
}


// ============================================
// 2. EXAMPLES: Generate Example Sentences (Parallelized)
// ============================================

// Phase 1: Structure Analysis
async function generateWordStructure(query: string, sensesCount: number, phraseCount: number): Promise<any> {
  const systemPrompt = `你是英語教學專家。請為單字「${query}」分析其詞義結構。
  
你的任務：找出該詞的「詞義」、「慣用語」和「搭配詞」。
*絕對不要* 生成例句，只要列出項目即可。

規則：
1. 找出 2-3 個真正不同的詞義 (Senses)
2. 找出 1-5 個常見慣用語 (Idioms)
   - 如果該單字確實有很多慣用語，盡量找出 3-5 個
   - 如果該單字慣用語較少，找出 1-2 個即可
   - **絕對不要**為了達到數量而生成不常見、不準確的慣用語
   - 質量優先於數量，只生成真正常見、實用的慣用語
   - **重要區分**：慣用語必須是非字面意思的（比喻性），意思不能從單詞字面推斷
   - **絕對不要**包含搭配詞（字面意思的組合）
   - 判斷標準：如果短語的意思不能從單詞字面意思推斷（比喻性）→ 慣用語
   - 短語動詞：只包含非字面意思的（如 "give up" = 放棄，不能從 "give" + "up" 推斷）
   - 排除：字面意思的短語動詞（如 "settle in" = 安頓下來，可以從字面推斷）→ 這些是搭配詞
   - 例如："settle the score" → 字面是「解決分數」，實際是「算帳」→ 慣用語 ✓
   - 例如："settle in" → 字面是「安頓在...裡」，實際也是「安頓下來」→ 不是慣用語 ✗
3. 找出 3-15 個常見搭配詞 (Collocations)，必須包含：
   - **重要區分**：搭配詞必須是字面意思的組合（意思可以從單詞推斷）
   - **絕對不要**包含慣用語（非字面意思的短語）
   - 如果該單字確實有很多常見搭配（如常用動詞、名詞），盡量找出 5-15 個
   - 如果該單字搭配詞較少（如專業名詞、抽象名詞、專有名詞），找出 3-5 個即可
   - **絕對不要**為了達到數量而生成不常見、不準確或勉強的搭配詞
   - 質量優先於數量，只生成真正常見、實用的搭配
   - 包含以下類型：
     * 短語動詞 (Phrasal Verbs)：只包含字面意思的（如 "settle in" = 安頓下來，可以從字面推斷）
     * 介詞搭配模式：動詞 + 介詞結構（如 "give sth to sb", "give sb sth", "result in", "result from"）
     * 固定搭配：動詞 + 名詞/形容詞（如 "make a decision", "settle a dispute", "important decision"）
   - 排除：非字面意思的短語動詞（如 "give up" = 放棄，不能從字面推斷）→ 這些是慣用語
   - 根據單字的詞性，生成不同類型的搭配詞：
     * 及物動詞：列出常見受詞和介詞搭配（如 "give money", "give sth to sb", "settle a dispute"）
     * 不及物動詞：列出常見介系詞搭配和短語動詞（如 "result in", "settle in", "set up"）
     * 名詞：列出常見動詞搭配和形容詞搭配（如 "make a decision", "important decision"）
     * 形容詞：列出常見名詞搭配（如 "important decision", "serious problem"）
   - 每個搭配詞提供整個片語的繁體中文翻譯（不是逐詞翻譯，而是片語整體的意思）
   - 判斷標準：如果短語的意思可以從單詞字面意思推斷 → 搭配詞
   - 例如："settle in" → 字面是「安頓在...裡」，實際也是「安頓下來」→ 搭配詞 ✓
   - 例如："settle a dispute" → 字面是「解決爭議」，實際也是「解決爭議」→ 搭配詞 ✓
   - 例如："set up" → 字面是「設置上去」，實際是「建立」（字面延伸）→ 搭配詞 ✓
   - 例如："settle the score" → 字面是「解決分數」，實際是「算帳」→ 不是搭配詞 ✗（這是慣用語）
4. 提供繁體中文翻譯 (gloss_zh) 和英文定義 (gloss)

輸出格式 (JSON Only):
{
  "senses": [
    { "pos": "n./v./...", "gloss_zh": "中文", "gloss": "English definition" }
  ],
  "idioms": [
    { "phrase": "idiom phrase", "gloss_zh": "中文", "gloss": "English meaning" }
  ],
  "collocations": [
    { "phrase": "collocation phrase", "gloss_zh": "整個片語的繁體中文翻譯" }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 1000,
  });

  return JSON.parse(response.choices[0]?.message?.content || "{}");
}

// Phase 2: Parallel Sentence Generation
async function generateSentencesForUnint(
  type: "sense" | "idiom" | "collocation",
  item: any, 
  query: string, 
  count: number
): Promise<any> {
  const target = type === "sense" ? `單字 "${query}" (當作 "${item.gloss_zh}" 解釋)` 
               : type === "idiom" ? `慣用語 "${item.phrase}"`
               : `搭配詞 "${item.phrase}"`;

  const prompt = `請為 ${target} 造 ${count} 個英文例句。
  
要求：
1. 例句要自然、實用，使用臺灣繁體中文翻譯。
2. **重要**：${count} 個例句的難度 (A2-C1)、主題必須不同，長度建議不同。
3. 標註難度 (A2-C1)、主題、長度。
4. 格式 (JSON): { "examples": [{ "en": "...", "zh_tw": "...", "difficulty": "...", "topic": "...", "length": "..." }] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Keep using gpt-4o for quality
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return { ...item, examples: result.examples || [] };
}

export async function generateExampleSentences(
  query: string,
  sensesCount: number = 2,
  phraseCount: number = 1
): Promise<any> {
  try {
    console.log(`🚀 Starting parallel generation for "${query}"...`);
    
    // Step 1: Get Structure (Fast)
    const structure = await generateWordStructure(query, sensesCount, phraseCount);
    console.log(`✓ Structure analyzed: ${structure.senses?.length || 0} senses, ${structure.idioms?.length || 0} idioms`);

    // Step 2: Parallel Generation
    const tasks: Promise<any>[] = [];

    // Senses
    if (structure.senses) {
      structure.senses.forEach((sense: any) => {
        tasks.push(generateSentencesForUnint("sense", sense, query, sensesCount));
      });
    }

    // Idioms
    if (structure.idioms) {
      structure.idioms.forEach((idiom: any) => {
        tasks.push(generateSentencesForUnint("idiom", idiom, query, phraseCount));
      });
    }

    // Collocations - No longer generate examples, just use the structure data
    // (Collocations are now stored without examples)

    // Wait for all
    const rawResults = await Promise.all(tasks);
    
    // Sanitize Results
    const sanitizedResults = rawResults.map((item: any) => ({
      ...item,
      examples: Array.isArray(item.examples) ? item.examples.map((ex: any) => ({
        en: String(ex.en || ""),
        zh_tw: String(ex.zh_tw || ex.zh || ""),
        difficulty: String(ex.difficulty || "B1"),
        topic: String(ex.topic || "daily-life"),
        length: String(ex.length || "medium")
      })) : []
    }));

    // Reassemble
    // Collocations are now from structure directly (no examples generated)
    const collocations = (structure.collocations || []).map((col: any) => ({
      phrase: String(col.phrase || ""),
      gloss_zh: String(col.gloss_zh || "")
    }));

    const finalResponse = {
      query,
      senses: sanitizedResults.filter((r: any) => r.pos && r.gloss), 
      idioms: sanitizedResults.filter((r: any) => r.phrase && r.gloss && !r.pos), 
      collocations: collocations, 
    };

    console.log(`✓ Parallel generation completed for "${query}"`);
    return finalResponse;

  } catch (error: any) {
    console.error("Error in generateExampleSentences:", error);
    throw new Error("Failed to generate example sentences");
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
    const canonicalPosMap: Record<string, string> = {
      n: "n.",
      noun: "n.",
      v: "v.",
      verb: "v.",
      adj: "adj.",
      adjective: "adj.",
      adv: "adv.",
      adverb: "adv.",
      prep: "prep.",
      preposition: "prep.",
      pron: "pron.",
      pronoun: "pron.",
      aux: "aux.",
      auxiliary: "aux.",
      phr: "phr.",
      phrase: "phr.",
      idiom: "phr.",
      idioms: "phr.",
      collocation: "phr.",
      int: "int.",
      interjection: "int.",
      conj: "conj.",
      conjunction: "conj.",
      det: "det.",
      determiner: "det.",
      num: "num.",
      numeral: "num.",
      modal: "modal.",
    };

    const normalizePosToken = (token: string) => {
      const trimmed = token.trim().replace(/\.+$/, "");
      if (!trimmed) return null;
      const key = trimmed.toLowerCase();
      return canonicalPosMap[key] || `${trimmed}.`;
    };

    const isRecognizedPosToken = (token: string | null) => {
      if (!token) return false;
      const normalized = token.replace(/\./g, "").toLowerCase();
      return canonicalPosMap[normalized] !== undefined;
    };

    const sanitizeDefinitionLine = (line: string) => {
      const trimmed = (line ?? "").trim();
      if (!trimmed) {
        return "";
      }

      const tokens = trimmed.split(/\s+/);
      const posTokens: string[] = [];
      let translationStartIndex = 0;

      for (let i = 0; i < tokens.length; i++) {
        const normalized = normalizePosToken(tokens[i]);
        if (!normalized) {
          translationStartIndex = i;
          break;
        }

        // Only treat as POS token if it matches canonical list
        if (isRecognizedPosToken(normalized)) {
          if (!posTokens.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
            posTokens.push(normalized);
          }
          translationStartIndex = i + 1;
        } else {
          translationStartIndex = i;
          break;
        }
      }

      const translation = tokens.slice(translationStartIndex).join(" ").trim();
      const prefix = posTokens.join(" ");

      if (!prefix) {
        return translation;
      }

      return translation ? `${prefix} ${translation}` : prefix;
    };

    const validDefinitions = rawDefinitions
      .filter((def: any) => def.word && def.definition && def.partOfSpeech)
      .map((def: any) => {
        // Remove duplicate POS tags (e.g., "phr., phr." -> "phr.")
        let cleanedPos = def.partOfSpeech;
        if (typeof cleanedPos === "string") {
          const posParts = cleanedPos
            .split(/[,、\s]+/)
            .map((p: string) => normalizePosToken(p) || p.trim())
            .filter(Boolean) as string[];
          const uniqueParts: string[] = [];
          for (const part of posParts) {
            if (!uniqueParts.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
              uniqueParts.push(part);
            }
          }
          cleanedPos = uniqueParts.join(", ");
        }

        if (typeof cleanedPos === "string") {
          cleanedPos = ensureTraditional(cleanedPos);
        }

        let sanitizedDefinition = String(def.definition)
          .split(/\r?\n/)
          .map(sanitizeDefinitionLine)
          .filter((line) => line && line.trim().length > 0)
          .join("\n");

        sanitizedDefinition = sanitizedDefinition
          .split("\n")
          .map((line) => ensureTraditional(line))
          .join("\n");

        // Remove duplicated POS prefixes that might slip through (e.g., "phr. phr.")
        sanitizedDefinition = sanitizedDefinition
          .replace(/\b([A-Za-z]{1,10}\.)\s+\1\b/g, "$1")
          .replace(/\b([A-Za-z]{1,10}\.),\s*\1\b/g, "$1");
        
        return {
          word: def.word,
          // Keep full definition - no arbitrary truncation
          definition: ensureTraditional(sanitizedDefinition),
          partOfSpeech: typeof cleanedPos === "string" && cleanedPos.trim().length > 0 ? cleanedPos : "未知",
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
// 4. SYNONYMS: Generate Synonym Comparison (Parallelized)
// ============================================

// Phase 1: Synonym Selection
async function generateSynonymStructure(query: string): Promise<any> {
  const systemPrompt = `你是英語詞彙專家。請為單字「${query}」找出同義字。

你的任務：
1. 找出 3-7 個真正的同義字 (Synonyms)
2. 為每個同義字提供：詞性、相似度、繁體中文使用時機說明
3. *絕對不要* 生成例句

規則：
- 按相似度由高到低排序
- 使用時機說明要簡潔 (20-40字)
- 說明該字的使用情境和特點：什麼時候用這個字？在什麼場合使用？與其他相似字有什麼差異？
- **絕對不要**在說明中提到其他字（包括輸入字或其他同義字）的名稱
- 直接描述該字本身的特點：使用時機、正式程度、常見搭配、使用場合、語體風格、語義差異等
- 例如：不要寫「比XX更強烈」，而是直接寫「語氣較強烈」或「用於表達較強烈的情緒」
- 例如：不要寫「與XX的差異是...」，而是直接描述該字的使用時機和特點

輸出格式 (JSON Only):
{
  "synonyms": [
    { 
      "word": "...", 
      "pos": "n./v./...", 
      "similarity": 0.95, 
      "difference_zh": "..." 
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 1000,
  });

  return JSON.parse(response.choices[0]?.message?.content || "{}");
}

// Phase 2: Parallel Example Generation for Synonyms
async function generateSynonymExamples(synonym: any, query: string): Promise<any> {
  const prompt = `請為同義字 "${synonym.word}" 造 2 個英文例句。

使用時機說明：「${synonym.difference_zh}」

要求：
1. 例句必須符合上述使用時機說明，能展現該字的使用情境和特點
2. 例句要能體現該字的使用時機、正式程度、使用場合、語義差異等特徵
3. 提供繁體中文翻譯
4. **重要**：2 個例句的難度 (A2-C1)、主題必須不同，長度建議不同
5. 格式 (JSON): { "examples": [{ "en": "...", "zh_tw": "...", "difficulty": "...", "topic": "...", "length": "..." }] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Keep using gpt-4o
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return { ...synonym, examples: result.examples || [] };
}

// Phase 2.5: Generate examples, POS, and usage context for the original query word
async function generateQueryWordData(query: string, referencePos?: string): Promise<any> {
  const prompt = `請為單字 "${query}" 提供以下資訊：
1. 該單字的主要詞性（如 n., v., adj., adv. 等）
2. 繁體中文使用時機說明（20-40字）：說明該字的使用情境和特點，什麼時候用這個字？在什麼場合使用？與其他相似字有什麼差異？**絕對不要**在說明中提到其他字的名稱，直接描述該字本身的特點
3. 2 個英文例句，要能展現該字的使用情境和特點，並提供繁體中文翻譯
4. **重要**：2 個例句的難度 (A2-C1)、主題必須不同，長度建議不同
5. 標註難度 (A2-C1)、主題、長度

格式 (JSON): { 
  "pos": "n./v./adj./...",
  "usage_zh": "使用時機說明...",
  "examples": [{ "en": "...", "zh_tw": "...", "difficulty": "...", "topic": "...", "length": "..." }]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    word: query,
    pos: result.pos || referencePos || "unknown",
    similarity: 1.0,
    difference_zh: result.usage_zh || "輸入字本身",
    examples: result.examples || []
  };
}

export async function generateSynonymComparison(
  query: string
): Promise<any> {
  try {
    console.log(`🚀 Starting parallel synonym generation for "${query}"...`);

    // Step 1: Structure
    const structure = await generateSynonymStructure(query);
    console.log(`✓ Synonyms found: ${structure.synonyms?.length || 0}`);

    if (!structure.synonyms || structure.synonyms.length === 0) {
      return { query, synonyms: [] };
    }

    // Step 2: Parallel Examples
    const tasks = structure.synonyms.map((syn: any) => generateSynonymExamples(syn, query));
    const rawResults = await Promise.all(tasks);

    // Sanitize Results
    const sanitizedResults = rawResults.map((item: any) => ({
      word: String(item.word || ""),
      pos: String(item.pos || "unknown"),
      similarity: typeof item.similarity === 'number' ? item.similarity : parseFloat(item.similarity) || 0.5,
      difference_zh: String(item.difference_zh || item.difference || "無差異說明"),
      examples: Array.isArray(item.examples) ? item.examples.map((ex: any) => ({
        en: String(ex.en || ""),
        zh_tw: String(ex.zh_tw || ex.zh || ""),
        difficulty: ex.difficulty || undefined,
        topic: ex.topic || undefined,
        length: ex.length || undefined,
      })) : []
    })).filter((item: any) => item.word && item.examples.length > 0); // Filter out empty results

    // Step 3: Check if query word is already in results, if not, add it
    const queryLower = query.toLowerCase().trim();
    const hasQueryWord = sanitizedResults.some((item: any) => 
      item.word.toLowerCase().trim() === queryLower
    );

    let finalSynonyms = sanitizedResults;

    if (!hasQueryWord) {
      console.log(`📝 Adding query word "${query}" to results...`);
      // Get reference POS from first synonym if available
      const referencePos = sanitizedResults.length > 0 ? sanitizedResults[0].pos : undefined;
      const queryWordData = await generateQueryWordData(query, referencePos);
      
      // Add query word at the beginning with similarity 1.0
      finalSynonyms = [queryWordData, ...sanitizedResults];
    } else {
      // If query word exists, move it to the beginning and set similarity to 1.0
      const queryWordIndex = sanitizedResults.findIndex((item: any) => 
        item.word.toLowerCase().trim() === queryLower
      );
      if (queryWordIndex > 0) {
        const queryWordItem = sanitizedResults[queryWordIndex];
        queryWordItem.similarity = 1.0;
        finalSynonyms = [
          queryWordItem,
          ...sanitizedResults.slice(0, queryWordIndex),
          ...sanitizedResults.slice(queryWordIndex + 1)
        ];
      } else if (queryWordIndex === 0) {
        // Already at the beginning, just update similarity
        finalSynonyms[0].similarity = 1.0;
      }
    }

    const finalResponse = {
      query,
      synonyms: finalSynonyms
    };

    console.log(`✓ Parallel synonym generation completed for "${query}" (${finalSynonyms.length} words total)`);
    return finalResponse;

  } catch (error: any) {
    console.error("Error generating synonym comparison:", error);
    throw new Error("Failed to generate synonym comparison");
  }
}

