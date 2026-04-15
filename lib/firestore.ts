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
}

// ─── TEMPLATES ───────────────────────────────────────────────

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

/** Soft-delete: move template to trash */
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

export type ProposalStatus = "sent" | "viewed" | "accepted" | "rejected" | "archived";

export interface Proposal {
  id: string;
  userId: string;
  department: string;
  templateId: string;
  templateName: string;
  templateFileUrl: string | null;
  templateGdocUrl: string | null;
  clientName: string;
  clientEmail: string;
  fieldValues: Record<string, string>;
  status: ProposalStatus;
  signatureType: "draw" | "upload" | null;
  signatureUrl: string | null;
  signedAt: Timestamp | null;
  viewedAt: Timestamp | null;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── PROPOSALS ───────────────────────────────────────────────

export async function createProposal(
  proposalId: string,
  data: {
    userId: string;
    department: string;
    templateId: string;
    templateName: string;
    templateFileUrl?: string | null;
    templateGdocUrl?: string | null;
    clientName: string;
    clientEmail: string;
    fieldValues: Record<string, string>;
  }
): Promise<void> {
  await setDoc(doc(db, "proposals", proposalId), {
    userId: data.userId,
    department: data.department,
    templateId: data.templateId,
    templateName: data.templateName,
    templateFileUrl: data.templateFileUrl ?? null,
    templateGdocUrl: data.templateGdocUrl ?? null,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    fieldValues: data.fieldValues,
    status: "sent",
    signatureType: null,
    signatureUrl: null,
    signedAt: null,
    viewedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProposals(userId: string): Promise<Proposal[]> {
  const q = query(
    collection(db, "proposals"),
    where("userId", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Proposal[];
}

export function subscribeToProposals(
  userId: string,
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("userId", "==", userId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]
    );
  });
}

export async function getProposal(proposalId: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, "proposals", proposalId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Proposal;
}

/** Mark proposal as "viewed" + set viewedAt (only if still "sent") */
export async function markProposalViewed(proposalId: string): Promise<void> {
  const ref = doc(db, "proposals", proposalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.status !== "sent") return; // only upgrade from sent → viewed
  await updateDoc(ref, {
    status: "viewed",
    viewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Accept proposal: set status, signature data, signedAt */
export async function acceptProposal(
  proposalId: string,
  signatureType: "draw" | "upload",
  signatureUrl: string
): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "accepted",
    signatureType,
    signatureUrl,
    signedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Reject proposal */
export async function rejectProposal(proposalId: string): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
}

/** Archive proposal (soft-delete) */
export async function archiveProposal(proposalId: string): Promise<void> {
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}

// ─── SOFT-DELETE / TRASH ────────────────────────────────────

/** Move any document (proposal or template) to trash */
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

/** Restore a trashed document */
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

/** Permanently delete a document (CEO/Admin only) */
export async function permanentDelete(
  collectionName: "proposals" | "templates",
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}

/** Subscribe to all trashed items across proposals + templates (CEO global) */
export function subscribeToTrashedProposals(
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]
    );
  });
}

export function subscribeToTrashedTemplates(
  callback: (templates: Template[]) => void
): () => void {
  const q = query(
    collection(db, "templates"),
    where("isDeleted", "==", true),
    orderBy("deletedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[]
    );
  });
}

/** Subscribe to trashed proposals within a user's department */
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
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]
    );
  });
}

/** Subscribe to trashed templates within a user's scope */
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
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[]
    );
  });
}

// ─── DEPARTMENT-SCOPED QUERIES ──────────────────────────────

/** Get all proposals (CEO global view) — no userId filter */
export async function getAllProposals(): Promise<Proposal[]> {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[];
}

/** Subscribe to all proposals (CEO global view) */
export function subscribeToAllProposals(
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]
    );
  });
}

/** Subscribe to proposals within a specific department */
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
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]
    );
  });
}
