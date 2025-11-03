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
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const { toast } = useToast();

  const queryMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/query", { text });
      return await response.json();
    },
    onSuccess: (data) => {
      setResult(data.result);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Query failed" : "查詢失敗",
        description: language === "en" ? "Failed to process query" : "處理查詢失敗",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const handleSubmit = () => {
    if (!input.trim()) return;
    queryMutation.mutate(input.trim());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast({
      title: language === "en" ? "Copied" : "已複製",
      duration: 2000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {language === "en" ? "Query & Translation" : "查詢與翻譯"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en" 
            ? "Look up words or translate sentences between English and Traditional Chinese" 
            : "查詢單字或翻譯英文與繁體中文句子"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === "en" ? "Input" : "輸入"}
          </CardTitle>
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

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {language === "en" ? "Result" : "結果"}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                data-testid="button-copy-result"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {language === "en" ? "Copy" : "複製"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {result}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
