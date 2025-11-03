import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type MindMapNode, type Flashcard, type WordCategory } from "@shared/schema";
import { Header } from "@/components/Header";
import { CategoryButtons } from "@/components/CategoryButtons";
import { MindMapCanvas } from "@/components/MindMapCanvas";
import { FlashcardView } from "@/components/FlashcardView";
import { SpellingTest } from "@/components/SpellingTest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BookOpen, Keyboard, Play, Loader2, RotateCcw } from "lucide-react";

type ViewMode = "mindmap" | "flashcards" | "spelling";

export default function Home() {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [centerNodeId, setCenterNodeId] = useState<string | undefined>();
  const [initialWord, setInitialWord] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("mindmap");
  const [isGenerating, setIsGenerating] = useState(false);
  const [categoryAngles, setCategoryAngles] = useState<Record<string, number>>({});

  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslation(language);

  // Assign angles to categories (like spokes on a wheel)
  const categories: WordCategory[] = [
    "derivatives",
    "synonyms",
    "antonyms",
    "collocations",
    "idioms",
    "root",
    "prefix",
    "suffix",
    "topic-related",
  ];

  const getCategoryAngle = (category: WordCategory): number => {
    const categoryIndex = categories.indexOf(category);
    return (categoryIndex * 2 * Math.PI) / categories.length;
  };

  // Start with initial word
  const handleStartLearning = () => {
    if (!initialWord.trim()) return;

    // Use fixed coordinates - the canvas will center it
    const newNode: MindMapNode = {
      id: crypto.randomUUID(),
      word: initialWord.trim(),
      x: 0,
      y: 0,
      isCenter: true,
    };

    setNodes([newNode]);
    setCenterNodeId(newNode.id);
    setInitialWord("");
  };

  // Reset map to start fresh
  const handleResetMap = () => {
    setNodes([]);
    setCenterNodeId(undefined);
    setFlashcards([]);
    setViewMode("mindmap");
    toast({
      title: language === "en" ? "Map cleared" : "心智圖已清空",
      description: language === "en" ? "Start fresh with a new word" : "開始輸入新單字",
      duration: 2000,
    });
  };

  // Generate related words for a category
  const generateWordsMutation = useMutation({
    mutationFn: async ({
      word,
      category,
      targetNodeId,
    }: {
      word: string;
      category: WordCategory;
      targetNodeId: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/generate-words",
        { word, category }
      );
      const data = await response.json();
      return data as { words: string[] };
    },
    onSuccess: (data, variables) => {
      if (!data || !data.words || !Array.isArray(data.words)) {
        console.error("Invalid response format:", data);
        setIsGenerating(false);
        toast({
          title: language === "en" ? "Error" : "錯誤",
          description:
            language === "en"
              ? "Invalid response from server"
              : "伺服器回應格式錯誤",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      if (data.words.length === 0) {
        console.warn("No words generated for category:", variables.category);
        setIsGenerating(false);
        toast({
          title: language === "en" ? "No words generated" : "未生成任何單字",
          description:
            language === "en"
              ? `Could not generate ${variables.category} words. Please try another category.`
              : `無法生成${t.categories[variables.category]}單字，請嘗試其他類別。`,
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      setNodes((prevNodes) => {
        const centerNode = prevNodes.find((n) => n.id === variables.targetNodeId);
        if (!centerNode) return prevNodes;

        // Get the angle for this category (spider thread direction)
        const angle = getCategoryAngle(variables.category);
        
        // Base distance from center for first word
        const baseDistance = 250;
        // Fixed gap between node boundaries (edge to edge)
        const boundaryGap = 80;
        
        // Estimate node width based on text length
        // Approximate: 12px per character + 32px padding (px-4 = 16px each side)
        const estimateNodeWidth = (text: string) => {
          const charWidth = 12;
          const padding = 32;
          const minWidth = 100; // min-w-[100px]
          return Math.max(minWidth, text.length * charWidth + padding);
        };

        let currentDistance = baseDistance;
        const newNodes: MindMapNode[] = [];
        
        for (let i = 0; i < data.words.length; i++) {
          const word = data.words[i];
          const nodeWidth = estimateNodeWidth(word);
          
          const node = {
            id: crypto.randomUUID(),
            word,
            x: centerNode.x + currentDistance * Math.cos(angle),
            y: centerNode.y + currentDistance * Math.sin(angle),
            parentId: centerNode.id,
            category: variables.category,
            isCenter: false,
          };
          
          newNodes.push(node);
          
          // Calculate next position: 
          // current center + half of current node width + gap + half of next node width
          if (i < data.words.length - 1) {
            const nextWord = data.words[i + 1];
            const nextNodeWidth = estimateNodeWidth(nextWord);
            currentDistance += nodeWidth / 2 + boundaryGap + nextNodeWidth / 2;
          }
        }

        return [...prevNodes, ...newNodes];
      });
      
      setIsGenerating(false);

      toast({
        title: language === "en" ? "Words generated!" : "單字已生成！",
        description:
          language === "en"
            ? `Added ${data.words.length} ${variables.category} words`
            : `已新增 ${data.words.length} 個${t.categories[variables.category]}`,
        duration: 2000,
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description:
          language === "en"
            ? "Failed to generate words. Please try again."
            : "生成單字失敗，請重試。",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const handleCategorySelect = (category: WordCategory) => {
    const centerNode = nodes.find((n) => n.id === centerNodeId);
    if (!centerNode) return;

    setIsGenerating(true);
    generateWordsMutation.mutate({ 
      word: centerNode.word, 
      category,
      targetNodeId: centerNode.id
    });
  };

  const handleNodeClick = (nodeId: string) => {
    setCenterNodeId(nodeId);
  };

  // Delete a node and reposition remaining nodes in the same category
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prevNodes) => {
      const nodeToDelete = prevNodes.find(n => n.id === nodeId);
      if (!nodeToDelete || nodeToDelete.isCenter) return prevNodes; // Cannot delete center node
      
      // Get all nodes in the same category with the same parent
      const sameCategory = prevNodes.filter(
        n => n.category === nodeToDelete.category && n.parentId === nodeToDelete.parentId
      );
      
      // Remove the node
      const nodesAfterDelete = prevNodes.filter(n => n.id !== nodeId);
      
      // If there are other nodes in the same category, reposition them
      if (sameCategory.length > 1) {
        const centerNode = prevNodes.find(n => n.id === nodeToDelete.parentId);
        if (!centerNode) return nodesAfterDelete;
        
        // Get remaining nodes in this category (sorted by distance)
        const remainingInCategory = sameCategory
          .filter(n => n.id !== nodeId)
          .sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - centerNode.x, 2) + Math.pow(a.y - centerNode.y, 2));
            const distB = Math.sqrt(Math.pow(b.x - centerNode.x, 2) + Math.pow(b.y - centerNode.y, 2));
            return distA - distB;
          });
        
        // Recalculate positions
        if (!nodeToDelete.category) return nodesAfterDelete;
        const angle = getCategoryAngle(nodeToDelete.category);
        const baseDistance = 250;
        const boundaryGap = 80;
        
        const estimateNodeWidth = (text: string) => {
          const charWidth = 12;
          const padding = 32;
          const minWidth = 100;
          return Math.max(minWidth, text.length * charWidth + padding);
        };
        
        let currentDistance = baseDistance;
        
        return nodesAfterDelete.map(node => {
          const indexInCategory = remainingInCategory.findIndex(n => n.id === node.id);
          
          if (indexInCategory >= 0) {
            // Recalculate position for this node
            const nodeWidth = estimateNodeWidth(node.word);
            
            const updatedNode = {
              ...node,
              x: centerNode.x + currentDistance * Math.cos(angle),
              y: centerNode.y + currentDistance * Math.sin(angle),
            };
            
            // Calculate distance for next node
            if (indexInCategory < remainingInCategory.length - 1) {
              const nextNode = remainingInCategory[indexInCategory + 1];
              const nextNodeWidth = estimateNodeWidth(nextNode.word);
              currentDistance += nodeWidth / 2 + boundaryGap + nextNodeWidth / 2;
            }
            
            return updatedNode;
          }
          
          return node;
        });
      }
      
      return nodesAfterDelete;
    });

    toast({
      title: language === "en" ? "Node deleted" : "節點已刪除",
      description: language === "en" ? "Node removed successfully" : "節點已成功移除",
      duration: 2000,
    });
  };

  // Generate flashcards from mind map
  const generateFlashcardsMutation = useMutation({
    mutationFn: async (words: string[]) => {
      const promises = words.map(async (word) => {
        try {
          const response = await apiRequest("POST", "/api/generate-definition", { word });
          return await response.json();
        } catch (error) {
          console.error(`Failed to generate definition for "${word}":`, error);
          return { 
            definition: language === "en" ? "Definition not available" : "定義無法取得", 
            partOfSpeech: language === "en" ? "Unknown" : "未知",
            error: true 
          };
        }
      });
      const results = await Promise.all(promises);
      return results as Array<{ definition: string; partOfSpeech: string; error?: boolean }>;
    },
    onSuccess: (data) => {
      if (!data || !Array.isArray(data)) {
        console.error("Invalid flashcard response:", data);
        toast({
          title: language === "en" ? "Error" : "錯誤",
          description:
            language === "en"
              ? "Invalid response from server"
              : "伺服器回應格式錯誤",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      const failedCount = data.filter(d => d.error).length;

      const cards: Flashcard[] = nodes.map((node, index) => ({
        id: node.id,
        word: node.word,
        definition: data[index]?.definition || (language === "en" ? "Definition not found" : "定義未找到"),
        partOfSpeech: data[index]?.partOfSpeech || (language === "en" ? "Unknown" : "未知"),
        known: false,
      }));

      setFlashcards(cards);
      setViewMode("flashcards");

      if (failedCount > 0) {
        toast({
          title: language === "en" ? "Flashcards created with errors" : "字卡建立完成（部分失敗）",
          description:
            language === "en"
              ? `Created ${cards.length} flashcards, but ${failedCount} definitions failed to load`
              : `已建立 ${cards.length} 張字卡，但 ${failedCount} 個定義載入失敗`,
          variant: "destructive",
          duration: 2000,
        });
      } else {
        toast({
          title: language === "en" ? "Flashcards created!" : "字卡已建立！",
          description:
            language === "en"
              ? `Created ${cards.length} flashcards`
              : `已建立 ${cards.length} 張字卡`,
          duration: 2000,
        });
      }
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description:
          language === "en"
            ? "Failed to create flashcards. Please try again."
            : "建立字卡失敗，請重試。",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const handleCreateFlashcards = () => {
    const words = nodes.map((n) => n.word);
    generateFlashcardsMutation.mutate(words);
  };

  const handleUpdateCard = (cardId: string, known: boolean) => {
    setFlashcards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, known } : card))
    );
  };

  const handleCompleteFlashcards = () => {
    setViewMode("mindmap");
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />

      {viewMode === "mindmap" && (
        <>
          {nodes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-md space-y-6 text-center">
                <div>
                  <h2 className="text-4xl font-bold mb-3">{t.appName}</h2>
                  <p className="text-xl text-muted-foreground">{t.tagline}</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={t.enterWord}
                    value={initialWord}
                    onChange={(e) => setInitialWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleStartLearning();
                    }}
                    data-testid="input-initial-word"
                    className="text-lg"
                  />
                  <Button
                    onClick={handleStartLearning}
                    disabled={!initialWord.trim()}
                    size="lg"
                    data-testid="button-start-learning"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {t.startLearning}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">{t.emptyMap}</p>
              </div>
            </div>
          ) : (
            <>
              <CategoryButtons
                onSelectCategory={handleCategorySelect}
                disabled={!centerNodeId}
                loading={isGenerating}
              />

              <div className="flex-1 relative">
                {isGenerating && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-lg font-medium">{t.generating}</p>
                    </div>
                  </div>
                )}

                <MindMapCanvas
                  nodes={nodes}
                  onNodeClick={handleNodeClick}
                  onNodeDelete={handleDeleteNode}
                  centerNodeId={centerNodeId}
                />
              </div>

              <div className="absolute bottom-6 left-6 z-30 flex gap-3">
                <Button
                  onClick={handleCreateFlashcards}
                  disabled={nodes.length === 0 || generateFlashcardsMutation.isPending}
                  size="lg"
                  data-testid="button-create-flashcards"
                  className="shadow-lg"
                >
                  {generateFlashcardsMutation.isPending ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <BookOpen className="h-5 w-5 mr-2" />
                  )}
                  {t.createFlashcards}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetMap}
                  size="lg"
                  data-testid="button-reset-map"
                  className="shadow-lg"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  {t.newMap}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {viewMode === "flashcards" && (
        <div className="flex-1 flex flex-col">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t.swipeMode}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode("spelling")}
                data-testid="button-switch-spelling"
              >
                <Keyboard className="h-5 w-5 mr-2" />
                {t.spellingMode}
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode("mindmap")}
                data-testid="button-back-to-map"
              >
                {t.backToMap}
              </Button>
            </div>
          </div>
          <FlashcardView
            cards={flashcards}
            onUpdateCard={handleUpdateCard}
            onComplete={handleCompleteFlashcards}
          />
        </div>
      )}

      {viewMode === "spelling" && (
        <div className="flex-1 flex flex-col">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t.spellingMode}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode("flashcards")}
                data-testid="button-switch-swipe"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                {t.swipeMode}
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode("mindmap")}
                data-testid="button-back-to-map-spelling"
              >
                {t.backToMap}
              </Button>
            </div>
          </div>
          <SpellingTest
            cards={flashcards}
            onComplete={() => setViewMode("mindmap")}
          />
        </div>
      )}
    </div>
  );
}
