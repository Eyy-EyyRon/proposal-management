"use client";

import { useState } from "react";
import { Plus, X, Upload, Link, FileText } from "lucide-react";

interface TemplateField {
  id: string;
  name: string;
  type: "text" | "email" | "phone" | "date";
  required: boolean;
}

interface TemplateFormProps {
  onSubmit: (data: {
    name: string;
    sourceType: "docx" | "gdocs";
    sourceValue: string;
    fields: TemplateField[];
  }) => void;
}

export function TemplateForm({ onSubmit }: TemplateFormProps) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<"docx" | "gdocs">("docx");
  const [sourceValue, setSourceValue] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([
    { id: "1", name: "Client Name", type: "text", required: true },
    { id: "2", name: "Email", type: "email", required: true },
  ]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sourceValue) return;
    
    const validFields = fields.filter(f => f.name.trim());
    onSubmit({
      name,
      sourceType,
      sourceValue,
      fields: validFields,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block font-sans text-sm font-medium text-slate-700">
          Template Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Service Agreement"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-2 block font-sans text-sm font-medium text-slate-700">
          Template Source
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSourceType("docx")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-sans text-sm font-medium transition ${
              sourceType === "docx"
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload DOCX
          </button>
          <button
            type="button"
            onClick={() => setSourceType("gdocs")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-sans text-sm font-medium transition ${
              sourceType === "gdocs"
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Link className="h-4 w-4" />
            Google Docs
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-sans text-sm font-medium text-slate-700">
          {sourceType === "docx" ? "Upload File" : "Google Docs Link"}
        </label>
        {sourceType === "docx" ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50">
            <Upload className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 font-sans text-sm font-medium text-slate-700">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 font-sans text-xs text-slate-500">
              DOCX files only (MAX. 10MB)
            </p>
            <input
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSourceValue(file.name);
              }}
            />
          </div>
        ) : (
          <input
            type="url"
            value={sourceValue}
            onChange={(e) => setSourceValue(e.target.value)}
            placeholder="https://docs.google.com/document/d/..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="font-sans text-sm font-medium text-slate-700">
            Dynamic Fields
          </label>
          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200"
          >
            <Plus className="h-3 w-3" />
            Add Field
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    placeholder="Field name (e.g., Company Name)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
                  />
                  <div className="flex items-center gap-3">
                    <select
                      value={field.type}
                      onChange={(e) => updateField(field.id, { type: e.target.value as TemplateField["type"] })}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Required
                    </label>
                  </div>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-sans text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-6 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
        >
          Create Template
        </button>
      </div>
    </form>
  );
}
