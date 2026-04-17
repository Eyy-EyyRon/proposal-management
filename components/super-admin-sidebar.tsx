"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Users,
  Settings,
  Crown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
  { label: "Activity", href: "/super-admin/activity", icon: Activity },
  { label: "Proposals", href: "/super-admin/proposals", icon: FileText },
  { label: "Team", href: "/super-admin/team", icon: Users },
  { label: "Templates", href: "/super-admin/templates", icon: LayoutTemplate },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
];

interface SuperAdminSidebarProps {
  userName?: string;
  userEmail?: string;
}

export function SuperAdminSidebar({
  userName = "Super Admin",
  userEmail = "admin@hyacinth.com",
}: SuperAdminSidebarProps) {
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/60 bg-white/95 shadow-sm backdrop-blur">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#800020]">
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold tracking-tight text-slate-900">
            Hyacinth Industries
          </span>
          <span className="text-[10px] font-medium text-[#800020]">
            Super Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Administration
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isOverview = item.label === "Overview";
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-[#800020]/10 text-[#800020]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#5f0018]"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-opacity duration-150",
                  active
                    ? "text-[#800020] opacity-100"
                    : "text-slate-400 opacity-50 group-hover:text-[#800020] group-hover:opacity-100"
                )}
              />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-[#800020]/40" />
              )}
              {active && isOverview && (
                <span className="absolute right-0 top-0 h-full w-[3px] rounded-l-full bg-[#800020]" />
              )}
            </Link>
          );
        })}

        {/* Portal */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Portal
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-[#800020] hover:ring-[#800020]/50"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Staff Dashboard
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="shrink-0 border-t border-slate-100 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#800020] text-[11px] font-semibold text-white">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">
              {userName}
            </p>
            <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            ADMIN ACCESS
          </span>
        </div>
      </div>
    </aside>
  );
}
