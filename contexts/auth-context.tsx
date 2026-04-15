"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
  department: Department;
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch Firestore user profile
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            ...data,
            role: data.role || "staff",
            department: data.department || "Sales",
          } as UserProfile);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? "staff", loading }}>
      {children}
    </AuthContext.Provider>
  );
}
