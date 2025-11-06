/**
 * Translation Queue System
 * 
 * Handles asynchronous Chinese translation of dictionary entries.
 * Uses a simple in-memory queue for single-instance deployment.
 * 
 * Flow:
 * 1. Word lookup returns English immediately
 * 2. Translation job is queued
 * 3. Worker processes jobs in background
 * 4. Database is updated when translation completes
 */

import { db } from "./db";
import { words } from "@shared/schema";
import { eq } from "drizzle-orm";
import { translateWordSenses } from "./ai-translator";

interface TranslationJob {
  lemma: string;
  priority: number;  // Higher = more urgent
  addedAt: number;
}

class TranslationQueue {
  private queue: TranslationJob[] = [];
  private processing = false;
  private processingLemmas = new Set<string>();

  /**
   * Add a word to the translation queue
   */
  enqueue(lemma: string, priority: number = 5): void {
    // Don't queue if already processing or queued
    if (this.processingLemmas.has(lemma)) {
      console.log(`Translation already in progress for: ${lemma}`);
      return;
    }

    if (this.queue.some(job => job.lemma === lemma)) {
      console.log(`Translation already queued for: ${lemma}`);
      return;
    }

    const job: TranslationJob = {
      lemma,
      priority,
      addedAt: Date.now(),
    };

    this.queue.push(job);
    
    // Sort by priority (higher first), then by addedAt (older first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.addedAt - b.addedAt;
    });

    console.log(`✓ Queued translation for "${lemma}" (priority: ${priority}, queue size: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process translation jobs from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      
      if (!job) {
        break;
      }

      this.processingLemmas.add(job.lemma);

      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Failed to process translation job for "${job.lemma}":`, error);
      } finally {
        this.processingLemmas.delete(job.lemma);
      }
    }

    this.processing = false;
  }

  /**
   * Process a single translation job
   */
  private async processJob(job: TranslationJob): Promise<void> {
    const startTime = Date.now();
    console.log(`📝 Processing translation for "${job.lemma}"...`);

    try {
      // Fetch word entry from database
      const [wordEntry] = await db
        .select()
        .from(words)
        .where(eq(words.lemma, job.lemma))
        .limit(1);

      if (!wordEntry) {
        console.error(`Word not found in database: ${job.lemma}`);
        return;
      }

      // Skip if already translated
      if (wordEntry.zhReady) {
        console.log(`Word already translated: ${job.lemma}`);
        return;
      }

      // Extract senses for translation
      const senses = wordEntry.senses as any[];
      
      if (!senses || senses.length === 0) {
        console.warn(`No senses to translate for: ${job.lemma}`);
        return;
      }

      // Call AI translator with strict translation-only prompt
      const translatedSenses = await translateWordSenses(wordEntry.headword, senses);

      // Merge translations back into senses
      const mergedSenses = senses.map((sense, index) => ({
        ...sense,
        defZhTw: translatedSenses[index]?.defZhTw || sense.defZhTw,
        examples: (sense.examples || []).map((ex: any, exIndex: number) => ({
          ...ex,
          zhTw: translatedSenses[index]?.examples?.[exIndex]?.zhTw || ex.zhTw,
        })),
        collocations: (sense.collocations || []).map((coll: any, collIndex: number) => ({
          ...coll,
          zhTw: translatedSenses[index]?.collocations?.[collIndex]?.zhTw || coll.zhTw,
        })),
        notesZhTw: translatedSenses[index]?.notesZhTw || sense.notesZhTw,
      }));

      // Update database
      await db
        .update(words)
        .set({
          senses: mergedSenses,
          zhReady: true,
          updatedAt: new Date(),
        })
        .where(eq(words.lemma, job.lemma));

      const duration = Date.now() - startTime;
      console.log(`✅ Translation complete for "${job.lemma}" (${duration}ms, ${translatedSenses.length} senses)`);

    } catch (error) {
      console.error(`Translation error for "${job.lemma}":`, error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { queueSize: number; processing: boolean; processingCount: number } {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      processingCount: this.processingLemmas.size,
    };
  }
}

// Singleton queue instance
export const translationQueue = new TranslationQueue();
