"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { refreshToken as refreshTokenAPI, getCurrentUser } from "@/services/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, refreshToken, logout, setUser, login } = useAuth();
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Function to refresh the token
  const handleTokenRefresh = async () => {
    if (!refreshToken) {
      logout();
      router.push("/login");
      return;
    }

    try {
      const response = await refreshTokenAPI(refreshToken);
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      login(newToken, newRefreshToken, user);
      scheduleTokenRefresh(newToken);
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      router.push("/login");
      toast.error("Session expired. Please login again.");
    }
  };

  // Schedule token refresh before expiration
  const scheduleTokenRefresh = (token: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    try {
      // Decode JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Refresh 5 minutes before expiration
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000);
      
      refreshTimeoutRef.current = setTimeout(handleTokenRefresh, refreshTime);
    } catch (error) {
      console.error("Error scheduling token refresh:", error);
      // Fallback: refresh every 20 minutes
      refreshTimeoutRef.current = setTimeout(handleTokenRefresh, 20 * 60 * 1000);
    }
  };

  // Initialize user data and token refresh on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Get current user data
          const response = await getCurrentUser();
          setUser(response.data.user);
          
          // Schedule token refresh
          scheduleTokenRefresh(token);
        } catch (error) {
          console.error("Failed to get current user:", error);
          // Token might be invalid, try to refresh
          if (refreshToken) {
            await handleTokenRefresh();
          } else {
            logout();
            router.push("/login");
          }
        }
      }
    };

    initializeAuth();

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token, refreshToken]);

  return <>{children}</>;
}