"use client";

import { useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Settings,
  ChevronLeft,
  Wrench,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const mainNav: NavItem[] = [
  { label: "总览", href: "/dashboard", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { label: "机器人", href: "/bots", icon: <Bot className="h-3.5 w-3.5" /> },
  { label: "设置", href: "/settings", icon: <Settings className="h-3.5 w-3.5" /> },
];

export function Sidebar({ children }: { children: ReactNode }) {
  const [systemToolsOpen, setSystemToolsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/bots" && pathname.startsWith("/bots")) return true;
    return pathname === href;
  };

  const navLink = (item: NavItem, isSubItem = false) => (
    <a
      key={item.href}
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-150 group/nav",
        isActive(item.href)
          ? "bg-white/10 font-medium text-white"
          : "text-slate-400 hover:bg-white/6 hover:text-slate-200"
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md group-hover/nav:text-slate-300">
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {isActive(item.href) && (
        <span className="absolute right-2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-blue-400 top-1/2" />
      )}
    </a>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-52 shrink-0 flex flex-col h-full transition-transform duration-200",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "linear-gradient(rgb(15, 27, 45) 0%, rgb(10, 22, 40) 100%)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="text-[15px] font-bold text-white leading-none tracking-tight">
            ACBot
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-scroll flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5">
          {mainNav.map((item) => navLink(item))}

          {/* System Tools Section */}
          <div className="px-3 pt-4 pb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 tracking-[0.1em] uppercase select-none">
              系统工具
            </span>
          </div>
          <button
            onClick={() => setSystemToolsOpen(!systemToolsOpen)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-[13px] text-slate-400 hover:bg-white/6 hover:text-slate-200 rounded-lg transition-all duration-150"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md">
                <Wrench className="h-3.5 w-3.5" />
              </span>
              <span>系统工具</span>
            </div>
            <ChevronLeft
              className={cn("h-3.5 w-3.5 transition-transform", systemToolsOpen ? "-rotate-90" : "")}
            />
          </button>
          {systemToolsOpen && (
            <div className="ml-3 space-y-0.5">
              <a
                href="/bots"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-150",
                  pathname.includes("/bots/") && pathname.includes("build")
                    ? "bg-white/10 font-medium text-white"
                    : "text-slate-400 hover:bg-white/6 hover:text-slate-200"
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md">
                  <Wrench className="h-3 w-3" />
                </span>
                <span>服务器搭建</span>
              </a>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-white/5 px-2 py-2 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/6 transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-white font-medium truncate">
                {user?.username || "用户"}
              </div>
              <div className="text-[10px] text-slate-500">
                {user?.role === "admin" ? "管理员" : "普通用户"}
              </div>
            </div>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="退出登录"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
