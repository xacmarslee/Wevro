import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";
import { setAnalyticsUserProperties } from "@/lib/analytics";
import { useEffect } from "react";

interface TokenDisplayProps {
  variant?: "header" | "full";
  className?: string;
}

export default function TokenDisplay({ variant = "header", className = "" }: TokenDisplayProps) {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  // 獲取用戶點數
  const { data: quota, isLoading, error } = useQuery({
    queryKey: ["/api/quota"],
    queryFn: async () => {
      console.log('[TokenDisplay] Fetching quota, isAuthenticated:', isAuthenticated);
      const response = await fetchWithAuth("/api/quota");

      console.log('[TokenDisplay] Quota response:', { status: response.status, ok: response.ok });

      if (response.status === 401) {
        console.warn("[TokenDisplay] Unauthorized while fetching quota");
        return null;
      }

      await throwIfResNotOk(response);
      const data = await response.json();
      console.log('[TokenDisplay] Quota data:', data);
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // 每 30 秒更新一次
  });

  console.log('[TokenDisplay] State:', { isAuthenticated, isLoading, hasQuota: !!quota, error });

  // Update Analytics user properties when quota is loaded
  // ⚠️ 必須在所有條件性 return 之前調用，遵守 React Hooks 規則
  useEffect(() => {
    if (quota) {
      setAnalyticsUserProperties({
        plan: quota.plan || 'free',
        language: language,
      });
    }
  }, [quota, language]);

  if (!isAuthenticated) {
    console.log('[TokenDisplay] Not authenticated, hiding');
    return null;
  }

  // 載入中時顯示載入狀態（避免閃爍）
  if (isLoading) {
    console.log('[TokenDisplay] Loading...');
    return variant === "header" ? (
      <div className="w-16 h-8 bg-muted/50 animate-pulse rounded" />
    ) : null;
  }

  if (!quota) {
    console.log('[TokenDisplay] No quota data, error:', error);
    return null;
  }

  const tokenBalance = Number(quota.tokenBalance ?? 0);
  const locale = language === "en" ? "en-US" : "zh-TW";
  
  // Header 顯示：最多三位數，超過顯示 999+
  const getHeaderDisplay = (balance: number): string => {
    if (balance >= 1000) {
      return "999+";
    }
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(balance) ? 0 : 1,
      maximumFractionDigits: 2,
    });
    return formatter.format(balance);
  };
  
  // 完整顯示：帶千位逗號
  const getFullDisplay = (balance: number): string => {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(balance) ? 0 : 1,
      maximumFractionDigits: 2,
    });
    return formatter.format(balance);
  };
  
  const headerDisplay = getHeaderDisplay(tokenBalance);
  const fullDisplay = getFullDisplay(tokenBalance);

  if (variant === "header") {
    // Header 右上角顯示（icon + 數字，最多三位數）
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/pricing")}
        className={`gap-2 hover:bg-muted ${className}`}
      >
        <Coins className="h-4 w-4 text-yellow-600" />
        <span className="font-medium text-yellow-600">
          {headerDisplay}
        </span>
      </Button>
    );
  }

  // 設定頁面完整顯示
  return (
    <button
      onClick={() => setLocation("/pricing")}
      className={`flex items-center justify-between gap-4 w-full p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors text-left ${className}`}
      data-testid="button-tokens"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Coins className="h-4 w-4 text-yellow-600" />
        </div>
        <div>
          <div className="font-medium">
            {language === "en" ? "My Tokens" : "我的點數"}
          </div>
          <div className="text-xs text-muted-foreground">
            {language === "en"
              ? `${fullDisplay} tokens remaining`
              : `剩餘 ${fullDisplay} 點`}
          </div>
        </div>
      </div>
      <div className="text-sm text-primary font-medium">
        {language === "en" ? "Get more >" : "充值 >"}
      </div>
    </button>
  );
}

