import { motion } from "framer-motion";
import { BusinessDashboardLayout } from "@/components/business/BusinessDashboardLayout";
import { useBusinessDashboard } from "@/hooks/useBusinessDashboard";
import { useMatchedProjects } from "@/hooks/useMatchedProjects";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, TrendingUp, Users, Star, Inbox, ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function BusinessInsights() {
  const { kpis, pageViews, loading } = useBusinessDashboard();
  const { scoredProjects } = useMatchedProjects();
  const { business } = useBusinessProfile();

  // Conversion funnel
  const totalViews = pageViews?.total ?? 0;
  const totalInquiries = (kpis?.totalProjects ?? 0) + (kpis?.pendingOffers ?? 0);
  const totalProjects = kpis?.totalProjects ?? 0;
  const viewToInquiry = totalViews > 0 ? Math.round((totalInquiries / totalViews) * 100) : 0;
  const inquiryToProject = totalInquiries > 0 ? Math.round((totalProjects / totalInquiries) * 100) : 0;

  // Chart data — last 30 days
  const chartData = pageViews?.byDay.map(d => ({
    date: d.date.slice(5), // "03-15"
    views: d.views,
  })) ?? [];

  const handleShareProfile = () => {
    if (!business) return;
    const url = `${window.location.origin}/business-profile/${business.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!");
  };

  return (
    <BusinessDashboardLayout newRequestsCount={scoredProjects.length}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
            <p className="text-sm text-gray-500 mt-1">Your visibility and performance on DEXO</p>
          </div>
          <Button onClick={handleShareProfile} variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share Profile
          </Button>
        </div>

        {/* View KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants} initial="initial" animate="animate">
            <motion.div variants={cardVariants}>
              <StatCard
                title="Total Profile Views"
                value={pageViews?.total ?? 0}
                icon={Eye}
                iconColor="text-violet-600"
                iconBg="bg-violet-50"
                subtitle={`${pageViews?.thisMonth ?? 0} this month`}
              />
            </motion.div>
            <motion.div variants={cardVariants}>
              <StatCard
                title="Views This Week"
                value={pageViews?.thisWeek ?? 0}
                icon={TrendingUp}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
            </motion.div>
            <motion.div variants={cardVariants}>
              <StatCard
                title="Inquiries Received"
                value={totalInquiries}
                icon={Inbox}
                iconColor="text-orange-600"
                iconBg="bg-orange-50"
                subtitle={`${kpis?.pendingOffers ?? 0} pending`}
              />
            </motion.div>
            <motion.div variants={cardVariants}>
              <StatCard
                title="Avg Rating"
                value={kpis?.avgRating ? `${kpis.avgRating} / 5` : "—"}
                icon={Star}
                iconColor="text-amber-500"
                iconBg="bg-amber-50"
                subtitle={`${kpis?.totalReviews ?? 0} reviews`}
              />
            </motion.div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Views Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-6">Profile Views — Last 30 Days</h3>
                {loading ? (
                  <Skeleton className="h-[240px] w-full rounded-lg" />
                ) : chartData.length > 0 && chartData.some(d => d.views > 0) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C87D5A" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#C87D5A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
                              <p className="text-xs text-gray-500">{payload[0].payload.date}</p>
                              <p className="text-sm font-semibold text-gray-900">{payload[0].value} views</p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#C87D5A"
                        strokeWidth={2}
                        fill="url(#viewGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center">
                    <div className="text-center">
                      <Eye className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No views data yet</p>
                      <p className="text-xs text-gray-300 mt-1">Share your profile to start getting visits</p>
                      <Button onClick={handleShareProfile} size="sm" variant="outline" className="mt-3 text-xs gap-1.5">
                        <Share2 className="w-3.5 h-3.5" />
                        Copy Profile Link
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <div>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Views */}
                    <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-violet-700">Profile Views</span>
                        <span className="text-lg font-semibold text-violet-900">{totalViews}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-violet-100 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: "100%" }} />
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                        {viewToInquiry}% conversion
                      </div>
                    </div>

                    {/* Inquiries */}
                    <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-orange-700">Inquiries</span>
                        <span className="text-lg font-semibold text-orange-900">{totalInquiries}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-orange-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: totalViews > 0 ? `${Math.max(5, viewToInquiry)}%` : "0%" }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                        {inquiryToProject}% conversion
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-emerald-700">Won Projects</span>
                        <span className="text-lg font-semibold text-emerald-900">{totalProjects}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: totalViews > 0 ? `${Math.max(5, Math.round((totalProjects / totalViews) * 100))}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BusinessDashboardLayout>
  );
}
