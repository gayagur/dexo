import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useMatchedProjects } from '@/hooks/useMatchedProjects';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useBusinessOffers } from '@/hooks/useOffers';
import { useOffersForProjects } from '@/hooks/useOffers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Plus, Sparkles, FolderOpen, Send, MessageSquare,
  Loader2, Search, Lightbulb, CheckCircle2, Circle,
  Palette, Users, Star, Clock,
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

const slideInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay },
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
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) { setCount(target); return; }
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

// ─── Rotating Tip Component ─────────────────────────────
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        className="text-sm text-muted-foreground leading-relaxed"
      >
        {tips[index]}
      </motion.p>
    </AnimatePresence>
  );
}

// ─── Status badge styling ───────────────────────────────
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  offers_received: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-primary/10 text-primary',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  offers_received: 'Offers Received',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// ─── Status progress (0–1 per status) ───────────────────
const statusProgress: Record<string, number> = {
  draft: 0.1,
  sent: 0.3,
  offers_received: 0.55,
  in_progress: 0.75,
  completed: 1,
};

// ─── Steps ───────────────────────────────────────────────
const customerSteps = [
  { icon: Palette, title: 'Describe', desc: 'Tell AI about your dream product' },
  { icon: Users, title: 'Receive Offers', desc: 'Creators send you proposals' },
  { icon: Star, title: 'Collaborate', desc: 'Work with your chosen creator' },
];

const creatorSteps = [
  { icon: Search, title: 'Discover', desc: 'Browse matched project briefs' },
  { icon: Send, title: 'Send Offers', desc: 'Submit your price and timeline' },
  { icon: Star, title: 'Deliver', desc: 'Create and build your reputation' },
];

// ─── Tips ────────────────────────────────────────────────
const customerTips = [
  "Add reference images to help creators understand your vision better.",
  "The more details you provide, the more accurate quotes you'll receive.",
  "Check your offers regularly — creators respond within 24 hours.",
  "You can edit your project brief anytime before accepting an offer.",
];

const creatorTips = [
  "Complete your profile to get better project matches.",
  "Respond quickly to new projects for a competitive edge.",
  "Portfolio images dramatically increase your offer acceptance rate.",
  "Write personalized notes with your offers to stand out.",
];

// ════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════
const AuthenticatedHome = () => {
  const { user, role } = useAuth();
  const firstName =
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'there';

  const isCreator = role === 'business';

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {isCreator ? (
          <CreatorHome firstName={firstName} />
        ) : (
          <CustomerHome firstName={firstName} />
        )}
      </motion.div>
    </AppLayout>
  );
};

// ════════════════════════════════════════════════════════════
// CUSTOMER HOME
// ════════════════════════════════════════════════════════════
function CustomerHome({ firstName }: { firstName: string }) {
  const { projects, loading } = useProjects();
  const projectIds = projects.map((p) => p.id);
  const { offerCounts } = useOffersForProjects(projectIds);

  const totalOffers = Object.values(offerCounts).reduce((sum, n) => sum + n, 0);
  const activeCount = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'draft'
  ).length;
  const lastProject = projects[0];
  const recentProjects = projects.slice(0, 3);

  const animProjects = useAnimatedCounter(projects.length);
  const animOffers = useAnimatedCounter(totalOffers);
  const animActive = useAnimatedCounter(activeCount);

  // Build animated status parts
  const statusParts: React.ReactNode[] = [];
  if (projects.length > 0) statusParts.push(<span key="p">{animProjects} project{projects.length !== 1 ? 's' : ''}</span>);
  if (totalOffers > 0) statusParts.push(<span key="o">{animOffers} offer{totalOffers !== 1 ? 's' : ''} received</span>);
  if (activeCount > 0) statusParts.push(<span key="a">{animActive} active</span>);

  return (
    <>
      {/* ── Command Center Band ── */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.02] to-transparent">
        <div className="container mx-auto px-6 py-8 lg:py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-2xl md:text-3xl font-serif text-foreground"
              >
                Welcome back, {firstName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-muted-foreground mt-1.5 text-sm flex items-center gap-1.5 flex-wrap"
              >
                {statusParts.length > 0
                  ? statusParts.map((part, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-muted-foreground/40">&middot;</span>}
                        {part}
                      </span>
                    ))
                  : 'Ready to start your first project?'}
              </motion.p>
            </div>

            <motion.div custom={0.15} variants={fadeUp} className="flex items-center gap-3">
              <Link to="/create-project">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="hero" size="lg" className="group shadow-md hover:shadow-lg transition-shadow">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </motion.div>
              </Link>
              <Link to="/browse-businesses">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="hover:border-primary/40 hover:shadow-[0_0_15px_-3px_hsl(20_70%_44%/0.15)] transition-all"
                  >
                    Browse Creators
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      <main className="container mx-auto px-6 py-8 lg:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Continue where you left off */}
              {lastProject && (
                <motion.section
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                  variants={slideInLeft}
                >
                  <h2 className="text-lg font-serif font-normal text-foreground mb-4">
                    Continue where you left off
                  </h2>
                  <Link to={`/project/${lastProject.id}`}>
                    <motion.div
                      whileHover={{ y: -4, boxShadow: '0 12px 40px -10px hsl(25 20% 15% / 0.12)' }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="overflow-hidden rounded-2xl transition-all duration-300">
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row">
                            {lastProject.ai_concept && (
                              <div className="sm:w-52 h-36 sm:h-auto shrink-0 overflow-hidden">
                                <motion.img
                                  whileHover={{ scale: 1.05 }}
                                  transition={{ duration: 0.5 }}
                                  src={lastProject.ai_concept}
                                  alt={lastProject.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="p-5 flex-1 flex flex-col justify-center">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                    statusColors[lastProject.status] || 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {statusLabels[lastProject.status] || lastProject.status}
                                </span>
                                {lastProject.category && (
                                  <span className="text-xs text-muted-foreground">{lastProject.category}</span>
                                )}
                              </div>
                              <h3 className="font-serif text-xl text-foreground mb-1">
                                {lastProject.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {lastProject.description}
                              </p>
                              {/* Progress indicator */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
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
                              <ArrowRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.section>
              )}

              {/* Recent Projects */}
              <section>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-center justify-between mb-4"
                >
                  <h2 className="text-lg font-serif font-normal text-foreground">Recent projects</h2>
                  {projects.length > 0 && (
                    <Link
                      to="/dashboard"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </motion.div>

                {recentProjects.length > 0 ? (
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
                  >
                    {recentProjects.map((project) => (
                      <motion.div key={project.id} variants={staggerItem}>
                        <Link to={`/project/${project.id}`}>
                          <motion.div
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.25 }}
                          >
                            <Card className="overflow-hidden h-full rounded-2xl hover:shadow-md transition-shadow duration-300 cursor-pointer group">
                              <div className="aspect-[16/9] overflow-hidden relative">
                                {project.ai_concept ? (
                                  <motion.img
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.5 }}
                                    src={project.ai_concept}
                                    alt={project.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-primary/[0.05] via-accent/[0.04] to-secondary flex items-center justify-center">
                                    <Palette className="w-10 h-10 text-primary/20" />
                                  </div>
                                )}
                                {/* Gradient overlay */}
                                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
                                {/* Title overlay on image */}
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <h3 className="font-serif font-normal text-white text-sm truncate drop-shadow-sm">
                                    {project.title}
                                  </h3>
                                </div>
                                {/* Status badge with pulse */}
                                <div className="absolute top-2.5 left-2.5">
                                  <motion.span
                                    animate={project.status === 'sent' ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm shadow-sm ${
                                      statusColors[project.status] || 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {statusLabels[project.status]}
                                  </motion.span>
                                </div>
                              </div>
                              <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {project.description}
                                </p>
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

                    {/* New project card */}
                    <motion.div variants={staggerItem}>
                      <Link to="/create-project">
                        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                          <Card className="overflow-hidden h-full border-dashed rounded-2xl hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-pointer">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[220px]">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                transition={{ duration: 0.3 }}
                                className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3"
                              >
                                <Plus className="w-6 h-6 text-primary" />
                              </motion.div>
                              <h3 className="font-serif font-normal text-foreground">Start new project</h3>
                              <p className="text-xs text-muted-foreground mt-1">Describe your idea to AI</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Link>
                    </motion.div>
                  </motion.div>
                ) : (
                  /* Empty State */
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                  >
                    <Card className="border-dashed rounded-2xl">
                      <CardContent className="p-10 text-center">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5"
                        >
                          <Sparkles className="w-8 h-8 text-primary" />
                        </motion.div>
                        <h3 className="font-serif text-xl mb-2">
                          Your creative journey starts here
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                          Describe your idea, let AI visualize it, and connect with talented creators.
                        </p>
                        <Link to="/create-project">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="inline-block">
                            <Button variant="hero" size="lg" className="group shadow-md">
                              Start Your First Project
                              <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                            </Button>
                          </motion.div>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </section>
            </div>

            {/* Right Column (1/3) */}
            <div className="space-y-6">
              {/* How DEXO Works */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                <Card className="rounded-2xl">
                  <CardContent className="p-5">
                    <h3 className="font-serif font-normal text-foreground mb-5">
                      How DEXO works for you
                    </h3>
                    <div className="relative">
                      {/* Connecting line */}
                      <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />
                      <div className="space-y-5">
                        {customerSteps.map((step, i) => (
                          <motion.div
                            key={i}
                            variants={slideInRight}
                            custom={i * 0.1}
                            whileHover={{ scale: 1.02, x: 4 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-3 relative cursor-default"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 z-10">
                              <step.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-foreground">{step.title}</div>
                              <div className="text-xs text-muted-foreground">{step.desc}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tip Card */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.2}
                variants={fadeUp}
              >
                <Card className="bg-primary/[0.03] border-primary/10 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        animate={{ boxShadow: ['0 0 0 0 hsl(20 70% 44% / 0)', '0 0 12px 2px hsl(20 70% 44% / 0.2)', '0 0 0 0 hsl(20 70% 44% / 0)'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="rounded-full"
                      >
                        <Lightbulb className="w-4 h-4 text-primary" />
                      </motion.div>
                      <h3 className="text-sm font-medium text-foreground">Quick Tip</h3>
                    </div>
                    <RotatingTip tips={customerTips} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// ════════════════════════════════════════════════════════════
// CREATOR HOME
// ════════════════════════════════════════════════════════════
function CreatorHome({ firstName }: { firstName: string }) {
  const { business, loading: bizLoading } = useBusinessProfile();
  const { projects: matchedProjects, loading: matchLoading } = useMatchedProjects();
  const { offers, loading: offersLoading } = useBusinessOffers(business?.id);

  const loading = bizLoading || matchLoading || offersLoading;
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const acceptedOffers = offers.filter((o) => o.status === 'accepted');

  const animMatched = useAnimatedCounter(matchedProjects.length);
  const animPending = useAnimatedCounter(pendingOffers.length);
  const animActive = useAnimatedCounter(acceptedOffers.length);

  // Status summary
  const parts: string[] = [];
  if (matchedProjects.length > 0)
    parts.push(`${matchedProjects.length} matched project${matchedProjects.length !== 1 ? 's' : ''}`);
  if (pendingOffers.length > 0)
    parts.push(`${pendingOffers.length} pending offer${pendingOffers.length !== 1 ? 's' : ''}`);
  if (acceptedOffers.length > 0)
    parts.push(`${acceptedOffers.length} active job${acceptedOffers.length !== 1 ? 's' : ''}`);
  const statusSummary =
    parts.length > 0 ? parts.join(' \u00B7 ') : 'Set up your profile to start receiving projects.';

  // Profile strength checks
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

  return (
    <>
      {/* ── Command Center Band ── */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.02] to-transparent">
        <div className="container mx-auto px-6 py-8 lg:py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-2xl md:text-3xl font-serif text-foreground"
              >
                Welcome back, {firstName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-muted-foreground mt-1.5 text-sm"
              >
                {statusSummary}
              </motion.p>
            </div>

            <motion.div custom={0.15} variants={fadeUp} className="flex items-center gap-3">
              <Link to="/business">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="hero" size="lg" className="group shadow-md hover:shadow-lg transition-shadow">
                    <Search className="w-4 h-4 mr-2" />
                    Browse Projects
                  </Button>
                </motion.div>
              </Link>
              <Link to="/profile">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="hover:border-primary/40 hover:shadow-[0_0_15px_-3px_hsl(20_70%_44%/0.15)] transition-all"
                  >
                    Edit Profile
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      <main className="container mx-auto px-6 py-8 lg:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats Row */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid sm:grid-cols-3 gap-4"
              >
                {[
                  { icon: FolderOpen, label: 'Matched Projects', value: animMatched, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
                  { icon: Clock, label: 'Pending Offers', value: animPending, gradient: 'from-amber-500/10 to-amber-500/5', iconColor: 'text-amber-600' },
                  { icon: MessageSquare, label: 'Active Jobs', value: animActive, gradient: 'from-green-500/10 to-green-500/5', iconColor: 'text-green-600' },
                ].map((stat) => (
                  <motion.div key={stat.label} variants={staggerItem}>
                    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                      <Card className="rounded-2xl overflow-hidden">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                          </div>
                          <div>
                            <div className="text-2xl font-serif font-normal text-foreground">{stat.value}</div>
                            <div className="text-xs text-muted-foreground">{stat.label}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>

              {/* New Project Requests */}
              <section>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-center justify-between mb-4"
                >
                  <h2 className="text-lg font-serif font-normal text-foreground">
                    New project requests
                  </h2>
                  {matchedProjects.length > 0 && (
                    <Link
                      to="/business"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </motion.div>

                {matchedProjects.length > 0 ? (
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="space-y-3"
                  >
                    {matchedProjects.slice(0, 3).map((project) => (
                      <motion.div key={project.id} variants={staggerItem}>
                        <Link to={`/business/request/${project.id}`}>
                          <motion.div
                            whileHover={{ y: -2, boxShadow: '0 8px 30px -8px hsl(25 20% 15% / 0.1)' }}
                            transition={{ duration: 0.25 }}
                          >
                            <Card className="overflow-hidden rounded-2xl cursor-pointer transition-all duration-300">
                              <CardContent className="p-4 flex items-center gap-4">
                                {project.ai_concept && (
                                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                                    <img
                                      src={project.ai_concept}
                                      alt={project.title}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-serif font-normal text-foreground truncate">
                                    {project.title}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">{project.category}</span>
                                    {project.budget_min != null && project.budget_max != null && (
                                      <span className="text-xs font-medium text-primary">
                                        ${project.budget_min.toLocaleString()}&ndash;${project.budget_max.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              </CardContent>
                            </Card>
                          </motion.div>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                  >
                    <Card className="border-dashed rounded-2xl">
                      <CardContent className="p-8 text-center">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3"
                        >
                          <FolderOpen className="w-6 h-6 text-primary" />
                        </motion.div>
                        <h3 className="font-serif font-normal mb-1.5">Creators are reviewing your profile</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          {business
                            ? 'New projects matching your categories will appear here.'
                            : 'Complete your profile to start receiving matched projects.'}
                        </p>
                        {!business && (
                          <Link to="/profile" className="mt-4 inline-block">
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="warm" size="default">Set Up Profile</Button>
                            </motion.div>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </section>

              {/* Active Conversations */}
              {acceptedOffers.length > 0 && (
                <motion.section
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0.1}
                  variants={fadeUp}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-serif font-normal text-foreground">Messages</h2>
                    <Link
                      to="/business/conversations"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <Link to="/business/conversations">
                    <motion.div
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-foreground">Active Conversations</h3>
                            <p className="text-sm text-muted-foreground">
                              {acceptedOffers.length} active project{acceptedOffers.length !== 1 ? 's' : ''} with messaging
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.section>
              )}
            </div>

            {/* Right Column (1/3) */}
            <div className="space-y-6">
              {/* How DEXO Works */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                <Card className="rounded-2xl">
                  <CardContent className="p-5">
                    <h3 className="font-serif font-normal text-foreground mb-5">
                      How DEXO works for creators
                    </h3>
                    <div className="relative">
                      {/* Connecting line */}
                      <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />
                      <div className="space-y-5">
                        {creatorSteps.map((step, i) => (
                          <motion.div
                            key={i}
                            variants={slideInRight}
                            custom={i * 0.1}
                            whileHover={{ scale: 1.02, x: 4 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-3 relative cursor-default"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 z-10">
                              <step.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-foreground">{step.title}</div>
                              <div className="text-xs text-muted-foreground">{step.desc}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Profile Strength Card */}
              {business && (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0.1}
                  variants={fadeUp}
                >
                  <Card className="rounded-2xl">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-foreground">Profile Strength</h3>
                        <span className="text-xs font-medium text-primary">
                          {profileScore}/{profileTotal}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${(profileScore / profileTotal) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="space-y-2.5">
                        {profileChecks.map((check, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className="flex items-center gap-2.5"
                          >
                            {check.done ? (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                            )}
                            <span className={`text-sm ${check.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {check.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      {profileScore < profileTotal && (
                        <Link to="/profile" className="mt-4 block">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                            <Button variant="soft" size="sm" className="w-full">
                              Complete Profile
                            </Button>
                          </motion.div>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* No profile CTA */}
              {!business && !loading && (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0.15}
                  variants={fadeUp}
                >
                  <Card className="border-dashed border-primary/20 bg-primary/[0.02] rounded-2xl">
                    <CardContent className="p-5 text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3"
                      >
                        <Sparkles className="w-6 h-6 text-primary" />
                      </motion.div>
                      <h3 className="font-serif font-normal mb-1.5">Set up your creator profile</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Complete your profile to start receiving matched projects.
                      </p>
                      <Link to="/profile">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="warm" size="default" className="w-full group">
                            Get Started
                            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </motion.div>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Tip Card */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.2}
                variants={fadeUp}
              >
                <Card className="bg-primary/[0.03] border-primary/10 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        animate={{ boxShadow: ['0 0 0 0 hsl(20 70% 44% / 0)', '0 0 12px 2px hsl(20 70% 44% / 0.2)', '0 0 0 0 hsl(20 70% 44% / 0)'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="rounded-full"
                      >
                        <Lightbulb className="w-4 h-4 text-primary" />
                      </motion.div>
                      <h3 className="text-sm font-medium text-foreground">Quick Tip</h3>
                    </div>
                    <RotatingTip tips={creatorTips} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default AuthenticatedHome;
