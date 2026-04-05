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
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useFurnitureDesignDrafts } from '@/hooks/useFurnitureDesignDrafts';
import { SavedDesignsDraftsSection, SAVED_DRAFTS_PREVIEW_LIMIT } from '@/components/customer/SavedDesignsDraftsSection';
import { useOffersForProjects } from '@/hooks/useOffers';
import { useChatSession } from '@/hooks/useChatSession';
import { AppLayout } from '@/components/app/AppLayout';
import { lazy, Suspense } from 'react';

const FurniturePreview = lazy(() => import('@/components/design/FurniturePreview').then(m => ({ default: m.FurniturePreview })));
import type { PanelData } from '@/lib/furnitureData';
import type { ProjectStatus } from '@/lib/database.types';
import {
  Plus, MessageSquare, ArrowRight, Loader2, Sparkles, X,
  Palette, ArrowUpRight, MoreHorizontal, Pencil, Trash2,
  Search, Clock, Eye, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Animation Variants ──────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Status Config ──────────────────────────────────────────
const statusConfig: Record<string, { label: string; description: string }> = {
  draft: { label: 'Draft', description: 'Complete your brief to send to designers' },
  sent: { label: 'Sent', description: 'Waiting for designer responses' },
  offers_received: { label: 'Offers received', description: 'Review and compare offers' },
  in_progress: { label: 'In progress', description: 'Your designer is working on it' },
  completed: { label: 'Completed', description: 'Project delivered' },
};

// ─── Status progress ──────────────────────────────────────────
const statusProgress: Record<string, number> = {
  draft: 10,
  sent: 30,
  offers_received: 55,
  in_progress: 75,
  completed: 100,
};

function isActiveStatus(status: string): boolean {
  return ['sent', 'offers_received', 'in_progress'].includes(status);
}

// ─── Time ago helper ──────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Needs Attention Item ────────────────────────────────────
interface AttentionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  accentColor: string;
}

// ─── Project Card (Premium Redesign) ─────────────────────────
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
    created_at: string;
    updated_at: string | null;
  };
  offerCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const cfg = statusConfig[project.status] || statusConfig.draft;
  const progress = statusProgress[project.status] || 10;
  const canEdit = project.status !== 'completed';
  const canDelete = project.status === 'draft' || project.status === 'sent';

  // Determine CTA
  let ctaLabel = 'View project';
  let ctaHref = `/project/${project.id}`;
  if (project.status === 'draft') {
    ctaLabel = 'Complete brief';
  } else if (project.status === 'offers_received') {
    ctaLabel = offerCount > 0 ? `Review ${offerCount} offer${offerCount > 1 ? 's' : ''}` : 'View offers';
  } else if (project.status === 'in_progress') {
    ctaLabel = 'Track progress';
  }

  return (
    <div className="group relative">
      <Link to={ctaHref} className="block">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="h-full bg-white rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
            style={{
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Left: Thumbnail */}
              <div className="sm:w-[180px] h-[140px] sm:h-auto overflow-hidden shrink-0 relative">
                {project.details?.furniture_design && (project.details.furniture_design as Record<string, unknown>).panels ? (
                  <Suspense fallback={<div className="w-full h-full bg-[#F5F4F0] animate-pulse" />}>
                    <FurniturePreview
                      panels={(project.details.furniture_design as Record<string, unknown>).panels as PanelData[]}
                      className="w-full h-full"
                    />
                  </Suspense>
                ) : project.ai_concept ? (
                  <img
                    src={project.ai_concept}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#C96A3D]/[0.08] via-[#F5F4F0] to-[#E8E4DD] flex items-center justify-center">
                    <Palette className="w-8 h-8 text-[#C96A3D]/25" />
                  </div>
                )}
              </div>

              {/* Right: Content */}
              <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3
                      className="font-semibold text-[#1A1A1A] truncate"
                      style={{ fontSize: '16px', letterSpacing: '-0.01em' }}
                    >
                      {project.title}
                    </h3>
                    <StatusBadge status={project.status} label={cfg.label} className="shrink-0" />
                  </div>

                  <p
                    className="line-clamp-1 mb-3"
                    style={{ fontSize: '14px', color: '#6B6560' }}
                  >
                    {cfg.description}
                  </p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-1.5 rounded-full bg-[#F0EDE8] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#C96A3D' }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                      />
                    </div>
                    <span
                      className="whitespace-nowrap shrink-0"
                      style={{ fontSize: '11px', color: '#9E9992', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}
                    >
                      {progress}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '13px', color: '#9E9992' }}>
                    {timeAgo(project.updated_at || project.created_at)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 font-medium group-hover:gap-2 transition-all"
                    style={{ fontSize: '14px', color: '#C96A3D' }}
                  >
                    {ctaLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Action Menu */}
      {(canEdit || canDelete) && (
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4 text-[#1A1A1A]" />
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

  // Derived data
  const activeProjects = useMemo(() => projects.filter(p => isActiveStatus(p.status)), [projects]);
  const draftProjects = useMemo(() => projects.filter(p => p.status === 'draft'), [projects]);
  const completedProjects = useMemo(() => projects.filter(p => p.status === 'completed'), [projects]);
  const projectsWithOffers = useMemo(() => projects.filter(p => p.status === 'offers_received'), [projects]);
  const totalOffers = useMemo(() => Object.values(offerCounts).reduce((s, c) => s + c, 0), [offerCounts]);

  const firstName = user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  // ─── Build "Needs Attention" items ─────────────────────────
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    // Unfinished chat-session draft
    if (showContinueBanner) {
      items.push({
        id: 'continue-draft',
        icon: <Sparkles className="w-4 h-4" />,
        title: `Continue your design brief${sessionInfo.category ? ` — ${sessionInfo.category}` : ''}`,
        subtitle: 'Pick up where you left off',
        href: '/create-project?restore=true',
        accentColor: '#C96A3D',
      });
    }

    // Projects with offers to review
    for (const p of projectsWithOffers) {
      const count = offerCounts[p.id] || 0;
      if (count > 0) {
        items.push({
          id: `offers-${p.id}`,
          icon: <MessageSquare className="w-4 h-4" />,
          title: `Review ${count} new offer${count > 1 ? 's' : ''}`,
          subtitle: p.title,
          href: `/project/${p.id}`,
          accentColor: '#C96A3D',
        });
      }
    }

    // Draft projects that need completing
    for (const p of draftProjects) {
      items.push({
        id: `draft-${p.id}`,
        icon: <Pencil className="w-4 h-4" />,
        title: 'Complete your project brief',
        subtitle: p.title,
        href: `/project/${p.id}`,
        accentColor: '#7C6E64',
      });
    }

    return items.slice(0, 4); // max 4 items
  }, [showContinueBanner, sessionInfo, projectsWithOffers, offerCounts, draftProjects]);

  // ─── Recent activity (derived from projects by timestamps) ──
  const recentActivity = useMemo(() => {
    const events: { id: string; text: string; time: string; href: string }[] = [];

    for (const p of projects.slice(0, 10)) {
      const timestamp = p.updated_at || p.created_at;
      if (p.status === 'offers_received') {
        const count = offerCounts[p.id] || 0;
        if (count > 0) {
          events.push({
            id: `offer-${p.id}`,
            text: `${count} offer${count > 1 ? 's' : ''} received for ${p.title}`,
            time: timestamp,
            href: `/project/${p.id}`,
          });
        }
      }
      if (p.status === 'in_progress') {
        events.push({
          id: `progress-${p.id}`,
          text: `${p.title} is in progress with a designer`,
          time: timestamp,
          href: `/project/${p.id}`,
        });
      }
      if (p.status === 'completed') {
        events.push({
          id: `done-${p.id}`,
          text: `${p.title} was completed`,
          time: timestamp,
          href: `/project/${p.id}`,
        });
      }
      if (p.status === 'sent') {
        events.push({
          id: `sent-${p.id}`,
          text: `Brief for ${p.title} was sent to designers`,
          time: timestamp,
          href: `/project/${p.id}`,
        });
      }
    }

    return events
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [projects, offerCounts]);

  // ─── Hero headline logic ──────────────────────────────────
  const heroHeadline = useMemo(() => {
    if (loading) return 'Loading...';
    if (projects.length === 0) return "Let's transform your space";
    if (activeProjects.length > 0) {
      return `${activeProjects.length} project${activeProjects.length > 1 ? 's' : ''} in progress`;
    }
    if (totalOffers > 0) {
      return `You have ${totalOffers} new offer${totalOffers > 1 ? 's' : ''} to review`;
    }
    if (completedProjects.length > 0) {
      return `${completedProjects.length} project${completedProjects.length > 1 ? 's' : ''} completed`;
    }
    return `${projects.length} project${projects.length > 1 ? 's' : ''} total`;
  }, [loading, projects, activeProjects, totalOffers, completedProjects]);

  const heroSubtitle = useMemo(() => {
    if (loading) return '';
    if (projects.length === 0) return 'Describe your dream space and get matched with talented designers.';
    if (attentionItems.length > 0) return `${attentionItems.length} item${attentionItems.length > 1 ? 's' : ''} need your attention`;
    return 'All caught up — explore new design possibilities.';
  }, [loading, projects, attentionItems]);

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}
      >
        {/* ═══ A. HERO — Status-aware ═══ */}
        <section className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="container mx-auto px-6 pt-10 pb-8 lg:pt-12 lg:pb-10">
            <motion.div
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
            >
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ fontSize: '13px', color: '#9E9992', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}
                  className="mb-2"
                >
                  Welcome back, {firstName}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                  style={{ fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em', color: '#1A1A1A', lineHeight: 1.2 }}
                >
                  {heroHeadline}
                </motion.h1>
                {heroSubtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    style={{ fontSize: '15px', color: '#6B6560', marginTop: '6px' }}
                  >
                    {heroSubtitle}
                  </motion.p>
                )}
              </div>
              {projects.length > 0 && (
                <motion.div custom={0.15} variants={fadeUp}>
                  <Link to="/new-project">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        className="gap-2 shadow-md hover:shadow-lg transition-shadow"
                        style={{ backgroundColor: '#C96A3D', color: 'white' }}
                      >
                        <Plus className="w-4 h-4" />
                        New Project
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        <main className="container mx-auto px-6 py-8 lg:py-10 space-y-10">

          {/* ═══ Loading ═══ */}
          {loading && (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#C96A3D' }} />
              <p style={{ color: '#6B6560' }}>Loading your dashboard...</p>
            </div>
          )}

          {/* ═══ Empty State ═══ */}
          {!loading && projects.length === 0 && !showContinueBanner && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="py-8"
            >
              <div
                className="max-w-xl mx-auto text-center rounded-2xl bg-white p-10"
                style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ backgroundColor: '#C96A3D', opacity: 0.1 }}
                >
                  <Palette className="w-7 h-7" style={{ color: '#C96A3D' }} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '10px' }}>
                  Your design journey starts here
                </h2>
                <p style={{ fontSize: '15px', color: '#6B6560', marginBottom: '28px', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                  Describe your dream space and we will connect you with talented designers who can bring it to life.
                </p>
                <Link to="/new-project">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-block">
                    <Button size="lg" className="gap-2 shadow-md" style={{ backgroundColor: '#C96A3D', color: 'white' }}>
                      <Plus className="w-4 h-4" />
                      Create Your First Project
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ═══ B. NEEDS ATTENTION ═══ */}
          {!loading && attentionItems.length > 0 && (
            <motion.section
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <h2
                className="mb-4"
                style={{ fontSize: '11px', fontWeight: 600, color: '#9E9992', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}
              >
                Needs your attention
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {attentionItems.map((item) => (
                  <motion.div key={item.id} variants={staggerItem}>
                    <Link to={item.href} className="block group">
                      <div
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 transition-all duration-300"
                        style={{
                          border: '1px solid rgba(0,0,0,0.07)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.accentColor}15`, color: item.accentColor }}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ fontSize: '14px', color: '#1A1A1A' }}>
                            {item.title}
                          </p>
                          <p className="truncate" style={{ fontSize: '13px', color: '#9E9992' }}>
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight
                          className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: item.accentColor }}
                        />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ═══ Saved 3D editor drafts ═══ */}
          <SavedDesignsDraftsSection
            drafts={furnitureDrafts}
            loading={draftsLoading}
            removeDraft={removeDraft}
            previewLimit={SAVED_DRAFTS_PREVIEW_LIMIT}
            viewAllHref="/saved-designs"
          />

          {/* ═══ C. ACTIVE PROJECTS ═══ */}
          {!loading && projects.length > 0 && (
            <motion.section
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.01em' }}>
                  Your Projects
                  <span className="ml-2" style={{ fontSize: '14px', color: '#9E9992', fontWeight: 400 }}>
                    ({projects.length})
                  </span>
                </h2>
              </div>

              <div className="space-y-4">
                {projects.map((project) => (
                  <motion.div key={project.id} variants={staggerItem} layout>
                    <ProjectCard
                      project={project}
                      offerCount={offerCounts[project.id] || 0}
                      onEdit={handleEdit}
                      onDelete={(id, title) => setDeleteTarget({ id, title })}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ═══ D. QUICK ACTIONS ═══ */}
          {!loading && (
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <h2
                className="mb-4"
                style={{ fontSize: '11px', fontWeight: 600, color: '#9E9992', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}
              >
                Quick actions
              </h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'Start new project',
                    sub: 'Describe your space, get matched',
                    href: '/new-project',
                    icon: <Plus className="w-4 h-4" />,
                    primary: true,
                  },
                  {
                    label: 'Browse designers',
                    sub: 'Explore talented studios',
                    href: '/browse-businesses',
                    icon: <Search className="w-4 h-4" />,
                    primary: false,
                  },
                  {
                    label: 'Saved designs',
                    sub: 'View your draft designs',
                    href: '/saved-designs',
                    icon: <Eye className="w-4 h-4" />,
                    primary: false,
                  },
                ].map((action) => (
                  <motion.div key={action.href} variants={staggerItem}>
                    <Link to={action.href} className="block group">
                      <div
                        className="bg-white rounded-2xl p-5 transition-all duration-300"
                        style={{
                          border: action.primary ? '1px solid rgba(201,106,61,0.2)' : '1px solid rgba(0,0,0,0.07)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          background: action.primary ? 'linear-gradient(135deg, rgba(201,106,61,0.04), rgba(201,106,61,0.01))' : 'white',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: action.primary ? 'rgba(201,106,61,0.1)' : '#F0EDE8',
                              color: action.primary ? '#C96A3D' : '#7C6E64',
                            }}
                          >
                            {action.icon}
                          </div>
                          <ArrowUpRight
                            className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: action.primary ? '#C96A3D' : '#9E9992' }}
                          />
                        </div>
                        <p className="font-semibold" style={{ fontSize: '15px', color: '#1A1A1A' }}>{action.label}</p>
                        <p style={{ fontSize: '13px', color: '#9E9992', marginTop: '2px' }}>{action.sub}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ═══ E. RECENT ACTIVITY ═══ */}
          {!loading && recentActivity.length > 0 && (
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <h2
                className="mb-4"
                style={{ fontSize: '11px', fontWeight: 600, color: '#9E9992', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}
              >
                Recent activity
              </h2>
              <div
                className="bg-white rounded-2xl divide-y overflow-hidden"
                style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {recentActivity.map((event) => (
                  <motion.div key={event.id} variants={staggerItem}>
                    <Link
                      to={event.href}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#FAFAF8] group"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#C96A3D', opacity: 0.4 }} />
                      <p className="flex-1 min-w-0 truncate" style={{ fontSize: '14px', color: '#1A1A1A' }}>
                        {event.text}
                      </p>
                      <span className="shrink-0" style={{ fontSize: '12px', color: '#9E9992' }}>
                        {timeAgo(event.time)}
                      </span>
                      <ArrowRight
                        className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#C96A3D' }}
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

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
