"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
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
  Globe,
  TrendingUp,
  FolderOpen,
  Activity,
  Shield,
  Building2,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useAuth, useRole, useActingAsCeo, useElevation, type UserRole } from "@/contexts/auth-context";
import { JitElevationModal } from "@/components/jit-elevation-modal";
import { signOut } from "@/lib/auth";

// ─── NAV CONFIG ─────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface RoleNavConfig {
  basePath: string;
  sectionLabel: string;
  items: NavItem[];
  quickAction?: { label: string; href: string; icon: LucideIcon };
  switchTo?: { label: string; href: string; icon: LucideIcon }[];
}

const NAV_CONFIG: Record<string, RoleNavConfig> = {
  ceo: {
    basePath: "/ceo-dashboard",
    sectionLabel: "Executive",
    items: [
      { label: "Overview",          href: "/ceo-dashboard",            icon: Globe },
      { label: "Global Analytics",  href: "/ceo-dashboard/analytics",  icon: TrendingUp },
      { label: "All Proposals",     href: "/ceo-dashboard/proposals",  icon: FileText },
      { label: "Task Center",       href: "/ceo-dashboard/tasks",      icon: ClipboardCheck },
      { label: "Contracts",         href: "/ceo-dashboard/documents",  icon: FolderOpen },
      { label: "Trash",             href: "/ceo-dashboard/trash",      icon: Trash2 },
      { label: "Settings",          href: "/ceo-dashboard/settings",   icon: Settings },
      { label: "Security Monitor",  href: "/ceo-dashboard/security",      icon: ShieldAlert },
      { label: "Purge Logs",        href: "/ceo-dashboard/security/logs", icon: ClipboardList },
    ],
  },
  super_admin: {
    basePath: "/super-admin",
    sectionLabel: "System Administration",
    items: [
      { label: "Overview",      href: "/super-admin",              icon: Shield },
      { label: "Activity",      href: "/super-admin/activity",     icon: Activity },
      { label: "Proposals",     href: "/super-admin/proposals",    icon: FileText },
      { label: "Tasks",         href: "/dashboard/tasks",          icon: ClipboardCheck },
      { label: "Departments",   href: "/super-admin/departments",  icon: Building2 },
      { label: "Team",          href: "/super-admin/team",         icon: Users },
      { label: "Templates",     href: "/super-admin/templates",    icon: LayoutTemplate },
      { label: "Audit Log",     href: "/dashboard/audit-log",      icon: ClipboardList },
      { label: "Settings",      href: "/super-admin/settings",     icon: Settings },
    ],
  },
  admin: {
    basePath: "/dashboard",
    sectionLabel: "Department",
    items: [
      { label: "Dashboard",     href: "/dashboard",              icon: LayoutDashboard },
      { label: "Proposals",     href: "/dashboard/proposals",    icon: FileText },
      { label: "Tasks",         href: "/dashboard/tasks",        icon: ClipboardCheck },
      { label: "Templates",     href: "/dashboard/templates",    icon: LayoutTemplate },
      { label: "Analytics",     href: "/dashboard/analytics",    icon: BarChart2 },
      { label: "Audit Log",     href: "/dashboard/audit-log",    icon: ClipboardList },
      { label: "Settings",      href: "/dashboard/settings",     icon: Settings },
    ],
  },
  staff: {
    basePath: "/dashboard",
    sectionLabel: "Workspace",
    items: [
      { label: "Dashboard",     href: "/dashboard",              icon: LayoutDashboard },
      { label: "Proposals",     href: "/dashboard/proposals",    icon: FileText },
      { label: "My Tasks",      href: "/dashboard/tasks",        icon: ClipboardCheck },
      { label: "Templates",     href: "/dashboard/templates",    icon: LayoutTemplate },
      { label: "Analytics",     href: "/dashboard/analytics",    icon: BarChart2 },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { label: "Trash",         href: "/dashboard/trash",        icon: Trash2 },
      { label: "Settings",      href: "/dashboard/settings",     icon: Settings },
    ],
    quickAction: {
      label: "Create Proposal",
      href: "/dashboard/create-proposal",
      icon: FilePlus,
    },
  },
};

// ─── ROLE THEME ─────────────────────────────────────────────
interface RoleTheme {
  aside: string;
  brand: string;
  brandShadow: string;
  brandIcon: LucideIcon;
  badgeCls: string;
  badgeLabel: string;
  sectionLabel: string;
  activeLink: string;
  activeIcon: string;
  hoverLink: string;
  chevron: string;
  divider: string;
  avatar: string;
  avatarShadow: string;
  hoverUser: string;
  hoverLogout: string;
  quickBtn: string;
  quickBtnHover: string;
}

const ROLE_THEMES: Record<string, RoleTheme> = {
  ceo: {
    aside:         "border-r border-amber-100/80 bg-gradient-to-b from-[#fffdf7] to-white/95 backdrop-blur-xl",
    brand:         "bg-gradient-to-br from-amber-500 to-amber-600",
    brandShadow:   "shadow-sm shadow-amber-200",
    brandIcon:     Crown,
    badgeCls:      "rounded-md bg-gradient-to-r from-amber-50 to-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/50",
    badgeLabel:    "CEO",
    sectionLabel:  "text-amber-400/80",
    activeLink:    "bg-amber-50 text-amber-800 shadow-sm shadow-amber-100/50",
    activeIcon:    "text-amber-600",
    hoverLink:     "text-slate-500 hover:bg-amber-50/50 hover:text-slate-700",
    chevron:       "text-amber-400",
    divider:       "border-amber-100/60",
    avatar:        "bg-gradient-to-br from-amber-500 to-amber-600",
    avatarShadow:  "shadow-sm shadow-amber-200",
    hoverUser:     "hover:bg-amber-50/50",
    hoverLogout:   "hover:bg-amber-50 hover:text-amber-700",
    quickBtn:      "",
    quickBtnHover: "",
  },
  super_admin: {
    aside:         "border-r border-violet-100 bg-white/95 backdrop-blur-xl",
    brand:         "bg-violet-700",
    brandShadow:   "shadow-sm shadow-violet-200",
    brandIcon:     Shield,
    badgeCls:      "rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700",
    badgeLabel:    "SUPER ADMIN",
    sectionLabel:  "text-violet-400",
    activeLink:    "bg-violet-50 text-violet-800 shadow-sm shadow-violet-100/50",
    activeIcon:    "text-violet-600",
    hoverLink:     "text-slate-500 hover:bg-violet-50/50 hover:text-violet-700",
    chevron:       "text-violet-300",
    divider:       "border-violet-100/60",
    avatar:        "bg-gradient-to-br from-violet-500 to-violet-700",
    avatarShadow:  "shadow-sm shadow-violet-200",
    hoverUser:     "hover:bg-violet-50/50",
    hoverLogout:   "hover:bg-violet-50 hover:text-violet-700",
    quickBtn:      "bg-violet-600 text-white",
    quickBtnHover: "hover:bg-violet-700",
  },
  admin: {
    aside:         "border-r border-indigo-100 bg-white/95 backdrop-blur-xl",
    brand:         "bg-indigo-700",
    brandShadow:   "shadow-sm shadow-indigo-200",
    brandIcon:     Shield,
    badgeCls:      "rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700",
    badgeLabel:    "DEPT ADMIN",
    sectionLabel:  "text-indigo-400",
    activeLink:    "bg-indigo-50 text-indigo-800 shadow-sm shadow-indigo-100/50",
    activeIcon:    "text-indigo-600",
    hoverLink:     "text-slate-500 hover:bg-indigo-50/50 hover:text-indigo-700",
    chevron:       "text-indigo-300",
    divider:       "border-indigo-100/60",
    avatar:        "bg-gradient-to-br from-indigo-500 to-indigo-700",
    avatarShadow:  "shadow-sm shadow-indigo-200",
    hoverUser:     "hover:bg-indigo-50/50",
    hoverLogout:   "hover:bg-indigo-50 hover:text-indigo-700",
    quickBtn:      "bg-indigo-600 text-white",
    quickBtnHover: "hover:bg-indigo-700",
  },
  admin_ceo: {
    aside:         "border-r border-amber-200/60 bg-amber-50/60 backdrop-blur-xl",
    brand:         "bg-gradient-to-br from-amber-500 to-amber-600",
    brandShadow:   "shadow-sm shadow-amber-300",
    brandIcon:     Crown,
    badgeCls:      "rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900",
    badgeLabel:    "CEO IDENTITY",
    sectionLabel:  "text-amber-600",
    activeLink:    "bg-amber-100 text-amber-900 shadow-sm shadow-amber-200/50",
    activeIcon:    "text-amber-700",
    hoverLink:     "text-slate-500 hover:bg-amber-100/60 hover:text-amber-800",
    chevron:       "text-amber-400",
    divider:       "border-amber-200/60",
    avatar:        "bg-gradient-to-br from-amber-500 to-amber-600",
    avatarShadow:  "shadow-sm shadow-amber-300",
    hoverUser:     "hover:bg-amber-100/50",
    hoverLogout:   "hover:bg-amber-100 hover:text-amber-800",
    quickBtn:      "bg-amber-600 text-white",
    quickBtnHover: "hover:bg-amber-700",
  },
  staff: {
    aside:         "border-r border-slate-200/60 bg-white/95 backdrop-blur-xl",
    brand:         "bg-[#780116]",
    brandShadow:   "",
    brandIcon:     FileText,
    badgeCls:      "rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500",
    badgeLabel:    "STAFF",
    sectionLabel:  "text-slate-400",
    activeLink:    "bg-[#780116]/10 text-[#780116]",
    activeIcon:    "text-[#780116]",
    hoverLink:     "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
    chevron:       "text-[#780116]/40",
    divider:       "border-slate-100",
    avatar:        "bg-slate-900",
    avatarShadow:  "",
    hoverUser:     "hover:bg-slate-50",
    hoverLogout:   "hover:bg-slate-100 hover:text-slate-700",
    quickBtn:      "bg-[#780116] text-white",
    quickBtnHover: "hover:bg-[#C32F27]",
  },
};

// ─── DETECT ACTIVE ROLE FROM PATHNAME ───────────────────────
function detectActiveRole(pathname: string, userRole: UserRole): string {
  if (pathname.startsWith("/ceo-dashboard")) return "ceo";
  if (pathname.startsWith("/super-admin")) return "super_admin";
  return userRole;
}

// ─── SIDEBAR COMPONENT ─────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const { role, isCeo, isAtLeast } = useRole();
  const { actingAsCeo } = useActingAsCeo();
  const { isElevated, elevation, elevationTier, elevationCountdown } = useElevation();
  const [showElevationModal, setShowElevationModal] = useState(false);

  // Determine which nav set based on current folder
  const activeRole = detectActiveRole(pathname, role);
  const config = NAV_CONFIG[activeRole] ?? NAV_CONFIG.staff;
  // If admin is acting as CEO, use the golden CEO theme
  const themeKey = ((activeRole === "admin" || activeRole === "super_admin") && actingAsCeo) ? "admin_ceo" : activeRole;
  const theme = ROLE_THEMES[themeKey] ?? ROLE_THEMES.staff;
  const BrandIcon = theme.brandIcon;

  // Memoize nav items to prevent re-renders
  const navItems = useMemo(() => config.items, [config]);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : "User";
  const displayEmail = profile?.email ?? "";
  const initials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : "U";
  const avatarUrl = profile?.avatarUrl;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <>
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col ${theme.aside}`}>
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-5">
        <div className="relative h-8 w-8 overflow-hidden rounded-md">
          <Image
            src="/assets/logo.png"
            alt="Hyacinth Proposal System"
            fill
            sizes="32px"
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-slate-900">Hyacinth Proposal System</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2">
        <p className={`mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] ${theme.sectionLabel}`}>
          {config.sectionLabel}
        </p>

        {navItems.map((item) => {
          const active = pathname === item.href;
          const focusIndicator = active && item.label === "Overview";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-lg px-2.5 py-3 text-[13px] font-medium transition-all duration-200 ease-out ${
                active
                  ? `${theme.activeLink} shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]`
                  : `${theme.hoverLink} hover:bg-slate-100/50`
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`sidebar-active-${activeRole}`}
                  className="absolute inset-0 rounded-lg bg-[#800020]/10"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <item.icon
                className={`h-4 w-4 shrink-0 justify-self-center transition-opacity duration-150 ${
                  active
                    ? `${theme.activeIcon} opacity-100`
                    : "text-slate-400 opacity-50 group-hover:opacity-100"
                }`}
              />
              <span className="relative z-10 min-w-0 truncate">{item.label}</span>
              {active && (
                <ChevronRight className={`relative z-10 h-3 w-3 justify-self-end ${theme.chevron}`} />
              )}
              {focusIndicator && (
                <span className="absolute right-0 top-0 h-full w-[3px] rounded-l-full bg-[#800020]" />
              )}
            </Link>
          );
        })}

        {/* Quick action + role switches */}
        <div className={`mt-5 space-y-2 border-t pt-4 ${theme.divider}`}>
          {config.quickAction && (
            <Link
              href={config.quickAction.href}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-[#800020] hover:ring-[#800020]/50"
            >
              <config.quickAction.icon className="h-4 w-4 shrink-0" />
              {config.quickAction.label}
            </Link>
          )}

          {/* Cross-dashboard switches */}
          {config.switchTo?.map((sw) => (
            <Link
              key={sw.href}
              href={sw.href}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-[#800020] hover:ring-[#800020]/50"
            >
              <sw.icon className="h-4 w-4 shrink-0 text-slate-400" />
              {sw.label}
            </Link>
          ))}

          {/* CEO shortcut — only on staff sidebar when user is CEO */}
          {activeRole === "staff" && isCeo && (
            <Link
              href="/ceo-dashboard"
              className="flex items-center gap-2.5 rounded-lg border border-amber-200/60 bg-amber-50/50 px-2.5 py-2 text-[13px] font-medium text-amber-700 transition hover:bg-amber-50"
            >
              <Crown className="h-4 w-4 shrink-0 text-amber-600" />
              CEO Dashboard
            </Link>
          )}

          {/* Admin Panel shortcut — only for super_admin or ceo */}
          {activeRole === "staff" && isAtLeast("super_admin") && (
            <Link
              href="/super-admin"
              className="flex items-center gap-2.5 rounded-lg border border-violet-200/60 bg-violet-50/50 px-2.5 py-2 text-[13px] font-medium text-violet-700 transition hover:bg-violet-50"
            >
              <Shield className="h-4 w-4 shrink-0 text-violet-600" />
              Admin Panel
            </Link>
          )}

          {/* JIT Elevation — shown in super_admin sidebar */}
          {activeRole === "super_admin" && (
            isElevated ? (
              // Active elevation — colour by tier
              <div className={`relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 shadow-sm ring-1 ${
                elevationTier === "critical"
                  ? "border-rose-300 bg-gradient-to-r from-rose-50 to-rose-100 ring-rose-200"
                  : "border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 ring-orange-200"
              }`}>
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    elevationTier === "critical" ? "bg-rose-400" : "bg-orange-400"
                  }`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    elevationTier === "critical" ? "bg-rose-500" : "bg-orange-500"
                  }`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[11px] font-bold ${
                    elevationTier === "critical" ? "text-rose-800" : "text-orange-800"
                  }`}>
                    {elevationTier === "critical" ? "Critical Admin Mode" : "Active Admin Mode"}
                  </p>
                  <p className={`font-mono text-[10px] font-medium ${
                    elevationTier === "critical" ? "text-rose-600" : "text-orange-600"
                  }`}>{elevationCountdown} remaining</p>
                </div>
                <ShieldCheck className={`h-4 w-4 shrink-0 ${
                  elevationTier === "critical" ? "text-rose-500" : "text-orange-500"
                }`} />
              </div>
            ) : elevation?.status === "pending_approval" ? (
              // Critical elevation awaiting CEO
              <div className="relative flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2.5 shadow-sm ring-1 ring-amber-200">
                <Shield className="h-4 w-4 shrink-0 animate-pulse text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-amber-800">Awaiting CEO Approval</p>
                  <p className="text-[10px] text-amber-600">Critical elevation pending</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowElevationModal(true)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-violet-200/60 bg-violet-50/50 px-2.5 py-2 text-[13px] font-medium text-violet-700 transition hover:bg-violet-100"
              >
                <Shield className="h-4 w-4 shrink-0 text-violet-600" />
                Request Super Admin Power
              </button>
            )
          )}
        </div>
      </nav>

      {/* User + Role Badge */}
      <div className={`shrink-0 border-t px-3 py-3 ${theme.divider}`}>
        <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition ${theme.hoverUser}`}>
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white ${theme.avatar} ${theme.avatarShadow}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">{displayName}</p>
            <p className="truncate text-[11px] text-slate-400">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className={`ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition ${theme.hoverLogout}`}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="mt-2 flex items-center justify-center">
          <span
            className={theme.badgeCls}
          >
            {activeRole === "staff" ? "STAFF" : theme.badgeLabel}
          </span>
        </div>
      </div>
    </aside>

    {/* JIT Elevation modal — rendered outside aside to avoid z-index clipping */}
    <JitElevationModal
      isOpen={showElevationModal}
      onClose={() => setShowElevationModal(false)}
    />
  </>
  );
}
