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
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

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

export async function unpublishTemplate(templateId: string): Promise<void> {
  await updateDoc(doc(db, "templates", templateId), {
    isPublished: false,
    publishedAt: null,
    publishedBy: null,
    updatedAt: serverTimestamp(),
  });
}

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

export type ProposalStatus = "sent" | "viewed" | "accepted" | "rejected" | "archived" | "superseded" | "void";

export interface Proposal {
  id: string;
  // Delegated Authority fields
  ownerId: string; // The UID of the identity used (e.g., CEO) - for branding/signatures
  sentById: string; // The UID of the actual person who created/sent the doc
  isDelegated: boolean; // Flag to indicate if it was sent on behalf of another
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
}

// ─── PROPOSALS ───────────────────────────────────────────────

export async function createProposal(
  proposalId: string,
  data: {
    ownerId: string;
    sentById: string;
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
  await setDoc(doc(db, "proposals", proposalId), {
    // Delegated Authority fields
    ownerId: data.ownerId,
    sentById: data.sentById,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Versioning fields
    version: data.version ?? 1,
    previousVersionId: data.previousVersionId ?? null,
    nextVersionId: null,
  });
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

  // Create the new version document
  await setDoc(doc(db, "proposals", newProposalId), {
    ownerId: currentProposal.ownerId,
    sentById: currentProposal.sentById,
    isDelegated: currentProposal.isDelegated,
    userId: currentProposal.ownerId,
    department: currentProposal.department,
    templateId: updates.templateId ?? currentProposal.templateId,
    templateName: updates.templateName ?? currentProposal.templateName,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: newVersionNum,
    previousVersionId: currentProposal.id,
    nextVersionId: null,
  });

  // Mark the old version as superseded and store forward link
  await updateDoc(doc(db, "proposals", currentProposal.id), {
    status: "superseded",
    nextVersionId: newProposalId,
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
  signatureUrl: string
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
  });
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

// ─── SOFT-DELETE / TRASH ────────────────────────────────────

export async function moveToTrash(
  collectionName: "proposals" | "templates",
  docId: string
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
  role: "staff" | "admin" | "ceo";
  department: string | null; // Legacy single department (for backward compatibility)
  departments?: string[]; // NEW: Multiple departments for staff
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
    .filter((u) => u.role === "staff" || u.role === "admin");
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

// Update CEO's Level 2 (Full Authority / Executive Admin) settings
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

// Set user's departments (replace all)
export async function setUserDepartments(
  userId: string,
  departmentNames: string[]
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    departments: departmentNames,
    department: departmentNames[0] || null, // Keep legacy field in sync
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
  updatedAt: Timestamp | null;
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
  | "status_changed";

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