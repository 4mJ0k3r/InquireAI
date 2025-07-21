"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { useEffect, useState } from "react";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const router = useRouter();
  const token = useAuth((state) => state.token);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false after component mounts to prevent hydration mismatch
    setIsLoading(false);

    if (!token) {
      router.replace("/login");
    }
  }, [token, router]);

  // Show loading state during initial render and while checking authentication
  if (isLoading || !token) {
    return (
      <div className="bg-brand-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-brand-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-brand-primary mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
