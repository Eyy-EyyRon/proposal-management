import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserTemplates(userId: string): Promise<Template[]> {
  const q = query(
    collection(db, "templates"),
    where("userId", "==", userId),
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

export async function deleteTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "templates", templateId));
}

// ─── PROPOSAL TYPES ─────────────────────────────────────────

export type ProposalStatus = "sent" | "viewed" | "accepted" | "rejected";

export interface Proposal {
  id: string;
  userId: string;
  templateId: string;
  templateName: string;
  clientName: string;
  clientEmail: string;
  fieldValues: Record<string, string>;
  status: ProposalStatus;
  signatureType: "draw" | "upload" | null;
  signatureUrl: string | null;
  signedAt: Timestamp | null;
  viewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── PROPOSALS ───────────────────────────────────────────────

export async function createProposal(
  proposalId: string,
  data: {
    userId: string;
    templateId: string;
    templateName: string;
    clientName: string;
    clientEmail: string;
    fieldValues: Record<string, string>;
  }
): Promise<void> {
  await setDoc(doc(db, "proposals", proposalId), {
    userId: data.userId,
    templateId: data.templateId,
    templateName: data.templateName,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    fieldValues: data.fieldValues,
    status: "sent",
    signatureType: null,
    signatureUrl: null,
    signedAt: null,
    viewedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProposals(userId: string): Promise<Proposal[]> {
  const q = query(
    collection(db, "proposals"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Proposal[];
}

export async function getProposal(proposalId: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, "proposals", proposalId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Proposal;
}
