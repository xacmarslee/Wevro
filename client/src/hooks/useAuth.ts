// useAuth hook for Firebase Auth

import { useState, useEffect } from "react";
import { onAuthChange, type FirebaseUser } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { fetchWithAuth, throwIfResNotOk } from "@/lib/queryClient";

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
        localStorage.removeItem("firebaseToken");
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.setQueryData(["/api/quota"], null);
        setAuthReady(true);
        setIsLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken(true);
        localStorage.setItem("firebaseToken", idToken);
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
      return await response.json();
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
