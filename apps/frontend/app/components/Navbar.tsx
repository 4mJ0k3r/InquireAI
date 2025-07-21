"use client";

import { useRouter } from "next/navigation";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../store/useAuth";
import { useSidebar } from "../store/useSidebar";

// Simple JWT parser for demo purposes
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export default function Navbar() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const { toggleSidebar } = useSidebar();

  // Extract email from token
  const userEmail = token ? parseJwt(token)?.email || "User" : "User";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="flex h-14 items-center justify-between border-b border-gray-200 bg-white/60 px-4 backdrop-blur">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-2 hover:bg-gray-100 lg:hidden"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Brand logo on larger screens */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UserCircleIcon className="h-5 w-5" />
          <span className="hidden sm:inline">{userEmail}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
