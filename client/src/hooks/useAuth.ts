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
          const idToken = await user.getIdToken();
          // Store token in localStorage for API requests
          localStorage.setItem('firebaseToken', idToken);
          // Invalidate user query to refetch from backend
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } catch (error) {
          console.error('Error getting ID token:', error);
        }
      } else {
        localStorage.removeItem('firebaseToken');
        queryClient.setQueryData(["/api/auth/user"], null);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Fetch user data from backend (includes database info)
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
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
