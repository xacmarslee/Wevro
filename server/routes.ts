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

// Insert schemas (omit auto-generated fields)
const insertMindMapSchema = mindMapSchema.omit({ id: true, createdAt: true });
const insertFlashcardDeckSchema = flashcardDeckSchema.omit({ id: true, createdAt: true });
const updateMindMapSchema = mindMapSchema.partial();
const updateFlashcardDeckSchema = flashcardDeckSchema.partial();

// Temporary: Create or get guest user for testing (will be replaced with real auth)
let guestUserId: string | null = null;
let guestUserPromise: Promise<string> | null = null;

async function getGuestUserId(): Promise<string> {
  // If we already have the ID cached, return it immediately
  if (guestUserId) return guestUserId;
  
  // If there's already a promise in flight, wait for it to avoid race conditions
  if (guestUserPromise) return guestUserPromise;
  
  // Start the async operation and cache the promise
  guestUserPromise = (async () => {
    try {
      // Check if guest user exists
      const existingUser = await storage.getUserByUsername("guest");
      if (existingUser) {
        guestUserId = existingUser.id;
        return existingUser.id;
      }
      
      // Try to create the guest user
      try {
        const newUser = await storage.createUser("guest");
        guestUserId = newUser.id;
        return newUser.id;
      } catch (error: any) {
        // If creation failed due to unique constraint (concurrent request), fetch the existing user
        if (error.code === '23505' || error.message?.includes('unique')) {
          const existingUser = await storage.getUserByUsername("guest");
          if (existingUser) {
            guestUserId = existingUser.id;
            return existingUser.id;
          }
        }
        throw error;
      }
    } finally {
      // Clear the promise cache after completion (success or failure)
      guestUserPromise = null;
    }
  })();
  
  return guestUserPromise;
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Mind map CRUD endpoints
  app.get("/api/mindmaps", async (req, res) => {
    try {
      const userId = await getGuestUserId();
      const mindMaps = await storage.getAllMindMaps(userId);
      res.json(mindMaps);
    } catch (error: any) {
      console.error("Error in GET /api/mindmaps:", error);
      res.status(500).json({ error: "Failed to fetch mind maps" });
    }
  });

  app.get("/api/mindmaps/:id", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  app.post("/api/mindmaps", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  app.patch("/api/mindmaps/:id", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  app.delete("/api/mindmaps/:id", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  // Flashcard deck CRUD endpoints
  app.get("/api/flashcards", async (req, res) => {
    try {
      const userId = await getGuestUserId();
      const decks = await storage.getAllFlashcardDecks(userId);
      res.json(decks);
    } catch (error: any) {
      console.error("Error in GET /api/flashcards:", error);
      res.status(500).json({ error: "Failed to fetch flashcard decks" });
    }
  });

  app.get("/api/flashcards/:id", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  app.post("/api/flashcards", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  app.patch("/api/flashcards/:id", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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

  app.delete("/api/flashcards/:id", async (req, res) => {
    try {
      const userId = await getGuestUserId();
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
