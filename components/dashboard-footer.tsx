"use client";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/60 bg-white px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-[12px] text-slate-400">
          &copy; {currentYear} Hyacinth Industries. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-slate-400">
            Proposal Management System
          </span>
          <span className="text-[11px] font-medium text-[#800000]">
            v1.0.0
          </span>
        </div>
      </div>
    </footer>
  );
}
