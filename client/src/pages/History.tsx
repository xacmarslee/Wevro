import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, ChevronRight, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LogoText from "@/components/LogoText";

interface HistoryItem {
  id: string;
  word: string;
  queryType: "examples" | "synonyms";
  createdAt: string;
}

export default function HistoryPage() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: history, isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/history"],
    queryFn: async () => {
      const response = await fetchWithAuth("/api/history");
      await throwIfResNotOk(response);
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/api/history/${id}`, {
        method: "DELETE",
      });
      await throwIfResNotOk(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="h-full overflow-y-auto bg-background relative">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 safe-area-top">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/query")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === "en" ? "History" : "查詢紀錄"}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pb-32" style={{ paddingTop: '20px' }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>{language === "en" ? "Loading..." : "載入中..."}</p>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
            <Clock className="h-12 w-12 opacity-20" />
            <p>{language === "en" ? "No history yet" : "暫無查詢紀錄"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden transition-all hover:bg-accent/5 active:bg-accent/10"
              >
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div 
                      className="flex-1 p-4 cursor-pointer"
                      onClick={() => setLocation(`/history/${item.id}`)}
                    >
                      <div className="flex items-baseline justify-between mb-1">
                        <h3 className="font-semibold text-lg">{item.word}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {item.queryType === "examples" 
                          ? (language === "en" ? "Examples" : "例句") 
                          : (language === "en" ? "Synonyms" : "同義字")}
                      </p>
                    </div>

                    <div className="pr-2 flex items-center gap-1">
                      <AlertDialog open={deleteId === item.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[320px] rounded-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {language === "en" ? "Delete Record" : "刪除紀錄"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {language === "en" 
                                ? "Are you sure you want to delete this record?" 
                                : "確定要刪除此查詢紀錄嗎？"}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {language === "en" ? "Cancel" : "取消"}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {language === "en" ? "Delete" : "刪除"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setLocation(`/history/${item.id}`)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

