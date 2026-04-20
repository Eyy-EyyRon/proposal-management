"use client";

import React, { memo } from "react";

function SkeletonCell({ w }: { w?: string }) {
  return (
    <div
      className={`h-3.5 rounded-md bg-slate-200/80 animate-pulse ${w ?? "w-full"}`}
      style={{ animationDuration: "1.4s" }}
    />
  );
}

function ProposalSkeletonRow({ index }: { index: number }) {
  return (
    <tr
      className="border-b border-slate-100/80"
      style={{ opacity: 1 - index * 0.08 }}
    >
      {/* Client */}
      <td className="px-5 py-3 pl-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200/80 animate-pulse" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <SkeletonCell w="w-32" />
            <SkeletonCell w="w-20" />
          </div>
        </div>
      </td>
      {/* Template */}
      <td className="px-5 py-3"><SkeletonCell w="w-28" /></td>
      {/* Sent by */}
      <td className="px-5 py-3"><SkeletonCell w="w-16" /></td>
      {/* Dept */}
      <td className="px-5 py-3"><SkeletonCell w="w-14" /></td>
      {/* Status */}
      <td className="px-5 py-3">
        <div className="h-6 w-20 rounded-full bg-slate-200/80 animate-pulse" />
      </td>
      {/* Sent date */}
      <td className="px-5 py-3"><SkeletonCell w="w-20" /></td>
      {/* Viewed */}
      <td className="px-5 py-3"><SkeletonCell w="w-16" /></td>
      {/* Actions */}
      <td className="px-3 py-3">
        <div className="h-7 w-7 rounded-lg bg-slate-200/80 animate-pulse" />
      </td>
    </tr>
  );
}

export const ProposalTableSkeleton = memo(function ProposalTableSkeleton({
  rows = 8,
}: {
  rows?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            {["Client", "Template", "Sent by", "Dept", "Status", "Sent", "Viewed", ""].map(
              (h) => (
                <th
                  key={h}
                  className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <ProposalSkeletonRow key={i} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

export const StatCardSkeleton = memo(function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-lg bg-slate-200/80 animate-pulse" />
        <div className="h-3 w-12 rounded bg-slate-200/80 animate-pulse" />
      </div>
      <div className="mt-3 h-7 w-16 rounded bg-slate-200/80 animate-pulse" />
      <div className="mt-1.5 h-3 w-20 rounded bg-slate-200/80 animate-pulse" />
    </div>
  );
});
