"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  writeAuditLog,
  subscribeToElevation,
  revokeElevation as firestoreRevokeElevation,
  requestElevation as firestoreRequestElevation,
  type JitElevation,
  type ElevationTier,
} from "@/lib/firestore";
import { signOut } from "firebase/auth";

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
  department: string | null;   // Department name (human-readable)
  departmentId?: string | null; // Firestore dept doc ID (stable foreign key)
  isDeptAdmin?: boolean;       // true when role=="admin" for explicit querying
  avatarUrl?: string;
  jobTitle?: string;
  fullPower?: boolean;         // true if CEO granted this admin full authority
  delegatedCeoId?: string;     // the CEO UID this user can act as
  isExecutiveAdmin?: boolean;  // true for super_admin granted "Act as CEO" by CEO
  createdAt: unknown;
  updatedAt: unknown;
  // ── Probationary promotion fields ─────────────────────────
  roleStatus?: "active" | "probation";
  pendingRole?: "dept_admin" | null;
  probationExpiry?: unknown;        // Firestore Timestamp
  probationDurationHours?: number;
  assignedDepartment?: string | null;
  promotedByName?: string | null;
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

interface ElevationContextValue {
  isElevated: boolean;                   // true when any active elevation exists
  isOperationallyElevated: boolean;      // operational tier active
  isCriticallyElevated: boolean;         // critical tier active + CEO-approved
  elevationTier: ElevationTier | null;   // which tier is active
  elevation: JitElevation | null;        // full elevation record
  elevationExpiresAt: Date | null;       // parsed JS Date
  elevationCountdown: string;            // human-readable "1h 23m 45s"
  requestElevation: (params: { justification: string; durationMs: number; durationLabel: string; tier: ElevationTier }) => Promise<void>;
  revokeElevation: (revokedBy?: string) => Promise<void>;
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

const ElevationContext = createContext<ElevationContextValue>({
  isElevated: false,
  isOperationallyElevated: false,
  isCriticallyElevated: false,
  elevationTier: null,
  elevation: null,
  elevationExpiresAt: null,
  elevationCountdown: "",
  requestElevation: async () => {},
  revokeElevation: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useActingAsCeo() {
  return useContext(ActingAsCeoContext);
}

export function useElevation() {
  return useContext(ElevationContext);
}

export function useIsElevated() {
  return useContext(ElevationContext).isElevated;
}

export function useIsOperationallyElevated() {
  return useContext(ElevationContext).isOperationallyElevated;
}

export function useIsCriticallyElevated() {
  return useContext(ElevationContext).isCriticallyElevated;
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

// ─── COUNTDOWN FORMATTER ─────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── PROVIDER ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingAsCeo, setActingAsCeo] = useState(false);
  const [ceoId, setCeoId] = useState<string | null>(null);
  // ── JIT Elevation state ──
  const [elevation, setElevation] = useState<JitElevation | null>(null);
  const [elevationCountdown, setElevationCountdown] = useState("");
  // ── Security Sentry: record when this session started ──
  const sessionStartedAt = useRef<number>(Date.now());

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
              const role = (data.role as UserRole) ?? "staff";
              const newProfile: UserProfile = {
                email: data.email ?? "",
                firstName: data.firstName ?? "",
                lastName: data.lastName ?? "",
                companyName: data.companyName ?? null,
                role,
                department: data.department ?? null,
                departmentId: data.departmentId ?? null,
                isDeptAdmin: data.isDeptAdmin ?? (role === "admin"),
                avatarUrl: data.avatarUrl ?? undefined,
                jobTitle: data.jobTitle ?? undefined,
                fullPower: data.fullPower ?? false,
                delegatedCeoId: data.delegatedCeoId ?? undefined,
                isExecutiveAdmin: data.isExecutiveAdmin ?? false,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                roleStatus: data.roleStatus ?? "active",
                pendingRole: data.pendingRole ?? null,
                probationExpiry: data.probationExpiry ?? null,
                probationDurationHours: data.probationDurationHours ?? null,
                assignedDepartment: data.assignedDepartment ?? null,
                promotedByName: data.promotedByName ?? null,
              };
              setProfile(newProfile);

              // ── SECURITY SENTRY: force-logout if CEO hit Emergency Brake ──
              const flt = data.forceLogoutTimestamp as { seconds: number } | null | undefined;
              if (flt && flt.seconds * 1000 > sessionStartedAt.current) {
                // Revocation happened after this session started — kick out
                signOut(auth).catch(() => {});
                if (typeof window !== "undefined") {
                  window.location.replace("/login?reason=security_reset");
                }
                return;
              }
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

  // ── JIT Elevation subscription + auto-revoke timer ──────────
  useEffect(() => {
    if (!user || profile?.role !== "super_admin") {
      setElevation(null);
      return;
    }
    const unsub = subscribeToElevation(user.uid, setElevation);
    return unsub;
  }, [user, profile?.role]);

  // Client-side countdown + auto-revoke
  useEffect(() => {
    if (!elevation || elevation.status !== "active") {
      setElevationCountdown("");
      return;
    }
    const expiresAt = (elevation.expiresAt as unknown as { toDate?: () => Date })?.toDate?.();
    if (!expiresAt) return;

    const tick = () => {
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        setElevationCountdown("0s");
        // Auto-revoke
        if (user) {
          const name = profile ? `${profile.firstName} ${profile.lastName}` : "Super Admin";
          firestoreRevokeElevation(user.uid, name, "timer").catch(console.error);
        }
        return;
      }
      setElevationCountdown(formatCountdown(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [elevation, user, profile]);

  const handleRequestElevation = useCallback(async ({
    justification,
    durationMs,
    durationLabel,
    tier,
  }: { justification: string; durationMs: number; durationLabel: string; tier: ElevationTier }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!user || !profile) return;
    const actorName = `${profile.firstName} ${profile.lastName}`;
    await firestoreRequestElevation({ uid: user.uid, actorName, justification, durationMs, tier });
    // CEO notification is handled server-side by the onElevationCreate Cloud Function
  }, [user, profile]);

  const handleRevokeElevation = useCallback(async (revokedBy = "self") => {
    if (!user || !profile) return;
    const actorName = `${profile.firstName} ${profile.lastName}`;
    await firestoreRevokeElevation(user.uid, actorName, revokedBy);
  }, [user, profile]);

  const elevationExpiresAt = (() => {
    if (!elevation || elevation.status !== "active") return null;
    return (elevation.expiresAt as unknown as { toDate?: () => Date })?.toDate?.() ?? null;
  })();

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

  const isActive = elevation?.status === "active" && !!elevationExpiresAt && elevationExpiresAt > new Date();
  const isOperationallyElevated = isActive && elevation?.tier === "operational";
  const isCriticallyElevated = isActive && elevation?.tier === "critical" && elevation?.approvalStatus === "approved";

  const elevationValue: ElevationContextValue = {
    isElevated: isActive,
    isOperationallyElevated,
    isCriticallyElevated,
    elevationTier: isActive ? (elevation?.tier ?? null) : null,
    elevation,
    elevationExpiresAt,
    elevationCountdown,
    requestElevation: handleRequestElevation,
    revokeElevation: handleRevokeElevation,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <ActingAsCeoContext.Provider value={actingValue}>
        <ElevationContext.Provider value={elevationValue}>
          {children}
        </ElevationContext.Provider>
      </ActingAsCeoContext.Provider>
    </AuthContext.Provider>
  );
}