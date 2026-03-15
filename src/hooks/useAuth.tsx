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
import { analytics } from "@/lib/analytics";

// ─── Types ──────────────────────────────────────────────────
interface AuthState {
  session: Session | null;
  user: User | null;
  /** Original registered role */
  role: Role | null;
  /** Currently active role (what the UI branches on) */
  activeRole: Role | null;
  isAdmin: boolean;
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
  /** Switch the active role. Returns error string or null. */
  switchRole: (newRole: Role) => Promise<{ error: string | null }>;
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
    activeRole: null,
    isAdmin: false,
    loading: true,
  });

  const fetchRole = useCallback(async (user: User): Promise<{ role: Role | null; activeRole: Role | null; isAdmin: boolean }> => {
    // 1. Check profiles table — try with active_role first, fall back without it
    const { data, error } = await supabase
      .from("profiles")
      .select("role, active_role, is_admin")
      .eq("id", user.id)
      .single();

    if (data?.role) {
      return {
        role: data.role as Role,
        activeRole: (data.active_role as Role) ?? (data.role as Role),
        isAdmin: data.is_admin ?? false,
      };
    }

    // If query failed (e.g. active_role column doesn't exist yet), retry without it
    if (error) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("role, is_admin")
        .eq("id", user.id)
        .single();

      if (fallback?.role) {
        return {
          role: fallback.role as Role,
          activeRole: fallback.role as Role,
          isAdmin: fallback.is_admin ?? false,
        };
      }
    }

    // 2. Check user_metadata (set during email signUp)
    const metaRole = user.user_metadata?.role as Role | undefined;
    if (metaRole) return { role: metaRole, activeRole: metaRole, isAdmin: false };

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
            active_role: savedRole,
            is_admin: false,
          },
          { onConflict: "id" }
        )
        .then(() => {});
      return { role: savedRole, activeRole: savedRole, isAdmin: false };
    }

    // 4. Default
    return { role: "customer", activeRole: "customer", isAdmin: false };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 10000);
        if (!mounted) return;
        let role: Role | null = null;
        let activeRole: Role | null = null;
        let isAdmin = false;
        if (session?.user) {
          try {
            const result = await withTimeout(fetchRole(session.user), 8000);
            role = result.role;
            activeRole = result.activeRole;
            isAdmin = result.isAdmin;
          } catch {
            /* use defaults — role will resolve via onAuthStateChange */
          }
        }
        setState({ session, user: session?.user ?? null, role, activeRole, isAdmin, loading: false });
      } catch {
        if (mounted) {
          setState({ session: null, user: null, role: null, activeRole: null, isAdmin: false, loading: false });
        }
      }
    };

    initSession();

    // Safety net: force loading to false after 10 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setState((prev) => {
          if (prev.loading) {
            console.warn("[useAuth] Safety timeout — forcing loading to false after 10s");
            return { ...prev, loading: false };
          }
          return prev;
        });
      }
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      let role: Role | null = null;
      let activeRole: Role | null = null;
      let isAdmin = false;
      if (session?.user) {
        try {
          const result = await withTimeout(fetchRole(session.user), 8000);
          role = result.role;
          activeRole = result.activeRole;
          isAdmin = result.isAdmin;
        } catch {
          /* use defaults */
        }
      }
      setState({ session, user: session?.user ?? null, role, activeRole, isAdmin, loading: false });
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
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
            .upsert({ id: data.user.id, email, name, role, active_role: role, is_admin: false }, { onConflict: "id" });
        }

        analytics.userSignedUp('email', role);
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

        // For dual-role users, don't treat role mismatch as error — just use their active_role
        if (data.user && selectedRole) {
          const { role: actualRole } = await fetchRole(data.user);
          if (actualRole && actualRole !== selectedRole) {
            // Check if they have the other role activated (dual-role user)
            // For now, still report mismatch so auth page can handle it
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
      const origin = window.location.origin;

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
      analytics.userSignedUp('google', 'unknown');
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Something went wrong, please try again." };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const switchRole = useCallback(async (newRole: Role): Promise<{ error: string | null }> => {
    if (!state.user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update({ active_role: newRole })
      .eq("id", state.user.id);

    if (error) return { error: error.message };

    analytics.roleSwitch(state.activeRole || 'unknown', newRole);
    setState((prev) => ({ ...prev, activeRole: newRole }));
    return { error: null };
  }, [state.user]);

  // ─── Memoised context value ─────────────────────────────
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      switchRole,
    }),
    [state, signUp, signIn, signInWithGoogle, signOut, switchRole]
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
