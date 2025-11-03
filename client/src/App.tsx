import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import Query from "@/pages/Query";
import Flashcards from "@/pages/Flashcards";
import MindMaps from "@/pages/MindMaps";
import MindMapEditor from "@/pages/Home";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show landing page while loading or not authenticated
  if (isLoading || !isAuthenticated) {
    return <Landing />;
  }

  // Authenticated routes with footer navigation
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/query" component={Query} />
          <Route path="/flashcards" component={Flashcards} />
          <Route path="/mindmaps" component={MindMaps} />
          <Route path="/mindmap/new" component={MindMapEditor} />
          <Route path="/mindmap/:id" component={MindMapEditor} />
          <Route path="/settings" component={Settings} />
          <Route path="/" component={MindMaps} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
