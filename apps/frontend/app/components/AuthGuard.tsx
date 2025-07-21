"use client";

import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && !isAuthenticated && !token) {
      router.push(redirectTo);
    } else if (!requireAuth && isAuthenticated && token) {
      // If user is authenticated but trying to access auth pages, redirect to dashboard
      router.push("/dashboard");
    }
  }, [isAuthenticated, token, requireAuth, redirectTo, router]);

  // Show loading or nothing while redirecting
  if (requireAuth && !isAuthenticated && !token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // For non-auth pages, don't render if user is authenticated
  if (!requireAuth && isAuthenticated && token) {
    return null;
  }

  return <>{children}</>;
}