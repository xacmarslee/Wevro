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

export default function Flashcards() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [deletingDeck, setDeletingDeck] = useState<any>(null);

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

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/flashcards/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
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
  
  const handleRename = (deck: any) => {
    setEditingDeck(deck);
    setNewName(deck.name || "");
  };
  
  const handleDelete = (deck: any) => {
    setDeletingDeck(deck);
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
      )}
      
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
