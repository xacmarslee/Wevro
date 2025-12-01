import { 
  words, wordSenses, examples, synonyms, idioms, idiomExamples, collocations, collocationExamples, searchHistory 
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and, inArray, sql } from "drizzle-orm";
import type { ExamplesResponse, SynonymComparisonResponse } from "../../shared/schema.js";

/**
 * Parse and store ExamplesResponse into granular database tables
 */
export async function storeExamplesResult(userId: string, data: ExamplesResponse) {
  // 1. Store or get Word
  const [word] = await db.insert(words)
    .values({ text: data.query })
    .onConflictDoUpdate({ target: words.text, set: { text: data.query } })
    .returning();

  const snapshotData: any = {
    exampleIds: [],
    idiomExampleIds: [],
    collocationIds: [] // Changed from collocationExampleIds to collocationIds
  };

  // 2. Process Senses & Examples
  for (const sense of data.senses) {
    // Store Sense
    const [senseRecord] = await db.insert(wordSenses)
      .values({
        wordId: word.id,
        pos: sense.pos,
        glossZh: sense.gloss_zh,
        glossEn: sense.gloss
      })
      .returning();

    // Store Examples for this Sense
    for (const ex of sense.examples) {
      const [exampleRecord] = await db.insert(examples)
        .values({
          senseId: senseRecord.id,
          sentenceEn: ex.en,
          sentenceZh: ex.zh_tw,
          source: "ai"
        })
        .returning();
      
      snapshotData.exampleIds.push(exampleRecord.id);
    }
  }

  // 3. Process Idioms
  if (data.idioms) {
    for (const idiom of data.idioms) {
      const [idiomRecord] = await db.insert(idioms)
        .values({
          wordId: word.id,
          phrase: idiom.phrase,
          glossZh: idiom.gloss_zh,
          glossEn: idiom.gloss,
          source: "ai"
        })
        .returning();

      for (const ex of idiom.examples) {
        const [exRecord] = await db.insert(idiomExamples)
          .values({
            idiomId: idiomRecord.id,
            sentenceEn: ex.en,
            sentenceZh: ex.zh_tw
          })
          .returning();
        
        snapshotData.idiomExampleIds.push(exRecord.id);
      }
    }
  }

  // 4. Process Collocations (no longer store examples)
  if (data.collocations) {
    for (const col of data.collocations) {
      const [colRecord] = await db.insert(collocations)
        .values({
          wordId: word.id,
          phrase: col.phrase,
          glossZh: col.gloss_zh,
          source: "ai"
        })
        .returning();

      // No longer store collocation examples
      snapshotData.collocationIds.push(colRecord.id);
    }
  }

  // 5. Create History Record
  console.log("💾 Creating history record in storeExamplesResult for user:", userId);
  try {
    await db.insert(searchHistory).values({
      userId,
      wordId: word.id,
      queryType: "examples",
      snapshotData: snapshotData
    });
    console.log("✅ History record created successfully in storeExamplesResult");
  } catch (error) {
    console.error("❌ Error creating history record in storeExamplesResult:", error);
    // Don't throw, so at least the data is stored even if history fails
  }

  return snapshotData;
}

/**
 * Parse and store SynonymComparisonResponse into granular database tables
 */
export async function storeSynonymsResult(userId: string, data: SynonymComparisonResponse) {
  // 1. Store or get Word
  const [word] = await db.insert(words)
    .values({ text: data.query })
    .onConflictDoUpdate({ target: words.text, set: { text: data.query } })
    .returning();

  const snapshotData: any = {
    synonymIds: []
  };

  // 2. Process Synonyms
  if (data.synonyms) {
    for (const syn of data.synonyms) {
      // For synonyms, we might need a more complex structure if we want to reuse them effectively.
      // Currently our schema for `synonyms` table includes the example sentences directly.
      // Ideally we should separate them if we want full granularity, but for now fitting the schema:
      
      // Since the schema defines sentenceEn/Zh as single text fields, but data has array of 2 examples...
      // Wait, the schema definition for `synonyms` table has `sentenceEn` and `sentenceZh` as TEXT.
      // But `SynonymComparisonResponse` has `examples` array.
      // Let's just pick the first example for the main record or change schema to support multiple?
      // Re-checking schema.ts:
      /*
        export const synonyms = pgTable("synonyms", {
          ...
          sentenceEn: text("sentence_en").notNull(),
          sentenceZh: text("sentence_zh").notNull(),
          ...
        });
      */
      // It seems designed for 1 example per synonym entry in the DB row?
      // But the API returns 2 examples.
      // Strategy: Insert 2 rows into `synonyms` table for the same synonym word? 
      // Or just store the first one?
      // Let's store multiple rows if we have multiple examples, effectively treating them as "usage examples of this synonym".
      
      for (const ex of syn.examples) {
        const [synRecord] = await db.insert(synonyms)
          .values({
            wordId: word.id,
            synonymWord: syn.word,
            pos: syn.pos, // Store pos from AI response
            difference: syn.difference_zh, // This is repeated but fine for now
            sentenceEn: ex.en,
            sentenceZh: ex.zh_tw,
            source: "ai"
          })
          .returning();
        
        snapshotData.synonymIds.push(synRecord.id);
      }
    }
  }

  // 3. Create History Record
  console.log("💾 Creating history record in storeSynonymsResult for user:", userId);
  try {
    await db.insert(searchHistory).values({
      userId,
      wordId: word.id,
      queryType: "synonyms",
      snapshotData: snapshotData
    });
    console.log("✅ History record created successfully in storeSynonymsResult");
  } catch (error) {
    console.error("❌ Error creating history record in storeSynonymsResult:", error);
  }

  return snapshotData;
}

