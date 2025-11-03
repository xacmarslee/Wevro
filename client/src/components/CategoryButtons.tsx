import { useState } from "react";
import { Button } from "@/components/ui/button";
import { wordCategories, type WordCategory } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryColor } from "@shared/categoryColors";
import { Sparkles, Menu, X } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop/Tablet Landscape - Top horizontal bar (hidden on smaller screens) */}
      <div className="hidden lg:block sticky top-16 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      {/* Mobile/Tablet - Left vertical sidebar (visible on smaller screens) */}
      <div className="lg:hidden">
        {/* Toggle button - hamburger menu */}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-[72px] left-3 z-50 shadow-lg"
          data-testid="button-toggle-categories"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Compact Sidebar */}
        <div
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/95 border-r shadow-xl transition-transform duration-300 z-40 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ width: "fit-content", maxWidth: "200px" }}
        >
          <div className="p-2 space-y-1.5 overflow-y-auto h-full">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1.5 mb-1.5 border-b px-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">
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
                  onClick={() => {
                    onSelectCategory(category);
                    setIsOpen(false);
                  }}
                  disabled={disabled || loading}
                  data-testid={`button-category-${category}`}
                  className="w-full justify-start font-medium border-2 text-xs px-2 py-1.5 h-auto"
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

        {/* Backdrop overlay when open */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </>
  );
}
