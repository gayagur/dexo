import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import type { Role } from "@/lib/database.types";

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

function getAuthErrorMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();

  // Rate limiting
  if (msg.includes("rate") || msg.includes("too many") || msg.includes("email rate limit") || error.status === 429) {
    return "RATE_LIMIT";
  }

  // Network / fetch errors
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    role: null,
    loading: true,
  });

  const fetchRole = useCallback(async (user: User): Promise<Role | null> => {
    // Try profiles table first
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role) return data.role as Role;

    // Fallback: profile may not exist yet (trigger delay after signup).
    // Read from user metadata instead.
    const metaRole = user.user_metadata?.role as Role | undefined;
    return metaRole ?? "customer";
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session — with timeout and error handling
    const initSession = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          5000
        );
        if (!mounted) return;
        let role: Role | null = null;
        if (session?.user) {
          try { role = await fetchRole(session.user); } catch { /* use null */ }
        }
        setState({ session, user: session?.user ?? null, role, loading: false });
      } catch {
        // Timeout or network error — stop loading, treat as no session
        if (mounted) {
          setState({ session: null, user: null, role: null, loading: false });
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        let role: Role | null = null;
        if (session?.user) {
          try { role = await fetchRole(session.user); } catch { /* use null */ }
        }
        setState({ session, user: session?.user ?? null, role, loading: false });
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: Role
  ): Promise<AuthResult> => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role },
          },
        }),
        8000
      );

      if (error) {
        const msg = getAuthErrorMessage(error);
        if (msg === "RATE_LIMIT") return { error: "RATE_LIMIT" };
        if (msg === "NETWORK_ERROR") return { error: "NETWORK_ERROR" };
        if (msg === "ALREADY_REGISTERED") return { error: "ALREADY_REGISTERED" };
        return { error: msg };
      }

      // Supabase returns user with empty identities when the email is already taken
      if (data.user && data.user.identities?.length === 0) {
        return { error: "ALREADY_REGISTERED" };
      }

      // If email confirmation is enabled, signup returns user but NO session
      if (data.user && !data.session) {
        return { error: "Check your email to confirm your account, then sign in." };
      }

      // Fallback: ensure profile exists (in case the DB trigger didn't fire)
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          name,
          role,
        }, { onConflict: "id" });
      }

      return { error: null };
    } catch (e: any) {
      if (e.message === "TIMEOUT") return { error: "TIMEOUT" };
      if (e.message?.toLowerCase().includes("fetch") || e.message?.toLowerCase().includes("network")) {
        return { error: "NETWORK_ERROR" };
      }
      return { error: e.message || "Something went wrong, please try again." };
    }
  };

  const signIn = async (
    email: string,
    password: string,
    selectedRole?: Role
  ): Promise<AuthResult> => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        8000
      );
      if (error) {
        const msg = getAuthErrorMessage(error);
        if (msg === "RATE_LIMIT") return { error: "RATE_LIMIT" };
        if (msg === "NETWORK_ERROR") return { error: "NETWORK_ERROR" };
        return { error: msg };
      }

      // Check role mismatch: user selected one role but DB has another
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
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth",
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Something went wrong, please try again." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session: state.session,
    user: state.user,
    role: state.role,
    loading: state.loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };
}
