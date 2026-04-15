"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "super-admin" | "admin" | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

import { createContext, useContext } from "react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthGuard");
  }
  return context;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual Firebase Auth check
    // This is a mock implementation for development
    const checkAuth = async () => {
      // Simulate auth check delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check for stored session (mock)
      const storedUser = localStorage.getItem("hyacinth_user");

      if (!storedUser) {
        router.push("/");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch {
        localStorage.removeItem("hyacinth_user");
        router.push("/");
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const signOut = async () => {
    // TODO: Replace with actual Firebase signOut
    localStorage.removeItem("hyacinth_user");
    setUser(null);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800000] border-t-transparent" />
          <p className="text-sm text-slate-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
