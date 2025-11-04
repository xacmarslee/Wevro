/**
 * Free Dictionary API Adapter
 * 
 * This adapter normalizes responses from dictionaryapi.dev into our standard WordEntry format.
 * The API is free, requires no authentication, and provides:
 * - Phonetics (IPA + audio)
 * - Multiple meanings per word
 * - Definitions, examples, synonyms, antonyms
 * - Etymology
 */

import { type WordEntry, type WordSense, type ProviderInfo } from "@shared/schema";

// Free Dictionary API Response Types
interface DictionaryAPIPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryAPIDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryAPIMeaning {
  partOfSpeech: string;
  definitions: DictionaryAPIDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryAPIResponse {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryAPIPhonetic[];
  origin?: string;
  meanings: DictionaryAPIMeaning[];
}

/**
 * Normalize lemma for consistent cache keys
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove punctuation (except hyphens and apostrophes)
 */
export function normalizeLemma(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[^\w\s'-]/g, "")  // Keep letters, numbers, spaces, hyphens, apostrophes
    .replace(/\s+/g, " ");       // Normalize multiple spaces to single space
}

/**
 * Fetch word data from Free Dictionary API
 * API endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
 */
export async function fetchFromDictionaryAPI(word: string): Promise<WordEntry | null> {
  const normalizedWord = normalizeLemma(word);
  
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Word not found in dictionary: ${normalizedWord}`);
        return null;
      }
      throw new Error(`Dictionary API error: ${response.status}`);
    }

    const data: DictionaryAPIResponse[] = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    // Use the first result
    const entry = data[0];
    
    // Extract phonetic and audio (prefer first available)
    const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || undefined;
    const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || undefined;

    // Convert meanings to our WordSense format
    const senses: WordSense[] = [];
    let senseIndex = 0;

    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        const sense: WordSense = {
          id: `s${++senseIndex}`,
          pos: meaning.partOfSpeech,
          defEn: def.definition,
          examples: def.example ? [{ en: def.example }] : [],
          synonyms: Array.from(new Set([
            ...(def.synonyms || []),
            ...(meaning.synonyms || [])
          ])).slice(0, 10),  // Limit to 10
          antonyms: Array.from(new Set([
            ...(def.antonyms || []),
            ...(meaning.antonyms || [])
          ])).slice(0, 10),  // Limit to 10
        };

        senses.push(sense);
      }
    }

    // Build provider info
    const provider: ProviderInfo = {
      name: "dictionaryapi.dev",
      retrievedAt: Date.now(),
      licenseNote: "Free Dictionary API - Educational use only",
    };

    // Build complete word entry
    const wordEntry: WordEntry = {
      lemma: normalizedWord,
      headword: entry.word,
      phonetic,
      audioUrl,
      origin: entry.origin,
      senses,
      provider,
      enReady: true,
      zhReady: false,  // Chinese translation not yet generated
    };

    console.log(`✓ Fetched dictionary data for "${normalizedWord}" - ${senses.length} senses`);
    
    return wordEntry;
  } catch (error) {
    console.error(`Error fetching from dictionary API for "${normalizedWord}":`, error);
    throw error;
  }
}

/**
 * Extract collocation phrases from examples
 * Simple heuristic: look for common patterns like "verb + noun", "adj + noun"
 */
export function extractCollocations(word: string, examples: string[]): Array<{ phrase: string }> {
  const collocations: Array<{ phrase: string }> = [];
  const wordLower = word.toLowerCase();

  for (const example of examples) {
    const exampleLower = example.toLowerCase();
    
    // Find sentences containing the word
    if (exampleLower.includes(wordLower)) {
      // Extract 2-4 word phrases containing the target word
      const words = example.split(/\s+/);
      const wordIndex = words.findIndex(w => w.toLowerCase().includes(wordLower));
      
      if (wordIndex !== -1) {
        // Try to extract phrase around the word
        const start = Math.max(0, wordIndex - 2);
        const end = Math.min(words.length, wordIndex + 3);
        const phrase = words.slice(start, end).join(" ");
        
        if (phrase.length > word.length + 2 && phrase.length < 50) {
          collocations.push({ phrase: phrase.replace(/[.,!?;:]$/g, "") });
        }
      }
    }
  }

  // Return unique collocations (max 5)
  return Array.from(new Set(collocations.map(c => c.phrase)))
    .slice(0, 5)
    .map(phrase => ({ phrase }));
}
