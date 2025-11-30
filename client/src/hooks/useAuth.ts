// useAuth hook for Firebase Auth

import { useState, useEffect } from "react";
import { onAuthChange, type FirebaseUser } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";
import { setAnalyticsUserId, setAnalyticsUserProperties } from "@/lib/analytics";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const queryClient = useQueryClient();

  // Listen to Firebase auth state changes
  useEffect(() => {
    let previousUserId: string | null = null;
    
    const unsubscribe = onAuthChange(async (user) => {
      setIsLoading(true);
      setAuthReady(false);
      
      const currentUserId = user?.uid || null;
      const isUserChanged = previousUserId !== null && previousUserId !== currentUserId;
      previousUserId = currentUserId;
      
      setFirebaseUser(user);

      if (!user) {
        // 登出時清除所有緩存
        localStorage.removeItem("firebaseToken");
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.setQueryData(["/api/quota"], null);
        // 清除所有用戶相關的查詢緩存
        queryClient.removeQueries({ queryKey: ["/api/mindmaps"] });
        queryClient.removeQueries({ queryKey: ["/api/flashcards"] });
        
        // 清除 Analytics 用戶 ID
        setAnalyticsUserId(null);
        
        setAuthReady(true);
        setIsLoading(false);
        return;
      }

      try {
        // 先設置 authReady，讓查詢可以開始（使用緩存的 token）
        // 這樣可以並行執行，而不是串行等待
        const cachedToken = localStorage.getItem("firebaseToken");
        if (cachedToken) {
          // 如果有緩存的 token，先設置 authReady，讓查詢可以開始
          setAuthReady(true);
        }
        
        // 然後在背景刷新 token（不阻塞）
        const idToken = await user.getIdToken(false); // 使用 false 避免不必要的刷新
        localStorage.setItem("firebaseToken", idToken);
        
        // 只有在用戶切換時才清除緩存，避免每次登入都清除
        if (isUserChanged) {
          console.log("[useAuth] User changed, clearing cache");
          queryClient.removeQueries({ queryKey: ["/api/mindmaps"] });
          queryClient.removeQueries({ queryKey: ["/api/flashcards"] });
        } else {
          // 用戶未變更，只 invalidate（會使用緩存數據，然後在背景更新）
          console.log("[useAuth] Same user, invalidating queries (will use cache)");
          queryClient.invalidateQueries({ queryKey: ["/api/mindmaps"] });
          queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
        }
        
        // 然後重新獲取用戶資料
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
        
        // 確保 authReady 已設置
        setAuthReady(true);
      } catch (error) {
        console.error("❌ Auth error:", error);
        // 即使出錯也設置 authReady，避免永遠卡在 loading
        setAuthReady(true);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Fetch user data from backend (includes database info)
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/api/auth/user");

        if (response.status === 401 || response.status === 404) {
          console.warn("[useAuth] Unauthorized or user not found, returning null");
          return null;
        }

        await throwIfResNotOk(response);
        const userData = await response.json();
        
        // 如果是新用戶，確保 quota 已創建（觸發 quota 查詢）
        if (userData) {
          queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
          
          // 設定 Analytics 用戶 ID 和屬性
          setAnalyticsUserId(userData.id);
          // 用戶屬性會從 quota 查詢中更新（在 quota 查詢成功後）
        }
        
        return userData;
      } catch (error: any) {
        // 網絡錯誤時不阻塞啟動，返回 null
        console.error("[useAuth] Failed to fetch user data:", error);
        return null;
      }
    },
    enabled: !!firebaseUser && authReady,
    retry: false,
    // 設置較長的 staleTime，避免頻繁請求
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });

  return {
    user: firebaseUser ? (user || {
      id: firebaseUser.uid,
      email: firebaseUser.email || undefined,
      firstName: firebaseUser.displayName?.split(' ')[0],
      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' '),
      profileImageUrl: firebaseUser.photoURL,
    }) : null,
    firebaseUser,
    isLoading,
    isAuthenticated: !!firebaseUser && authReady,
    authReady,
  };
}
