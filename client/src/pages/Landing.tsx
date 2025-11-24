import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { Brain, Layers, Search, Mail, Sparkles } from "lucide-react";
import { signInWithEmail, registerWithEmail, sendPasswordReset } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { trackSignUp, trackLogin } from "@/lib/analytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Landing() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 忘記密碼相關狀態
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  
  // 錯誤處理對話框狀態
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogData, setErrorDialogData] = useState<{
    title: string;
    message: string;
    showRetry: boolean;
    showRegister: boolean;
    showForgotPassword: boolean;
    showSignIn?: boolean;
  } | null>(null);


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isRegistering) {
        await registerWithEmail(email, password);
        trackSignUp('email');
        // 註冊成功後才跳轉到 app
        setLocation("/");
      } else {
        await signInWithEmail(email, password);
        trackLogin('email');
        // 登入成功後才跳轉到 app
        setLocation("/");
      }
    } catch (error: any) {
      let message = error.message;
      let shouldSwitchToRegister = false;
      let isPasswordError = false;
      
      // Firebase 現在使用 auth/invalid-credential 來代替 auth/user-not-found 和 auth/wrong-password
      // 為了安全，Firebase 不讓我們直接區分 email 未註冊和密碼錯誤
      // 我們直接提示用戶可能是未註冊，並提供註冊選項
      if (error.code === 'auth/invalid-credential' && !isRegistering) {
        // 登入失敗：不區分是 email 未註冊還是密碼錯誤，直接提示註冊
        message = language === "en" 
          ? "Email or password incorrect. If you don't have an account yet, please click 'Create Account'."
          : "Email 或密碼錯誤。如果你還沒有帳號，請按「建立帳號」。";
        shouldSwitchToRegister = true;
      } else if (error.code === 'auth/email-already-in-use' && isRegistering) {
        // 註冊失敗：email 已存在，提示改用登入
        message = language === "en" 
          ? "This email is already registered. Please sign in instead."
          : "此 Email 已經註冊，請改用登入。";
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
      
      // 根據錯誤類型顯示不同的對話框
      if (error.code === 'auth/invalid-credential' && !isRegistering) {
        // 登入失敗：顯示對話框，提供「重試」「註冊帳號」「忘記密碼」選項
        setErrorDialogData({
          title: language === "en" ? "Sign in failed" : "登入失敗",
          message: language === "en" 
            ? "Email or password incorrect. Please try again, or register an account."
            : "Email 或密碼錯誤。請重新輸入，或註冊帳號。",
          showRetry: true,
          showRegister: true,
          showForgotPassword: true,
        });
        setShowErrorDialog(true);
      } else if (error.code === 'auth/email-already-in-use' && isRegistering) {
        // 註冊失敗：email 已存在，提供「登入」「忘記密碼」選項
        setErrorDialogData({
          title: language === "en" ? "Email already registered" : "Email 已註冊",
          message: language === "en" 
            ? "This email is already registered. Please sign in or use forgot password."
            : "此 email 已被註冊，請直接登入或使用忘記密碼。",
          showRetry: false,
          showRegister: false,
          showForgotPassword: true,
          showSignIn: true,
        });
        setShowErrorDialog(true);
        setIsRegistering(false);
      } else {
        // 其他錯誤：使用 toast 顯示
        if (shouldSwitchToRegister && !isPasswordError) {
          setIsRegistering(true);
        }
        toast({
          title: language === "en" 
            ? (isPasswordError ? "Incorrect password" : error.code === 'auth/email-already-in-use' ? "Email already registered" : "Error")
            : (isPasswordError ? "密碼錯誤" : error.code === 'auth/email-already-in-use' ? "Email 已註冊" : "錯誤"),
          description: message,
          variant: "destructive",
        });
      }
      // 注意：因為我們在 catch 塊中，所以不會執行 setLocation("/")
      // 這確保了如果登入/註冊失敗，用戶不會進入 app
    } finally {
      setLoading(false);
    }
  };

  // 處理忘記密碼
  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" ? "Please enter your email address" : "請輸入您的 email 地址",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingResetEmail(true);
      await sendPasswordReset(forgotPasswordEmail);
      toast({
        title: language === "en" ? "Email sent" : "已發送",
        description: language === "en" 
          ? "If this email has an account, we have sent a password reset email."
          : "若此 email 有帳號，我們已寄出重設密碼信件。",
        duration: 5000,
      });
      setShowForgotPasswordDialog(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" 
          ? "Failed to send password reset email. Please try again."
          : "發送重設密碼信件失敗，請重試。",
        variant: "destructive",
      });
    } finally {
      setSendingResetEmail(false);
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
              
              {/* Register Prompt */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {language === "en" 
                    ? "Don't have an account? " 
                    : "還沒有帳號？"}
                  <button
                    onClick={() => {
                      setShowEmailForm(true);
                      setIsRegistering(true);
                    }}
                    className="text-primary hover:text-primary/80 underline font-medium"
                  >
                    {language === "en" ? "Register" : "點擊註冊"}
                  </button>
                </p>
              </div>
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
                
                {!isRegistering && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordEmail(email);
                        setShowForgotPasswordDialog(true);
                      }}
                      disabled={loading}
                      className="text-xs text-muted-foreground hover:text-primary p-0 h-auto underline-offset-4 hover:underline"
                    >
                      {language === "en" ? "Forgot password?" : "忘記密碼？"}
                    </button>
                  </div>
                )}
                
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

      {/* 忘記密碼對話框 */}
      <AlertDialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "en" ? "Forgot Password" : "忘記密碼"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en" 
                ? "Enter your email address and we'll send you a password reset link."
                : "輸入您的 email 地址，我們將寄送重設密碼連結給您。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder={language === "en" ? "your@email.com" : "你的@email.com"}
              disabled={sendingResetEmail}
            />
            <p className="text-sm text-muted-foreground">
              {language === "en" 
                ? "If this email has an account, we have sent a password reset email."
                : "若此 email 有帳號，我們已寄出重設密碼信件。"}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingResetEmail}>
              {language === "en" ? "Cancel" : "取消"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForgotPassword}
              disabled={sendingResetEmail || !forgotPasswordEmail}
            >
              {sendingResetEmail 
                ? (language === "en" ? "Sending..." : "發送中...")
                : (language === "en" ? "Send" : "發送")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 錯誤處理對話框 */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {errorDialogData?.title || (language === "en" ? "Error" : "錯誤")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialogData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {errorDialogData?.showRetry && (
              <AlertDialogCancel onClick={() => setShowErrorDialog(false)}>
                {language === "en" ? "Retry" : "重試"}
              </AlertDialogCancel>
            )}
            {errorDialogData?.showSignIn && (
              <AlertDialogAction
                onClick={() => {
                  setIsRegistering(false);
                  setShowErrorDialog(false);
                }}
              >
                {language === "en" ? "Sign In" : "登入"}
              </AlertDialogAction>
            )}
            {errorDialogData?.showRegister && (
              <AlertDialogAction
                onClick={() => {
                  setIsRegistering(true);
                  setShowErrorDialog(false);
                }}
              >
                {language === "en" ? "Register Account" : "註冊帳號"}
              </AlertDialogAction>
            )}
            {errorDialogData?.showForgotPassword && (
              <AlertDialogAction
                onClick={() => {
                  setForgotPasswordEmail(email);
                  setShowForgotPasswordDialog(true);
                  setShowErrorDialog(false);
                }}
              >
                {language === "en" ? "Forgot Password" : "忘記密碼"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
