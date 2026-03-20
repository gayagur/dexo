import { useNavigate } from "react-router-dom";
import { BusinessDashboardLayout } from "@/components/business/BusinessDashboardLayout";
import { StatCard } from "@/components/admin/StatCard";
import { useBusinessDashboard } from "@/hooks/useBusinessDashboard";
import { useMatchedProjects } from "@/hooks/useMatchedProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban, DollarSign, Users, Star, TrendingUp, Eye,
  ArrowRight, CheckCircle2, Send, Clock, AlertCircle,
  Inbox, Sparkles, Share2, UserPlus,
} from "lucide-react";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { Loader2 } from "lucide-react";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  offer_sent: Send,
  offer_accepted: CheckCircle2,
  project_completed: CheckCircle2,
  review_received: Star,
  message: Send,
};

const ACTIVITY_COLORS: Record<string, string> = {
  offer_sent: "bg-blue-50 text-blue-600",
  offer_accepted: "bg-green-50 text-green-600",
  project_completed: "bg-emerald-50 text-emerald-600",
  review_received: "bg-amber-50 text-amber-600",
  message: "bg-gray-50 text-gray-600",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function BusinessOverview() {
  const navigate = useNavigate();
  const { business, loading: bizLoading } = useBusinessProfile();
  const { kpis, activity, projects, pageViews, loading } = useBusinessDashboard();
  const { scoredProjects } = useMatchedProjects();

  if (bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C87D5A]" />
      </div>
    );
  }

  if (!business) return null;

  // Gate: non-approved
  if (business.status !== "approved") {
    navigate("/business/onboarding", { replace: true });
    return null;
  }

  const attentionProjects = projects.filter(p => p.status === "in_progress");
  const newRequests = scoredProjects.length;
  const hasData = (kpis?.totalProjects ?? 0) > 0;

  return (
    <BusinessDashboardLayout newRequestsCount={newRequests}>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {business.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* KPI Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Projects"
              value={kpis.totalProjects}
              icon={FolderKanban}
              iconColor="text-[#C87D5A]"
              iconBg="bg-[#C87D5A]/8"
              subtitle={`${kpis.activeProjects} active`}
            />
            <StatCard
              title="Total Revenue"
              value={`$${kpis.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              subtitle={`$${kpis.revenueThisMonth.toLocaleString()} this month`}
            />
            <StatCard
              title="Customers"
              value={kpis.totalCustomers}
              icon={Users}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              subtitle={`${kpis.completedProjects} completed`}
            />
            <StatCard
              title="Avg Rating"
              value={kpis.avgRating > 0 ? `${kpis.avgRating} / 5` : "—"}
              icon={Star}
              iconColor="text-amber-500"
              iconBg="bg-amber-50"
              subtitle={`${kpis.totalReviews} review${kpis.totalReviews !== 1 ? "s" : ""}`}
            />
            <StatCard
              title="Profile Views"
              value={pageViews?.thisMonth ?? 0}
              icon={Eye}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
              subtitle={`${pageViews?.thisWeek ?? 0} this week`}
            />
            <StatCard
              title="Conversion Rate"
              value={`${kpis.conversionRate}%`}
              icon={TrendingUp}
              iconColor="text-cyan-600"
              iconBg="bg-cyan-50"
              subtitle="offers → projects"
            />
            <StatCard
              title="New Requests"
              value={newRequests}
              icon={Inbox}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
              subtitle="matching your profile"
            />
            <StatCard
              title="Pending Offers"
              value={kpis.pendingOffers}
              icon={Clock}
              iconColor="text-gray-500"
              iconBg="bg-gray-100"
              subtitle="awaiting response"
            />
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Attention Required */}
          <div className="lg:col-span-2 space-y-6">
            {/* New Requests Banner */}
            {newRequests > 0 && (
              <Card className="border-[#C87D5A]/20 bg-[#C87D5A]/[0.03]">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#C87D5A]/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#C87D5A]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {newRequests} new request{newRequests !== 1 ? "s" : ""} matching your profile
                      </p>
                      <p className="text-xs text-gray-500">Review and send offers to win new projects</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/business/projects")}
                    className="bg-[#C87D5A] hover:bg-[#B06B4A] text-white"
                  >
                    View Requests <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Active Projects */}
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Active Projects</h3>
                  {attentionProjects.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => navigate("/business/projects")} className="text-xs text-gray-500">
                      View all <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                {loading ? (
                  <div className="p-5 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-40 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : attentionProjects.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {attentionProjects.slice(0, 5).map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/business/request/${p.id}`)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FolderKanban className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                          <p className="text-xs text-gray-500">{p.customer_name} · ${p.offer_price.toLocaleString()}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <FolderKanban className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No active projects</p>
                    <p className="text-xs text-gray-400 mt-1">Accept offers to start working on projects</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <div>
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                </div>
                {loading ? (
                  <div className="p-5 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-3.5 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity.length > 0 ? (
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {activity.slice(0, 10).map(item => {
                      const Icon = ACTIVITY_ICONS[item.type] || AlertCircle;
                      const color = ACTIVITY_COLORS[item.type] || "bg-gray-50 text-gray-600";
                      return (
                        <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-800">{item.title}</p>
                            <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                          </div>
                          <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                            {timeAgo(item.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400">No activity yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Empty State — Guide to Action */}
        {!loading && !hasData && (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#C87D5A]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#C87D5A]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get started with DEXO</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                Your dashboard will come alive as you start receiving and completing projects.
                Here's how to get your first customer:
              </p>
              <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto">
                <button
                  onClick={() => navigate("/business/onboarding")}
                  className="p-4 rounded-xl border border-gray-200 hover:border-[#C87D5A]/30 hover:bg-[#C87D5A]/[0.02] transition-colors text-left"
                >
                  <UserPlus className="w-5 h-5 text-[#C87D5A] mb-2" />
                  <p className="text-sm font-medium text-gray-900">Complete Profile</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add portfolio & details</p>
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/business-profile/${business.id}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="p-4 rounded-xl border border-gray-200 hover:border-[#C87D5A]/30 hover:bg-[#C87D5A]/[0.02] transition-colors text-left"
                >
                  <Share2 className="w-5 h-5 text-[#C87D5A] mb-2" />
                  <p className="text-sm font-medium text-gray-900">Share Profile</p>
                  <p className="text-xs text-gray-500 mt-0.5">Copy your public link</p>
                </button>
                <button
                  onClick={() => navigate("/business/projects")}
                  className="p-4 rounded-xl border border-gray-200 hover:border-[#C87D5A]/30 hover:bg-[#C87D5A]/[0.02] transition-colors text-left"
                >
                  <Inbox className="w-5 h-5 text-[#C87D5A] mb-2" />
                  <p className="text-sm font-medium text-gray-900">Browse Requests</p>
                  <p className="text-xs text-gray-500 mt-0.5">Find matching projects</p>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
