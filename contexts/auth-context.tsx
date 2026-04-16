"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ─── TYPES ───────────────────────────────────────────────────
export type UserRole = "staff" | "admin" | "ceo";

export const DEPARTMENTS = ["Sales", "Marketing", "Legal", "Engineering", "Operations", "Finance"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  role: UserRole;
  department: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
}

// ─── CONTEXT ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: "staff",
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useRole() {
  const { role } = useContext(AuthContext);
  return {
    role,
    isStaff: role === "staff",
    isAdmin: role === "admin",
    isCeo: role === "ceo",
    isAtLeast: (minRole: UserRole) => {
      const order: Record<UserRole, number> = { staff: 0, admin: 1, ceo: 2 };
      return order[role] >= order[minRole];
    },
  };
}

// ─── PROVIDER ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Clean up previous profile listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        // Real-time profile listener — detects role/department changes instantly
        unsubProfile = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setProfile({
                ...data,
                role: data.role || "staff",
                department: data.department || null,
              } as UserProfile);
            }
            setLoading(false);
          },
          (error) => {
            console.error(
              `[AuthProvider] onSnapshot error for user ${firebaseUser.uid}:`,
              error.code ?? "",
              error.message
            );
            if (error.code === "permission-denied") {
              console.warn(
                "[AuthProvider] permission-denied — check Firestore rules for /users/{userId}"
              );
            }
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? "staff", loading }}>
      {children}
    </AuthContext.Provider>
  );
}
