import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import type {
  Profile,
  Business,
  Project,
  Review,
  BusinessStatus,
} from "@/lib/database.types";

// ─── Extended types for admin views (joined data) ───────
export interface AdminBusiness extends Business {
  profile_name?: string;
  profile_email?: string;
}

export interface AdminProject extends Project {
  customer_name?: string;
  customer_email?: string;
}

export interface AdminReview extends Review {
  customer_name?: string;
  business_name?: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalCustomers: number;
  totalCreators: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  newCustomersThisWeek: number;
  newCreatorsThisWeek: number;
  pendingCreators: number;
  projectsByStatus: Record<string, number>;
  totalProjects: number;
  totalOffers: number;
  totalReviews: number;
}

// ─── Hook ────────────────────────────────────────────────
export function useAdmin() {
  const [loading, setLoading] = useState(false);

  // ── Fetch all profiles ─────────────────────────────────
  const fetchAllProfiles = useCallback(async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("[admin] fetchAllProfiles:", error.message);
    return (data as Profile[]) ?? [];
  }, []);

  // ── Fetch all businesses (with profile join) ───────────
  const fetchAllBusinesses = useCallback(async (): Promise<AdminBusiness[]> => {
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] fetchAllBusinesses:", error.message);
      return [];
    }

    // Join with profiles for name/email
    const userIds = (businesses ?? []).map((b: any) => b.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (businesses ?? []).map((b: any) => ({
      ...b,
      profile_name: profileMap.get(b.user_id)?.name ?? "",
      profile_email: profileMap.get(b.user_id)?.email ?? "",
    })) as AdminBusiness[];
  }, []);

  // ── Fetch pending businesses ───────────────────────────
  const fetchPendingBusinesses = useCallback(async (): Promise<AdminBusiness[]> => {
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[admin] fetchPendingBusinesses:", error.message);
      return [];
    }

    const userIds = (businesses ?? []).map((b: any) => b.user_id);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (businesses ?? []).map((b: any) => ({
      ...b,
      profile_name: profileMap.get(b.user_id)?.name ?? "",
      profile_email: profileMap.get(b.user_id)?.email ?? "",
    })) as AdminBusiness[];
  }, []);

  // ── Fetch all projects (with customer join) ────────────
  const fetchAllProjects = useCallback(async (): Promise<AdminProject[]> => {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] fetchAllProjects:", error.message);
      return [];
    }

    const customerIds = [...new Set((projects ?? []).map((p: any) => p.customer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", customerIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (projects ?? []).map((p: any) => ({
      ...p,
      customer_name: profileMap.get(p.customer_id)?.name ?? "",
      customer_email: profileMap.get(p.customer_id)?.email ?? "",
    })) as AdminProject[];
  }, []);

  // ── Fetch all reviews (with joins) ─────────────────────
  const fetchAllReviews = useCallback(async (): Promise<AdminReview[]> => {
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] fetchAllReviews:", error.message);
      return [];
    }

    const customerIds = [...new Set((reviews ?? []).map((r: any) => r.customer_id))];
    const businessIds = [...new Set((reviews ?? []).map((r: any) => r.business_id))];

    const [{ data: profiles }, { data: businesses }] = await Promise.all([
      supabase.from("profiles").select("id, name").in("id", customerIds),
      supabase.from("businesses").select("id, name").in("id", businessIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const businessMap = new Map((businesses ?? []).map((b: any) => [b.id, b]));

    return (reviews ?? []).map((r: any) => ({
      ...r,
      customer_name: profileMap.get(r.customer_id)?.name ?? "",
      business_name: businessMap.get(r.business_id)?.name ?? "",
    })) as AdminReview[];
  }, []);

  // ── Analytics ──────────────────────────────────────────
  const fetchAnalytics = useCallback(async (): Promise<AdminAnalytics> => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: allProfiles },
      { data: recentProfiles },
      { data: monthProfiles },
      { data: businesses },
      { data: projects },
      { data: offers },
      { data: reviews },
    ] = await Promise.all([
      supabase.from("profiles").select("id, role, created_at"),
      supabase.from("profiles").select("id, role").gte("created_at", weekAgo),
      supabase.from("profiles").select("id, role").gte("created_at", monthAgo),
      supabase.from("businesses").select("id, status"),
      supabase.from("projects").select("id, status"),
      supabase.from("offers").select("id"),
      supabase.from("reviews").select("id"),
    ]);

    const all = allProfiles ?? [];
    const recent = recentProfiles ?? [];
    const month = monthProfiles ?? [];
    const biz = businesses ?? [];
    const proj = projects ?? [];

    const projectsByStatus: Record<string, number> = {};
    proj.forEach((p: any) => {
      projectsByStatus[p.status] = (projectsByStatus[p.status] ?? 0) + 1;
    });

    return {
      totalUsers: all.length,
      totalCustomers: all.filter((p: any) => p.role === "customer").length,
      totalCreators: all.filter((p: any) => p.role === "business").length,
      newUsersThisWeek: recent.length,
      newUsersThisMonth: month.length,
      newCustomersThisWeek: recent.filter((p: any) => p.role === "customer").length,
      newCreatorsThisWeek: recent.filter((p: any) => p.role === "business").length,
      pendingCreators: biz.filter((b: any) => b.status === "pending").length,
      projectsByStatus,
      totalProjects: proj.length,
      totalOffers: (offers ?? []).length,
      totalReviews: (reviews ?? []).length,
    };
  }, []);

  // ── Creator approval actions ───────────────────────────
  const approveBusiness = useCallback(async (businessId: string, userId: string) => {
    const { error } = await supabase
      .from("businesses")
      .update({ status: "approved" as BusinessStatus, rejection_reason: null })
      .eq("id", businessId);

    if (error) {
      console.error("[admin] approveBusiness:", error.message);
      return { error: error.message };
    }

    await createNotification({
      userId,
      type: "creator_approved",
      title: "Your profile has been approved!",
      message: "You can now receive project requests. Welcome to DEXO!",
    });

    return { error: null };
  }, []);

  const rejectBusiness = useCallback(async (businessId: string, userId: string, reason: string) => {
    const { error } = await supabase
      .from("businesses")
      .update({ status: "rejected" as BusinessStatus, rejection_reason: reason })
      .eq("id", businessId);

    if (error) {
      console.error("[admin] rejectBusiness:", error.message);
      return { error: error.message };
    }

    await createNotification({
      userId,
      type: "creator_rejected",
      title: "Profile review update",
      message: reason || "Your profile needs changes before it can be approved.",
    });

    return { error: null };
  }, []);

  const suspendBusiness = useCallback(async (businessId: string) => {
    const { error } = await supabase
      .from("businesses")
      .update({ status: "suspended" as BusinessStatus })
      .eq("id", businessId);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  // ── Generic CRUD operations ────────────────────────────
  const updateProfile = useCallback(async (id: string, updates: Partial<Profile>) => {
    const { error } = await supabase.from("profiles").update(updates).eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const updateBusiness = useCallback(async (id: string, updates: Partial<Business>) => {
    const { error } = await supabase.from("businesses").update(updates).eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase.from("projects").update(updates).eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const deleteBusiness = useCallback(async (id: string) => {
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const deleteReview = useCallback(async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  return {
    loading,
    setLoading,
    // Fetch
    fetchAllProfiles,
    fetchAllBusinesses,
    fetchPendingBusinesses,
    fetchAllProjects,
    fetchAllReviews,
    fetchAnalytics,
    // Creator approval
    approveBusiness,
    rejectBusiness,
    suspendBusiness,
    // CRUD
    updateProfile,
    updateBusiness,
    updateProject,
    deleteProject,
    deleteBusiness,
    deleteReview,
  };
}
