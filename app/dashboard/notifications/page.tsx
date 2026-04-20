"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, Eye, CheckCircle, XCircle, Check, Loader2,
  Users, LayoutTemplate, Trophy, Info, MessageCircle, Crown, UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";
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
  viewed:             { icon: Eye,            color: "text-sky-500",     bg: "bg-sky-50" },
  signed:             { icon: CheckCircle,    color: "text-emerald-500", bg: "bg-emerald-50" },
  rejected:           { icon: XCircle,        color: "text-rose-500",    bg: "bg-rose-50" },
  commented:          { icon: MessageCircle,  color: "text-violet-500",  bg: "bg-violet-50" },
  ceo_comment:        { icon: Crown,          color: "text-amber-600",   bg: "bg-amber-50" },
  staff_action:       { icon: UserCheck,      color: "text-indigo-500",  bg: "bg-indigo-50" },
  delegated_proposal: { icon: UserCheck,      color: "text-rose-700",    bg: "bg-rose-50" },
  team_joined:        { icon: Users,          color: "text-violet-500",  bg: "bg-violet-50" },
  template_updated:   { icon: LayoutTemplate, color: "text-amber-500",   bg: "bg-amber-50" },
  major_deal:         { icon: Trophy,         color: "text-amber-600",   bg: "bg-amber-50" },
  system:             { icon: Info,           color: "text-slate-500",   bg: "bg-slate-50" },
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

function getSecondaryInfo(notification: AppNotification): string {
  if (notification.type === "viewed") {
    return `Duration: ${timeAgo(notification.createdAt as unknown as { seconds: number })}`;
  }
  if (notification.department) {
    return `Department: ${notification.department}`;
  }
  return `Logged ${timeAgo(notification.createdAt as unknown as { seconds: number })}`;
}

function SwingingBell() {
  return (
    <motion.div
      animate={{ rotate: [0, -8, 6, -4, 0] }}
      transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 10, ease: "easeInOut" }}
      style={{ transformOrigin: "50% 0%" }}
    >
      <Bell className="h-5 w-5 text-white" />
    </motion.div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [fadingId, setFadingId] = useState<string | null>(null);

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

  const getNotificationHref = (notification: AppNotification) =>
    notification.proposalId
      ? `/dashboard/proposals/${notification.proposalId}`
      : "/dashboard/proposals";

  const handleNotificationClick = async (
    event: MouseEvent<HTMLAnchorElement>,
    notification: AppNotification,
  ) => {
    event.preventDefault();
    const dest = getNotificationHref(notification);
    if (!notification.read) {
      setFadingId(notification.id);
      await markNotificationRead(notification.id);
      window.setTimeout(() => router.push(dest), 160);
      return;
    }
    router.push(dest);
  };

  return (
    <>
      <Topbar title="Notifications" />

      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200/60">
                <SwingingBell />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">All Notifications</h2>
                <p className="text-[12px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 py-20 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_48%,rgba(120,1,22,0.06)_49%,transparent_50%,transparent_74%,rgba(15,23,42,0.04)_75%,transparent_76%,transparent_100%)] opacity-60" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(120,1,22,0.05),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(15,23,42,0.03),transparent_34%)]" />
              <div className="relative flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-100">
                  <motion.div
                    animate={{ rotate: [0, -8, 6, -4, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 10, ease: "easeInOut" }}
                    style={{ transformOrigin: "50% 0%" }}
                  >
                    <Bell className="h-7 w-7 text-slate-300" />
                  </motion.div>
                </div>
                <p className="text-sm font-medium text-slate-500">No notifications yet</p>
                <p className="max-w-sm text-[12px] leading-relaxed text-slate-400">
                  You&apos;ll be notified when clients view or sign your proposals.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
              {notifications.map((n, i) => {
                const cfg = iconConfig[n.type] ?? iconConfig.viewed;
                const Icon = cfg.icon;
                const isFading = fadingId === n.id;
                return (
                  <Link
                    href="/dashboard/proposals"
                    key={n.id}
                    onClick={(event) => { void handleNotificationClick(event, n); }}
                    className={`group flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50/80 ${
                      i !== notifications.length - 1 ? "border-b border-slate-100/60" : ""
                    } ${!n.read ? "bg-[#780116]/[0.03]" : ""}`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-snug ${!n.read ? "font-semibold text-slate-950" : "font-medium text-slate-700"}`}>
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {getSecondaryInfo(n)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {timeAgo(n.createdAt as unknown as { seconds: number })}
                      </p>
                    </div>
                    {!n.read && (
                      <span
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full bg-[#780116] transition-all duration-300 ${
                          isFading ? "opacity-0 scale-0" : "opacity-100 scale-100"
                        }`}
                      />
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
