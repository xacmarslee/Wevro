import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Loader2 } from "lucide-react";

export default function Flashcards() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();

  // Fetch user's flashcard decks (only when authenticated)
  const { data: decks = [], isLoading } = useQuery({
    queryKey: ["/api/flashcard-decks"],
    queryFn: async () => {
      const response = await fetch("/api/flashcard-decks", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load flashcard decks");
      }
      return await response.json();
    },
    enabled: isAuthenticated,
  });

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {language === "en" ? "Flashcard Decks" : "字卡組"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en" 
            ? "Create and practice with flashcard decks" 
            : "建立並練習字卡組"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : decks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {language === "en" ? "No decks yet" : "尚無字卡組"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Create your first flashcard deck to start learning" 
                : "建立第一個字卡組開始學習"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button data-testid="button-create-first-deck">
              <Plus className="h-4 w-4 mr-2" />
              {language === "en" ? "Create Deck" : "建立字卡組"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck: any) => (
            <Card 
              key={deck.id} 
              className="hover-elevate active-elevate-2 cursor-pointer transition-all"
              data-testid={`card-deck-${deck.id}`}
            >
              <CardHeader>
                <CardTitle className="text-lg truncate">{deck.name || "Untitled"}</CardTitle>
                <CardDescription>
                  {deck.cards?.length || 0} {language === "en" ? "cards" : "張卡片"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {language === "en" ? "Last updated: " : "最後更新："}
                  {new Date(deck.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
