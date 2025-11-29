import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { ExamplesResponse, SynonymComparisonResponse, SenseWithExamples, IdiomWithExamples, CollocationWithExamples } from "@shared/schema";

export default function HistoryDetail() {
  const [, params] = useRoute("/history/:id");
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const id = params?.id;

  // Local state for expansion
  const [expandedSenses, setExpandedSenses] = useState<Set<string>>(new Set());
  const [expandedIdioms, setExpandedIdioms] = useState<Set<string>>(new Set());
  const [expandedCollocations, setExpandedCollocations] = useState<Set<string>>(new Set());

  const toggleSenseExpansion = (id: string) => {
    const newSet = new Set(expandedSenses);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSenses(newSet);
  };

  const toggleIdiomExpansion = (id: string) => {
    const newSet = new Set(expandedIdioms);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIdioms(newSet);
  };

  const toggleCollocationExpansion = (id: string) => {
    const newSet = new Set(expandedCollocations);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCollocations(newSet);
  };

  const { data, isLoading, error } = useQuery<ExamplesResponse | SynonymComparisonResponse>({
    queryKey: [`/api/history/${id}`],
    queryFn: async () => {
      if (!id) throw new Error("No ID provided");
      const response = await fetchWithAuth(`/api/history/${id}`);
      await throwIfResNotOk(response);
      return response.json();
    },
    enabled: !!id,
  });

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

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background relative">
        <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 safe-area-top">
          <div className="px-6 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/history")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{language === "en" ? "History Detail" : "紀錄詳情"}</h1>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ paddingTop: '20px', minHeight: 'calc(100vh - 73px)' }}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full overflow-y-auto bg-background relative">
        <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 safe-area-top">
          <div className="px-6 py-4 flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => setLocation("/history")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{language === "en" ? "Error" : "錯誤"}</h1>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 text-center" style={{ paddingTop: '20px', minHeight: 'calc(100vh - 73px)' }}>
            <p className="text-muted-foreground">
              {language === "en" ? "Failed to load history detail." : "無法載入紀錄詳情。"}
            </p>
        </div>
      </div>
    );
  }

  // Check type of response
  const isExamples = "senses" in data;
  
  // Cast data for easier access
  const examplesData = isExamples ? (data as ExamplesResponse) : null;
  const synonymsData = !isExamples ? (data as SynonymComparisonResponse) : null;

  return (
    <div className="h-full overflow-y-auto bg-background relative">
       <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 safe-area-top">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/history")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
             {data.query}
          </h1>
        </div>
      </div>

      <div className="p-6 pb-32 space-y-6" style={{ paddingTop: '20px' }}>
        {isExamples && examplesData && (
          <>
            {/* Senses */}
            {examplesData.senses && examplesData.senses.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-primary">{language === "en" ? "Word Meanings" : "詞義"}</h3>
                {examplesData.senses.map((sense: SenseWithExamples) => {
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

            {/* Idioms */}
            {examplesData.idioms && examplesData.idioms.length > 0 && examplesData.idioms.some(i => i.examples.length > 0) && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-primary">{language === "en" ? "Idioms" : "慣用語"}</h3>
                {examplesData.idioms.map((idiom: IdiomWithExamples) => {
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

            {/* Collocations */}
            {examplesData.collocations && examplesData.collocations.length > 0 && examplesData.collocations.some(c => c.examples.length > 0) && (
               <div className="space-y-6">
                <h3 className="text-lg font-semibold text-primary">{language === "en" ? "Collocations" : "搭配詞"}</h3>
                {examplesData.collocations.map((collocation: CollocationWithExamples) => {
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

        {!isExamples && synonymsData && synonymsData.synonyms && (
          <div className="space-y-6">
            {synonymsData.synonyms.map((synonym) => (
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
      </div>
    </div>
  );
}

