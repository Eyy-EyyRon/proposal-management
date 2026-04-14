"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, X, Check, AlertCircle, Download, Pen, Upload, Image } from "lucide-react";

type SignatureMode = "draw" | "upload";

interface ProposalData {
  id: string;
  templateName: string;
  fieldValues: Record<string, string>;
  status: "Sent" | "Viewed" | "Accepted" | "Rejected";
  pdfUrl?: string;
  createdAt: string;
}

export default function ProposalPortalPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("draw");
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    // In production, fetch from Firestore using shareToken
    const fetchProposal = async () => {
      try {
        // Mock data for now
        const mockProposal: ProposalData = {
          id: "1",
          templateName: "Standard Service Agreement",
          fieldValues: {
            "Client Name": "John Doe",
            "Email": "john@example.com",
            "Phone": "+1 234 567 8900",
            "Company": "Acme Corp",
          },
          status: "Sent",
          pdfUrl: "/sample-proposal.pdf", // Mock PDF URL
          createdAt: "Apr 15, 2026",
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProposal(mockProposal);
        setLoading(false);
        
        // Update status to "Viewed"
        setProposal(prev => prev ? { ...prev, status: "Viewed" } : null);
      } catch (err) {
        setError("Proposal not found or has expired");
        setLoading(false);
      }
    };

    if (params.shareToken) {
      fetchProposal();
    }
  }, [params.shareToken]);

  const handleAccept = async () => {
    if (!signature) {
      alert("Please provide your signature");
      return;
    }

    // TODO: Save signature to Firebase Storage
    // TODO: Update proposal status in Firestore
    setProposal(prev => prev ? { ...prev, status: "Accepted" } : null);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    // TODO: Update proposal status in Firestore
    setProposal(prev => prev ? { ...prev, status: "Rejected" } : null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = e.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = e.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = document.getElementById("signature-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const saveSignature = () => {
    const canvas = document.getElementById("signature-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setSignature(dataUrl);
    setShowSignature(false);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignature(event.target?.result as string);
      setShowSignature(false);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="mt-4 font-sans text-sm text-slate-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-4 font-sans text-xl font-semibold text-slate-900">
            Proposal Not Found
          </h2>
          <p className="mt-2 font-sans text-sm text-slate-600">
            {error || "This proposal link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  if (proposal.status === "Accepted") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="mt-4 font-sans text-xl font-semibold text-slate-900">
            Proposal Accepted
          </h2>
          <p className="mt-2 font-sans text-sm text-slate-600">
            Thank you! Your signature has been recorded.
          </p>
        </div>
      </div>
    );
  }

  if (proposal.status === "Rejected") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-4 font-sans text-xl font-semibold text-slate-900">
            Proposal Rejected
          </h2>
          <p className="mt-2 font-sans text-sm text-slate-600">
            Your feedback has been received. We'll be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="font-sans text-lg font-semibold text-slate-900">
                  {proposal.templateName}
                </h1>
                <p className="text-xs text-slate-500">Sent on {proposal.createdAt}</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 font-sans text-lg font-semibold text-slate-900">
                Proposal Document
              </h2>
              
              {/* In production, embed actual PDF viewer */}
              <div className="aspect-[8.5/11] rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FileText className="mx-auto h-16 w-16 text-slate-400" />
                <p className="mt-4 font-sans text-sm text-slate-600">
                  PDF preview would appear here
                </p>
                <p className="mt-1 font-sans text-xs text-slate-500">
                  In production, this will display the actual proposal PDF
                </p>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {/* Proposal Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 font-sans text-base font-semibold text-slate-900">
                Proposal Details
              </h3>
              <dl className="space-y-3">
                {Object.entries(proposal.fieldValues).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs font-medium text-slate-500">{key}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Signature */}
            {!showSignature && !signature ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-sans text-base font-semibold text-slate-900">
                  Your Response
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowSignature(true)}
                    className="w-full rounded-xl bg-green-600 px-4 py-3 font-sans text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    Accept & Sign
                  </button>
                  <button
                    onClick={() => setShowSignature(false)}
                    className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            ) : showSignature ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-sans text-base font-semibold text-slate-900">
                  Provide Your Signature
                </h3>

                {/* Mode Selector */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("draw")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      signatureMode === "draw"
                        ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Pen className="h-3.5 w-3.5" />
                    Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("upload")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      signatureMode === "upload"
                        ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Image className="h-3.5 w-3.5" />
                    Upload Image
                  </button>
                </div>

                {signatureMode === "draw" ? (
                  <>
                    <canvas
                      id="signature-canvas"
                      width={280}
                      height={140}
                      className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={clearSignature}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={saveSignature}
                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                      >
                        Save Signature
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition hover:border-indigo-400 hover:bg-indigo-50/50">
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        Click to upload signature image
                      </span>
                      <span className="text-xs text-slate-500">
                        PNG, JPG or GIF (MAX. 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSignatureUpload}
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-sans text-base font-semibold text-slate-900">
                  Signature Preview
                </h3>
                {signature && (
                  <img
                    src={signature}
                    alt="Signature"
                    className="mb-4 w-full rounded-lg border border-slate-200 bg-white p-2"
                  />
                )}
                <button
                  onClick={() => {
                    setSignature(null);
                    setShowSignature(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Change Signature
                </button>
              </div>
            )}

            {/* Reject Reason */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 font-sans text-base font-semibold text-slate-900">
                Request Changes
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please let us know what changes you'd like to see..."
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Feedback
              </button>
            </div>

            {/* Submit Actions */}
            {signature && (
              <button
                onClick={handleAccept}
                className="w-full rounded-xl bg-green-600 px-4 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:bg-green-700"
              >
                Submit Acceptance
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
