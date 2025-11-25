import type { Express } from "express";
import { randomUUID } from "crypto";
import { storage } from "./storage.js";
import type { MindmapExpansionSnapshot } from "./storage.js";
import { generateRelatedWords, generateExampleSentences, generateBatchDefinitions, generateSynonymComparison } from "./ai-generators.js";
import {
  generateWordsRequestSchema,
  generateExamplesRequestSchema,
  generateSynonymsRequestSchema,
  mindMapSchema,
  flashcardDeckSchema,
} from "../shared/schema.js";
import { z } from "zod";
import { firebaseAuthMiddleware, getFirebaseUserId } from "./firebaseAuth.js";
import { getUserByUid, deleteUser as deleteFirebaseUser } from "./firebaseAdmin.js";

// Insert schemas (omit auto-generated fields)
const insertMindMapSchema = mindMapSchema.omit({ id: true, userId: true, createdAt: true });
const insertFlashcardDeckSchema = flashcardDeckSchema.omit({ id: true, createdAt: true });
const updateMindMapSchema = mindMapSchema.partial();
const updateFlashcardDeckSchema = flashcardDeckSchema.partial();

// Helper function to get user ID from Firebase
function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

export async function registerRoutes(app: Express): Promise<void> {
  console.log('✅ Using Firebase Authentication');

  // Auth route: Get current user
  app.get('/api/auth/user', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Try to get user from database
      let user = await storage.getUser(userId);
      const isNewUser = !user;
      
      // If user doesn't exist in database, create from Firebase token data
      if (!user && req.firebaseUser) {
        // Use data from decoded token (no need for getUserByUid which requires Service Account)
        user = await storage.upsertUser({
          id: userId,
          email: req.firebaseUser.email || null,
          firstName: req.firebaseUser.name?.split(' ')[0] || null,
          lastName: req.firebaseUser.name?.split(' ').slice(1).join(' ') || null,
          profileImageUrl: req.firebaseUser.picture || null,
        });
        
        // REMOVED: quota verification logic here to avoid race conditions
        // getUserQuota call in /api/quota will handle initialization safely
      }
      
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ 
        message: "Failed to fetch user",
        details: error.message 
      });
    }
  });

  // Get user quota (tokens and plan)
  app.get('/api/quota', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const quota = await storage.getUserQuota(userId);
      res.json(quota);
    } catch (error: any) {
      console.error("Error fetching quota:", error);
      res.status(500).json({ 
        message: "Failed to fetch quota",
        // DEBUG: 回傳詳細錯誤資訊
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Check email verification and claim reward if eligible
  app.post('/api/auth/check-verification-reward', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get email verification status from Firebase Auth token
      const isEmailVerified = req.firebaseUser?.email_verified || false;
      
      // Sync verification status to database
      await storage.updateEmailVerificationStatus(userId, isEmailVerified);
      
      // Try to claim reward if eligible
      const result = await storage.claimVerificationReward(userId, isEmailVerified);
      
      if (result?.success) {
        res.json({
          success: true,
          rewardClaimed: true,
          tokenBalance: result.tokenBalance,
          message: 'Verification reward claimed successfully',
        });
      } else {
        res.json({
          success: false,
          rewardClaimed: result?.rewardClaimed || false,
          tokenBalance: result?.tokenBalance || 0,
          isEmailVerified,
          message: result?.message || 'Reward not eligible',
        });
      }
    } catch (error: any) {
      console.error("Error checking verification reward:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to check verification reward",
        error: error.message 
      });
    }
  });

  // Auth route: Delete user account
  app.delete('/api/auth/user', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Delete user from database (cascading delete via foreign keys)
      const dbDeleteSuccess = await storage.deleteUser(userId);
      if (!dbDeleteSuccess) {
        console.warn(`User ${userId} not found in database, continuing with Firebase deletion`);
      }
      
      // Delete user from Firebase
      try {
        await deleteFirebaseUser(userId);
      } catch (firebaseError: any) {
        // If Firebase user doesn't exist, that's okay (might have been deleted already)
        if (firebaseError?.code !== 'auth/user-not-found') {
          console.error("Error deleting Firebase user:", firebaseError);
          // Continue anyway if database deletion succeeded
          if (!dbDeleteSuccess) {
            throw firebaseError;
          }
        }
      }
      
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      const errorMessage = error?.message || "Failed to delete account";
      const errorCode = error?.code || "UNKNOWN_ERROR";
      res.status(500).json({ 
        message: errorMessage,
        code: errorCode,
        error: "Failed to delete account" 
      });
    }
  });
  // Generate related words for a category
  app.post("/api/generate-words", firebaseAuthMiddleware, async (req: any, res) => {
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
  app.post("/api/examples/generate", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = generateExamplesRequestSchema.parse(req.body);
      const { query, counts } = validatedData;

      console.log(`📝 Generating examples for "${query}"...`);

      // Default counts if not provided
      const sensesCount = counts?.sense || 2;
      const phraseCount = counts?.phrase || 1;

      const quota = await storage.getUserQuota(userId);
      const tokenBalance = quota?.tokenBalance ?? 0;
      const tokensRequired = 2;

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

  // NEW: Generate synonym comparison for a word
  app.post("/api/synonyms/generate", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = generateSynonymsRequestSchema.parse(req.body);
      const { query } = validatedData;

      console.log(`📝 Generating synonyms for "${query}"...`);

      const quota = await storage.getUserQuota(userId);
      const tokenBalance = quota?.tokenBalance ?? 0;
      const tokensRequired = 2;

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

  // ===== QUERY/TRANSLATION ENDPOINT REMOVED =====
  // This endpoint was not being used by the frontend and has been removed.
  // If needed in the future, consider implementing a simpler translation service.

  // Mind map CRUD endpoints (protected)
  app.get("/api/mindmaps", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const mindMaps = await storage.getAllMindMaps(userId);
      res.json(mindMaps);
    } catch (error: any) {
      console.error("Error in GET /api/mindmaps:", error);
      res.status(500).json({ error: "Failed to fetch mind maps" });
    }
  });

  app.get("/api/mindmaps/:id", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const mindMap = await storage.getMindMap(req.params.id, userId);
      if (!mindMap) {
        res.status(404).json({ error: "Mind map not found" });
        return;
      }
      res.json(mindMap);
    } catch (error: any) {
      console.error("Error in GET /api/mindmaps/:id:", error);
      res.status(500).json({ error: "Failed to fetch mind map" });
    }
  });

  app.post("/api/mindmaps", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertMindMapSchema.parse(req.body);
      const mindMap = await storage.createMindMap({ ...validatedData, userId }, userId);
      res.json(mindMap);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in POST /api/mindmaps:", error);
      res.status(500).json({ error: "Failed to create mind map" });
    }
  });

  app.patch("/api/mindmaps/:id", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = updateMindMapSchema.parse(req.body);
      const mindMap = await storage.updateMindMap(req.params.id, userId, validatedData);
      if (!mindMap) {
        res.status(404).json({ error: "Mind map not found" });
        return;
      }
      res.json(mindMap);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in PATCH /api/mindmaps/:id:", error);
      res.status(500).json({ error: "Failed to update mind map" });
    }
  });

  app.delete("/api/mindmaps/:id", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.deleteMindMap(req.params.id, userId);
      if (!success) {
        res.status(404).json({ error: "Mind map not found" });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in DELETE /api/mindmaps/:id:", error);
      res.status(500).json({ error: "Failed to delete mind map" });
    }
  });

  // Flashcard deck CRUD endpoints (protected)
  app.get("/api/flashcards", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const decks = await storage.getAllFlashcardDecks(userId);
      res.json(decks);
    } catch (error: any) {
      console.error("Error in GET /api/flashcards:", error);
      res.status(500).json({ error: "Failed to fetch flashcard decks" });
    }
  });

  app.get("/api/flashcards/:id", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const deck = await storage.getFlashcardDeck(req.params.id, userId);
      if (!deck) {
        res.status(404).json({ error: "Flashcard deck not found" });
        return;
      }
      res.json(deck);
    } catch (error: any) {
      console.error("Error in GET /api/flashcards/:id:", error);
      res.status(500).json({ error: "Failed to fetch flashcard deck" });
    }
  });

  // Batch create flashcard deck with AI-generated definitions
  app.post("/api/flashcards/batch-create", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const schema = z.object({
        name: z.string().min(1),
        words: z.array(z.string().min(1)).min(1),
      });

      const { name, words } = schema.parse(req.body);

      // Generate definitions for all words
      const definitions = await generateBatchDefinitions(words);

      // Validate that we got at least some definitions back
      if (definitions.length === 0) {
        res.status(502).json({ 
          error: "AI generation failed", 
          message: "Failed to generate any definitions. Please try again." 
        });
        return;
      }

      // STRICT VALIDATION: All words must have valid definitions
      if (definitions.length < words.length) {
        const generatedWords = new Set(definitions.map(d => d.word.toLowerCase()));
        const missingWords = words.filter(w => !generatedWords.has(w.toLowerCase()));
        
        console.error(`Failed to generate definitions for ${missingWords.length} words: ${missingWords.join(", ")}`);
        
        res.status(502).json({ 
          error: "Incomplete generation", 
          message: `Failed to generate definitions for: ${missingWords.join(", ")}. Please try again or remove these words.` 
        });
        return;
      }

      // Create flashcards from definitions with validation
      const cards = definitions
        .filter((def) => def.word && def.definition && def.partOfSpeech)
        .map((def) => ({
          id: randomUUID(),
          word: def.word,
          definition: def.definition,
          partOfSpeech: def.partOfSpeech,
          known: false,
        }));

      // Final check: ensure all cards are valid
      if (cards.length < words.length) {
        console.error(`Card validation failed: expected ${words.length}, got ${cards.length}`);
        res.status(502).json({ 
          error: "AI generation failed", 
          message: "Some definitions were incomplete. Please try again." 
        });
        return;
      }

      const tokensRequired = Math.max(1, Math.ceil(cards.length / 10));
      const quota = await storage.getUserQuota(userId);
      const tokenBalance = quota?.tokenBalance ?? 0;

      if (tokenBalance < tokensRequired) {
        return res.status(402).json({
          error: "INSUFFICIENT_TOKENS",
          message: `點數不足。字卡生成每 10 張扣除 1 點（至少 1 點）。本次需要 ${tokensRequired} 點，請前往訂閱與點數頁面儲值。`,
          tokenBalance,
        });
      }

      // Create the deck
      const deck = await storage.createFlashcardDeck(
        { name, cards: [] },
        userId,
        cards
      );

      let tokenInfo;
      try {
        tokenInfo = await storage.consumeTokens(userId, tokensRequired, "flashcardGeneration", {
          deckId: deck.id,
          cardCount: cards.length,
          wordsRequested: words.length,
        });
      } catch (error: any) {
        await storage.deleteFlashcardDeck(deck.id, userId);
        if (error instanceof Error && error.message === "INSUFFICIENT_TOKENS") {
          return res.status(402).json({
            error: "INSUFFICIENT_TOKENS",
            message: `點數不足。字卡生成每 10 張扣除 1 點（至少 1 點）。本次需要 ${tokensRequired} 點，請前往訂閱與點數頁面儲值。`,
          });
        }
        throw error;
      }

      res.json({
        ...deck,
        tokenInfo,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in POST /api/flashcards/batch-create:", error);
      res.status(500).json({ error: "Failed to create flashcard deck", message: error.message });
    }
  });

  app.post("/api/flashcards", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertFlashcardDeckSchema.parse(req.body);
      const deck = await storage.createFlashcardDeck(validatedData, userId, validatedData.cards);
      res.json(deck);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in POST /api/flashcards:", error);
      res.status(500).json({ error: "Failed to create flashcard deck" });
    }
  });

  app.patch("/api/flashcards/:id", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = updateFlashcardDeckSchema.parse(req.body);
      const deck = await storage.updateFlashcardDeck(req.params.id, userId, validatedData);
      if (!deck) {
        res.status(404).json({ error: "Flashcard deck not found" });
        return;
      }
      res.json(deck);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in PATCH /api/flashcards/:id:", error);
      res.status(500).json({ error: "Failed to update flashcard deck" });
    }
  });

  // Update individual flashcard
  app.patch("/api/flashcards/:deckId/cards/:cardId", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const schema = z.object({
        word: z.string().optional(),
        definition: z.string().optional(),
        partOfSpeech: z.string().optional(),
        known: z.boolean().optional(),
      });
      const validatedData = schema.parse(req.body);
      const card = await storage.updateFlashcard(req.params.cardId, validatedData);
      if (!card) {
        res.status(404).json({ error: "Flashcard not found" });
        return;
      }
      res.json(card);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in PATCH /api/flashcards/:deckId/cards/:cardId:", error);
      res.status(500).json({ error: "Failed to update flashcard" });
    }
  });

  // Add new flashcard to deck
  app.post("/api/flashcards/:deckId/cards", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const schema = z.object({
        word: z.string().min(1),
        definition: z.string().min(1),
        partOfSpeech: z.string().min(1),
      });
      const validatedData = schema.parse(req.body);
      const card = await storage.addFlashcard(req.params.deckId, validatedData);
      if (!card) {
        res.status(404).json({ error: "Flashcard deck not found" });
        return;
      }
      res.json(card);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error in POST /api/flashcards/:deckId/cards:", error);
      res.status(500).json({ error: "Failed to add flashcard" });
    }
  });

  // Delete individual flashcard
  app.delete("/api/flashcards/:deckId/cards/:cardId", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const success = await storage.deleteFlashcard(req.params.cardId);
      if (!success) {
        res.status(404).json({ error: "Flashcard not found" });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in DELETE /api/flashcards/:deckId/cards/:cardId:", error);
      res.status(500).json({ error: "Failed to delete flashcard" });
    }
  });

  app.delete("/api/flashcards/:id", firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.deleteFlashcardDeck(req.params.id, userId);
      if (!success) {
        res.status(404).json({ error: "Flashcard deck not found" });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in DELETE /api/flashcards/:id:", error);
      res.status(500).json({ error: "Failed to delete flashcard deck" });
    }
  });

  // ===== BILLING & SUBSCRIPTION ENDPOINTS =====
  // 注意：App 版本使用 Apple IAP 和 Google Play Billing
  // 這些端點將在 App 上架後由原生支付系統處理
  // Web 版本如需支付功能，可考慮整合 Stripe

}
