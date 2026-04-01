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
  isCreator: boolean;
  isBusiness: boolean;
  creatorApproved: boolean;
  needsRoleSelection: boolean;
  loading: boolean;
}

export interface AuthResult {
  error: string | null;
  /** Set when the user's actual DB role differs from what they selected */
  roleMismatch?: { actualRole: Role };
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
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

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong, please try again.";
}

const OAUTH_ROLE_KEY = "dexo_oauth_role";
const ROLE_SELECTION_KEY_PREFIX = "dexo_needs_role_selection:";

function getRoleSelectionKey(userId: string) {
  return `${ROLE_SELECTION_KEY_PREFIX}${userId}`;
}

function normalizeRole(value: unknown): Role | null {
  if (value === "customer" || value === "business" || value === "creator") {
    return value;
  }
  return null;
}

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
    isCreator: false,
    isBusiness: false,
    creatorApproved: false,
    needsRoleSelection: false,
    loading: true,
  });
  const fetchRole = useCallback(async (user: User): Promise<{
    role: Role | null;
    activeRole: Role | null;
    isAdmin: boolean;
    isCreator: boolean;
    isBusiness: boolean;
    creatorApproved: boolean;
    needsRoleSelection: boolean;
  }> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const defaultRole: Role = "customer";
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email ?? "",
          name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          avatar_url: user.user_metadata?.avatar_url || null,
          role: defaultRole,
          active_role: defaultRole,
          is_admin: false,
          is_creator: false,
          is_business: false,
          creator_approved: false,
          creator_profile: null,
        });

      if (insertError) {
        throw insertError;
      }

      localStorage.setItem(getRoleSelectionKey(user.id), "true");

      return {
        role: defaultRole,
        activeRole: defaultRole,
        isAdmin: false,
        isCreator: false,
        isBusiness: false,
        creatorApproved: false,
        needsRoleSelection: true,
      };
    }

    const role = normalizeRole(data.role) ?? "customer";
    let activeRole = normalizeRole(data.active_role) ?? role;
    const isAdmin = Boolean(data.is_admin);
    const isCreator = Boolean(data.is_creator);
    const creatorApproved = Boolean(data.creator_approved);
    const isBusiness = Boolean((data as { is_business?: boolean }).is_business ?? data.is_creator ?? role === "business");
    let needsRoleSelection = localStorage.getItem(getRoleSelectionKey(user.id)) === "true";

    if (activeRole !== role && !isBusiness) {
      await supabase
        .from("profiles")
        .update({ active_role: role })
        .eq("id", user.id);
      activeRole = role;
    }

    if (needsRoleSelection && (isBusiness || role !== "customer" || activeRole !== "customer")) {
      localStorage.removeItem(getRoleSelectionKey(user.id));
      needsRoleSelection = false;
    }

    return {
      role,
      activeRole,
      isAdmin,
      isCreator,
      isBusiness,
      creatorApproved,
      needsRoleSelection,
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    // Track whether initSession has completed so onAuthStateChange
    // doesn't race it with a duplicate fetchRole call.
    let initDone = false;

    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 10000);
        if (!mounted) return;
        let role: Role | null = null;
        let activeRole: Role | null = null;
        let isAdmin = false;
        let isCreator = false;
        let isBusiness = false;
        let creatorApproved = false;
        let needsRoleSelection = false;
        if (session?.user) {
          try {
            const result = await withTimeout(fetchRole(session.user), 8000);
            role = result.role;
            activeRole = result.activeRole;
            isAdmin = result.isAdmin;
            isCreator = result.isCreator;
            isBusiness = result.isBusiness;
            creatorApproved = result.creatorApproved;
            needsRoleSelection = result.needsRoleSelection;
          } catch {
            /* use defaults — role will resolve via onAuthStateChange */
          }
        }
        setState({
          session,
          user: session?.user ?? null,
          role,
          activeRole,
          isAdmin,
          isCreator,
          isBusiness,
          creatorApproved,
          needsRoleSelection,
          loading: false,
        });
      } catch {
        if (mounted) {
          setState({
            session: null,
            user: null,
            role: null,
            activeRole: null,
            isAdmin: false,
            isCreator: false,
            isBusiness: false,
            creatorApproved: false,
            needsRoleSelection: false,
            loading: false,
          });
        }
      }
      initDone = true;
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Skip INITIAL_SESSION — initSession() already handles it.
      // This prevents a race where both call fetchRole and the loser
      // overwrites isAdmin back to false.
      if (event === "INITIAL_SESSION") return;

      // For SIGNED_OUT, clear everything immediately — no fetch needed
      if (!session?.user) {
        setState({
          session: null,
          user: null,
          role: null,
          activeRole: null,
          isAdmin: false,
          isCreator: false,
          isBusiness: false,
          creatorApproved: false,
          needsRoleSelection: false,
          loading: false,
        });
        return;
      }

      // For real auth changes (SIGNED_IN, TOKEN_REFRESHED, etc.),
      // wait for initSession to finish first to avoid overwriting its result.
      if (!initDone) {
        return;
      }

      console.log("[onAuthStateChange] event:", event, "— fetching role...");

      let role: Role | null = null;
      let activeRole: Role | null = null;
      let isAdmin = false;
      let isCreator = false;
      let isBusiness = false;
      let creatorApproved = false;
      let needsRoleSelection = false;
      try {
        const result = await withTimeout(fetchRole(session.user), 8000);
        role = result.role;
        activeRole = result.activeRole;
        isAdmin = result.isAdmin;
        isCreator = result.isCreator;
        isBusiness = result.isBusiness;
        creatorApproved = result.creatorApproved;
        needsRoleSelection = result.needsRoleSelection;
      } catch {
        setState((prev) => ({
          session, user: session.user, role: prev.role, activeRole: prev.activeRole,
          isAdmin: prev.isAdmin,
          isCreator: prev.isCreator,
          isBusiness: prev.isBusiness,
          creatorApproved: prev.creatorApproved,
          needsRoleSelection: prev.needsRoleSelection,
          loading: false,
        }));
        return;
      }
      console.log("[onAuthStateChange] Setting state: role=", role, "activeRole=", activeRole);
      setState({
        session,
        user: session.user,
        role,
        activeRole,
        isAdmin,
        isCreator,
        isBusiness,
        creatorApproved,
        needsRoleSelection,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  // ─── Auth Methods ───────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<AuthResult> => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
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
            .upsert(
              {
                id: data.user.id,
                email,
                name,
                avatar_url: data.user.user_metadata?.avatar_url || null,
                role: "customer",
                active_role: "customer",
                is_admin: false,
                is_creator: false,
                is_business: false,
                creator_approved: false,
                creator_profile: null,
              },
              { onConflict: "id" }
            );
          localStorage.setItem(getRoleSelectionKey(data.user.id), "true");
        }

        analytics.userSignedUp('email', 'customer');
        return { error: null };
      } catch (e: unknown) {
        const message = getUnknownErrorMessage(e);
        if (message === "TIMEOUT") return { error: "TIMEOUT" };
        if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) {
          return { error: "NETWORK_ERROR" };
        }
        return { error: message };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          30000
        );
        if (error) {
          const msg = getAuthErrorMessage(error);
          if (msg === "RATE_LIMIT") return { error: "RATE_LIMIT" };
          if (msg === "NETWORK_ERROR") return { error: "NETWORK_ERROR" };
          return { error: msg };
        }
        return { error: null };
      } catch (e: unknown) {
        const message = getUnknownErrorMessage(e);
        if (message === "TIMEOUT") return { error: "TIMEOUT" };
        if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) {
          return { error: "NETWORK_ERROR" };
        }
        return { error: message };
      }
    },
    []
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
    } catch (e: unknown) {
      return { error: getUnknownErrorMessage(e) };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(OAUTH_ROLE_KEY);
    localStorage.removeItem("dexo_pending_design");
    await supabase.auth.signOut();
    setState({
      session: null,
      user: null,
      role: null,
      activeRole: null,
      isAdmin: false,
      isCreator: false,
      isBusiness: false,
      creatorApproved: false,
      needsRoleSelection: false,
      loading: false,
    });
  }, []);

  const switchRole = useCallback(async (newRole: Role): Promise<{ error: string | null }> => {
    if (!state.user) return { error: "Not authenticated" };
    if (newRole === "business" && !state.isBusiness) {
      return { error: "Business profile not available" };
    }

    console.log("[switchRole] Updating active_role to:", newRole, "for user:", state.user.id);
    const { error, data: updateData } = await supabase
      .from("profiles")
      .update({ active_role: newRole })
      .eq("id", state.user.id)
      .select("active_role");

    if (error) {
      console.error("[switchRole] FAILED:", error.message, error.details, error.hint);
      return { error: error.message };
    }
    console.log("[switchRole] SUCCESS:", updateData);

    analytics.roleSwitch(state.activeRole || 'unknown', newRole);
    localStorage.setItem(OAUTH_ROLE_KEY, newRole);
    setState((prev) => ({
      ...prev,
      activeRole: newRole,
      needsRoleSelection: false,
    }));
    return { error: null };
  }, [state.activeRole, state.isBusiness, state.user]);

  useEffect(() => {
    if (state.user?.id && state.activeRole) {
      localStorage.setItem(OAUTH_ROLE_KEY, state.activeRole);
      return;
    }

    localStorage.removeItem(OAUTH_ROLE_KEY);
  }, [state.activeRole, state.user?.id]);

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
