import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateRelatedWords, generateExampleSentences, generateBatchDefinitions, generateSynonymComparison } from "./ai-generators";
import {
  generateWordsRequestSchema,
  generateDefinitionRequestSchema,
  generateExamplesRequestSchema,
  generateSynonymsRequestSchema,
  mindMapSchema,
  flashcardDeckSchema,
} from "@shared/schema";
import { z } from "zod";
import { firebaseAuthMiddleware, getFirebaseUserId } from "./firebaseAuth";
import { lookupWord, getWordStatus, getQueueStatus } from "./dictionary-service";
import { getUserByUid, deleteUser as deleteFirebaseUser } from "./firebaseAdmin";

// Insert schemas (omit auto-generated fields)
const insertMindMapSchema = mindMapSchema.omit({ id: true, userId: true, createdAt: true });
const insertFlashcardDeckSchema = flashcardDeckSchema.omit({ id: true, createdAt: true });
const updateMindMapSchema = mindMapSchema.partial();
const updateFlashcardDeckSchema = flashcardDeckSchema.partial();

// Helper function to get user ID from Firebase
function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('✅ Using Firebase Authentication');

  // Auth route: Get current user
  app.get('/api/auth/user', firebaseAuthMiddleware, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Try to get user from database
      let user = await storage.getUser(userId);
      
      // If user doesn't exist in database, create from Firebase data
      if (!user && req.firebaseUser) {
        const firebaseUser = await getUserByUid(userId);
        user = await storage.upsertUser({
          id: userId,
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0],
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' '),
          profileImageUrl: firebaseUser.photoURL,
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // Dictionary lookup - returns English immediately, queues Chinese translation
  app.post("/api/generate-definition", async (req, res) => {
    try {
      const validatedData = generateDefinitionRequestSchema.parse(req.body);
      
      // Use new dictionary service (returns English, queues translation)
      const wordEntry = await lookupWord(validatedData.word, 8);  // High priority for direct lookups
      
      if (!wordEntry) {
        return res.status(404).json({
          error: "Word not found",
          message: `"${validatedData.word}" not found in dictionary`,
        });
      }

      // Return the first sense for compatibility with old API
      const firstSense = wordEntry.senses[0];
      
      if (!firstSense) {
        return res.status(404).json({
          error: "No definition found",
          message: "Word has no definitions",
        });
      }

      // Map to old API format for backward compatibility
      res.json({
        definition: firstSense.defZhTw || firstSense.defEn || "定義生成中...",
        partOfSpeech: firstSense.pos === "verb" ? "動詞" :
                      firstSense.pos === "noun" ? "名詞" :
                      firstSense.pos === "adjective" ? "形容詞" :
                      firstSense.pos === "adverb" ? "副詞" : "其他",
        zhReady: wordEntry.zhReady,  // Indicates if Chinese is ready
      });
    } catch (error: any) {
      console.error("Error in /api/generate-definition:", error);
      res.status(500).json({
        error: "Failed to generate definition",
        message: error.message,
      });
    }
  });

  // NEW: Full dictionary lookup endpoint
  app.get("/api/dictionary/lookup/:word", async (req, res) => {
    try {
      const word = req.params.word;
      
      if (!word || word.trim().length === 0) {
        return res.status(400).json({ error: "Word parameter required" });
      }

      const wordEntry = await lookupWord(word, 5);
      
      if (!wordEntry) {
        return res.status(404).json({
          error: "Word not found",
          message: `"${word}" not found in dictionary`,
        });
      }

      res.json(wordEntry);
    } catch (error: any) {
      console.error("Error in /api/dictionary/lookup:", error);
      res.status(500).json({
        error: "Dictionary lookup failed",
        message: error.message,
      });
    }
  });

  // NEW: Check translation status (for polling)
  app.get("/api/dictionary/status/:word", async (req, res) => {
    try {
      const word = req.params.word;
      const status = await getWordStatus(word);
      
      if (!status) {
        return res.status(404).json({ error: "Word not found" });
      }

      res.json(status);
    } catch (error: any) {
      console.error("Error in /api/dictionary/status:", error);
      res.status(500).json({ error: "Status check failed" });
    }
  });

  // NEW: Translation queue status
  app.get("/api/dictionary/queue-status", (req, res) => {
    const status = getQueueStatus();
    res.json(status);
  });

  // NEW: Generate example sentences for a word/phrase
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

  // NEW: Dictionary search suggestions (autocomplete)
  app.get("/api/dictionary/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length === 0) {
        return res.json({ suggestions: [] });
      }

      const normalizedQuery = query.toLowerCase().trim();

      // Common English words database for suggestions
      const commonWords = [
        "abandon", "ability", "able", "about", "above", "abroad", "absence", "absolute", "accept", "access",
        "accident", "account", "achieve", "acquire", "across", "action", "active", "actual", "add", "address",
        "admit", "adult", "advance", "advantage", "advice", "affect", "afford", "afraid", "after", "again",
        "against", "agency", "agent", "agree", "ahead", "allow", "almost", "alone", "along", "already",
        "also", "alter", "alternative", "although", "always", "amazing", "among", "amount", "analysis", "ancient",
        "angry", "animal", "announce", "annual", "another", "answer", "anxious", "anybody", "anymore", "anyone",
        "anything", "anyway", "anywhere", "apart", "apparent", "appear", "apple", "application", "apply", "approach",
        "appropriate", "approve", "area", "argue", "arise", "around", "arrange", "arrest", "arrive", "article",
        "artist", "aside", "aspect", "assess", "assign", "assist", "assume", "assure", "attach", "attack",
        "attempt", "attend", "attention", "attitude", "attract", "audience", "author", "authority", "automatic", "available",
        "average", "avoid", "aware", "away", "background", "balance", "ball", "band", "bank", "base",
        "basic", "basis", "battle", "beautiful", "beauty", "because", "become", "before", "begin", "behavior",
        "behind", "belief", "believe", "belong", "below", "benefit", "beside", "best", "better", "between",
        "beyond", "bind", "birth", "black", "blame", "blank", "block", "blood", "blow", "blue",
        "board", "boat", "body", "book", "border", "born", "borrow", "both", "bother", "bottom",
        "boundary", "brain", "branch", "brave", "break", "brief", "bright", "bring", "broad", "brother",
        "brown", "budget", "build", "building", "bunch", "burden", "burn", "burst", "business", "busy",
        "button", "cabinet", "calculate", "call", "camera", "campaign", "campus", "cancel", "cancer", "candidate",
        "capable", "capacity", "capital", "capture", "carbon", "card", "care", "career", "careful", "carefully",
        "carry", "case", "cash", "cast", "category", "cause", "celebrate", "cell", "center", "central",
        "century", "ceremony", "certain", "certainly", "chain", "chair", "challenge", "chamber", "champion", "chance",
        "change", "channel", "chapter", "character", "charge", "charity", "chart", "chase", "cheap", "check",
        "chemical", "chest", "chief", "child", "childhood", "choice", "choose", "Christian", "church", "circle",
        "citizen", "city", "civil", "claim", "class", "classic", "classroom", "clean", "clear", "clearly",
        "client", "climate", "climb", "clinic", "clock", "close", "closed", "closely", "clothes", "cloud",
        "club", "coach", "coal", "coast", "coat", "code", "coffee", "cold", "collapse", "colleague",
        "collect", "collection", "college", "color", "column", "combination", "combine", "come", "comfort", "comfortable",
        "command", "comment", "commercial", "commission", "commit", "commitment", "committee", "common", "communicate", "communication",
        "community", "company", "compare", "comparison", "compete", "competition", "competitive", "complain", "complaint", "complete",
        "create", "creative", "creature", "credit", "crime", "criminal", "crisis", "criterion", "critical", "criticism"
      ];

      // Filter words that start with the query
      const suggestions = commonWords
        .filter(word => word.startsWith(normalizedQuery))
        .slice(0, 10) // Return top 10 matches
        .map(word => ({
          word,
          // You could add more metadata here from your database if needed
        }));

      res.json({ suggestions });
    } catch (error: any) {
      console.error("Error in /api/dictionary/search:", error);
      res.status(500).json({ error: "Search failed" });
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
      const mindMap = await storage.createMindMap(validatedData, userId);
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

  const httpServer = createServer(app);
  return httpServer;
}
