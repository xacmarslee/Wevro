import { 
  words, wordSenses, examples, synonyms, idioms, idiomExamples, collocations, collocationExamples, searchHistory 
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and, inArray, sql, notInArray } from "drizzle-orm";
import type { ExamplesResponse, SynonymComparisonResponse, SenseWithExamples, IdiomWithExamples, CollocationWithExamples } from "../../shared/schema.js";

/**
 * Try to fetch cached examples for a query using a "Limited Random Pool" strategy.
 * 
 * Strategy:
 * 1. Check if we have enough data in the pool for this word.
 * 2. If yes, randomly select a subset of examples/senses to construct a response.
 * 3. Prioritize content the user hasn't seen recently (based on history).
 */
export async function fetchCachedExamples(userId: string, query: string, counts = { sense: 3, phrase: 2 }): Promise<ExamplesResponse | null> {
  // 1. Find the word
  const word = await db.query.words.findFirst({
    where: eq(words.text, query),
  });

  if (!word) return null;

  // 2. Get User's History to avoid repetition
  const userHistory = await db.query.searchHistory.findMany({
    where: and(
      eq(searchHistory.userId, userId),
      eq(searchHistory.wordId, word.id),
      eq(searchHistory.queryType, "examples")
    ),
    orderBy: (history, { desc }) => [desc(history.createdAt)],
    limit: 10 // Only look at last 10 searches to keep it fast
  });

  // Collect all seen IDs
  const seenExampleIds = new Set<string>();
  const seenIdiomExampleIds = new Set<string>();
  const seenCollocationExampleIds = new Set<string>();

  for (const record of userHistory) {
    const data = record.snapshotData as any;
    if (data?.exampleIds) data.exampleIds.forEach((id: string) => seenExampleIds.add(id));
    if (data?.idiomExampleIds) data.idiomExampleIds.forEach((id: string) => seenIdiomExampleIds.add(id));
    if (data?.collocationExampleIds) data.collocationExampleIds.forEach((id: string) => seenCollocationExampleIds.add(id));
  }

  // 3. Check Senses & Examples
  const senses = await db.query.wordSenses.findMany({
    where: eq(wordSenses.wordId, word.id),
    with: {
      examples: true
    }
  });

  if (senses.length === 0) return null;

  // Verify we have enough examples to form a valid response
  // We need at least some senses with examples.
  // Count examples that are NOT in the seen set
  let availableExamplesCount = 0;
  for (const sense of senses) {
    availableExamplesCount += sense.examples.filter(e => !seenExampleIds.has(e.id)).length;
  }
  
  if (availableExamplesCount < 3) {
    console.log(`Not enough unseen examples for "${query}" (Available: ${availableExamplesCount}, Seen: ${seenExampleIds.size})`);
    return null; // Threshold: if we have fewer than 3 unseen examples total, re-generate
  }

  // 4. Construct Response (Random Selection from UNSEEN)
  const resultSenses: SenseWithExamples[] = [];
  
  for (const sense of senses) {
    // Filter out seen examples first
    const unseenExamples = sense.examples.filter(e => !seenExampleIds.has(e.id));
    
    // Randomly pick 'counts.sense' examples from unseen ones
    const shuffled = [...unseenExamples].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, counts.sense);

    if (selected.length > 0) {
        resultSenses.push({
            sense_id: sense.id,
            pos: sense.pos,
            gloss_zh: sense.glossZh,
            gloss: sense.glossEn,
            examples: selected.map(e => ({
                id: e.id, // Temporary ID for snapshot tracking
                en: e.sentenceEn,
                zh_tw: e.sentenceZh,
                // map other optional fields if they existed in DB
                difficulty: "B1", // defaults
                topic: "daily-life",
                length: "medium"
            }))
        });
    }
  }

  // 5. Check Idioms
  const dbIdioms = await db.query.idioms.findMany({
    where: eq(idioms.wordId, word.id),
    with: {
      examples: true
    }
  });
  
  const resultIdioms: IdiomWithExamples[] = [];
  for (const idiom of dbIdioms) {
      // Filter out seen idiom examples
      const unseenExamples = idiom.examples.filter(e => !seenIdiomExampleIds.has(e.id));
      
      const shuffled = [...unseenExamples].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, counts.phrase);
      
      if (selected.length > 0) {
        resultIdioms.push({
            phrase: idiom.phrase,
            gloss_zh: idiom.glossZh,
            gloss: idiom.glossEn,
            examples: selected.map(e => ({
                id: e.id,
                en: e.sentenceEn,
                zh_tw: e.sentenceZh
            }))
        });
      }
  }

  // 6. Check Collocations
  const dbCollocations = await db.query.collocations.findMany({
    where: eq(collocations.wordId, word.id),
    with: {
      examples: true
    }
  });

  const resultCollocations: CollocationWithExamples[] = [];
  for (const col of dbCollocations) {
      // Filter out seen collocation examples
      const unseenExamples = col.examples.filter(e => !seenCollocationExampleIds.has(e.id));

      const shuffled = [...unseenExamples].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, counts.phrase);
      
      if (selected.length > 0) {
        resultCollocations.push({
            phrase: col.phrase,
            gloss_zh: col.glossZh,
            examples: selected.map(e => ({
                id: e.id,
                en: e.sentenceEn,
                zh_tw: e.sentenceZh
            }))
        });
      }
  }

  // 7. Record "Hit" in History (even if cached)
  const snapshotData = {
    exampleIds: resultSenses.flatMap(s => s.examples.map((e: any) => e.id)),
    idiomExampleIds: resultIdioms.flatMap(i => i.examples.map((e: any) => e.id)),
    collocationExampleIds: resultCollocations.flatMap(c => c.examples.map((e: any) => e.id))
  };

  try {
    console.log("💾 Cache HIT - Storing history for user:", userId);
    await db.insert(searchHistory).values({
      userId,
      wordId: word.id,
      queryType: "examples",
      snapshotData
    });
    console.log("✅ History recorded for cache hit");
  } catch (err) {
    console.error("❌ Error recording history for cache hit:", err);
  }

  // Clean up IDs from response before returning (to match interface)
  resultSenses.forEach((s: any) => s.examples.forEach((e: any) => delete e.id));
  resultIdioms.forEach((i: any) => i.examples.forEach((e: any) => delete e.id));
  resultCollocations.forEach((c: any) => c.examples.forEach((e: any) => delete e.id));

  return {
    query: word.text,
    senses: resultSenses,
    idioms: resultIdioms,
    collocations: resultCollocations
  };
}

/**
 * Try to fetch cached synonyms
 */
export async function fetchCachedSynonyms(userId: string, query: string): Promise<SynonymComparisonResponse | null> {
    const word = await db.query.words.findFirst({
        where: eq(words.text, query),
    });
    
    if (!word) return null;

    // Fetch synonyms
    const dbSynonyms = await db.query.synonyms.findMany({
        where: eq(synonyms.wordId, word.id)
    });

    // Get User's History for synonyms
    const userHistory = await db.query.searchHistory.findMany({
      where: and(
        eq(searchHistory.userId, userId),
        eq(searchHistory.wordId, word.id),
        eq(searchHistory.queryType, "synonyms")
      ),
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      limit: 10
    });

    const seenSynonymIds = new Set<string>();
    for (const record of userHistory) {
      const data = record.snapshotData as any;
      if (data?.synonymIds) data.synonymIds.forEach((id: string) => seenSynonymIds.add(id));
    }

    if (dbSynonyms.length < 3) return null; 

    // Group by synonym word to combine examples
    // DB stores: row1(wordA, ex1), row2(wordA, ex2)
    // Response needs: wordA { examples: [ex1, ex2] }
    const groupedMap = new Map<string, any>();
    const usedSynonymIds: string[] = [];
    let totalUnseenExamples = 0;

    // Shuffle synonyms first to add randomness
    const shuffledSynonyms = [...dbSynonyms].sort(() => 0.5 - Math.random());

    for (const row of shuffledSynonyms) {
        // Skip if this specific synonym entry (word+example pair) has been seen
        if (seenSynonymIds.has(row.id)) continue;

        totalUnseenExamples++;

        if (!groupedMap.has(row.synonymWord)) {
            groupedMap.set(row.synonymWord, {
                word: row.synonymWord,
                pos: row.pos || "unknown", // Use stored pos
                similarity: 0.9, // dummy
                difference_zh: row.difference,
                examples: []
            });
        }
        const entry = groupedMap.get(row.synonymWord);
        
        // Limit to 2 examples per synonym in the response
        if (entry.examples.length < 2) {
            entry.examples.push({
                en: row.sentenceEn,
                zh_tw: row.sentenceZh
            });
            usedSynonymIds.push(row.id);
        }
    }

    // If we don't have enough unseen content, fallback to generating new ones
    // Threshold: we want at least 3 distinct synonyms with content
    const validSynonymsCount = Array.from(groupedMap.values()).filter(s => s.examples.length > 0).length;
    
    if (validSynonymsCount < 3) {
       console.log(`Not enough unseen synonyms for "${query}" (Valid Synonyms: ${validSynonymsCount}, Seen IDs: ${seenSynonymIds.size})`);
       return null;
    }

    // Convert map to array and take random subset if too many
    // (Though we already shuffled inputs, so taking first N is fine)
    const synonymList = Array.from(groupedMap.values());
    
    if (synonymList.length === 0) return null;

    // Record history
    try {
      console.log("💾 Synonyms Cache HIT - Storing history for user:", userId);
      await db.insert(searchHistory).values({
          userId,
          wordId: word.id,
          queryType: "synonyms",
          snapshotData: { synonymIds: usedSynonymIds }
      });
      console.log("✅ History recorded for synonyms cache hit");
    } catch (err) {
      console.error("❌ Error recording history for synonyms cache hit:", err);
    }

    return {
        query: word.text,
        synonyms: synonymList
    };
}

