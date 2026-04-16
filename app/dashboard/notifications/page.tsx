"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell, BellOff, Eye, CheckCircle, XCircle, Check, Loader2,
  Users, LayoutTemplate, Trophy, Info,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";

const iconConfig: Record<NotificationType, { icon: typeof Eye; color: string; bg: string }> = {
  viewed:           { icon: Eye,            color: "text-sky-500",     bg: "bg-sky-50" },
  signed:           { icon: CheckCircle,    color: "text-emerald-500", bg: "bg-emerald-50" },
  rejected:         { icon: XCircle,        color: "text-rose-500",    bg: "bg-rose-50" },
  team_joined:      { icon: Users,          color: "text-violet-500",  bg: "bg-violet-50" },
  template_updated: { icon: LayoutTemplate, color: "text-amber-500",   bg: "bg-amber-50" },
  major_deal:       { icon: Trophy,         color: "text-amber-600",   bg: "bg-amber-50" },
  system:           { icon: Info,           color: "text-slate-500",   bg: "bg-slate-50" },
};

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts || !ts.seconds) return "";
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, (items) => {
      setNotifications(items);
      setLoading(false);
    }, 100);
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    await markAllNotificationsRead(user.uid);
    setMarkingAll(false);
  };

  return (
    <>
      <Topbar title="Notifications" />

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200/60">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">All Notifications</h2>
                <p className="text-[12px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/80 py-20 shadow-sm backdrop-blur-xl">
              <BellOff className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">No notifications yet</p>
              <p className="text-[12px] text-slate-400">
                You&apos;ll be notified when clients view or sign your proposals.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-xl">
              {notifications.map((n, i) => {
                const cfg = iconConfig[n.type] ?? iconConfig.viewed;
                const Icon = cfg.icon;
                return (
                  <Link
                    href="/dashboard/proposals"
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markNotificationRead(n.id);
                    }}
                    className={`flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50/80 ${
                      i !== notifications.length - 1 ? "border-b border-slate-100/60" : ""
                    } ${!n.read ? "bg-indigo-50/20" : ""}`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-snug ${!n.read ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {timeAgo(n.createdAt as unknown as { seconds: number })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
