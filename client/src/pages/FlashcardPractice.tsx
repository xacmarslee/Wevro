import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PracticeModeSwitch } from "@/components/PracticeModeSwitch";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient, fetchJsonWithAuth } from "@/lib/queryClient";
import type { FlashcardDeck } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function FlashcardPractice() {
  const [, params] = useRoute("/flashcards/:id");
  const deckId = params?.id;
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();

  // Fetch flashcard deck
  const deckQueryKey = ["/api/flashcards", deckId] as const;

  const { data: deck, isLoading } = useQuery<FlashcardDeck | undefined>({
    queryKey: deckQueryKey,
    queryFn: async (): Promise<FlashcardDeck | undefined> => {
      if (!deckId) {
        return undefined;
      }

      console.log("[FlashcardPractice] Loading deck:", deckId);
      
      const data = await fetchJsonWithAuth<FlashcardDeck>(`/api/flashcards/${deckId}`);
      console.log("[FlashcardPractice] Deck loaded:", data);
      return data;
    },
    enabled: !!deckId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async ({ cardId, known }: { cardId: string; known: boolean }) => {
      return await apiRequest("PATCH", `/api/flashcards/${deckId}/cards/${cardId}`, { known });
    },
    onMutate: async ({ cardId, known }) => {
      if (!deckId) {
        return;
      }

      await queryClient.cancelQueries({ queryKey: deckQueryKey });

      const previousDeck = queryClient.getQueryData<FlashcardDeck>(deckQueryKey);

      if (previousDeck) {
        const optimisticDeck: FlashcardDeck = {
          ...previousDeck,
          cards: previousDeck.cards.map((card) =>
            card.id === cardId ? { ...card, known } : card
          ),
        };

        queryClient.setQueryData(deckQueryKey, optimisticDeck);
      }

      return { previousDeck };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeck && deckId) {
        queryClient.setQueryData(deckQueryKey, context.previousDeck);
      }
    },
    onSettled: () => {
      if (deckId) {
        queryClient.invalidateQueries({
          queryKey: deckQueryKey,
          exact: true,
          refetchType: "inactive",
        });
      }
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

  if (!deck) {
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

  const deckCards = deck.cards ?? [];

  if (deckCards.length === 0) {
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
      <div className="border-b px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center gap-4">
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
      <PracticeModeSwitch
        cards={deckCards}
        deckId={deckId}
        onUpdateCard={handleUpdateCard}
        onComplete={handleComplete}
      />
    </div>
  );
}
