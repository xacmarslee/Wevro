import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Network, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function MindMaps() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();

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

  const handleCreateNew = () => {
    setLocation("/mindmap/new");
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
              className="hover-elevate active-elevate-2 cursor-pointer transition-all"
              onClick={() => setLocation(`/mindmap/${mindMap.id}`)}
              data-testid={`card-mindmap-${mindMap.id}`}
            >
              <CardHeader>
                <CardTitle className="text-lg truncate">{mindMap.name || "Untitled"}</CardTitle>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
