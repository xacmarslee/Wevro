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

${category === "idioms" ? `IMPORTANT: For idioms, ALL idioms must contain the word "${word}" in them. If no idioms exist with this word, return an empty array.` : ""}

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
- If "${word}" is a VERB:
  * INTRANSITIVE VERB: Return common preposition combinations (e.g., "look at", "look for", "look after")
  * TRANSITIVE VERB: Return common object combinations (e.g., "make a decision", "take action", "give advice")
- If "${word}" is a NOUN:
  * Return common adjective + noun combinations (e.g., "tough decision", "final decision")
  * Return common verb + noun combinations where this noun is the object (e.g., "make a decision", "reach a decision")` : ""}

${category === "collocations" ? `ABSOLUTE RULE for collocations:
- Every collocation MUST explicitly contain the base word "${word}" (with its preposition, modifier, or object). Examples: "restrict access", "restrict someone", "restrict from doing".
- DO NOT output synonyms, related concepts, or collocations that omit "${word}". If you cannot find valid collocations that include "${word}", return an empty array.` : ""}

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
2. 找出 1-2 個常見慣用語 (Idioms)
3. 找出 1-2 個常見搭配詞 (Collocations)
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
    { "phrase": "collocation phrase", "gloss_zh": "中文" }
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
2. 標註難度 (A2-C1)、主題、長度。
3. 格式 (JSON): { "examples": [{ "en": "...", "zh_tw": "...", "difficulty": "...", "topic": "...", "length": "..." }] }`;

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

    // Collocations
    if (structure.collocations) {
      structure.collocations.forEach((col: any) => {
        tasks.push(generateSentencesForUnint("collocation", col, query, phraseCount));
      });
    }

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
    const finalResponse = {
      query,
      senses: sanitizedResults.filter((r: any) => r.pos && r.gloss), 
      idioms: sanitizedResults.filter((r: any) => r.phrase && r.gloss && !r.pos), 
      collocations: sanitizedResults.filter((r: any) => r.phrase && !r.gloss && !r.pos), 
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
2. 為每個同義字提供：詞性、相似度、繁體中文差異說明
3. *絕對不要* 生成例句

規則：
- 按相似度由高到低排序
- 差異說明要簡潔 (20-40字)

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
  const prompt = `請為同義字 "${synonym.word}" (相對於原字 "${query}" 的意思) 造 2 個英文例句。

要求：
1. 例句要能展現該同義字的特點，與 "${query}" 的細微差異。
2. 提供繁體中文翻譯。
3. 格式 (JSON): { "examples": [{ "en": "...", "zh_tw": "..." }] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Keep using gpt-4o
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return { ...synonym, examples: result.examples || [] };
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
        zh_tw: String(ex.zh_tw || ex.zh || "")
      })) : []
    })).filter((item: any) => item.word && item.examples.length > 0); // Filter out empty results

    const finalResponse = {
      query,
      synonyms: sanitizedResults
    };

    console.log(`✓ Parallel synonym generation completed for "${query}"`);
    return finalResponse;

  } catch (error: any) {
    console.error("Error generating synonym comparison:", error);
    throw new Error("Failed to generate synonym comparison");
  }
}

