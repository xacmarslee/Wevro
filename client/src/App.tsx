import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { StartPageProvider, useStartPage } from "@/contexts/StartPageContext";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import Query from "@/pages/Query";
import Flashcards from "@/pages/Flashcards";
import FlashcardPractice from "@/pages/FlashcardPractice";
import MindMaps from "@/pages/MindMaps";
import MindMapEditor from "@/pages/MindMapEditor";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import Account from "@/pages/Account";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import NotFound from "@/pages/not-found";

function StartPageRedirect() {
  const { startPage } = useStartPage();
  return <Redirect to={`/${startPage}`} />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Public routes accessible without authentication
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      
      {/* Protected routes */}
      <Route>
        {() => {
          // Show landing page while loading or not authenticated
          if (isLoading || !isAuthenticated) {
            return <Landing />;
          }
          
          // Authenticated routes with footer navigation
          return <AuthenticatedRoutes />;
        }}
      </Route>
    </Switch>
  );
}

function AuthenticatedRoutes() {
  return (

  <div className="flex flex-col min-h-screen max-h-screen overflow-hidden">
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <Switch>
        <Route path="/landing" component={Landing} />
        <Route path="/query" component={Query} />
        <Route path="/flashcards/:id" component={FlashcardPractice} />
        <Route path="/flashcards" component={Flashcards} />
        <Route path="/mindmaps" component={MindMaps} />
        <Route path="/mindmap/new" component={MindMapEditor} />
        <Route path="/mindmap/:id" component={MindMapEditor} />
        <Route path="/settings" component={Settings} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/account" component={Account} />
        <Route path="/" component={StartPageRedirect} />
        <Route component={NotFound} />
      </Switch>
    </div>
    <div className="sticky inset-x-0 bottom-0 z-50">
      <Footer />
    </div>
  </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <StartPageProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </StartPageProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
