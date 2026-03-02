import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Offer } from "@/lib/database.types";

export function useOffers(projectId?: string) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOffersForProject = useCallback(
    async (pid?: string) => {
      const id = pid ?? projectId;
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOffers(data as Offer[]);
      }
      setLoading(false);
    },
    [projectId]
  );

  useEffect(() => {
    if (projectId) {
      fetchOffersForProject(projectId);
    }
  }, [projectId, fetchOffersForProject]);

  return { offers, loading, fetchOffersForProject };
}

export function useOffersForProjects(projectIds: string[]) {
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectIds.length === 0) return;

    const fetchCounts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("offers")
        .select("project_id")
        .in("project_id", projectIds);

      if (!error && data) {
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.project_id] = (counts[row.project_id] || 0) + 1;
        }
        setOfferCounts(counts);
      }
      setLoading(false);
    };

    fetchCounts();
  }, [projectIds.join(",")]);

  return { offerCounts, loading };
}

export function useBusinessOffers(businessId: string | undefined) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    const fetchOffers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useBusinessOffers] error:", error.message);
      }
      setOffers((data as Offer[]) ?? []);
      setLoading(false);
    };

    fetchOffers();
  }, [businessId]);

  const createOffer = async (
    offer: Omit<Offer, "id" | "created_at">
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase
      .from("offers")
      .insert(offer)
      .select()
      .single();

    if (error) {
      console.error("[useBusinessOffers] create error:", error.message);
      return { error: error.message };
    }
    setOffers((prev) => [data as Offer, ...prev]);

    // Transition project status: sent → offers_received
    await supabase
      .from("projects")
      .update({ status: "offers_received" })
      .eq("id", offer.project_id)
      .eq("status", "sent");

    return { error: null };
  };

  return { offers, loading, createOffer };
}
