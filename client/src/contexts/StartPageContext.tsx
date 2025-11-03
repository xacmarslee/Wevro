import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type StartPage = "query" | "flashcards" | "mindmaps";

interface StartPageContextType {
  startPage: StartPage;
  setStartPage: (page: StartPage) => void;
}

const StartPageContext = createContext<StartPageContextType | undefined>(undefined);

export function StartPageProvider({ children }: { children: ReactNode }) {
  const [startPage, setStartPageState] = useState<StartPage>(() => {
    const saved = localStorage.getItem("startPage");
    return (saved as StartPage) || "mindmaps";
  });

  useEffect(() => {
    localStorage.setItem("startPage", startPage);
  }, [startPage]);

  const setStartPage = (page: StartPage) => {
    setStartPageState(page);
  };

  return (
    <StartPageContext.Provider value={{ startPage, setStartPage }}>
      {children}
    </StartPageContext.Provider>
  );
}

export function useStartPage() {
  const context = useContext(StartPageContext);
  if (!context) {
    throw new Error("useStartPage must be used within StartPageProvider");
  }
  return context;
}
