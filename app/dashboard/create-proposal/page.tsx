"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProposalForm } from "@/components/proposal-form";
import { Topbar } from "@/components/topbar";
import { 
  ArrowLeft, Check, Copy, ExternalLink, Loader2, Mail, 
  Crown, User, Shield
} from "lucide-react";
import { useAuth, useRole } from "@/contexts/auth-context";
import { 
  getUserTemplates, getAllTemplates, createProposal, getOrgSettings, getAvailableIdentities,
  type Template, type OrgSettings, type TeamMember 
} from "@/lib/firestore";

export default function CreateProposalPage() {
  const { user, profile } = useAuth();
  const { role } = useRole();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [lastClientEmail, setLastClientEmail] = useState("");
  const [lastClientName, setLastClientName] = useState("");
  const [lastTemplateName, setLastTemplateName] = useState("");
  
  // Delegated Authority state
  const [availableIdentities, setAvailableIdentities] = useState<TeamMember[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<string>("self"); // "self" or userId of CEO
  const [isDelegated, setIsDelegated] = useState(false);

  // Fetch user's templates, org settings, and available identities (for delegation)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, settings, identities] = await Promise.all([
          // Staff sees all templates; admins/CEO see only their own + all
          role === "staff" ? getAllTemplates() : getUserTemplates(user.uid),
          getOrgSettings(user.uid),
          getAvailableIdentities(user.uid),
        ]);
        if (!cancelled) {
          setTemplates(data);
          setOrgSettings(settings);
          setAvailableIdentities(identities);
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSubmit = async (data: { templateId: string; fieldValues: Record<string, string>; accessCode?: string }) => {
    if (!user || !profile) return;
    setSubmitting(true);
    setError(null);

    try {
      // Generate UUID v4 as the proposal ID / share token
      const proposalId = crypto.randomUUID();

      // Find the selected template for metadata
      const template = templates.find((t) => t.id === data.templateId);

      // Derive client name and email from fieldValues
      const clientName =
        data.fieldValues[Object.keys(data.fieldValues).find((k) => {
          const field = template?.fields.find((f) => f.id === k);
          return field?.name.toLowerCase().includes("name");
        }) ?? ""] || "Client";

      const clientEmail =
        data.fieldValues[Object.keys(data.fieldValues).find((k) => {
          const field = template?.fields.find((f) => f.id === k);
          return field?.type === "email" || field?.name.toLowerCase().includes("email");
        }) ?? ""] || "";

      // Determine owner and sender based on identity selection
      const isSendingOnBehalf = selectedIdentity !== "self" && availableIdentities.length > 0;
      const ownerId = isSendingOnBehalf ? selectedIdentity : user.uid;
      const sentById = user.uid;
      
      // Get the appropriate org settings (CEO's settings if delegated)
      let senderOrgSettings = orgSettings;
      if (isSendingOnBehalf) {
        senderOrgSettings = await getOrgSettings(ownerId);
      }

      await createProposal(proposalId, {
        ownerId,
        sentById,
        isDelegated: isSendingOnBehalf,
        department: profile?.department ?? "Sales",
        templateId: data.templateId,
        templateName: template?.name ?? "Unknown",
        templateFileUrl: template?.fileUrl ?? null,
        templateGdocUrl: template?.gdocUrl ?? null,
        clientName,
        clientEmail,
        fieldValues: data.fieldValues,
        accessCode: data.accessCode ?? null,
      });

      const url = `${window.location.origin}/p/${proposalId}`;
      setShareUrl(url);
      setLastClientEmail(clientEmail);
      setLastClientName(clientName);
      setLastTemplateName(template?.name ?? "");
      setIsDelegated(isSendingOnBehalf);

      // Auto-copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }

      // Send notification to CEO if this was sent on their behalf
      if (isSendingOnBehalf) {
        try {
          await fetch("/api/notify-delegation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proposalId,
              ceoId: ownerId,
              staffName: `${profile.firstName} ${profile.lastName}`,
              clientName,
              templateName: template?.name ?? "Proposal",
            }),
          });
        } catch (notifyErr) {
          console.error("Failed to notify CEO:", notifyErr);
          // Don't fail the whole operation if notification fails
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create proposal";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Success State ─────────────────────────────────────────
  if (shareUrl) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Create Proposal" />

        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>

            <h2 className="mt-4 font-sans text-lg font-semibold text-slate-900">
              Proposal created
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Share this link with your client to view and sign.
            </p>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto text-[13px] text-slate-600">
                  {shareUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Delegation Notice */}
          {isDelegated && (
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
              <div className="flex items-center gap-2 text-[12px] text-violet-700">
                <Crown className="h-3.5 w-3.5" />
                <span>Sent on behalf of CEO identity</span>
              </div>
            </div>
          )}

          {/* Send via Email */}
            {lastClientEmail && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <button
                  onClick={async () => {
                    setEmailSending(true);
                    try {
                      // Determine sender name and branding based on delegation
                      const isDelegatedSend = isDelegated && selectedIdentity !== "self";
                      const identityOwner = isDelegatedSend 
                        ? availableIdentities.find(i => i.id === selectedIdentity)
                        : null;
                      
                      const senderName = isDelegatedSend && identityOwner
                        ? `${identityOwner.firstName} ${identityOwner.lastName}`
                        : profile ? `${profile.firstName} ${profile.lastName}` : "";
                      
                      // Use CEO's org settings if delegated
                      let senderOrgSettings = orgSettings;
                      if (isDelegatedSend && selectedIdentity !== "self") {
                        senderOrgSettings = await getOrgSettings(selectedIdentity);
                      }

                      const res = await fetch("/api/send-proposal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          to: lastClientEmail,
                          clientName: lastClientName,
                          proposalUrl: shareUrl,
                          templateName: lastTemplateName,
                          senderName,
                          companyName: senderOrgSettings?.companyName || profile?.companyName || "",
                          emailSignature: senderOrgSettings?.emailSignature || "",
                          companyLogoUrl: senderOrgSettings?.companyLogoUrl || null,
                        }),
                      });
                      if (res.ok) {
                        setEmailSent(true);
                      } else {
                        const data = await res.json();
                        setError(data.error || "Failed to send email");
                      }
                    } catch {
                      setError("Failed to send email");
                    } finally {
                      setEmailSending(false);
                    }
                  }}
                  disabled={emailSending || emailSent}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {emailSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : emailSent ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  {emailSending ? "Sending…" : emailSent ? `Sent to ${lastClientEmail}` : `Send via email to ${lastClientEmail}`}
                </button>
              </div>
            )}

            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => {
                  setShareUrl(null);
                  setCopied(false);
                  setEmailSent(false);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Create another
              </button>
              <Link
                href="/dashboard/proposals"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
              >
                View proposals
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── Form State ────────────────────────────────────────────

  // Map Template → ProposalForm template shape
  const formTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    sourceType: t.type === "docx" ? ("docx" as const) : ("gdocs" as const),
    fields: t.fields,
  }));

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(120,1,22,0.06),transparent_42%),linear-gradient(180deg,#f8fafc_0%,#fdfdfd_100%)]">
      <Topbar title="Create Proposal" />

      <div className="flex flex-1 justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl space-y-5">
          <div className="space-y-5">
            {/* Header */}
            <Link
              href="/dashboard/proposals"
              className="group mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to proposals
            </Link>
            <h2 className="font-sans text-lg font-semibold text-slate-900">
              New proposal
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Select a template and fill in client details.
            </p>
          </div>

          {error && (
            <div className="max-w-2xl rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
              {error}
            </div>
          )}

          {/* Identity Selection (for delegated users) */}
          {availableIdentities.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-violet-600" />
                <h3 className="text-[13px] font-semibold text-slate-900">Send Identity</h3>
              </div>
              <p className="text-[12px] text-slate-500 mb-3">
                You are authorized to send proposals on behalf of these identities:
              </p>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  selectedIdentity === "self" 
                    ? "border-violet-300 bg-violet-50" 
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                  <input
                    type="radio"
                    name="identity"
                    value="self"
                    checked={selectedIdentity === "self"}
                    onChange={(e) => setSelectedIdentity(e.target.value)}
                    className="h-4 w-4 text-violet-600"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">Myself</p>
                      <p className="text-[11px] text-slate-500">{profile?.firstName} {profile?.lastName}</p>
                    </div>
                  </div>
                </label>
                
                {availableIdentities.map((identity) => (
                  <label 
                    key={identity.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      selectedIdentity === identity.id 
                        ? "border-violet-300 bg-violet-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="identity"
                      value={identity.id}
                      checked={selectedIdentity === identity.id}
                      onChange={(e) => setSelectedIdentity(e.target.value)}
                      className="h-4 w-4 text-violet-600"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-600">
                        <Crown className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-900">
                          {identity.firstName} {identity.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500">CEO · {identity.email}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                {selectedIdentity === "self" 
                  ? "Your name and branding will appear to the client."
                  : "The CEO's name, company branding, and email signature will appear to the client. You'll be listed as the sender internally."}
              </p>
            </div>
          )}

          {/* Form */}
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : formTemplates.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[13px] font-medium text-slate-700">No templates yet</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  <Link href="/dashboard/templates/new" className="text-slate-900 underline underline-offset-2">
                    Create a template
                  </Link>{" "}
                  first, then come back to create a proposal.
                </p>
              </div>
            ) : (
              <ProposalForm templates={formTemplates} onSubmit={handleSubmit} submitting={submitting} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
