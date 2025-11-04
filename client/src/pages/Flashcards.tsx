import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
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
import { Plus, BookOpen, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Flashcards() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [deletingDeck, setDeletingDeck] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [wordsList, setWordsList] = useState("");

  // Fetch user's flashcard decks (only when authenticated)
  const { data: decks = [], isLoading } = useQuery({
    queryKey: ["/api/flashcards"],
    queryFn: async () => {
      const response = await fetch("/api/flashcards", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load flashcard decks");
      }
      return await response.json();
    },
    enabled: isAuthenticated,
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/flashcards/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      setEditingDeck(null);
      toast({
        title: language === "en" ? "Renamed" : "已重新命名",
        description: language === "en" ? "Deck renamed successfully" : "字卡組已成功重新命名",
      });
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" ? "Failed to rename deck" : "重新命名字卡組失敗",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/flashcards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      setDeletingDeck(null);
      toast({
        title: language === "en" ? "Deleted" : "已刪除",
        description: language === "en" ? "Deck deleted successfully" : "字卡組已成功刪除",
      });
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
      const response = await apiRequest("POST", "/api/flashcards/batch-create", { name, words });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create deck" }));
        throw new Error(errorData.message || "Failed to create deck");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      setIsCreating(false);
      setDeckName("");
      setWordsList("");
      toast({
        title: language === "en" ? "Created" : "已建立",
        description: language === "en" ? "Deck created successfully with AI-generated definitions" : "字卡組已成功建立並生成AI翻譯",
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: error.message || (language === "en" ? "Failed to create deck" : "建立字卡組失敗"),
        variant: "destructive",
        duration: 5000,
      });
    },
  });
  
  const handleRename = (deck: any) => {
    setEditingDeck(deck);
    setNewName(deck.name || "");
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
      
      if (words.length > 0) {
        createMutation.mutate({ name: deckName.trim(), words });
      }
    }
  };
  
  const confirmRename = () => {
    if (editingDeck && newName.trim()) {
      renameMutation.mutate({ id: editingDeck.id, name: newName.trim() });
    }
  };
  
  const confirmDelete = () => {
    if (deletingDeck) {
      deleteMutation.mutate(deletingDeck.id);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">Wevro</h1>
        <div className="h-6 w-px bg-border" />
        <h2 className="text-2xl font-semibold">
          {language === "en" ? "Flashcards" : "字卡"}
        </h2>
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
            <Button onClick={handleCreateNew} data-testid="button-create-first-deck">
              <Plus className="h-4 w-4 mr-2" />
              {language === "en" ? "Create Deck" : "建立字卡組"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Button onClick={handleCreateNew} data-testid="button-create-deck">
            <Plus className="h-4 w-4 mr-2" />
            {language === "en" ? "Create Deck" : "建立字卡組"}
          </Button>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck: any) => (
            <Card 
              key={deck.id} 
              className="hover-elevate active-elevate-2 transition-all relative"
              data-testid={`card-deck-${deck.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg truncate flex-1">{deck.name || "Untitled"}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
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
                      <DropdownMenuItem onClick={() => handleRename(deck)} data-testid={`button-rename-${deck.id}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {language === "en" ? "Rename" : "重新命名"}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(deck)}
                        className="text-destructive"
                        data-testid={`button-delete-${deck.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {language === "en" ? "Delete" : "刪除"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
        <DialogContent data-testid="dialog-create-deck" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "en" ? "Create Flashcard Deck" : "建立字卡組"}</DialogTitle>
            <DialogDescription>
              {language === "en" 
                ? "Enter a deck name and words (one per line). AI will generate Traditional Chinese definitions."
                : "輸入字卡組名稱和單字（每行一個），AI 將生成繁體中文翻譯。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">{language === "en" ? "Deck Name" : "字卡組名稱"}</Label>
              <Input
                id="deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder={language === "en" ? "e.g., Academic Vocabulary" : "例如：學術詞彙"}
                data-testid="input-deck-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="words-list">
                {language === "en" ? "Words (one per line)" : "單字列表（每行一個）"}
              </Label>
              <Textarea
                id="words-list"
                value={wordsList}
                onChange={(e) => setWordsList(e.target.value)}
                placeholder={language === "en" 
                  ? "happy\nsad\nexcited\ncalm\nanxious"
                  : "happy\nsad\nexcited\ncalm\nanxious"}
                className="min-h-[200px] font-mono"
                data-testid="input-words-list"
              />
              <p className="text-xs text-muted-foreground">
                {language === "en" 
                  ? "AI will generate concise Traditional Chinese definitions (max 20 characters) for each word."
                  : "AI 將為每個單字生成簡潔的繁體中文翻譯（最多20字）。"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel-create">
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button 
              onClick={confirmCreate} 
              disabled={!deckName.trim() || !wordsList.trim() || createMutation.isPending} 
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === "en" ? "Creating..." : "建立中..."}
                </>
              ) : (
                language === "en" ? "Create Deck" : "建立字卡組"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Dialog */}
      <Dialog open={!!editingDeck} onOpenChange={(open) => !open && setEditingDeck(null)}>
        <DialogContent data-testid="dialog-rename-deck">
          <DialogHeader>
            <DialogTitle>{language === "en" ? "Rename Deck" : "重新命名字卡組"}</DialogTitle>
            <DialogDescription>
              {language === "en" ? "Enter a new name for this deck" : "輸入字卡組的新名稱"}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmRename()}
            placeholder={language === "en" ? "Deck name" : "字卡組名稱"}
            data-testid="input-rename-deck"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDeck(null)} data-testid="button-cancel-rename">
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button onClick={confirmRename} disabled={!newName.trim() || renameMutation.isPending} data-testid="button-confirm-rename">
              {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === "en" ? "Rename" : "確定")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDeck} onOpenChange={(open) => !open && setDeletingDeck(null)}>
        <AlertDialogContent data-testid="dialog-delete-deck">
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
    </div>
  );
}
