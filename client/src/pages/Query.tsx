import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryContext } from "@/contexts/QueryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import LogoText from "@/components/LogoText";
import TokenDisplay from "@/components/TokenDisplay";

export default function Query() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const {
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
    isExamplesPending,
    isSynonymsPending,
  } = useQueryContext();

  const loadingHint =
    language === "en" ? "This may take a few seconds." : "這可能會需要幾秒鐘時間。";
  const generatingExamplesLabel =
    language === "en" ? "Generating example sentences..." : "例句生成中...";
  const generatingSynonymsLabel =
    language === "en" ? "Generating synonym comparison..." : "同義字比較生成中...";

  // Helper function to get part of speech abbreviation (always English)
  const getPosLabel = (pos: string): string => {
    const posMap: Record<string, string> = {
      noun: "n.",
      verb: "v.",
      adjective: "adj.",
      adverb: "adv.",
      pronoun: "pron.",
      preposition: "prep.",
      conjunction: "conj.",
      interjection: "int.",
      phrase: "phr.",
      "phr.v": "phr.v.",
      other: "other",
    };
    return posMap[pos.toLowerCase()] || pos;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-top">
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <LogoText className="text-xl sm:text-2xl font-bold text-primary shrink-0" />
            <div className="h-6 w-px bg-border shrink-0" />
            <h2 className="text-xl sm:text-2xl font-semibold whitespace-nowrap truncate">
              {language === "en" ? "Query" : "查詢"}
            </h2>
          </div>
          <TokenDisplay variant="header" className="shrink-0" />
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 pt-6 space-y-6">
      {/* Mode Toggle */}
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "examples" | "synonyms")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-64 mx-auto">
            <TabsTrigger value="examples" className="text-sm py-1.5" data-testid="tab-examples">
              {language === "en" ? "Examples" : "例句"}
            </TabsTrigger>
            <TabsTrigger value="synonyms" className="text-sm py-1.5" data-testid="tab-synonyms">
              {language === "en" ? "Synonyms" : "同義字"}
            </TabsTrigger>
          </TabsList>

          {/* Examples Mode */}
          <TabsContent value="examples" className="space-y-6">
            <div className="space-y-4">
              <Input
                placeholder={language === "en" ? "Enter a word or phrase..." : "輸入單字或片語..."}
                value={examplesInput}
                onChange={(e) => setExamplesInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (examplesInput.trim()) {
                      handleExamplesSearch(examplesInput, { sense: 3, phrase: 2 });
                    }
                  }
                }}
                className="h-10"
                data-testid="input-examples"
              />

              <Button
                onClick={() => handleExamplesSearch(examplesInput, { sense: 3, phrase: 2 })}
                disabled={!examplesInput.trim() || isExamplesPending}
                className="w-full"
                data-testid="button-search-examples"
              >
                {isExamplesPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                {language === "en" ? "Generate Examples" : "生成例句"}
              </Button>
            {examplesNotFound && (
              <div className="text-sm text-destructive text-center">
                {language === "en" ? "Word not found." : "查無此字"}
              </div>
            )}
            </div>

            {/* Examples Loading */}
            {isExamplesPending && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-primary">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm font-medium">{generatingExamplesLabel}</p>
                <p className="text-xs text-muted-foreground">{loadingHint}</p>
              </div>
            )}

            {/* Examples Results */}
            {examplesResults && !isExamplesPending && (
              <>
                {/* Senses */}
                {examplesResults.senses && examplesResults.senses.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-primary">{language === "en" ? "Word Meanings" : "詞義"}</h3>
                    {examplesResults.senses.map((sense) => {
                      const isExpanded = expandedSenses.has(sense.sense_id);
                      const displayExamples = isExpanded ? sense.examples : sense.examples.slice(0, 3);

                      return (
                        <div key={sense.sense_id} className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="text-sm text-muted-foreground shrink-0">
                              {getPosLabel(sense.pos)}
                            </span>
                            <div className="flex-1">
                              <p className="text-base font-medium">{sense.gloss_zh}</p>
                              <p className="text-sm text-muted-foreground italic">{sense.gloss}</p>
                            </div>
                          </div>

                          <div className="space-y-2 ml-0">
                            {displayExamples.map((example, idx) => (
                              <div key={idx} className="pl-4 border-l-2 border-primary/40 space-y-1">
                                <p className="text-sm">{example.en}</p>
                                <p className="text-sm text-muted-foreground">{example.zh_tw}</p>
                              </div>
                            ))}
                          </div>

                          {sense.examples.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSenseExpansion(sense.sense_id)}
                              className="w-full"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  {language === "en" ? "Show Less" : "收起"}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  {language === "en" ? "Show More" : "展開更多"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Idioms - only show if there are idioms */}
                {examplesResults.idioms && examplesResults.idioms.length > 0 && examplesResults.idioms.some(i => i.examples.length > 0) && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-primary">{language === "en" ? "Idioms" : "慣用語"}</h3>
                    {examplesResults.idioms.map((idiom) => {
                      const isExpanded = expandedIdioms.has(idiom.phrase);
                      const displayExamples = isExpanded ? idiom.examples : idiom.examples.slice(0, 2);

                      return (
                        <div key={idiom.phrase} className="space-y-3">
                          <div>
                            <p className="font-semibold">{idiom.phrase}</p>
                            <p className="text-base font-medium">{idiom.gloss_zh}</p>
                            <p className="text-sm text-muted-foreground italic">{idiom.gloss}</p>
                          </div>

                          <div className="space-y-2">
                            {displayExamples.map((example, idx) => (
                              <div key={idx} className="pl-4 border-l-2 border-primary/40 space-y-1">
                                <p className="text-sm">{example.en}</p>
                                <p className="text-sm text-muted-foreground">{example.zh_tw}</p>
                              </div>
                            ))}
                          </div>

                          {idiom.examples.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleIdiomExpansion(idiom.phrase)}
                              className="w-full"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  {language === "en" ? "Show Less" : "收起"}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  {language === "en" ? "Show More" : "展開更多"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Collocations - only show if there are collocations */}
                {examplesResults.collocations && examplesResults.collocations.length > 0 && examplesResults.collocations.some(c => c.examples.length > 0) && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-primary">{language === "en" ? "Collocations" : "搭配詞"}</h3>
                    {examplesResults.collocations.map((collocation) => {
                      const isExpanded = expandedCollocations.has(collocation.phrase);
                      const displayExamples = isExpanded ? collocation.examples : collocation.examples.slice(0, 2);

                      return (
                        <div key={collocation.phrase} className="space-y-3">
                          <div>
                            <p className="font-semibold">{collocation.phrase}</p>
                            <p className="text-base font-medium">{collocation.gloss_zh}</p>
                          </div>

                          <div className="space-y-2">
                            {displayExamples.map((example, idx) => (
                              <div key={idx} className="pl-4 border-l-2 border-primary/40 space-y-1">
                                <p className="text-sm">{example.en}</p>
                                <p className="text-sm text-muted-foreground">{example.zh_tw}</p>
                              </div>
                            ))}
                          </div>

                          {collocation.examples.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCollocationExpansion(collocation.phrase)}
                              className="w-full"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  {language === "en" ? "Show Less" : "收起"}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  {language === "en" ? "Show More" : "展開更多"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Synonyms Mode */}
          <TabsContent value="synonyms" className="space-y-6">
            <div className="space-y-4">
              <Input
                placeholder={language === "en" ? "Enter a word..." : "輸入單字..."}
                value={synonymsInput}
                onChange={(e) => setSynonymsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (synonymsInput.trim()) {
                      handleSynonymsSearch(synonymsInput);
                    }
                  }
                }}
                className="h-10"
                data-testid="input-synonyms"
              />

              <Button
                onClick={() => handleSynonymsSearch(synonymsInput)}
                disabled={!synonymsInput.trim() || isSynonymsPending}
                className="w-full"
                data-testid="button-search-synonyms"
              >
                {isSynonymsPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                {language === "en" ? "Find Synonyms" : "查找同義字"}
              </Button>
            {synonymsNotFound && (
              <div className="text-sm text-destructive text-center">
                {language === "en" ? "Word not found." : "查無此字"}
              </div>
            )}
            </div>

            {/* Synonyms Loading */}
            {isSynonymsPending && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-primary">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm font-medium">{generatingSynonymsLabel}</p>
                <p className="text-xs text-muted-foreground">{loadingHint}</p>
              </div>
            )}

            {/* Synonyms Results */}
            {synonymsResults && !isSynonymsPending && synonymsResults.synonyms && synonymsResults.synonyms.length > 0 && (
              <div className="space-y-6">
                {synonymsResults.synonyms.map((synonym) => (
                  <div key={synonym.word} className="space-y-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-semibold text-primary">{synonym.word}</p>
                        <span className="text-sm text-muted-foreground">{synonym.pos}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{synonym.difference_zh}</p>
                    </div>

                    <div className="space-y-2">
                      {synonym.examples.map((example, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-primary/40 space-y-1">
                          <p className="text-sm">{example.en}</p>
                          <p className="text-sm text-muted-foreground">{example.zh_tw}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
