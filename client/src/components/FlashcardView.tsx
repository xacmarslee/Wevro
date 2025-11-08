import { useState, useEffect } from "react";
import { type Flashcard } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, ArrowLeftRight, Check, X as XIcon, CornerDownLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";

interface FlashcardViewProps {
  cards: Flashcard[];
  deckId?: string;
  onUpdateCard: (cardId: string, known: boolean) => void;
  onComplete: () => void;
}

export function FlashcardView({
  cards,
  deckId,
  onUpdateCard,
  onComplete,
}: FlashcardViewProps) {
  const [mode, setMode] = useState<"flip" | "spelling">("flip");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(cards);
  
  // Flip mode states - separate from spelling mode
  const [flipSessionResults, setFlipSessionResults] = useState<Map<string, "known" | "unknown">>(new Map());
  const [flipTimeElapsed, setFlipTimeElapsed] = useState(0);
  const [flipTimerStarted, setFlipTimerStarted] = useState(false);
  const [flipIsCompleted, setFlipIsCompleted] = useState(false);
  
  // Spelling mode states - separate from flip mode
const [spellingSessionResults, setSpellingSessionResults] = useState<Map<string, "known" | "unknown">>(new Map());
const [spellingTimeElapsed, setSpellingTimeElapsed] = useState(0);
const [spellingTimerStarted, setSpellingTimerStarted] = useState(false);
const [spellingIsCompleted, setSpellingIsCompleted] = useState(false);
const [spellingInput, setSpellingInput] = useState("");
const [processedCardIds, setProcessedCardIds] = useState<string[]>([]);
const [isSpellingProcessing, setIsSpellingProcessing] = useState(false);
const [spellingFeedback, setSpellingFeedback] = useState<{ type: "correct" | "incorrect"; answer: string } | null>(null);
  
  const { language } = useLanguage();
  const t = useTranslation(language);

  // Convert part of speech to English abbreviation
  const getPosAbbr = (pos: string): string => {
    const posMap: Record<string, string> = {
      noun: "n.",
      verb: "v.",
      adjective: "adj.",
      adverb: "adv.",
      pronoun: "pron.",
      preposition: "prep.",
      conjunction: "conj.",
      interjection: "int.",
      phrase: "phr.",
      auxiliary: "aux.",
      "名詞": "n.",
      "動詞": "v.",
      "形容詞": "adj.",
      "副詞": "adv.",
      "代名詞": "pron.",
      "介系詞": "prep.",
      "連接詞": "conj.",
      "感嘆詞": "int.",
      "片語": "phr.",
      "助動詞": "aux.",
    };
    
    // Handle multiple POS separated by comma or Chinese punctuation
    if (pos.includes('、') || pos.includes(',')) {
      const parts = pos
        .split(/[、,]/)
        .map(p => posMap[p.trim().toLowerCase()] || posMap[p.trim()] || p.trim())
        .filter(Boolean);
      
      // Remove duplicates using Set
      const uniqueParts = Array.from(new Set(parts));
      
      return uniqueParts.join(', ');
    }
    
    return posMap[pos.toLowerCase()] || posMap[pos] || pos;
  };

  // Reset to beginning when entering a new deck (not when cards array reference changes)
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShuffledCards(cards);
    setShuffleMode(false);
    setProcessedCardIds([]);
    // Reset flip mode session counts
    setFlipSessionResults(new Map());
    setFlipTimeElapsed(0);
    setFlipTimerStarted(false);
    setFlipIsCompleted(false);
    // Reset spelling mode session counts
    setSpellingSessionResults(new Map());
    setSpellingTimeElapsed(0);
    setSpellingTimerStarted(false);
    setSpellingIsCompleted(false);
    setSpellingFeedback(null);
    setIsSpellingProcessing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]); // Only reset when deck ID changes, not when cards array reference changes
  
  // Update shuffled cards when cards content changes (but don't reset state)
  useEffect(() => {
    if (!shuffleMode) {
      setShuffledCards(cards);
    }
    // Note: when shuffleMode is true, we don't automatically re-shuffle
    // Shuffling is only done in handleShuffle to avoid unexpected re-ordering
  }, [cards, shuffleMode]);

  // Timer effect for flip mode
  useEffect(() => {
    if (!flipTimerStarted || flipIsCompleted) return;
    
    const interval = setInterval(() => {
      setFlipTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [flipTimerStarted, flipIsCompleted]);

  // Timer effect for spelling mode
  useEffect(() => {
    if (!spellingTimerStarted || spellingIsCompleted) return;
    
    const interval = setInterval(() => {
      setSpellingTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [spellingTimerStarted, spellingIsCompleted]);

  // Get current cards (shuffled or original)
  const displayCards = shuffleMode ? shuffledCards : cards;
  const currentCard = displayCards[currentIndex];
  
  // Motion values for drag animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Get current mode's state
  const sessionResults = mode === "flip" ? flipSessionResults : spellingSessionResults;
  const timeElapsed = mode === "flip" ? flipTimeElapsed : spellingTimeElapsed;
  const timerStarted = mode === "flip" ? flipTimerStarted : spellingTimerStarted;
  const isCompleted = mode === "flip" ? flipIsCompleted : spellingIsCompleted;
  
  // Count known and unknown cards from this session only
  const knownCount = Array.from(sessionResults.values()).filter((result) => result === "known").length;
  const unknownCount = Array.from(sessionResults.values()).filter((result) => result === "unknown").length;
  
  // Progress based on swiped cards (not just viewed)
  const swipedCount = sessionResults.size;
  const progress = (swipedCount / displayCards.length) * 100;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Get dynamic font size based on word length
  const getWordFontSize = (word: string): string => {
    const length = word.length;
    if (length <= 8) return "text-6xl"; // Very large for short words
    if (length <= 12) return "text-5xl"; // Large
    if (length <= 16) return "text-4xl"; // Medium-large
    if (length <= 20) return "text-3xl"; // Medium
    if (length <= 25) return "text-2xl"; // Medium-small
    if (length <= 30) return "text-xl"; // Small
    return "text-lg"; // Very small for extremely long words
  };

  // Reset current mode's progress
  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSpellingInput("");
    setSpellingFeedback(null);
    setProcessedCardIds([]);
    setIsSpellingProcessing(false);
    // Reset drag motion values
    x.set(0);
    
    if (mode === "flip") {
      setFlipSessionResults(new Map());
      setFlipTimeElapsed(0);
      setFlipTimerStarted(false);
      setFlipIsCompleted(false);
    } else {
      setSpellingSessionResults(new Map());
      setSpellingTimeElapsed(0);
      setSpellingTimerStarted(false);
      setSpellingIsCompleted(false);
    }
  };

  // Handle spelling check
  const handleSpellingCheck = () => {
    if (isSpellingProcessing) return;
    if (!spellingInput.trim()) return;
    if (!currentCard) return;

    setIsSpellingProcessing(true);

    // Start timer on first check
    if (!spellingTimerStarted) {
      setSpellingTimerStarted(true);
    }

    const answeredCard = currentCard;
    const correctAnswer = answeredCard.word.toLowerCase().trim();
    const userAnswer = spellingInput.toLowerCase().trim();
    const isCorrect = userAnswer === correctAnswer;

    setSpellingFeedback({ type: isCorrect ? "correct" : "incorrect", answer: answeredCard.word });
    setTimeout(() => {
      setSpellingFeedback((prev) => {
        if (!prev) return prev;
        return prev.answer === answeredCard.word ? null : prev;
      });
    }, 800);

    // Update session counts
    if (isCorrect) {
      setSpellingSessionResults((prev) => {
        const next = new Map(prev);
        next.set(answeredCard.id, "known");
        return next;
      });
      onUpdateCard(answeredCard.id, true);
    } else {
      setSpellingSessionResults((prev) => {
        const next = new Map(prev);
        next.set(answeredCard.id, "unknown");
        return next;
      });
      onUpdateCard(answeredCard.id, false);
    }

    const nextProcessedIds = processedCardIds.includes(answeredCard.id)
      ? processedCardIds
      : [...processedCardIds, answeredCard.id];
    setProcessedCardIds(nextProcessedIds);

    const processedSet = new Set(nextProcessedIds);

    const findNextIndex = () => {
      for (let i = currentIndex + 1; i < displayCards.length; i++) {
        if (!processedSet.has(displayCards[i].id)) {
          return i;
        }
      }
      for (let i = 0; i < displayCards.length; i++) {
        if (!processedSet.has(displayCards[i].id)) {
          return i;
        }
      }
      return -1;
    };

    const nextIndex = findNextIndex();

    if (nextIndex === -1) {
      setSpellingIsCompleted(true);
      setCurrentIndex(displayCards.length);
    } else {
      setCurrentIndex(nextIndex);
    }

    setSpellingInput("");
    setIsSpellingProcessing(false);
  };

  // Shuffle cards order
  const handleShuffle = () => {
    if (!shuffleMode) {
      // Shuffle the cards
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setShuffledCards(shuffled);
      setShuffleMode(true);
    } else {
      // Turn off shuffle mode
      setShuffleMode(false);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    // Clear spelling mode state when shuffling
    setSpellingInput("");
    setSpellingFeedback(null);
    // Reset drag motion values
    x.set(0);
    // Reset completed state - important when shuffling after completion
    if (mode === "flip") {
      setFlipIsCompleted(false);
    } else {
      setSpellingIsCompleted(false);
      setProcessedCardIds([]);
      setSpellingSessionResults(new Map());
      setSpellingTimerStarted(false);
      setSpellingTimeElapsed(0);
    }
  };

  // Toggle reverse mode (show Chinese first)
  const handleReverse = () => {
    setReverseMode(!reverseMode);
    setIsFlipped(false);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    
    // Start timer on first swipe
    if (!flipTimerStarted) {
      setFlipTimerStarted(true);
    }
    
    if (info.offset.x > threshold) {
      // Swiped right - I know
      setFlipSessionResults((prev) => {
        const next = new Map(prev);
        next.set(currentCard.id, "known");
        return next;
      });
      onUpdateCard(currentCard.id, true);
      // Immediately switch to next card
      nextCard();
      // Use requestAnimationFrame to reset position after card switches
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          x.set(0);
        });
      });
    } else if (info.offset.x < -threshold) {
      // Swiped left - Don't know
      setFlipSessionResults((prev) => {
        const next = new Map(prev);
        next.set(currentCard.id, "unknown");
        return next;
      });
      onUpdateCard(currentCard.id, false);
      // Immediately switch to next card
      nextCard();
      // Use requestAnimationFrame to reset position after card switches
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          x.set(0);
        });
      });
    }
    // If didn't reach threshold, let dragConstraints handle the spring back naturally
    // Don't manually set x to 0 here as it interferes with the drag physics
  };

  const nextCard = () => {
    setIsFlipped(false);
    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Mark as completed, stop timer, but don't navigate away
      setFlipIsCompleted(true);
      setCurrentIndex(displayCards.length);
    }
  };

  // Completion screen - only show when explicitly completed AND we've gone through all cards
  if (isCompleted && (currentIndex >= displayCards.length || swipedCount >= displayCards.length)) {
    return (
      <div className="flex flex-col h-full">
        {/* Mode Toggle */}
      <div className="px-6 pt-4 flex justify-center">
        <Tabs value={mode} onValueChange={(v) => {
          const newMode = v as "flip" | "spelling";
          setMode(newMode);
          // Reset current card index when switching modes
          setCurrentIndex(0);
          setSpellingInput("");
          setSpellingFeedback(null);
          setProcessedCardIds([]);
          setIsSpellingProcessing(false);
          setIsFlipped(false);
          // Reset shuffle mode when switching
          setShuffleMode(false);
          // Reset drag motion values
          x.set(0);
          if (newMode === "flip") {
            setFlipSessionResults(new Map());
            setFlipTimeElapsed(0);
            setFlipTimerStarted(false);
            setFlipIsCompleted(false);
          } else {
            setSpellingSessionResults(new Map());
            setSpellingTimeElapsed(0);
            setSpellingTimerStarted(false);
            setSpellingIsCompleted(false);
          }
        }}>
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

        {/* Progress bar */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t.progress}
            </span>
            <span className="text-sm font-semibold">
              {swipedCount} / {displayCards.length}
            </span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Statistics */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center space-y-8">
            <h2 className="text-3xl font-bold">
              {language === "en" ? "Practice Complete!" : "練習完成！"}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === "en" ? "Don't Know" : "不會"}
                  </span>
                  <span className="text-5xl font-bold text-destructive">{unknownCount}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === "en" ? "I Know" : "我會"}
                  </span>
                  <span className="text-5xl font-bold text-green-600 dark:text-green-500">{knownCount}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2 pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {language === "en" ? "Time" : "時間"}
                </span>
                <span className="text-4xl font-mono font-bold text-primary">{formatTime(timeElapsed)}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleReset}
                data-testid="button-retry"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                {language === "en" ? "Practice Again" : "再練習一次"}
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={onComplete}
                data-testid="button-finish"
              >
                {language === "en" ? "Back to Decks" : "返回字卡組"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check - if no current card available, show error or reset
  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            {language === "en" ? "No cards available" : "沒有可用的卡片"}
          </p>
          <Button onClick={onComplete}>
            {language === "en" ? "Back to Decks" : "返回字卡組"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="px-6 pt-4 flex justify-center">
        <Tabs value={mode} onValueChange={(v) => {
          const newMode = v as "flip" | "spelling";
          setMode(newMode);
          // Reset current card index when switching modes
          setCurrentIndex(0);
          setSpellingInput("");
          setSpellingFeedback(null);
          setProcessedCardIds([]);
          setIsSpellingProcessing(false);
          setIsFlipped(false);
          // Reset shuffle mode when switching
          setShuffleMode(false);
          // Reset drag motion values
          x.set(0);
          if (newMode === "flip") {
            setFlipSessionResults(new Map());
            setFlipTimeElapsed(0);
            setFlipTimerStarted(false);
            setFlipIsCompleted(false);
          } else {
            setSpellingSessionResults(new Map());
            setSpellingTimeElapsed(0);
            setSpellingTimerStarted(false);
            setSpellingIsCompleted(false);
          }
        }}>
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

      {/* Progress bar */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t.progress}
          </span>
          <span className="text-sm font-semibold">
            {swipedCount} / {displayCards.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-flashcards" />
      </div>

      {/* Control buttons with timer */}
      <div className="px-6 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            data-testid="button-reset"
            title={language === "en" ? "Reset" : "重新開始"}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant={shuffleMode ? "default" : "outline"}
            size="icon"
            onClick={handleShuffle}
            data-testid="button-shuffle"
            title={language === "en" ? "Shuffle" : "隨機順序"}
          >
            <Shuffle className="h-5 w-5" />
          </Button>
          {mode === "flip" && (
            <Button
              variant={reverseMode ? "default" : "outline"}
              size="icon"
              onClick={handleReverse}
              data-testid="button-reverse"
              title={language === "en" ? "Show Chinese first" : "中文在前"}
            >
              <ArrowLeftRight className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* Timer display */}
        <div className="text-xl font-mono font-semibold text-muted-foreground">
          {formatTime(timeElapsed)}
        </div>
      </div>

      {/* Card container */}
      <div className={`flex-1 flex justify-center p-8 ${mode === "spelling" ? "items-start pt-12" : "items-center"}`}>
        <div className="w-full max-w-2xl">
          {/* Indicators with counts */}
          <div className="flex items-center justify-between mb-6 text-sm font-medium">
            <div className="flex flex-col items-center gap-1 text-destructive">
              <span className="text-2xl font-bold">{unknownCount}</span>
              <div className="flex items-center gap-2">
                {mode === "flip" && <ChevronLeft className="h-5 w-5" />}
                <span>{mode === "flip" ? t.swipeLeft : (language === "en" ? "Incorrect" : "答錯")}</span>
              </div>
            </div>
            <div className="text-muted-foreground">
              {mode === "flip" ? t.flip : (language === "en" ? "Type the word" : "輸入單字")}
            </div>
            <div className="flex flex-col items-center gap-1 text-green-600 dark:text-green-500">
              <span className="text-2xl font-bold">{knownCount}</span>
              <div className="flex items-center gap-2">
                <span>{mode === "flip" ? t.swipeRight : (language === "en" ? "Correct" : "答對")}</span>
                {mode === "flip" && <ChevronRight className="h-5 w-5" />}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${currentCard.id}`}
              drag={mode === "flip" ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={mode === "flip" ? handleDragEnd : undefined}
              style={mode === "flip" ? { x, rotate, opacity } : {}}
              className={mode === "flip" ? "cursor-grab active:cursor-grabbing" : ""}
              data-testid="flashcard-draggable"
            >
              <div
                className="relative w-full aspect-[3/2] perspective-1000"
                onClick={mode === "flip" ? () => setIsFlipped(!isFlipped) : undefined}
              >
                <motion.div
                  className="relative w-full h-full"
                  initial={false}
                  animate={{ rotateY: (mode === "flip" && isFlipped) ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front */}
                  {mode === "flip" && (
                  <div
                    className="absolute inset-0 backface-hidden rounded-2xl border-2 bg-card shadow-xl p-12 flex items-center justify-center"
                    style={{ backfaceVisibility: "hidden" }}
                    data-testid="flashcard-front"
                  >
                    <div className="w-full flex flex-col items-center justify-center">
                      {!reverseMode ? (
                        <p className={`${getWordFontSize(currentCard.word)} font-bold text-card-foreground text-center`}>
                          {currentCard.word}
                        </p>
                      ) : (
                        <div className="space-y-4 w-full text-center">
                          {/* Check if definition already has pos labels (new format) */}
                          {currentCard.definition.includes('n.') || currentCard.definition.includes('v.') || 
                           currentCard.definition.includes('adj.') || currentCard.definition.includes('adv.') ? (
                            // New format: definition already has pos labels, split by newline
                            currentCard.definition.split('\n').map((line, idx) => (
                              <p key={idx} className="text-2xl md:text-3xl font-semibold leading-relaxed text-card-foreground text-center">
                                {line}
                              </p>
                            ))
                          ) : (
                            // Old format: add pos label manually
                            <div className="space-y-2">
                              <p className="text-2xl md:text-3xl font-semibold leading-relaxed text-card-foreground text-center">
                                {getPosAbbr(currentCard.partOfSpeech)} {currentCard.definition}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Back / Spelling Card */}
                  <div
                    className={`absolute inset-0 rounded-2xl border-2 shadow-xl p-12 flex flex-col items-center justify-center ${
                      mode === "spelling" 
                        ? "bg-card text-card-foreground" 
                        : "backface-hidden bg-primary text-primary-foreground"
                    }`}
                    style={mode === "flip" ? {
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    } : {}}
                    data-testid="flashcard-back"
                  >
                    <div className="w-full flex flex-col items-center justify-center space-y-6">
                      {(mode === "spelling" || !reverseMode) ? (
                        <div className="space-y-4 w-full text-center">
                          {/* Check if definition already has pos labels (new format) */}
                          {currentCard.definition.includes('n.') || currentCard.definition.includes('v.') || 
                           currentCard.definition.includes('adj.') || currentCard.definition.includes('adv.') ? (
                            // New format: definition already has pos labels, split by newline
                            currentCard.definition.split('\n').map((line, idx) => (
                              <p key={idx} className={`text-2xl md:text-3xl font-semibold leading-relaxed text-center ${mode === "spelling" ? "text-card-foreground" : ""}`}>
                                {line}
                              </p>
                            ))
                          ) : (
                            // Old format: add pos label manually
                            <div className="space-y-2">
                              <p className={`text-2xl md:text-3xl font-semibold leading-relaxed text-center ${mode === "spelling" ? "text-card-foreground" : ""}`}>
                                {getPosAbbr(currentCard.partOfSpeech)} {currentCard.definition}
                              </p>
                            </div>
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

          {/* Spelling Input */}
          {mode === "spelling" && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-3">
                <Input
                  value={spellingInput}
                  onChange={(e) => setSpellingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSpellingProcessing) {
                      handleSpellingCheck();
                    }
                  }}
                  placeholder={language === "en" ? "Type the word..." : "輸入單字..."}
                  className={`text-lg font-mono ${
                    spellingFeedback?.type === "correct"
                      ? "border-green-600 dark:border-green-500"
                      : spellingFeedback?.type === "incorrect"
                      ? "border-destructive"
                      : ""
                  }`}
                  disabled={isSpellingProcessing}
                  autoFocus
                />
                <Button
                  onClick={handleSpellingCheck}
                  disabled={!spellingInput.trim() || isSpellingProcessing}
                  size="icon"
                  className="h-10 w-10"
                >
                  <CornerDownLeft className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Feedback Message */}
              {spellingFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg ${
                    spellingFeedback.type === "correct"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}
                >
                  {spellingFeedback.type === "correct" ? (
                    <>
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">
                        {language === "en" ? "Correct!" : "答對了！"}
                      </span>
                    </>
                  ) : (
                    <>
                      <XIcon className="h-5 w-5" />
                      <span className="font-semibold">
                        {language === "en"
                          ? `Incorrect. The answer is: ${spellingFeedback.answer}`
                          : `答錯了。正確答案是：${spellingFeedback.answer}`}
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

