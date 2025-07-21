"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  HomeIcon,
  DocumentPlusIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  SparklesIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useSidebar } from "../store/useSidebar";
import { useAuth } from "../store/useAuth";

const links = [
  { href: "/dashboard", icon: HomeIcon, label: "Dashboard", description: "Overview & insights" },
  { href: "/docs", icon: DocumentPlusIcon, label: "Documents", description: "Manage files" },
  { href: "/connections", icon: LinkIcon, label: "Connections", description: "Data sources" },
  { href: "/chat", icon: ChatBubbleLeftRightIcon, label: "Chat", description: "AI conversations" },
  { href: "/analytics", icon: ChartBarIcon, label: "Analytics", description: "Performance data" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useSidebar();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="bg-black/50 fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => useSidebar.getState().setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-all duration-300 ease-in-out lg:static lg:inset-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "linear-gradient(180deg, #0f4c81 0%, #1e40af 50%, #0f4c81 100%)"
        }}
      >
        {/* Header Section */}
        <div className="relative">
          {/* Decorative background elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/5 rounded-full"></div>
          <div className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-full"></div>
          
          <div className="relative z-10 p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">INQUIRE AI</h1>
                <p className="text-white/60 text-sm">Knowledge Assistant</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <UserCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-white/60 text-xs truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {links.map(({ href, icon: Icon, label, description }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/10",
                  isActive && "bg-white/15 shadow-lg"
                )}
                onClick={() => useSidebar.getState().setSidebarOpen(false)}
              >
                {/* Active indicator */}
                {isActive && (
                  <div 
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 rounded-r-full"
                    style={{ background: "#ffb703" }}
                  />
                )}
                
                {/* Icon */}
                <div className={clsx(
                  "p-2 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-white/20 shadow-lg" 
                    : "bg-white/5 group-hover:bg-white/15"
                )}>
                  <Icon className={clsx(
                    "h-5 w-5 transition-colors duration-200",
                    isActive ? "text-white" : "text-white/80 group-hover:text-white"
                  )} />
                </div>
                
                {/* Text */}
                <div className="flex-1">
                  <p className={clsx(
                    "font-medium transition-colors duration-200",
                    isActive ? "text-white" : "text-white/90 group-hover:text-white"
                  )}>
                    {label}
                  </p>
                  <p className={clsx(
                    "text-xs transition-colors duration-200",
                    isActive ? "text-white/80" : "text-white/60 group-hover:text-white/70"
                  )}>
                    {description}
                  </p>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/settings"
            className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/15 transition-all duration-200">
              <Cog6ToothIcon className="h-5 w-5 text-white/80 group-hover:text-white transition-colors duration-200" />
            </div>
            <div>
              <p className="text-white/90 group-hover:text-white font-medium transition-colors duration-200">
                Settings
              </p>
              <p className="text-white/60 group-hover:text-white/70 text-xs transition-colors duration-200">
                Preferences
              </p>
            </div>
          </Link>
          
          {/* Version info */}
          <div className="mt-4 px-4">
            <div className="flex items-center justify-between text-white/40 text-xs">
              <span>Version 1.0.0</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative bottom elements */}
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        <div className="absolute bottom-8 left-8 w-8 h-8 bg-white/10 rounded-full"></div>
      </div>
    </>
  );
}
