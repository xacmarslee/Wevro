import type { Express } from "express";
import { storage } from "./storage.js";
import { generateRelatedWords, generateExampleSentences, generateBatchDefinitions, generateSynonymComparison } from "./ai-generators.js";
import {
  generateWordsRequestSchema,
  generateExamplesRequestSchema,
  generateSynonymsRequestSchema,
  mindMapSchema,
  flashcardDeckSchema,
} from "@shared/schema";
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
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user quota (tokens and plan)
  app.get('/api/quota', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const quota = await storage.getUserQuota(userId);
      res.json(quota);
    } catch (error) {
      console.error("Error fetching quota:", error);
      res.status(500).json({ message: "Failed to fetch quota" });
    }
  });

  // Auth route: Delete user account
  app.delete('/api/auth/user', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Delete user from database (cascading delete via foreign keys)
      await storage.deleteUser(userId);
      
      // Delete user from Firebase
      await deleteFirebaseUser(userId);
      
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
  // Generate related words for a category
  app.post("/api/generate-words", async (req, res) => {
    try {
      const validatedData = generateWordsRequestSchema.parse(req.body);
      const words = await generateRelatedWords(
        validatedData.word,
        validatedData.category
      );

      res.json({ words });
    } catch (error: any) {
      console.error("Error in /api/generate-words:", error);
      res.status(500).json({
        error: "Failed to generate words",
        message: error.message,
      });
    }
  });

  // Generate example sentences for a word/phrase
  app.post("/api/examples/generate", async (req, res) => {
    try {
      const validatedData = generateExamplesRequestSchema.parse(req.body);
      const { query, counts } = validatedData;
      
      console.log(`📝 Generating examples for "${query}"...`);
      
      // Default counts if not provided
      const sensesCount = counts?.sense || 2;
      const phraseCount = counts?.phrase || 1;
      
      // Check if OpenAI API key is configured
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        console.error("❌ OpenAI API key not configured");
        return res.status(500).json({
          error: "Configuration error",
          message: "OpenAI API 金鑰未設定，請在 .env 檔案中設定 AI_INTEGRATIONS_OPENAI_API_KEY",
        });
      }
      
      // Generate examples using OpenAI
      const examples = await generateExampleSentences(query, sensesCount, phraseCount);
      
      console.log(`✅ Successfully generated examples for "${query}"`);
      res.json(examples);
    } catch (error: any) {
      console.error("❌ Error in /api/examples/generate:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }
      
      res.status(500).json({
        error: "Failed to generate examples",
        message: error.message || "無法生成例句，請稍後再試",
      });
    }
  });

  // NEW: Generate synonym comparison for a word
  app.post("/api/synonyms/generate", async (req, res) => {
    try {
      const validatedData = generateSynonymsRequestSchema.parse(req.body);
      const { query } = validatedData;
      
      console.log(`📝 Generating synonyms for "${query}"...`);
      
      // Check if OpenAI API key is configured
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        console.error("❌ OpenAI API key not configured");
        return res.status(500).json({
          error: "Configuration error",
          message: "OpenAI API 金鑰未設定，請在 .env 檔案中設定 AI_INTEGRATIONS_OPENAI_API_KEY",
        });
      }
      
      // Generate synonym comparison using OpenAI
      const synonyms = await generateSynonymComparison(query);
      
      console.log(`✅ Successfully generated synonyms for "${query}"`);
      res.json(synonyms);
    } catch (error: any) {
      console.error("❌ Error in /api/synonyms/generate:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }
      
      res.status(500).json({
        error: "Failed to generate synonyms",
        message: error.message || "無法生成同義字，請稍後再試",
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
          id: crypto.randomUUID(),
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

      // Create the deck
      const deck = await storage.createFlashcardDeck(
        { name, cards: [] },
        userId,
        cards
      );

      res.json(deck);
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
