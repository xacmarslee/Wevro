import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Copy, Check } from "lucide-react";

export default function Query() {
  const [input, setInput] = useState("");
  const [translations, setTranslations] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { language } = useLanguage();
  const { toast } = useToast();

  const queryMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/query", { text });
      return await response.json();
    },
    onSuccess: (data) => {
      setTranslations(data.translations || []);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Query failed" : "查詢失敗",
        description:
          language === "en" ? "Failed to process query" : "處理查詢失敗",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const handleSubmit = () => {
    if (!input.trim()) return;
    queryMutation.mutate(input.trim());
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: language === "en" ? "Copied" : "已複製",
      duration: 2000,
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {language === "en" ? "Query & Translation" : "查詢"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en"
            ? "Look up words or translate sentences between English and Traditional Chinese"
            : "查詢單字或翻譯英文與繁體中文句子"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "Input" : "輸入"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={
              language === "en"
                ? "Enter a word to look up or a sentence to translate..."
                : "輸入要查詢的單字或要翻譯的句子..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleSubmit();
              }
            }}
            className="min-h-[120px] resize-none"
            data-testid="input-query"
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || queryMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-submit-query"
          >
            {queryMutation.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Search className="h-5 w-5 mr-2" />
            )}
            {language === "en" ? "Search" : "查詢"}
          </Button>
        </CardContent>
      </Card>

      {translations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "en" ? "Translations" : "翻譯選項"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {translations.map((translation, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 hover-elevate group"
                  data-testid={`translation-option-${index}`}
                >
                  <div className="flex-1 text-base">{translation}</div>
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
    </div>
  );
}
