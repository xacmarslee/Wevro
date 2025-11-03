import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateRelatedWords, generateChineseDefinition } from "./openai";
import {
  generateWordsRequestSchema,
  generateDefinitionRequestSchema,
  mindMapSchema,
  flashcardDeckSchema,
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Insert schemas (omit auto-generated fields)
const insertMindMapSchema = mindMapSchema.omit({ id: true, createdAt: true });
const insertFlashcardDeckSchema = flashcardDeckSchema.omit({ id: true, createdAt: true });
const updateMindMapSchema = mindMapSchema.partial();
const updateFlashcardDeckSchema = flashcardDeckSchema.partial();

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth route: Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // Generate Traditional Chinese definition for a word
  app.post("/api/generate-definition", async (req, res) => {
    try {
      const validatedData = generateDefinitionRequestSchema.parse(req.body);
      const result = await generateChineseDefinition(validatedData.word);

      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/generate-definition:", error);
      res.status(500).json({
        error: "Failed to generate definition",
        message: error.message,
      });
    }
  });

  // Query/translation endpoint
  app.post("/api/query", isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        text: z.string().min(1),
      });

      const { text } = schema.parse(req.body);

      // Use OpenAI to process query or translation
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful bilingual dictionary and translation assistant. When given an English word, provide its definition, pronunciation, and Traditional Chinese translation. When given a Chinese phrase or sentence, translate it to English. When given an English phrase or sentence, translate it to Traditional Chinese. Provide clear, concise, and accurate information."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const result = completion.choices[0]?.message?.content || "No result generated";

      res.json({ result });
    } catch (error: any) {
      console.error("Query error:", error);
      res.status(500).json({ message: "Failed to process query" });
    }
  });

  // Mind map CRUD endpoints (protected)
  app.get("/api/mindmaps", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mindMaps = await storage.getAllMindMaps(userId);
      res.json(mindMaps);
    } catch (error: any) {
      console.error("Error in GET /api/mindmaps:", error);
      res.status(500).json({ error: "Failed to fetch mind maps" });
    }
  });

  app.get("/api/mindmaps/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/mindmaps", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch("/api/mindmaps/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete("/api/mindmaps/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/flashcards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const decks = await storage.getAllFlashcardDecks(userId);
      res.json(decks);
    } catch (error: any) {
      console.error("Error in GET /api/flashcards:", error);
      res.status(500).json({ error: "Failed to fetch flashcard decks" });
    }
  });

  app.get("/api/flashcards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/flashcards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch("/api/flashcards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete("/api/flashcards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
