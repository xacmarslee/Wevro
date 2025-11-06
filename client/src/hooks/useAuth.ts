// useAuth hook for Firebase Auth

import { useState, useEffect } from "react";
import { onAuthChange, type FirebaseUser } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
      
      // If user is authenticated, sync with backend
      if (user) {
        try {
          // Force refresh token to ensure it's valid
          const idToken = await user.getIdToken(true);
          // Store token in localStorage for API requests
          localStorage.setItem('firebaseToken', idToken);
          // Invalidate user query to refetch from backend
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
        } catch (error) {
          console.error('❌ Auth error:', error);
        }
      } else {
        localStorage.removeItem('firebaseToken');
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.setQueryData(["/api/quota"], null);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Fetch user data from backend (includes database info)
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem('firebaseToken');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/auth/user", {
        credentials: "include",
        headers,
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      return await response.json();
    },
    enabled: !!firebaseUser,
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
    isAuthenticated: !!firebaseUser,
  };
}
