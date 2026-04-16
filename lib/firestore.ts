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
  accessCode: string | null;
  signatureType: "draw" | "upload" | null;
  signatureUrl: string | null;
  signedAt: Timestamp | null;
  viewedAt: Timestamp | null;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version?: number; 
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
    accessCode?: string | null;
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
    accessCode: data.accessCode ?? null,
    status: "sent",
    signatureType: null,
    signatureUrl: null,
    signedAt: null,
    viewedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1, 
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
  await updateDoc(doc(db, "proposals", proposalId), {
    status: "accepted",
    signatureType,
    signatureUrl,
    signedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
  role: string;
  department: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function getAllUsers(): Promise<TeamMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as TeamMember[];
}

// ─── DEPARTMENT-SCOPED QUERIES ──────────────────────────────

export async function getAllProposals(): Promise<Proposal[]> {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[];
}

export function subscribeToAllProposals(
  callback: (proposals: Proposal[]) => void
): () => void {
  const q = query(
    collection(db, "proposals"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q, 
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Proposal[]),
    (error) => { if (error.code !== "permission-denied") console.error(error); }
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