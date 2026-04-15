"use client";

import { FileText, LayoutTemplate, BarChart3, Plus } from "lucide-react";
import Link from "next/link";

// Staff dashboard for regular admins who are not super-admins
// This is where they get redirected if they try to access super-admin routes

export default function StaffDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#800000]">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">
              Hyacinth Industries
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#800000] text-[11px] font-semibold text-white">
              A
            </div>
            <button className="text-[13px] font-medium text-slate-600 hover:text-slate-900">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mx-auto max-w-6xl">
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome, Admin
            </h1>
            <p className="text-[13px] text-slate-500">
              Manage your proposals and templates from your personal dashboard.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Link
              href="/staff-dashboard/proposals/new"
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#800000]/30 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#800000]">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Create Proposal
                </h3>
                <p className="text-[12px] text-slate-500">
                  Start from a template
                </p>
              </div>
            </Link>

            <Link
              href="/staff-dashboard/templates"
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                <LayoutTemplate className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Templates</h3>
                <p className="text-[12px] text-slate-500">
                  Browse available templates
                </p>
              </div>
            </Link>

            <Link
              href="/staff-dashboard/analytics"
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                <BarChart3 className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Analytics</h3>
                <p className="text-[12px] text-slate-500">View your stats</p>
              </div>
            </Link>
          </div>

          {/* Recent Proposals */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Your Proposals</h3>
              <Link
                href="/staff-dashboard/proposals"
                className="text-[13px] font-medium text-[#800000] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-800">
                No proposals yet
              </p>
              <p className="mt-1 text-[13px] text-slate-500">
                Create your first proposal to get started.
              </p>
              <Link
                href="/staff-dashboard/proposals/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]"
              >
                <Plus className="h-4 w-4" />
                Create Proposal
              </Link>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13px] text-amber-800">
              <strong>Note:</strong> You have admin access. For team management
              and organization-wide settings, please contact your Super
              Administrator.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
