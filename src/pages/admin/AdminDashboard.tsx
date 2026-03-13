import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { useAdmin, type AdminAnalytics } from "@/hooks/useAdmin";
import {
  Users,
  UserPlus,
  FolderOpen,
  Clock,
  Palette,
  FileText,
  Star,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "bg-gray-400", bg: "bg-gray-50" },
  sent: { label: "Sent", color: "bg-blue-500", bg: "bg-blue-50" },
  offers_received: { label: "Offers Received", color: "bg-amber-500", bg: "bg-amber-50" },
  in_progress: { label: "In Progress", color: "bg-indigo-500", bg: "bg-indigo-50" },
  completed: { label: "Completed", color: "bg-emerald-500", bg: "bg-emerald-50" },
};

function SkeletonCard() {
  return (
    <Card className="p-5 bg-white border border-gray-200">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-7 w-16 bg-gray-200 rounded" />
        <div className="h-2.5 w-32 bg-gray-100 rounded" />
      </div>
    </Card>
  );
}

function SkeletonBar() {
  return (
    <Card className="p-6 bg-white border border-gray-200">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded-full" />
        <div className="flex gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 bg-gray-200 rounded-full" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const { fetchAnalytics } = useAdmin();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAnalytics();
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        console.error("[admin] dashboard fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAnalytics]);

  const totalBarSegments = analytics
    ? Object.values(analytics.projectsByStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <AdminLayout pendingCount={analytics?.pendingCreators}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform analytics overview
        </p>
      </div>

      {/* Top stats row */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={analytics.totalUsers}
            subtitle={`${analytics.newUsersThisMonth} this month`}
            icon={Users}
          />
          <StatCard
            title="New This Week"
            value={analytics.newUsersThisWeek}
            subtitle={`${analytics.newCustomersThisWeek} clients, ${analytics.newCreatorsThisWeek} creators`}
            icon={UserPlus}
          />
          <StatCard
            title="Active Projects"
            value={analytics.totalProjects}
            subtitle={`${analytics.projectsByStatus["in_progress"] ?? 0} in progress`}
            icon={FolderOpen}
          />
          <StatCard
            title="Pending Creators"
            value={analytics.pendingCreators}
            subtitle="Awaiting review"
            icon={Clock}
          />
        </div>
      ) : null}

      {/* Projects Overview */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Projects Overview
        </h2>
        {loading ? (
          <SkeletonBar />
        ) : analytics ? (
          <Card className="p-6 bg-white border border-gray-200">
            {/* Horizontal bar */}
            {totalBarSegments > 0 ? (
              <div className="h-3 w-full rounded-full overflow-hidden flex mb-5">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                  const count = analytics.projectsByStatus[status] ?? 0;
                  if (count === 0) return null;
                  const pct = (count / totalBarSegments) * 100;
                  return (
                    <div
                      key={status}
                      className={`${cfg.color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-3 w-full rounded-full bg-gray-100 mb-5" />
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const count = analytics.projectsByStatus[status] ?? 0;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${cfg.color} inline-block`}
                    />
                    <span className="text-sm text-gray-600">{cfg.label}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>

      {/* User Breakdown */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          User Breakdown
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Clients"
              value={analytics.totalCustomers}
              subtitle={`${analytics.newCustomersThisWeek} new this week`}
              icon={FileText}
            />
            <StatCard
              title="Creators"
              value={analytics.totalCreators}
              subtitle={`${analytics.newCreatorsThisWeek} new this week`}
              icon={Palette}
            />
          </div>
        ) : null}
      </div>

      {/* Platform Activity */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Platform Activity
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total Offers"
              value={analytics.totalOffers}
              icon={TrendingUp}
            />
            <StatCard
              title="Total Reviews"
              value={analytics.totalReviews}
              icon={Star}
            />
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
