"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronDown, ChevronRight, GripVertical,
  Plus, Pencil, Trash2, X, Check, Loader2,
} from "lucide-react";
import {
  subscribeToSnippets, createSnippet, updateSnippet, deleteSnippet,
  type Snippet,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";

interface SnippetVaultProps {
  department: string;
  canEdit: boolean;           // true for Dept Admin
  onInsert: (text: string) => void;
  onClose: () => void;
}

const CATEGORIES = ["About Us", "Terms", "Pricing", "Delivery", "Guarantee", "Other"];

function SnippetItem({
  snippet,
  canEdit,
  onInsert,
  onEdit,
  onDelete,
}: {
  snippet: Snippet;
  canEdit: boolean;
  onInsert: (text: string) => void;
  onEdit: (s: Snippet) => void;
  onDelete: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", snippet.body);
    setDragging(true);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDragging(false)}
      style={{ opacity: dragging ? 0.4 : 1, transition: "opacity 0.15s" }}
      className="group flex cursor-grab items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-[#780116]/30 hover:bg-[#780116]/4 active:cursor-grabbing"
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-slate-700">{snippet.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">{snippet.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => onInsert(snippet.body)}
          className="rounded-md p-1 hover:bg-emerald-50 hover:text-emerald-600"
          title="Insert"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        {canEdit && (
          <>
            <button
              onClick={() => onEdit(snippet)}
              className="rounded-md p-1 hover:bg-slate-100"
              title="Edit"
            >
              <Pencil className="h-3 w-3 text-slate-400" />
            </button>
            <button
              onClick={() => onDelete(snippet.id)}
              className="rounded-md p-1 hover:bg-rose-50 hover:text-rose-500"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SnippetVault({ department, canEdit, onInsert, onClose }: SnippetVaultProps) {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing]   = useState<Snippet | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving]     = useState(false);

  const [form, setForm] = useState({ title: "", body: "", category: "About Us" });

  useEffect(() => {
    return subscribeToSnippets(department, setSnippets);
  }, [department]);

  const grouped = snippets.reduce<Record<string, Snippet[]>>((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateSnippet(editing.id, { title: form.title, body: form.body, category: form.category });
      } else {
        await createSnippet({
          title: form.title,
          body: form.body,
          category: form.category,
          department: "",
          createdBy: user.uid,
        });
      }
      setEditing(null);
      setCreating(false);
      setForm({ title: "", body: "", category: "About Us" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Snippet) => {
    setEditing(s);
    setCreating(false);
    setForm({ title: s.title, body: s.body, category: s.category });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this snippet?")) return;
    await deleteSnippet(id);
  };

  const showForm = creating || !!editing;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="flex h-full w-72 flex-col border-l border-slate-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
            <BookOpen className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <span className="text-[13px] font-semibold text-slate-900">Snippet Vault</span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && !showForm && (
            <button
              onClick={() => { setCreating(true); setEditing(null); setForm({ title: "", body: "", category: "About Us" }); }}
              className="rounded-lg bg-violet-50 p-1.5 text-violet-600 hover:bg-violet-100"
              title="New snippet"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Form (create / edit) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-100 bg-slate-50"
          >
            <div className="space-y-2 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {editing ? "Edit snippet" : "New snippet"}
              </p>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title (e.g. About Us)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-violet-400"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <textarea
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="Snippet text…"
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreating(false); setEditing(null); }}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-1.5 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snippet list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.keys(grouped).length === 0 && (
          <div className="py-10 text-center text-[13px] text-slate-400">
            {canEdit ? "No snippets yet. Add one above." : "No snippets available yet."}
          </div>
        )}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }))}
              className="mb-1.5 flex w-full items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
            >
              {collapsed[cat] ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {cat} ({items.length})
            </button>
            <AnimatePresence initial={false}>
              {!collapsed[cat] && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden space-y-1.5"
                >
                  {items.map((s) => (
                    <SnippetItem
                      key={s.id}
                      snippet={s}
                      canEdit={canEdit}
                      onInsert={onInsert}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
        Drag a snippet into a field · Click ✓ to insert
      </div>
    </motion.div>
  );
}
