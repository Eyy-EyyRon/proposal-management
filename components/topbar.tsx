"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Eye, CheckCircle, XCircle, BellOff } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";

interface TopbarProps {
  title: string;
}

const iconConfig: Record<NotificationType, { icon: typeof Eye; color: string; bg: string }> = {
  viewed:   { icon: Eye,         color: "text-sky-500",     bg: "bg-sky-50" },
  signed:   { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  rejected: { icon: XCircle,     color: "text-rose-500",    bg: "bg-rose-50" },
};

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts || !ts.seconds) return "";
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Topbar({ title }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();

  const initials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : "U";

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-6">
      <h1 className="text-[15px] font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition ${
              open
                ? "bg-slate-100 text-slate-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-[22rem] rounded-2xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-[13px] font-semibold text-slate-900">Notifications</p>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <BellOff className="h-6 w-6 text-slate-300" />
                    <p className="text-[12px] text-slate-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const cfg = iconConfig[n.type] ?? iconConfig.viewed;
                    const Icon = cfg.icon;
                    return (
                      <Link
                        href={`/dashboard/proposals`}
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                          i !== notifications.length - 1 ? "border-b border-slate-100/60" : ""
                        } ${!n.read ? "bg-indigo-50/30" : ""}`}
                      >
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] leading-snug ${!n.read ? "font-medium text-slate-800" : "text-slate-600"}`}>
                            {n.message}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {timeAgo(n.createdAt as unknown as { seconds: number })}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        )}
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                <button
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="text-[12px] font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Mark all as read
                </button>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="text-[12px] font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  View all
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="ml-1 h-5 w-px bg-slate-200" />

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white transition hover:bg-slate-800">
          {initials}
        </button>
      </div>
    </header>
  );
}
