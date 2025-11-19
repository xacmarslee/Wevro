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
import { useEffect } from "react";
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
  // 初始化安全區域變量（在組件渲染時立即執行）
  useEffect(() => {
    const root = document.documentElement;
    
    // 檢查是否在Capacitor環境中
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
    
    console.log('🔍 [App] 初始化安全區域，isCapacitor:', isCapacitor);
    
    if (isCapacitor) {
      try {
        // 檢測平台
        const Capacitor = (window as any).Capacitor;
        const platform = Capacitor.getPlatform?.() || Capacitor.platform || 'web';
        
        console.log('📱 [App] 檢測到Capacitor平台:', platform);
        
        if (platform === 'android') {
          // Android: 根據設備密度設置狀態欄高度
          const density = window.devicePixelRatio || 1;
          let statusBarHeight = 24; // 默認值（mdpi）
          
          if (density >= 3.5) {
            statusBarHeight = 56; // xxxhdpi
          } else if (density >= 3) {
            statusBarHeight = 48; // xxhdpi
          } else if (density >= 2) {
            statusBarHeight = 32; // xhdpi
          } else if (density >= 1.5) {
            statusBarHeight = 28; // hdpi
          }
          
          // 設置CSS變量（不使用important，讓CSS變量自然覆蓋）
          root.style.setProperty('--safe-area-inset-top', `${statusBarHeight}px`);
          console.log(`✅ [App] Android狀態欄高度設置為: ${statusBarHeight}px (密度: ${density})`);
          
          // 驗證設置是否成功
          const verifyValue = getComputedStyle(root).getPropertyValue('--safe-area-inset-top');
          console.log(`🔍 [App] 驗證CSS變量值: ${verifyValue}`);
        } else if (platform === 'ios') {
          // iOS: 檢查env()是否可用
          const testDiv = document.createElement('div');
          testDiv.style.paddingTop = 'env(safe-area-inset-top)';
          document.body.appendChild(testDiv);
          const testValue = getComputedStyle(testDiv).paddingTop;
          document.body.removeChild(testDiv);
          
          if (testValue && testValue !== '0px' && testValue !== 'auto') {
            root.style.setProperty('--safe-area-inset-top', testValue);
            console.log('✅ [App] iOS使用安全區域:', testValue);
          } else {
            // iOS默認狀態欄高度
            root.style.setProperty('--safe-area-inset-top', '44px');
            console.log('✅ [App] iOS使用默認值: 44px');
          }
        }
      } catch (error) {
        console.warn('⚠️ [App] 初始化安全區域時出錯:', error);
        // 設置默認值作為fallback
        root.style.setProperty('--safe-area-inset-top', '24px');
      }
    } else {
      // Web瀏覽器: 檢查是否支援env()
      const supportsEnv = CSS.supports('padding-top', 'env(safe-area-inset-top)');
      console.log('🌐 [App] Web瀏覽器，支援env():', supportsEnv);
      if (!supportsEnv) {
        root.style.setProperty('--safe-area-inset-top', '0px');
      }
    }
    
    // 輸出最終的CSS變量值用於調試
    const finalValue = getComputedStyle(root).getPropertyValue('--safe-area-inset-top');
    console.log(`🎯 [App] 最終CSS變量 --safe-area-inset-top 值: ${finalValue}`);
  }, []); // 只在組件掛載時執行一次

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
