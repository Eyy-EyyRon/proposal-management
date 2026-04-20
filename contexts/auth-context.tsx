"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { writeAuditLog } from "@/lib/firestore";

// ─── TYPES ───────────────────────────────────────────────────
export type UserRole = "staff" | "admin" | "super_admin" | "ceo";

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
  avatarUrl?: string;
  jobTitle?: string;
  fullPower?: boolean;         // true if CEO granted this admin full authority
  delegatedCeoId?: string;     // the CEO UID this user can act as
  isExecutiveAdmin?: boolean;  // true for super_admin granted "Act as CEO" by CEO
  createdAt: unknown;
  updatedAt: unknown;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
}

interface ActingAsCeoContextValue {
  actingAsCeo: boolean;
  ceoId: string | null;
  toggleActingAsCeo: () => Promise<void>;
  canActAsCeo: boolean;   // true for CEO or fullPower Admin
}

// ─── CONTEXTS ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: "staff",
  loading: true,
});

const ActingAsCeoContext = createContext<ActingAsCeoContextValue>({
  actingAsCeo: false,
  ceoId: null,
  toggleActingAsCeo: async () => {},
  canActAsCeo: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useActingAsCeo() {
  return useContext(ActingAsCeoContext);
}

export function useRole() {
  const { role } = useContext(AuthContext);
  const { actingAsCeo } = useContext(ActingAsCeoContext);
  return {
    role,
    isStaff: role === "staff",
    isAdmin: role === "admin",
    isSuperAdmin: role === "super_admin",
    isCeo: role === "ceo" || actingAsCeo,
    isAtLeast: (minRole: UserRole) => {
      const order: Record<UserRole, number> = { staff: 0, admin: 1, super_admin: 2, ceo: 3 };
      return order[role] >= order[minRole];
    },
  };
}

// ─── PROVIDER ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingAsCeo, setActingAsCeo] = useState(false);
  const [ceoId, setCeoId] = useState<string | null>(null);

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
              const newProfile: UserProfile = {
                email: data.email ?? "",
                firstName: data.firstName ?? "",
                lastName: data.lastName ?? "",
                companyName: data.companyName ?? null,
                role: (data.role as UserRole) ?? "staff",
                department: data.department ?? null,
                avatarUrl: data.avatarUrl ?? undefined,
                jobTitle: data.jobTitle ?? undefined,
                fullPower: data.fullPower ?? false,
                delegatedCeoId: data.delegatedCeoId ?? undefined,
                isExecutiveAdmin: data.isExecutiveAdmin ?? false,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              };
              setProfile(newProfile);
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

  const canActAsCeo = (
    profile?.role === "ceo" ||
    // Dept Admin with full power
    (profile?.role === "admin" && profile?.fullPower === true && !!profile?.delegatedCeoId) ||
    // Super Admin granted Executive Admin authority by CEO
    (profile?.role === "super_admin" && profile?.isExecutiveAdmin === true && !!profile?.delegatedCeoId)
  );

  const toggleActingAsCeo = useCallback(async () => {
    if (!user || !profile) return;
    if (!canActAsCeo) return;
    const next = !actingAsCeo;
    // For CEO, ceoId is their own UID; for fullPower admin, it's the delegatedCeoId
    const resolvedCeoId = profile.role === "ceo" ? user.uid : (profile.delegatedCeoId ?? null);
    // Fetch ceo name for audit
    let ceoName = "CEO";
    if (resolvedCeoId && resolvedCeoId !== user.uid) {
      try {
        const ceoSnap = await getDoc(doc(db, "users", resolvedCeoId));
        if (ceoSnap.exists()) {
          const d = ceoSnap.data();
          ceoName = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || ceoName;
        }
      } catch { /* non-critical */ }
    }
    setActingAsCeo(next);
    setCeoId(next ? resolvedCeoId : null);
    await writeAuditLog({
      action: "identity_switched",
      actorId: user.uid,
      actorName: `${profile.firstName} ${profile.lastName}`,
      actorRole: profile.role,
      description: next
        ? `${profile.firstName} ${profile.lastName} activated CEO identity (acting as ${ceoName})`
        : `${profile.firstName} ${profile.lastName} deactivated CEO identity`,
      actingAsCeo: next,
      metadata: { ceoId: resolvedCeoId },
    });
  }, [user, profile, actingAsCeo, canActAsCeo]);

  const authValue: AuthContextValue = {
    user,
    profile,
    role: profile?.role ?? "staff",
    loading,
  };

  const actingValue: ActingAsCeoContextValue = {
    actingAsCeo,
    ceoId,
    toggleActingAsCeo,
    canActAsCeo,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <ActingAsCeoContext.Provider value={actingValue}>
        {children}
      </ActingAsCeoContext.Provider>
    </AuthContext.Provider>
  );
}