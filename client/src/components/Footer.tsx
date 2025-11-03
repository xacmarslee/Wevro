import { Search, BookOpen, Network, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  
  const navItems = [
    {
      id: "query",
      path: "/query",
      icon: Search,
      label: language === "en" ? "Query" : "查詢",
      testId: "nav-query"
    },
    {
      id: "flashcards",
      path: "/flashcards",
      icon: BookOpen,
      label: language === "en" ? "Flashcards" : "字卡",
      testId: "nav-flashcards"
    },
    {
      id: "mindmaps",
      path: "/mindmaps",
      icon: Network,
      label: language === "en" ? "Mind Maps" : "心智圖",
      testId: "nav-mindmaps"
    },
    {
      id: "settings",
      path: "/settings",
      icon: Settings,
      label: language === "en" ? "Settings" : "設定",
      testId: "nav-settings"
    }
  ];

  const isActive = (path: string) => {
    if (path === "/mindmaps") {
      return location === path || location.startsWith("/mindmap/");
    }
    return location === path;
  };

  return (
    <footer className="border-t bg-card">
      <nav className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.path)}
              data-testid={item.testId}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-md transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover-elevate"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-xs ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
}
