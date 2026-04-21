"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  "dashboard":      "Dashboard",
  "super-admin":    "Admin Panel",
  "ceo-dashboard":  "CEO Dashboard",
  "proposals":      "Proposals",
  "tasks":          "Tasks",
  "templates":      "Templates",
  "analytics":      "Analytics",
  "settings":       "Settings",
  "team":           "Team",
  "departments":    "Departments",
  "activity":       "Activity",
  "audit-log":      "Audit Log",
  "trash":          "Trash",
  "notifications":  "Notifications",
  "security":       "Security",
  "documents":      "Documents",
  "new":            "New",
  "create-proposal":"Create Proposal",
  "logs":           "Purge Logs",
};

function labelFor(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumb() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    // Skip dynamic segments (UIDs, tokens, etc.)
    if (seg.length > 20 || seg.match(/^[a-z0-9]{20,}$/i)) continue;
    crumbs.push({ label: labelFor(seg), href: path });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1" aria-label="Breadcrumb">
      <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-slate-300" />
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-slate-600">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-600 transition">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
