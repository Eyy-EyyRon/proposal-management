"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Eye, CheckCircle, XCircle, FileText } from "lucide-react";

interface TopbarProps {
  title: string;
}

const mockNotifications = [
  {
    id: "1",
    icon: CheckCircle,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    title: "Dana Liu accepted the proposal",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    icon: Eye,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-50",
    title: "Northstar Inc. viewed your link",
    time: "4 hours ago",
    read: false,
  },
  {
    id: "3",
    icon: XCircle,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50",
    title: "Robert Hayes declined",
    time: "1 day ago",
    read: true,
  },
  {
    id: "4",
    icon: FileText,
    iconColor: "text-slate-500",
    iconBg: "bg-slate-50",
    title: "Proposal sent to Ariana Cole",
    time: "1 day ago",
    read: true,
  },
];

export function Topbar({ title }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-[13px] font-semibold text-slate-900">Notifications</p>
                {unreadCount > 0 && (
                  <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-600">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.map((n, i) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                      i !== mockNotifications.length - 1 ? "border-b border-slate-100/60" : ""
                    } ${!n.read ? "bg-slate-50/50" : ""}`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${n.iconBg}`}>
                      <n.icon className={`h-3.5 w-3.5 ${n.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-snug ${!n.read ? "font-medium text-slate-800" : "text-slate-600"}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{n.time}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-4 py-2.5">
                <button className="w-full text-center text-[12px] font-medium text-slate-500 transition hover:text-slate-900">
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="ml-1 h-5 w-px bg-slate-200" />

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white transition hover:bg-slate-800">
          A
        </button>
      </div>
    </header>
  );
}
