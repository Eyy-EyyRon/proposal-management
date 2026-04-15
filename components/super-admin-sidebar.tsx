"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Users,
  Settings,
  FilePlus,
  Crown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { label: "Proposals", href: "/super-admin/proposals", icon: FileText },
  { label: "Templates", href: "/super-admin/templates", icon: LayoutTemplate },
  { label: "Team Management", href: "/super-admin/team", icon: Users },
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/60 bg-white shadow-sm">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#800000]">
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold tracking-tight text-slate-900">
            Hyacinth Industries
          </span>
          <span className="text-[10px] font-medium text-[#800000]">
            Super Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Main Menu
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-[#800000]/10 text-[#800000]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-[#800000]" : "text-slate-400 group-hover:text-slate-500"
                )}
              />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-[#800000]/40" />
              )}
            </Link>
          );
        })}

        {/* Quick Actions */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Quick Actions
          </p>
          <Link
            href="/super-admin/proposals/new"
            className="flex items-center gap-3 rounded-lg bg-[#800000] px-3 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#660000]"
          >
            <FilePlus className="h-4 w-4 shrink-0" />
            Create New Proposal
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="shrink-0 border-t border-slate-100 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#800000] text-[11px] font-semibold text-white">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">
              {userName}
            </p>
            <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
          </div>
          <Crown className="h-3.5 w-3.5 shrink-0 text-[#800000]" />
        </div>
      </div>
    </aside>
  );
}
