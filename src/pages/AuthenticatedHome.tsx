import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useFurnitureDesignDrafts } from '@/hooks/useFurnitureDesignDrafts';
import { SavedDesignsDraftsSection, SAVED_DRAFTS_PREVIEW_LIMIT } from '@/components/customer/SavedDesignsDraftsSection';
import { useMatchedProjects } from '@/hooks/useMatchedProjects';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useBusinessOffers } from '@/hooks/useOffers';
import { useOffersForProjects } from '@/hooks/useOffers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Plus, Loader2, CheckCircle2, Circle, Palette,
  Search, Briefcase, Clock, Zap, Sparkles, Package,
  MessageSquare, TrendingUp, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusSummaryBar } from '@/components/business-dashboard/StatusSummaryBar';
import { SentOffersList } from '@/components/business-dashboard/SentOffersList';
import { RecentProjects } from '@/components/business-dashboard/RecentProjects';

// Step images
import stepDesign from '@/assets/step-design.png';
import stepConnect from '@/assets/step-connect.png';
import stepTransform from '@/assets/step-transform.png';

// Category images
import categoryCarpentry from '@/assets/category-carpentry.png';
import categoryDecor from '@/assets/category-decor.png';
import categoryFurniture from '@/assets/category-furniture.png';
import categoryInterior from '@/assets/category-interior.png';
import categoryLighting from '@/assets/category-lighting.png';
import categoryWallart from '@/assets/category-wallart.png';
import categoryStorage from '@/assets/category-storage.png';
import categoryOffice from '@/assets/category-office.png';

// ─── Animations ─────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Data ───────────────────────────────────────────────────

const categoryCards = [
  { image: categoryCarpentry, title: 'Carpentry', search: 'Carpentry & Woodworking', desc: 'Custom furniture & woodwork' },
  { image: categoryInterior, title: 'Interior Design', search: 'Interior Design & Space Planning', desc: 'Full room transformations' },
  { image: categoryDecor, title: 'Home Decor', search: 'Home Decor & Styling', desc: 'Accessories & styling' },
  { image: categoryLighting, title: 'Lighting', search: 'Lighting & Ambiance', desc: 'Fixtures & ambiance design' },
  { image: categoryWallart, title: 'Wall Art', search: 'Wall Art & Decorative Accessories', desc: 'Art, mirrors & decorative pieces' },
  { image: categoryFurniture, title: 'Furniture', search: 'Furniture Design & Restoration', desc: 'Design & restoration' },
  { image: categoryStorage, title: 'Storage', search: 'Storage & Organization Solutions', desc: 'Closets, pantry & shelving' },
  { image: categoryOffice, title: 'Office Design', search: 'Office Design & Ergonomics', desc: 'Ergonomic workspaces' },
];

const customerTips = [
  'Add photos of your current space to help designers understand the starting point.',
  'Mention your room dimensions and natural lighting for better results.',
  'Check your offers regularly — designers respond within 24 hours.',
  'You can edit your project brief anytime before accepting an offer.',
];

const creatorTips = [
  'Complete your profile to get better project matches.',
  'Respond quickly to new projects for a competitive edge.',
  'Portfolio images dramatically increase your offer acceptance rate.',
  'Write personalized notes with your offers to stand out.',
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  offers_received: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-primary/10 text-primary',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  offers_received: 'Offers Received',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const statusProgress: Record<string, number> = {
  draft: 0.1, sent: 0.3, offers_received: 0.55, in_progress: 0.75, completed: 1,
};

// ─── Helpers ────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200) {
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

function RotatingTip({ tips }: { tips: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex(i => (i + 1) % tips.length), 10000);
    return () => clearInterval(timer);
  }, [tips.length]);
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
        className="text-sm text-muted-foreground leading-relaxed"
      >
        {tips[index]}
      </motion.p>
    </AnimatePresence>
  );
}

// ─── Premium Stat Strip ─────────────────────────────────────

interface StatItem {
  icon: typeof Briefcase;
  label: string;
  value: number;
  accent?: boolean;
  to?: string;
}

function StatStrip({ stats }: { stats: StatItem[] }) {
  return (
    <section className="border-b border-border/50">
      <div className="container mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-3"
        >
          {stats.map((stat, i) => {
            const content = (
              <motion.div
                key={stat.label}
                variants={staggerItem}
                whileHover={stat.to ? { y: -2 } : undefined}
                className={`py-7 ${i > 0 ? 'pl-8 border-l border-border/40' : ''} ${
                  stat.to ? 'cursor-pointer group transition-colors hover:bg-primary/[0.02] rounded-lg' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-[0.08em] font-medium">
                    {stat.label}
                  </span>
                  {stat.to && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/0 group-hover:text-primary/50 transition-all ml-auto mr-2" />
                  )}
                </div>
                <span
                  className={`text-4xl font-semibold tracking-tight ${
                    stat.accent ? 'text-primary' : 'text-foreground'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {stat.value}
                </span>
              </motion.div>
            );

            return stat.to ? (
              <Link key={stat.label} to={stat.to}>{content}</Link>
            ) : (
              <div key={stat.label}>{content}</div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ─── How It Works Steps ─────────────────────────────────────

interface StepData {
  number: number;
  icon: typeof Sparkles;
  title: string;
  description: string;
  accent: string;
  image: string;
}

function HowItWorks({ steps, label }: { steps: StepData[]; label: string }) {
  return (
    <section className="py-12 border-t border-border/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="mb-8"
        >
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em]">
            {label}
          </h2>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          {steps.map((step, i) => (
            <motion.div key={step.number} variants={staggerItem}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="relative h-full"
              >
                <Card className="h-full rounded-2xl overflow-hidden border-border/50 hover:shadow-md transition-shadow duration-300">
                  {/* Image */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                    {/* Step number badge */}
                    <div
                      className="absolute top-3 left-3 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ background: step.accent }}
                    >
                      {step.number}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    {/* Icon + title */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${step.accent}12` }}
                      >
                        <step.icon className="w-4 h-4" style={{ color: step.accent }} />
                      </div>
                      <h3 className="font-serif text-lg text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>

                {/* Connector line between cards */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-border/40" />
                )}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Compact Category Row ───────────────────────────────────

function CategoryExplorer() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      variants={staggerContainer}
      className="grid grid-cols-4 md:grid-cols-8 gap-3"
    >
      {categoryCards.map((cat) => (
        <motion.div
          key={cat.title}
          variants={staggerItem}
        >
          <Link
            to={`/browse-businesses?search=${encodeURIComponent(cat.search)}`}
            className="group block"
          >
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
            >
              <div className="aspect-square rounded-2xl overflow-hidden relative mb-2">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight block text-center">
                {cat.title}
              </span>
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════

const AuthenticatedHome = () => {
  const { user, activeRole, isBusiness } = useAuth();
  const firstName =
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'there';

  // Business and creator are the same role — show CreatorHome for both
  const showCreatorHome = (activeRole === 'business' || activeRole === 'creator') && isBusiness;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        {showCreatorHome ? <CreatorHome firstName={firstName} /> : <CustomerHome firstName={firstName} />}
      </motion.div>
    </AppLayout>
  );
};

// ═════════════════════════════════════════════════════════════
// CUSTOMER HOME
// ═════════════════════════════════════════════════════════════

function CustomerHome({ firstName }: { firstName: string }) {
  const { projects, loading } = useProjects();
  const projectIds = projects.map((p) => p.id);
  const { offerCounts } = useOffersForProjects(projectIds);
  const { drafts: furnitureDrafts, loading: draftsLoading, removeDraft } = useFurnitureDesignDrafts();

  const totalOffers = Object.values(offerCounts).reduce((sum, n) => sum + n, 0);
  const activeCount = projects.filter((p) => p.status !== 'completed' && p.status !== 'draft').length;
  const recentProjects = projects.slice(0, 3);
  const lastProject = projects[0];

  const animProjects = useAnimatedCounter(projects.length);
  const animOffers = useAnimatedCounter(totalOffers);
  const animActive = useAnimatedCounter(activeCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[hsl(40_40%_97%)] to-background">
        <div className="container mx-auto px-6 py-10 lg:py-14">
          <motion.div initial="hidden" animate="visible" className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <motion.p custom={0} variants={fadeUp} className="text-sm text-muted-foreground mb-1">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
              </motion.p>
              <motion.h1
                custom={0.05}
                variants={fadeUp}
                className="text-3xl md:text-4xl font-serif tracking-tight text-foreground"
              >
                Welcome back, {firstName}
              </motion.h1>
              <motion.p custom={0.1} variants={fadeUp} className="text-muted-foreground mt-2 max-w-md">
                Design something extraordinary for your home or office.
              </motion.p>
            </div>
            <motion.div custom={0.15} variants={fadeUp} className="flex gap-3">
              <Link to="/new-project">
                <Button variant="hero" size="lg" className="group shadow-sm hover:shadow-md transition-shadow">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
              <Link to="/browse-businesses">
                <Button variant="outline" size="lg" className="hover:border-primary/40 transition-all">
                  Browse Designers
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <StatStrip stats={[
        { icon: Briefcase, label: 'Total Projects', value: animProjects, to: '/dashboard' },
        { icon: Eye, label: 'Offers Received', value: animOffers, accent: animOffers > 0, to: '/dashboard' },
        { icon: Zap, label: 'Active Jobs', value: animActive, to: '/dashboard' },
      ]} />

      {/* ── How It Works ──────────────────────────────── */}
      <HowItWorks
        label="How It Works"
        steps={[
          {
            number: 1,
            icon: Sparkles,
            title: 'Describe & Design',
            description: 'Describe your space and style. Our AI instantly generates visual design concepts for your room.',
            accent: '#C05621',
            image: stepDesign,
          },
          {
            number: 2,
            icon: Search,
            title: 'Get Matched',
            description: 'Matched designers review your brief and send offers with pricing, timeline, and their approach.',
            accent: '#D4793A',
            image: stepConnect,
          },
          {
            number: 3,
            icon: Package,
            title: 'Transform & Enjoy',
            description: 'Your space is transformed — exactly as you envisioned.',
            accent: '#E8A065',
            image: stepTransform,
          },
        ]}
      />

      {/* ── Continue + Recent Projects ────────────────── */}
      <section className="py-10 lg:py-12">
        <div className="container mx-auto px-6">
          {/* Continue card */}
          {lastProject && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              custom={0}
              variants={fadeUp}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em]">
                  Continue where you left off
                </h2>
              </div>
              <Link to={`/project/${lastProject.id}`}>
                <motion.div
                  whileHover={{ y: -3, boxShadow: '0 8px 30px -8px hsl(25 20% 15% / 0.1)' }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {lastProject.ai_concept && (
                          <div className="sm:w-48 h-36 sm:h-auto shrink-0 overflow-hidden">
                            <img loading="lazy" src={lastProject.ai_concept} alt={lastProject.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-5 flex-1 flex flex-col justify-center min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[lastProject.status] || 'bg-gray-100 text-gray-600'}`}>
                              {statusLabels[lastProject.status] || lastProject.status}
                            </span>
                            {lastProject.category && (
                              <span className="text-[10px] text-muted-foreground">{lastProject.category}</span>
                            )}
                          </div>
                          <h3 className="font-serif text-lg text-foreground mb-1 truncate">{lastProject.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{lastProject.description}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${(statusProgress[lastProject.status] || 0.1) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {statusLabels[lastProject.status]}
                            </span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center px-5">
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          )}

          <div className="mb-10">
            <SavedDesignsDraftsSection
              drafts={furnitureDrafts}
              loading={draftsLoading}
              removeDraft={removeDraft}
              previewLimit={SAVED_DRAFTS_PREVIEW_LIMIT}
              viewAllHref="/saved-designs"
            />
          </div>

          {/* Recent projects */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="flex items-center justify-between mb-4"
          >
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em]">
              Your Projects
            </h2>
            {projects.length > 0 && (
              <Link to="/dashboard" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </motion.div>

          {recentProjects.length > 0 ? (
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={staggerContainer}
              className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {recentProjects.map((project) => (
                <motion.div key={project.id} variants={staggerItem}>
                  <Link to={`/project/${project.id}`}>
                    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                      <Card className="overflow-hidden h-full rounded-2xl hover:shadow-md transition-shadow duration-300 cursor-pointer group">
                        <div className="aspect-[16/9] overflow-hidden relative">
                          {project.ai_concept ? (
                            <img
                              src={project.ai_concept} alt={project.title} loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/[0.04] via-accent/[0.03] to-secondary flex items-center justify-center">
                              <Palette className="w-8 h-8 text-primary/15" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-serif text-white text-sm truncate drop-shadow-sm">{project.title}</h3>
                          </div>
                          <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm shadow-sm ${statusColors[project.status] || 'bg-gray-100 text-gray-600'}`}>
                              {statusLabels[project.status]}
                            </span>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{project.category}</span>
                            {offerCounts[project.id] > 0 && (
                              <span className="text-xs font-medium text-primary">
                                {offerCounts[project.id]} offer{offerCounts[project.id] !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
              <motion.div variants={staggerItem}>
                <Link to="/new-project">
                  <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                    <Card className="overflow-hidden h-full border-dashed rounded-2xl hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-pointer">
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[220px]">
                        <div className="w-11 h-11 rounded-xl bg-primary/[0.06] flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                          <Plus className="w-5 h-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
                        </div>
                        <h3 className="font-serif text-foreground text-sm">Start new project</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Describe your idea to AI</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Card className="border-dashed border-2 border-border/60 rounded-2xl">
                <CardContent className="py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-6 h-6 text-primary/40" />
                  </div>
                  <h3 className="font-serif text-lg mb-1.5">Your design journey starts here</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                    Describe your dream space, let AI visualize it, and connect with talented designers.
                  </p>
                  <Link to="/new-project">
                    <Button variant="hero" size="lg" className="group shadow-sm">
                      Start Your First Project
                      <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Explore Categories ────────────────────────── */}
      <section className="py-8 border-t border-border/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="flex items-center justify-between mb-5"
          >
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em]">
              Explore Categories
            </h2>
          </motion.div>
          <CategoryExplorer />
        </div>
      </section>

      {/* ── Tip ──────────────────────────────────────── */}
      <section className="py-8 pb-12">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp}>
            <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-primary/[0.03] border border-primary/[0.08]">
              <Sparkles className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-primary/60 uppercase tracking-[0.1em]">Quick tip</span>
                <RotatingTip tips={customerTips} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// CREATOR HOME
// ═════════════════════════════════════════════════════════════

function CreatorHome({ firstName }: { firstName: string }) {
  const navigate = useNavigate();
  const { business, loading: bizLoading } = useBusinessProfile();
  const { projects: matchedProjects, loading: matchLoading } = useMatchedProjects();
  const { offers, loading: offersLoading } = useBusinessOffers(business?.id);

  const loading = bizLoading || matchLoading || offersLoading;

  // Profile strength
  const profileChecks = business
    ? [
        { label: 'Business name', done: !!business.name },
        { label: 'Categories selected', done: Array.isArray(business.categories) && business.categories.length > 0 },
        { label: 'Bio written', done: !!business.description && business.description.length > 20 },
        { label: 'Portfolio images', done: Array.isArray(business.portfolio) && business.portfolio.length > 0 },
      ]
    : [];
  const profileScore = profileChecks.filter((c) => c.done).length;
  const profileTotal = profileChecks.length;
  const profileIncomplete = !business || profileScore < profileTotal;

  // Redirect: no business profile → onboarding
  useEffect(() => {
    if (!bizLoading && !business) {
      navigate('/business/onboarding', { replace: true });
    }
  }, [bizLoading, business, navigate]);

  // Redirect: business exists but not approved → pending screen at /business
  useEffect(() => {
    if (!bizLoading && business && business.status !== 'approved') {
      navigate('/business', { replace: true });
    }
  }, [bizLoading, business, navigate]);

  if (loading || !business || business.status !== 'approved') {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      {/* ── A. Welcome Header ─────────────────────────── */}
      <section className="bg-gradient-to-b from-[hsl(28_30%_96%)] to-[#FAFAF8]">
        <div className="container mx-auto px-6 py-10 lg:py-14">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
          >
            <div>
              <motion.p custom={0} variants={fadeUp} className="text-sm text-muted-foreground mb-1">
                Good {greeting}
              </motion.p>
              <motion.h1
                custom={0.05}
                variants={fadeUp}
                className="text-3xl md:text-4xl font-serif tracking-tight text-foreground"
              >
                Welcome back, {firstName}
              </motion.h1>
              <motion.p custom={0.1} variants={fadeUp} className="text-muted-foreground mt-2 max-w-md">
                Here's what's happening with your projects.
              </motion.p>
            </div>
            <motion.div custom={0.15} variants={fadeUp} className="flex gap-3">
              <Link to="/business">
                <Button
                  variant="hero"
                  size="lg"
                  className="group transition-shadow"
                  style={{ boxShadow: '0 8px 24px rgba(201,106,61,0.25)' }}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Browse Projects
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="lg" className="hover:border-primary/40 transition-all">
                  Edit Profile
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── B. Projects by Status ─────────────────────── */}
      <section className="container mx-auto px-6 -mt-2 mb-10">
        <StatusSummaryBar projects={matchedProjects} loading={matchLoading} />
      </section>

      {/* ── C + D Content Grid ────────────────────────── */}
      <section className="container mx-auto px-6 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-10">
            {/* Sent Offers */}
            <SentOffersList businessId={business.id} />

            {/* Recent Projects */}
            <RecentProjects projects={matchedProjects} loading={matchLoading} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile completion */}
            {profileIncomplete && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Profile Strength
                </h2>
                <div className="bg-white rounded-[14px] border border-black/[0.07] shadow-sm p-5">
                  {business && (
                    <>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[#C96A3D]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(profileScore / profileTotal) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#C96A3D]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {profileScore}/{profileTotal}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {profileChecks.map((check, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.06 }}
                            className="flex items-center gap-2"
                          >
                            {check.done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#C96A3D] shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            )}
                            <span className={`text-xs ${check.done ? 'text-gray-700' : 'text-gray-400'}`}>
                              {check.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                  <Link to="/profile">
                    <Button variant="warm" size="sm" className="w-full group">
                      {business ? 'Complete Profile' : 'Get Started'}
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Quick stats card */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Quick Stats
              </h2>
              <div className="bg-white rounded-[14px] border border-black/[0.07] shadow-sm p-5 space-y-3">
                <Link to="/business/offers" className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-gray-600">Pending offers</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {offers.filter(o => o.status === 'pending').length}
                  </span>
                </Link>
                <Link to="/business/conversations" className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-gray-600">Active jobs</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {offers.filter(o => o.status === 'accepted').length}
                  </span>
                </Link>
                <Link to="/business/offers" className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-sm text-gray-600">Total sent</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {offers.length}
                  </span>
                </Link>
              </div>
            </motion.div>

            {/* Tip */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.15} variants={fadeUp}>
              <div className="px-4 py-3.5 rounded-[14px] bg-[#C96A3D]/[0.03] border border-[#C96A3D]/[0.08]">
                <div className="flex items-start gap-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#C96A3D]/50 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-medium text-[#C96A3D]/60 uppercase tracking-[0.1em]">Creator tip</span>
                    <RotatingTip tips={creatorTips} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuthenticatedHome;
