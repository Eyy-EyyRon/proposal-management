import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const googleProvider = new GoogleAuthProvider();

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
    role: "staff",
    department: null,
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

// ─── GOOGLE SIGN IN ─────────────────────────────────────────
// Signs in with Google popup. If the user is new, creates a
// Firestore profile + analytics doc (same as email sign-up).
export async function signInWithGoogle(): Promise<UserCredential> {
  const credential = await signInWithPopup(auth, googleProvider);
  const { uid, displayName, email, photoURL } = credential.user;

  // Check if user profile already exists
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const parts = (displayName ?? "").split(" ");
    const firstName = parts[0] || "User";
    const lastName = parts.slice(1).join(" ") || "";

    await setDoc(userRef, {
      email: email ?? "",
      firstName,
      lastName,
      companyName: null,
      role: "staff",
      department: null,
      photoURL: photoURL ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, "analytics", uid), {
      totalProposals: 0,
      statusCounts: { sent: 0, viewed: 0, accepted: 0, rejected: 0 },
      conversionRate: 0,
      lastUpdated: serverTimestamp(),
    });
  }

  return credential;
}

// ─── FORGOT PASSWORD ─────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

// ─── SIGN OUT ────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}
