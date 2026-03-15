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
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ─── Status Config ──────────────────────────────────────────
const STATUS_CONFIG: {
  key: string;
  label: string;
  color: string;
  lightColor: string;
}[] = [
  { key: "draft", label: "Draft", color: "#94A3B8", lightColor: "#F1F5F9" },
  { key: "sent", label: "Sent", color: "#3B82F6", lightColor: "#EFF6FF" },
  { key: "offers_received", label: "Offers Received", color: "#F59E0B", lightColor: "#FFFBEB" },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6", lightColor: "#F5F3FF" },
  { key: "completed", label: "Completed", color: "#10B981", lightColor: "#ECFDF5" },
];

// ─── Skeleton Components ─────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 bg-gray-100 rounded-md" />
        <div className="h-7 w-16 bg-gray-100 rounded-md" />
        <div className="h-2.5 w-32 bg-gray-50 rounded-md" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 bg-gray-100 rounded-md" />
        <div className="h-[200px] bg-gray-50 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Custom Tooltip for Recharts ─────────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <span className="font-medium">{name}</span>
      <span className="text-gray-300 ml-1.5">({value})</span>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <span className="font-medium">{label}</span>
      <span className="text-gray-300 ml-1.5">{payload[0].value}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
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

  // Pie chart data
  const pieData = analytics
    ? STATUS_CONFIG.map(({ key, label, color }) => ({
        name: label,
        value: analytics.projectsByStatus[key] ?? 0,
        color,
      })).filter((d) => d.value > 0)
    : [];

  // Bar chart data for user breakdown
  const barData = analytics
    ? [
        { name: "Clients", value: analytics.totalCustomers, color: "#3B82F6" },
        { name: "Creators", value: analytics.totalCreators, color: "#C05621" },
      ]
    : [];

  const totalProjects = analytics
    ? Object.values(analytics.projectsByStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <AdminLayout pendingCount={analytics?.pendingCreators}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Platform overview and key metrics
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live data</span>
          </div>
        </div>
      </div>

      {/* ─── Top Stat Cards ─── */}
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
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="New This Week"
            value={analytics.newUsersThisWeek}
            subtitle={`${analytics.newCustomersThisWeek} clients · ${analytics.newCreatorsThisWeek} creators`}
            icon={UserPlus}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            title="Total Projects"
            value={totalProjects}
            subtitle={`${analytics.projectsByStatus["in_progress"] ?? 0} in progress`}
            icon={FolderOpen}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <StatCard
            title="Pending Review"
            value={analytics.pendingCreators}
            subtitle="Creator approvals"
            icon={Clock}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>
      ) : null}

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {/* Project Status Donut — 3 columns */}
        {loading ? (
          <div className="col-span-3">
            <SkeletonChart />
          </div>
        ) : analytics ? (
          <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Projects by Status
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {totalProjects} total projects
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {/* Donut Chart */}
              <div className="w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {STATUS_CONFIG.map(({ key, label, color, lightColor }) => {
                  const count = analytics.projectsByStatus[key] ?? 0;
                  const pct =
                    totalProjects > 0
                      ? Math.round((count / totalProjects) * 100)
                      : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[13px] text-gray-600 flex-1">
                        {label}
                      </span>
                      <span className="text-[13px] font-semibold text-gray-900 tabular-nums">
                        {count}
                      </span>
                      <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* User Breakdown Bar Chart — 2 columns */}
        {loading ? (
          <div className="col-span-2">
            <SkeletonChart />
          </div>
        ) : analytics ? (
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-gray-900">
                User Breakdown
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {analytics.totalUsers} total users
              </p>
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                  barSize={32}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tick={{ fontSize: 13, fill: "#6B7280" }}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={false} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats below chart */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-400">Clients</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">
                  {analytics.totalCustomers}
                </p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#C05621]" />
                  <span className="text-xs text-gray-400">Creators</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">
                  {analytics.totalCreators}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── Activity Cards Row ─── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="Total Offers"
            value={analytics.totalOffers}
            subtitle="Across all projects"
            icon={TrendingUp}
            iconColor="text-[#C05621]"
            iconBg="bg-[#C05621]/8"
          />
          <StatCard
            title="Total Reviews"
            value={analytics.totalReviews}
            subtitle="Platform reviews"
            icon={Star}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
          />
          <StatCard
            title="Approved Creators"
            value={
              analytics.totalCreators -
              analytics.pendingCreators
            }
            subtitle={`${analytics.pendingCreators} pending`}
            icon={Palette}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
        </div>
      ) : null}

      {/* ─── GA4 Analytics Placeholder ─── */}
      <div className="mt-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Site Analytics
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Google Analytics 4 — set VITE_GA_MEASUREMENT_ID to enable
              </p>
            </div>
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#C05621] hover:text-[#A84A1C] font-medium transition-colors"
            >
              Open GA4
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Active Users", value: "—", hint: "Daily / Weekly" },
              { label: "Page Views", value: "—", hint: "Last 7 days" },
              { label: "Avg. Session", value: "—", hint: "Duration" },
              { label: "Bounce Rate", value: "—", hint: "Last 7 days" },
              { label: "Top Source", value: "—", hint: "Acquisition" },
            ].map(({ label, value, hint }) => (
              <div
                key={label}
                className="text-center p-4 rounded-xl bg-gray-50/80 border border-gray-100/50"
              >
                <p className="text-xl font-semibold text-gray-300 tabular-nums">
                  {value}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  {label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-4 text-center">
            These metrics will populate once GA4 is configured and collecting data.
            View full reports in the{" "}
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C05621] hover:underline"
            >
              GA4 dashboard
            </a>
            .
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
