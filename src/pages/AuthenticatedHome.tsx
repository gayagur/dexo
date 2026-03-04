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
  ArrowRight, Plus, Loader2, CheckCircle2, Circle, Palette,
  Search, Briefcase, Clock, Zap, Sparkles, Package,
  MessageSquare, TrendingUp, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Step images
import stepDesign from '@/assets/step-design.jpg';
import stepCreate from '@/assets/step-create.jpg';
import stepReceive from '@/assets/step-receive.jpg';

// Category images
import categoryJewelry from '@/assets/category-jewelry.jpg';
import categoryCakes from '@/assets/category-cakes.jpg';
import categoryFurniture from '@/assets/category-furniture.jpg';
import categoryFashion from '@/assets/category-fashion.jpg';
import categoryCeramics from '@/assets/category-ceramics.jpg';
import categoryGifts from '@/assets/category-gifts.jpg';
import categoryTextiles from '@/assets/category-textiles.jpg';
import category3dprint from '@/assets/category-3dprint.jpg';

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
  { image: categoryJewelry, title: 'Jewelry', search: 'Jewelry', desc: 'Rings, necklaces & custom pieces' },
  { image: categoryCakes, title: 'Custom Cakes', search: 'Custom Cakes', desc: 'Wedding & celebration creations' },
  { image: categoryFurniture, title: 'Furniture', search: 'Furniture', desc: 'Bespoke tables & shelving' },
  { image: categoryFashion, title: 'Fashion', search: 'Clothing', desc: 'Custom suits & tailoring' },
  { image: categoryCeramics, title: 'Ceramics', search: 'Pottery', desc: 'Dinnerware & sculptural art' },
  { image: categoryGifts, title: 'Gifts', search: 'Accessories', desc: 'Engraved & personalized items' },
  { image: categoryTextiles, title: 'Textiles', search: 'Textiles', desc: 'Quilts, monograms & linens' },
  { image: category3dprint, title: '3D Printing', search: '3D Printing', desc: 'Figurines & prototypes' },
];

const customerTips = [
  'Add reference images to help creators understand your vision better.',
  'The more details you provide, the more accurate quotes you\'ll receive.',
  'Check your offers regularly — creators respond within 24 hours.',
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
  const { user, role } = useAuth();
  const firstName =
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'there';
  const isCreator = role === 'business';

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        {isCreator ? <CreatorHome firstName={firstName} /> : <CustomerHome firstName={firstName} />}
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
                Design something extraordinary and connect with talented creators.
              </motion.p>
            </div>
            <motion.div custom={0.15} variants={fadeUp} className="flex gap-3">
              <Link to="/create-project">
                <Button variant="hero" size="lg" className="group shadow-sm hover:shadow-md transition-shadow">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
              <Link to="/browse-businesses">
                <Button variant="outline" size="lg" className="hover:border-primary/40 transition-all">
                  Browse Creators
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
            description: 'Tell us your idea in words. Our AI instantly generates visual mockups of your dream product.',
            accent: '#C05621',
            image: stepDesign,
          },
          {
            number: 2,
            icon: Search,
            title: 'Get Matched',
            description: 'Skilled creators see your design brief and send you offers with pricing, timeline, and their approach.',
            accent: '#D4793A',
            image: stepCreate,
          },
          {
            number: 3,
            icon: Package,
            title: 'Receive & Enjoy',
            description: 'Your one-of-a-kind product is crafted and delivered — exactly what you envisioned.',
            accent: '#E8A065',
            image: stepReceive,
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
                            <img src={lastProject.ai_concept} alt={lastProject.title} className="w-full h-full object-cover" />
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
                <Link to="/create-project">
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
                  <h3 className="font-serif text-lg mb-1.5">Your creative journey starts here</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                    Describe your dream product, let AI visualize it, and connect with talented creators.
                  </p>
                  <Link to="/create-project">
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
  const { business, loading: bizLoading } = useBusinessProfile();
  const { projects: matchedProjects, loading: matchLoading } = useMatchedProjects();
  const { offers, loading: offersLoading } = useBusinessOffers(business?.id);

  const loading = bizLoading || matchLoading || offersLoading;
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const acceptedOffers = offers.filter((o) => o.status === 'accepted');

  const animMatched = useAnimatedCounter(matchedProjects.length);
  const animPending = useAnimatedCounter(pendingOffers.length);
  const animActive = useAnimatedCounter(acceptedOffers.length);

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
                Discover new projects, connect with clients, and grow your creative business.
              </motion.p>
            </div>
            <motion.div custom={0.15} variants={fadeUp} className="flex gap-3">
              <Link to="/business">
                <Button variant="hero" size="lg" className="group shadow-sm hover:shadow-md transition-shadow">
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

      {/* ── Stats ────────────────────────────────────── */}
      <StatStrip stats={[
        { icon: Briefcase, label: 'Matched Projects', value: animMatched, to: '/business' },
        { icon: Clock, label: 'Pending Offers', value: animPending, accent: animPending > 0, to: '/business/offers' },
        { icon: Zap, label: 'Active Jobs', value: animActive, to: '/business/conversations' },
      ]} />

      {/* ── How It Works ──────────────────────────────── */}
      <HowItWorks
        label="How It Works"
        steps={[
          {
            number: 1,
            icon: Eye,
            title: 'Discover Projects',
            description: 'Browse incoming requests that match your skills. Each comes with an AI-generated visual brief and budget.',
            accent: '#C05621',
            image: stepDesign,
          },
          {
            number: 2,
            icon: MessageSquare,
            title: 'Send Your Offer',
            description: 'Review the design brief and submit your price, timeline, and approach. Stand out with a personalized note.',
            accent: '#D4793A',
            image: stepCreate,
          },
          {
            number: 3,
            icon: Zap,
            title: 'Create & Deliver',
            description: 'Once accepted, craft the product and communicate with your client. Build your reputation with every delivery.',
            accent: '#E8A065',
            image: stepReceive,
          },
        ]}
      />

      {/* ── Content Grid ─────────────────────────────── */}
      <section className="py-10 lg:py-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main column — project requests */}
            <div className="lg:col-span-2">
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="flex items-center justify-between mb-4"
              >
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em]">
                  Incoming Requests
                </h2>
                {matchedProjects.length > 0 && (
                  <Link to="/business" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </motion.div>

              {matchedProjects.length > 0 ? (
                <motion.div
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={staggerContainer}
                  className="space-y-3"
                >
                  {matchedProjects.slice(0, 4).map((project) => (
                    <motion.div key={project.id} variants={staggerItem}>
                      <Link to={`/business/request/${project.id}`}>
                        <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                          <Card className="overflow-hidden rounded-xl cursor-pointer hover:shadow-sm transition-all duration-200 group">
                            <CardContent className="p-0">
                              <div className="flex items-center">
                                {project.ai_concept ? (
                                  <div className="w-20 h-20 shrink-0 overflow-hidden">
                                    <img
                                      src={project.ai_concept} alt={project.title} loading="lazy"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 shrink-0 bg-primary/[0.04] flex items-center justify-center">
                                    <Package className="w-6 h-6 text-primary/15" />
                                  </div>
                                )}
                                <div className="flex-1 p-4 min-w-0">
                                  <h3 className="font-medium text-sm text-foreground truncate">{project.title}</h3>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-muted-foreground">{project.category}</span>
                                    {project.budget_min != null && project.budget_max != null && (
                                      <span className="text-[11px] font-medium text-primary">
                                        ${project.budget_min.toLocaleString()}&ndash;${project.budget_max.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="pr-4">
                                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <Card className="border-dashed border-2 border-border/60 rounded-2xl">
                  <CardContent className="py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-4">
                      <Package className="w-5 h-5 text-primary/40" />
                    </div>
                    <h3 className="font-serif text-base mb-1">No project requests yet</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {business
                        ? 'New projects matching your categories will appear here.'
                        : 'Complete your profile to start receiving matched projects.'}
                    </p>
                    {!business && (
                      <Link to="/profile" className="mt-4 inline-block">
                        <Button variant="warm" size="sm">Complete Your Profile</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Active conversations */}
              {acceptedOffers.length > 0 && (
                <motion.div className="mt-6" initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp}>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em] mb-3">
                    Active Conversations
                  </h2>
                  <Link to="/business/conversations">
                    <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                      <Card className="rounded-xl cursor-pointer hover:shadow-sm transition-all duration-200">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0">
                            <MessageSquare className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">Messages</span>
                            <p className="text-xs text-muted-foreground">
                              {acceptedOffers.length} active project{acceptedOffers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Sidebar column */}
            <div className="space-y-6">
              {/* Offers summary */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em] mb-3">
                  Your Offers
                </h2>
                <Card className="rounded-xl">
                  <CardContent className="p-4 space-y-3">
                    <Link to="/business/offers" className="flex items-center justify-between group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-sm text-foreground">Pending</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {pendingOffers.length}
                      </span>
                    </Link>
                    <Link to="/business/offers" className="flex items-center justify-between group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-sm text-foreground">Accepted</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {acceptedOffers.length}
                      </span>
                    </Link>
                    <Link to="/business/offers" className="flex items-center justify-between group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-sm text-foreground">Total sent</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {offers.length}
                      </span>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Profile completion */}
              {profileIncomplete && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp}>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em] mb-3">
                    Profile Strength
                  </h2>
                  <Card className="rounded-xl border-primary/10 bg-gradient-to-b from-primary/[0.02] to-transparent">
                    <CardContent className="p-4">
                      {business && (
                        <>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${(profileScore / profileTotal) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                                )}
                                <span className={`text-xs ${check.done ? 'text-foreground' : 'text-muted-foreground'}`}>
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
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Tip */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.15} variants={fadeUp}>
                <div className="px-4 py-3.5 rounded-xl bg-primary/[0.03] border border-primary/[0.08]">
                  <div className="flex items-start gap-2.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary/50 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-medium text-primary/60 uppercase tracking-[0.1em]">Creator tip</span>
                      <RotatingTip tips={creatorTips} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default AuthenticatedHome;
