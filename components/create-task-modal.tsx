"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Send, AlertTriangle, Clock } from "lucide-react";
import {
  createTask,
  subscribeToDepartmentsList,
  getAllTemplates,
  type Template,
  type FirestoreDepartment,
  type UrgencyLevel,
  URGENCY_META,
  URGENCY_SLA,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Prefill fields (optional — e.g. from client profile)
  prefillClientName?: string;
  prefillClientEmail?: string;
  prefillDepartment?: string;
}

interface AdminOption {
  uid: string;
  name: string;
  department: string;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  prefillClientName,
  prefillClientEmail,
  prefillDepartment,
}: CreateTaskModalProps) {
  const { user, profile } = useAuth();
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [clientName, setClientName] = useState(prefillClientName ?? "");
  const [clientEmail, setClientEmail] = useState(prefillClientEmail ?? "");
  const [department, setDepartment] = useState(prefillDepartment ?? "");
  const [templateId, setTemplateId] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("p3");
  const [brief, setBrief] = useState("");

  // For the admin selection — we use the department list from Firestore
  // In a real implementation, we'd query users with role=admin in the selected dept.
  // For now, the CEO assigns the task to a department and the first admin picks it up.

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToDepartmentsList(setDepartments);
    return unsub;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getAllTemplates().then((t) => { if (!cancelled) setTemplates(t); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Reset form when opened with prefills
  useEffect(() => {
    if (isOpen) {
      setClientName(prefillClientName ?? "");
      setClientEmail(prefillClientEmail ?? "");
      setDepartment(prefillDepartment ?? "");
      setTemplateId("");
      setUrgency("p3");
      setBrief("");
    }
  }, [isOpen, prefillClientName, prefillClientEmail, prefillDepartment]);

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!clientName.trim()) { toast.error("Client name is required."); return; }
    if (!department) { toast.error("Select a department."); return; }
    if (!brief.trim()) { toast.error("Provide a brief description."); return; }

    const selectedTemplate = templates.find((t) => t.id === templateId);
    const requesterName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "CEO";

    setSaving(true);
    try {
      await createTask({
        requesterId: user.uid,
        requesterName,
        adminId: user.uid, // Initially assigned to CEO themselves, admin will pick it up
        adminName: requesterName,
        department,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        templateId: templateId || undefined,
        templateName: selectedTemplate?.name || undefined,
        briefDescription: brief.trim(),
        urgency,
      });
      toast.success(
        urgency === "p1"
          ? "Critical task created — admin will be alerted immediately."
          : "Task created and assigned."
      );
      onClose();
    } catch {
      toast.error("Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const slaMs = URGENCY_SLA[urgency];
  const slaLabel = slaMs < 86_400_000
    ? `${slaMs / 3_600_000}h turnaround`
    : `${slaMs / 86_400_000}d turnaround`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">Create Task</h3>
            <p className="text-[12px] text-slate-400">Delegate a proposal to your team</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 px-6 py-5">
          {/* Client */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500">Client Name *</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 focus:border-violet-300 focus:outline-none"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500">Client Email</label>
              <input
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 focus:border-violet-300 focus:outline-none"
                placeholder="john@acme.com"
              />
            </div>
          </div>

          {/* Department + Template */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 focus:border-violet-300 focus:outline-none"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500">Template</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 focus:border-violet-300 focus:outline-none"
              >
                <option value="">No template</option>
                {templates.filter((t) => t.isPublished).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="mb-2 block text-[12px] font-medium text-slate-500">Urgency Level *</label>
            <div className="flex gap-2">
              {(["p1", "p2", "p3"] as UrgencyLevel[]).map((level) => {
                const meta = URGENCY_META[level];
                const selected = urgency === level;
                return (
                  <button
                    key={level}
                    onClick={() => setUrgency(level)}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-center transition ${
                      selected
                        ? `${meta.bg} ${meta.color} border-current ring-2 ${meta.ring}`
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-[12px] font-bold">{meta.label}</span>
                    <span className="block text-[10px] opacity-70">
                      {level === "p1" ? "2h SLA" : level === "p2" ? "24h SLA" : "72h SLA"}
                    </span>
                  </button>
                );
              })}
            </div>
            {urgency === "p1" && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Critical tasks trigger immediate notifications and a 2-hour SLA countdown.
              </div>
            )}
          </div>

          {/* Brief */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-500">Brief Description *</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 focus:border-violet-300 focus:outline-none resize-none"
              placeholder="Describe what you need in this proposal..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            {slaLabel}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition active:scale-95 disabled:opacity-50 ${
                urgency === "p1"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : urgency === "p2"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Create Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
