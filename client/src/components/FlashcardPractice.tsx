import { useState, useEffect } from "react";
import { type Flashcard } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, ArrowLeftRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";

interface FlashcardPracticeProps {
  cards: Flashcard[];
  onUpdateCard: (cardId: string, known: boolean) => void;
  onComplete: () => void;
  deckId?: string;
}

export function FlashcardPractice({
  cards,
  onUpdateCard,
  onComplete,
  deckId
}: FlashcardPracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(cards);
  
  const [sessionResults, setSessionResults] = useState<Map<string, "known" | "unknown">>(new Map());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [processedFlipIds, setProcessedFlipIds] = useState<string[]>([]);

  const { language } = useLanguage();
  const t = useTranslation(language);

  // Motion values for drag animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Reset when deck changes
  useEffect(() => {
    handleReset();
  }, [deckId]);

  // Timer
  useEffect(() => {
    if (!timerStarted || isCompleted) return;
    const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [timerStarted, isCompleted]);

  // Handle cards update
  useEffect(() => {
    if (!shuffleMode) {
      setShuffledCards(cards);
    }
  }, [cards, shuffleMode]);

  const displayCards = shuffleMode ? shuffledCards : cards;
  const currentCard = displayCards[currentIndex];

  const knownCount = Array.from(sessionResults.values()).filter(r => r === "known").length;
  const unknownCount = Array.from(sessionResults.values()).filter(r => r === "unknown").length;
  const swipedCount = processedFlipIds.length;
  const progress = displayCards.length === 0 ? 0 : (swipedCount / displayCards.length) * 100;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getPosAbbr = (pos: string): string => {
    const posMap: Record<string, string> = {
      noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.",
      pronoun: "pron.", preposition: "prep.", conjunction: "conj.",
      interjection: "int.", phrase: "phr.", auxiliary: "aux.",
      "名詞": "n.", "動詞": "v.", "形容詞": "adj.", "副詞": "adv.",
      "代名詞": "pron.", "介系詞": "prep.", "連接詞": "conj.",
      "感嘆詞": "int.", "片語": "phr.", "助動詞": "aux.",
    };
    
    if (pos.includes('、') || pos.includes(',')) {
      const parts = pos.split(/[、,]/).map(p => posMap[p.trim().toLowerCase()] || posMap[p.trim()] || p.trim()).filter(Boolean);
      return Array.from(new Set(parts)).join(', ');
    }
    return posMap[pos.toLowerCase()] || posMap[pos] || pos;
  };

  const getWordFontSize = (word: string): string => {
    const length = word.length;
    if (length <= 8) return "text-6xl";
    if (length <= 12) return "text-5xl";
    if (length <= 16) return "text-4xl";
    if (length <= 20) return "text-3xl";
    if (length <= 25) return "text-2xl";
    if (length <= 30) return "text-xl";
    return "text-lg";
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setProcessedFlipIds([]);
    setSessionResults(new Map());
    setTimeElapsed(0);
    setTimerStarted(false);
    setIsCompleted(false);
    x.set(0);
  };

  const handleShuffle = () => {
    if (!shuffleMode) {
      setShuffledCards([...cards].sort(() => Math.random() - 0.5));
      setShuffleMode(true);
    } else {
      setShuffleMode(false);
    }
    handleReset();
  };

  const advanceToNextCard = (processedIds: string[]) => {
    setIsFlipped(false);
    const totalCards = displayCards.length;

    if (totalCards === 0 || new Set(processedIds).size >= totalCards) {
      setIsCompleted(true);
      setCurrentIndex(totalCards);
      return;
    }

    let nextIndex = -1;
    const processedSet = new Set(processedIds);

    // Try to find next unprocessed card after current index
    for (let i = currentIndex + 1; i < totalCards; i++) {
      if (!processedSet.has(displayCards[i]?.id)) {
        nextIndex = i;
        break;
      }
    }

    // Wrap around if needed
    if (nextIndex === -1) {
      for (let i = 0; i < totalCards; i++) {
        if (!processedSet.has(displayCards[i]?.id)) {
          nextIndex = i;
          break;
        }
      }
    }

    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
    } else {
      setIsCompleted(true);
      setCurrentIndex(totalCards);
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    if (!timerStarted) setTimerStarted(true);

    const cardId = currentCard?.id;
    if (!cardId) return;

    if (info.offset.x > threshold) {
      // Swiped right - Known
      setSessionResults(prev => new Map(prev).set(cardId, "known"));
      const newProcessed = [...processedFlipIds, cardId];
      setProcessedFlipIds(newProcessed);
      onUpdateCard(cardId, true);
    } else if (info.offset.x < -threshold) {
      // Swiped left - Unknown
      setSessionResults(prev => new Map(prev).set(cardId, "unknown"));
      const newProcessed = [...processedFlipIds, cardId];
      setProcessedFlipIds(newProcessed);
      onUpdateCard(cardId, false);
    } else {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        x.set(0);
      });
    });
    
    // Use the locally calculated newProcessed array
    advanceToNextCard([...processedFlipIds, cardId]);
  };

  if (isCompleted) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{t.progress}</span>
            <span className="text-sm font-semibold">{swipedCount} / {displayCards.length}</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center space-y-8">
            <h2 className="text-3xl font-bold">{language === "en" ? "Practice Complete!" : "練習完成！"}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{language === "en" ? "Don't Know" : "不會"}</span>
                  <span className="text-5xl font-bold text-destructive">{unknownCount}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{language === "en" ? "I Know" : "我會"}</span>
                  <span className="text-5xl font-bold text-green-600 dark:text-green-500">{knownCount}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 pt-4">
                <span className="text-sm font-medium text-muted-foreground">{language === "en" ? "Time" : "時間"}</span>
                <span className="text-4xl font-mono font-bold text-primary">{formatTime(timeElapsed)}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" size="lg" onClick={handleReset}>
                <RotateCcw className="h-5 w-5 mr-2" />
                {language === "en" ? "Practice Again" : "再練習一次"}
              </Button>
              <Button variant="default" size="lg" onClick={onComplete}>
                {language === "en" ? "Back to Decks" : "返回字卡組"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">{language === "en" ? "No cards available" : "沒有可用的卡片"}</p>
          <Button onClick={onComplete}>{language === "en" ? "Back to Decks" : "返回字卡組"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{t.progress}</span>
          <span className="text-sm font-semibold">{swipedCount} / {displayCards.length}</span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-flashcards" />
      </div>

      <div className="px-6 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleReset} title={language === "en" ? "Reset" : "重新開始"}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button variant={shuffleMode ? "default" : "outline"} size="icon" onClick={handleShuffle} title={language === "en" ? "Shuffle" : "隨機順序"}>
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button variant={reverseMode ? "default" : "outline"} size="icon" onClick={() => { setReverseMode(!reverseMode); setIsFlipped(false); }} title={language === "en" ? "Show Chinese first" : "中文在前"}>
            <ArrowLeftRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-xl font-mono font-semibold text-muted-foreground">{formatTime(timeElapsed)}</div>
      </div>

      <div className="flex-1 flex justify-center p-8 items-start pt-12 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6 text-sm font-medium">
            <div className="flex flex-col items-center gap-1 text-destructive">
              <span className="text-2xl font-bold">{unknownCount}</span>
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                <span>{t.swipeLeft}</span>
              </div>
            </div>
            <div className="text-muted-foreground">{t.flip}</div>
            <div className="flex flex-col items-center gap-1 text-green-600 dark:text-green-500">
              <span className="text-2xl font-bold">{knownCount}</span>
              <div className="flex items-center gap-2">
                <span>{t.swipeRight}</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`flip-${currentCard.id}`}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              style={{ x, rotate, opacity }}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="relative w-full aspect-[3/2] perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                  className="relative w-full h-full"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden rounded-2xl border-2 bg-card shadow-xl p-12 flex items-center justify-center" style={{ backfaceVisibility: "hidden" }}>
                    <div className="w-full flex flex-col items-center justify-center">
                      {!reverseMode ? (
                        <p className={`${getWordFontSize(currentCard.word)} font-bold text-card-foreground text-center`}>
                          {currentCard.word}
                        </p>
                      ) : (
                        <div className="space-y-4 w-full text-center">
                          {currentCard.definition.includes('n.') || currentCard.definition.includes('v.') ? (
                            currentCard.definition.split('\n').map((line, idx) => (
                              <p key={idx} className="text-2xl md:text-3xl font-semibold leading-relaxed text-card-foreground text-center">
                                {line}
                              </p>
                            ))
                          ) : (
                            <p className="text-2xl md:text-3xl font-semibold leading-relaxed text-card-foreground text-center">
                              {getPosAbbr(currentCard.partOfSpeech)} {currentCard.definition}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 rounded-2xl border-2 shadow-xl p-12 flex flex-col items-center justify-center backface-hidden bg-primary text-primary-foreground"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <div className="w-full flex flex-col items-center justify-center space-y-6">
                      {!reverseMode ? (
                        <div className="space-y-4 w-full text-center">
                          {currentCard.definition.includes('n.') || currentCard.definition.includes('v.') ? (
                            currentCard.definition.split('\n').map((line, idx) => (
                              <p key={idx} className="text-2xl md:text-3xl font-semibold leading-relaxed text-center">
                                {line}
                              </p>
                            ))
                          ) : (
                            <p className="text-2xl md:text-3xl font-semibold leading-relaxed text-center">
                              {getPosAbbr(currentCard.partOfSpeech)} {currentCard.definition}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className={`${getWordFontSize(currentCard.word)} font-bold text-center`}>
                          {currentCard.word}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

