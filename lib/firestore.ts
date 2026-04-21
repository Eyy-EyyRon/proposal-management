import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  type Timestamp,
} from "firebase/firestore";
import { db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

// ─── TYPES ───────────────────────────────────────────────────
export interface TemplateField {
  id: string;
  name: string;
  type: "text" | "email" | "phone" | "date";
  required: boolean;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: "docx" | "gdoc";
  fileUrl: string | null;
  filePath: string | null;
  gdocUrl: string | null;
  dynamicFields: string[];
  fields: TemplateField[];
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Template Sandbox (Scenario 8)
  isPublished: boolean;       // false = Draft, invisible to staff
  publishedAt: Timestamp | null;
  publishedBy: string | null; // UID of who published
}

// ─── TEMPLATES ───────────────────────────────────────────────

// ─── TEMPLATE SANDBOX ────────────────────────────────────────

export async function publishTemplate(
  templateId: string,
  publishedByUid: string
): Promise<void> {
  await updateDoc(doc(db, "templates", templateId), {
    isPublished: true,
    publishedAt: serverTimestamp(),
    publishedBy: publishedByUid,
    updatedAt: serverTimestamp(),
  });
}

// unpublishTemplate is defined in the CEO Defensive Architecture section below
// with full audit logging support.

export async function createTemplate(data: {
  userId: string;
  name: string;
  type: "docx" | "gdoc";
  fileUrl?: string | null;
  filePath?: string | null;
  gdocUrl?: string | null;
  dynamicFields: string[];
  fields: TemplateField[];
}): Promise<string> {
  const docRef = await addDoc(collection(db, "templates"), {
    userId: data.userId,
    name: data.name,
    description: null,
    type: data.type,
    fileUrl: data.fileUrl ?? null,
    filePath: data.filePath ?? null,
    gdocUrl: data.gdocUrl ?? null,
    dynamicFields: data.dynamicFields,
    fields: data.fields,
    isDeleted: false,
    deletedAt: null,
    isPublished: true,
    publishedAt: null,
    publishedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserTemplates(userId: string): Promise<Template[]> {
  const q = query(
    collection(db, "templates"),
    where("userId", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Template[];
}

export async function getTemplate(templateId: string): Promise<Template | null> {
  const snap = await getDoc(doc(db, "templates", templateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Template;
}

export async function updateTemplate(
  templateId: string,
  data: Partial<Pick<Template, "fileUrl" | "filePath" | "name" | "description">>
): Promise<void> {
  await updateDoc(doc(db, "templates", templateId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function trashTemplate(templateId: string): Promise<void> {
  await updateDoc(doc(db, "templates", templateId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── ORGANIZATION SETTINGS ───────────────────────────────────

export interface OrgSettings {
  companyName: string;
  companyLogoUrl: string | null;
  emailSignature: string;
  updatedAt: Timestamp;
}

export async function getOrgSettings(userId: string): Promise<OrgSettings | null> {
  const snap = await getDoc(doc(db, "orgSettings", userId));
  if (!snap.exists()) return null;
  return snap.data() as OrgSettings;
}

export async function saveOrgSettings(
  userId: string,
  data: { companyName: string; companyLogoUrl: string | null; emailSignature: string }
): Promise<void> {
  await setDoc(doc(db, "orgSettings", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ─── PROPOSAL TYPES ─────────────────────────────────────────

export type ProposalStatus =
  | "sent" | "viewed" | "accepted" | "rejected" | "archived" | "superseded" | "void"
  | "pending_ceo_approval"
  // Task workflow states
  | "tasked"            // CEO assigned to admin; no draft yet
  | "drafting"          // Staff is building the document
  | "verifying"         // Staff submitted; awaiting Dept Admin review
  | "revision_requested"// Admin sent back for edits (replaces old changes_requested)
  | "ready_to_send";    // Dept Admin verified; waiting in CEO Talking Inbox

export type ProposalType = "direct" | "tasked"; // direct = normal send; tasked = part of delegation chain

export interface Proposal {
  id: string;
  // Delegated Authority fields
  ownerId: string;    // The UID of the identity used (e.g., CEO) — for branding/signatures
  sentById: string;   // The UID of the actual person who triggered the send
  actorId?: string;   // The UID of the real human who made the write (when actingAsCeo, actorId !== ownerId)
  isDelegated: boolean; // true when actorId differs from ownerId
  // Original field (deprecated, use ownerId/sentById)
  userId: string;
  department: string;
  templateId: string;
  templateName: string;
  templateFileUrl: string | null;
  templateGdocUrl: string | null;
  // Template snapshot — deep copy stored at creation time (Scenario 13)
  templateSnapshot?: {
    fields: Array<{ id: string; name: string; type: string; required: boolean }>;
    description?: string | null;
  } | null;
  clientName: string;
  clientEmail: string;
  fieldValues: Record<string, string>;
  status: ProposalStatus;
  accessCode: string | null;
  signatureType: "draw" | "upload" | null;
  signatureUrl: string | null;
  signedAt: Timestamp | null;
  viewedAt: Timestamp | null;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Versioning fields
  version: number;
  previousVersionId: string | null;
  nextVersionId?: string | null;
  // Status Lockdown (Scenario 10)
  isSignable: boolean;      // false on archive/trash — blocks zombie signatures
  isCommentable: boolean;   // false on archive/trash — closes discussion thread
  // Signature Delegation (Client Scenario 4)
  forwardedSignerName?: string | null;
  forwardedSignerEmail?: string | null;
  forwardedAt?: unknown | null;
  // Versioning Engine (Enterprise Overhaul)
  isLatest: boolean;         // true only on the head version; false on all superseded/voided versions
  // Sensitivity Shield (CEO Scenario)
  isPrivate: boolean;        // true = only root CEO (and authorizedDelegates) can see
  authorizedDelegates?: string[]; // UIDs explicitly granted access to this private proposal by CEO
  // Multidepartmental Sharing
  sharedWith?: string[];     // dept IDs granted View/Collaborate rights
  originDepartmentId: string; // Source of truth: the department that created this proposal
  accessLevel?: "view_only" | "collaborative"; // Sharing access level
  searchKeywords?: string[]; // Flattened metadata for cross-dept indexed search
  // Threshold Alerts (CEO Approval Hold)
  holdReason?: string | null;
  holdTriggeredBy?: string | null;
  holdReleasedBy?: string | null;
  holdReleasedAt?: unknown | null;
  // Task Workflow Linkage
  proposalType?: ProposalType;       // "tasked" = part of delegation chain
  taskId?: string | null;             // Reference to the parent tasks/{taskId} doc
  urgency?: "p1" | "p2" | "p3" | null; // Inherited from task on creation
  dueAt?: unknown | null;             // SLA deadline (inherited from task)
  verifyingAdminId?: string | null;   // The DA who owns this verification
  verifyingAdminName?: string | null;
  revisionNote?: string | null;       // Admin's feedback when status = revision_requested
  // Immutable Document Seal (Post-Signature)
  contentHash?: string | null;        // SHA-256 of document content at signing time
  signerIp?: string | null;           // Signer's IP address
  transactionId?: string | null;      // Unique TX ID = SHA-256 of (proposalId + signedAt + signerIp)
  auditSeal?: {
    transactionId: string;
    contentHash: string;
    signerIp: string;
    signedAtUtc: string;
    signerName: string;
  } | null;
  signedPdfUrl?: string | null;       // URL to the frozen PDF in Firebase Storage
}

// ─── SEARCH KEYWORDS BUILDER ─────────────────────────────────
// Flattened array of lowercased tokens for cross-dept indexed searching
function buildSearchKeywords(meta: {
  clientName: string;
  clientEmail: string;
  templateName: string;
  department: string;
}): string[] {
  const tokens = new Set<string>();
  const add = (s: string) => {
    if (!s) return;
    tokens.add(s.toLowerCase());
    s.toLowerCase().split(/\s+/).forEach((w) => { if (w) tokens.add(w); });
  };
  add(meta.clientName);
  add(meta.clientEmail);
  add(meta.templateName);
  add(meta.department);
  return Array.from(tokens);
}

// ─── PROPOSALS SUMMARY (Lightweight Dashboard) ──────────────
// ~1KB snapshot for the dashboard list; avoids fetching heavy content
export interface ProposalSummary {
  id: string;
  clientName: string;
  clientEmail: string;
  templateName: string;
  department: string;
  originDepartmentId: string;
  status: string;
  sharedWith: string[];
  isPrivate: boolean;
  isDeleted: boolean;
  isDelegated: boolean;
  ownerId: string;
  sentById: string;
  version: number;
  isLatest: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function writeProposalSummary(
  proposalId: string,
  data: Omit<ProposalSummary, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  await setDoc(doc(db, "proposals_summary", proposalId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProposalSummary(
  proposalId: string,
  data: Partial<ProposalSummary>
): Promise<void> {
  // Strip id if present
  const { id: _id, ...rest } = data;
  void _id;
  await updateDoc(doc(db, "proposals_summary", proposalId), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

// ─── SHARED WITH ME SUBSCRIPTION ─────────────────────────────
// Subscribes to proposals shared with a specific department (for the "Shared with Me" tab)
export function subscribeToSharedWithMeProposals(
  department: string,
  callback: (proposals: Proposal[], hasMore: boolean) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("sharedWith", "array-contains", department),
    where("isDeleted", "==", false),
    where("isPrivate", "==", false),
    orderBy("createdAt", "desc"),
    firestoreLimit(PROPOSALS_PAGE_SIZE)
  );
  return onSnapshot(
    q,
    (s) => {
      callback(
        s.docs.map((d) => ({ id: d.id, ...d.data() }) as Proposal),
        s.docs.length >= PROPOSALS_PAGE_SIZE
      );
    },
    (e) => { if (e.code !== "permission-denied") console.error(e); }
  );
}

// Load more shared-with-me proposals (pagination)
export async function loadMoreSharedWithMeProposals(
  department: string,
  lastCreatedAtSeconds: number
): Promise<{ proposals: Proposal[]; hasMore: boolean }> {
  const q = query(
    collection(db, "proposals"),
    where("sharedWith", "array-contains", department),
    where("isDeleted", "==", false),
    where("isPrivate", "==", false),
    orderBy("createdAt", "desc"),
    startAfter(new Date(lastCreatedAtSeconds * 1000)),
    firestoreLimit(PROPOSALS_PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return {
    proposals: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Proposal),
    hasMore: snap.docs.length >= PROPOSALS_PAGE_SIZE,
  };
}

// ─── PROPOSALS ───────────────────────────────────────────────

export async function createProposal(
  proposalId: string,
  data: {
    ownerId: string;
    sentById: string;
    actorId?: string;  // real writer UID when actingAsCeo; omit if actor === owner
    isDelegated: boolean;
    department: string;
    templateId: string;
    templateName: string;
    templateFileUrl?: string | null;
    templateGdocUrl?: string | null;
    templateSnapshot?: { fields: Array<{ id: string; name: string; type: string; required: boolean }>; description?: string | null } | null;
    clientName: string;
    clientEmail: string;
    fieldValues: Record<string, string>;
    accessCode?: string | null;
    version?: number;
    previousVersionId?: string | null;
  }
): Promise<void> {
  // Build searchKeywords for cross-dept indexed searching
  const searchKeywords = buildSearchKeywords({
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    templateName: data.templateName,
    department: data.department,
  });

  await setDoc(doc(db, "proposals", proposalId), {
    // Delegated Authority fields
    ownerId: data.ownerId,
    sentById: data.sentById,
    actorId: data.actorId ?? data.sentById,
    isDelegated: data.isDelegated,
    // Legacy field for backward compatibility
    userId: data.ownerId,
    department: data.department,
    templateId: data.templateId,
    templateName: data.templateName,
    templateFileUrl: data.templateFileUrl ?? null,
    templateGdocUrl: data.templateGdocUrl ?? null,
    templateSnapshot: data.templateSnapshot ?? null,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    fieldValues: data.fieldValues,
    accessCode: data.accessCode ?? null,
    status: "sent",
    signatureType: null,
    signatureUrl: null,
    signedAt: null,
    viewedAt: null,
    isDeleted: false,
    deletedAt: null,
    isSignable: true,
    isCommentable: true,
    isLatest: true,
    isPrivate: false,
    sharedWith: [],
    originDepartmentId: data.department,
    accessLevel: "view_only",
    searchKeywords,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Versioning fields
    version: data.version ?? 1,
    previousVersionId: data.previousVersionId ?? null,
    nextVersionId: null,
  });

  // Write lightweight summary for the performance dashboard
  writeProposalSummary(proposalId, {
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    templateName: data.templateName,
    department: data.department,
    originDepartmentId: data.department,
    status: "sent",
    sharedWith: [],
    isPrivate: false,
    isDeleted: false,
    isDelegated: data.isDelegated,
    ownerId: data.ownerId,
    sentById: data.sentById,
    version: data.version ?? 1,
    isLatest: true,
  }).catch(() => {});

  incrementGlobalStats("totalProposals").catch(() => {});
  incrementGlobalStats("totalSent").catch(() => {});
}

// Get proposal with full history (all versions)
export async function getProposalHistory(proposalId: string): Promise<Proposal[]> {
  const history: Proposal[] = [];
  let currentId: string | null = proposalId;
  
  while (currentId) {
    const snap = await getDoc(doc(db, "proposals", currentId));
    if (!snap.exists()) break;
    
    const proposal = { id: snap.id, ...snap.data() } as Proposal;
    history.push(proposal);
    currentId = proposal.previousVersionId;
  }
  
  return history.reverse(); // Oldest first
}

// Create a new version of an existing proposal
// Marks the old version as "superseded" and links the versions bidirectionally
export async function createProposalRevision(
  newProposalId: string,
  currentProposal: Proposal,
  updates: {
    fieldValues?: Record<string, string>;
    templateFileUrl?: string | null;
    templateGdocUrl?: string | null;
    templateId?: string;
    templateName?: string;
    templateSnapshot?: { fields: Array<{ id: string; name: string; type: string; required: boolean }>; description?: string | null } | null;
  }
): Promise<void> {
  const newVersionNum = (currentProposal.version || 1) + 1;

  const tplName = updates.templateName ?? currentProposal.templateName;
  const searchKeywords = buildSearchKeywords({
    clientName: currentProposal.clientName,
    clientEmail: currentProposal.clientEmail,
    templateName: tplName,
    department: currentProposal.department,
  });

  // Create the new version document
  await setDoc(doc(db, "proposals", newProposalId), {
    ownerId: currentProposal.ownerId,
    sentById: currentProposal.sentById,
    isDelegated: currentProposal.isDelegated,
    userId: currentProposal.ownerId,
    department: currentProposal.department,
    templateId: updates.templateId ?? currentProposal.templateId,
    templateName: tplName,
    templateFileUrl: updates.templateFileUrl ?? currentProposal.templateFileUrl,
    templateGdocUrl: updates.templateGdocUrl ?? currentProposal.templateGdocUrl,
    // Always carry forward the template snapshot (deep copy protection)
    templateSnapshot: updates.templateSnapshot ?? currentProposal.templateSnapshot ?? null,
    clientName: currentProposal.clientName,
    clientEmail: currentProposal.clientEmail,
    fieldValues: updates.fieldValues ?? currentProposal.fieldValues,
    accessCode: null,
    status: "sent",
    signatureType: null,
    signatureUrl: null,
    signedAt: null,
    viewedAt: null,
    isDeleted: false,
    deletedAt: null,
    isSignable: true,
    isCommentable: true,
    isLatest: true,
    isPrivate: currentProposal.isPrivate ?? false,
    sharedWith: currentProposal.sharedWith ?? [],
    originDepartmentId: currentProposal.originDepartmentId ?? currentProposal.department,
    accessLevel: currentProposal.accessLevel ?? "view_only",
    searchKeywords,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: newVersionNum,
    previousVersionId: currentProposal.id,
    nextVersionId: null,
  });

  // Write lightweight summary
  writeProposalSummary(newProposalId, {
    clientName: currentProposal.clientName,
    clientEmail: currentProposal.clientEmail,
    templateName: tplName,
    department: currentProposal.department,
    originDepartmentId: currentProposal.originDepartmentId ?? currentProposal.department,
    status: "sent",
    sharedWith: currentProposal.sharedWith ?? [],
    isPrivate: currentProposal.isPrivate ?? false,
    isDeleted: false,
    isDelegated: currentProposal.isDelegated,
    ownerId: currentProposal.ownerId,
    sentById: currentProposal.sentById,
    version: newVersionNum,
    isLatest: true,
  }).catch(() => {});

  // Mark the old version as superseded and store forward link; it is no longer latest
  await updateDoc(doc(db, "proposals", currentProposal.id), {
    status: "superseded",
    nextVersionId: newProposalId,
    isLatest: false,
    updatedAt: serverTimestamp(),
  });

  // Add system comment about the revision
  await addDoc(collection(db, "proposals", newProposalId, "comments"), {
    text: `Document revised to Version ${newVersionNum}. Previous version has been superseded.`,
    authorRole: "system",
    authorName: "System",
    isDeleted: false,
    createdAt: serverTimestamp(),
  });
}

// Update multi-dept sharing — Admins can grant collaborator depts view/comment rights
export async function updateProposalSharing(
  proposalId: string,
  sharedWith: string[],
  accessLevel: "view_only" | "collaborative" = "view_only"
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    sharedWith,
    accessLevel,
    updatedAt: serverTimestamp(),
  });
  // Keep summary in sync
  updateProposalSummary(proposalId, { sharedWith }).catch(() => {});
}

// Toggle sensitivity shield — CEO-only: marks/unmarks a proposal as private.
// When un-privatising, the authorizedDelegates list is cleared (no longer needed).
export async function updateProposalPrivacy(
  proposalId: string,
  isPrivate: boolean
): Promise<void> {
  const data: Record<string, unknown> = { isPrivate, updatedAt: serverTimestamp() };
  if (!isPrivate) data.authorizedDelegates = [];
  await updateDoc(doc(db, "proposals", proposalId), data);
  updateProposalSummary(proposalId, { isPrivate }).catch(() => {});
}

// Grant a Super Admin UID access to a specific private proposal (CEO-only).
export async function grantPrivateAccess(
  proposalId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    authorizedDelegates: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

// Revoke a previously-granted delegate's access to a private proposal (CEO-only).
export async function revokePrivateAccess(
  proposalId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    authorizedDelegates: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });
}

// Get proposals where user is either owner (identity used) or sender (actual sender)
export async function getUserProposals(userId: string): Promise<Proposal[]> {
  // Query for proposals where user is owner or sender
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Proposal)
    .filter((p) => p.ownerId === userId || p.sentById === userId);
}

export function subscribeToProposals(
  userId: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  // Query 1: proposals where user is owner
  const q1 = query(
    collection(db, "proposals"),
    where("ownerId", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  
  // Query 2: proposals where user is sender (and not owner to avoid duplicates)
  const q2 = query(
    collection(db, "proposals"),
    where("sentById", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  
  let proposals1: Proposal[] = [];
  let proposals2: Proposal[] = [];
  
  const mergeAndDedupe = () => {
    const merged = [...proposals1, ...proposals2];
    const deduped = merged.filter((p, i, arr) => 
      arr.findIndex(t => t.id === p.id) === i
    );
    callback(deduped.sort((a, b) => {
      const aTime = (a.createdAt?.seconds ?? 0) * 1000;
      const bTime = (b.createdAt?.seconds ?? 0) * 1000;
      return bTime - aTime;
    }));
  };
  
  const unsub1 = onSnapshot(
    q1, 
    (snapshot) => {
      proposals1 = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Proposal);
      mergeAndDedupe();
    },
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
  
  const unsub2 = onSnapshot(
    q2, 
    (snapshot) => {
      proposals2 = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Proposal);
      mergeAndDedupe();
    },
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
  
  return () => { unsub1(); unsub2(); };
}

// ─── PAGINATED SUBSCRIPTIONS (15-item rule) ─────────────────
// Returns the first PAGE_SIZE proposals. Use loadMoreProposals() to fetch the
// next page. The cursor (lastDoc) is returned to the caller.
export const PROPOSALS_PAGE_SIZE = 15;

export function subscribeToPaginatedProposals(
  userId: string,
  callback: (proposals: Proposal[], hasMore: boolean) => void
): () => void {
  const q1 = query(
    collection(db, "proposals"),
    where("ownerId", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc"),
    firestoreLimit(PROPOSALS_PAGE_SIZE)
  );
  const q2 = query(
    collection(db, "proposals"),
    where("sentById", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc"),
    firestoreLimit(PROPOSALS_PAGE_SIZE)
  );

  let snap1: Proposal[] = [];
  let snap2: Proposal[] = [];
  let count1 = 0;
  let count2 = 0;

  const emit = () => {
    const merged = [...snap1, ...snap2];
    const deduped = merged.filter((p, i, a) => a.findIndex(t => t.id === p.id) === i);
    deduped.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    const hasMore = count1 >= PROPOSALS_PAGE_SIZE || count2 >= PROPOSALS_PAGE_SIZE;
    callback(deduped, hasMore);
  };

  const u1 = onSnapshot(q1, (s) => {
    snap1 = s.docs.map(d => ({ id: d.id, ...d.data() }) as Proposal);
    count1 = s.docs.length;
    emit();
  }, (e) => { if (e.code !== "permission-denied") console.error(e); });

  const u2 = onSnapshot(q2, (s) => {
    snap2 = s.docs.map(d => ({ id: d.id, ...d.data() }) as Proposal);
    count2 = s.docs.length;
    emit();
  }, (e) => { if (e.code !== "permission-denied") console.error(e); });

  return () => { u1(); u2(); };
}

export function subscribeToPaginatedProposalsByDepartment(
  department: string,
  callback: (proposals: Proposal[], hasMore: boolean) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("department", "==", department),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc"),
    firestoreLimit(PROPOSALS_PAGE_SIZE)
  );
  return onSnapshot(
    q,
    (s) => {
      callback(
        s.docs.map(d => ({ id: d.id, ...d.data() }) as Proposal),
        s.docs.length >= PROPOSALS_PAGE_SIZE
      );
    },
    (e) => { if (e.code !== "permission-denied") console.error(e); }
  );
}

export async function loadMoreProposals(
  userId: string,
  lastDoc: QueryDocumentSnapshot<DocumentData>,
  byDepartment?: string
): Promise<{ proposals: Proposal[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const base = byDepartment
    ? query(
        collection(db, "proposals"),
        where("department", "==", byDepartment),
        where("isDeleted", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        firestoreLimit(PROPOSALS_PAGE_SIZE)
      )
    : query(
        collection(db, "proposals"),
        where("ownerId", "==", userId),
        where("isDeleted", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        firestoreLimit(PROPOSALS_PAGE_SIZE)
      );
  const snap = await getDocs(base);
  return {
    proposals: snap.docs.map(d => ({ id: d.id, ...d.data() }) as Proposal),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  };
}

// Department-based subscription: fetches all proposals for a department
// Used for staff to see all team proposals (not just their own), ensuring
// orphaned proposals from departed employees remain visible (Scenario 15)
export function subscribeToProposalsByDepartment(
  department: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("department", "==", department),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Proposal)),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

// Get proposals by owner (for CEO to see all proposals sent using their identity)
export async function getProposalsByOwner(ownerId: string): Promise<Proposal[]> {
  const q = query(
    collection(db, "proposals"),
    where("ownerId", "==", ownerId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[];
}

export function subscribeToProposalsByOwner(
  ownerId: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("ownerId", "==", ownerId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]);
    },
    (error) => {
      if (error.code !== "permission-denied") console.error(error);
    }
  );
}

// Get proposals by sender (to track who actually sent what)
export async function getProposalsBySender(senderId: string): Promise<Proposal[]> {
  const q = query(
    collection(db, "proposals"),
    where("sentById", "==", senderId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[];
}

export async function getProposal(proposalId: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, "proposals", proposalId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Proposal;
}

export async function markProposalViewed(proposalId: string): Promise<void> {
  const ref = doc(db, "proposals", proposalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.status !== "sent") return; 
  await updateDoc(ref, {
    status: "viewed",
    viewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptProposal(
  proposalId: string,
  signatureType: "draw" | "upload",
  signatureUrl: string,
  auditData?: {
    contentHash: string;
    signerIp: string;
    transactionId: string;
    signedAtUtc: string;
    signerName: string;
  }
): Promise<void> {
  // Guard: only sent/viewed proposals can be accepted (signature zombie prevention)
  const snap = await getDoc(doc(db, "proposals", proposalId));
  if (!snap.exists()) throw new Error("Proposal not found");
  const current = snap.data();
  if (current.status !== "sent" && current.status !== "viewed") {
    throw new Error(`Cannot sign a proposal with status "${current.status}". Only sent or viewed proposals can be signed.`);
  }
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "accepted",
    signatureType,
    signatureUrl,
    signedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(auditData ? {
      contentHash: auditData.contentHash,
      signerIp: auditData.signerIp,
      transactionId: auditData.transactionId,
      auditSeal: {
        transactionId: auditData.transactionId,
        contentHash: auditData.contentHash,
        signerIp: auditData.signerIp,
        signedAtUtc: auditData.signedAtUtc,
        signerName: auditData.signerName,
      },
    } : {}),
  });
  incrementGlobalStats("totalAccepted").catch(() => {});
}

export async function updateProposalSignedPdf(
  proposalId: string,
  signedPdfUrl: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), { signedPdfUrl, updatedAt: serverTimestamp() });
}

// ─── STATS SHARDING (Summary Document) ──────────────────────
// stats/global holds aggregated counters updated on every status change.
// Use incrementGlobalStats() to update; CEO dashboard subscribes to this 1 doc.

const STATS_REF = () => doc(db, "stats", "global");

export type GlobalStatsField =
  | "totalProposals"
  | "totalSent"
  | "totalViewed"
  | "totalAccepted"
  | "totalRejected";

export async function incrementGlobalStats(
  field: GlobalStatsField,
  delta: 1 | -1 = 1
): Promise<void> {
  try {
    await setDoc(
      STATS_REF(),
      { [field]: increment(delta), updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // Non-critical — never block the main operation
  }
}

// ─── ACTIVITY LOGS (Shadow Audit — CEO-eyes-only) ────────────
// Records actorId vs identityId for every delegated action.

export interface ActivityLogEntry {
  id?: string;
  action: string;          // e.g. "comment_deleted", "proposal_sent"
  actorId: string;         // The real UID who performed the action
  actorName: string;       // Display name of real actor
  identityId: string;      // The UID whose identity was used (CEO)
  identityName: string;    // Display name of identity
  isDelegated: boolean;    // true when actorId !== identityId
  targetId?: string;       // proposalId / templateId / etc.
  targetType?: string;
  description: string;     // Human-readable summary shown to CEO
  metadata?: Record<string, unknown>;
  createdAt: unknown;
}

export async function writeActivityLog(
  entry: Omit<ActivityLogEntry, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "activity_logs"), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

// Soft-delete a comment (audit-safe, preserves thread integrity)
// Also writes an activity_log entry so the CEO can see delegated deletes.
export async function softDeleteComment(
  proposalId: string,
  commentId: string,
  actor?: { actorId: string; actorName: string; identityId: string; identityName: string }
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId, "comments", commentId), {
    isDeleted: true,
    deletedText: "[Message deleted]",
    deletedAt: serverTimestamp(),
    deletedByActorId: actor?.actorId ?? null,
    deletedByActorName: actor?.actorName ?? null,
  });

  if (actor && actor.actorId !== actor.identityId) {
    await writeActivityLog({
      action: "comment_deleted",
      actorId: actor.actorId,
      actorName: actor.actorName,
      identityId: actor.identityId,
      identityName: actor.identityName,
      isDelegated: true,
      targetId: proposalId,
      targetType: "proposal",
      description: `${actor.actorName} (acting as ${actor.identityName}) deleted a comment on proposal ${proposalId}.`,
    });
  }
}

// Check if a staff user still has active delegation from a CEO
export async function checkDelegationActive(
  staffUserId: string,
  ceoId: string
): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", ceoId));
  if (!snap.exists()) return false;
  const delegatedIds: string[] = snap.data().delegatedUserIds || [];
  return delegatedIds.includes(staffUserId);
}

export async function rejectProposal(proposalId: string): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
}

export async function archiveProposal(proposalId: string): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "archived",
    isSignable: false,
    isCommentable: false,
    updatedAt: serverTimestamp(),
  });
}

export async function trashProposal(proposalId: string): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    isSignable: false,
    isCommentable: false,
    updatedAt: serverTimestamp(),
  });
}

export async function createNewVersion(
  proposalId: string,
  currentVersion: number,
  updates: {
    templateFileUrl?: string | null;
    templateGdocUrl?: string | null;
    fieldValues?: Record<string, string>;
  }
): Promise<void> {
  const newVersionNum = currentVersion + 1;

  await updateDoc(doc(db, "proposals", proposalId), {
    ...updates,
    version: newVersionNum,
    status: "sent",       
    signatureUrl: null,   
    signatureType: null,
    signedAt: null,
    viewedAt: null,
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "proposals", proposalId, "comments"), {
    text: `Document updated to Version ${newVersionNum}`,
    authorRole: "system",
    authorName: "System",
    createdAt: serverTimestamp(),
  });
}

// ─── TASK WORKFLOW TRANSITIONS (Proposal-level) ─────────────

// Staff → "Submit for Verification": moves proposal to verifying state
export async function submitProposalForVerification(
  proposalId: string,
  staffId: string,
  staffName: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "verifying",
    updatedAt: serverTimestamp(),
  });
  // Internal system comment visible to admin only
  await addDoc(collection(db, "proposals", proposalId, "internal_comments"), {
    text: `${staffName} submitted this draft for admin verification.`,
    authorRole: "system",
    authorName: "System",
    authorId: staffId,
    createdAt: serverTimestamp(),
  });
}

// Admin → "Request Revision": sends proposal back to staff with notes
export async function requestProposalRevision(
  proposalId: string,
  adminId: string,
  adminName: string,
  note: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "revision_requested",
    revisionNote: note,
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, "proposals", proposalId, "internal_comments"), {
    text: `${adminName} requested revision: "${note}"`,
    authorRole: "admin",
    authorName: adminName,
    authorId: adminId,
    createdAt: serverTimestamp(),
  });
}

// Admin → "Verify & Promote": moves proposal to ready_to_send
export async function verifyAndPromoteProposal(
  proposalId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "ready_to_send",
    verifyingAdminId: adminId,
    verifyingAdminName: adminName,
    revisionNote: null,
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, "proposals", proposalId, "internal_comments"), {
    text: `${adminName} verified this proposal — promoted to CEO's Talking Inbox.`,
    authorRole: "system",
    authorName: "System",
    authorId: adminId,
    createdAt: serverTimestamp(),
  });
}

// Subscribe to internal comments for a proposal (staff/admin only)
export function subscribeToInternalComments(
  proposalId: string,
  callback: (comments: Array<{
    id: string;
    text: string;
    authorRole: string;
    authorName: string;
    authorId?: string;
    createdAt: unknown;
  }>) => void
): () => void {
  const q = query(
    collection(db, "proposals", proposalId, "internal_comments"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as {
      id: string;
      text: string;
      authorRole: string;
      authorName: string;
      authorId?: string;
      createdAt: unknown;
    }));
  });
}

// ─── SOFT-DELETE / TRASH ────────────────────────────────────

export async function moveToTrash(
  collectionName: "proposals" | "templates",
  docId: string
): Promise<void> {
  // Identity Lockdown: kill signatures & comments on trashed proposals
  const update: Record<string, unknown> = {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (collectionName === "proposals") {
    update.isSignable = false;
    update.isCommentable = false;
  }
  await updateDoc(doc(db, collectionName, docId), update);
}

export async function restoreFromTrash(
  collectionName: "proposals" | "templates",
  docId: string
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    isDeleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function permanentDelete(
  collectionName: "proposals" | "templates",
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}

export function subscribeToTrashedProposals(
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

export function subscribeToTrashedTemplates(
  callback: (templates: Template[]) => void
): () => void {
  const q = query(
    collection(db, "templates"),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

// 🔥 THIS IS THE MISSING FUNCTION THAT WAS CAUSING YOUR TYPESCRIPT ERRORS
export function subscribeToUserTrashedProposals(
  userId: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("userId", "==", userId),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

export function subscribeToDeptTrashedProposals(
  department: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("department", "==", department),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

export function subscribeToUserTrashedTemplates(
  userId: string,
  callback: (templates: Template[]) => void
): () => void {
  const q = query(
    collection(db, "templates"),
    where("userId", "==", userId),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

// ─── ADMIN GLOBAL QUERIES ───────────────────────────────────

export async function getAllTemplates(): Promise<Template[]> {
  const q = query(
    collection(db, "templates"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[];
}

export interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "staff" | "admin" | "super_admin" | "ceo";
  department: string | null; // Legacy single department (for backward compatibility)
  departments?: string[]; // NEW: Multiple departments for staff
  departmentId?: string | null; // Firestore dept doc ID (stable foreign key)
  isDeptAdmin?: boolean; // true when role=="admin" — mirrors role for explicit querying
  jobTitle?: string; // NEW: Job title (e.g., "IT Specialist")
  avatarUrl?: string; // NEW: User avatar/profile picture URL
  delegatedUserIds?: string[]; // For CEO: stores UIDs of authorized staff who can send on their behalf (Level 1)
  executiveAdminIds?: string[]; // For CEO: stores UIDs granted Full Authority / Executive Admin (Level 2)
  canSendOnBehalfOf?: string[]; // For staff: stores CEO UIDs they can send on behalf of
  isExecutiveAdmin?: boolean; // For staff: true if granted Full Authority by CEO
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── DELEGATION FUNCTIONS ───────────────────────────────────

// Get all users who can be delegated (staff and admins)
export async function getDelegatableUsers(): Promise<TeamMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as TeamMember)
    .filter((u) => u.role === "staff" || u.role === "admin" || u.role === "super_admin");
}

// Get delegation settings for a CEO
export async function getDelegationSettings(ceoId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", ceoId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return data.delegatedUserIds || [];
}

// Update CEO's delegation settings
export async function updateDelegationSettings(
  ceoId: string,
  delegatedUserIds: string[]
): Promise<void> {
  await updateDoc(doc(db, "users", ceoId), {
    delegatedUserIds,
    updatedAt: serverTimestamp(),
  });
  
  // Also update each delegated user's canSendOnBehalfOf array
  const allUsersSnap = await getDocs(collection(db, "users"));
  const batchUpdates: Promise<void>[] = [];
  
  allUsersSnap.docs.forEach((userDoc) => {
    const userData = userDoc.data();
    const userId = userDoc.id;
    const currentCanSend = userData.canSendOnBehalfOf || [];
    
    if (delegatedUserIds.includes(userId)) {
      // Add CEO to this user's canSendOnBehalfOf if not already there
      if (!currentCanSend.includes(ceoId)) {
        batchUpdates.push(
          updateDoc(doc(db, "users", userId), {
            canSendOnBehalfOf: [...currentCanSend, ceoId],
            updatedAt: serverTimestamp(),
          })
        );
      }
    } else {
      // Remove CEO from this user's canSendOnBehalfOf
      if (currentCanSend.includes(ceoId)) {
        batchUpdates.push(
          updateDoc(doc(db, "users", userId), {
            canSendOnBehalfOf: currentCanSend.filter((id: string) => id !== ceoId),
            updatedAt: serverTimestamp(),
          })
        );
      }
    }
  });
  
  await Promise.all(batchUpdates);
}

// Update CEO's Level 2 (Full Authority / Executive Admin) settings.
// Sets isExecutiveAdmin + fullPower + delegatedCeoId on each granted user so
// toggleActingAsCeo works for both "admin" and "super_admin" roles.
export async function updateExecutiveAdminSettings(
  ceoId: string,
  executiveAdminIds: string[]
): Promise<void> {
  await updateDoc(doc(db, "users", ceoId), {
    executiveAdminIds,
    updatedAt: serverTimestamp(),
  });

  const allUsersSnap = await getDocs(collection(db, "users"));
  const batchUpdates: Promise<void>[] = [];

  allUsersSnap.docs.forEach((userDoc) => {
    const userId = userDoc.id;
    if (userId === ceoId) return;
    const isExec = executiveAdminIds.includes(userId);
    const currentFlag = userDoc.data().isExecutiveAdmin ?? false;
    if (isExec !== currentFlag) {
      batchUpdates.push(
        updateDoc(doc(db, "users", userId), {
          isExecutiveAdmin: isExec,
          // These two fields power toggleActingAsCeo for both admin and super_admin
          fullPower: isExec,
          delegatedCeoId: isExec ? ceoId : null,
          updatedAt: serverTimestamp(),
        })
      );
    }
  });

  await Promise.all(batchUpdates);
}

// Check if user can send on behalf of another user
export async function canSendOnBehalfOf(
  userId: string,
  targetUserId: string
): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return false;
  const data = snap.data();
  const canSend = data.canSendOnBehalfOf || [];
  return canSend.includes(targetUserId);
}

// Get all users this person can send on behalf of
export async function getAvailableIdentities(userId: string, forceRefresh?: boolean): Promise<TeamMember[]> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return [];
  
  const data = snap.data();
  const canSend = data.canSendOnBehalfOf || [];
  
  if (canSend.length === 0) return [];
  
  // Fetch full details of each available identity
  const identities: TeamMember[] = [];
  await Promise.all(
    canSend.map(async (targetId: string) => {
      const targetSnap = await getDoc(doc(db, "users", targetId));
      if (targetSnap.exists()) {
        identities.push({ id: targetSnap.id, ...targetSnap.data() } as TeamMember);
      }
    })
  );
  
  return identities;
}

export async function getAllUsers(): Promise<TeamMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as TeamMember[];
}

// ─── DEPARTMENT-SCOPED QUERIES ──────────────────────────────

export async function getAllProposals(): Promise<Proposal[]> {
  try {
    const q = query(
      collection(db, "proposals"),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[];
  } catch (error) {
    console.error("getAllProposals error:", error);
    throw error;
  }
}

export function subscribeToAllProposals(
  callback: (proposals: Proposal[], error?: Error) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[], undefined),
    (error) => {
      console.error("subscribeToAllProposals error:", error);
      callback([], error as Error);
    }
  );
}

export function subscribeToDepartmentProposals(
  department: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("department", "==", department),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

// ─── DEPARTMENTS ────────────────────────────────────────────

export interface FirestoreDepartment {
  id: string;
  name: string;
  description: string;
  createdAt: Timestamp;
}

export async function createDepartment(data: {
  name: string;
  description: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "departments"), {
    name: data.name,
    description: data.description,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteDepartment(id: string): Promise<void> {
  await deleteDoc(doc(db, "departments", id));
}

export function subscribeToDepartmentsList(
  callback: (departments: FirestoreDepartment[]) => void
) {
  const q = query(
    collection(db, "departments"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestoreDepartment[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

// ─── USER DEPARTMENT UPDATE ─────────────────────────────────

export async function updateUserDepartment(
  userId: string,
  department: string
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    department,
    updatedAt: serverTimestamp(),
  });
}

// Add user to multiple departments
export async function addUserToDepartments(
  userId: string,
  departmentNames: string[]
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error("User not found");
  
  const currentData = userSnap.data();
  const currentDepartments = currentData.departments || [];
  
  // Merge and deduplicate
  const newDepartments = [...new Set([...currentDepartments, ...departmentNames])];
  
  await updateDoc(userRef, {
    departments: newDepartments,
    department: newDepartments[0] || null, // Keep legacy field in sync
    updatedAt: serverTimestamp(),
  });
}

// Remove user from departments
export async function removeUserFromDepartments(
  userId: string,
  departmentNames: string[]
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error("User not found");
  
  const currentData = userSnap.data();
  const currentDepartments = currentData.departments || [];
  
  // Remove specified departments
  const newDepartments = currentDepartments.filter((d: string) => !departmentNames.includes(d));
  
  await updateDoc(userRef, {
    departments: newDepartments,
    department: newDepartments[0] || null, // Keep legacy field in sync
    updatedAt: serverTimestamp(),
  });
}

// Set user's departments (replace all).
// Accepts an optional departmentId (Firestore dept doc ID for the primary dept)
// so callers can stamp the stable foreign key alongside the name string.
export async function setUserDepartments(
  userId: string,
  departmentNames: string[],
  departmentId?: string | null
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    departments: departmentNames,
    department: departmentNames[0] || null, // Keep legacy field in sync
    ...(departmentId !== undefined ? { departmentId: departmentId ?? null } : {}),
    updatedAt: serverTimestamp(),
  });
}

// Set a user's role and stamp isDeptAdmin accordingly.
// CEO/super_admin only — enforced by Firestore rules.
export async function setUserRole(
  userId: string,
  role: "staff" | "admin" | "super_admin"
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    role,
    isDeptAdmin: role === "admin",
    updatedAt: serverTimestamp(),
  });
}

// ─── ORPHAN PROTECTION ───────────────────────────────────────
// Returns active (non-superseded, non-archived, non-deleted) proposals
// that are owned by or sent by the given user. Used to block staff deactivation.
export async function checkOrphanProposals(
  userId: string
): Promise<{ count: number; proposals: Array<{ id: string; clientName: string; status: string }> }> {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false)
  );
  const snap = await getDocs(q);
  const active = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Proposal)
    .filter(
      (p) =>
        (p.ownerId === userId || p.sentById === userId) &&
        !["superseded", "archived", "void", "rejected"].includes(p.status)
    );
  return {
    count: active.length,
    proposals: active.map((p) => ({ id: p.id, clientName: p.clientName, status: p.status })),
  };
}

// Soft-deactivate a user — sets isActive:false and strips delegation rights.
// Throws OrphanError if the user has active proposals that need reassignment.
export class OrphanError extends Error {
  orphans: Array<{ id: string; clientName: string; status: string }>;
  constructor(orphans: Array<{ id: string; clientName: string; status: string }>) {
    super(`User has ${orphans.length} active proposal(s) that must be reassigned before deactivation.`);
    this.name = "OrphanError";
    this.orphans = orphans;
  }
}

export async function deactivateUser(userId: string): Promise<void> {
  const { count, proposals: orphans } = await checkOrphanProposals(userId);
  if (count > 0) throw new OrphanError(orphans);
  await updateDoc(doc(db, "users", userId), {
    isActive: false,
    canSendOnBehalfOf: [],
    delegatedUserIds: [],
    updatedAt: serverTimestamp(),
  });
}

// Subscribe to all users with real-time updates
export function subscribeToAllUsers(
  callback: (users: TeamMember[]) => void
): () => void {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamMember);
      callback(users);
    },
    (error) => {
      console.error("Error subscribing to users:", error);
    }
  );
}

// Get users filtered by department
export async function getUsersByDepartment(department: string): Promise<TeamMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as TeamMember)
    .filter((u) => 
      u.departments?.includes(department) || u.department === department
    );
}

// Get all admin-role users (optionally filtered by department)
export async function getAdminUsers(department?: string): Promise<TeamMember[]> {
  const q = query(collection(db, "users"), where("role", "==", "admin"));
  const snap = await getDocs(q);
  const admins = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamMember);
  if (!department) return admins;
  return admins.filter((u) =>
    u.department === department || u.departments?.includes(department)
  );
}

// ─── USER PROFILE UPDATE ───────────────────────────────────

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  avatarUrl?: string;
}

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileData
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── RECENT ACTIVITY (CEO) ─────────────────────────────────

export function subscribeToRecentActivity(
  count: number,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("updatedAt", "desc"),
    firestoreLimit(count)
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
  );
}

export async function batchGetUserNames(
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)];
  const names: Record<string, string> = {};
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const d = snap.data();
          names[uid] = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.email || uid;
        } else {
          names[uid] = uid;
        }
      } catch {
        names[uid] = uid;
      }
    })
  );
  return names;
}

// ─── GLOBAL STATS (Aggregated) ─────────────────────────────

export interface GlobalStats {
  totalProposals: number;
  totalSent: number;
  totalViewed: number;
  totalAccepted: number;
  totalRejected: number;
  updatedAt: unknown;
}

const DEFAULT_STATS: GlobalStats = {
  totalProposals: 0,
  totalSent: 0,
  totalViewed: 0,
  totalAccepted: 0,
  totalRejected: 0,
  updatedAt: null,
};

export function subscribeToGlobalStats(
  callback: (stats: GlobalStats) => void
): () => void {
  return onSnapshot(
    doc(db, "stats", "global"), 
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_STATS, ...snap.data() } as GlobalStats);
      } else {
        callback(DEFAULT_STATS);
      }
    },
    (error) => {
      if (error.code !== "permission-denied") console.error(error);
    }
  );
}

// ─── AUDIT LOGS (append-only) ────────────────────────────────

export type AuditAction =
  | "proposal_created"
  | "proposal_trashed"
  | "proposal_restored"
  | "proposal_deleted"
  | "proposal_reassigned"
  | "proposal_voided"
  | "proposal_archived"
  | "template_created"
  | "template_updated"
  | "template_versioned"
  | "template_trashed"
  | "user_deactivated"
  | "user_reactivated"
  | "identity_switched"
  | "delegation_granted"
  | "delegation_revoked"
  | "staff_reassigned"
  | "status_changed"
  | "proposal_revised"
  | "proposal_privacy_changed"
  | "proposal_sharing_updated"
  | "template_published"
  | "template_unpublished"
  | "jit_elevation_requested"
  | "jit_elevation_revoked"
  | "jit_elevation_approved"
  | "jit_elevation_denied"
  | "emergency_brake_activated";

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetId?: string;       // proposalId / templateId / userId
  targetType?: string;     // "proposal" | "template" | "user"
  description: string;
  metadata?: Record<string, unknown>;
  department?: string;
  actingAsCeo?: boolean;   // true if Executive Admin acting on CEO's behalf
  createdAt: unknown;
}

// ─── JIT ELEVATION ──────────────────────────────────────────
// Stored at /elevations/{uid} — one active record per user.

// Elevation tiers
// - operational: auto-approved; allows staff deactivation, dept deletion.
// - critical:     requires CEO approval; allows role changes, settings edits.
export type ElevationTier = "operational" | "critical";
export type ElevationApprovalStatus = "auto_approved" | "pending" | "approved" | "denied";

export interface JitElevation {
  uid: string;          // The super_admin who elevated
  actorName: string;
  justification: string;
  durationMs: number;   // e.g. 30 * 60 * 1000
  requestedAt: Timestamp;
  expiresAt: Timestamp; // requestedAt + durationMs (only valid once approved)
  status: "active" | "expired" | "pending_approval";
  tier: ElevationTier;
  approvalStatus: ElevationApprovalStatus;
  approvedAt?: Timestamp;
  approvedBy?: string;  // CEO UID
  metadata?: {          // Browser context captured at request time
    userAgent?: string;
    platform?: string;
    language?: string;
  };
}

export const JIT_DURATIONS = [
  { label: "30 minutes", ms: 30 * 60 * 1000 },
  { label: "1 hour",    ms: 60 * 60 * 1000 },
  { label: "2 hours",   ms: 2  * 60 * 60 * 1000 },
  { label: "4 hours",   ms: 4  * 60 * 60 * 1000 },
] as const;

export async function requestElevation({
  uid,
  actorName,
  justification,
  durationMs,
  tier = "operational",
}: {
  uid: string;
  actorName: string;
  justification: string;
  durationMs: number;
  tier?: ElevationTier;
}): Promise<void> {
  const now = Date.now();
  // Operational: active immediately. Critical: pending until CEO approves.
  const isOperational = tier === "operational";
  const expiresAt = new Date(now + durationMs);

  // Collect browser metadata for audit trail
  const metadata: Record<string, string> = {};
  if (typeof window !== "undefined") {
    metadata.userAgent = navigator.userAgent;
    metadata.platform  = navigator.platform ?? "unknown";
    metadata.language  = navigator.language ?? "unknown";
  }

  // Always delete any existing elevation doc first so the subsequent setDoc
  // always triggers Firestore's 'create' rule (not the restrictive 'update' rule).
  const elevRef = doc(db, "elevations", uid);
  const existing = await getDoc(elevRef);
  if (existing.exists()) {
    await deleteDoc(elevRef);
  }

  await setDoc(doc(db, "elevations", uid), {
    uid,
    actorName,
    justification,
    durationMs,
    tier,
    requestedAt: serverTimestamp(),
    // expiresAt is set immediately for operational; critical starts on approval
    expiresAt: isOperational ? expiresAt : null,
    status: isOperational ? "active" : "pending_approval",
    approvalStatus: isOperational ? "auto_approved" : "pending",
    metadata,
  });

  await writeAuditLog({
    action: "jit_elevation_requested",
    actorId: uid,
    actorName,
    actorRole: "super_admin",
    description: `${actorName} requested ${tier} elevation for ${Math.round(durationMs / 60000)} min. Reason: ${justification}`,
    metadata: { justification, durationMs, tier, expiresAt: isOperational ? expiresAt.toISOString() : "pending" },
  });
}

// CEO approves a pending Critical elevation.
// Sets status=active, expiresAt = now+durationMs, approvalStatus=approved.
export async function approveCriticalElevation(
  elevationUid: string,
  ceoUid: string
): Promise<void> {
  const elevRef = doc(db, "elevations", elevationUid);
  const snap = await getDoc(elevRef);
  if (!snap.exists()) throw new Error("Elevation record not found.");
  const data = snap.data() as JitElevation;
  if (data.status !== "pending_approval") throw new Error("Elevation is not pending approval.");

  const expiresAt = new Date(Date.now() + data.durationMs);
  await updateDoc(elevRef, {
    status: "active",
    approvalStatus: "approved",
    approvedAt: serverTimestamp(),
    approvedBy: ceoUid,
    expiresAt,
  });

  await writeAuditLog({
    action: "jit_elevation_approved",
    actorId: ceoUid,
    actorName: "CEO",
    actorRole: "ceo",
    description: `CEO approved Critical elevation for ${data.actorName}. Session active for ${Math.round(data.durationMs / 60000)} min.`,
    metadata: { elevationUid, tier: "critical" },
  });
}

// CEO denies a pending Critical elevation.
export async function denyCriticalElevation(
  elevationUid: string,
  ceoUid: string,
  ceoName: string
): Promise<void> {
  const elevRef = doc(db, "elevations", elevationUid);
  const snap = await getDoc(elevRef);
  if (!snap.exists()) throw new Error("Elevation record not found.");
  const data = snap.data() as JitElevation;

  await updateDoc(elevRef, {
    status: "expired",
    approvalStatus: "denied",
    approvedBy: ceoUid,
  });

  await writeAuditLog({
    action: "jit_elevation_denied",
    actorId: ceoUid,
    actorName: ceoName,
    actorRole: "ceo",
    description: `CEO denied Critical elevation request from ${data.actorName}.`,
    metadata: { elevationUid, tier: "critical" },
  });
}

export async function revokeElevation(
  uid: string,
  actorName: string,
  revokedBy: "self" | "timer" | string = "timer"
): Promise<void> {
  await updateDoc(doc(db, "elevations", uid), {
    status: "expired",
  });

  await writeAuditLog({
    action: "jit_elevation_revoked",
    actorId: uid,
    actorName,
    actorRole: "super_admin",
    description: `${actorName} Super Admin elevation revoked (by: ${revokedBy}).`,
    metadata: { revokedBy },
  });
}

// CEO live monitor: real-time list of ALL elevation docs
export function subscribeToAllElevations(
  callback: (elevations: JitElevation[]) => void
): () => void {
  return onSnapshot(
    collection(db, "elevations"),
    (snap) => {
      const now = new Date();
      const live = snap.docs
        .map((d) => ({ ...d.data(), uid: d.id }) as JitElevation)
        .filter((e) => {
          if (e.status === "pending_approval") return true;
          if (e.status !== "active") return false;
          const exp = (e.expiresAt as unknown as { toDate?: () => Date })?.toDate?.();
          return exp ? exp > now : false;
        });
      callback(live);
    },
    (err) => { if (err.code !== "permission-denied") console.error(err); }
  );
}

// ─── SYSTEM PURGE LOG (Black Box) ──────────────────────────
export interface SystemPurgeLog {
  id: string;
  action: "SYSTEM_PURGE_RESET";
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: Timestamp;
  details: string;
  security: {
    ipAddress: string;
    userAgent: string;
    confirmationText: string;
  };
  affectedUids: string[];
  elevationsWiped: number;
}

export function subscribeToSystemPurgeLogs(
  callback: (logs: SystemPurgeLog[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, "system_purge_logs"), orderBy("timestamp", "desc")),
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as SystemPurgeLog)),
    (err) => { if (err.code !== "permission-denied") console.error(err); }
  );
}

// Client-side callable wrapper for the Emergency Brake Cloud Function
export async function callRevokeAllElevations(): Promise<{ revokedCount: number; elevationsWiped: number; logId: string }> {
  const fn = httpsCallable<void, { revokedCount: number; elevationsWiped: number; logId: string }>(
    functions,
    "revokeAllElevations"
  );
  const result = await fn();
  return result.data;
}

export function subscribeToElevation(
  uid: string,
  callback: (elevation: JitElevation | null) => void
): () => void {
  return onSnapshot(
    doc(db, "elevations", uid),
    (snap) => {
      if (!snap.exists()) { callback(null); return; }
      const data = snap.data() as JitElevation;
      // Expire server-side if past expiresAt
      const expiresAt = (data.expiresAt as unknown as { toDate?: () => Date })?.toDate?.();
      if (expiresAt && expiresAt < new Date() && data.status === "active") {
        callback({ ...data, status: "expired" });
      } else {
        callback(data);
      }
    },
    (err) => { if (err.code !== "permission-denied") console.error(err); }
  );
}

export async function notifyCeoOfElevation({
  ceoId,
  actorName,
  justification,
  durationLabel,
  tier = "operational",
  elevationUid,
}: {
  ceoId: string;
  actorName: string;
  justification: string;
  durationLabel: string;
  tier?: ElevationTier;
  elevationUid?: string;
}): Promise<void> {
  const { createInAppNotification } = await import("./notifications");
  const isOperational = tier === "operational";
  const prefix = isOperational ? "🔐" : "🔴";
  const suffix = isOperational
    ? `(auto-approved — log only)`
    : `— ⚠️ CEO Approval Required`;
  await createInAppNotification({
    userId: ceoId,
    type: "jit_elevation",
    message: `${prefix} ${actorName} requested ${tier} elevation for ${durationLabel}. ${suffix}. Reason: ${justification}`,
    actorRole: "system",
    actorName,
    metadata: { tier, elevationUid: elevationUid ?? "", requiresApproval: !isOperational },
  });
}

export async function writeAuditLog(
  entry: Omit<AuditLogEntry, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "logs"), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToAuditLogs(
  callback: (logs: AuditLogEntry[]) => void,
  limitCount = 100
): () => void {
  const q = query(
    collection(db, "logs"),
    orderBy("createdAt", "desc"),
    firestoreLimit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry)),
    (err) => { if (err.code !== "permission-denied") console.error(err); }
  );
}

// ─── PROPOSAL REASSIGNMENT ───────────────────────────────────

export async function getActiveProposalCountByUser(userId: string): Promise<number> {
  const q = query(
    collection(db, "proposals"),
    where("sentById", "==", userId),
    where("isDeleted", "==", false),
    where("status", "in", ["sent", "viewed"])
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function reassignProposals(
  fromUserId: string,
  toUserId: string,
  actorId: string,
  actorName: string,
  actorRole: string
): Promise<number> {
  const q = query(
    collection(db, "proposals"),
    where("sentById", "==", fromUserId),
    where("isDeleted", "==", false),
    where("status", "in", ["sent", "viewed"])
  );
  const snap = await getDocs(q);
  const updates: Promise<void>[] = snap.docs.map((d) =>
    updateDoc(doc(db, "proposals", d.id), {
      sentById: toUserId,
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(updates);
  if (snap.size > 0) {
    await writeAuditLog({
      action: "staff_reassigned",
      actorId,
      actorName,
      actorRole,
      targetId: fromUserId,
      targetType: "user",
      description: `${snap.size} proposals reassigned from ${fromUserId} to ${toUserId}`,
      metadata: { fromUserId, toUserId, count: snap.size },
    });
  }
  return snap.size;
}

// ─── TEMPLATE VERSIONING ─────────────────────────────────────

export async function saveTemplateVersion(
  templateId: string,
  snapshot: {
    name: string;
    fields: TemplateField[];
    description: string | null;
    fileUrl: string | null;
    gdocUrl: string | null;
  },
  versionNumber: number
): Promise<void> {
  await setDoc(
    doc(db, "templates", templateId, "versions", String(versionNumber)),
    {
      ...snapshot,
      versionNumber,
      savedAt: serverTimestamp(),
    }
  );
}

export async function updateTemplateWithVersion(
  templateId: string,
  data: Partial<Pick<Template, "fileUrl" | "filePath" | "name" | "description" | "fields">>,
  actorId: string,
  actorName: string,
  actorRole: string
): Promise<void> {
  // Get current template to snapshot its current state as a version
  const currentSnap = await getDoc(doc(db, "templates", templateId));
  if (!currentSnap.exists()) throw new Error("Template not found");
  const current = currentSnap.data() as Template;
  const currentVersion: number = (current as unknown as Record<string, unknown>).version as number ?? 1;

  // Save a snapshot of the current state as the old version
  await saveTemplateVersion(
    templateId,
    {
      name: current.name,
      fields: current.fields,
      description: current.description,
      fileUrl: current.fileUrl,
      gdocUrl: current.gdocUrl,
    },
    currentVersion
  );

  // Write the update with incremented version
  await updateDoc(doc(db, "templates", templateId), {
    ...data,
    version: currentVersion + 1,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "template_versioned",
    actorId,
    actorName,
    actorRole,
    targetId: templateId,
    targetType: "template",
    description: `Template "${current.name}" updated from v${currentVersion} to v${currentVersion + 1}`,
    metadata: { previousVersion: currentVersion },
  });
}

// ═══════════════════════════════════════════════════════════════
// ─── CEO DEFENSIVE ARCHITECTURE ─────────────────────────────
// ═══════════════════════════════════════════════════════════════

// ─── SUCCESSION TIMER (48h Protocol) ─────────────────────────
// An Admin can request emergency root access. The CEO has 48h to veto.

export interface SuccessionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  reason: string;
  status: "pending" | "approved" | "denied" | "expired";
  requestedAt: unknown;
  expiresAt: unknown; // requestedAt + 48h
  resolvedAt?: unknown;
  resolvedBy?: string;
}

const SUCCESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function createSuccessionRequest(
  requesterId: string,
  requesterName: string,
  reason: string
): Promise<string> {
  const now = new Date();
  const ref = await addDoc(collection(db, "succession_requests"), {
    requesterId,
    requesterName,
    reason,
    status: "pending",
    requestedAt: serverTimestamp(),
    expiresAt: new Date(now.getTime() + SUCCESSION_TTL_MS),
  });
  return ref.id;
}

export async function vetoCeoSuccessionRequest(
  requestId: string,
  ceoId: string,
  action: "approved" | "denied"
): Promise<void> {
  await updateDoc(doc(db, "succession_requests", requestId), {
    status: action,
    resolvedAt: serverTimestamp(),
    resolvedBy: ceoId,
  });
}

export function subscribeToSuccessionRequests(
  callback: (requests: SuccessionRequest[]) => void
): () => void {
  const q = query(
    collection(db, "succession_requests"),
    orderBy("requestedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SuccessionRequest));
  });
}

// ─── THRESHOLD ALERTS (Pending CEO Approval) ─────────────────
// Delegated proposals exceeding a dollar/discount threshold enter
// pending_ceo_approval state until the CEO manually releases them.

export async function holdForCeoApproval(
  proposalId: string,
  reason: string,
  triggeredBy: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "pending_ceo_approval",
    holdReason: reason,
    holdTriggeredBy: triggeredBy,
    updatedAt: serverTimestamp(),
  });
}

export async function releaseCeoHold(
  proposalId: string,
  ceoId: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "sent",
    holdReason: null,
    holdTriggeredBy: null,
    holdReleasedBy: ceoId,
    holdReleasedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  incrementGlobalStats("totalSent").catch(() => {});
}

export function subscribeToPendingApprovals(
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("status", "==", "pending_ceo_approval"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Proposal));
  });
}

// ─── GLOBAL PRICING FLOORS (CEO-Only Setting) ────────────────
// Enforces a hard minimum margin across all departments.

export interface CeoSettings {
  minimumMarginPercent: number;  // e.g. 15 = 15% floor
  maxDiscountPercent: number;    // e.g. 25 = max 25% discount
  thresholdDollarAmount: number; // e.g. 50000 = flag proposals over $50k
  updatedAt: unknown;
  updatedBy: string;
}

const CEO_SETTINGS_REF = () => doc(db, "ceo_settings", "global");

export async function getCeoSettings(): Promise<CeoSettings | null> {
  const snap = await getDoc(CEO_SETTINGS_REF());
  return snap.exists() ? (snap.data() as CeoSettings) : null;
}

export async function updateCeoSettings(
  ceoId: string,
  settings: Partial<CeoSettings>
): Promise<void> {
  await setDoc(CEO_SETTINGS_REF(), {
    ...settings,
    updatedBy: ceoId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeToCeoSettings(
  callback: (settings: CeoSettings | null) => void
): () => void {
  return onSnapshot(CEO_SETTINGS_REF(), (snap) => {
    callback(snap.exists() ? (snap.data() as CeoSettings) : null);
  });
}

// ─── TEMPLATE SANDBOX (Publish-to-Org Workflow) ──────────────
// CEO edits are saved as drafts (isPublished: false).
// Only when explicitly "Published to Org" do they become visible to staff.

export async function publishTemplateToOrg(
  templateId: string,
  ceoId: string,
  ceoName: string
): Promise<void> {
  await updateDoc(doc(db, "templates", templateId), {
    isPublished: true,
    publishedAt: serverTimestamp(),
    publishedBy: ceoId,
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog({
    action: "template_published",
    actorId: ceoId,
    actorName: ceoName,
    actorRole: "ceo",
    targetId: templateId,
    targetType: "template",
    description: `Template published to organization by ${ceoName}`,
  });
}

export async function unpublishTemplate(
  templateId: string,
  ceoId: string,
  ceoName: string
): Promise<void> {
  await updateDoc(doc(db, "templates", templateId), {
    isPublished: false,
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog({
    action: "template_unpublished",
    actorId: ceoId,
    actorName: ceoName,
    actorRole: "ceo",
    targetId: templateId,
    targetType: "template",
    description: `Template unpublished from organization by ${ceoName}`,
  });
}

// ─── SHARING MONITOR (CEO Visibility) ─────────────────────────
// Logs every cross-department share action for CEO oversight.

export interface SharingLogEntry {
  id: string;
  proposalId: string;
  proposalClientName: string;
  originDepartment: string;
  sharedWith: string[];
  accessLevel: string;
  sharedBy: string;
  sharedByName: string;
  createdAt: unknown;
}

export async function writeSharingLog(entry: Omit<SharingLogEntry, "id" | "createdAt">): Promise<void> {
  await addDoc(collection(db, "sharing_logs"), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToSharingLogs(
  callback: (logs: SharingLogEntry[]) => void,
  limitCount = 50
): () => void {
  const q = query(
    collection(db, "sharing_logs"),
    orderBy("createdAt", "desc"),
    firestoreLimit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SharingLogEntry));
  });
}

// ─── IMMUTABLE ANALYTICS (Audit-Log Derived) ─────────────────
// Reads from audit_logs to compute historical stats that survive deletions.
// Used by CEO analytics page instead of counting live documents.

export interface AuditDerivedStats {
  totalCreated: number;
  totalSent: number;
  totalViewed: number;
  totalAccepted: number;
  totalRejected: number;
  byDepartment: Record<string, { created: number; accepted: number; rejected: number }>;
  byMonth: { month: string; created: number; accepted: number }[];
}

export async function getImmutableAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<AuditDerivedStats> {
  let q = query(
    collection(db, "audit_logs"),
    orderBy("createdAt", "desc")
  );
  if (startDate) {
    q = query(q, where("createdAt", ">=", startDate));
  }
  if (endDate) {
    q = query(q, where("createdAt", "<=", endDate));
  }

  const snap = await getDocs(q);
  const stats: AuditDerivedStats = {
    totalCreated: 0, totalSent: 0, totalViewed: 0,
    totalAccepted: 0, totalRejected: 0,
    byDepartment: {},
    byMonth: [],
  };

  const monthBuckets: Record<string, { created: number; accepted: number }> = {};

  for (const d of snap.docs) {
    const log = d.data();
    const action = log.action as string;
    const dept = (log.metadata?.department as string) || "Unknown";
    const ts = log.createdAt as { seconds: number } | null;
    const monthKey = ts ? new Date(ts.seconds * 1000).toISOString().slice(0, 7) : "unknown";

    if (!stats.byDepartment[dept]) {
      stats.byDepartment[dept] = { created: 0, accepted: 0, rejected: 0 };
    }
    if (!monthBuckets[monthKey]) {
      monthBuckets[monthKey] = { created: 0, accepted: 0 };
    }

    if (action === "proposal_created" || action === "proposal_sent") {
      stats.totalCreated++;
      stats.totalSent++;
      stats.byDepartment[dept].created++;
      monthBuckets[monthKey].created++;
    } else if (action === "proposal_viewed") {
      stats.totalViewed++;
    } else if (action === "proposal_accepted" || action === "proposal_signed") {
      stats.totalAccepted++;
      stats.byDepartment[dept].accepted++;
      monthBuckets[monthKey].accepted++;
    } else if (action === "proposal_rejected") {
      stats.totalRejected++;
      stats.byDepartment[dept].rejected++;
    }
  }

  stats.byMonth = Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  return stats;
}

// ═══════════════════════════════════════════════════════════════
// ─── TIERED DELEGATION & VERIFICATION (TASK SYSTEM) ──────────
// ═══════════════════════════════════════════════════════════════

export type TaskStatus = "drafting" | "verifying" | "changes_requested" | "revision_requested" | "ready_to_send" | "sent" | "cancelled";
export type UrgencyLevel = "p1" | "p2" | "p3";

// SLA windows per urgency (milliseconds)
export const URGENCY_SLA: Record<UrgencyLevel, number> = {
  p1: 2 * 60 * 60 * 1000,    // 2 hours
  p2: 24 * 60 * 60 * 1000,   // 24 hours
  p3: 72 * 60 * 60 * 1000,   // 72 hours (standard)
};

export const URGENCY_META: Record<UrgencyLevel, { label: string; color: string; bg: string; ring: string }> = {
  p1: { label: "Critical", color: "text-rose-700",   bg: "bg-rose-50",   ring: "ring-rose-300" },
  p2: { label: "High",     color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-300" },
  p3: { label: "Normal",   color: "text-slate-600",  bg: "bg-slate-50",  ring: "ring-slate-200" },
};

// Fire-and-forget notification for task events
function fireTaskNotification(data: {
  taskId: string;
  event: string;
  targetUserId: string;
  clientName: string;
  urgency: string;
  senderName: string;
}) {
  fetch("/api/notify-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export interface TaskHistoryEntry {
  action: string;    // "created" | "assigned" | "submitted" | "changes_requested" | "verified" | "promoted" | "sent" | "cancelled"
  by: string;        // UID
  byName: string;
  to?: string;       // target UID (for assignments)
  toName?: string;
  note?: string;
  at: unknown;       // Timestamp
}

export interface ProposalTask {
  id: string;
  proposalId: string | null;   // null until a draft is created
  // The chain
  requesterId: string;          // The user who created the task (CEO or Super Admin)
  requesterName: string;
  ceoId?: string;               // The CEO to notify on ready_to_send (if Super Admin created task)
  adminId?: string;             // Dept Admin who received from requester
  adminName?: string;
  deptAdminId?: string;         // Dept Admin assigned for verification
  deptAdminName?: string;
  assigneeId?: string;          // Staff who builds the draft
  assigneeName?: string;
  // Task metadata
  department: string;
  clientName: string;
  clientEmail?: string;
  templateId?: string;
  templateName?: string;
  briefDescription: string;     // What the CEO wants
  // Urgency & SLA
  urgency: UrgencyLevel;
  dueAt: unknown;               // Timestamp = createdAt + SLA window
  // State
  status: TaskStatus;
  verificationNote?: string;    // Note from dept admin on changes_requested
  // History
  history: TaskHistoryEntry[];
  // Timestamps
  createdAt: unknown;
  updatedAt: unknown;
}

// ─── CREATE TASK (CEO → Admin) ───────────────────────────────

export async function createTask(data: {
  requesterId: string;
  requesterName: string;
  ceoId?: string;               // Set when a Super Admin creates the task on behalf of CEO oversight
  adminId: string;
  adminName: string;
  department: string;
  clientName: string;
  clientEmail?: string;
  templateId?: string;
  templateName?: string;
  briefDescription: string;
  urgency: UrgencyLevel;
  customDueAt?: Date;
}): Promise<string> {
  const now = new Date();
  const dueAt = data.customDueAt ?? new Date(now.getTime() + URGENCY_SLA[data.urgency]);

  const ref = await addDoc(collection(db, "tasks"), {
    proposalId: null,
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    ceoId: data.ceoId ?? null,
    adminId: data.adminId,
    adminName: data.adminName,
    deptAdminId: null,
    deptAdminName: null,
    assigneeId: null,
    assigneeName: null,
    department: data.department,
    clientName: data.clientName,
    clientEmail: data.clientEmail ?? null,
    templateId: data.templateId ?? null,
    templateName: data.templateName ?? null,
    briefDescription: data.briefDescription,
    urgency: data.urgency,
    dueAt,
    status: "drafting",
    verificationNote: null,
    history: [{
      action: "created",
      by: data.requesterId,
      byName: data.requesterName,
      to: data.adminId,
      toName: data.adminName,
      at: serverTimestamp(),
    }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── ASSIGN TASK (Admin → Dept Admin, or Dept Admin → Staff) ─

export async function assignTask(
  taskId: string,
  assignerId: string,
  assignerName: string,
  targetId: string,
  targetName: string,
  level: "deptAdmin" | "staff"
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];

  const update: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "assigned",
      by: assignerId,
      byName: assignerName,
      to: targetId,
      toName: targetName,
      at: new Date().toISOString(),
    }],
  };

  if (level === "deptAdmin") {
    update.deptAdminId = targetId;
    update.deptAdminName = targetName;
  } else {
    update.assigneeId = targetId;
    update.assigneeName = targetName;
  }

  await updateDoc(doc(db, "tasks", taskId), update);

  // Notify the target
  fireTaskNotification({
    taskId,
    event: "task_assigned",
    targetUserId: targetId,
    clientName: task.clientName as string,
    urgency: task.urgency as string,
    senderName: assignerName,
  });
}

// ─── LINK PROPOSAL TO TASK ──────────────────────────────────

export async function linkProposalToTask(
  taskId: string,
  proposalId: string
): Promise<void> {
  await updateDoc(doc(db, "tasks", taskId), {
    proposalId,
    updatedAt: serverTimestamp(),
  });
}

// ─── SUBMIT FOR REVIEW (Staff → Dept Admin) ─────────────────

export async function submitTaskForReview(
  taskId: string,
  staffId: string,
  staffName: string
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];

  await updateDoc(doc(db, "tasks", taskId), {
    status: "verifying",
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "submitted",
      by: staffId,
      byName: staffName,
      at: new Date().toISOString(),
    }],
  });

  // Notify the dept admin (or admin) to review
  const reviewerId = (task.deptAdminId || task.adminId) as string;
  if (reviewerId) {
    fireTaskNotification({
      taskId,
      event: "task_submitted",
      targetUserId: reviewerId,
      clientName: task.clientName as string,
      urgency: task.urgency as string,
      senderName: staffName,
    });
  }
}

// ─── REQUEST CHANGES (Dept Admin → Staff) ────────────────────

export async function requestTaskChanges(
  taskId: string,
  adminId: string,
  adminName: string,
  note: string
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];

  await updateDoc(doc(db, "tasks", taskId), {
    status: "revision_requested",
    verificationNote: note,
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "revision_requested",
      by: adminId,
      byName: adminName,
      note,
      at: new Date().toISOString(),
    }],
  });

  // Notify the staff assignee
  const staffId = task.assigneeId as string;
  if (staffId) {
    fireTaskNotification({
      taskId,
      event: "task_changes_requested",
      targetUserId: staffId,
      clientName: task.clientName as string,
      urgency: task.urgency as string,
      senderName: adminName,
    });
  }
}

// ─── VERIFY & PROMOTE (Dept Admin → CEO Ready) ──────────────

export async function verifyAndPromoteTask(
  taskId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];

  await updateDoc(doc(db, "tasks", taskId), {
    status: "ready_to_send",
    verificationNote: null,
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "verified",
      by: adminId,
      byName: adminName,
      at: new Date().toISOString(),
    }],
  });

  // Notify the CEO. If ceoId is stored (future use), prefer it; otherwise use requesterId.
  // Also always notify the requester (Super Admin) if they differ from ceoId.
  const ceoNotifyId = (task.ceoId || task.requesterId) as string;
  const requesterId = task.requesterId as string;
  const notifyIds = new Set<string>([ceoNotifyId]);
  if (requesterId) notifyIds.add(requesterId);

  notifyIds.forEach((uid) => {
    fireTaskNotification({
      taskId,
      event: "task_ready",
      targetUserId: uid,
      clientName: task.clientName as string,
      urgency: task.urgency as string,
      senderName: adminName,
    });
  });
}

// ─── MARK TASK SENT (CEO sends the proposal) ────────────────

export async function markTaskSent(
  taskId: string,
  ceoId: string,
  ceoName: string
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];

  await updateDoc(doc(db, "tasks", taskId), {
    status: "sent",
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "sent",
      by: ceoId,
      byName: ceoName,
      at: new Date().toISOString(),
    }],
  });
}

// ─── CANCEL TASK ────────────────────────────────────────────

export async function cancelTask(
  taskId: string,
  userId: string,
  userName: string
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];

  await updateDoc(doc(db, "tasks", taskId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "cancelled",
      by: userId,
      byName: userName,
      at: new Date().toISOString(),
    }],
  });
}

// ─── SUBSCRIPTIONS ──────────────────────────────────────────

// Super Admin: all tasks across the system for oversight
export function subscribeToSuperAdminTasks(
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("status", "in", ["drafting", "verifying", "revision_requested", "ready_to_send"]),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// Super Admin: verification queue — all depts (broad oversight)
export function subscribeToVerificationQueueSuperAdmin(
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("status", "==", "verifying"),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// CEO: tasks that are ready_to_send (the "Talking Inbox")
export function subscribeToReadyToSendTasks(
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("status", "==", "ready_to_send"),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// CEO: all active tasks (for oversight)
export function subscribeToAllActiveTasks(
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("status", "in", ["drafting", "verifying", "changes_requested", "revision_requested", "ready_to_send"]),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// Dept Admin: verification queue — tasks in verifying status for their dept
export function subscribeToVerificationQueue(
  deptAdminId: string,
  department: string,
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("status", "==", "verifying"),
    where("department", "==", department),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// Admin: tasks assigned to them
export function subscribeToAdminTasks(
  adminId: string,
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("adminId", "==", adminId),
    where("status", "in", ["drafting", "verifying", "revision_requested", "ready_to_send"]),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// Dept Admin: tasks assigned to them for verification
export function subscribeToDeptAdminTasks(
  deptAdminId: string,
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("deptAdminId", "==", deptAdminId),
    where("status", "in", ["drafting", "verifying", "revision_requested"]),  
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// Staff: tasks assigned to them
export function subscribeToStaffTasks(
  staffId: string,
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("assigneeId", "==", staffId),
    where("status", "in", ["drafting", "revision_requested"]),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// Single task subscription
export function subscribeToTask(
  taskId: string,
  callback: (task: ProposalTask | null) => void
): () => void {
  return onSnapshot(doc(db, "tasks", taskId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as ProposalTask) : null);
  });
}

// ─── UPDATE URGENCY (CEO / Admin / Staff) ────────────────────
// Any actor in the chain can escalate or de-escalate urgency at any time.

export async function updateTaskUrgency(
  taskId: string,
  actorId: string,
  actorName: string,
  newUrgency: UrgencyLevel
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  const history = (task.history || []) as TaskHistoryEntry[];
  const oldUrgency = task.urgency as UrgencyLevel;
  if (oldUrgency === newUrgency) return;

  // Recompute dueAt: shift from now by the new SLA window
  const newDueAt = new Date(Date.now() + URGENCY_SLA[newUrgency]);

  await updateDoc(doc(db, "tasks", taskId), {
    urgency: newUrgency,
    dueAt: newDueAt,
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "urgency_changed",
      by: actorId,
      byName: actorName,
      note: `Urgency changed from ${oldUrgency.toUpperCase()} → ${newUrgency.toUpperCase()}`,
      at: new Date().toISOString(),
    }],
  });

  // Notify the CEO if escalated to P1
  if (newUrgency === "p1") {
    const ceoId = task.requesterId as string;
    if (ceoId && ceoId !== actorId) {
      fireTaskNotification({
        taskId,
        event: "urgency_escalated_p1",
        targetUserId: ceoId,
        clientName: task.clientName as string,
        urgency: newUrgency,
        senderName: actorName,
      });
    }
  }
}

// ─── CEO PUSH-BACK (after client revision request) ───────────
// When a proposal is in "sent" state and the client has pushed back or
// requested revisions, the CEO routes the task back to staff for rework.
// Status: sent → revision_requested (reopens the drafting loop).

export async function ceoRequestRevision(
  taskId: string,
  ceoId: string,
  ceoName: string,
  note: string
): Promise<void> {
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data();
  if (task.status !== "sent" && task.status !== "ready_to_send") {
    throw new Error(`Cannot push back a task with status "${task.status}"`);
  }
  const history = (task.history || []) as TaskHistoryEntry[];

  await updateDoc(doc(db, "tasks", taskId), {
    status: "revision_requested",
    verificationNote: note,
    updatedAt: serverTimestamp(),
    history: [...history, {
      action: "ceo_revision_requested",
      by: ceoId,
      byName: ceoName,
      note,
      at: new Date().toISOString(),
    }],
  });

  // Notify staff assignee
  const staffId = task.assigneeId as string;
  if (staffId) {
    fireTaskNotification({
      taskId,
      event: "task_changes_requested",
      targetUserId: staffId,
      clientName: task.clientName as string,
      urgency: task.urgency as string,
      senderName: ceoName,
    });
  }
  // Also notify the dept admin
  const deptAdminId = (task.deptAdminId || task.adminId) as string;
  if (deptAdminId && deptAdminId !== staffId) {
    fireTaskNotification({
      taskId,
      event: "task_changes_requested",
      targetUserId: deptAdminId,
      clientName: task.clientName as string,
      urgency: task.urgency as string,
      senderName: ceoName,
    });
  }
}

// ─── CEO: sent tasks (for push-back UI) ──────────────────────
export function subscribeToSentTasksForCeo(
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("status", "==", "sent"),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}

// ─── DEPT ADMIN: dept-scoped subscription (all active tasks) ─
// Shows admins ONLY their department's tasks so they are not
// overwhelmed with cross-department noise.
export function subscribeToDeptScopedTasks(
  deptAdminId: string,
  department: string,
  callback: (tasks: ProposalTask[]) => void
): () => void {
  const q = query(
    collection(db, "tasks"),
    where("deptAdminId", "==", deptAdminId),
    where("department", "==", department),
    where("status", "in", ["drafting", "verifying", "revision_requested", "changes_requested"]),
    orderBy("dueAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalTask));
  });
}