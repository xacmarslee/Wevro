import { z } from "zod";

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
  name: z.string(),
  nodes: z.array(mindMapNodeSchema),
  createdAt: z.string(),
});

export type MindMap = z.infer<typeof mindMapSchema>;
