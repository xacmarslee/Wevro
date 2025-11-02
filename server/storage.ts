import { randomUUID } from "crypto";
import type { MindMap, FlashcardDeck } from "@shared/schema";

export interface IStorage {
  // Mind maps
  getMindMap(id: string): Promise<MindMap | undefined>;
  getAllMindMaps(): Promise<MindMap[]>;
  createMindMap(mindMap: Omit<MindMap, "id" | "createdAt">): Promise<MindMap>;
  updateMindMap(id: string, mindMap: Partial<MindMap>): Promise<MindMap | undefined>;
  deleteMindMap(id: string): Promise<boolean>;

  // Flashcard decks
  getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined>;
  getAllFlashcardDecks(): Promise<FlashcardDeck[]>;
  createFlashcardDeck(deck: Omit<FlashcardDeck, "id" | "createdAt">): Promise<FlashcardDeck>;
  updateFlashcardDeck(id: string, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined>;
  deleteFlashcardDeck(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private mindMaps: Map<string, MindMap>;
  private flashcardDecks: Map<string, FlashcardDeck>;

  constructor() {
    this.mindMaps = new Map();
    this.flashcardDecks = new Map();
  }

  // Mind map methods
  async getMindMap(id: string): Promise<MindMap | undefined> {
    return this.mindMaps.get(id);
  }

  async getAllMindMaps(): Promise<MindMap[]> {
    return Array.from(this.mindMaps.values());
  }

  async createMindMap(mindMap: Omit<MindMap, "id" | "createdAt">): Promise<MindMap> {
    const id = randomUUID();
    const newMindMap: MindMap = {
      ...mindMap,
      id,
      createdAt: new Date().toISOString(),
    };
    this.mindMaps.set(id, newMindMap);
    return newMindMap;
  }

  async updateMindMap(id: string, mindMap: Partial<MindMap>): Promise<MindMap | undefined> {
    const existing = this.mindMaps.get(id);
    if (!existing) return undefined;

    const updated: MindMap = { ...existing, ...mindMap };
    this.mindMaps.set(id, updated);
    return updated;
  }

  async deleteMindMap(id: string): Promise<boolean> {
    return this.mindMaps.delete(id);
  }

  // Flashcard deck methods
  async getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined> {
    return this.flashcardDecks.get(id);
  }

  async getAllFlashcardDecks(): Promise<FlashcardDeck[]> {
    return Array.from(this.flashcardDecks.values());
  }

  async createFlashcardDeck(deck: Omit<FlashcardDeck, "id" | "createdAt">): Promise<FlashcardDeck> {
    const id = randomUUID();
    const newDeck: FlashcardDeck = {
      ...deck,
      id,
      createdAt: new Date().toISOString(),
    };
    this.flashcardDecks.set(id, newDeck);
    return newDeck;
  }

  async updateFlashcardDeck(id: string, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined> {
    const existing = this.flashcardDecks.get(id);
    if (!existing) return undefined;

    const updated: FlashcardDeck = { ...existing, ...deck };
    this.flashcardDecks.set(id, updated);
    return updated;
  }

  async deleteFlashcardDeck(id: string): Promise<boolean> {
    return this.flashcardDecks.delete(id);
  }
}

export const storage = new MemStorage();
