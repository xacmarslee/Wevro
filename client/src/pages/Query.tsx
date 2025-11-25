import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, Copy, Check, BookOpen, Languages, ChevronDown, ChevronUp, Sparkles, Mail, Gift, X } from "lucide-react";
import LogoText from "@/components/LogoText";
import TokenDisplay from "@/components/TokenDisplay";
import { trackExampleGeneration, trackSynonymComparison } from "@/lib/analytics";
import { sendEmailVerificationToUser, checkEmailVerified } from "@/lib/firebase";
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

export default function Query() {
  const [mode, setMode] = useState<"examples" | "synonyms">("examples");
  const [examplesInput, setExamplesInput] = useState("");
  const [synonymsInput, setSynonymsInput] = useState("");
  const [examplesResults, setExamplesResults] = useState<ExamplesResponse | null>(null);
  const [synonymsResults, setSynonymsResults] = useState<SynonymComparisonResponse | null>(null);
  const [expandedSenses, setExpandedSenses] = useState<Set<string>>(new Set());
  const [expandedIdioms, setExpandedIdioms] = useState<Set<string>>(new Set());
  const [expandedCollocations, setExpandedCollocations] = useState<Set<string>>(new Set());
  const [examplesNotFound, setExamplesNotFound] = useState(false);
  const [synonymsNotFound, setSynonymsNotFound] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true); // Can be dismissed
  const [sendingVerificationEmail, setSendingVerificationEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { language } = useLanguage();
  const { toast } = useToast();
  const { isAuthenticated, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const examplesNotFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synonymsNotFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch quota to check email verification status
  const { data: quota } = useQuery({
    queryKey: ["/api/quota"],
    queryFn: async () => {
      const response = await fetchWithAuth("/api/quota");
      if (response.status === 401) {
        return null;
      }
      await throwIfResNotOk(response);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds to check verification status
  });

  const parseError = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      const message = error.message;
      
      // 嘗試解析包含狀態碼的錯誤 (例如: "402: {...}" 或 "500: {...}")
      if (/^\d{3}:/.test(message)) {
        const statusCode = message.match(/^(\d{3})/)?.[1];
        const payload = message.split(":").slice(1).join(":").trim();
        
        // 嘗試解析 JSON 負載
        if (payload.startsWith("{") || payload.startsWith("[")) {
          try {
            const parsed = JSON.parse(payload);
            if (parsed?.message) {
              return parsed.message;
            }
            if (parsed?.error && parsed?.message) {
              return `${parsed.error}: ${parsed.message}`;
            }
            if (parsed?.error) {
              return parsed.error;
            }
          } catch {
            // JSON 解析失敗，繼續處理
          }
        }
        
        // 如果有非空負載且不是 JSON，直接使用
        if (payload && !payload.startsWith("{") && !payload.startsWith("[")) {
          return payload;
        }
        
        // 根據狀態碼提供預設訊息
        if (statusCode === "401") {
          return language === "en" 
            ? "Authentication failed. Please log in again." 
            : "認證失敗，請重新登入";
        }
        if (statusCode === "403") {
          return language === "en"
            ? "Access denied"
            : "存取被拒絕";
        }
        if (statusCode === "402") {
          return language === "en"
            ? "Insufficient tokens"
            : "點數不足";
        }
        if (statusCode === "500") {
          return language === "en"
            ? "Server error. Please try again later."
            : "伺服器錯誤，請稍後再試";
        }
        if (statusCode === "503") {
          return language === "en"
            ? "Service unavailable. Please try again later."
            : "服務暫時無法使用，請稍後再試";
        }
      }
      
      // 檢查是否是網路錯誤
      if (message.includes("Failed to fetch") || 
          message.includes("NetworkError") || 
          message.includes("Network error") ||
          message.includes("fetch") ||
          message.includes("Cannot connect")) {
        return language === "en"
          ? "Network error. Please check your connection and API configuration."
          : "網路錯誤，請檢查您的網路連線和 API 設定";
      }
      
      // 如果有具體的錯誤訊息，使用它
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

  // Auto-check verification status and claim reward when quota is loaded
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser || !quota) return;

    const checkVerificationAndClaimReward = async () => {
      try {
        // Reload Firebase user to get latest emailVerified status
        const isVerified = await checkEmailVerified(firebaseUser);
        
        // Only check if email is verified but reward not claimed yet
        if (isVerified && !quota.rewardClaimed) {
          // Call API to claim reward
          const response = await fetchWithAuth("/api/auth/check-verification-reward", {
            method: "POST",
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.rewardClaimed) {
              // Invalidate quota to refresh token balance
              queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
              
              toast({
                title: language === "en" ? "🎉 Verification Reward!" : "🎉 驗證獎勵！",
                description: language === "en"
                  ? "You've received 20 tokens for verifying your email!"
                  : "您已獲得 20 點驗證獎勵！",
                duration: 5000,
              });
              
              // Hide banner after claiming reward
              setShowVerificationBanner(false);
            }
          }
        }
      } catch (error) {
        console.error("Error checking verification reward:", error);
        // Silently fail - don't show error to user
      }
    };

    checkVerificationAndClaimReward();
  }, [isAuthenticated, firebaseUser, quota, queryClient, toast, language]);

  // Handle sending verification email
  const handleSendVerificationEmail = async () => {
    if (!firebaseUser || sendingVerificationEmail) return;
    
    try {
      setSendingVerificationEmail(true);
      await sendEmailVerificationToUser(firebaseUser);
      
      toast({
        title: language === "en" ? "Email sent!" : "郵件已發送！",
        description: language === "en"
          ? "Please check your inbox (including spam folder)."
          : "請檢查您的信箱（包含垃圾郵件夾）。",
        duration: 5000,
      });
      
      // Start cooldown countdown (60 seconds)
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: error.message || (language === "en" ? "Failed to send email" : "發送郵件失敗"),
        variant: "destructive",
      });
    } finally {
      setSendingVerificationEmail(false);
    }
  };

  // Show banner if email not verified and not dismissed
  const shouldShowBanner = 
    isAuthenticated && 
    quota && 
    !quota.isEmailVerified && 
    showVerificationBanner;

  // Examples generation mutation
  const examplesMutation = useMutation({
    mutationFn: async ({ query, counts }: { query: string; counts?: { sense: number; phrase: number } }) => {
      // Check cache first
      const cacheKey = `${query}|${counts?.sense || 2}|${counts?.phrase || 1}`;
      if (examplesCache[cacheKey]) {
        return examplesCache[cacheKey];
      }

      const response = await apiRequest("POST", "/api/examples/generate", {
        query,
        counts,
      });
      const data = (await response.json()) as ExamplesResponse;
      
      // Save to cache
      const { tokenInfo: _examplesTokenInfo, ...cacheableExamples } = data;
      examplesCache[cacheKey] = cacheableExamples;
      
      return data;
    },
    onSuccess: (data: ExamplesResponse, variables: { query: string; counts?: { sense: number; phrase: number } }) => {
      const hasContent =
        (data.senses?.length ?? 0) > 0 ||
        (data.idioms?.some((i) => i.examples.length > 0) ?? false) ||
        (data.collocations?.some((c) => c.examples.length > 0) ?? false);

      if (!hasContent) {
        setExamplesResults(null);
        showTransientMessage(setExamplesNotFound, examplesNotFoundTimerRef);
        return;
      }

      setExamplesResults(data);
      setExamplesNotFound(false);
      // Reset expansion states
      setExpandedSenses(new Set());
      setExpandedIdioms(new Set());
      setExpandedCollocations(new Set());
      if (data?.tokenInfo) {
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
      }

      // Track Analytics event
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
        title: language === "en" ? "Generation failed" : "生成失敗",
        description: parseError(
          error,
          language === "en"
            ? "Failed to generate example sentences. Please check your connection and try again."
            : "無法生成例句，請檢查網路連線後重試",
        ),
        variant: "destructive",
      });
    },
  });

  // Synonyms generation mutation
  const synonymsMutation = useMutation({
    mutationFn: async (query: string) => {
      // Check cache first
      if (synonymsCache[query]) {
        return synonymsCache[query];
      }

      const response = await apiRequest("POST", "/api/synonyms/generate", { query });
      const data = (await response.json()) as SynonymComparisonResponse;
      
      // Save to cache
      const { tokenInfo: _synonymTokenInfo, ...cacheableSynonyms } = data;
      synonymsCache[query] = cacheableSynonyms;
      
      return data;
    },
    onSuccess: (data: SynonymComparisonResponse, query: string) => {
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

      // Track Analytics event
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
        title: language === "en" ? "Generation failed" : "生成失敗",
        description: parseError(
          error,
          language === "en"
            ? "Failed to generate synonyms. Please check your connection and try again."
            : "無法生成同義字，請檢查網路連線後重試",
        ),
        variant: "destructive",
      });
    },
  });

  const loadingHint =
    language === "en" ? "This may take a few seconds." : "這可能會需要幾秒鐘時間。";
  const generatingExamplesLabel =
    language === "en" ? "Generating example sentences..." : "例句生成中...";
  const generatingSynonymsLabel =
    language === "en" ? "Generating synonym comparison..." : "同義字比較生成中...";

  const handleExamplesSearch = (query: string, counts?: { sense: number; phrase: number }) => {
    if (!query.trim()) return;
    setExamplesInput(query);
    setExamplesNotFound(false);
    // Default: 3 examples per sense, 2 examples per idiom/collocation
    const defaultCounts = counts || { sense: 3, phrase: 2 };
    examplesMutation.mutate({ query: query.trim(), counts: defaultCounts });
  };

  const handleSynonymsSearch = (query: string) => {
    if (!query.trim()) return;
    setSynonymsInput(query);
    setSynonymsNotFound(false);
    synonymsMutation.mutate(query.trim());
  };

  // Toggle expansion for senses, idioms, and collocations
  const toggleSenseExpansion = (senseId: string) => {
    const newExpanded = new Set(expandedSenses);
    if (newExpanded.has(senseId)) {
      newExpanded.delete(senseId);
    } else {
      newExpanded.add(senseId);
      // If not expanded yet, fetch more examples (6 instead of 3)
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
      // Fetch more examples if needed
      if (examplesResults) {
        const idiom = examplesResults.idioms.find(i => i.phrase === phrase);
        if (idiom && idiom.examples.length < 4) {
          handleExamplesSearch(examplesResults.query, { sense: 3, phrase: 4 });
        }
      }
    }
    setExpandedIdioms(newExpanded);
  };

  const toggleCollocationExpansion = (phrase: string) => {
    const newExpanded = new Set(expandedCollocations);
    if (newExpanded.has(phrase)) {
      newExpanded.delete(phrase);
    } else {
      newExpanded.add(phrase);
      // Fetch more examples if needed
      if (examplesResults) {
        const collocation = examplesResults.collocations.find(c => c.phrase === phrase);
        if (collocation && collocation.examples.length < 4) {
          handleExamplesSearch(examplesResults.query, { sense: 3, phrase: 4 });
        }
      }
    }
    setExpandedCollocations(newExpanded);
  };

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
      {/* Email Verification Banner */}
      {shouldShowBanner && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-base">
                    {language === "en"
                      ? "🎁 Verify your email to unlock subscription features and get 20 bonus tokens!"
                      : "🎁 驗證 Email 即可解鎖訂閱功能，並額外獲得 20 Token！"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "en"
                      ? "Complete email verification to claim your reward and access premium features."
                      : "完成 Email 驗證即可領取獎勵並使用進階功能。"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleSendVerificationEmail}
                    disabled={sendingVerificationEmail || resendCooldown > 0}
                    size="sm"
                    className="shrink-0"
                  >
                    {sendingVerificationEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === "en" ? "Sending..." : "發送中..."}
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        {language === "en" ? `Resend (${resendCooldown}s)` : `重新發送 (${resendCooldown}秒)`}
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        {language === "en" ? "Send Verification Email" : "發送驗證信"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVerificationBanner(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              disabled={!examplesInput.trim() || examplesMutation.isPending}
              className="w-full"
              data-testid="button-search-examples"
            >
              {examplesMutation.isPending ? (
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
          {examplesMutation.isPending && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-primary">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm font-medium">{generatingExamplesLabel}</p>
              <p className="text-xs text-muted-foreground">{loadingHint}</p>
            </div>
          )}

          {/* Examples Results */}
          {examplesResults && !examplesMutation.isPending && (
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
              disabled={!synonymsInput.trim() || synonymsMutation.isPending}
              className="w-full"
              data-testid="button-search-synonyms"
            >
              {synonymsMutation.isPending ? (
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
          {synonymsMutation.isPending && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-primary">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm font-medium">{generatingSynonymsLabel}</p>
              <p className="text-xs text-muted-foreground">{loadingHint}</p>
            </div>
          )}

          {/* Synonyms Results */}
          {synonymsResults && !synonymsMutation.isPending && synonymsResults.synonyms && synonymsResults.synonyms.length > 0 && (
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
