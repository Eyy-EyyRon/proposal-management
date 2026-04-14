"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { TemplateFormEnhanced } from "@/components/template-form-enhanced";
import { Topbar } from "@/components/topbar";
import { ArrowLeft } from "lucide-react";

export default function NewTemplatePage() {
  const router = useRouter();

  const handleSubmit = (data: any) => {
    console.log("Creating template:", data);
    // TODO: Save to Firestore
    // TODO: Upload DOCX to Firebase Storage if applicable
    router.push("/dashboard/templates");
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

        {/* Form */}
        <div className="flex-1 rounded-xl border border-slate-200/80 bg-white p-6">
          <TemplateFormEnhanced onSubmit={handleSubmit} />
        </div>
      </div>
    </main>
  );
}
