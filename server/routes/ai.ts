import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import type { MindmapExpansionSnapshot } from "../storage.js";
import { storeExamplesResult, storeSynonymsResult } from "../utils/content-store.js";
import { fetchCachedExamples, fetchCachedSynonyms } from "../utils/content-fetcher.js";
import { generateRelatedWords, generateExampleSentences, generateBatchDefinitions, generateSynonymComparison } from "../ai-generators.js";
import {
  generateWordsRequestSchema,
  generateExamplesRequestSchema,
  generateSynonymsRequestSchema,
} from "../../shared/schema.js";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth.js";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

const router = Router();

// Generate related words for a category
router.post("/generate-words", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const validatedData = generateWordsRequestSchema.parse(req.body);

    let expansionSnapshot: MindmapExpansionSnapshot | undefined;

    try {
      expansionSnapshot = await storage.ensureMindmapExpansionAllowance(userId);
    } catch (error: any) {
      if (error?.code === "INSUFFICIENT_TOKENS") {
        const tokenBalance = Number(error.tokenBalance ?? 0);
        return res.status(402).json({
          error: "INSUFFICIENT_TOKENS",
          message:
            "Mind map expansion requires at least 0.5 tokens. Please recharge before expanding.",
          tokenBalance,
          requiredTokens: 0.5,
          usedMindmapExpansions: error.usedMindmapExpansions ?? 0,
        });
      }

      throw error;
    }

    const words = await generateRelatedWords(
      validatedData.word,
      validatedData.category,
      validatedData.existingWords
    );

    let tokenInfo:
      | {
          tokenBalance: number;
          usedMindmapExpansions: number;
          tokensCharged: number;
        }
      | undefined;

    if (words.length > 0) {
      try {
        tokenInfo = await storage.consumeMindmapExpansion(userId, expansionSnapshot);
      } catch (error: any) {
        if (error?.code === "INSUFFICIENT_TOKENS" || error?.message === "INSUFFICIENT_TOKENS") {
          const tokenBalance =
            Number(error?.tokenBalance ?? expansionSnapshot?.tokenBalance ?? 0);
          return res.status(402).json({
            error: "INSUFFICIENT_TOKENS",
            message:
              "Not enough tokens to complete this expansion. Please recharge and try again.",
            tokenBalance,
            requiredTokens: 0.5,
            usedMindmapExpansions:
              error?.usedMindmapExpansions ?? expansionSnapshot?.usedMindmapExpansions ?? 0,
          });
        }
        throw error;
      }
    }

    res.json({ words, tokenInfo });
  } catch (error: any) {
    console.error("Error in /api/generate-words:", error);
    res.status(500).json({
      error: "Failed to generate words",
      message: error.message,
    });
  }
});

// Generate example sentences for a word/phrase
router.post("/examples/generate", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const validatedData = generateExamplesRequestSchema.parse(req.body);
    const { query, counts } = validatedData;

    console.log(`📝 Generating examples for "${query}"...`);

    // Default counts if not provided
    const sensesCount = counts?.sense || 2;
    const phraseCount = counts?.phrase || 1;

    const tokensRequired = 2;

    // 1. Try to fetch from cache (Random Pool)
    try {
      const cachedExamples = await fetchCachedExamples(userId, query, { sense: sensesCount, phrase: phraseCount });
      if (cachedExamples) {
         console.log(`✨ Cache HIT for examples: "${query}"`);

         // Charge tokens even for cache hit
         try {
            const tokenInfo = await storage.consumeTokens(userId, tokensRequired, "exampleGeneration", {
              query,
              sensesCount,
              phraseCount,
              source: "cache"
            });
            
            return res.json({
              ...cachedExamples,
              tokenInfo
            });
         } catch (tokenError: any) {
            if (tokenError?.code === "INSUFFICIENT_TOKENS" || tokenError?.message === "INSUFFICIENT_TOKENS") {
               const tokenBalance = Number(tokenError?.tokenBalance ?? 0);
               return res.status(402).json({
                 error: "INSUFFICIENT_TOKENS",
                 message: "點數不足。例句生成每次扣除 2 點，請前往訂閱與點數頁面儲值。",
                 tokenBalance,
               });
            }
            throw tokenError;
         }
      }
      console.log(`💨 Cache MISS for examples: "${query}"`);
    } catch (cacheError) {
      console.error("Error fetching cached examples:", cacheError);
      // Continue to generation if cache fails
    }

    const quota = await storage.getUserQuota(userId);
    const tokenBalance = quota?.tokenBalance ?? 0;

    if (tokenBalance < tokensRequired) {
      return res.status(402).json({
        error: "INSUFFICIENT_TOKENS",
        message: "點數不足。例句生成每次扣除 2 點，請前往訂閱與點數頁面儲值。",
        tokenBalance,
      });
    }

    // Generate examples using OpenAI
    let examples;
    try {
      examples = await generateExampleSentences(query, sensesCount, phraseCount);
    } catch (genError: any) {
      console.error("Error in generateExampleSentences:", genError);
      // Re-throw to be caught by outer catch block
      throw genError;
    }

    let tokenInfo;
    const hasContent =
      (examples?.senses?.length ?? 0) > 0 ||
      (examples?.idioms?.length ?? 0) > 0 ||
      (examples?.collocations?.length ?? 0) > 0;

    if (hasContent) {
      try {
        tokenInfo = await storage.consumeTokens(userId, tokensRequired, "exampleGeneration", {
          query,
          sensesCount,
          phraseCount,
        });
        
        // Store result in granular DB (Async, don't block response)
        console.log("💾 Storing examples result for user:", userId);
        try {
          await storeExamplesResult(userId, examples);
          console.log("✅ storeExamplesResult completed successfully");
        } catch (err) {
          console.error("❌ Error storing examples result:", err);
        }

      } catch (tokenError: any) {
        console.error("Error consuming tokens:", tokenError);
        // Re-throw to be caught by outer catch block
        throw tokenError;
      }
    }

    console.log(`✅ Successfully generated examples for "${query}"`);
    res.json({
      ...examples,
      tokenInfo,
    });
  } catch (error: any) {
    console.error("❌ Error in /api/examples/generate:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    // Check for insufficient tokens error (from consumeTokens or other sources)
    if (
      (error instanceof Error && (error.message === "INSUFFICIENT_TOKENS" || (error as any).code === "INSUFFICIENT_TOKENS")) ||
      (error as any)?.code === "INSUFFICIENT_TOKENS"
    ) {
      const tokenBalance = Number((error as any)?.tokenBalance ?? 0);
      return res.status(402).json({
        error: "INSUFFICIENT_TOKENS",
        message: "點數不足。例句生成每次扣除 2 點，請前往訂閱與點數頁面儲值。",
        tokenBalance,
      });
    }

    // Log the full error for debugging
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    res.status(500).json({
      error: "Failed to generate examples",
      message: error instanceof Error ? error.message : (error as any)?.message || "無法生成例句，請稍後再試",
    });
  }
});

// Generate synonym comparison for a word
router.post("/synonyms/generate", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const validatedData = generateSynonymsRequestSchema.parse(req.body);
    const { query } = validatedData;

    console.log(`📝 Generating synonyms for "${query}"...`);

    const tokensRequired = 2;

    // 1. Try to fetch from cache
    try {
      const cachedSynonyms = await fetchCachedSynonyms(userId, query);
      if (cachedSynonyms) {
          console.log(`✨ Cache HIT for synonyms: "${query}"`);

          // Charge tokens even for cache hit
          try {
            const tokenInfo = await storage.consumeTokens(userId, tokensRequired, "synonymComparison", {
              query,
              source: "cache"
            });

            return res.json({
                ...cachedSynonyms,
                tokenInfo
            });
          } catch (tokenError: any) {
            if (tokenError?.code === "INSUFFICIENT_TOKENS" || tokenError?.message === "INSUFFICIENT_TOKENS") {
               const tokenBalance = Number(tokenError?.tokenBalance ?? 0);
               return res.status(402).json({
                 error: "INSUFFICIENT_TOKENS",
                 message: "點數不足。同義字比較每次扣除 2 點，請前往訂閱與點數頁面儲值。",
                 tokenBalance,
               });
            }
            throw tokenError;
          }
      }
      console.log(`💨 Cache MISS for synonyms: "${query}"`);
    } catch (cacheError) {
      console.error("Error fetching cached synonyms:", cacheError);
    }

    const quota = await storage.getUserQuota(userId);
    const tokenBalance = quota?.tokenBalance ?? 0;

    if (tokenBalance < tokensRequired) {
      return res.status(402).json({
        error: "INSUFFICIENT_TOKENS",
        message: "點數不足。同義字比較每次扣除 2 點，請前往訂閱與點數頁面儲值。",
        tokenBalance,
      });
    }

    // Generate synonym comparison using OpenAI
    let synonyms;
    try {
      synonyms = await generateSynonymComparison(query);
    } catch (genError: any) {
      console.error("Error in generateSynonymComparison:", genError);
      // Re-throw to be caught by outer catch block
      throw genError;
    }

    let tokenInfo;
    if ((synonyms?.synonyms?.length ?? 0) > 0) {
      try {
        tokenInfo = await storage.consumeTokens(userId, tokensRequired, "synonymComparison", {
          query,
          synonymCount: synonyms.synonyms.length,
        });

        // Store result in granular DB
        console.log("💾 Storing synonyms result for user:", userId);
        try {
          await storeSynonymsResult(userId, synonyms);
          console.log("✅ storeSynonymsResult completed successfully");
        } catch (err) {
          console.error("❌ Error storing synonyms result:", err);
        }

      } catch (tokenError: any) {
        console.error("Error consuming tokens:", tokenError);
        // Re-throw to be caught by outer catch block
        throw tokenError;
      }
    }

    console.log(`✅ Successfully generated synonyms for "${query}"`);
    res.json({
      ...synonyms,
      tokenInfo,
    });
  } catch (error: any) {
    console.error("❌ Error in /api/synonyms/generate:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    // Check for insufficient tokens error (from consumeTokens or other sources)
    if (
      (error instanceof Error && (error.message === "INSUFFICIENT_TOKENS" || (error as any).code === "INSUFFICIENT_TOKENS")) ||
      (error as any)?.code === "INSUFFICIENT_TOKENS"
    ) {
      const tokenBalance = Number((error as any)?.tokenBalance ?? 0);
      return res.status(402).json({
        error: "INSUFFICIENT_TOKENS",
        message: "點數不足。同義字比較每次扣除 2 點，請前往訂閱與點數頁面儲值。",
        tokenBalance,
      });
    }

    // Log the full error for debugging
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    res.status(500).json({
      error: "Failed to generate synonyms",
      message: error instanceof Error ? error.message : (error as any)?.message || "無法生成同義字，請稍後再試",
    });
  }
});

export default router;

