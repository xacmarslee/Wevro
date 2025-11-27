import { z } from "zod";
import { pgTable, varchar, text, boolean, timestamp, jsonb, integer, numeric, real, index, foreignKey, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";

export const tokenInfoSchema = z.object({
  tokenBalance: z.number(),
  tokensCharged: z.number(),
});
export type TokenInfo = z.infer<typeof tokenInfoSchema>;

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

// User quotas and billing table
export const userQuotas = pgTable("user_quotas", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 20 }).notNull().default("free"), // free, student, pro
  
  // Token balance (點數餘額，永不過期)
  tokenBalance: numeric("token_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  monthlyTokens: integer("monthly_tokens").notNull().default(0), // 方案每月配額
  
  // Daily quotas (not used with token system, kept for potential future use)
  dailySimpleQueries: integer("daily_simple_queries").notNull().default(999999),
  dailyExamples: integer("daily_examples").notNull().default(0),
  dailySynonyms: integer("daily_synonyms").notNull().default(0),
  dailyMindmapExpansions: integer("daily_mindmap_expansions").notNull().default(999999),
  dailyFlashcards: integer("daily_flashcards").notNull().default(999999),
  
  // Daily usage counters
  usedSimpleQueries: integer("used_simple_queries").notNull().default(0),
  usedExamples: integer("used_examples").notNull().default(0),
  usedSynonyms: integer("used_synonyms").notNull().default(0),
  usedMindmapExpansions: integer("used_mindmap_expansions").notNull().default(0),
  usedFlashcards: integer("used_flashcards").notNull().default(0),
  
  // Quota reset time
  quotaResetAt: timestamp("quota_reset_at").notNull(),
  
  // Stripe subscription info
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }), // active, canceled, past_due, etc.
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  
  // Email verification reward tracking
  isEmailVerified: boolean("is_email_verified").notNull().default(false), // Sync with Firebase Auth emailVerified status
  rewardClaimed: boolean("reward_claimed").notNull().default(false), // Track if user has claimed the 20 token verification reward
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Token transaction history (點數交易記錄)
export const tokenTransactions = pgTable("token_transactions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Positive for additions, negative for consumption
  type: varchar("type", { length: 50 }).notNull(), // purchase, consume, gift, subscription_refill, refund
  feature: varchar("feature", { length: 100 }), // exampleGeneration, synonymComparison, etc. (null for purchases)
  metadata: jsonb("metadata"), // Additional info (e.g., pack name, transaction ID)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_token_transactions_user").on(table.userId),
  index("idx_token_transactions_type").on(table.type),
]);

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

// ===== CACHING & HISTORY SYSTEM =====

// 1. 核心單字表
export const words = pgTable("words", {
  id: uuid("id").defaultRandom().primaryKey(),
  text: varchar("text", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_words_text").on(table.text), // Add index for fast lookup
]);

// 2. 詞義表
export const wordSenses = pgTable("word_senses", {
  id: uuid("id").defaultRandom().primaryKey(),
  wordId: uuid("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  pos: varchar("pos", { length: 50 }).notNull(), // noun, verb, etc.
  glossZh: text("gloss_zh").notNull(),
  glossEn: text("gloss_en").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 3. 例句表
export const examples = pgTable("examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  senseId: uuid("sense_id").references(() => wordSenses.id, { onDelete: "cascade" }),
  // Optional: link to idiom/collocation if needed, but for now sense is primary
  sentenceEn: text("sentence_en").notNull(),
  sentenceZh: text("sentence_zh").notNull(),
  source: varchar("source", { length: 50 }).default("ai"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 4. 同義詞表
export const synonyms = pgTable("synonyms", {
  id: uuid("id").defaultRandom().primaryKey(),
  wordId: uuid("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  synonymWord: varchar("synonym_word", { length: 255 }).notNull(),
  pos: varchar("pos", { length: 50 }).default("unknown"), // New field for part of speech
  difference: text("difference").notNull(),
  sentenceEn: text("sentence_en").notNull(),
  sentenceZh: text("sentence_zh").notNull(),
  source: varchar("source", { length: 50 }).default("ai"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 5. 慣用語表 (Idioms)
export const idioms = pgTable("idioms", {
  id: uuid("id").defaultRandom().primaryKey(),
  wordId: uuid("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  phrase: varchar("phrase", { length: 255 }).notNull(),
  glossZh: text("gloss_zh").notNull(),
  glossEn: text("gloss_en").notNull(),
  source: varchar("source", { length: 50 }).default("ai"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 6. 搭配詞表 (Collocations)
export const collocations = pgTable("collocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  wordId: uuid("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  phrase: varchar("phrase", { length: 255 }).notNull(),
  glossZh: text("gloss_zh").notNull(),
  source: varchar("source", { length: 50 }).default("ai"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Link tables for many-to-many relations if needed, 
// or just store examples for idioms/collocations in the examples table 
// with a different FK or a type discriminator. 
// For simplicity and strict typing, let's add separate tables for idiom/collocation examples
// OR add nullable FKs to the main examples table. 
// Let's modify `examples` table slightly to be polymorphic-ish or just add dedicated tables.
// Dedicated tables are cleaner for SQL.

export const idiomExamples = pgTable("idiom_examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  idiomId: uuid("idiom_id").notNull().references(() => idioms.id, { onDelete: "cascade" }),
  sentenceEn: text("sentence_en").notNull(),
  sentenceZh: text("sentence_zh").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const collocationExamples = pgTable("collocation_examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  collocationId: uuid("collocation_id").notNull().references(() => collocations.id, { onDelete: "cascade" }),
  sentenceEn: text("sentence_en").notNull(),
  sentenceZh: text("sentence_zh").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 7. 查詢紀錄表
export const searchHistory = pgTable("search_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wordId: uuid("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  queryType: varchar("query_type", { length: 50 }).notNull(), // 'examples', 'synonyms'
  snapshotData: jsonb("snapshot_data").notNull(), // Stores the exact IDs or structure returned
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_search_history_user").on(table.userId),
  index("idx_search_history_created_at").on(table.createdAt),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  mindMaps: many(mindMaps),
  flashcardDecks: many(flashcardDecks),
  searchHistory: many(searchHistory),
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

// Caching relations
export const wordsRelations = relations(words, ({ many }) => ({
  senses: many(wordSenses),
  synonyms: many(synonyms),
  idioms: many(idioms),
  collocations: many(collocations),
  history: many(searchHistory),
}));

export const wordSensesRelations = relations(wordSenses, ({ one, many }) => ({
  word: one(words, {
    fields: [wordSenses.wordId],
    references: [words.id],
  }),
  examples: many(examples),
}));

export const examplesRelations = relations(examples, ({ one }) => ({
  sense: one(wordSenses, {
    fields: [examples.senseId],
    references: [wordSenses.id],
  }),
}));

export const synonymsRelations = relations(synonyms, ({ one }) => ({
  word: one(words, {
    fields: [synonyms.wordId],
    references: [words.id],
  }),
}));

export const idiomsRelations = relations(idioms, ({ one, many }) => ({
  word: one(words, {
    fields: [idioms.wordId],
    references: [words.id],
  }),
  examples: many(idiomExamples),
}));

export const idiomExamplesRelations = relations(idiomExamples, ({ one }) => ({
  idiom: one(idioms, {
    fields: [idiomExamples.idiomId],
    references: [idioms.id],
  }),
}));

export const collocationsRelations = relations(collocations, ({ one, many }) => ({
  word: one(words, {
    fields: [collocations.wordId],
    references: [words.id],
  }),
  examples: many(collocationExamples),
}));

export const collocationExamplesRelations = relations(collocationExamples, ({ one }) => ({
  collocation: one(collocations, {
    fields: [collocationExamples.collocationId],
    references: [collocations.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [searchHistory.wordId],
    references: [words.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMindMapSchema = createInsertSchema(mindMaps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true });

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

// History types
export type SearchHistory = typeof searchHistory.$inferSelect;

// ===== EXAMPLE SENTENCE GENERATION TYPES =====

// Difficulty levels (CEFR-based)
export const difficultyLevels = ["A2", "B1", "B2", "C1"] as const;
export type DifficultyLevel = typeof difficultyLevels[number];

// Topics for example sentences
export const exampleTopics = [
  "daily-life",
  "school",
  "work",
  "travel",
  "health",
  "tech",
  "news",
  "social",
  "workplace",
] as const;
export type ExampleTopic = typeof exampleTopics[number];

// Sentence length categories
export const sentenceLengths = ["short", "medium", "long"] as const;
export type SentenceLength = typeof sentenceLengths[number];

// Single example sentence
export const exampleSentenceSchema = z.object({
  en: z.string(),
  zh_tw: z.string(),
  difficulty: z.enum(difficultyLevels).optional(),
  topic: z.enum(exampleTopics).optional(),
  length: z.enum(sentenceLengths).optional(),
});

export type ExampleSentence = z.infer<typeof exampleSentenceSchema>;

// Sense with examples (for main word definitions)
export const senseWithExamplesSchema = z.object({
  sense_id: z.string(),
  pos: z.string(), // noun, verb, adj, adv, prep, phr.v, other
  gloss_zh: z.string(), // Chinese translation (e.g., "創造；製造" not "製造或產生某物")
  gloss: z.string(), // Short definition/gloss (English)
  examples: z.array(exampleSentenceSchema),
});

export type SenseWithExamples = z.infer<typeof senseWithExamplesSchema>;

// Idiom with examples
export const idiomWithExamplesSchema = z.object({
  phrase: z.string(),
  gloss_zh: z.string(), // Chinese translation of the idiom
  gloss: z.string(), // English meaning
  examples: z.array(exampleSentenceSchema),
});

export type IdiomWithExamples = z.infer<typeof idiomWithExamplesSchema>;

// Collocation with examples
export const collocationWithExamplesSchema = z.object({
  phrase: z.string(),
  gloss_zh: z.string(), // Chinese translation of the collocation
  examples: z.array(exampleSentenceSchema),
});

export type CollocationWithExamples = z.infer<typeof collocationWithExamplesSchema>;

// Complete examples response
export const examplesResponseSchema = z.object({
  query: z.string(),
  senses: z.array(senseWithExamplesSchema),
  idioms: z.array(idiomWithExamplesSchema),
  collocations: z.array(collocationWithExamplesSchema),
  tokenInfo: tokenInfoSchema.optional(),
});

export type ExamplesResponse = z.infer<typeof examplesResponseSchema>;

// Request schema for generating examples
export const generateExamplesRequestSchema = z.object({
  query: z.string(),
  counts: z.object({
    sense: z.number().min(2).max(4).default(2), // 2 or 4 examples per sense
    phrase: z.number().min(1).max(2).default(1), // 1 or 2 examples per idiom/collocation
  }).optional(),
});

export type GenerateExamplesRequest = z.infer<typeof generateExamplesRequestSchema>;

// ===== SYNONYM COMPARISON TYPES =====

// Single synonym entry with comparison
export const synonymEntrySchema = z.object({
  word: z.string(),
  pos: z.string(), // Part of speech (n., v., adj., adv., etc.)
  similarity: z.number().min(0).max(1), // 0-1 score for sorting
  difference_zh: z.string(), // Chinese explanation of main difference
  examples: z.array(z.object({
    en: z.string(),
    zh_tw: z.string(),
  })).length(2), // Fixed 2 examples
});

export type SynonymEntry = z.infer<typeof synonymEntrySchema>;

// Complete synonym comparison response
export const synonymComparisonResponseSchema = z.object({
  query: z.string(),
  synonyms: z.array(synonymEntrySchema).max(7),
  tokenInfo: tokenInfoSchema.optional(),
});

export type SynonymComparisonResponse = z.infer<typeof synonymComparisonResponseSchema>;

// Request schema for generating synonym comparison
export const generateSynonymsRequestSchema = z.object({
  query: z.string(),
});

export type GenerateSynonymsRequest = z.infer<typeof generateSynonymsRequestSchema>;

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
  tokenInfo: tokenInfoSchema.optional(),
});

export type FlashcardDeck = z.infer<typeof flashcardDeckSchema>;

// API request/response schemas
export const generateWordsRequestSchema = z.object({
  word: z.string(),
  category: z.enum(wordCategories),
  existingWords: z.array(z.string()).optional().default([]),
});

export type GenerateWordsRequest = z.infer<typeof generateWordsRequestSchema>;

export const generateWordsResponseSchema = z.object({
  words: z.array(z.string()),
});

export type GenerateWordsResponse = z.infer<typeof generateWordsResponseSchema>;

// Mind map save/load schemas
export const mindMapSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  nodes: z.array(mindMapNodeSchema),
  createdAt: z.string(),
});

export type MindMap = z.infer<typeof mindMapSchema>;
