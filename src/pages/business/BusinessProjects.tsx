import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BusinessDashboardLayout } from "@/components/business/BusinessDashboardLayout";
import { useBusinessDashboard, type BusinessProject } from "@/hooks/useBusinessDashboard";
import { useMatchedProjects } from "@/hooks/useMatchedProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban, Search, ArrowRight, DollarSign, Clock, User,
  Sparkles, Inbox, Filter,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:           { label: "Draft",          color: "text-gray-600",   bg: "bg-gray-100" },
  sent:            { label: "Sent",           color: "text-blue-700",   bg: "bg-blue-50" },
  offers_received: { label: "Offers",         color: "text-purple-700", bg: "bg-purple-50" },
  in_progress:     { label: "In Progress",    color: "text-amber-700",  bg: "bg-amber-50" },
  completed:       { label: "Completed",      color: "text-green-700",  bg: "bg-green-50" },
};

type Tab = "all" | "active" | "completed" | "requests";

export default function BusinessProjects() {
  const navigate = useNavigate();
  const { projects, loading } = useBusinessDashboard();
  const { scoredProjects } = useMatchedProjects();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All Projects", count: projects.length },
    { key: "active", label: "Active", count: projects.filter(p => p.status === "in_progress").length },
    { key: "completed", label: "Completed", count: projects.filter(p => p.status === "completed").length },
    { key: "requests", label: "New Requests", count: scoredProjects.length },
  ];

  const q = search.toLowerCase();
  const filteredProjects = projects.filter(p => {
    if (tab === "active" && p.status !== "in_progress") return false;
    if (tab === "completed" && p.status !== "completed") return false;
    if (q && !p.title.toLowerCase().includes(q) && !p.customer_name.toLowerCase().includes(q)) return false;
    return true;
  });

  const filteredRequests = scoredProjects.filter(({ project }) => {
    if (q && !project.title.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <BusinessDashboardLayout newRequestsCount={scoredProjects.length}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your projects and browse new requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] ${
                  tab === t.key ? "bg-[#C87D5A]/10 text-[#C87D5A]" : "bg-gray-200/80 text-gray-500"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects or customers..."
            className="pl-9 h-10 bg-white border-gray-200"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : tab === "requests" ? (
          // New Requests
          filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map(({ project, matchScore }) => (
                <Link key={project.id} to={`/business/request/${project.id}`}>
                  <Card className="hover:shadow-md hover:border-gray-200 transition-all duration-200 mb-3">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        {project.ai_concept ? (
                          <img loading="lazy" src={project.ai_concept} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#C87D5A]/10 flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6 text-[#C87D5A]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{project.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              matchScore >= 70 ? "bg-green-50 text-green-700"
                                : matchScore >= 40 ? "bg-amber-50 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}>
                              {matchScore}% match
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{project.category}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${project.budget_min.toLocaleString()} – ${project.budget_max.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(project.details as any)?.timing || "Flexible"}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No new requests"
              description="Projects matching your profile will appear here."
            />
          )
        ) : (
          // Project List
          filteredProjects.length > 0 ? (
            <div className="space-y-3">
              {filteredProjects.map(p => {
                const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/business/request/${p.id}`)}
                    className="w-full text-left"
                  >
                    <Card className="hover:shadow-md hover:border-gray-200 transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          {p.ai_concept ? (
                            <img loading="lazy" src={p.ai_concept} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <FolderKanban className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {p.customer_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ${p.offer_price.toLocaleString()}
                              </span>
                              <span>{p.category}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900">${p.offer_price.toLocaleString()}</p>
                            <p className="text-[11px] text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title={search ? "No matching projects" : "No projects yet"}
              description={search ? "Try a different search term." : "Start by accepting offers from new requests."}
            />
          )
        )}
      </div>
    </BusinessDashboardLayout>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
