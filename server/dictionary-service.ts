/**
 * Dictionary Service
 * 
 * Coordinates dictionary lookup, caching, and translation.
 * 
 * Flow:
 * 1. Check database cache
 * 2. If found → return immediately
 * 3. If not found → fetch from dictionary API
 * 4. Save English data to database
 * 5. Queue background translation
 * 6. Return English data (Chinese will be ready later)
 */

import { db } from "./db";
import { words } from "@shared/schema";
import { eq } from "drizzle-orm";
import { type WordEntry } from "@shared/schema";
import { fetchFromDictionaryAPI, normalizeLemma } from "./dictionary-api";
import { translationQueue } from "./translation-queue";

/**
 * Lookup a word - returns English immediately, queues Chinese translation
 * 
 * @param word - The word to look up
 * @param priority - Translation queue priority (1-10, higher = more urgent)
 * @returns WordEntry with English content (zhReady indicates if Chinese is available)
 */
export async function lookupWord(word: string, priority: number = 5): Promise<WordEntry | null> {
  const lemma = normalizeLemma(word);
  
  console.log(`🔍 Looking up word: "${word}" (normalized: "${lemma}")`);

  try {
    // 1. Check database cache
    const cached = await getWordFromCache(lemma);
    
    if (cached) {
      console.log(`✓ Cache hit for "${lemma}" (zhReady: ${cached.zhReady})`);
      
      // If Chinese translation not ready, queue it (in case it was missed)
      if (!cached.zhReady) {
        translationQueue.enqueue(lemma, priority);
      }
      
      return cached;
    }

    console.log(`Cache miss for "${lemma}" - fetching from dictionary API...`);

    // 2. Fetch from dictionary API
    const wordEntry = await fetchFromDictionaryAPI(word);
    
    if (!wordEntry) {
      console.log(`Word not found in dictionary: "${lemma}"`);
      return null;
    }

    // 3. Save to database (English only)
    await saveWordToCache(wordEntry);

    // 4. Queue translation (async)
    translationQueue.enqueue(lemma, priority);

    console.log(`✓ Word "${lemma}" cached and queued for translation`);

    return wordEntry;

  } catch (error) {
    console.error(`Error in lookupWord for "${lemma}":`, error);
    throw error;
  }
}

/**
 * Get word from database cache
 */
async function getWordFromCache(lemma: string): Promise<WordEntry | null> {
  try {
    const [result] = await db
      .select()
      .from(words)
      .where(eq(words.lemma, lemma))
      .limit(1);

    if (!result) {
      return null;
    }

    // Convert database record to WordEntry
    const wordEntry: WordEntry = {
      lemma: result.lemma,
      headword: result.headword,
      phonetic: result.phonetic || undefined,
      audioUrl: result.audioUrl || undefined,
      origin: result.origin || undefined,
      senses: result.senses as any[],
      provider: result.provider as any,
      enReady: result.enReady,
      zhReady: result.zhReady,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return wordEntry;
  } catch (error) {
    console.error(`Error fetching from cache for "${lemma}":`, error);
    return null;
  }
}

/**
 * Save word entry to database cache
 * Uses INSERT ... ON CONFLICT to handle concurrent requests gracefully
 */
async function saveWordToCache(wordEntry: WordEntry): Promise<void> {
  try {
    await db.insert(words)
      .values({
        lemma: wordEntry.lemma,
        headword: wordEntry.headword,
        phonetic: wordEntry.phonetic || null,
        audioUrl: wordEntry.audioUrl || null,
        origin: wordEntry.origin || null,
        senses: wordEntry.senses as any,
        provider: wordEntry.provider as any,
        enReady: wordEntry.enReady,
        zhReady: wordEntry.zhReady,
      })
      .onConflictDoNothing();  // Ignore if another request already inserted it

    console.log(`✓ Saved "${wordEntry.lemma}" to cache`);
  } catch (error) {
    console.error(`Error saving to cache for "${wordEntry.lemma}":`, error);
    throw error;
  }
}

/**
 * Get translation queue status
 */
export function getQueueStatus() {
  return translationQueue.getStatus();
}

/**
 * Get word with real-time update check
 * Useful for polling/subscriptions to see when Chinese is ready
 */
export async function getWordStatus(word: string): Promise<{
  found: boolean;
  enReady: boolean;
  zhReady: boolean;
} | null> {
  const lemma = normalizeLemma(word);
  
  try {
    const [result] = await db
      .select({
        enReady: words.enReady,
        zhReady: words.zhReady,
      })
      .from(words)
      .where(eq(words.lemma, lemma))
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      found: true,
      enReady: result.enReady,
      zhReady: result.zhReady,
    };
  } catch (error) {
    console.error(`Error checking status for "${lemma}":`, error);
    return null;
  }
}
