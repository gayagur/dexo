import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { timed } from "@/lib/timing";
import { analytics } from "@/lib/analytics";
import type { Project } from "@/lib/database.types";

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await timed("useProjects.fetch", () =>
        supabase
          .from("projects")
          .select("*")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      );

      if (error) {
        console.error("[useProjects] fetchMyProjects error:", error.message, error.details, error.hint);
      }
      if (data) {
        setProjects(data as Project[]);
      }
    } catch (err) {
      console.error("[useProjects] fetchMyProjects exception:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyProjects();
  }, [fetchMyProjects]);

  const createProject = async (
    project: Omit<Project, "id" | "created_at">
  ): Promise<{ data: Project | null; error: string | null }> => {
    console.log("[useProjects] createProject called with:", {
      customer_id: project.customer_id,
      title: project.title,
      category: project.category,
      status: project.status,
    });

    // Verify we have a session
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("[useProjects] current session user:", sessionData.session?.user?.id);

    if (!sessionData.session) {
      return { data: null, error: "Not authenticated. Please sign in again." };
    }

    // Check if profile exists (RLS requires it for the FK)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", project.customer_id)
      .single();

    console.log("[useProjects] profile check:", { profile, profileError: profileError?.message });

    if (!profile) {
      // Profile missing — trigger may have failed. Create it manually.
      console.warn("[useProjects] Profile not found, creating manually...");
      const user = sessionData.session.user;
      const { error: insertProfileError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          role: (user.user_metadata?.role as "customer" | "business") || "customer",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        });

      if (insertProfileError) {
        console.error("[useProjects] Failed to create profile:", insertProfileError.message);
        return { data: null, error: "Failed to create user profile: " + insertProfileError.message };
      }
      console.log("[useProjects] Profile created successfully");
    }

    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();

    if (error) {
      console.error("[useProjects] createProject error:", error.message, error.details, error.hint, error.code);
      return { data: null, error: error.message };
    }

    console.log("[useProjects] Project created:", data.id);
    const created = data as Project;
    setProjects((prev) => [created, ...prev]);
    analytics.projectCreated(created.id, created.category);
    return { data: created, error: null };
  };

  const updateProject = async (
    id: string,
    updates: Partial<Omit<Project, "id">>
  ) => {
    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[useProjects] updateProject error:", error.message);
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    }
  };

  const deleteProject = async (id: string): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[useProjects] deleteProject error:", error.message);
      return { error: error.message };
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    return { error: null };
  };

  return { projects, loading, fetchMyProjects, createProject, updateProject, deleteProject };
}
