import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useOffersForProjects } from '@/hooks/useOffers';
import { AppLayout } from '@/components/app/AppLayout';
import type { ProjectStatus } from '@/lib/database.types';
import {
  Plus, MessageSquare, ArrowRight, Search, Loader2,
  Sparkles, Palette, ArrowUpRight, FolderOpen, Zap, Inbox,
  MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';

// ─── Status Config ──────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-muted/80', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
  sent: { label: 'Sent', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  offers_received: { label: 'Offers received', bg: 'bg-accent/15', text: 'text-accent-foreground', dot: 'bg-accent' },
  in_progress: { label: 'In progress', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

// ─── Filter Chips ───────────────────────────────────────────
const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'offers_received', label: 'Has offers' },
  { key: 'completed', label: 'Completed' },
];

function isActiveStatus(status: string): boolean {
  return ['sent', 'offers_received', 'in_progress'].includes(status);
}

// ─── Metric Card ────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, accent = false }: {
  icon: typeof FolderOpen;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/60">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        accent ? 'bg-primary/10' : 'bg-muted/70'
      }`}>
        <Icon className={`w-4.5 h-4.5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div>
        <div className="text-xl font-semibold text-foreground leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Project Card ───────────────────────────────────────────
function ProjectCard({
  project,
  offerCount,
  onEdit,
  onDelete,
}: {
  project: {
    id: string;
    title: string;
    description: string;
    budget_min: number;
    budget_max: number;
    status: string;
    ai_concept: string | null;
  };
  offerCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const status = statusConfig[project.status] || statusConfig.draft;
  const canEdit = project.status === 'draft';
  const canDelete = project.status === 'draft' || project.status === 'sent';

  return (
    <div className="group relative">
      <Link to={`/project/${project.id}`} className="block">
        <Card className="h-full overflow-hidden border-border/60 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
          {/* Image Area */}
          <div className="aspect-[16/10] overflow-hidden relative">
            {project.ai_concept ? (
              <img
                src={project.ai_concept}
                alt={project.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/[0.05] via-accent/[0.04] to-secondary flex items-center justify-center">
                <Palette className="w-10 h-10 text-primary/20" />
              </div>
            )}
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} backdrop-blur-sm shadow-sm`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>
            </div>
            {/* Hover arrow */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-foreground" />
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <h3 className="text-base font-serif font-semibold text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors duration-200">
              {project.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">
              {project.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/80">
                ${project.budget_min.toLocaleString()} – ${project.budget_max.toLocaleString()}
              </span>
              {offerCount > 0 && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {offerCount} offer{offerCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Action Menu — positioned over card, stops link propagation */}
      {(canEdit || canDelete) && (
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(project.id)} className="gap-2 cursor-pointer">
                  <Pencil className="w-4 h-4" />
                  Edit Project
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(project.id, project.title)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="py-16 animate-fade-in">
      <Card className="max-w-lg mx-auto border-dashed border-2 border-primary/15 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02]">
        <CardContent className="p-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Sparkles className="w-9 h-9 text-primary" />
          </div>
          <h3 className="text-2xl font-serif mb-3 text-foreground">
            Your creative journey starts here
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
            Describe your dream design, and we'll connect you with talented creators who can bring it to life.
          </p>
          <Link to="/create-project">
            <Button size="lg" className="gap-2 shadow-md">
              <Plus className="w-4 h-4" />
              Create Your First Project
            </Button>
          </Link>

          <div className="mt-10 pt-8 border-t border-border/50">
            <div className="grid grid-cols-3 gap-4">
              {[
                { step: '01', label: 'Describe your vision' },
                { step: '02', label: 'Get matched with creators' },
                { step: '03', label: 'Bring it to life' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="text-xs font-semibold text-primary/60 mb-1">{item.step}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════
const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, loading, deleteProject } = useProjects();
  const { offerCounts } = useOffersForProjects(projects.map((p) => p.id));

  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteProject(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => isActiveStatus(p.status)).length;
    const withOffers = projects.filter(p => p.status === 'offers_received').length;
    return { total, active, withOffers };
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (activeFilter === 'all') return projects;
    if (activeFilter === 'active') return projects.filter(p => isActiveStatus(p.status));
    if (activeFilter === 'offers_received') return projects.filter(p => p.status === 'offers_received');
    if (activeFilter === 'completed') return projects.filter(p => p.status === 'completed');
    return projects;
  }, [projects, activeFilter]);

  const firstName = user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-10">
        {/* ─── Command Bar: Greeting + Metrics ─── */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-primary mb-1">Welcome back, {firstName}</p>
              <h1 className="text-3xl sm:text-4xl font-serif text-foreground">
                Your Projects
              </h1>
            </div>
            {projects.length > 0 && (
              <Link to="/create-project">
                <Button className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </Link>
            )}
          </div>

          {/* Metrics Row */}
          {projects.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <MetricCard icon={FolderOpen} label="Total projects" value={metrics.total} />
              <MetricCard icon={Zap} label="Active" value={metrics.active} accent />
              <MetricCard icon={Inbox} label="Awaiting review" value={metrics.withOffers} accent={metrics.withOffers > 0} />
            </div>
          )}

          {/* Action Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/create-project" className="group">
              <Card className="h-full border-primary/15 bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-0.5">
                        Start a new project
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Describe your idea and get matched
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/browse-businesses" className="group">
              <Card className="h-full border-accent/15 bg-gradient-to-br from-accent/[0.04] to-accent/[0.01] hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors shrink-0">
                      <Search className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-0.5">
                        Find creators
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Browse talented artisans and studios
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-accent-foreground/40 group-hover:text-accent-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* ─── Loading ─── */}
        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your projects...</p>
          </div>
        )}

        {/* ─── Projects Section ─── */}
        {!loading && projects.length > 0 && (
          <div className="animate-fade-in">
            {/* Section Header + Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-lg font-serif font-semibold text-foreground">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                {activeFilter !== 'all' && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    of {projects.length}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-1.5">
                {FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeFilter === key
                        ? 'bg-foreground text-background shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {filteredProjects.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    offerCount={offerCounts[project.id] || 0}
                    onEdit={handleEdit}
                    onDelete={(id, title) => setDeleteTarget({ id, title })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No projects match this filter.</p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  Show all projects
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Empty State ─── */}
        {!loading && projects.length === 0 && <EmptyState />}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "<strong>{deleteTarget?.title}</strong>". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default CustomerDashboard;
