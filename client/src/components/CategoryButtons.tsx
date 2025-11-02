import { Button } from "@/components/ui/button";
import { wordCategories, type WordCategory } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

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

  return (
    <div className="sticky top-16 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 py-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap pr-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">
              {language === "en" ? "Expand:" : "展開："}
            </span>
          </div>
          
          {wordCategories.map((category) => (
            <Button
              key={category}
              variant="secondary"
              size="default"
              onClick={() => onSelectCategory(category)}
              disabled={disabled || loading}
              data-testid={`button-category-${category}`}
              className="whitespace-nowrap font-medium"
            >
              {t.categories[category]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
