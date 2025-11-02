import { useState } from "react";
import { type Flashcard } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Delete } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";

interface SpellingTestProps {
  cards: Flashcard[];
  onComplete: () => void;
}

const KEYBOARD_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export function SpellingTest({ cards, onComplete }: SpellingTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [showResult, setShowResult] = useState<"correct" | "incorrect" | null>(null);
  const { language } = useLanguage();
  const t = useTranslation(language);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const handleKeyPress = (key: string) => {
    if (showResult) return;
    setInput((prev) => prev + key.toLowerCase());
  };

  const handleBackspace = () => {
    if (showResult) return;
    setInput((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    const isCorrect = input.toLowerCase() === currentCard.word.toLowerCase();
    setShowResult(isCorrect ? "correct" : "incorrect");

    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((i) => i + 1);
        setInput("");
        setShowResult(null);
      } else {
        onComplete();
      }
    }, 1500);
  };

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-2xl font-semibold mb-4">{t.finish}</p>
          <Button onClick={onComplete} data-testid="button-finish-spelling">
            {t.backToMap}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t.progress}
          </span>
          <span className="text-sm font-semibold">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-spelling" />
      </div>

      {/* Definition display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Definition card */}
          <div className="bg-card border rounded-2xl p-8 shadow-lg">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-secondary text-sm font-medium">
                {currentCard.partOfSpeech}
              </div>
              <p className="text-3xl font-semibold text-card-foreground leading-relaxed">
                {currentCard.definition}
              </p>
            </div>
          </div>

          {/* Input display */}
          <div className="relative">
            <div
              className={`
                w-full rounded-2xl border-2 p-6 text-center text-3xl font-mono font-semibold tracking-wider min-h-[100px] flex items-center justify-center
                transition-colors
                ${showResult === "correct" ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
                ${showResult === "incorrect" ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}
                ${!showResult ? "border-border bg-background" : ""}
              `}
              data-testid="spelling-input-display"
            >
              {input || (
                <span className="text-muted-foreground text-xl">
                  {t.typeWord}
                </span>
              )}
            </div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-4 right-4"
                >
                  {showResult === "correct" ? (
                    <div className="bg-green-500 text-white rounded-full p-3 shadow-lg">
                      <Check className="h-8 w-8" />
                    </div>
                  ) : (
                    <div className="bg-red-500 text-white rounded-full p-3 shadow-lg">
                      <X className="h-8 w-8" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showResult === "incorrect" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-muted-foreground"
            >
              {language === "en" ? "Correct answer:" : "正確答案："}{" "}
              <span className="font-semibold text-foreground">
                {currentCard.word}
              </span>
            </motion.div>
          )}

          {/* Custom keyboard */}
          <div className="space-y-2">
            {KEYBOARD_LAYOUT.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="flex justify-center gap-2"
              >
                {row.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="lg"
                    onClick={() => handleKeyPress(key)}
                    disabled={showResult !== null}
                    data-testid={`key-${key.toLowerCase()}`}
                    className="min-w-[3rem] h-14 text-lg font-semibold"
                  >
                    {key}
                  </Button>
                ))}
              </div>
            ))}

            {/* Bottom row with special keys */}
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBackspace}
                disabled={showResult !== null || input.length === 0}
                data-testid="key-backspace"
                className="min-w-[5rem] h-14"
              >
                <Delete className="h-5 w-5" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleKeyPress(" ")}
                disabled={showResult !== null}
                data-testid="key-space"
                className="min-w-[15rem] h-14"
              >
                SPACE
              </Button>

              <Button
                variant="default"
                size="lg"
                onClick={handleSubmit}
                disabled={showResult !== null || input.length === 0}
                data-testid="button-submit-spelling"
                className="min-w-[5rem] h-14"
              >
                {t.submit}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
