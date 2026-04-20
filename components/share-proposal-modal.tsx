"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Share2, Loader2, Check, Building2 } from "lucide-react";
import { subscribeToDepartmentsList, updateProposalSharing, writeAuditLog, writeSharingLog, type FirestoreDepartment } from "@/lib/firestore";
import { useAuth, useRole } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";

interface ShareProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalClientName: string;
  currentSharedWith: string[];
  currentAccessLevel?: "view_only" | "collaborative";
  originDepartmentId: string;
}

export function ShareProposalModal({
  isOpen,
  onClose,
  proposalId,
  proposalClientName,
  currentSharedWith,
  currentAccessLevel = "view_only",
  originDepartmentId,
}: ShareProposalModalProps) {
  const { user, profile } = useAuth();
  const { isCeo, isAdmin } = useRole();
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set(currentSharedWith));
  const [accessLevel, setAccessLevel] = useState<"view_only" | "collaborative">(currentAccessLevel);
  const [saving, setSaving] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // Sync selected when modal opens with fresh data
  useEffect(() => {
    if (isOpen) {
      setSelectedDepts(new Set(currentSharedWith));
      setAccessLevel(currentAccessLevel);
    }
  }, [isOpen, currentSharedWith, currentAccessLevel]);

  // Subscribe to departments list
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToDepartmentsList((data) => {
      setDepartments(data);
      setLoadingDepts(false);
    });
    return () => unsub();
  }, [isOpen]);

  const toggleDept = useCallback((deptName: string) => {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptName)) {
        next.delete(deptName);
      } else {
        next.add(deptName);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const deptArray = Array.from(selectedDepts);
      await updateProposalSharing(proposalId, deptArray, accessLevel);

      // Audit log
      writeAuditLog({
        action: "proposal_sharing_updated",
        actorId: user.uid,
        actorName: `${profile.firstName} ${profile.lastName}`,
        actorRole: profile.role,
        targetId: proposalId,
        targetType: "proposal",
        description: `Sharing updated for "${proposalClientName}": shared with [${deptArray.join(", ")}] (${accessLevel})`,
        metadata: { sharedWith: deptArray, accessLevel },
      }).catch(() => {});

      // Log to CEO Sharing Monitor
      if (deptArray.length > 0) {
        writeSharingLog({
          proposalId,
          proposalClientName,
          originDepartment: originDepartmentId,
          sharedWith: deptArray,
          accessLevel,
          sharedBy: user.uid,
          sharedByName: `${profile.firstName} ${profile.lastName}`,
        }).catch(() => {});
      }

      // Notify admins of the receiving departments
      if (deptArray.length > 0) {
        fetch("/api/notify-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalId,
            proposalClientName,
            sharedWith: deptArray,
            sharedBy: `${profile.firstName} ${profile.lastName}`,
            originDepartment: originDepartmentId,
          }),
        }).catch(() => {});
      }

      toast.success(
        deptArray.length > 0
          ? `Shared with ${deptArray.join(", ")}`
          : "All sharing removed"
      );
      onClose();
    } catch {
      toast.error("Failed to update sharing.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  if (!isCeo && !isAdmin) return null;

  // Filter out the origin department — no need to share with yourself
  const availableDepts = departments.filter((d) => d.name !== originDepartmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Share2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Share Proposal</h2>
              <p className="text-[12px] text-slate-500">
                Grant departments view or collaborative access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Origin badge */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-[12px] text-slate-600">
              Origin: <strong className="text-slate-800">{originDepartmentId}</strong>
            </span>
            <span className="ml-auto text-[11px] text-slate-400">Source of truth</span>
          </div>

          {/* Access Level Toggle */}
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Access Level</p>
            <div className="flex gap-2">
              <button
                onClick={() => setAccessLevel("view_only")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                  accessLevel === "view_only"
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                View Only
              </button>
              <button
                onClick={() => setAccessLevel("collaborative")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                  accessLevel === "collaborative"
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Collaborative
              </button>
            </div>
          </div>

          {/* Department Checklist */}
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              Select Departments
            </p>
            {loadingDepts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : availableDepts.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-slate-400">
                No other departments available.
              </p>
            ) : (
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-2">
                {availableDepts.map((dept) => {
                  const isSelected = selectedDepts.has(dept.name);
                  return (
                    <button
                      key={dept.id}
                      onClick={() => toggleDept(dept.name)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "bg-violet-50 ring-1 ring-violet-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          isSelected
                            ? "border-violet-500 bg-violet-500"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800">{dept.name}</p>
                        {dept.description && (
                          <p className="truncate text-[11px] text-slate-400">{dept.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedDepts.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selectedDepts).map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200"
                >
                  {d}
                  <button onClick={() => toggleDept(d)} className="ml-0.5 hover:text-violet-900">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Sharing"}
          </button>
        </div>
      </div>
    </div>
  );
}
