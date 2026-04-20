"use client";

import { useState, useEffect } from "react";
import {
  X, Loader2, Send, AlertTriangle, Clock, User, Building2,
  FileText, ChevronRight, ChevronLeft, CheckCircle, Calendar,
  Zap, Flag, Minus,
} from "lucide-react";
import {
  createTask,
  subscribeToDepartmentsList,
  getAllTemplates,
  getAdminUsers,
  type Template,
  type FirestoreDepartment,
  type TeamMember,
  type UrgencyLevel,
  URGENCY_META,
  URGENCY_SLA,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillClientName?: string;
  prefillClientEmail?: string;
  prefillDepartment?: string;
}

type DeadlineMode = "preset" | "custom";

const STEP_LABELS = ["Client Info", "Scope & Deadline", "Review & Submit"];

// ── helpers ──────────────────────────────────────────────────
function formatDeadline(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getPresetDate(urgency: UrgencyLevel): Date {
  return new Date(Date.now() + URGENCY_SLA[urgency]);
}

// ── PRESET QUICK SPANS (days) ─────────────────────────────────
const QUICK_SPANS = [
  { label: "3 Days",   days: 3 },
  { label: "1 Week",   days: 7 },
  { label: "2 Weeks",  days: 14 },
  { label: "1 Month",  days: 30 },
  { label: "3 Months", days: 90 },
];

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

// ── COMPONENT ────────────────────────────────────────────────
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
  const [step, setStep] = useState(1);

  // Step 1
  const [clientName, setClientName] = useState(prefillClientName ?? "");
  const [clientEmail, setClientEmail] = useState(prefillClientEmail ?? "");
  const [brief, setBrief] = useState("");

  // Step 2
  const [department, setDepartment] = useState(prefillDepartment ?? "");
  const [templateId, setTemplateId] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("p3");
  const [deadlineMode, setDeadlineMode] = useState<DeadlineMode>("preset");
  const [customDateStr, setCustomDateStr] = useState(""); // ISO date string from <input type="date">
  const [selectedSpanDays, setSelectedSpanDays] = useState<number | null>(null);
  // Admin assignment
  const [admins, setAdmins] = useState<TeamMember[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");

  // Derived deadline
  const resolvedDeadline: Date = (() => {
    if (deadlineMode === "preset") {
      if (selectedSpanDays !== null) return daysFromNow(selectedSpanDays);
      return getPresetDate(urgency);
    }
    if (customDateStr) return new Date(customDateStr);
    return getPresetDate(urgency);
  })();

  // Min date for picker = tomorrow
  const minDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

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

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setClientName(prefillClientName ?? "");
      setClientEmail(prefillClientEmail ?? "");
      setDepartment(prefillDepartment ?? "");
      setTemplateId("");
      setUrgency("p3");
      setBrief("");
      setDeadlineMode("preset");
      setCustomDateStr("");
      setSelectedSpanDays(null);
      setSelectedAdminId("");
      setAdmins([]);
    }
  }, [isOpen, prefillClientName, prefillClientEmail, prefillDepartment]);

  // Re-fetch admins when department changes
  useEffect(() => {
    if (!department) { setAdmins([]); setSelectedAdminId(""); return; }
    setAdminsLoading(true);
    setSelectedAdminId("");
    getAdminUsers(department)
      .then(setAdmins)
      .catch(() => setAdmins([]))
      .finally(() => setAdminsLoading(false));
  }, [department]);

  // When urgency changes in preset mode, reset span selection
  useEffect(() => {
    if (deadlineMode === "preset") setSelectedSpanDays(null);
  }, [urgency, deadlineMode]);

  const goNext = () => {
    if (step === 1) {
      if (!clientName.trim()) { toast.error("Client name is required."); return; }
      if (!brief.trim()) { toast.error("Brief description is required."); return; }
    }
    if (step === 2) {
      if (!department) { toast.error("Select a department."); return; }
      if (deadlineMode === "custom" && !customDateStr) {
        toast.error("Pick a custom deadline date."); return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!user || !profile) return;
    const selectedTemplate = templates.find((t) => t.id === templateId);
    const requesterName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "CEO";
    const selectedAdmin = admins.find((a) => a.id === selectedAdminId);
    const assignedAdminId = selectedAdmin?.id ?? user.uid;
    const assignedAdminName = selectedAdmin
      ? `${selectedAdmin.firstName} ${selectedAdmin.lastName}`.trim()
      : requesterName;

    setSaving(true);
    try {
      await createTask({
        requesterId: user.uid,
        requesterName,
        adminId: assignedAdminId,
        adminName: assignedAdminName,
        department,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        templateId: templateId || undefined,
        templateName: selectedTemplate?.name || undefined,
        briefDescription: brief.trim(),
        urgency,
        customDueAt: resolvedDeadline,
      });
      toast.success(
        urgency === "p1"
          ? "Critical task created — admin alerted immediately."
          : "Task created and delegated."
      );
      onClose();
    } catch {
      toast.error("Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const meta = URGENCY_META[urgency];
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const UrgencyIcon = urgency === "p1" ? Zap : urgency === "p2" ? Flag : Minus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">Create Task</h3>
            <p className="text-[12px] text-slate-400">Step {step} of 3 — {STEP_LABELS[step - 1]}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Step Progress ── */}
        <div className="flex items-center gap-0 border-b border-slate-100 px-6 py-3">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const done = step > num;
            const active = step === num;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {done ? <CheckCircle className="h-3.5 w-3.5" /> : num}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-violet-600" : done ? "text-emerald-600" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`mx-2 h-px flex-1 transition-all ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Client Info ── */}
        {step === 1 && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-2 rounded-xl bg-violet-50/60 px-4 py-2.5">
              <User className="h-4 w-4 text-violet-500" />
              <span className="text-[12px] font-medium text-violet-700">Who is this proposal for?</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-500">Client Name *</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-500">Client Email</label>
                <input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder="contact@acme.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500">Brief Description *</label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Describe what you need — scope, context, key points the team should know..."
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Scope & Deadline ── */}
        {step === 2 && (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
            {/* Department + Template */}
            <div className="flex items-center gap-2 rounded-xl bg-violet-50/60 px-4 py-2.5">
              <Building2 className="h-4 w-4 text-violet-500" />
              <span className="text-[12px] font-medium text-violet-700">Which team handles this?</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-500">Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-violet-400"
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">No template</option>
                  {templates.filter((t) => t.isPublished).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Admin Handler picker */}
            {department && (
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-500">
                  Admin Handler <span className="text-slate-400">(optional — leave blank for any {department} admin)</span>
                </label>
                {adminsLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading admins…
                  </div>
                ) : admins.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-400">
                    No admins found in {department}. Task will be visible to all {department} admins.
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-40 overflow-y-auto sm:grid-cols-2">
                    {/* Unassigned option */}
                    <button
                      type="button"
                      onClick={() => setSelectedAdminId("")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] transition ${
                        !selectedAdminId
                          ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <User className="h-4 w-4 text-slate-300" />
                      <div>
                        <p className="font-medium text-slate-600">Any admin</p>
                        <p className="text-[10px] text-slate-400">First available</p>
                      </div>
                    </button>
                    {admins.map((a) => {
                      const name = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim();
                      const initials = `${a.firstName?.[0] ?? ""}${a.lastName?.[0] ?? ""}`.toUpperCase();
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedAdminId(a.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] transition ${
                            selectedAdminId === a.id
                              ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600 overflow-hidden">
                            {a.avatarUrl ? <img src={a.avatarUrl} alt={name} className="h-full w-full object-cover" /> : initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-700">{name}</p>
                            <p className="text-[10px] text-slate-400">{a.department ?? "—"}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Urgency */}
            <div>
              <label className="mb-2 block text-[12px] font-medium text-slate-500">Urgency Level *</label>
              <div className="flex gap-2">
                {(["p1", "p2", "p3"] as UrgencyLevel[]).map((level) => {
                  const m = URGENCY_META[level];
                  const Icon = level === "p1" ? Zap : level === "p2" ? Flag : Minus;
                  const sel = urgency === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition ${
                        sel ? `${m.bg} ${m.color} border-current ring-2 ${m.ring}` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${sel ? m.color : "text-slate-400"}`} />
                      <span className="text-[12px] font-bold">{m.label}</span>
                      <span className="text-[10px] opacity-60">
                        {level === "p1" ? "2h default" : level === "p2" ? "24h default" : "72h default"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {urgency === "p1" && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Critical — triggers immediate admin notification and pulse SLA countdown.
                </div>
              )}
            </div>

            {/* Deadline Mode Toggle */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[12px] font-medium text-slate-500">Deadline</label>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setDeadlineMode("preset"); setCustomDateStr(""); }}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${deadlineMode === "preset" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}
                  >
                    Quick Span
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeadlineMode("custom"); setSelectedSpanDays(null); }}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${deadlineMode === "custom" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}
                  >
                    Custom Date
                  </button>
                </div>
              </div>

              {deadlineMode === "preset" ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Default for <strong>{URGENCY_META[urgency].label}</strong>: {formatDeadline(getPresetDate(urgency))}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_SPANS.map(({ label, days }) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSelectedSpanDays(selectedSpanDays === days ? null : days)}
                        className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                          selectedSpanDays === days
                            ? "border-violet-400 bg-violet-50 text-violet-700 ring-1 ring-violet-300"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {selectedSpanDays !== null && (
                    <p className="text-[11px] text-slate-500">
                      → Due: <strong>{formatDeadline(daysFromNow(selectedSpanDays))}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      min={minDate}
                      value={customDateStr}
                      onChange={(e) => setCustomDateStr(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  {customDateStr && (
                    <p className="text-[11px] text-slate-500">
                      → Due: <strong>{formatDeadline(new Date(customDateStr))}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Submit ── */}
        {step === 3 && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50/60 px-4 py-2.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-[12px] font-medium text-emerald-700">Review before delegating</span>
            </div>

            {/* Summary Card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
              {/* Client Row */}
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Client</p>
                  <p className="truncate text-[13px] font-semibold text-slate-800">{clientName}</p>
                  {clientEmail && <p className="text-[12px] text-slate-500">{clientEmail}</p>}
                </div>
              </div>

              {/* Department + Template */}
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Department</p>
                  <p className="text-[13px] font-semibold text-slate-800">{department}</p>
                  {selectedTemplate && (
                    <div className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-500">
                      <FileText className="h-3 w-3" />
                      {selectedTemplate.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Admin */}
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin Handler</p>
                    {selectedAdminId ? (() => {
                      const admin = admins.find((a) => a.id === selectedAdminId);
                      const name = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "";
                      const initials = admin ? `${admin.firstName?.[0] ?? ""}${admin.lastName?.[0] ?? ""}`.toUpperCase() : "";
                      return (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                            {admin?.avatarUrl ? <img src={admin.avatarUrl} alt={name} className="h-full w-full object-cover" /> : initials}
                          </div>
                          <p className="text-[13px] font-semibold text-slate-800">{name}</p>
                        </div>
                      );
                    })() : (
                      <p className="text-[13px] text-slate-400 italic">Unassigned — any {department} admin can pick up</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Urgency + Deadline */}
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                <UrgencyIcon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.color}`} />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Urgency</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Deadline</p>
                  <p className="text-[13px] font-semibold text-slate-800">{formatDeadline(resolvedDeadline)}</p>
                </div>
              </div>

              {/* Brief */}
              <div className="px-4 py-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Brief</p>
                <p className="text-[13px] leading-relaxed text-slate-700">{brief}</p>
              </div>
            </div>

            {urgency === "p1" && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span><strong>Critical task</strong> — admin will receive an immediate alert and a live SLA countdown starts on submission.</span>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-medium text-white transition active:scale-95 disabled:opacity-50 ${
                urgency === "p1"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : urgency === "p2"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Delegate Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
