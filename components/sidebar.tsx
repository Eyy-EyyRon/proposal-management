"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  FilePlus,
  BarChart2,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "@/lib/auth";

const navItems = [
  { label: "Dashboard",       href: "/dashboard",                 icon: LayoutDashboard },
  { label: "Proposals",       href: "/dashboard/proposals",       icon: FileText },
  { label: "Templates",       href: "/dashboard/templates",       icon: LayoutTemplate },
  { label: "Analytics",       href: "/dashboard/analytics",       icon: BarChart2 },
  { label: "Notifications",   href: "/dashboard/notifications",   icon: Bell },
  { label: "Settings",        href: "/dashboard/settings",        icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : "User";
  const displayEmail = profile?.email ?? "";
  const initials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200/60 bg-white">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
          <FileText className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-slate-900">ProposalMS</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-slate-700" : "text-slate-400"
                }`}
              />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-slate-400" />
              )}
            </Link>
          );
        })}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <Link
            href="/dashboard/create-proposal"
            className="flex items-center gap-2.5 rounded-lg bg-slate-900 px-2.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
          >
            <FilePlus className="h-4 w-4 shrink-0" />
            Create Proposal
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-slate-100 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">{displayName}</p>
            <p className="truncate text-[11px] text-slate-400">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
