import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { Brain, Layers, Search, Mail, Sparkles } from "lucide-react";
import { signInWithEmail, registerWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { trackSignUp, trackLogin } from "@/lib/analytics";

export default function Landing() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


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
      let shouldSwitchToRegister = false;
      let isPasswordError = false;
      
      // Firebase 現在使用 auth/invalid-credential 來代替 auth/user-not-found 和 auth/wrong-password
      // 為了安全，Firebase 不讓我們直接區分 email 未註冊和密碼錯誤
      // 我們可以通過嘗試註冊來間接判斷 email 是否存在
      if (error.code === 'auth/invalid-credential' && !isRegistering) {
        // 嘗試用相同的 email 和一個臨時密碼註冊來判斷 email 是否存在
        // 如果 email 已存在，會返回 auth/email-already-in-use（說明是密碼錯誤）
        // 如果 email 不存在，註冊會成功，我們會立即刪除測試帳號
        try {
          // 使用一個臨時密碼嘗試註冊（至少 6 個字元）
          const tempPassword = 'temp' + Date.now().toString().slice(-8);
          await registerWithEmail(email, tempPassword);
          
          // 如果註冊成功，說明 email 未註冊
          // 但我們創建了測試帳號，需要立即刪除它
          try {
            // 通過 API 刪除測試帳號
            const { apiRequest } = await import("@/lib/queryClient");
            await apiRequest("DELETE", "/api/auth/user");
          } catch (deleteError) {
            console.warn("Failed to delete test account:", deleteError);
            // 如果刪除失敗，登出測試帳號
            const { signOut } = await import("@/lib/firebase");
            await signOut();
          }
          
          message = language === "en" 
            ? "This email is not registered. Please register with your desired password."
            : "此 email 尚未註冊。請使用您想要的密碼進行註冊。";
          shouldSwitchToRegister = true;
          // 清除密碼欄位，讓用戶輸入自己的密碼
          setPassword("");
        } catch (checkError: any) {
          if (checkError.code === 'auth/email-already-in-use') {
            // Email 已存在，說明是密碼錯誤
            isPasswordError = true;
            message = language === "en" 
              ? "Incorrect password. Please check your password and try again."
              : "密碼錯誤。請檢查您的密碼後重試。";
          } else {
            // 其他錯誤，可能是 email 未註冊
            message = language === "en" 
              ? "Invalid email or password. This email may not be registered. Would you like to create an account?"
              : "電子郵件或密碼錯誤。此 email 可能尚未註冊。是否要建立帳號？";
            shouldSwitchToRegister = true;
          }
        }
      } else if (error.code === 'auth/email-already-in-use' && isRegistering) {
        // 註冊時遇到 email-already-in-use
        // 可能是因為之前的測試帳號還在，或者是用戶真的已經註冊過
        message = language === "en" 
          ? "This email is already registered. Please sign in instead."
          : "此 email 已經註冊。請使用登入功能。";
        shouldSwitchToRegister = false;
        setIsRegistering(false);
      } else if (error.code === 'auth/user-not-found') {
        // 保留舊的錯誤代碼支持（以防萬一）
        message = language === "en" 
          ? "This email is not registered. Would you like to create an account?"
          : "此 email 尚未註冊。是否要建立帳號？";
        shouldSwitchToRegister = true;
      } else if (error.code === 'auth/wrong-password') {
        // 保留舊的錯誤代碼支持
        message = language === "en" ? "Incorrect password" : "密碼錯誤";
        isPasswordError = true;
      } else if (error.code === 'auth/email-already-in-use') {
        message = language === "en" ? "Email already in use" : "電子郵件已被使用";
      } else if (error.code === 'auth/weak-password') {
        message = language === "en" ? "Password should be at least 6 characters" : "密碼至少需要 6 個字元";
      }
      
      // 如果是無效憑證且判斷為密碼錯誤，不切換到註冊模式
      if (shouldSwitchToRegister && !isPasswordError) {
        setIsRegistering(true);
        toast({
          title: language === "en" ? "Account not found" : "帳號不存在",
          description: message,
          duration: 5000,
        });
      } else {
        toast({
          title: language === "en" ? (isPasswordError ? "Incorrect password" : "Error") : (isPasswordError ? "密碼錯誤" : "錯誤"),
          description: message,
          variant: "destructive",
        });
      }
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
              
              {/* Email Sign In */}
              <Button 
                size="lg" 
                onClick={() => setShowEmailForm(true)}
                disabled={loading}
                className="w-full h-12 text-base font-medium hover-elevate"
                variant="default"
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
