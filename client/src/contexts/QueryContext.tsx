import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { trackExampleGeneration, trackSynonymComparison } from "@/lib/analytics";
import type {
  ExamplesResponse,
  SynonymComparisonResponse,
} from "@shared/schema";

// Cache management
interface ExamplesCache {
  [key: string]: ExamplesResponse;
}

interface SynonymsCache {
  [key: string]: SynonymComparisonResponse;
}

const examplesCache: ExamplesCache = {};
const synonymsCache: SynonymsCache = {};

interface QueryContextType {
  mode: "examples" | "synonyms";
  setMode: (mode: "examples" | "synonyms") => void;
  
  examplesInput: string;
  setExamplesInput: (val: string) => void;
  
  synonymsInput: string;
  setSynonymsInput: (val: string) => void;
  
  examplesResults: ExamplesResponse | null;
  synonymsResults: SynonymComparisonResponse | null;
  
  expandedSenses: Set<string>;
  expandedIdioms: Set<string>;
  expandedCollocations: Set<string>;
  
  toggleSenseExpansion: (id: string) => void;
  toggleIdiomExpansion: (phrase: string) => void;
  toggleCollocationExpansion: (phrase: string) => void;
  
  examplesNotFound: boolean;
  synonymsNotFound: boolean;
  
  handleExamplesSearch: (query: string, counts?: { sense: number; phrase: number }) => void;
  handleSynonymsSearch: (query: string) => void;
  
  isExamplesPending: boolean;
  isSynonymsPending: boolean;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"examples" | "synonyms">("examples");
  const [examplesInput, setExamplesInputState] = useState("");
  const [synonymsInput, setSynonymsInputState] = useState("");
  const [examplesResults, setExamplesResults] = useState<ExamplesResponse | null>(null);
  const [synonymsResults, setSynonymsResults] = useState<SynonymComparisonResponse | null>(null);
  
  const [expandedSenses, setExpandedSenses] = useState<Set<string>>(new Set());
  const [expandedIdioms, setExpandedIdioms] = useState<Set<string>>(new Set());
  const [expandedCollocations, setExpandedCollocations] = useState<Set<string>>(new Set());
  
  const [examplesNotFound, setExamplesNotFound] = useState(false);
  const [synonymsNotFound, setSynonymsNotFound] = useState(false);

  const { language } = useLanguage();
  const t = useTranslation(language);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const examplesNotFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synonymsNotFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (examplesNotFoundTimerRef.current) {
        clearTimeout(examplesNotFoundTimerRef.current);
      }
      if (synonymsNotFoundTimerRef.current) {
        clearTimeout(synonymsNotFoundTimerRef.current);
      }
    };
  }, []);

  // Wrappers to clear results when input is cleared
  const setExamplesInput = (val: string) => {
    setExamplesInputState(val);
    if (!val.trim()) {
      setExamplesResults(null);
      setExamplesNotFound(false);
    }
  };

  const setSynonymsInput = (val: string) => {
    setSynonymsInputState(val);
    if (!val.trim()) {
      setSynonymsResults(null);
      setSynonymsNotFound(false);
    }
  };

  const parseError = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      const message = error.message;
      
      if (/^\d{3}:/.test(message)) {
        const statusCode = message.match(/^(\d{3})/)?.[1];
        const payload = message.split(":").slice(1).join(":").trim();
        
        if (payload.startsWith("{") || payload.startsWith("[")) {
          try {
            const parsed = JSON.parse(payload);
            if (parsed?.message) return parsed.message;
            if (parsed?.error && parsed?.message) return `${parsed.error}: ${parsed.message}`;
            if (parsed?.error) return parsed.error;
          } catch { }
        }
        
        if (payload && !payload.startsWith("{") && !payload.startsWith("[")) {
          return payload;
        }
        
        if (statusCode === "401") return language === "en" ? "Authentication failed. Please log in again." : "認證失敗，請重新登入";
        if (statusCode === "403") return language === "en" ? "Access denied" : "存取被拒絕";
        if (statusCode === "402") return language === "en" ? "Insufficient tokens" : "點數不足";
        if (statusCode === "500") return language === "en" ? "Server error. Please try again later." : "伺服器錯誤，請稍後再試";
        if (statusCode === "503") return language === "en" ? "Service unavailable. Please try again later." : "服務暫時無法使用，請稍後再試";
      }
      
      if (message.includes("Failed to fetch") || 
          message.includes("NetworkError") || 
          message.includes("Network error") ||
          message.includes("fetch") ||
          message.includes("Cannot connect")) {
        return language === "en"
          ? "Network error. Please check your connection and API configuration."
          : "網路錯誤，請檢查您的網路連線和 API 設定";
      }
      
      if (message && message !== fallback) {
        return message;
      }
    }
    
    return fallback;
  };

  const isNotFoundError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    if (message.startsWith("404")) {
      return true;
    }
    if (message.includes("not found")) {
      return true;
    }
    try {
      const payload = error.message.split(":").slice(1).join(":").trim();
      if (!payload) return false;
      const parsed = JSON.parse(payload);
      const parsedMessage = String(parsed?.message ?? parsed?.error ?? "").toLowerCase();
      return parsedMessage.includes("not found");
    } catch {
      return false;
    }
  };

  const showTransientMessage = (
    setter: (value: boolean) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    setter(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setter(false);
      timerRef.current = null;
    }, 1500);
  };

  // Examples generation mutation
  const examplesMutation = useMutation({
    mutationFn: async ({ query, counts }: { query: string; counts?: { sense: number; phrase: number } }) => {
      const cacheKey = `${query}|${counts?.sense || 2}|${counts?.phrase || 1}`;
      if (examplesCache[cacheKey]) {
        return examplesCache[cacheKey];
      }

      const response = await apiRequest("POST", "/api/examples/generate", {
        query,
        counts,
      });
      const data = (await response.json()) as ExamplesResponse;
      
      const { tokenInfo: _examplesTokenInfo, ...cacheableExamples } = data;
      examplesCache[cacheKey] = cacheableExamples;
      
      return data;
    },
    onSuccess: (data: ExamplesResponse, variables) => {
      const hasContent =
        (data.senses?.length ?? 0) > 0 ||
        (data.idioms?.some((i) => i.examples.length > 0) ?? false) ||
        (data.collocations && data.collocations.length > 0);

      if (!hasContent) {
        setExamplesResults(null);
        showTransientMessage(setExamplesNotFound, examplesNotFoundTimerRef);
        return;
      }

      setExamplesResults(data);
      setExamplesNotFound(false);
      // Only reset expansion if query changed? 
      // Actually, if we get new results, we should probably reset expansion.
      // But if we are just "fetching more" (which happens in toggleSenseExpansion), we might not want to reset ALL.
      // However, the current logic in Query.tsx was resetting it every time mutation succeeds.
      // But wait, `toggleSenseExpansion` calls `handleExamplesSearch`.
      // If `handleExamplesSearch` triggers `onSuccess`, it resets `expandedSenses`.
      // That seems like a bug in the original code if "Show More" triggers a fetch which then resets expansion.
      // Let's look at Query.tsx again.
      // Query.tsx: setExpandedSenses(new Set()) is called in onSuccess.
      // toggleSenseExpansion adds to expandedSenses BEFORE calling handleExamplesSearch.
      // If handleExamplesSearch -> mutation -> onSuccess -> clear expandedSenses, then the expansion is lost immediately.
      // This suggests `toggleSenseExpansion` relies on cached data returning fast or existing data?
      // Actually, checking Query.tsx:
      /*
        const toggleSenseExpansion = (senseId: string) => {
            const newExpanded = new Set(expandedSenses);
            // ... toggles ...
            setExpandedSenses(newExpanded); // Updates state immediately

            if (needsMore) {
                handleExamplesSearch(...)
            }
        }
      */
      // If `handleExamplesSearch` runs, it triggers mutation. onSuccess runs later.
      // If onSuccess clears expandedSenses, then the UI collapses.
      // This looks like a potential issue in the original code, OR `counts` change creates a new cache key, 
      // but if it returns from cache synchronously? No, mutation is async.
      //
      // Let's replicate the original behavior for now to be safe, but maybe be smarter.
      // If the query is the same as current results, maybe we shouldn't clear expansion?
      // Or maybe we should only clear if the query string changes.
      
      if (variables.query !== examplesResults?.query) {
          setExpandedSenses(new Set());
          setExpandedIdioms(new Set());
          setExpandedCollocations(new Set());
      }

      if (data?.tokenInfo) {
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });

      trackExampleGeneration(variables.query, {
        senses: data.senses?.length || 0,
        idioms: data.idioms?.length || 0,
        collocations: data.collocations?.length || 0,
      });
    },
    onError: (error: unknown) => {
      if (isNotFoundError(error)) {
        setExamplesResults(null);
        showTransientMessage(setExamplesNotFound, examplesNotFoundTimerRef);
        return;
      }
      console.error("Examples generation error:", error);
      toast({
        title: t.toast.generationFailed,
        description: parseError(error, t.toast.failedToGenerateExamples),
        variant: "destructive",
      });
    },
  });

  // Synonyms generation mutation
  const synonymsMutation = useMutation({
    mutationFn: async (query: string) => {
      if (synonymsCache[query]) {
        return synonymsCache[query];
      }

      const response = await apiRequest("POST", "/api/synonyms/generate", { query });
      const data = (await response.json()) as SynonymComparisonResponse;
      
      const { tokenInfo: _synonymTokenInfo, ...cacheableSynonyms } = data;
      synonymsCache[query] = cacheableSynonyms;
      
      return data;
    },
    onSuccess: (data: SynonymComparisonResponse, query) => {
      if (!data.synonyms || data.synonyms.length === 0) {
        setSynonymsResults(null);
        showTransientMessage(setSynonymsNotFound, synonymsNotFoundTimerRef);
        return;
      }

      setSynonymsResults(data);
      setSynonymsNotFound(false);
      if (data?.tokenInfo) {
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });

      trackSynonymComparison(query, data.synonyms.length);
    },
    onError: (error: unknown) => {
      if (isNotFoundError(error)) {
        setSynonymsResults(null);
        showTransientMessage(setSynonymsNotFound, synonymsNotFoundTimerRef);
        return;
      }
      console.error("Synonyms generation error:", error);
      toast({
        title: t.toast.generationFailed,
        description: parseError(error, t.toast.failedToGenerateSynonyms),
        variant: "destructive",
      });
    },
  });

  const handleExamplesSearch = (query: string, counts?: { sense: number; phrase: number }) => {
    if (!query.trim()) return;
    setExamplesInputState(query);
    setExamplesNotFound(false);
    const defaultCounts = counts || { sense: 3, phrase: 2 };
    examplesMutation.mutate({ query: query.trim(), counts: defaultCounts });
  };

  const handleSynonymsSearch = (query: string) => {
    if (!query.trim()) return;
    setSynonymsInputState(query);
    setSynonymsNotFound(false);
    synonymsMutation.mutate(query.trim());
  };

  // Toggle functions
  const toggleSenseExpansion = (senseId: string) => {
    const newExpanded = new Set(expandedSenses);
    if (newExpanded.has(senseId)) {
      newExpanded.delete(senseId);
    } else {
      newExpanded.add(senseId);
      if (examplesResults) {
        const sense = examplesResults.senses.find(s => s.sense_id === senseId);
        if (sense && sense.examples.length < 6) {
          handleExamplesSearch(examplesResults.query, { sense: 6, phrase: 2 });
        }
      }
    }
    setExpandedSenses(newExpanded);
  };

  const toggleIdiomExpansion = (phrase: string) => {
    const newExpanded = new Set(expandedIdioms);
    if (newExpanded.has(phrase)) {
      newExpanded.delete(phrase);
    } else {
      newExpanded.add(phrase);
      // Idioms now only have 1 example each, so no need to generate more on expansion
    }
    setExpandedIdioms(newExpanded);
  };

  const toggleCollocationExpansion = (phrase: string) => {
    const newExpanded = new Set(expandedCollocations);
    if (newExpanded.has(phrase)) {
      newExpanded.delete(phrase);
    } else {
      newExpanded.add(phrase);
      // Collocations no longer have examples, so no need to check for expansion
    }
    setExpandedCollocations(newExpanded);
  };

  const value = {
    mode,
    setMode,
    examplesInput,
    setExamplesInput,
    synonymsInput,
    setSynonymsInput,
    examplesResults,
    synonymsResults,
    expandedSenses,
    expandedIdioms,
    expandedCollocations,
    toggleSenseExpansion,
    toggleIdiomExpansion,
    toggleCollocationExpansion,
    examplesNotFound,
    synonymsNotFound,
    handleExamplesSearch,
    handleSynonymsSearch,
    isExamplesPending: examplesMutation.isPending,
    isSynonymsPending: synonymsMutation.isPending,
  };

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}

export function useQueryContext() {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error("useQueryContext must be used within a QueryProvider");
  }
  return context;
}

