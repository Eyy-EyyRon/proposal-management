"use client";

import { useState } from "react";
import { FileText, Check, Upload, Link as LinkIcon, Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  sourceType: "docx" | "gdocs";
  fields: Array<{
    id: string;
    name: string;
    type: "text" | "email" | "phone" | "date";
    required: boolean;
  }>;
}

interface ProposalFormProps {
  templates: Template[];
  onSubmit: (data: {
    templateId: string;
    fieldValues: Record<string, string>;
  }) => Promise<void>;
  submitting?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100";

export function ProposalForm({ templates, onSubmit, submitting = false }: ProposalFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFieldValues({});
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const requiredFields = selectedTemplate.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !fieldValues[f.id]?.trim());

    if (missingFields.length > 0) {
      alert(`Please fill in: ${missingFields.map(f => f.name).join(", ")}`);
      return;
    }

    await onSubmit({
      templateId: selectedTemplate.id,
      fieldValues,
    });
  };

  const inputType = (type: string) => {
    if (type === "email") return "email";
    if (type === "phone") return "tel";
    if (type === "date") return "date";
    return "text";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Selection */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Select Template
        </p>
        <div className="grid gap-2">
          {templates.map((template) => {
            const active = selectedTemplate?.id === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-[13px] font-medium ${active ? "text-slate-900" : "text-slate-700"}`}>
                      {template.name}
                    </p>
                    <p className="flex items-center gap-1 text-[12px] text-slate-400">
                      {template.sourceType === "docx" ? (
                        <Upload className="h-3 w-3" />
                      ) : (
                        <LinkIcon className="h-3 w-3" />
                      )}
                      {template.fields.length} fields
                    </p>
                  </div>
                </div>
                {active && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Field Inputs */}
      {selectedTemplate && (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Proposal Details
          </p>
          <div className="space-y-3">
            {selectedTemplate.fields.map((field) => (
              <div key={field.id}>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  {field.name}
                  {field.required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>
                <input
                  type={inputType(field.type)}
                  value={fieldValues[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.type === "date" ? "" : field.name}
                  required={field.required}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!selectedTemplate || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? "Creating..." : "Create proposal"}
        </button>
      </div>
    </form>
  );
}
