"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import {
  assignTask,
  type ProposalTask,
} from "@/lib/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/components/providers/toast";
import { useAuth } from "@/contexts/auth-context";

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProposalTask;
  level: "deptAdmin" | "staff";
}

interface UserOption {
  uid: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export function AssignTaskModal({ isOpen, onClose, task, level }: AssignTaskModalProps) {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUid("");
    setLoading(true);

    (async () => {
      try {
        // Query users based on level
        let q;
        if (level === "deptAdmin") {
          // Find admins in the task's department
          q = query(
            collection(db, "users"),
            where("role", "==", "admin"),
            where("department", "==", task.department)
          );
        } else {
          // Find staff in the task's department
          q = query(
            collection(db, "users"),
            where("role", "==", "staff"),
            where("department", "==", task.department)
          );
        }
        const snap = await getDocs(q);
        setUsers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || data.email,
              email: data.email,
              role: data.role,
              department: data.department,
            };
          })
        );
      } catch {
        toast.error("Failed to load team members.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, level, task.department]);

  const handleAssign = async () => {
    if (!user || !profile || !selectedUid) return;
    const target = users.find((u) => u.uid === selectedUid);
    if (!target) return;

    const assignerName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
    setSaving(true);
    try {
      await assignTask(task.id, user.uid, assignerName, target.uid, target.name, level);
      toast.success(`Assigned to ${target.name}.`);
      onClose();
    } catch {
      toast.error("Failed to assign task.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const levelLabel = level === "deptAdmin" ? "Department Admin" : "Staff Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">Assign to {levelLabel}</h3>
            <p className="text-[12px] text-slate-400">
              Task for {task.clientName} · {task.department}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-400">
              No {level === "deptAdmin" ? "admins" : "staff"} found in {task.department}.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => setSelectedUid(u.uid)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selectedUid === u.uid
                      ? "border-violet-300 bg-violet-50/50 ring-2 ring-violet-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-700">{u.name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || !selectedUid}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
