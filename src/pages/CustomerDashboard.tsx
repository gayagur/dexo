import { useState, useMemo, useEffect, useRef } from 'react';
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
import { useFurnitureDesignDrafts } from '@/hooks/useFurnitureDesignDrafts';
import { SavedDesignsDraftsSection, SAVED_DRAFTS_PREVIEW_LIMIT } from '@/components/customer/SavedDesignsDraftsSection';
import { useOffersForProjects } from '@/hooks/useOffers';
import { useChatSession } from '@/hooks/useChatSession';
import { AppLayout } from '@/components/app/AppLayout';
import { lazy, Suspense } from 'react';

const FurniturePreview = lazy(() => import('@/components/design/FurniturePreview').then(m => ({ default: m.FurniturePreview })));
import type { EditorSceneData, PanelData } from '@/lib/furnitureData';
import type { ProjectStatus } from '@/lib/database.types';
import {
  Plus, MessageSquare, ArrowRight, Loader2, Sparkles, X,
  Palette, ArrowUpRight, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Animation Variants ──────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Animated Counter Hook ───────────────────────────────
function useAnimatedCounter(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) { setCount(target); return; }
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

// ─── Status Config ──────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-muted/80', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
  sent: { label: 'Sent', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  offers_received: { label: 'Offers received', bg: 'bg-accent/15', text: 'text-accent-foreground', dot: 'bg-accent' },
  in_progress: { label: 'In progress', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

// ─── Status progress for animated bars ──────────────────────
const statusProgress: Record<string, number> = {
  draft: 0.1,
  sent: 0.3,
  offers_received: 0.55,
  in_progress: 0.75,
  completed: 1,
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
function MetricCard({ label, value }: {
  label: string;
  value: number;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <div className="text-2xl md:text-3xl font-serif text-foreground leading-none">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-1.5 tracking-[0.08em] uppercase font-medium">{label}</div>
        </CardContent>
      </Card>
    </motion.div>
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
    details: Record<string, unknown> | null;
  };
  offerCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const status = statusConfig[project.status] || statusConfig.draft;
  const canEdit = project.status !== 'completed';
  const canDelete = project.status === 'draft' || project.status === 'sent';
  const progress = statusProgress[project.status] || 0.1;

  return (
    <div className="group relative">
      <Link to={`/project/${project.id}`} className="block">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="h-full overflow-hidden border-border/60 rounded-2xl hover:shadow-lg transition-shadow duration-300 cursor-pointer">
            {/* Image Area */}
            <div className="aspect-[16/10] overflow-hidden relative">
              {project.details?.furniture_design && (project.details.furniture_design as Record<string, unknown>).panels ? (
                <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
                  <FurniturePreview
                    panels={(project.details.furniture_design as Record<string, unknown>).panels as PanelData[]}
                    className="w-full h-full"
                  />
                </Suspense>
              ) : project.ai_concept ? (
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                  src={project.ai_concept}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/[0.05] via-accent/[0.04] to-secondary flex items-center justify-center">
                  <Palette className="w-10 h-10 text-primary/20" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
              {/* Title on image */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-serif font-normal text-white text-sm truncate drop-shadow-sm">
                  {project.title}
                </h3>
              </div>
              {/* Status Badge with pulse for active */}
              <div className="absolute top-3 left-3">
                <motion.div
                  animate={project.status === 'sent' || project.status === 'offers_received' ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} backdrop-blur-sm shadow-sm`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </motion.div>
              </div>
              {/* Hover arrow */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-foreground" />
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs line-clamp-2 mb-3 leading-relaxed">
                {project.description}
              </p>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${progress * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {status.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/80">
                  ${project.budget_min.toLocaleString()} – ${project.budget_max.toLocaleString()}
                </span>
                {offerCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {offerCount} offer{offerCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      className="py-16"
    >
      <Card className="max-w-lg mx-auto border-dashed border-2 border-primary/15 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02] rounded-2xl">
        <CardContent className="p-10 text-center">
          <h3 className="text-2xl font-serif mb-3 text-foreground">
            Your design journey starts here
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
            Describe your dream space, and we'll connect you with talented designers who can bring it to life.
          </p>
          <Link to="/new-project">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <Button size="lg" className="gap-2 shadow-md">
                <Plus className="w-4 h-4" />
                Create Your First Project
              </Button>
            </motion.div>
          </Link>

          <div className="mt-10 pt-8 border-t border-border/50">
            <div className="grid grid-cols-3 gap-4">
              {[
                { step: '01', label: 'Describe your dream space' },
                { step: '02', label: 'Get matched with designers' },
                { step: '03', label: 'Transform your space' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="text-xs font-medium text-primary/60 mb-1">{item.step}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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

  const { sessionInfo, checked: sessionChecked, deleteSession } = useChatSession();
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const showContinueBanner = sessionChecked && sessionInfo.exists && !sessionDismissed;

  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { drafts: furnitureDrafts, loading: draftsLoading, removeDraft } = useFurnitureDesignDrafts();

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

  const animTotal = useAnimatedCounter(metrics.total);
  const animActive = useAnimatedCounter(metrics.active);
  const animOffers = useAnimatedCounter(metrics.withOffers);

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* ─── Command Bar: Greeting + Actions ─── */}
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.02] to-transparent">
          <div className="container mx-auto px-6 py-8 lg:py-10">
            <motion.div
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6"
            >
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-sm font-medium text-primary mb-1"
                >
                  Welcome back, {firstName}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  className="text-3xl sm:text-4xl font-serif text-foreground"
                >
                  Your Projects
                </motion.h1>
              </div>
              {projects.length > 0 && (
                <motion.div custom={0.15} variants={fadeUp}>
                  <Link to="/new-project">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                      <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                        <Plus className="w-4 h-4" />
                        New Project
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            </motion.div>

            {/* Metrics Row with animated counters */}
            {projects.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-3 gap-4 md:gap-5 mb-6"
              >
                <motion.div variants={staggerItem}>
                  <MetricCard label="Total projects" value={animTotal} />
                </motion.div>
                <motion.div variants={staggerItem}>
                  <MetricCard label="Active" value={animActive} />
                </motion.div>
                <motion.div variants={staggerItem}>
                  <MetricCard label="Awaiting review" value={animOffers} />
                </motion.div>
              </motion.div>
            )}

            {/* Continue Draft Banner */}
            <AnimatePresence>
              {showContinueBanner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4 overflow-hidden"
                >
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            You have an unfinished project
                            {sessionInfo.category ? ` — ${sessionInfo.category}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pick up where you left off
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { deleteSession(); setSessionDismissed(true); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/60"
                          title="Discard draft"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <Link to="/create-project?restore=true">
                          <Button size="sm" className="gap-1.5">
                            Continue
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid sm:grid-cols-2 gap-4 md:gap-5"
            >
              <motion.div variants={staggerItem}>
                <Link to="/new-project" className="group block">
                  <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25 }}>
                    <Card className="h-full border-primary/15 bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] hover:border-primary/30 hover:shadow-md rounded-2xl transition-all duration-300 cursor-pointer">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-medium text-foreground mb-0.5">
                            Start a new project
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Describe your idea and get matched
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Link to="/browse-businesses" className="group block">
                  <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25 }}>
                    <Card className="h-full border-accent/15 bg-gradient-to-br from-accent/[0.04] to-accent/[0.01] hover:border-accent/30 hover:shadow-md rounded-2xl transition-all duration-300 cursor-pointer">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-medium text-foreground mb-0.5">
                            Find designers
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Browse talented designers and studios
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-accent-foreground/40 group-hover:text-accent-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <main className="container mx-auto px-6 py-8 lg:py-10">
          {/* ─── Saved 3D editor drafts (furniture_designs) — preview 3, view all + delete ─── */}
          <SavedDesignsDraftsSection
            drafts={furnitureDrafts}
            loading={draftsLoading}
            removeDraft={removeDraft}
            previewLimit={SAVED_DRAFTS_PREVIEW_LIMIT}
            viewAllHref="/saved-designs"
          />

          {/* ─── Loading ─── */}
          {loading && (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your projects...</p>
            </div>
          )}

          {/* ─── Projects Section ─── */}
          {!loading && projects.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              {/* Section Header + Filter Chips */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-lg font-serif font-normal text-foreground">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                  {activeFilter !== 'all' && (
                    <span className="text-muted-foreground font-normal text-sm ml-2">
                      of {projects.length}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-1.5">
                  {FILTERS.map(({ key, label }) => (
                    <motion.button
                      key={key}
                      onClick={() => setActiveFilter(key)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeFilter === key
                          ? 'bg-foreground text-background shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Grid with staggered animation */}
              {filteredProjects.length > 0 ? (
                <motion.div
                  key={activeFilter}
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {filteredProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      variants={staggerItem}
                      layout
                    >
                      <ProjectCard
                        project={project}
                        offerCount={offerCounts[project.id] || 0}
                        onEdit={handleEdit}
                        onDelete={(id, title) => setDeleteTarget({ id, title })}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <p className="text-muted-foreground">No projects match this filter.</p>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    Show all projects
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── Empty State ─── */}
          {!loading && projects.length === 0 && <EmptyState />}
        </main>
      </motion.div>

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
