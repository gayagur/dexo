import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import type { Project, Offer, Profile, Review, Milestone } from "@/lib/database.types";

// ─── Types ──────────────────────────────────────────────

export interface BusinessProject extends Project {
  customer_name: string;
  customer_email: string;
  customer_avatar: string | null;
  offer_price: number;
  offer_timeline: string;
  offer_id: string;
}

export interface BusinessCustomer {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  project_count: number;
  total_spent: number;
  last_interaction: string;
  projects: { id: string; title: string; status: string; price: number }[];
}

export interface BusinessKPIs {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  revenueThisMonth: number;
  totalCustomers: number;
  totalReviews: number;
  avgRating: number;
  conversionRate: number; // offers accepted / total offers
  pendingOffers: number;
}

export interface RevenueByMonth {
  month: string; // "2026-01"
  label: string; // "Jan"
  revenue: number;
  projects: number;
}

export interface ActivityItem {
  id: string;
  type: "offer_sent" | "offer_accepted" | "project_completed" | "review_received" | "message";
  title: string;
  subtitle: string;
  timestamp: string;
  projectId?: string;
}

export interface PageViewStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  byDay: { date: string; views: number }[];
}

// ─── Hook ───────────────────────────────────────────────

export function useBusinessDashboard() {
  const { business, loading: bizLoading } = useBusinessProfile();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [kpis, setKpis] = useState<BusinessKPIs | null>(null);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueByMonth[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [pageViews, setPageViews] = useState<PageViewStats | null>(null);

  const businessId = business?.id;

  // ─── Fetch All Data ───────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    try {
      // 1. Get all accepted offers for this business
      const { data: acceptedOffers } = await supabase
        .from("offers")
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "accepted");

      // 2. Get all offers (for conversion rate)
      const { data: allOffers } = await supabase
        .from("offers")
        .select("id, status, created_at")
        .eq("business_id", businessId);

      const accepted = acceptedOffers ?? [];
      const all = allOffers ?? [];
      const projectIds = accepted.map((o: any) => o.project_id);

      // 3. Get projects for accepted offers
      let projectsData: any[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .in("id", projectIds);
        projectsData = data ?? [];
      }

      // 4. Get customer profiles
      const customerIds = [...new Set(projectsData.map((p: any) => p.customer_id))];
      let profilesData: any[] = [];
      if (customerIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", customerIds);
        profilesData = data ?? [];
      }
      const profileMap = new Map(profilesData.map((p: any) => [p.id, p]));
      const offerMap = new Map(accepted.map((o: any) => [o.project_id, o]));

      // 5. Build enriched projects
      const enrichedProjects: BusinessProject[] = projectsData.map((p: any) => {
        const profile = profileMap.get(p.customer_id);
        const offer = offerMap.get(p.id);
        return {
          ...p,
          customer_name: profile?.name ?? "Unknown",
          customer_email: profile?.email ?? "",
          customer_avatar: profile?.avatar_url ?? null,
          offer_price: offer?.price ?? 0,
          offer_timeline: offer?.timeline ?? "",
          offer_id: offer?.id ?? "",
        };
      });
      setProjects(enrichedProjects);

      // 6. Build customers
      const customerMap = new Map<string, BusinessCustomer>();
      for (const proj of enrichedProjects) {
        const existing = customerMap.get(proj.customer_id);
        const projSummary = {
          id: proj.id,
          title: proj.title,
          status: proj.status,
          price: proj.offer_price,
        };
        if (existing) {
          existing.project_count++;
          existing.total_spent += proj.offer_price;
          existing.projects.push(projSummary);
          if (proj.updated_at && proj.updated_at > existing.last_interaction) {
            existing.last_interaction = proj.updated_at;
          }
        } else {
          const profile = profileMap.get(proj.customer_id);
          customerMap.set(proj.customer_id, {
            id: proj.customer_id,
            name: profile?.name ?? "Unknown",
            email: profile?.email ?? "",
            avatar_url: profile?.avatar_url ?? null,
            project_count: 1,
            total_spent: proj.offer_price,
            last_interaction: proj.updated_at || proj.created_at,
            projects: [projSummary],
          });
        }
      }
      setCustomers(Array.from(customerMap.values()));

      // 7. Get reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", businessId);
      const revs = reviews ?? [];

      // 8. Compute KPIs
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const activeCount = enrichedProjects.filter(p => p.status === "in_progress").length;
      const completedCount = enrichedProjects.filter(p => p.status === "completed").length;
      const totalRevenue = enrichedProjects
        .filter(p => ["in_progress", "completed"].includes(p.status))
        .reduce((sum, p) => sum + p.offer_price, 0);
      const monthRevenue = enrichedProjects
        .filter(p => ["in_progress", "completed"].includes(p.status) && p.created_at >= monthStart)
        .reduce((sum, p) => sum + p.offer_price, 0);
      const avgRating = revs.length > 0
        ? revs.reduce((sum: number, r: any) => sum + r.rating, 0) / revs.length
        : 0;
      const pendingOffers = all.filter((o: any) => o.status === "pending").length;

      setKpis({
        totalProjects: enrichedProjects.length,
        activeProjects: activeCount,
        completedProjects: completedCount,
        totalRevenue,
        revenueThisMonth: monthRevenue,
        totalCustomers: customerMap.size,
        totalReviews: revs.length,
        avgRating: Math.round(avgRating * 10) / 10,
        conversionRate: all.length > 0 ? Math.round((accepted.length / all.length) * 100) : 0,
        pendingOffers,
      });

      // 9. Revenue by month (last 6 months)
      const months: RevenueByMonth[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en", { month: "short" });
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const monthProjects = enrichedProjects.filter(
          p => ["in_progress", "completed"].includes(p.status) && p.created_at >= start && p.created_at < end
        );
        months.push({
          month: key,
          label,
          revenue: monthProjects.reduce((s, p) => s + p.offer_price, 0),
          projects: monthProjects.length,
        });
      }
      setRevenueByMonth(months);

      // 10. Activity feed
      const activityItems: ActivityItem[] = [];

      // Offers sent
      for (const o of all.slice(0, 20)) {
        const proj = projectsData.find((p: any) => p.id === (o as any).project_id);
        activityItems.push({
          id: `offer-${o.id}`,
          type: o.status === "accepted" ? "offer_accepted" : "offer_sent",
          title: o.status === "accepted" ? "Offer accepted" : "Offer sent",
          subtitle: proj?.title || "Project",
          timestamp: o.created_at,
          projectId: (o as any).project_id,
        });
      }

      // Completed projects
      for (const p of enrichedProjects.filter(p => p.status === "completed")) {
        activityItems.push({
          id: `completed-${p.id}`,
          type: "project_completed",
          title: "Project completed",
          subtitle: p.title,
          timestamp: p.updated_at || p.created_at,
          projectId: p.id,
        });
      }

      // Reviews
      for (const r of revs) {
        activityItems.push({
          id: `review-${r.id}`,
          type: "review_received",
          title: `New ${r.rating}-star review`,
          subtitle: r.comment?.slice(0, 60) || "No comment",
          timestamp: r.created_at,
        });
      }

      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivity(activityItems.slice(0, 15));

      // 11. Page views
      await fetchPageViews(businessId);

    } catch (err) {
      console.error("[BusinessDashboard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // ─── Page Views ───────────────────────────────────────
  const fetchPageViews = async (bizId: string) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalCount },
      { count: weekCount },
      { count: monthCount },
      { data: recentViews },
    ] = await Promise.all([
      supabase.from("business_page_views").select("*", { count: "exact", head: true }).eq("business_id", bizId),
      supabase.from("business_page_views").select("*", { count: "exact", head: true }).eq("business_id", bizId).gte("viewed_at", weekAgo),
      supabase.from("business_page_views").select("*", { count: "exact", head: true }).eq("business_id", bizId).gte("viewed_at", monthAgo),
      supabase.from("business_page_views").select("viewed_at").eq("business_id", bizId).gte("viewed_at", monthAgo).order("viewed_at", { ascending: true }),
    ]);

    // Group by day
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const v of recentViews ?? []) {
      const day = (v as any).viewed_at.slice(0, 10);
      if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }

    setPageViews({
      total: totalCount ?? 0,
      thisWeek: weekCount ?? 0,
      thisMonth: monthCount ?? 0,
      byDay: Array.from(dayMap.entries()).map(([date, views]) => ({ date, views })),
    });
  };

  // ─── Real-time subscriptions ──────────────────────────
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`biz-dashboard-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers", filter: `business_id=eq.${businessId}` },
        () => fetchDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `business_id=eq.${businessId}` },
        () => fetchDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "business_page_views", filter: `business_id=eq.${businessId}` },
        () => { if (businessId) fetchPageViews(businessId); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchDashboardData]);

  // ─── Initial fetch ────────────────────────────────────
  useEffect(() => {
    if (businessId) fetchDashboardData();
  }, [businessId, fetchDashboardData]);

  return {
    business,
    loading: bizLoading || loading,
    projects,
    customers,
    kpis,
    revenueByMonth,
    activity,
    pageViews,
    refetch: fetchDashboardData,
  };
}
