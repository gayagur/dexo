import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Project, Business } from "@/lib/database.types";
import { scoreMatch } from "@/lib/matching";

export interface ScoredProject {
  project: Project;
  matchScore: number;
}

export function useMatchedProjects() {
  const { user, loading: authLoading } = useAuth();
  const [scoredProjects, setScoredProjects] = useState<ScoredProject[]>([]);
  const [fetched, setFetched] = useState(false);

  const loading = authLoading || (!fetched && !!user);

  const fetchMatchedProjects = useCallback(async () => {
    if (!user) {
      setScoredProjects([]);
      setFetched(false);
      return;
    }

    // Fetch the full business profile for scoring
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (bizError || !biz) {
      console.error("[useMatchedProjects] business fetch error:", bizError?.message);
      setScoredProjects([]);
      setFetched(true);
      return;
    }

    const business = biz as Business;
    const categories: string[] = business.categories ?? [];
    if (categories.length === 0) {
      setScoredProjects([]);
      setFetched(true);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("category", categories)
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useMatchedProjects] projects fetch error:", error.message);
    }

    const projects = (data as Project[]) ?? [];

    // Score and sort by match score descending
    const scored = projects
      .map((project) => ({
        project,
        matchScore: scoreMatch(project, business),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    setScoredProjects(scored);
    setFetched(true);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMatchedProjects();
    } else if (!authLoading) {
      setScoredProjects([]);
      setFetched(true);
    }
  }, [user, authLoading, fetchMatchedProjects]);

  // Expose both the scored array and a flat projects array for backwards compat
  const projects = scoredProjects.map((sp) => sp.project);

  return { projects, scoredProjects, loading, fetchMatchedProjects };
}
