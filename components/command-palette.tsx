"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard, FileText, LayoutTemplate, BarChart2, Bell,
  FilePlus, Plus, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getUserProposals, type Proposal } from "@/lib/firestore";

const navItems = [
  { label: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard, group: "Navigation" },
  { label: "Proposals",     href: "/dashboard/proposals",     icon: FileText,        group: "Navigation" },
  { label: "Templates",     href: "/dashboard/templates",     icon: LayoutTemplate,  group: "Navigation" },
  { label: "Analytics",     href: "/dashboard/analytics",     icon: BarChart2,       group: "Navigation" },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell,            group: "Navigation" },
];

const quickActions = [
  { label: "Create Proposal",  href: "/dashboard/create-proposal", icon: FilePlus, group: "Actions" },
  { label: "New Template",     href: "/dashboard/templates/new",   icon: Plus,     group: "Actions" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  // Toggle on Ctrl/Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load proposals when opened
  useEffect(() => {
    if (!open || !user || proposals.length > 0) return;
    getUserProposals(user.uid).then(setProposals).catch(() => {});
  }, [open, user, proposals.length]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* Dialog */}
      <div className="flex items-start justify-center pt-[20vh]">
        <Command
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-xl"
          label="Command Palette"
        >
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Command.Input
              placeholder="Search proposals, pages, actions…"
              className="h-12 w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-8 text-center text-[13px] text-slate-400">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="mb-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-600 transition data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="mb-1">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-600 transition data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Proposals */}
            {proposals.length > 0 && (
              <Command.Group heading="Proposals" className="mb-1">
                {proposals.filter((p) => p.status !== "archived").slice(0, 10).map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`${p.clientName} ${p.clientEmail} ${p.templateName}`}
                    onSelect={() => go(`/p/${p.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-600 transition data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-slate-800">{p.clientName}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-slate-500">{p.templateName}</span>
                    </div>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      p.status === "accepted" ? "bg-emerald-50 text-emerald-600" :
                      p.status === "rejected" ? "bg-rose-50 text-rose-600" :
                      p.status === "viewed"   ? "bg-sky-50 text-sky-600" :
                      "bg-slate-50 text-slate-500"
                    }`}>
                      {p.status}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
            <span className="text-[11px] text-slate-400">Type to search</span>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-400">↑↓</kbd>
              <span className="text-[10px] text-slate-400">navigate</span>
              <kbd className="ml-1 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-400">↵</kbd>
              <span className="text-[10px] text-slate-400">select</span>
            </div>
          </div>
        </Command>
      </div>

      {/* Global styles for cmdk */}
      <style jsx global>{`
        [cmdk-group-heading] {
          padding: 4px 12px 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
