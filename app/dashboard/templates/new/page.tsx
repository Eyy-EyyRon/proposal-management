"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TemplateFormEnhanced } from "@/components/template-form-enhanced";
import { Topbar } from "@/components/topbar";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { createTemplate, updateTemplate } from "@/lib/firestore";
import { uploadTemplateFile } from "@/lib/storage";

export default function NewTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    name: string;
    sourceType: "docx" | "gdocs";
    sourceValue: string;
    fields: { id: string; name: string; type: string; required: boolean }[];
    file: File | null;
    extractedPlaceholders: string[];
  }) => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create the Firestore doc first to get the template ID
      const templateId = await createTemplate({
        userId: user.uid,
        name: data.name,
        type: data.sourceType === "docx" ? "docx" : "gdoc",
        fileUrl: null,
        filePath: null,
        gdocUrl: data.sourceType === "gdocs" ? data.sourceValue : null,
        dynamicFields: data.extractedPlaceholders,
        fields: data.fields.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type as "text" | "email" | "phone" | "date",
          required: f.required,
        })),
      });

      // 2. Upload the .docx file to Storage + update Firestore doc
      if (data.sourceType === "docx" && data.file) {
        const result = await uploadTemplateFile(user.uid, templateId, data.file);
        await updateTemplate(templateId, {
          fileUrl: result.url,
          filePath: result.path,
        });
      }

      router.push("/dashboard/templates");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create template";
      setError(message);
      console.error("Template creation error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Create Template" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div>
          <Link
            href="/dashboard/templates"
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to templates
          </Link>
          <h2 className="font-sans text-lg font-semibold text-slate-900">
            New template
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Upload a document or link a Google Doc, then define fields for proposals.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="flex-1 rounded-xl border border-slate-200/80 bg-white p-6">
          <TemplateFormEnhanced onSubmit={handleSubmit} submitting={submitting} />
        </div>
      </div>
    </main>
  );
}
