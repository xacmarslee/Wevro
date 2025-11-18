/**
 * Pricing Page
 * 
 * 訂閱方案與點數頁面 - 整合訂閱制和點數制的混合方案
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Check, Sparkles, Zap, ChevronLeft, Coins, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";

export default function Pricing() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // 獲取用戶點數
  const { data: quota } = useQuery({
    queryKey: ["/api/quota"],
    queryFn: async () => {
      const response = await fetchWithAuth("/api/quota");
      if (response.status === 401) {
        return null;
      }
      await throwIfResNotOk(response);
      return await response.json();
    },
    enabled: isAuthenticated,
  });
  
  // TODO: 從後端獲取用戶訂閱狀態
  const isSubscribed = false; // 暫時為 false，待整合後端後更新
  
  // 格式化點數顯示（帶千位逗號和小數點）
  const formatTokenBalance = (balance: number): string => {
    const locale = language === "en" ? "en-US" : "zh-TW";
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(balance) ? 0 : 1,
      maximumFractionDigits: 2,
    });
    return formatter.format(balance);
  };
  
  const currentTokenBalance = quota?.tokenBalance ?? 0;

  const handleSubscribe = () => {
    // TODO: 實作 In-App Purchase
    toast({
      title: language === "en" ? "Coming Soon" : "即將推出",
      description: language === "en" 
        ? "Pro subscription will be available when the app launches."
        : "Pro 方案將在 App 上架後開放。",
    });
  };

  const handlePurchaseTokens = (amount: number) => {
    // TODO: 實作 In-App Purchase
    toast({
      title: language === "en" ? "Coming Soon" : "即將推出",
      description: language === "en" 
        ? `${amount} tokens package will be available when the app launches.`
        : `${amount} 點數包將在 App 上架後開放。`,
    });
  };

  const handleCancelSubscription = () => {
    // TODO: 實作取消訂閱 API
    toast({
      title: language === "en" ? "Subscription Cancelled" : "已取消訂閱",
      description: language === "en" 
        ? "Your subscription has been cancelled. You can still use Pro features until the end of your billing period."
        : "您的訂閱已取消。在本期結束前，您仍可使用 Pro 功能。",
    });
    setShowCancelDialog(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/settings")}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === "en" ? "Pricing & Tokens" : "訂閱方案與點數"}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8 pb-24">
        {/* 當前點數 */}
        {isAuthenticated && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coins className="h-6 w-6 text-yellow-600" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {language === "en" ? "Current Tokens" : "當前點數"}
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatTokenBalance(currentTokenBalance)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 點數說明 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            {language === "en" ? "How Tokens Work" : "點數系統說明"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === "en" 
              ? "Tokens are used for AI-powered features:"
              : "點數用於以下 AI 功能："}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">0.5 {language === "en" ? "token" : "點"}</Badge>
              <span className="text-sm">
                {language === "en"
                  ? "Mind map expansion (each successful expand, billed every two expands)"
                  : "心智圖擴展（每次成功展開扣 0.5 點，兩次扣 1 點）"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">1 {language === "en" ? "token" : "點"}</Badge>
              <span className="text-sm">{language === "en" ? "Flashcards (10 cards)" : "字卡生成（10 張）"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">2 {language === "en" ? "tokens" : "點"}</Badge>
              <span className="text-sm">{language === "en" ? "Example sentences" : "例句生成"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">2 {language === "en" ? "tokens" : "點"}</Badge>
              <span className="text-sm">{language === "en" ? "Synonym comparison" : "同義詞比較"}</span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold">
          {language === "en" ? "Subscription Plans" : "訂閱方案"}
        </h2>

        {/* 免費方案 */}
        <Card className="relative shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {language === "en" ? "Free Plan" : "免費方案"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Perfect for getting started" 
                : "適合開始使用"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              {language === "en" ? "Free" : "免費"}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Coins className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    {language === "en" ? "30 tokens on signup" : "註冊送 30 點"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === "en" ? "Get started immediately" : "立即開始使用"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">
                  {language === "en" 
                    ? "Access to all AI features" 
                    : "可使用所有 AI 功能"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">
                  {language === "en" 
                    ? "Tokens never expire" 
                    : "點數永久有效"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">
                  {language === "en" 
                    ? "No credit card required" 
                    : "無需綁定信用卡"}
                </span>
              </div>
            </div>

            <Button className="w-full" variant="outline" disabled>
              {language === "en" ? "Current Plan" : "目前方案"}
            </Button>
          </CardContent>
        </Card>

        {/* Pro 訂閱（唯一付費訂閱方案）*/}
        <Card className="relative border-2 border-primary shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
            {language === "en" ? "RECOMMENDED" : "推薦"}
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {language === "en" ? "Pro Plan" : "Pro 方案"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Unlock unlimited AI learning" 
                : "解鎖無限 AI 學習功能"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold">
                $6.99
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {language === "en" ? "/ month" : "/ 月"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "en" ? "~NT$ 210 per month" : "約 NT$ 210 / 月"}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Coins className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    {language === "en" ? "180 tokens per month" : "每月 180 點"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === "en" ? "~90 example queries or 60 synonym analyses" : "約 90 次例句查詢或 60 次同義詞分析"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-semibold">
                  {language === "en" 
                    ? "All free features included" 
                    : "包含所有免費功能"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">
                  {language === "en" 
                    ? "Additional tokens at 20% discount" 
                    : "額外購買點數享 8 折優惠"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">
                  {language === "en" 
                    ? "No ads" 
                    : "無廣告"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">
                  {language === "en" 
                    ? "Priority support" 
                    : "優先客服支援"}
                </span>
              </div>
            </div>

            {isSubscribed ? (
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  disabled
                >
                  {language === "en" ? "Current Plan" : "目前方案"}
                </Button>
                <Button 
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" 
                  onClick={() => setShowCancelDialog(true)}
                >
                  {language === "en" ? "Cancel Subscription" : "取消訂閱"}
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleSubscribe}
              >
                {language === "en" ? "Subscribe to Pro" : "訂閱 Pro"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 點數包 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            {language === "en" ? "Token Packages" : "點數包"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === "en" 
              ? "Purchase tokens once, use forever. No expiration, no subscription required." 
              : "一次購買，永久有效。不會過期，無需訂閱。"}
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {/* 小點數包 */}
            <Card className="shadow-md border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-slate-500" />
                  S
                </CardTitle>
                <CardDescription className="text-2xl font-bold text-foreground">
                  40 {language === "en" ? "tokens" : "點"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">$3.99</div>
                <div className="text-xs text-muted-foreground">
                  {language === "en" ? "~NT$ 120" : "約 NT$ 120"}
                </div>
                <Button 
                  className="w-full bg-slate-500 hover:bg-slate-600 text-white border-slate-500 hover:border-slate-600"
                  onClick={() => handlePurchaseTokens(40)}
                >
                  {language === "en" ? "Buy Now" : "購買"}
                </Button>
              </CardContent>
            </Card>

            {/* 中點數包 */}
            <Card className="border-primary shadow-lg border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  M
                </CardTitle>
                <CardDescription className="text-2xl font-bold text-foreground">
                  120 {language === "en" ? "tokens" : "點"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">$9.99</div>
                <div className="text-xs text-muted-foreground">
                  {language === "en" ? "~NT$ 300" : "約 NT$ 300"}
                </div>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 border-primary"
                  onClick={() => handlePurchaseTokens(120)}
                >
                  {language === "en" ? "Buy Now" : "購買"}
                </Button>
              </CardContent>
            </Card>

            {/* 大點數包 */}
            <Card className="border-amber-500 shadow-md border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-600" />
                  L
                </CardTitle>
                <CardDescription className="text-2xl font-bold text-foreground">
                  300 {language === "en" ? "tokens" : "點"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">$24.99</div>
                <div className="text-xs text-muted-foreground">
                  {language === "en" ? "~NT$ 750" : "約 NT$ 750"}
                </div>
                <Button 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600"
                  onClick={() => handlePurchaseTokens(300)}
                >
                  {language === "en" ? "Buy Now" : "購買"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 方案比較 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            {language === "en" ? "Which plan is right for you?" : "如何選擇方案？"}
          </h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">{language === "en" ? "Free Plan" : "免費方案"}</div>
              <div className="text-muted-foreground">
                {language === "en" 
                  ? "Start with 30 tokens. Perfect for trying out features."
                  : "30 點註冊禮，適合探索功能。"}
              </div>
            </div>
            
            <div>
              <div className="font-semibold">{language === "en" ? "Pro Plan" : "Pro 方案"}</div>
              <div className="text-muted-foreground">
                {language === "en" 
                  ? "180 tokens/month = ~3 queries per day. Only $6.99, best value!"
                  : "每月 180 點 = 每天約 3 次查詢，只要 $6.99，超值！"}
              </div>
            </div>
            
            <div>
              <div className="font-semibold">{language === "en" ? "Token Packages" : "點數包"}</div>
              <div className="text-muted-foreground">
                {language === "en" 
                  ? "Buy once, use forever. Great for occasional users or to supplement your subscription."
                  : "一次購買永久有效，適合偶爾使用或補充訂閱額度。"}
              </div>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            {language === "en" 
              ? "• Subscriptions and token packages will be available when the app launches on App Store and Google Play."
              : "• 訂閱與點數包將在 App 上架至 App Store 和 Google Play 後開放。"}
          </p>
          <p>
            {language === "en" 
              ? "• Unused tokens never expire and can be used at any time."
              : "• 未使用的點數永不過期，可隨時使用。"}
          </p>
          <p>
            {language === "en" 
              ? "• You can cancel your subscription at any time. Remaining tokens will stay in your account."
              : "• 您可以隨時取消訂閱，剩餘點數仍保留在帳戶中。"}
          </p>
          <p>
            {language === "en" 
              ? "• All payments are processed securely through Apple and Google's payment systems."
              : "• 所有付款都透過 Apple 和 Google 的安全支付系統處理。"}
          </p>
        </div>
      </div>

      {/* 取消訂閱確認對話框 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "en" ? "Cancel Subscription?" : "取消訂閱？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en" 
                ? "Are you sure you want to cancel your Pro subscription? You will still have access to Pro features until the end of your current billing period. Your remaining tokens will not be affected."
                : "確定要取消 Pro 訂閱嗎？在本期帳單結束前，您仍可使用 Pro 功能。剩餘點數不受影響。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "en" ? "Keep Subscription" : "保留訂閱"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === "en" ? "Cancel Subscription" : "確認取消"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
