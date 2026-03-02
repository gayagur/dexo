import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Business } from "@/lib/database.types";

export function useBusinessProfile() {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Loading = auth still loading OR we haven't fetched yet
  const loading = authLoading || (!fetched && !!user);

  const fetchMyBusiness = useCallback(async () => {
    if (!user) {
      setBusiness(null);
      setFetched(false);
      return;
    }
    setFetching(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = "0 rows" which is expected for new users
      console.error("[useBusinessProfile] fetch error:", error.message);
    }
    setBusiness((data as Business) ?? null);
    setFetching(false);
    setFetched(true);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyBusiness();
    } else if (!authLoading) {
      // Auth resolved with no user — clear state
      setBusiness(null);
      setFetched(true);
    }
  }, [user, authLoading, fetchMyBusiness]);

  const createBusiness = async (
    data: Omit<Business, "id" | "created_at" | "rating">
  ): Promise<{ data: Business | null; error: string | null }> => {
    const { data: created, error } = await supabase
      .from("businesses")
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error("[useBusinessProfile] create error:", error.message);
      return { data: null, error: error.message };
    }
    const biz = created as Business;
    setBusiness(biz);
    return { data: biz, error: null };
  };

  const updateBusiness = async (
    id: string,
    updates: Partial<Omit<Business, "id">>
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[useBusinessProfile] update error:", error.message);
      return { error: error.message };
    }
    setBusiness((prev) => (prev ? { ...prev, ...updates } : null));
    return { error: null };
  };

  return { business, loading, fetching, fetchMyBusiness, createBusiness, updateBusiness };
}
