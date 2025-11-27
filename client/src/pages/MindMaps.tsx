import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Sparkles } from "lucide-react";
import LogoText from "@/components/LogoText";
import TokenDisplay from "@/components/TokenDisplay";
import { format } from "date-fns";
import { apiRequest, fetchJsonWithAuth, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MindMaps() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { isAuthenticated, authReady } = useAuth();
  const { toast } = useToast();
  
  const [editingMindMap, setEditingMindMap] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [deletingMindMap, setDeletingMindMap] = useState<any>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newWord, setNewWord] = useState("");

  // Fetch user's mind maps (only when authenticated)
  // 使用 React Query 的緩存數據來優化載入體驗
  const { data: mindMaps = [], isLoading, error, status } = useQuery({
    queryKey: ["/api/mindmaps"],
    queryFn: async () => {
      console.log("[MindMaps] Fetching mind maps list, isAuthenticated:", isAuthenticated, "authReady:", authReady);
      const data = await fetchJsonWithAuth<any[]>("/api/mindmaps");
      console.log("[MindMaps] Fetch response:", { ok: true });
      console.log("[MindMaps] Mind maps loaded:", data);
      return data;
    },
    enabled: isAuthenticated && authReady,
    retry: false,
    // 使用緩存數據作為初始顯示，避免空白 loading
    placeholderData: (previousData) => previousData,
    // 如果緩存數據存在且未過期，立即顯示緩存數據
    staleTime: 5 * 60 * 1000, // 5 分鐘內視為新鮮數據
  });

  // 調試日誌
  useEffect(() => {
    console.log("[MindMaps] Query state:", {
      isAuthenticated,
      authReady,
      isLoading,
      status,
      error: error?.message,
      mindMapsCount: mindMaps.length,
    });
  }, [isAuthenticated, authReady, isLoading, status, error, mindMaps.length]);

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/mindmaps/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mindmaps"] });
      setEditingMindMap(null);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" ? "Failed to rename mind map" : "重新命名心智圖失敗",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/mindmaps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mindmaps"] });
      setDeletingMindMap(null);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" ? "Failed to delete mind map" : "刪除心智圖失敗",
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setNewWord("");
  };
  
  const confirmCreateNew = () => {
    if (newWord.trim()) {
      setLocation(`/mindmap/new?word=${encodeURIComponent(newWord.trim())}`);
      setIsCreatingNew(false);
    }
  };
  
  const handleRename = (mindMap: any) => {
    setEditingMindMap(mindMap);
    setNewName(mindMap.name || "");
  };
  
  const handleDelete = (mindMap: any) => {
    setDeletingMindMap(mindMap);
  };
  
  const confirmRename = () => {
    if (editingMindMap && newName.trim()) {
      renameMutation.mutate({ id: editingMindMap.id, name: newName.trim() });
    }
  };
  
  const confirmDelete = () => {
    if (deletingMindMap) {
      deleteMutation.mutate(deletingMindMap.id);
    }
  };

return (
  <div className="flex flex-col h-full">
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-top">
      <div className="px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <LogoText className="text-xl sm:text-2xl font-bold text-primary shrink-0" />
          <div className="h-6 w-px bg-border shrink-0" />
          <h2 className="text-xl sm:text-2xl font-semibold whitespace-nowrap truncate">
            {language === "en" ? "Mind Maps" : "心智圖"}
          </h2>
        </div>
        <TokenDisplay variant="header" className="shrink-0" />
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
          <p className="text-destructive text-center px-4">
             {language === "en" 
               ? `Failed to load mind maps: ${(error as Error).message}`
               : `載入心智圖失敗: ${(error as Error).message}`}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/mindmaps"] })}>
            {language === "en" ? "Retry" : "重試"}
          </Button>
        </div>
      ) : mindMaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Button onClick={handleCreateNew} data-testid="button-create-first-mindmap">
            <Plus className="h-4 w-4 mr-2" />
            {language === "en" ? "Create Mind Map" : "建立心智圖"}
          </Button>
        </div>
      ) : (
        <>
          <Button onClick={handleCreateNew} data-testid="button-create-mindmap" className="mb-6">
            <Plus className="h-4 w-4 mr-2" />
            {language === "en" ? "New Mind Map" : "新建心智圖"}
          </Button>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mt-0">
            {mindMaps.map((mindMap: any) => (
            <Card 
              key={mindMap.id} 
              className="hover-elevate active-elevate-2 transition-all relative"
              data-testid={`card-mindmap-${mindMap.id}`}
            >
              <div 
                className="cursor-pointer"
                onClick={() => setLocation(`/mindmap/${mindMap.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base truncate flex-1">{mindMap.name || "Untitled"}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          data-testid={`button-menu-${mindMap.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRename(mindMap); }} data-testid={`button-rename-${mindMap.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {language === "en" ? "Rename" : "重新命名"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDelete(mindMap); }}
                          className="text-destructive"
                          data-testid={`button-delete-${mindMap.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {language === "en" ? "Delete" : "刪除"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="text-xs">
                    {mindMap.nodes?.length || 0} {language === "en" ? "nodes" : "個節點"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    {language === "en" ? "Last updated: " : "最後更新："}
                    {new Date(mindMap.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </div>
            </Card>
          ))}
          </div>
      </>
    )}
    </div>

      {/* Create New Mind Map Dialog */}
      <Dialog open={isCreatingNew} onOpenChange={(open) => !open && setIsCreatingNew(false)}>
        <DialogContent data-testid="dialog-create-mindmap" className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{language === "en" ? "Create Mind Map" : "建立心智圖"}</DialogTitle>
          </DialogHeader>
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmCreateNew()}
            placeholder={language === "en" ? "Enter a word..." : "輸入單字..."}
            autoComplete="off"
            autoFocus
            data-testid="input-create-mindmap"
          />
          <DialogFooter>
            <Button onClick={confirmCreateNew} disabled={!newWord.trim()} data-testid="button-confirm-create" className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              {language === "en" ? "Create" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Dialog */}
      <Dialog open={!!editingMindMap} onOpenChange={(open) => !open && setEditingMindMap(null)}>
        <DialogContent data-testid="dialog-rename-mindmap" className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{language === "en" ? "Rename Mind Map" : "重新命名心智圖"}</DialogTitle>
            <DialogDescription>
              {language === "en" ? "Enter a new name for this mind map" : "輸入心智圖的新名稱"}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmRename()}
            placeholder={language === "en" ? "New name" : "新名稱"}
            data-testid="input-rename-mindmap"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMindMap(null)} data-testid="button-cancel-rename">
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button onClick={confirmRename} disabled={!newName.trim() || renameMutation.isPending} data-testid="button-confirm-rename">
              {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === "en" ? "Rename" : "確定")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMindMap} onOpenChange={(open) => !open && setDeletingMindMap(null)}>
        <AlertDialogContent data-testid="dialog-delete-mindmap" className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "en" ? "Delete Mind Map?" : "刪除心智圖？"}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en" 
                ? `Are you sure you want to delete "${deletingMindMap?.name || 'Untitled'}"? This action cannot be undone.`
                : `確定要刪除「${deletingMindMap?.name || '未命名'}」嗎？此操作無法復原。`}
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
