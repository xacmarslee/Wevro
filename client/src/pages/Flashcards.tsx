import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Sparkles, Edit, X } from "lucide-react";
import LogoText from "@/components/LogoText";
import TokenDisplay from "@/components/TokenDisplay";
import { apiRequest, fetchJsonWithAuth, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trackFlashcardDeckCreated } from "@/lib/analytics";
import type { FlashcardDeck } from "@shared/schema";

export default function Flashcards() {
  const { language } = useLanguage();
  const { isAuthenticated, authReady } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [deletingDeck, setDeletingDeck] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCards, setEditingCards] = useState<FlashcardDeck | null>(null);
  const [deckName, setDeckName] = useState("");
  const [editedDeckName, setEditedDeckName] = useState("");
  const [wordsList, setWordsList] = useState("");
  const [editedCards, setEditedCards] = useState<any[]>([]);
  const [newCard, setNewCard] = useState({ word: "", definition: "" });
  const [deletingCard, setDeletingCard] = useState<{ deckId: string; cardId: string; word: string } | null>(null);
  const parseTokenError = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.startsWith("402")) {
      const payload = error.message.split(":").slice(1).join(":").trim();
      try {
        const parsed = JSON.parse(payload);
        return parsed?.message ?? fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  // Fetch user's flashcard decks (only when authenticated)
  const { data: decks = [], isLoading, error, status } = useQuery({
    queryKey: ["/api/flashcards"],
    queryFn: async () => {
      console.log("[Flashcards] Fetching decks list, isAuthenticated:", isAuthenticated, "authReady:", authReady);
      const data = await fetchJsonWithAuth<FlashcardDeck[]>("/api/flashcards");
      console.log("[Flashcards] Decks loaded:", data);
      return data;
    },
    enabled: isAuthenticated && authReady,
    retry: false,
  });

  // 調試日誌
  useEffect(() => {
    console.log("[Flashcards] Query state:", {
      isAuthenticated,
      authReady,
      isLoading,
      status,
      error: error?.message,
      decksCount: decks.length,
    });
  }, [isAuthenticated, authReady, isLoading, status, error, decks.length]);

  const { data: isMindMapGenerating = false } = useQuery({
    queryKey: ["/api/flashcards", "creating"],
    queryFn: async () =>
      queryClient.getQueryData<boolean>(["/api/flashcards", "creating"]) ?? false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });


  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/flashcards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      setDeletingDeck(null);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" ? "Failed to delete deck" : "刪除字卡組失敗",
        variant: "destructive",
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async ({ name, words }: { name: string; words: string[] }) => {
      console.log("[Flashcards] Creating deck:", { name, words });
      const response = await apiRequest("POST", "/api/flashcards/batch-create", { name, words });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create deck" }));
        throw new Error(errorData.message || "Failed to create deck");
      }
      
      const data = (await response.json()) as FlashcardDeck;
      console.log("[Flashcards] Deck created successfully:", data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log("[Flashcards] onSuccess triggered, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      if (data?.tokenInfo) {
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
      }
      setIsCreating(false);
      setDeckName("");
      setWordsList("");
      toast({
        title: language === "en" ? "Success" : "成功",
        description: language === "en" ? "Deck created successfully" : "字卡組建立成功",
      });

      // Track Analytics event
      trackFlashcardDeckCreated(
        variables.name,
        data.cards?.length || 0,
        data.tokenInfo?.tokensCharged || 0
      );
    },
    onError: (error: Error) => {
      console.error("[Flashcards] Create failed:", error);
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description:
          parseTokenError(
            error,
            error.message || (language === "en" ? "Failed to create deck" : "建立字卡組失敗"),
          ),
        variant: "destructive",
        duration: 5000,
      });
    },
  });
  
  const handleEditCards = (deck: FlashcardDeck) => {
    setEditingCards(deck);
    setEditedDeckName(deck.name);
    setEditedCards(deck.cards.map((c: any) => ({ ...c })));
    setNewCard({ word: "", definition: "" });
  };
  
  const handleDelete = (deck: any) => {
    setDeletingDeck(deck);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setDeckName("");
    setWordsList("");
  };
  
  const confirmCreate = () => {
    if (deckName.trim() && wordsList.trim()) {
      const words = wordsList
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      
      if (words.length === 0) {
        return;
      }
      
      if (words.length > 10) {
        toast({
          title: language === "en" ? "Too many words" : "單字過多",
          description: language === "en" 
            ? "Maximum 10 words per batch. Please remove some words."
            : "每次最多 10 個單字，請減少單字數量。",
          variant: "destructive",
        });
        return;
      }
      
      createMutation.mutate({ name: deckName.trim(), words });
    }
  };
  
  const confirmDelete = () => {
    if (deletingDeck) {
      deleteMutation.mutate(deletingDeck.id);
    }
  };

return (
  <div className="relative flex flex-col h-full">
    {isMindMapGenerating && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">
            {language === "en" ? "Generating flashcards..." : "字卡生成中..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === "en" ? "This may take a few seconds." : "這可能會需要幾秒鐘時間。"}
          </p>
        </div>
      </div>
    )}

    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LogoText className="text-2xl font-bold text-primary" />
          <div className="h-6 w-px bg-border" />
          <h2 className="text-2xl font-semibold">
            {language === "en" ? "Flashcards" : "字卡"}
          </h2>
        </div>
        <TokenDisplay variant="header" />
      </div>
    </div>

    <div className="flex-1 px-6 pb-24 pt-6">
      {!isAuthenticated || !authReady ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-destructive">{language === "en" ? "Failed to load flashcard decks" : "載入字卡組失敗"}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] })}>
            {language === "en" ? "Retry" : "重試"}
          </Button>
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Button onClick={handleCreateNew} data-testid="button-create-first-deck">
            <Plus className="h-4 w-4 mr-2" />
            {language === "en" ? "Create Deck" : "建立字卡組"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateNew} data-testid="button-create-deck">
              <Plus className="h-4 w-4 mr-2" />
              {language === "en" ? "New deck" : "建立字卡組"}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {decks.map((deck: any) => (
              <Card 
                key={deck.id} 
                className="hover-elevate active-elevate-2 transition-all relative"
                data-testid={`card-deck-${deck.id}`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => setLocation(`/flashcards/${deck.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base truncate flex-1">{deck.name || "Untitled"}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            data-testid={`button-menu-${deck.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCards(deck); }} data-testid={`button-edit-cards-${deck.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            {language === "en" ? "Edit Deck" : "編輯字卡組"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDelete(deck); }}
                            className="text-destructive"
                            data-testid={`button-delete-${deck.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {language === "en" ? "Delete" : "刪除"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="text-xs">
                      {deck.cards?.length || 0} {language === "en" ? "cards" : "張卡片"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {language === "en" ? "Last updated: " : "最後更新："}
                      {new Date(deck.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Create Dialog */}
    <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
        <DialogContent data-testid="dialog-create-deck" className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{language === "en" ? "Create Flashcard Deck" : "建立字卡組"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">{language === "en" ? "Deck Name" : "字卡組名稱"}</Label>
              <Input
                id="deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder={language === "en" ? "Deck name" : "字卡組名稱"}
                autoComplete="off"
                data-testid="input-deck-name"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="words-list">
                  {language === "en" ? "Words (one per line)" : "單字列表（每行一個）"}
                </Label>
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const count = wordsList.split('\n').filter(w => w.trim()).length;
                    const isOverLimit = count > 10;
                    return (
                      <span className={isOverLimit ? "text-destructive font-semibold" : ""}>
                        {count}/10
                      </span>
                    );
                  })()}
                </div>
              </div>
              <Textarea
                id="words-list"
                value={wordsList}
                onChange={(e) => setWordsList(e.target.value)}
                placeholder={language === "en" ? "happy\nsad\nexcited" : "happy\nsad\nexcited"}
                className="min-h-[200px] font-mono"
                autoComplete="off"
                data-testid="input-words-list"
                rows={10}
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>
                  {language === "en" 
                    ? "10 words will cost 1 token" 
                    : "10 個單字消耗 1 點"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={confirmCreate} 
              disabled={!deckName.trim() || !wordsList.trim() || createMutation.isPending} 
              data-testid="button-confirm-create"
              className="w-full"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === "en" ? "Creating..." : "建立中..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === "en" ? "Create Deck" : "建立字卡組"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Cards Dialog */}
      <Dialog open={!!editingCards} onOpenChange={(open) => !open && setEditingCards(null)}>
        <DialogContent data-testid="dialog-edit-cards" className="max-w-sm rounded-2xl p-0 gap-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>{language === "en" ? "Edit Deck" : "編輯字卡組"}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Deck Name */}
            <div className="space-y-2">
              <Label>{language === "en" ? "Deck Name" : "字卡組名稱"}</Label>
              <Input
                value={editedDeckName}
                onChange={(e) => setEditedDeckName(e.target.value)}
                placeholder={language === "en" ? "Deck name" : "字卡組名稱"}
                autoComplete="off"
              />
            </div>
            {/* Existing Cards */}
            <div className="space-y-3">
              {editedCards.map((card, index) => (
                <div key={card.id} className="p-4 border rounded-lg space-y-3">
                  {/* Header: Number and Delete Button */}
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-muted-foreground font-semibold">
                      {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (editingCards) {
                          setDeletingCard({
                            deckId: editingCards.id,
                            cardId: card.id,
                            word: card.word,
                          });
                        }
                      }}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Word Input */}
                  <Input
                    value={card.word}
                    onChange={(e) => {
                      const newCards = [...editedCards];
                      newCards[index].word = e.target.value;
                      setEditedCards(newCards);
                    }}
                    placeholder={language === "en" ? "Word" : "單字"}
                    className="font-mono"
                    autoComplete="off"
                  />
                  {/* Definition Textarea */}
                  <Textarea
                    value={card.definition}
                    onChange={(e) => {
                      const newCards = [...editedCards];
                      newCards[index].definition = e.target.value;
                      setEditedCards(newCards);
                    }}
                    placeholder={language === "en" ? "Definition" : "定義"}
                    className="min-h-[80px] resize-none font-mono"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            {/* Add New Card Form */}
            <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
              <p className="text-sm font-medium">{language === "en" ? "Add New Card" : "新增字卡"}</p>
              <Input
                value={newCard.word}
                onChange={(e) => setNewCard({ ...newCard, word: e.target.value })}
                placeholder={language === "en" ? "Word" : "單字"}
                className="font-mono"
                autoComplete="off"
              />
              <Textarea
                value={newCard.definition}
                onChange={(e) => setNewCard({ ...newCard, definition: e.target.value })}
                placeholder={language === "en" ? "Definition" : "定義"}
                className="min-h-[80px] resize-none font-mono"
                autoComplete="off"
              />
              <Button
                onClick={() => {
                  if (newCard.word.trim() && newCard.definition.trim()) {
                    setEditedCards([...editedCards, { 
                      ...newCard, 
                      id: `temp-${Date.now()}`, 
                      known: false,
                      partOfSpeech: "n." // Default, will be parsed from definition
                    }]);
                    setNewCard({ word: "", definition: "" });
                  }
                }}
                disabled={!newCard.word.trim() || !newCard.definition.trim()}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === "en" ? "Add Card" : "新增字卡"}
              </Button>
            </div>
          </div>

          <div className="px-6 pb-6">
            <DialogFooter className="justify-end">
              <Button
              onClick={async () => {
                if (!editingCards) return;
                
                // Save changes via API
                try {
                  // Update deck name if changed
                  if (editedDeckName !== editingCards.name) {
                    await apiRequest("PATCH", `/api/flashcards/${editingCards.id}`, {
                      name: editedDeckName,
                    });
                  }
                  
                  // Update existing cards
                  for (const card of editedCards) {
                    if (!card.id.startsWith('temp-')) {
                      await apiRequest("PATCH", `/api/flashcards/${editingCards.id}/cards/${card.id}`, {
                        word: card.word,
                        definition: card.definition,
                        partOfSpeech: card.partOfSpeech || "n.", // Keep existing or default
                      });
                    } else {
                      // New card - extract first pos from definition
                      const firstPos = card.definition.match(/^(n\.|v\.|adj\.|adv\.|prep\.|pron\.|aux\.|phr\.)/)?.[0] || "n.";
                      await apiRequest("POST", `/api/flashcards/${editingCards.id}/cards`, {
                        word: card.word,
                        definition: card.definition,
                        partOfSpeech: firstPos,
                      });
                    }
                  }
                  
                  // Delete removed cards
                  const removedCards = editingCards.cards.filter(
                    (originalCard: any) => !editedCards.some(ec => ec.id === originalCard.id)
                  );
                  for (const card of removedCards) {
                    await apiRequest("DELETE", `/api/flashcards/${editingCards.id}/cards/${card.id}`);
                  }
                  
                  queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
                  setEditingCards(null);
                } catch (error) {
                  toast({
                    title: language === "en" ? "Error" : "錯誤",
                    description: language === "en" ? "Failed to update flashcards" : "更新字卡失敗",
                    variant: "destructive",
                  });
                }
              }}
            >
              {language === "en" ? "Save Changes" : "儲存變更"}
            </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDeck} onOpenChange={(open) => !open && setDeletingDeck(null)}>
        <AlertDialogContent data-testid="dialog-delete-deck" className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "en" ? "Delete Deck?" : "刪除字卡組？"}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en" 
                ? `Are you sure you want to delete "${deletingDeck?.name || 'Untitled'}"? This action cannot be undone.`
                : `確定要刪除「${deletingDeck?.name || '未命名'}」嗎？此操作無法復原。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{language === "en" ? "Cancel" : "取消"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === "en" ? "Delete" : "刪除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Card Confirmation Dialog */}
      <AlertDialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent data-testid="dialog-delete-card" className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "en" ? "Delete Card?" : "刪除字卡？"}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en" 
                ? `Are you sure you want to delete "${deletingCard?.word || 'this card'}"?`
                : `確定要刪除「${deletingCard?.word || '此字卡'}」嗎？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-card">
              {language === "en" ? "Cancel" : "取消"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingCard) {
                  setEditedCards(editedCards.filter(c => c.id !== deletingCard.cardId));
                  setDeletingCard(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-card"
            >
              {language === "en" ? "Delete" : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
