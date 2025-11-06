import { Search, Layers, Brain, Settings } from "lucide-react";
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
      icon: Layers,
      label: language === "en" ? "Flashcards" : "字卡",
      testId: "nav-flashcards"
    },
    {
      id: "mindmaps",
      path: "/mindmaps",
      icon: Brain,
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
      // Mind maps is the default route, so "/" should also activate it
      return location === path || location === "/" || location.startsWith("/mindmap/");
    }
    if (path === "/flashcards") {
      // Flashcards includes practice pages with IDs
      return location === path || location.startsWith("/flashcards/");
    }
    if (path === "/settings") {
      // Settings includes pricing and account sub-pages
      return location === path || location === "/pricing" || location === "/account";
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
              className={`flex items-center justify-center px-4 py-2 rounded-md transition-all ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover-elevate"
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
            </button>
          );
        })}
      </nav>
    </footer>
  );
}
