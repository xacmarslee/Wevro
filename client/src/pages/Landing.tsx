import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { Brain, Layers, Search, Mail, Sparkles } from "lucide-react";
import { signInWithGoogle, signInWithEmail, registerWithEmail, handleOAuthRedirect } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { trackSignUp, trackLogin } from "@/lib/analytics";

// 檢查是否在 Capacitor 環境中
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  return (window as any).Capacitor !== undefined || window.location.protocol === 'capacitor:';
};

export default function Landing() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle OAuth redirect result on mount and app resume (for mobile apps)
  useEffect(() => {
    let hasCheckedRedirect = false; // 防止重複調用 getRedirectResult
    
    const checkOAuthRedirect = async () => {
      // getRedirectResult 只能被調用一次，之後會返回 null
      // 如果已經檢查過，就不再檢查
      if (hasCheckedRedirect) {
        console.log('⚠️ 已經檢查過 OAuth redirect，跳過重複檢查');
        return;
      }
      
      try {
        const user = await handleOAuthRedirect();
        hasCheckedRedirect = true; // 標記已檢查
        
        if (user) {
          console.log('✅ OAuth redirect 成功，用戶已登入');
          // 清除超時（如果存在）
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          setLoading(false); // 清除 loading 狀態
          trackLogin('google');
          setLocation("/");
        }
      } catch (error: any) {
        console.error('OAuth redirect error:', error);
        hasCheckedRedirect = true; // 即使出錯也標記為已檢查
        // 清除超時（如果存在）
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false); // 清除 loading 狀態
        // Only show error if it's not a cancelled redirect
        if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/redirect-cancelled-by-user') {
          toast({
            title: language === "en" ? "Error" : "錯誤",
            description: error.message || (language === "en" ? "Failed to sign in" : "登入失敗"),
            variant: "destructive",
          });
        }
      }
    };

    // 立即檢查一次（用於 app 啟動時或通過深度連結打開時）
    checkOAuthRedirect();

    // 在移動端，監聽 app resume 事件（用戶從瀏覽器切換回 app 時）
    if (isCapacitor()) {
      // 使用 window focus 事件來檢測 app 恢復到前台
      // 這在移動端 WebView 中也能正常工作
      const handleFocus = async () => {
        console.log('📱 App 恢復到前台，檢查 OAuth redirect...');
        // 只有在還沒檢查過時才檢查
        if (!hasCheckedRedirect) {
          await checkOAuthRedirect();
        }
      };

      // 監聽 window focus 事件
      window.addEventListener('focus', handleFocus);
      
      // 也監聽 visibility change 事件作為備用
      const handleVisibilityChange = async () => {
        if (!document.hidden && !hasCheckedRedirect) {
          console.log('📱 App 可見性改變，檢查 OAuth redirect...');
          await checkOAuthRedirect();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [setLocation, toast, language]);

  // 組件卸載時清除超時
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();
      
      // 在移動端，signInWithGoogle 會返回 null（因為使用 redirect）
      // 在桌面端，會返回 user 對象
      if (user) {
        // 桌面端：立即登入成功
        trackLogin('google');
        setLocation("/");
        setLoading(false);
      } else {
        // 移動端：使用 redirect，會在 app resume 時通過 handleOAuthRedirect 處理
        // 設置超時機制：如果 60 秒內沒有完成認證，清除 loading 狀態
        // 這可以防止用戶關閉瀏覽器後 loading 一直顯示
        
        // 清除之前的超時（如果存在）
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        
        loadingTimeoutRef.current = setTimeout(() => {
          console.log('⚠️ Google 登入超時，清除 loading 狀態');
          setLoading(false);
          loadingTimeoutRef.current = null;
        }, 60000); // 60 秒超時
        
        console.log('📱 移動端：已啟動 Google 登入重定向，等待回調...');
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setLoading(false);
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: error.message || (language === "en" ? "Failed to sign in" : "登入失敗"),
        variant: "destructive",
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isRegistering) {
        await registerWithEmail(email, password);
        trackSignUp('email');
      } else {
        await signInWithEmail(email, password);
        trackLogin('email');
      }
      setLocation("/");
    } catch (error: any) {
      let message = error.message;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = language === "en" ? "Invalid email or password" : "電子郵件或密碼錯誤";
      } else if (error.code === 'auth/email-already-in-use') {
        message = language === "en" ? "Email already in use" : "電子郵件已被使用";
      } else if (error.code === 'auth/weak-password') {
        message = language === "en" ? "Password should be at least 6 characters" : "密碼至少需要 6 個字元";
      }
      
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 sm:p-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <div className="w-32 h-32 flex items-center justify-center relative z-10">
              <img src="/logo.png" alt="Wevro Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
        
        {/* Brand Name */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight flex items-baseline justify-center">
            <span style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>W</span>
            <span style={{ fontFamily: 'Poiret One, cursive', fontWeight: 900, textShadow: '0 0 0.5px currentColor, 0 0 0.5px currentColor' }}>evro</span>
          </h1>
          
          <div className="flex items-center justify-center gap-2 w-full min-w-0 px-4">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse shrink-0" />
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground whitespace-nowrap truncate">
              {language === "en" 
                ? "AI-Powered Vocabulary Learning"
                : "AI 驅動的英文單字學習"}
            </p>
          </div>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-3 gap-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {language === "en" ? "Query" : "查詢"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Layers className="h-7 w-7 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {language === "en" ? "Flashcards" : "字卡"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {language === "en" ? "Mind Maps" : "心智圖"}
            </span>
          </div>
        </div>
        
        {/* Auth Section */}
        <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          {!showEmailForm ? (
            <div className="space-y-5">
              <p className="text-sm font-medium text-muted-foreground">
                {language === "en" 
                  ? "Sign in or create an account to continue"
                  : "登入或註冊以繼續使用"}
              </p>
              
              {/* Google Sign In */}
              <Button 
                size="lg" 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 text-base font-medium hover-elevate"
                variant="default"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {language === "en" ? "Continue with Google" : "使用 Google 繼續"}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {language === "en" ? "Or" : "或"}
                  </span>
                </div>
              </div>
              
              {/* Email Sign In */}
              <Button 
                size="lg" 
                onClick={() => setShowEmailForm(true)}
                disabled={loading}
                className="w-full h-12 text-base font-medium"
                variant="outline"
              >
                <Mail className="w-5 h-5 mr-3" />
                {language === "en" ? "Continue with Email" : "使用 Email 繼續"}
              </Button>
            </div>
          ) : (
            <div>
              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-5 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    {language === "en" ? "Email" : "電子郵件"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === "en" ? "your@email.com" : "你的@email.com"}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {language === "en" ? "Password" : "密碼"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === "en" ? "At least 6 characters" : "至少 6 個字元"}
                    required
                    minLength={6}
                    className="h-11"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={loading}
                  className="w-full h-12 text-base font-medium hover-elevate"
                >
                  {loading ? (language === "en" ? "Loading..." : "載入中...") : 
                    (isRegistering ? 
                      (language === "en" ? "Register" : "註冊") : 
                      (language === "en" ? "Sign In" : "登入")
                    )
                  }
                </Button>
                
                <div className="text-center space-y-1 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRegistering(!isRegistering)}
                    disabled={loading}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    {isRegistering ?
                      (language === "en" ? "Already have an account? Sign in" : "已有帳號？登入") :
                      (language === "en" ? "Don't have an account? Register" : "沒有帳號？註冊")
                    }
                  </Button>
                  
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEmailForm(false)}
                      disabled={loading}
                      className="text-sm"
                    >
                      ← {language === "en" ? "Back" : "返回"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Legal Links */}
          <div className="pt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground animate-in fade-in duration-700 delay-500">
            <button
              onClick={() => setLocation("/privacy-policy")}
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {language === "en" ? "Privacy Policy" : "隱私政策"}
            </button>
            <span>•</span>
            <button
              onClick={() => setLocation("/terms-of-service")}
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {language === "en" ? "Terms of Service" : "使用條款"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
