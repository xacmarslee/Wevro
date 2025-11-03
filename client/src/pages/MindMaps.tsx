import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Plus, Network, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MindMaps() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [editingMindMap, setEditingMindMap] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [deletingMindMap, setDeletingMindMap] = useState<any>(null);

  // Fetch user's mind maps (only when authenticated)
  const { data: mindMaps = [], isLoading } = useQuery({
    queryKey: ["/api/mindmaps"],
    queryFn: async () => {
      const response = await fetch("/api/mindmaps", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load mind maps");
      }
      return await response.json();
    },
    enabled: isAuthenticated,
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/mindmaps/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mindmaps"] });
      setEditingMindMap(null);
      toast({
        title: language === "en" ? "Renamed" : "已重新命名",
        description: language === "en" ? "Mind map renamed successfully" : "心智圖已成功重新命名",
      });
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
      toast({
        title: language === "en" ? "Deleted" : "已刪除",
        description: language === "en" ? "Mind map deleted successfully" : "心智圖已成功刪除",
      });
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
    setLocation("/mindmap/new");
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
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {language === "en" ? "Mind Maps" : "心智圖"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en" 
            ? "View and manage your vocabulary mind maps" 
            : "查看並管理您的詞彙心智圖"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : mindMaps.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              {language === "en" ? "No mind maps yet" : "尚無心智圖"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Create your first mind map to start exploring vocabulary relationships" 
                : "建立第一個心智圖開始探索詞彙關係"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateNew} data-testid="button-create-first-mindmap">
              <Plus className="h-4 w-4 mr-2" />
              {language === "en" ? "Create Mind Map" : "建立心智圖"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg truncate flex-1">{mindMap.name || "Untitled"}</CardTitle>
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
                  <CardDescription>
                    {mindMap.nodes?.length || 0} {language === "en" ? "nodes" : "個節點"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {language === "en" ? "Last updated: " : "最後更新："}
                    {new Date(mindMap.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Rename Dialog */}
      <Dialog open={!!editingMindMap} onOpenChange={(open) => !open && setEditingMindMap(null)}>
        <DialogContent data-testid="dialog-rename-mindmap">
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
            placeholder={language === "en" ? "Mind map name" : "心智圖名稱"}
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
        <AlertDialogContent data-testid="dialog-delete-mindmap">
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
