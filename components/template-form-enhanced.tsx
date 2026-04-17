"use client";

import { useState, useRef } from "react";
import { Plus, X, Upload, Link, FileText, Mail, Phone, Calendar, Type, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { extractFieldsFromDocx } from "@/lib/docx-parser";

interface TemplateField {
  id: string;
  name: string;
  type: "text" | "email" | "phone" | "date";
  required: boolean;
}

interface TemplateFormEnhancedProps {
  onSubmit: (data: {
    name: string;
    sourceType: "docx" | "gdocs";
    sourceValue: string;
    fields: TemplateField[];
    file: File | null;
    extractedPlaceholders: string[];
  }) => Promise<void>;
  submitting?: boolean;
}

const fieldIcons = {
  text: Type,
  email: Mail,
  phone: Phone,
  date: Calendar,
};

function VariablePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-slate-100/70 px-2 py-0.5 font-mono text-[11px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      {label}
    </span>
  );
}

export function TemplateFormEnhanced({ onSubmit, submitting = false }: TemplateFormEnhancedProps) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<"docx" | "gdocs">("docx");
  const [sourceValue, setSourceValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gdocsValid, setGdocsValid] = useState<boolean | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([
    { id: "1", name: "Client Name", type: "text", required: true },
    { id: "2", name: "Email", type: "email", required: true },
  ]);
  const [extractedPlaceholders, setExtractedPlaceholders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      alert("Please upload a .docx file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum size is 10MB.");
      return;
    }
    setSelectedFile(file);
    setSourceValue(file.name);
    setParseError(null);

    // Auto-extract {fieldName} placeholders from the docx
    setParsing(true);
    try {
      const placeholders = await extractFieldsFromDocx(file);
      setExtractedPlaceholders(placeholders);
      if (placeholders.length > 0) {
        // Auto-populate dynamic fields from extracted placeholders
        const autoFields: TemplateField[] = placeholders.map((p, i) => {
          const lower = p.toLowerCase();
          let type: TemplateField["type"] = "text";
          if (lower.includes("email")) type = "email";
          else if (lower.includes("phone")) type = "phone";
          else if (lower.includes("date")) type = "date";
          return { id: `auto-${i}`, name: p, type, required: true };
        });
        setFields(autoFields);
      }
    } catch {
      setParseError("Could not parse document. Fields were not auto-extracted.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setSourceValue("");
    setExtractedPlaceholders([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateGoogleDocsUrl = (url: string) => {
    const gdocsPattern = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/;
    return gdocsPattern.test(url);
  };

  const handleGdocsChange = (url: string) => {
    setSourceValue(url);
    if (url.length > 0) {
      setGdocsValid(validateGoogleDocsUrl(url));
    } else {
      setGdocsValid(null);
    }
  };

  const addField = () => {
    const newField: TemplateField = {
      id: Date.now().toString(),
      name: "",
      type: "text",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const visibleFields = fields.filter((field) => field.name.trim());


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sourceValue) return;
    
    const validFields = fields.filter(f => f.name.trim());
    await onSubmit({
      name,
      sourceType,
      sourceValue,
      fields: validFields,
      file: selectedFile,
      extractedPlaceholders,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex h-full flex-col gap-6 lg:flex-row lg:gap-0">
        {/* Form Column */}
        <div className="flex-1 min-w-0 space-y-6 lg:flex-[0.7] lg:pr-6">
          {/* Basic Info */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Basic Information
            </p>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Service Agreement"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#780116] focus:ring-2 focus:ring-[#780116]/20"
              />
            </div>
          </section>

          {/* Source */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Document Source
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType("docx")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                    sourceType === "docx"
                      ? "border-[#780116] bg-[#780116] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.08)]"
                      : "border-slate-200 bg-white/70 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload DOCX
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("gdocs")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                    sourceType === "gdocs"
                      ? "border-[#780116] bg-[#780116] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.08)]"
                      : "border-slate-200 bg-white/70 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <Link className={`h-3.5 w-3.5 ${sourceType === "gdocs" ? "opacity-100" : "opacity-80"}`} />
                  Google Docs
                </button>
              </div>

              {sourceType === "docx" ? (
                selectedFile ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                        <FileText className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-[12px] text-slate-400">
                          {formatFileSize(selectedFile.size)}
                          {parsing && " — Scanning for fields..."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Upload className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-[13px] font-medium text-slate-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-400">
                      DOCX files only (MAX. 10MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                )
              ) : (
                <div>
                  <input
                    type="url"
                    value={sourceValue}
                    onChange={(e) => handleGdocsChange(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                      gdocsValid === null
                        ? "border-slate-200 focus:border-[#780116] focus:ring-[#780116]/20"
                        : gdocsValid
                        ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                        : "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    }`}
                  />
                  {gdocsValid === false && sourceValue.length > 0 && (
                    <p className="mt-1.5 text-[12px] text-rose-600">
                      Please enter a valid Google Docs URL
                    </p>
                  )}
                  {gdocsValid === true && (
                    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-emerald-600">
                      <Check className="h-3 w-3" />
                      Valid Google Docs link
                    </p>
                  )}
                </div>
              )}
              {/* Parse feedback */}
              {parsing && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                  <p className="text-[12px] text-slate-500">Scanning document for placeholder fields...</p>
                </div>
              )}
              {parseError && (
                <p className="text-[12px] text-amber-600">{parseError}</p>
              )}
              {!parsing && extractedPlaceholders.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-[12px] text-emerald-700">
                    Found {extractedPlaceholders.length} placeholder{extractedPlaceholders.length !== 1 ? "s" : ""}: {extractedPlaceholders.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Fields */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Dynamic Fields
              </p>
              <motion.button
                type="button"
                onClick={addField}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-600 transition hover:bg-slate-200"
              >
                <Plus className="h-3 w-3" />
                Add field
              </motion.button>
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {fields.map((field) => {
                const Icon = fieldIcons[field.type];
                return (
                  <motion.div
                    key={field.id}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ type: "spring", stiffness: 520, damping: 34 }}
                    className="rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            placeholder="Field name (e.g., Company Name)"
                            className="flex-1 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-2 focus:ring-[#780116]/20"
                          />
                        </div>
                        <div className="flex items-center gap-3 pl-5">
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as TemplateField["type"] })}
                            className="rounded-md border border-slate-200 bg-slate-50/80 px-2 py-1 text-[12px] text-slate-600 outline-none focus:border-[#780116] focus:bg-white focus:ring-2 focus:ring-[#780116]/20"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="date">Date</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
                })}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Preview Column */}
        <div className="w-full shrink-0 rounded-2xl border-t border-slate-200/80 bg-slate-50/80 pt-6 lg:w-[30%] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="sticky top-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Preview
            </p>

            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-400">Name</p>
                  <p className="mt-0.5 text-[13px] font-medium text-slate-800">
                    {name || "Untitled Template"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-400">Source</p>
                  <div className="mt-1">
                    <VariablePill label={sourceType === "docx" ? "Document Upload" : "Google Docs Link"} />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-400">
                    Fields ({visibleFields.length})
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {visibleFields.map((field) => (
                      <VariablePill key={field.id} label={field.name} />
                    ))}
                    {visibleFields.length === 0 && (
                      <p className="text-[12px] text-slate-400">No fields added</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Action Footer */}
      <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name || !sourceValue || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? "Creating..." : "Create template"}
        </button>
      </div>
    </>
  );
}
