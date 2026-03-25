import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export interface FurnitureDesignDraftRow {
  id: string;
  furniture_id: string;
  room_id: string;
  space_type: string;
  style: string;
  created_at: string;
  panels: unknown;
}

export function useFurnitureDesignDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<FurnitureDesignDraftRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setDrafts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("furniture_designs")
      .select("id, furniture_id, room_id, space_type, style, created_at, panels")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) {
      setDrafts(data as FurnitureDesignDraftRow[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeDraft = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      if (!user?.id) return { error: "Not signed in" };
      const { error } = await supabase
        .from("furniture_designs")
        .delete()
        .eq("id", id)
        .eq("customer_id", user.id);
      if (error) return { error: error.message };
      await load();
      return {};
    },
    [user?.id, load]
  );

  return { drafts, loading, refetch: load, removeDraft };
}
