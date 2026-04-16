"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  subscribeToDepartmentsList,
  updateUserDepartment,
  type FirestoreDepartment,
} from "@/lib/firestore";

export default function OnboardingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { role, isCeo } = useRole();
  const router = useRouter();

  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // If user already has a department or is CEO, redirect out
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (isCeo || (profile && profile.department)) {
      const dest = isCeo ? "/ceo-dashboard" : role === "admin" ? "/super-admin" : "/dashboard";
      router.replace(dest);
    }
  }, [user, profile, authLoading, isCeo, role, router]);

  // Subscribe to departments
  useEffect(() => {
    const unsub = subscribeToDepartmentsList((data) => {
      setDepartments(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleJoin = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      await updateUserDepartment(user.uid, selected);
      // The real-time profile listener in auth-context will detect
      // the department change and the OnboardingGuard will redirect automatically
    } catch {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-5 text-xl font-semibold text-slate-900">Welcome to ProposalMS</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              Before you get started, please select the department you belong to.
              This helps organize proposals and analytics across the team.
            </p>
          </div>

          {/* Department Selection */}
          <div className="mt-8">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                <p className="text-[13px] text-slate-400">Loading departments…</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-8 text-center">
                <Building2 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-[13px] font-medium text-slate-600">No departments available</p>
                <p className="mt-1 text-[12px] text-slate-400">
                  Please ask your administrator to create departments in Settings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelected(dept.name)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                      selected === dept.name
                        ? "border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200/50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selected === dept.name
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium ${
                        selected === dept.name ? "text-indigo-900" : "text-slate-800"
                      }`}>
                        {dept.name}
                      </p>
                      {dept.description && (
                        <p className="truncate text-[12px] text-slate-400">{dept.description}</p>
                      )}
                    </div>
                    {selected === dept.name && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          <button
            onClick={handleJoin}
            disabled={!selected || saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[13px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Join Team
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          You can change your department later in Settings.
        </p>
      </div>
    </div>
  );
}
