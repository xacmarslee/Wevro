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
    const unsubscribe = onAuthChange(async (user) => {
      setIsLoading(true);
      setAuthReady(false);
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
        const idToken = await user.getIdToken(true);
        localStorage.setItem("firebaseToken", idToken);
        
        // 登入時清除舊用戶的緩存，確保新用戶看到正確的資料
        queryClient.removeQueries({ queryKey: ["/api/mindmaps"] });
        queryClient.removeQueries({ queryKey: ["/api/flashcards"] });
        
        // 然後重新獲取用戶資料
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
      } catch (error) {
        console.error("❌ Auth error:", error);
      } finally {
        setAuthReady(true);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Fetch user data from backend (includes database info)
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
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
    },
    enabled: !!firebaseUser && authReady,
    retry: false,
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
