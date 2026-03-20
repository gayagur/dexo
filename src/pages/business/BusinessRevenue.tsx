import { BusinessDashboardLayout } from "@/components/business/BusinessDashboardLayout";
import { useBusinessDashboard } from "@/hooks/useBusinessDashboard";
import { useMatchedProjects } from "@/hooks/useMatchedProjects";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, TrendingUp, Receipt, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function BusinessRevenue() {
  const { kpis, customers, revenueByMonth, loading } = useBusinessDashboard();
  const { scoredProjects } = useMatchedProjects();

  const avgOrderValue = kpis && kpis.completedProjects > 0
    ? Math.round(kpis.totalRevenue / kpis.totalProjects)
    : 0;

  // Top customers by spend
  const topCustomers = [...customers]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  return (
    <BusinessDashboardLayout newRequestsCount={scoredProjects.length}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">Track your earnings and financial performance</p>
        </div>

        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={`$${kpis.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="This Month"
              value={`$${kpis.revenueThisMonth.toLocaleString()}`}
              icon={TrendingUp}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Avg Order Value"
              value={`$${avgOrderValue.toLocaleString()}`}
              icon={Receipt}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
            <StatCard
              title="Completed Projects"
              value={kpis.completedProjects}
              icon={DollarSign}
              iconColor="text-[#C87D5A]"
              iconBg="bg-[#C87D5A]/8"
              subtitle={`of ${kpis.totalProjects} total`}
            />
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-6">Revenue Over Time</h3>
                {loading ? (
                  <Skeleton className="h-[280px] w-full rounded-lg" />
                ) : revenueByMonth.length > 0 && revenueByMonth.some(m => m.revenue > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={revenueByMonth} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `$${v.toLocaleString()}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
                              <p className="text-xs text-gray-500">{data.month}</p>
                              <p className="text-sm font-semibold text-gray-900">${data.revenue.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{data.projects} project{data.projects !== 1 ? "s" : ""}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="revenue" fill="#C87D5A" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <div className="text-center">
                      <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Revenue data will appear here</p>
                      <p className="text-xs text-gray-300 mt-1">Complete projects to see your earnings</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Customers */}
          <div>
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Top Customers</h3>
                </div>
                {loading ? (
                  <div className="p-5 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-3.5 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : topCustomers.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {topCustomers.map((customer, i) => {
                      const initials = customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div key={customer.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="text-xs font-semibold text-gray-300 w-4">
                            {i + 1}
                          </span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={customer.avatar_url || ""} />
                            <AvatarFallback className="bg-[#C87D5A]/10 text-[#C87D5A] text-[10px] font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 truncate">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.project_count} project{customer.project_count !== 1 ? "s" : ""}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">${customer.total_spent.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No customers yet</p>
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
