import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import type { Role } from "@/lib/database.types";

// ─── Types ──────────────────────────────────────────────────
interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
}

export interface AuthResult {
  error: string | null;
  /** Set when the user's actual DB role differs from what they selected */
  roleMismatch?: { actualRole: Role };
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, name: string, role: Role) => Promise<AuthResult>;
  signIn: (email: string, password: string, selectedRole?: Role) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────
function getAuthErrorMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("rate") || msg.includes("too many") || msg.includes("email rate limit") || error.status === 429) {
    return "RATE_LIMIT";
  }

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch") || msg.includes("load failed")) {
    return "NETWORK_ERROR";
  }

  switch (error.message) {
    case "Invalid login credentials":
      return "Wrong email or password. Please check and try again.";
    case "User already registered":
      return "ALREADY_REGISTERED";
    case "Email not confirmed":
      return "Please check your email to confirm your account.";
    case "Signup requires a valid password":
      return "Password must be at least 6 characters.";
    default:
      return error.message;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);
}

const OAUTH_ROLE_KEY = "dexo_oauth_role";

// ─── Context ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    role: null,
    loading: true,
  });

  const fetchRole = useCallback(async (user: User): Promise<Role | null> => {
    // 1. Check profiles table
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role) return data.role as Role;

    // 2. Check user_metadata (set during email signUp)
    const metaRole = user.user_metadata?.role as Role | undefined;
    if (metaRole) return metaRole;

    // 3. Check localStorage (Google OAuth flow stashes role here)
    const savedRole = localStorage.getItem(OAUTH_ROLE_KEY) as Role | null;
    if (savedRole) {
      localStorage.removeItem(OAUTH_ROLE_KEY);
      // Persist for future logins (fire-and-forget)
      supabase.auth.updateUser({ data: { role: savedRole } }).catch(() => {});
      supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            name: user.user_metadata?.full_name || user.user_metadata?.name || "",
            role: savedRole,
          },
          { onConflict: "id" }
        )
        .then(() => {});
      return savedRole;
    }

    // 4. Default
    return "customer";
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        // Don't use withTimeout here — a rejected timeout leaves the
        // supabase-js lock held, blocking subsequent signIn calls.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        let role: Role | null = null;
        if (session?.user) {
          try {
            role = await fetchRole(session.user);
          } catch {
            /* use null */
          }
        }
        setState({ session, user: session?.user ?? null, role, loading: false });
      } catch {
        if (mounted) {
          setState({ session: null, user: null, role: null, loading: false });
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      let role: Role | null = null;
      if (session?.user) {
        try {
          role = await fetchRole(session.user);
        } catch {
          /* use null */
        }
      }
      setState({ session, user: session?.user ?? null, role, loading: false });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  // ─── Auth Methods ───────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, name: string, role: Role): Promise<AuthResult> => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { data: { name, role } },
          }),
          30000
        );

        if (error) {
          const msg = getAuthErrorMessage(error);
          if (msg === "RATE_LIMIT") return { error: "RATE_LIMIT" };
          if (msg === "NETWORK_ERROR") return { error: "NETWORK_ERROR" };
          if (msg === "ALREADY_REGISTERED") return { error: "ALREADY_REGISTERED" };
          return { error: msg };
        }

        if (data.user && data.user.identities?.length === 0) {
          return { error: "ALREADY_REGISTERED" };
        }

        if (data.user && !data.session) {
          return { error: "Check your email to confirm your account, then sign in." };
        }

        if (data.user) {
          await supabase
            .from("profiles")
            .upsert({ id: data.user.id, email, name, role }, { onConflict: "id" });
        }

        return { error: null };
      } catch (e: any) {
        if (e.message === "TIMEOUT") return { error: "TIMEOUT" };
        if (e.message?.toLowerCase().includes("fetch") || e.message?.toLowerCase().includes("network")) {
          return { error: "NETWORK_ERROR" };
        }
        return { error: e.message || "Something went wrong, please try again." };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string, selectedRole?: Role): Promise<AuthResult> => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          30000
        );
        if (error) {
          const msg = getAuthErrorMessage(error);
          if (msg === "RATE_LIMIT") return { error: "RATE_LIMIT" };
          if (msg === "NETWORK_ERROR") return { error: "NETWORK_ERROR" };
          return { error: msg };
        }

        if (data.user && selectedRole) {
          const actualRole = await fetchRole(data.user);
          if (actualRole && actualRole !== selectedRole) {
            return { error: null, roleMismatch: { actualRole } };
          }
        }

        return { error: null };
      } catch (e: any) {
        if (e.message === "TIMEOUT") return { error: "TIMEOUT" };
        if (e.message?.toLowerCase().includes("fetch") || e.message?.toLowerCase().includes("network")) {
          return { error: "NETWORK_ERROR" };
        }
        return { error: e.message || "Something went wrong, please try again." };
      }
    },
    [fetchRole]
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      // Use current origin so it works on any deployment (localhost, dexo.info, preview deploys)
      const origin = window.location.origin;

      // Safety: never redirect to localhost in production
      if (origin.includes("localhost") && import.meta.env.PROD) {
        console.error("OAuth blocked: localhost detected in production build");
        return { error: "Configuration error. Please contact support." };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth`,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Something went wrong, please try again." };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ─── Memoised context value ─────────────────────────────
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }),
    [state, signUp, signIn, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
