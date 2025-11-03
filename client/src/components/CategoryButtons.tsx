import { useState } from "react";
import { Button } from "@/components/ui/button";
import { wordCategories, type WordCategory } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryColor } from "@shared/categoryColors";
import { Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface CategoryButtonsProps {
  onSelectCategory: (category: WordCategory) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function CategoryButtons({
  onSelectCategory,
  disabled = false,
  loading = false,
}: CategoryButtonsProps) {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Desktop/Tablet Landscape - Top horizontal bar (hidden on mobile portrait) */}
      <div className="hidden md:block sticky top-16 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap pr-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">
                {language === "en" ? "Expand:" : "展開："}
              </span>
            </div>
            
            {wordCategories.map((category) => {
              const color = getCategoryColor(category, isDark);
              return (
                <Button
                  key={category}
                  variant="outline"
                  size="default"
                  onClick={() => onSelectCategory(category)}
                  disabled={disabled || loading}
                  data-testid={`button-category-${category}`}
                  className="whitespace-nowrap font-medium border-2"
                  style={{
                    borderColor: color,
                    color: color,
                  }}
                >
                  {t.categories[category]}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Portrait - Left vertical sidebar (visible on mobile portrait only) */}
      <div className="md:hidden">
        {/* Toggle button */}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-20 left-2 z-50 shadow-lg"
          data-testid="button-toggle-categories"
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </Button>

        {/* Sidebar */}
        <div
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r shadow-lg transition-transform duration-300 z-40 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ width: "auto" }}
        >
          <div className="p-3 space-y-2 overflow-y-auto h-full">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pb-2 border-b">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium whitespace-nowrap">
                {language === "en" ? "Expand" : "展開"}
              </span>
            </div>
            
            {wordCategories.map((category) => {
              const color = getCategoryColor(category, isDark);
              return (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectCategory(category)}
                  disabled={disabled || loading}
                  data-testid={`button-category-${category}`}
                  className="w-full justify-start font-medium border-2"
                  style={{
                    borderColor: color,
                    color: color,
                  }}
                >
                  {t.categories[category]}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
