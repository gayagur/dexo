import { useState } from "react";
import { BusinessDashboardLayout } from "@/components/business/BusinessDashboardLayout";
import { useBusinessDashboard, type BusinessCustomer } from "@/hooks/useBusinessDashboard";
import { useMatchedProjects } from "@/hooks/useMatchedProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Users, DollarSign, FolderKanban, Clock,
  ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

type Filter = "all" | "active" | "high_value";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function BusinessCustomers() {
  const navigate = useNavigate();
  const { customers, loading } = useBusinessDashboard();
  const { scoredProjects } = useMatchedProjects();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<BusinessCustomer | null>(null);
  const [sortBy, setSortBy] = useState<"spent" | "recent" | "projects">("recent");

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "high_value", label: "High Value" },
  ];

  const q = search.toLowerCase();
  let filtered = customers.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
    if (filter === "active" && !c.projects.some(p => p.status === "in_progress")) return false;
    if (filter === "high_value" && c.total_spent < 1000) return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "spent") return b.total_spent - a.total_spent;
    if (sortBy === "projects") return b.project_count - a.project_count;
    return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
  });

  const totalSpent = customers.reduce((s, c) => s + c.total_spent, 0);
  const avgPerCustomer = customers.length > 0 ? Math.round(totalSpent / customers.length) : 0;

  return (
    <BusinessDashboardLayout newRequestsCount={scoredProjects.length}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Your customer relationships and history</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{customers.length}</p>
                <p className="text-xs text-gray-500">Total Customers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">${totalSpent.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50">
                <DollarSign className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">${avgPerCustomer.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Avg per Customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-9 h-10 bg-white border-gray-200"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100/80 rounded-lg p-0.5">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === f.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="recent">Most Recent</option>
            <option value="spent">Highest Spend</option>
            <option value="projects">Most Projects</option>
          </select>
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map(customer => {
              const initials = customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <button
                  key={customer.id}
                  onClick={() => setSelected(customer)}
                  className="w-full text-left"
                >
                  <Card className="hover:shadow-md hover:border-gray-200 transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                          <AvatarImage src={customer.avatar_url || ""} />
                          <AvatarFallback className="bg-[#C87D5A]/10 text-[#C87D5A] text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-gray-500 shrink-0">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            {customer.project_count} project{customer.project_count !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-gray-900">
                            <DollarSign className="w-3 h-3" />
                            {customer.total_spent.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(customer.last_interaction)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              {search || filter !== "all" ? "No matching customers" : "No customers yet"}
            </h3>
            <p className="text-sm text-gray-400">
              {search || filter !== "all" ? "Try different filters." : "Customers appear here when you accept and work on projects."}
            </p>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-[420px] sm:max-w-[420px] p-0">
          {selected && (
            <div className="h-full flex flex-col">
              <SheetHeader className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                    <AvatarImage src={selected.avatar_url || ""} />
                    <AvatarFallback className="bg-[#C87D5A]/10 text-[#C87D5A] text-sm font-semibold">
                      {selected.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg font-semibold">{selected.name}</SheetTitle>
                    <p className="text-sm text-gray-500">{selected.email}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-gray-50">
                    <p className="text-lg font-semibold text-gray-900">{selected.project_count}</p>
                    <p className="text-[11px] text-gray-500">Projects</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gray-50">
                    <p className="text-lg font-semibold text-gray-900">${selected.total_spent.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-500">Total Spent</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gray-50">
                    <p className="text-lg font-semibold text-gray-900">{timeAgo(selected.last_interaction)}</p>
                    <p className="text-[11px] text-gray-500">Last Active</p>
                  </div>
                </div>

                {/* Project History */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Project History</h4>
                  <div className="space-y-2">
                    {selected.projects.map(proj => {
                      const statusCfg = {
                        in_progress: { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50" },
                        completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50" },
                      }[proj.status] || { label: proj.status, color: "text-gray-600", bg: "bg-gray-100" };
                      return (
                        <button
                          key={proj.id}
                          onClick={() => navigate(`/business/request/${proj.id}`)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <FolderKanban className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{proj.title}</p>
                            <p className="text-xs text-gray-500">${proj.price.toLocaleString()}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </BusinessDashboardLayout>
  );
}
