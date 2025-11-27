import { useState } from "react";
import { type Flashcard } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { FlashcardPractice } from "./FlashcardPractice";
import { SpellingPractice } from "./SpellingPractice";

interface PracticeModeSwitchProps {
  cards: Flashcard[];
  deckId?: string;
  onUpdateCard: (cardId: string, known: boolean) => void;
  onComplete: () => void;
}

export function PracticeModeSwitch({
  cards,
  deckId,
  onUpdateCard,
  onComplete,
}: PracticeModeSwitchProps) {
  const [mode, setMode] = useState<"flip" | "spelling">("flip");
  const { language } = useLanguage();

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="px-6 pt-4 flex justify-center">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "flip" | "spelling")}>
          <TabsList className="grid grid-cols-2 w-64 mx-auto">
            <TabsTrigger value="flip" className="text-sm py-1.5">
              {language === "en" ? "Flip" : "翻卡"}
            </TabsTrigger>
            <TabsTrigger value="spelling" className="text-sm py-1.5">
              {language === "en" ? "Spelling" : "拼字"}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Render appropriate component based on mode */}
      <div className="flex-1 relative">
        {mode === "flip" ? (
          <div className="absolute inset-0">
            <FlashcardPractice
              key={`flip-${deckId}`} // Reset component when deck changes
              cards={cards}
              deckId={deckId}
              onUpdateCard={onUpdateCard}
              onComplete={onComplete}
            />
          </div>
        ) : (
          <div className="absolute inset-0">
            <SpellingPractice
              key={`spelling-${deckId}`} // Reset component when deck changes
              cards={cards}
              deckId={deckId}
              onUpdateCard={onUpdateCard}
              onComplete={onComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
