import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail, X, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

export function EmailVerificationBanner() {
  const { language } = useLanguage();
  const { user, isAuthenticated, firebaseUser } = useAuth();
  const { toast } = useToast();
  
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // 獲取 Quota 資訊，包含驗證和獎勵狀態
  const { data: quota } = useQuery({
    queryKey: ["/api/quota"],
    enabled: isAuthenticated,
  });

  // 自動檢查驗證狀態
  const checkVerificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/check-verification-reward");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.rewardClaimed) {
        toast({
          title: language === "en" ? "Reward Claimed!" : "獎勵已領取！",
          description: language === "en" 
            ? `You've received 20 free tokens! Current balance: ${data.tokenBalance}` 
            : `您已獲得 20 免費點數！目前餘額：${data.tokenBalance}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
        setShowVerificationBanner(false);
      }
    },
    onError: (error) => {
      console.error("Failed to check verification reward:", error);
    }
  });

  // 根據 Quota 狀態決定是否顯示 Banner
  useEffect(() => {
    if (!quota || !isAuthenticated) {
      setShowVerificationBanner(false);
      return;
    }

    // 只有當「未驗證」或「已驗證但未領取獎勵」時才顯示
    // 但如果用戶手動關閉了，這一次 session 就不再顯示 (這部分邏輯可根據需求調整)
    const shouldShow = !quota.isEmailVerified || (!quota.rewardClaimed && quota.isEmailVerified);
    
    if (shouldShow) {
      setShowVerificationBanner(true);
      
      // 如果已經驗證但還沒領獎，自動嘗試領取
      if (quota.isEmailVerified && !quota.rewardClaimed) {
        checkVerificationMutation.mutate();
      }
    } else {
      setShowVerificationBanner(false);
    }
  }, [quota, isAuthenticated]);

  // 倒數計時效果
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const handleSendVerificationEmail = async () => {
    if (!firebaseUser) return;
    
    try {
      const { sendEmailVerificationToUser } = await import("@/lib/firebase");
      await sendEmailVerificationToUser(firebaseUser);
      setResendCooldown(60); // 60秒冷卻
      toast({
        title: language === "en" ? "Email sent" : "郵件已發送",
        description: language === "en" 
          ? "Please check your inbox (and spam folder)." 
          : "請檢查您的信箱（包含垃圾郵件夾）。",
      });
    } catch (error: any) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!showVerificationBanner) return null;

  return (
    <div className="px-4 pt-4 md:px-6 md:pt-6">
      <Card className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-500">
        <CardContent className="pt-4 flex items-start gap-3">
          <Gift className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              {language === "en" ? "🎁 Verify your Email to get 20 FREE Tokens!" : "🎁 驗證 Email 即可獲得 20 免費點數！"}
            </p>
            <p className="text-sm mt-1">
              {language === "en" ? "Unlock full features and prevent account loss. Check your inbox (including spam)." : "解鎖完整功能並避免帳號丟失。請檢查您的信箱（包含垃圾郵件夾）。"}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSendVerificationEmail}
                disabled={resendCooldown > 0}
                className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {resendCooldown > 0 ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    {language === "en" ? `Wait ${resendCooldown}s` : `等待 ${resendCooldown}秒`}
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3 mr-1" />
                    {language === "en" ? "Send Verification Email" : "發送驗證信"}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowVerificationBanner(false)}
                className="text-xs text-yellow-700 dark:text-yellow-500 hover:bg-yellow-500/20"
              >
                <X className="h-3 w-3 mr-1" />
                {language === "en" ? "Dismiss" : "關閉"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

