import { useState } from "react";
import { type Flashcard } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";

interface FlashcardViewProps {
  cards: Flashcard[];
  onUpdateCard: (cardId: string, known: boolean) => void;
  onComplete: () => void;
}

export function FlashcardView({
  cards,
  onUpdateCard,
  onComplete,
}: FlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { language } = useLanguage();
  const t = useTranslation(language);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swiped right - I know
      onUpdateCard(currentCard.id, true);
      nextCard();
    } else if (info.offset.x < -threshold) {
      // Swiped left - Don't know
      onUpdateCard(currentCard.id, false);
      nextCard();
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const prevCard = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleKnown = (known: boolean) => {
    onUpdateCard(currentCard.id, known);
    nextCard();
  };

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-2xl font-semibold mb-4">{t.finish}</p>
          <Button onClick={onComplete} data-testid="button-finish">
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
        <Progress value={progress} className="h-2" data-testid="progress-flashcards" />
      </div>

      {/* Card container */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Swipe indicators */}
          <div className="flex items-center justify-between mb-6 text-sm font-medium">
            <div className="flex items-center gap-2 text-destructive">
              <ChevronLeft className="h-5 w-5" />
              <span>{t.swipeLeft}</span>
            </div>
            <div className="text-muted-foreground">{t.flip}</div>
            <div className="flex items-center gap-2 text-primary">
              <span>{t.swipeRight}</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              style={{ x, rotate, opacity }}
              className="cursor-grab active:cursor-grabbing"
              data-testid="flashcard-draggable"
            >
              <div
                className="relative w-full aspect-[3/2] perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="relative w-full h-full"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 backface-hidden rounded-2xl border-2 bg-card shadow-xl p-12 flex items-center justify-center"
                    style={{ backfaceVisibility: "hidden" }}
                    data-testid="flashcard-front"
                  >
                    <div className="text-center">
                      <p className="text-5xl font-bold text-card-foreground">
                        {currentCard.word}
                      </p>
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 backface-hidden rounded-2xl border-2 bg-primary text-primary-foreground shadow-xl p-12 flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    data-testid="flashcard-back"
                  >
                    <div className="text-center space-y-6">
                      <p className="text-3xl font-semibold leading-relaxed">
                        {currentCard.definition}
                      </p>
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-foreground/20 text-sm font-medium">
                        {currentCard.partOfSpeech}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={prevCard}
              disabled={currentIndex === 0}
              data-testid="button-prev-card"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              {language === "en" ? "Previous" : "上一個"}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFlipped(!isFlipped)}
              data-testid="button-flip-card"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={() => handleKnown(false)}
              data-testid="button-dont-know"
            >
              {t.swipeLeft}
            </Button>

            <Button
              variant="default"
              size="lg"
              onClick={() => handleKnown(true)}
              data-testid="button-know"
            >
              {t.swipeRight}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
