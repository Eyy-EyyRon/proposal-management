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
  Crown,
  Users,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useAuth, useRole, type UserRole } from "@/contexts/auth-context";
import { signOut } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  minRole?: UserRole;
}

const navItems: NavItem[] = [
  { label: "Dashboard",       href: "/dashboard",                 icon: LayoutDashboard },
  { label: "Proposals",       href: "/dashboard/proposals",       icon: FileText },
  { label: "Templates",       href: "/dashboard/templates",       icon: LayoutTemplate },
  { label: "Analytics",       href: "/dashboard/analytics",       icon: BarChart2,      minRole: "admin" },
  { label: "Team",            href: "/dashboard/notifications",   icon: Users,           minRole: "admin" },
  { label: "Notifications",   href: "/dashboard/notifications",   icon: Bell },
  { label: "Trash",           href: "/dashboard/trash",           icon: Trash2 },
  { label: "Settings",        href: "/dashboard/settings",        icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const { role, isAtLeast, isCeo } = useRole();

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
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#780116]">
          <FileText className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-slate-900">ProposalMS</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        {navItems
          .filter((item) => !item.minRole || isAtLeast(item.minRole))
          .map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#780116]/10 text-[#780116]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-[#780116]" : "text-slate-400"
                  }`}
                />
                {item.label}
                {active && (
                  <ChevronRight className="ml-auto h-3 w-3 text-[#780116]/40" />
                )}
              </Link>
            );
          })}

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          <Link
            href="/dashboard/create-proposal"
            className="flex items-center gap-2.5 rounded-lg bg-[#780116] px-2.5 py-2 text-[13px] font-medium text-white transition hover:bg-[#C32F27]"
          >
            <FilePlus className="h-4 w-4 shrink-0" />
            Create Proposal
          </Link>

          {isCeo && (
            <Link
              href="/ceo-dashboard"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Crown className="h-4 w-4 shrink-0 text-[#780116]" />
              CEO Dashboard
            </Link>
          )}
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
            <p className="truncate text-[11px] text-slate-400">{role !== "staff" ? <span className="rounded bg-[#780116]/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#780116]">{role}</span> : displayEmail}</p>
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
