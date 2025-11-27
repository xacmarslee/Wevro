import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { storage } from "../storage.js";
import { flashcardDeckSchema } from "@shared/schema";
import { generateBatchDefinitions } from "../ai-generators.js";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth.js";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

// Schemas
const insertFlashcardDeckSchema = flashcardDeckSchema.omit({ id: true, createdAt: true });
const updateFlashcardDeckSchema = flashcardDeckSchema.partial();

const router = Router();

// Flashcard deck CRUD endpoints (protected)
router.get("/", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const decks = await storage.getAllFlashcardDecks(userId);
    res.json(decks);
  } catch (error: any) {
    console.error("Error in GET /api/flashcards:", error);
    res.status(500).json({ error: "Failed to fetch flashcard decks" });
  }
});

router.get("/:id", firebaseAuthMiddleware, async (req: any, res) => {
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
router.post("/batch-create", firebaseAuthMiddleware, async (req: any, res) => {
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

router.post("/", firebaseAuthMiddleware, async (req: any, res) => {
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

router.patch("/:id", firebaseAuthMiddleware, async (req: any, res) => {
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
router.patch("/:deckId/cards/:cardId", firebaseAuthMiddleware, async (req: any, res) => {
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
router.post("/:deckId/cards", firebaseAuthMiddleware, async (req: any, res) => {
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
router.delete("/:deckId/cards/:cardId", firebaseAuthMiddleware, async (req: any, res) => {
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

router.delete("/:id", firebaseAuthMiddleware, async (req: any, res) => {
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

export default router;

