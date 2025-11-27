import { db } from "../db.js";
import { 
  searchHistory, words, examples, synonyms, idioms, idiomExamples, collocations, collocationExamples
} from "../../shared/schema.js";
import type { SenseWithExamples } from "../../shared/schema.js";
import { eq, desc, and, inArray } from "drizzle-orm";
import { fetchCachedExamples, fetchCachedSynonyms } from "./content-fetcher.js";

/**
 * Get recent search history for a user
 */
export async function getUserSearchHistory(userId: string, limit = 50) {
  const history = await db.query.searchHistory.findMany({
    where: eq(searchHistory.userId, userId),
    orderBy: [desc(searchHistory.createdAt)],
    limit: limit,
    with: {
      word: true
    }
  });

  return history.map(h => ({
    id: h.id,
    word: h.word.text,
    queryType: h.queryType,
    createdAt: h.createdAt
  }));
}

/**
 * Delete a specific history item
 */
export async function deleteHistoryItem(userId: string, historyId: string) {
  const [deleted] = await db.delete(searchHistory)
    .where(and(
      eq(searchHistory.id, historyId),
      eq(searchHistory.userId, userId)
    ))
    .returning();
  
  return !!deleted;
}

/**
 * Get detailed result for a history item
 * This reconstructs the view from the snapshot data or re-fetches from cache
 */
export async function getHistoryDetail(userId: string, historyId: string) {
  const historyItem = await db.query.searchHistory.findFirst({
    where: and(
      eq(searchHistory.id, historyId),
      eq(searchHistory.userId, userId)
    ),
    with: {
      word: true
    }
  });

  if (!historyItem) return null;

  // In a full implementation, we would use historyItem.snapshotData to pull EXACT IDs.
  // For now, to keep it simple and working with our random pool logic,
  // we will re-fetch from the cache using the word text.
  // This effectively gives us a "cached view" of that word.
  // PRO: Simpler implementation.
  // CON: Might show slightly different examples if the pool is large (but current pool is small/1).
  // FUTURE: Use snapshotData.exampleIds to WHERE in (ids)
  
  if (historyItem.queryType === 'examples') {
    const snapshot = historyItem.snapshotData as any || {};
    
    if (snapshot.exampleIds && Array.isArray(snapshot.exampleIds) && snapshot.exampleIds.length > 0) {
        // Reconstruct from specific IDs
        // 1. Fetch Senses & Examples
        const exampleRecords = await db.query.examples.findMany({
            where: inArray(examples.id, snapshot.exampleIds),
            with: {
                sense: true
            }
        });
        
        // Group by sense
        const sensesMap = new Map<string, SenseWithExamples>();
        for (const ex of exampleRecords) {
            if (!ex.sense) continue;
            
            if (!sensesMap.has(ex.sense.id)) {
                sensesMap.set(ex.sense.id, {
                    sense_id: ex.sense.id,
                    pos: ex.sense.pos,
                    gloss_zh: ex.sense.glossZh,
                    gloss: ex.sense.glossEn,
                    examples: []
                });
            }
            
            sensesMap.get(ex.sense.id)?.examples.push({
                en: ex.sentenceEn,
                zh_tw: ex.sentenceZh,
                difficulty: "B1", 
                topic: "daily-life",
                length: "medium"
            });
        }
        
        // 2. Fetch Idioms
        let idiomsList: any[] = [];
        if (snapshot.idiomExampleIds && Array.isArray(snapshot.idiomExampleIds) && snapshot.idiomExampleIds.length > 0) {
            const idiomExRecords = await db.query.idiomExamples.findMany({
                where: inArray(idiomExamples.id, snapshot.idiomExampleIds),
                with: { idiom: true }
            });
            
            const idiomsMap = new Map<string, any>();
            for (const ex of idiomExRecords) {
                if (!ex.idiom) continue;
                if (!idiomsMap.has(ex.idiom.id)) {
                    idiomsMap.set(ex.idiom.id, {
                        phrase: ex.idiom.phrase,
                        gloss_zh: ex.idiom.glossZh,
                        gloss: ex.idiom.glossEn,
                        examples: []
                    });
                }
                idiomsMap.get(ex.idiom.id).examples.push({
                    en: ex.sentenceEn,
                    zh_tw: ex.sentenceZh
                });
            }
            idiomsList = Array.from(idiomsMap.values());
        }
        
        // 3. Fetch Collocations
        let collocationsList: any[] = [];
        if (snapshot.collocationExampleIds && Array.isArray(snapshot.collocationExampleIds) && snapshot.collocationExampleIds.length > 0) {
            const colExRecords = await db.query.collocationExamples.findMany({
                where: inArray(collocationExamples.id, snapshot.collocationExampleIds),
                with: { collocation: true }
            });
            
            const colMap = new Map<string, any>();
            for (const ex of colExRecords) {
                if (!ex.collocation) continue;
                if (!colMap.has(ex.collocation.id)) {
                    colMap.set(ex.collocation.id, {
                        phrase: ex.collocation.phrase,
                        gloss_zh: ex.collocation.glossZh,
                        examples: []
                    });
                }
                colMap.get(ex.collocation.id).examples.push({
                    en: ex.sentenceEn,
                    zh_tw: ex.sentenceZh
                });
            }
            collocationsList = Array.from(colMap.values());
        }

        return {
            query: historyItem.word.text,
            senses: Array.from(sensesMap.values()),
            idioms: idiomsList,
            collocations: collocationsList
        };
    } else {
        // Fallback for old history records without snapshot data
        return await fetchCachedExamples(userId, historyItem.word.text);
    }

  } else if (historyItem.queryType === 'synonyms') {
    const snapshot = historyItem.snapshotData as any || {};
    
    if (snapshot.synonymIds && Array.isArray(snapshot.synonymIds) && snapshot.synonymIds.length > 0) {
        // Reconstruct exact synonym view
        const synonymRecords = await db.query.synonyms.findMany({
            where: inArray(synonyms.id, snapshot.synonymIds)
        });
        
        // Group by word
        const groupedMap = new Map<string, any>();
        
        for (const row of synonymRecords) {
            if (!groupedMap.has(row.synonymWord)) {
                groupedMap.set(row.synonymWord, {
                    word: row.synonymWord,
                    pos: row.pos || "unknown", // Use stored pos
                    similarity: 0.9,
                    difference_zh: row.difference,
                    examples: []
                });
            }
            groupedMap.get(row.synonymWord).examples.push({
                en: row.sentenceEn,
                zh_tw: row.sentenceZh
            });
        }
        
        return {
            query: historyItem.word.text,
            synonyms: Array.from(groupedMap.values())
        };
    } else {
        return await fetchCachedSynonyms(userId, historyItem.word.text);
    }
  }
  
  return null;
}

