import { useState, useEffect, useRef } from "react";
import { type Flashcard } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Shuffle, Check, X as XIcon, CornerDownLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";

const SPELLING_FEEDBACK_DURATION = 1500;
const SPELLING_RESULT_DELAY = 200;

interface SpellingPracticeProps {
  cards: Flashcard[];
  onUpdateCard: (cardId: string, known: boolean) => void;
  onComplete: () => void;
  deckId?: string;
}

export function SpellingPractice({
  cards,
  onUpdateCard,
  onComplete,
  deckId
}: SpellingPracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(cards);
  
  const [sessionResults, setSessionResults] = useState<Map<string, "known" | "unknown">>(new Map());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [processedCardIds, setProcessedCardIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "correct" | "incorrect"; answer: string } | null>(null);
  
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { language } = useLanguage();
  const t = useTranslation(language);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    };
  }, []);

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
  const processedCount = Math.min(processedCardIds.length, displayCards.length);
  const progress = displayCards.length === 0 ? 0 : (processedCount / displayCards.length) * 100;

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

  const handleReset = () => {
    setCurrentIndex(0);
    setSpellingInput("");
    setFeedback(null);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    setProcessedCardIds([]);
    setIsProcessing(false);
    setSessionResults(new Map());
    setTimeElapsed(0);
    setTimerStarted(false);
    setIsCompleted(false);
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

  const handleCheck = () => {
    if (isProcessing) return;
    if (!spellingInput.trim()) return;
    if (!currentCard) return;

    setIsProcessing(true);
    if (!timerStarted) setTimerStarted(true);

    const answeredCard = currentCard;
    const correctAnswer = answeredCard.word.toLowerCase().trim();
    const userAnswer = spellingInput.toLowerCase().trim();
    const isCorrect = userAnswer === correctAnswer;

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    
    setFeedback({ type: isCorrect ? "correct" : "incorrect", answer: answeredCard.word });
    
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(prev => prev?.answer === answeredCard.word ? null : prev);
      feedbackTimeoutRef.current = null;
    }, SPELLING_FEEDBACK_DURATION);

    if (isCorrect) {
      setSessionResults(prev => new Map(prev).set(answeredCard.id, "known"));
      onUpdateCard(answeredCard.id, true);
    } else {
      setSessionResults(prev => new Map(prev).set(answeredCard.id, "unknown"));
      onUpdateCard(answeredCard.id, false);
    }

    const nextProcessedIds = processedCardIds.includes(answeredCard.id)
      ? processedCardIds
      : [...processedCardIds, answeredCard.id];
    setProcessedCardIds(nextProcessedIds);

    const processedSet = new Set(nextProcessedIds);
    const totalCards = displayCards.length;

    const findNextIndex = () => {
      for (let i = currentIndex + 1; i < totalCards; i++) {
        if (!processedSet.has(displayCards[i].id)) return i;
      }
      for (let i = 0; i < totalCards; i++) {
        if (!processedSet.has(displayCards[i].id)) return i;
      }
      return -1;
    };

    const isFinalCard = totalCards === 0 || nextProcessedIds.length >= totalCards;

    if (isFinalCard) {
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = setTimeout(() => {
        setIsCompleted(true);
        setCurrentIndex(totalCards);
        completionTimeoutRef.current = null;
      }, SPELLING_FEEDBACK_DURATION + SPELLING_RESULT_DELAY);
    } else {
      const nextIndex = findNextIndex();
      if (nextIndex === -1) {
        setIsCompleted(true);
        setCurrentIndex(totalCards);
      } else {
        setCurrentIndex(nextIndex);
      }
    }

    setSpellingInput("");
    setIsProcessing(false);
  };

  if (isCompleted) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{t.progress}</span>
            <span className="text-sm font-semibold">{processedCount} / {displayCards.length}</span>
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
          <span className="text-sm font-semibold">{processedCount} / {displayCards.length}</span>
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
        </div>
        <div className="text-xl font-mono font-semibold text-muted-foreground">{formatTime(timeElapsed)}</div>
      </div>

      <div className="flex-1 flex justify-center p-8 items-start pt-12 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6 text-sm font-medium">
            <div className="flex flex-col items-center gap-1 text-destructive">
              <span className="text-2xl font-bold">{unknownCount}</span>
              <div className="flex items-center gap-2">
                <span>{language === "en" ? "Incorrect" : "答錯"}</span>
              </div>
            </div>
            <div className="text-muted-foreground">{language === "en" ? "Type the word" : "輸入單字"}</div>
            <div className="flex flex-col items-center gap-1 text-green-600 dark:text-green-500">
              <span className="text-2xl font-bold">{knownCount}</span>
              <div className="flex items-center gap-2">
                <span>{language === "en" ? "Correct" : "答對"}</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`spell-${currentCard.id}`}
              className=""
            >
              <div className="relative w-full aspect-[3/2]">
                <div className="absolute inset-0 rounded-2xl border-2 shadow-xl p-12 flex flex-col items-center justify-center bg-card text-card-foreground">
                  <div className="w-full flex flex-col items-center justify-center space-y-6">
                    <div className="space-y-4 w-full text-center">
                      {currentCard.definition.includes('n.') || currentCard.definition.includes('v.') ? (
                        currentCard.definition.split('\n').map((line, idx) => (
                          <p key={idx} className="text-2xl md:text-3xl font-semibold leading-relaxed text-center text-card-foreground">
                            {line}
                          </p>
                        ))
                      ) : (
                        <p className="text-2xl md:text-3xl font-semibold leading-relaxed text-center text-card-foreground">
                          {getPosAbbr(currentCard.partOfSpeech)} {currentCard.definition}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <Input
                value={spellingInput}
                onChange={(e) => setSpellingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing) {
                    handleCheck();
                  }
                }}
                placeholder={language === "en" ? "Type the word..." : "輸入單字..."}
                className={`text-lg font-mono ${
                  feedback?.type === "correct"
                    ? "border-green-600 dark:border-green-500"
                    : feedback?.type === "incorrect"
                    ? "border-destructive"
                    : ""
                }`}
                disabled={isProcessing}
                autoFocus
              />
              <Button
                onClick={handleCheck}
                disabled={!spellingInput.trim() || isProcessing}
                size="icon"
                className="h-10 w-10"
              >
                <CornerDownLeft className="h-5 w-5" />
              </Button>
            </div>
            
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg ${
                  feedback.type === "correct"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}
              >
                {feedback.type === "correct" ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span className="font-semibold">{language === "en" ? "Correct!" : "答對了！"}</span>
                  </>
                ) : (
                  <>
                    <XIcon className="h-5 w-5" />
                    <span className="font-semibold">
                      {language === "en"
                        ? `Incorrect. The answer is: ${feedback.answer}`
                        : `答錯了。正確答案是：${feedback.answer}`}
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

