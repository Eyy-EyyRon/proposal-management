import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

// ─── SIGN UP ─────────────────────────────────────────────────
// Creates Firebase Auth user + Firestore user profile document.
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Create user profile in Firestore (matches /users/{userId} schema)
  await setDoc(doc(db, "users", credential.user.uid), {
    email,
    firstName,
    lastName,
    companyName: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Initialize empty analytics doc for this user
  await setDoc(doc(db, "analytics", credential.user.uid), {
    totalProposals: 0,
    statusCounts: { sent: 0, viewed: 0, accepted: 0, rejected: 0 },
    conversionRate: 0,
    lastUpdated: serverTimestamp(),
  });

  return credential;
}

// ─── SIGN IN ─────────────────────────────────────────────────
export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── FORGOT PASSWORD ─────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

// ─── SIGN OUT ────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}
