import { z } from "zod";
import { pgTable, varchar, text, boolean, timestamp, jsonb, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";

// Word categories for mind map expansion
export const wordCategories = [
  "derivatives",
  "synonyms",
  "antonyms",
  "collocations",
  "idioms",
  "root",
  "prefix",
  "suffix",
  "topic-related",
] as const;

export type WordCategory = typeof wordCategories[number];

// ===== DRIZZLE TABLES =====

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mindMaps = pgTable("mind_maps", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 500 }).notNull(),
  nodes: jsonb("nodes").notNull().$type<MindMapNode[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flashcardDecks = pgTable("flashcard_decks", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey(),
  deckId: varchar("deck_id").notNull().references(() => flashcardDecks.id, { onDelete: "cascade" }),
  word: varchar("word", { length: 500 }).notNull(),
  definition: text("definition").notNull(),
  partOfSpeech: varchar("part_of_speech", { length: 100 }).notNull(),
  known: boolean("known").notNull().default(false),
  reviewCount: integer("review_count").notNull().default(0),
  easeFactor: real("ease_factor").notNull().default(2.5),
  interval: integer("interval").notNull().default(0),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Dictionary cache table - stores English dictionary data + Chinese translations
export const words = pgTable("words", {
  lemma: varchar("lemma", { length: 200 }).primaryKey(),  // Normalized key (lowercase)
  headword: varchar("headword", { length: 200 }).notNull(),  // Original word
  phonetic: varchar("phonetic", { length: 100 }),  // IPA
  audioUrl: varchar("audio_url", { length: 500 }),
  origin: text("origin"),  // Etymology
  senses: jsonb("senses").notNull(),  // Array of word senses
  provider: jsonb("provider").notNull(),  // Source API info
  enReady: boolean("en_ready").notNull().default(false),
  zhReady: boolean("zh_ready").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [index("idx_words_zh_ready").on(table.zhReady)]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  mindMaps: many(mindMaps),
  flashcardDecks: many(flashcardDecks),
}));

export const mindMapsRelations = relations(mindMaps, ({ one }) => ({
  user: one(users, {
    fields: [mindMaps.userId],
    references: [users.id],
  }),
}));

export const flashcardDecksRelations = relations(flashcardDecks, ({ one, many }) => ({
  user: one(users, {
    fields: [flashcardDecks.userId],
    references: [users.id],
  }),
  cards: many(flashcards),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  deck: one(flashcardDecks, {
    fields: [flashcards.deckId],
    references: [flashcardDecks.id],
  }),
}));

// No relations for words table (standalone cache)

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMindMapSchema = createInsertSchema(mindMaps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true });
export const insertWordSchema = createInsertSchema(words).omit({ createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DbMindMap = typeof mindMaps.$inferSelect;
export type InsertMindMap = z.infer<typeof insertMindMapSchema>;
export type DbFlashcardDeck = typeof flashcardDecks.$inferSelect;
export type InsertFlashcardDeck = z.infer<typeof insertFlashcardDeckSchema>;
export type DbFlashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type DbWord = typeof words.$inferSelect;
export type InsertWord = z.infer<typeof insertWordSchema>;

// ===== DICTIONARY TYPES =====

// Word sense definition (multiple per word)
export const wordSenseSchema = z.object({
  id: z.string(),
  pos: z.string(),  // part of speech (verb, noun, etc.)
  labels: z.array(z.string()).optional(),  // formal, informal, etc.
  defEn: z.string(),  // English definition (from dictionary API)
  defZhTw: z.string().optional(),  // Traditional Chinese translation (AI generated)
  examples: z.array(z.object({
    en: z.string(),
    zhTw: z.string().optional(),
  })).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  collocations: z.array(z.object({
    phrase: z.string(),
    zhTw: z.string().optional(),
  })).optional(),
  notesZhTw: z.string().optional(),  // Usage notes in Chinese
});

export type WordSense = z.infer<typeof wordSenseSchema>;

// Provider information
export const providerInfoSchema = z.object({
  name: z.string(),  // "dictionaryapi.dev", "wordsapi", etc.
  retrievedAt: z.number(),  // timestamp
  licenseNote: z.string().optional(),
});

export type ProviderInfo = z.infer<typeof providerInfoSchema>;

// Complete word entry (API response)
export const wordEntrySchema = z.object({
  lemma: z.string(),
  headword: z.string(),
  phonetic: z.string().optional(),
  audioUrl: z.string().optional(),
  origin: z.string().optional(),
  senses: z.array(wordSenseSchema),
  provider: providerInfoSchema,
  enReady: z.boolean(),
  zhReady: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type WordEntry = z.infer<typeof wordEntrySchema>;

// ===== LEGACY ZOD SCHEMAS (kept for API validation) =====

// Mind map node schema
export const mindMapNodeSchema = z.object({
  id: z.string(),
  word: z.string(),
  x: z.number(),
  y: z.number(),
  parentId: z.string().optional(),
  category: z.enum(wordCategories).optional(),
  isCenter: z.boolean().default(false),
});

export type MindMapNode = z.infer<typeof mindMapNodeSchema>;

// Flashcard schema
export const flashcardSchema = z.object({
  id: z.string(),
  word: z.string(),
  definition: z.string(), // Traditional Chinese definition
  partOfSpeech: z.string(),
  known: z.boolean().default(false),
});

export type Flashcard = z.infer<typeof flashcardSchema>;

// Flashcard deck schema
export const flashcardDeckSchema = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(flashcardSchema),
  createdAt: z.string(),
});

export type FlashcardDeck = z.infer<typeof flashcardDeckSchema>;

// API request/response schemas
export const generateWordsRequestSchema = z.object({
  word: z.string(),
  category: z.enum(wordCategories),
});

export type GenerateWordsRequest = z.infer<typeof generateWordsRequestSchema>;

export const generateWordsResponseSchema = z.object({
  words: z.array(z.string()),
});

export type GenerateWordsResponse = z.infer<typeof generateWordsResponseSchema>;

export const generateDefinitionRequestSchema = z.object({
  word: z.string(),
});

export type GenerateDefinitionRequest = z.infer<typeof generateDefinitionRequestSchema>;

export const generateDefinitionResponseSchema = z.object({
  definition: z.string(),
  partOfSpeech: z.string(),
});

export type GenerateDefinitionResponse = z.infer<typeof generateDefinitionResponseSchema>;

// Mind map save/load schemas
export const mindMapSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  nodes: z.array(mindMapNodeSchema),
  createdAt: z.string(),
});

export type MindMap = z.infer<typeof mindMapSchema>;
