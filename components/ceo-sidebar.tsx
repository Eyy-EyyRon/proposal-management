"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  TrendingUp,
  FileText,
  FolderOpen,
  Trash2,
  ChevronRight,
  LogOut,
  Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "@/lib/auth";

const navItems = [
  { label: "Overview",          href: "/ceo-dashboard",            icon: Globe },
  { label: "Global Analytics",  href: "/ceo-dashboard/analytics",  icon: TrendingUp },
  { label: "All Proposals",     href: "/ceo-dashboard/proposals",  icon: FileText },
  { label: "Contracts",         href: "/ceo-dashboard/documents",  icon: FolderOpen },
  { label: "Trash",             href: "/ceo-dashboard/trash",      icon: Trash2 },
];

export function CeoSidebar() {
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-amber-100/80 bg-gradient-to-b from-[#fffdf7] to-white">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm shadow-amber-200">
          <Crown className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-slate-900">ProposalMS</span>
        <span className="ml-auto rounded-md bg-gradient-to-r from-amber-50 to-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/50">CEO</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">
          Executive
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-amber-50 text-amber-800 shadow-sm shadow-amber-100/50"
                  : "text-slate-500 hover:bg-amber-50/50 hover:text-slate-700"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-amber-600" : "text-slate-400"
                }`}
              />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-amber-400" />
              )}
            </Link>
          );
        })}

        {/* Switch to Staff Dashboard */}
        <div className="mt-5 border-t border-amber-100/60 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
            Staff Dashboard
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-amber-100/60 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-amber-50/50">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-[10px] font-semibold text-white shadow-sm shadow-amber-200">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">{displayName}</p>
            <p className="truncate text-[11px] text-slate-400">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
