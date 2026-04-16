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

export const DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Legal",
  "Engineering",
  "Operations",
  "Finance",
] as const;
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
      // Clean up previous profile listener before doing anything else
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        // Real-time profile listener — detects role/department changes instantly
        unsubProfile = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setProfile({
                email: data.email ?? "",
                firstName: data.firstName ?? "",
                lastName: data.lastName ?? "",
                companyName: data.companyName ?? null,
                role: (data.role as UserRole) ?? "staff",
                department: data.department ?? null,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              });
            } else {
              // User doc not yet created (e.g. just registered)
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            // permission-denied fires briefly during sign-out before the
            // listener is torn down — suppress it gracefully.
            if (error.code === "permission-denied") {
              console.log(
                "[AuthProvider] Listener closed gracefully during logout."
              );
            } else {
              console.error(
                `[AuthProvider] onSnapshot error for user ${firebaseUser.uid}:`,
                error.code ?? "",
                error.message
              );
            }
            setLoading(false);
          }
        );
      } else {
        // Signed out
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    role: profile?.role ?? "staff",
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}