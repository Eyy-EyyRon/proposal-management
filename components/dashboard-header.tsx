"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-guard";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Mock notifications
  const notifications = [
    { id: "1", title: "New proposal accepted", time: "2 hours ago", read: false },
    { id: "2", title: "Team member added", time: "5 hours ago", read: false },
    { id: "3", title: "Template updated", time: "1 day ago", read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-6">
      {/* Page Title */}
      <div>
        <h1 className="text-[16px] font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-slate-500">{subtitle}</p>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg transition",
              notifOpen
                ? "bg-slate-100 text-slate-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#800000] ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-[13px] font-semibold text-slate-900">
                  Notifications
                </p>
                {unreadCount > 0 && (
                  <span className="rounded-md bg-[#800000]/10 px-2 py-0.5 text-[11px] font-medium text-[#800000]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50",
                      !n.read && "bg-slate-50/50"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                        n.read ? "bg-slate-300" : "bg-[#800000]"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13px] leading-snug",
                          !n.read
                            ? "font-medium text-slate-800"
                            : "text-slate-600"
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-4 py-2.5">
                <button className="w-full text-center text-[12px] font-medium text-slate-500 transition hover:text-[#800000]">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#800000] text-[11px] font-semibold text-white">
              {user ? getInitials(user.displayName || "Admin") : "SA"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[13px] font-medium text-slate-800">
                {user?.displayName || "Super Admin"}
              </p>
              <p className="text-[11px] text-slate-400">
                {user?.role === "super-admin" ? "Super Administrator" : "Admin"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-400 transition",
                profileOpen && "rotate-180"
              )}
            />
            <Crown className="h-3.5 w-3.5 text-[#800000]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-[13px] font-semibold text-slate-900">
                  {user?.displayName || "Super Admin"}
                </p>
                <p className="text-[11px] text-slate-400">{user?.email || "admin@hyacinth.com"}</p>
              </div>
              <div className="py-1">
                <button className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
