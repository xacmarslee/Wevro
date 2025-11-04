import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, Copy, Check, BookOpen, Languages } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Types for dictionary and translation
interface WordSense {
  id: string;
  pos: string;
  defEn: string;
  defZhTw?: string;
  examples?: Array<{ en: string; zhTw?: string }>;
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryResult {
  lemma: string;
  headword: string;
  senses: WordSense[];
  enReady: boolean;
  zhReady: boolean;
}

interface SearchSuggestion {
  word: string;
}

export default function Query() {
  const [mode, setMode] = useState<"dictionary" | "translation">("dictionary");
  const [dictionaryInput, setDictionaryInput] = useState("");
  const [translationInput, setTranslationInput] = useState("");
  const [dictionaryResults, setDictionaryResults] = useState<DictionaryResult | null>(null);
  const [translations, setTranslations] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useLanguage();
  const { toast } = useToast();

  // Fetch search suggestions for autocomplete
  const { data: suggestionsData } = useQuery<{ suggestions: SearchSuggestion[] }>({
    queryKey: ["/api/dictionary/search", searchQuery],
    enabled: searchQuery.length > 0 && mode === "dictionary",
    staleTime: 30000, // Cache for 30 seconds
  });

  const suggestions: SearchSuggestion[] = suggestionsData?.suggestions || [];

  // Dictionary lookup mutation
  const dictionaryMutation = useMutation({
    mutationFn: async (word: string) => {
      const response = await fetch(`/api/dictionary/lookup/${encodeURIComponent(word)}`);
      if (!response.ok) {
        throw new Error("Dictionary lookup failed");
      }
      return await response.json();
    },
    onSuccess: (data: DictionaryResult) => {
      setDictionaryResults(data);
      setOpen(false);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Lookup failed" : "查詢失敗",
        description: language === "en" ? "Word not found in dictionary" : "字典中找不到此單字",
        variant: "destructive",
      });
    },
  });

  // Translation mutation
  const translationMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/query", { text });
      return await response.json();
    },
    onSuccess: (data) => {
      setTranslations(data.translations || []);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Translation failed" : "翻譯失敗",
        description: language === "en" ? "Failed to translate text" : "翻譯文字失敗",
        variant: "destructive",
      });
    },
  });

  const handleDictionarySearch = (word: string) => {
    if (!word.trim()) return;
    setDictionaryInput(word);
    dictionaryMutation.mutate(word.trim());
  };

  const handleTranslationSearch = () => {
    if (!translationInput.trim()) return;
    translationMutation.mutate(translationInput.trim());
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: language === "en" ? "Copied" : "已複製",
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper function to translate part of speech
  const getPosLabel = (pos: string): string => {
    const posMap: Record<string, { en: string; zh: string }> = {
      noun: { en: "n.", zh: "名詞" },
      verb: { en: "v.", zh: "動詞" },
      adjective: { en: "adj.", zh: "形容詞" },
      adverb: { en: "adv.", zh: "副詞" },
      pronoun: { en: "pron.", zh: "代名詞" },
      preposition: { en: "prep.", zh: "介系詞" },
      conjunction: { en: "conj.", zh: "連接詞" },
      interjection: { en: "int.", zh: "感嘆詞" },
    };
    return language === "en" ? (posMap[pos]?.en || pos) : (posMap[pos]?.zh || pos);
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">Wevro</h1>
        <div className="h-6 w-px bg-border" />
        <h2 className="text-2xl font-semibold">
          {language === "en" ? "Query" : "查詢"}
        </h2>
      </div>

      {/* Mode Toggle */}
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as "dictionary" | "translation")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="dictionary" className="gap-2" data-testid="tab-dictionary">
            <BookOpen className="h-4 w-4" />
            {language === "en" ? "Dictionary" : "字典"}
          </TabsTrigger>
          <TabsTrigger value="translation" className="gap-2" data-testid="tab-translation">
            <Languages className="h-4 w-4" />
            {language === "en" ? "Translation" : "翻譯"}
          </TabsTrigger>
        </TabsList>

        {/* Dictionary Mode */}
        <TabsContent value="dictionary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "en" ? "Look up a word" : "查詢單字"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder={
                        language === "en"
                          ? "Enter a word (e.g., create, hello)..."
                          : "輸入單字（例如：create、hello）..."
                      }
                      value={dictionaryInput}
                      onChange={(e) => {
                        setDictionaryInput(e.target.value);
                        setSearchQuery(e.target.value);
                        setOpen(e.target.value.length > 0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !open) {
                          handleDictionarySearch(dictionaryInput);
                        }
                      }}
                      className="h-10"
                      data-testid="input-dictionary"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandEmpty>
                        {language === "en" ? "No suggestions found" : "沒有找到建議"}
                      </CommandEmpty>
                      <CommandGroup>
                        {suggestions.map((suggestion) => (
                          <CommandItem
                            key={suggestion.word}
                            value={suggestion.word}
                            onSelect={(value) => {
                              handleDictionarySearch(value);
                            }}
                            data-testid={`suggestion-${suggestion.word}`}
                          >
                            {suggestion.word}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => handleDictionarySearch(dictionaryInput)}
                disabled={!dictionaryInput.trim() || dictionaryMutation.isPending}
                className="w-full"
                data-testid="button-search-dictionary"
              >
                {dictionaryMutation.isPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 mr-2" />
                )}
                {language === "en" ? "Look Up" : "查詢"}
              </Button>
            </CardContent>
          </Card>

          {/* Dictionary Results */}
          {dictionaryResults && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{dictionaryResults.headword}</CardTitle>
                  {!dictionaryResults.zhReady && (
                    <Badge variant="secondary">
                      {language === "en" ? "Translating..." : "翻譯中..."}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {dictionaryResults.senses.map((sense, index) => (
                    <div
                      key={sense.id}
                      className="p-4 rounded-lg bg-muted/30 space-y-2"
                      data-testid={`sense-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {getPosLabel(sense.pos)}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-muted-foreground">{sense.defEn}</p>
                          {sense.defZhTw && (
                            <p className="text-base font-medium">{sense.defZhTw}</p>
                          )}
                          {sense.examples && sense.examples.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {sense.examples.slice(0, 2).map((example, i) => (
                                <div key={i} className="text-sm pl-3 border-l-2 border-border">
                                  <p className="text-muted-foreground italic">{example.en}</p>
                                  {example.zhTw && (
                                    <p className="mt-1">{example.zhTw}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Translation Mode */}
        <TabsContent value="translation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "en" ? "Translate text" : "翻譯文字"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={
                  language === "en"
                    ? "Enter text to translate (English ↔ Traditional Chinese)..."
                    : "輸入要翻譯的文字（英文 ↔ 繁體中文）..."
                }
                value={translationInput}
                onChange={(e) => setTranslationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleTranslationSearch();
                  }
                }}
                className="min-h-[180px] resize-none"
                data-testid="input-translation"
              />
              <Button
                onClick={handleTranslationSearch}
                disabled={!translationInput.trim() || translationMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-translate"
              >
                {translationMutation.isPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Languages className="h-5 w-5 mr-2" />
                )}
                {language === "en" ? "Translate" : "翻譯"}
              </Button>
            </CardContent>
          </Card>

          {/* Translation Results */}
          {translations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "en" ? "Translation Options" : "翻譯選項"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {translations.map((translation, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 p-4 rounded-lg bg-muted/30 hover-elevate group"
                      data-testid={`translation-option-${index}`}
                    >
                      <div className="flex-1 text-base leading-relaxed">{translation}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCopy(translation, index)}
                        data-testid={`button-copy-${index}`}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
