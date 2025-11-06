import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FlashcardView } from "@/components/FlashcardView";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FlashcardPractice() {
  const [, params] = useRoute("/flashcards/:id");
  const deckId = params?.id;
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();

  // Fetch flashcard deck
  const { data: deck, isLoading } = useQuery({
    queryKey: ["/api/flashcards", deckId],
    queryFn: async () => {
      const response = await fetch(`/api/flashcards/${deckId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load flashcard deck");
      }
      return await response.json();
    },
    enabled: !!deckId,
  });

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async ({ cardId, known }: { cardId: string; known: boolean }) => {
      return await apiRequest("PATCH", `/api/flashcards/${deckId}/cards/${cardId}`, { known });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards", deckId] });
    },
  });

  const handleUpdateCard = (cardId: string, known: boolean) => {
    updateCardMutation.mutate({ cardId, known });
  };

  const handleComplete = () => {
    setLocation("/flashcards");
  };

  const handleBack = () => {
    setLocation("/flashcards");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deck || !deck.cards || deck.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
        <p className="text-lg text-muted-foreground">
          {language === "en" ? "No cards in this deck" : "此字卡組沒有卡片"}
        </p>
        <Button onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === "en" ? "Back to Flashcards" : "返回字卡"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          data-testid="button-back-header"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-semibold">{deck.name}</h2>
      </div>

      {/* Flashcard View */}
      <FlashcardView
        cards={deck.cards}
        deckId={deckId}
        onUpdateCard={handleUpdateCard}
        onComplete={handleComplete}
      />
    </div>
  );
}
