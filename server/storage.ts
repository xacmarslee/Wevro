import { randomUUID } from "crypto";
import type { MindMap, FlashcardDeck, Flashcard } from "@shared/schema";
import { db } from "./db";
import { mindMaps, flashcardDecks, flashcards, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(username: string): Promise<{ id: string; username: string }>;
  getUser(id: string): Promise<{ id: string; username: string } | undefined>;
  getUserByUsername(username: string): Promise<{ id: string; username: string } | undefined>;

  // Mind maps
  getMindMap(id: string, userId: string): Promise<MindMap | undefined>;
  getAllMindMaps(userId: string): Promise<MindMap[]>;
  createMindMap(mindMap: Omit<MindMap, "id" | "createdAt">, userId: string): Promise<MindMap>;
  updateMindMap(id: string, userId: string, mindMap: Partial<MindMap>): Promise<MindMap | undefined>;
  deleteMindMap(id: string, userId: string): Promise<boolean>;

  // Flashcard decks
  getFlashcardDeck(id: string, userId: string): Promise<FlashcardDeck | undefined>;
  getAllFlashcardDecks(userId: string): Promise<FlashcardDeck[]>;
  createFlashcardDeck(deck: Omit<FlashcardDeck, "id" | "createdAt">, userId: string, cards?: Flashcard[]): Promise<FlashcardDeck>;
  updateFlashcardDeck(id: string, userId: string, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined>;
  deleteFlashcardDeck(id: string, userId: string): Promise<boolean>;

  // Flashcards
  getFlashcard(id: string): Promise<Flashcard | undefined>;
  getFlashcardsByDeck(deckId: string): Promise<Flashcard[]>;
  updateFlashcard(id: string, flashcard: Partial<Flashcard>): Promise<Flashcard | undefined>;
}

export class DbStorage implements IStorage {
  // User methods
  async createUser(username: string): Promise<{ id: string; username: string }> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({ id, username }).returning();
    return user;
  }

  async getUser(id: string): Promise<{ id: string; username: string } | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<{ id: string; username: string } | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  // Mind map methods
  async getMindMap(id: string, userId: string): Promise<MindMap | undefined> {
    const [dbMindMap] = await db
      .select()
      .from(mindMaps)
      .where(and(eq(mindMaps.id, id), eq(mindMaps.userId, userId)));

    if (!dbMindMap) return undefined;

    return {
      id: dbMindMap.id,
      name: dbMindMap.name,
      nodes: dbMindMap.nodes,
      createdAt: dbMindMap.createdAt.toISOString(),
    };
  }

  async getAllMindMaps(userId: string): Promise<MindMap[]> {
    const dbMindMaps = await db
      .select()
      .from(mindMaps)
      .where(eq(mindMaps.userId, userId))
      .orderBy(desc(mindMaps.updatedAt));

    return dbMindMaps.map((m) => ({
      id: m.id,
      name: m.name,
      nodes: m.nodes,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async createMindMap(mindMap: Omit<MindMap, "id" | "createdAt">, userId: string): Promise<MindMap> {
    const id = randomUUID();
    const [created] = await db
      .insert(mindMaps)
      .values({
        id,
        userId,
        name: mindMap.name,
        nodes: mindMap.nodes,
      })
      .returning();

    return {
      id: created.id,
      name: created.name,
      nodes: created.nodes,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateMindMap(id: string, userId: string, mindMap: Partial<MindMap>): Promise<MindMap | undefined> {
    const [updated] = await db
      .update(mindMaps)
      .set({
        ...(mindMap.name && { name: mindMap.name }),
        ...(mindMap.nodes && { nodes: mindMap.nodes }),
        updatedAt: new Date(),
      })
      .where(and(eq(mindMaps.id, id), eq(mindMaps.userId, userId)))
      .returning();

    if (!updated) return undefined;

    return {
      id: updated.id,
      name: updated.name,
      nodes: updated.nodes,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteMindMap(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(mindMaps)
      .where(and(eq(mindMaps.id, id), eq(mindMaps.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Flashcard deck methods
  async getFlashcardDeck(id: string, userId: string): Promise<FlashcardDeck | undefined> {
    const [deck] = await db
      .select()
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, userId)));

    if (!deck) return undefined;

    const cards = await db.select().from(flashcards).where(eq(flashcards.deckId, id));

    return {
      id: deck.id,
      name: deck.name,
      cards: cards.map((c) => ({
        id: c.id,
        word: c.word,
        definition: c.definition,
        partOfSpeech: c.partOfSpeech,
        known: c.known,
      })),
      createdAt: deck.createdAt.toISOString(),
    };
  }

  async getAllFlashcardDecks(userId: string): Promise<FlashcardDeck[]> {
    const decks = await db
      .select()
      .from(flashcardDecks)
      .where(eq(flashcardDecks.userId, userId))
      .orderBy(desc(flashcardDecks.updatedAt));

    const result: FlashcardDeck[] = [];
    for (const deck of decks) {
      const cards = await db.select().from(flashcards).where(eq(flashcards.deckId, deck.id));
      result.push({
        id: deck.id,
        name: deck.name,
        cards: cards.map((c) => ({
          id: c.id,
          word: c.word,
          definition: c.definition,
          partOfSpeech: c.partOfSpeech,
          known: c.known,
        })),
        createdAt: deck.createdAt.toISOString(),
      });
    }
    return result;
  }

  async createFlashcardDeck(
    deck: Omit<FlashcardDeck, "id" | "createdAt">,
    userId: string,
    cards?: Flashcard[]
  ): Promise<FlashcardDeck> {
    const deckId = randomUUID();
    const [created] = await db
      .insert(flashcardDecks)
      .values({
        id: deckId,
        userId,
        name: deck.name,
      })
      .returning();

    const createdCards: Flashcard[] = [];
    if (cards && cards.length > 0) {
      const cardValues = cards.map((card) => ({
        id: randomUUID(),
        deckId,
        word: card.word,
        definition: card.definition,
        partOfSpeech: card.partOfSpeech,
        known: card.known || false,
      }));

      const insertedCards = await db.insert(flashcards).values(cardValues).returning();
      createdCards.push(
        ...insertedCards.map((c) => ({
          id: c.id,
          word: c.word,
          definition: c.definition,
          partOfSpeech: c.partOfSpeech,
          known: c.known,
        }))
      );
    }

    return {
      id: created.id,
      name: created.name,
      cards: createdCards,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateFlashcardDeck(id: string, userId: string, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined> {
    const [updated] = await db
      .update(flashcardDecks)
      .set({
        ...(deck.name && { name: deck.name }),
        updatedAt: new Date(),
      })
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, userId)))
      .returning();

    if (!updated) return undefined;

    const cards = await db.select().from(flashcards).where(eq(flashcards.deckId, id));

    return {
      id: updated.id,
      name: updated.name,
      cards: cards.map((c) => ({
        id: c.id,
        word: c.word,
        definition: c.definition,
        partOfSpeech: c.partOfSpeech,
        known: c.known,
      })),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteFlashcardDeck(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Flashcard methods
  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    if (!card) return undefined;

    return {
      id: card.id,
      word: card.word,
      definition: card.definition,
      partOfSpeech: card.partOfSpeech,
      known: card.known,
    };
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    const cards = await db.select().from(flashcards).where(eq(flashcards.deckId, deckId));
    return cards.map((c) => ({
      id: c.id,
      word: c.word,
      definition: c.definition,
      partOfSpeech: c.partOfSpeech,
      known: c.known,
    }));
  }

  async updateFlashcard(id: string, flashcard: Partial<Flashcard>): Promise<Flashcard | undefined> {
    const [updated] = await db
      .update(flashcards)
      .set({
        ...(flashcard.known !== undefined && { known: flashcard.known }),
        ...(flashcard.definition && { definition: flashcard.definition }),
        ...(flashcard.partOfSpeech && { partOfSpeech: flashcard.partOfSpeech }),
      })
      .where(eq(flashcards.id, id))
      .returning();

    if (!updated) return undefined;

    return {
      id: updated.id,
      word: updated.word,
      definition: updated.definition,
      partOfSpeech: updated.partOfSpeech,
      known: updated.known,
    };
  }
}

export const storage = new DbStorage();
