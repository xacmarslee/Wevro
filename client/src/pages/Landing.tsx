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
