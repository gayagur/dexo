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
  Search, Briefcase, Clock, Zap, Sparkles, Package, Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Shared images from landing page
import stepDesign from '@/assets/step-design.jpg';
import stepCreate from '@/assets/step-create.jpg';
import stepReceive from '@/assets/step-receive.jpg';
import categoryJewelry from '@/assets/category-jewelry.jpg';
import categoryCakes from '@/assets/category-cakes.jpg';
import categoryFurniture from '@/assets/category-furniture.jpg';
import categoryFashion from '@/assets/category-fashion.jpg';
import categoryCeramics from '@/assets/category-ceramics.jpg';
import categoryGifts from '@/assets/category-gifts.jpg';
import categoryTextiles from '@/assets/category-textiles.jpg';
import category3dprint from '@/assets/category-3dprint.jpg';

// ─── Animation Variants ──────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Data ────────────────────────────────────────────────────

const creatorSteps = [
  { image: stepDesign, num: '01', title: 'Discover', desc: 'Browse project briefs that match your skills and creative style.' },
  { image: stepCreate, num: '02', title: 'Send Offers', desc: 'Submit pricing and timeline proposals directly to interested clients.' },
  { image: stepReceive, num: '03', title: 'Deliver', desc: 'Craft custom work, build your portfolio, and grow your reputation.' },
];

const customerSteps = [
  { image: stepDesign, num: '01', title: 'Describe', desc: 'Tell our AI about your dream product and get instant visual concepts.' },
  { image: stepCreate, num: '02', title: 'Receive Offers', desc: 'Talented creators review your brief and send personalized proposals.' },
  { image: stepReceive, num: '03', title: 'Collaborate', desc: 'Work directly with your chosen creator to bring your vision to life.' },
];

const categoryCards = [
  { image: categoryJewelry, title: 'Jewelry & Goldsmiths', desc: 'Rings, necklaces & custom pieces' },
  { image: categoryCakes, title: 'Custom Cakes', desc: 'Wedding cakes & celebration creations' },
  { image: categoryFurniture, title: 'Furniture & Woodwork', desc: 'Bespoke tables, chairs & shelving' },
  { image: categoryFashion, title: 'Fashion & Tailoring', desc: 'Custom suits & redesigned vintage' },
  { image: categoryCeramics, title: 'Ceramics', desc: 'Dinnerware sets & sculptural art' },
  { image: categoryGifts, title: 'Personalized Gifts', desc: 'Engraved items & custom packaging' },
  { image: categoryTextiles, title: 'Textile & Embroidery', desc: 'Quilts, monograms & linens' },
  { image: category3dprint, title: '3D Printing', desc: 'Figurines, prototypes & models' },
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

const statusProgress: Record<string, number> = {
  draft: 0.1, sent: 0.3, offers_received: 0.55, in_progress: 0.75, completed: 1,
};

// ─── Helpers ─────────────────────────────────────────────────

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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        className="text-[15px] text-muted-foreground leading-relaxed"
      >
        {tips[index]}
      </motion.p>
    </AnimatePresence>
  );
}

// ─── Shared Section Components ───────────────────────────────

function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <motion.div
      className="text-center mb-14"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      custom={0}
      variants={fadeUp}
    >
      <span className="text-xs font-medium text-primary uppercase tracking-[0.15em]">{label}</span>
      <h2 className="text-2xl md:text-3xl font-serif mt-3 tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-[15px]">{subtitle}</p>}
    </motion.div>
  );
}

function StatsRow({ stats }: { stats: { icon: typeof Briefcase; label: string; value: number }[] }) {
  return (
    <section className="py-12 border-b border-border/40">
      <div className="container mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-5"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25 }}>
                <Card className="rounded-2xl overflow-hidden border-border/50 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl bg-primary/[0.08] flex items-center justify-center mb-4">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-4xl font-serif tracking-tight text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1.5 uppercase tracking-[0.12em] font-medium">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection({ steps, label, title, subtitle }: {
  steps: typeof creatorSteps;
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="py-16 lg:py-20" style={{ background: '#F9F5EF' }}>
      <div className="container mx-auto px-6">
        <SectionHeader label={label} title={title} subtitle={subtitle} />
        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {steps.map((step) => (
            <motion.div key={step.num} variants={staggerItem} className="group">
              <Card hover className="overflow-hidden h-full bg-white/80 backdrop-blur-xl border-white/50 shadow-sm">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={step.image}
                    alt={step.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                  <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shadow-lg">
                    {step.num}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-serif text-lg text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="py-16 lg:py-20">
      <div className="container mx-auto px-6">
        <SectionHeader
          label="Explore"
          title="Discover what you can create"
          subtitle="From fine jewelry to custom furniture — find the perfect category for your next project."
        />
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {categoryCards.map((cat) => (
            <motion.div
              key={cat.title}
              variants={staggerItem}
              className="group relative overflow-hidden rounded-2xl cursor-pointer"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-serif text-sm sm:text-base leading-tight">{cat.title}</h3>
                <p className="text-white/60 text-xs mt-0.5 hidden sm:block">{cat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialSection({ heading, quote, name, role, initials }: {
  heading: string;
  quote: string;
  name: string;
  role: string;
  initials: string;
}) {
  return (
    <section className="py-16 lg:py-20" style={{ background: 'hsl(40 40% 97%)' }}>
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          custom={0}
          variants={fadeUp}
        >
          <span className="text-xs font-medium text-primary uppercase tracking-[0.15em]">Community</span>
          <h2 className="text-2xl md:text-3xl font-serif mt-3 tracking-tight">{heading}</h2>
        </motion.div>
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          custom={0.1}
          variants={fadeUp}
        >
          <div className="flex justify-center gap-1 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-lg md:text-xl font-serif italic text-foreground leading-relaxed px-4">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">{initials}</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">{name}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TipSection({ label, tips }: { label: string; tips: string[] }) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-6 max-w-2xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp}>
          <Card className="bg-primary/[0.03] border-primary/10 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="text-xs font-medium text-primary/70 mb-2 tracking-[0.12em] uppercase">{label}</h3>
              <RotatingTip tips={tips} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// Hero background style (warm layered gradients)
const heroBg = {
  background: `
    radial-gradient(ellipse 600px 400px at 15% 50%, hsl(20 70% 44% / 0.06), transparent),
    radial-gradient(ellipse 500px 350px at 85% 40%, hsl(35 85% 55% / 0.05), transparent),
    linear-gradient(to bottom, hsl(40 40% 97%), hsl(43 50% 99%))
  `,
};

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ── 1. Hero Welcome ─────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={heroBg} />
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="relative container mx-auto px-6 py-16 lg:py-24">
          <motion.div initial="hidden" animate="visible" className="max-w-2xl">
            <motion.h1
              custom={0}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-serif tracking-tight text-foreground"
            >
              Welcome back, {firstName}
            </motion.h1>
            <motion.p custom={0.1} variants={fadeUp} className="text-lg text-muted-foreground mt-4 max-w-lg leading-relaxed">
              Design something extraordinary. Let AI bring your vision to life and connect you with talented creators.
            </motion.p>
            <motion.div custom={0.2} variants={fadeUp} className="flex flex-wrap gap-3 mt-8">
              <Link to="/create-project">
                <Button variant="hero" size="lg" className="group shadow-md hover:shadow-lg transition-shadow">
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

      {/* ── 2. Stats ────────────────────────────────── */}
      <StatsRow stats={[
        { icon: Briefcase, label: 'Total Projects', value: animProjects },
        { icon: Clock, label: 'Offers Received', value: animOffers },
        { icon: Zap, label: 'Active Jobs', value: animActive },
      ]} />

      {/* ── 3. Continue / Recent Projects ───────────── */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-6">
          {lastProject && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              custom={0}
              variants={fadeUp}
              className="mb-10"
            >
              <h2 className="text-lg font-serif text-foreground mb-4">Continue where you left off</h2>
              <Link to={`/project/${lastProject.id}`}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 12px 40px -10px hsl(25 20% 15% / 0.12)' }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {lastProject.ai_concept && (
                          <div className="sm:w-56 h-40 sm:h-auto shrink-0 overflow-hidden">
                            <img src={lastProject.ai_concept} alt={lastProject.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-6 flex-1 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[lastProject.status] || 'bg-gray-100 text-gray-700'}`}>
                              {statusLabels[lastProject.status] || lastProject.status}
                            </span>
                            {lastProject.category && <span className="text-xs text-muted-foreground">{lastProject.category}</span>}
                          </div>
                          <h3 className="font-serif text-xl text-foreground mb-1">{lastProject.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{lastProject.description}</p>
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
                        <div className="hidden sm:flex items-center px-6">
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          )}

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="flex items-center justify-between mb-5"
          >
            <h2 className="text-lg font-serif text-foreground">Recent projects</h2>
            {projects.length > 0 && (
              <Link to="/dashboard" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>

          {recentProjects.length > 0 ? (
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={staggerContainer}
              className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {recentProjects.map((project) => (
                <motion.div key={project.id} variants={staggerItem}>
                  <Link to={`/project/${project.id}`}>
                    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                      <Card className="overflow-hidden h-full rounded-2xl hover:shadow-md transition-shadow duration-300 cursor-pointer group">
                        <div className="aspect-[16/9] overflow-hidden relative">
                          {project.ai_concept ? (
                            <img
                              src={project.ai_concept} alt={project.title} loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/[0.05] via-accent/[0.04] to-secondary flex items-center justify-center">
                              <Palette className="w-10 h-10 text-primary/20" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-serif text-white text-sm truncate drop-shadow-sm">{project.title}</h3>
                          </div>
                          <div className="absolute top-2.5 left-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm shadow-sm ${statusColors[project.status] || 'bg-gray-100 text-gray-700'}`}>
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
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                    <Card className="overflow-hidden h-full border-dashed rounded-2xl hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-pointer">
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[220px]">
                        <div className="w-12 h-12 rounded-xl bg-primary/[0.06] flex items-center justify-center mb-3">
                          <Plus className="w-5 h-5 text-primary/40" />
                        </div>
                        <h3 className="font-serif text-foreground">Start new project</h3>
                        <p className="text-xs text-muted-foreground mt-1">Describe your idea to AI</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Card className="border-dashed border-2 border-border/60 rounded-2xl">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-7 h-7 text-primary/40" />
                  </div>
                  <h3 className="font-serif text-xl mb-2">Your creative journey starts here</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Describe your dream product, let AI visualize it, and connect with talented creators.
                  </p>
                  <Link to="/create-project">
                    <Button variant="hero" size="lg" className="group shadow-md">
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

      {/* ── 4. How DEXO Works ───────────────────────── */}
      <HowItWorksSection
        steps={customerSteps}
        label="How it works"
        title="Three steps to your custom creation"
        subtitle="From idea to reality — DEXO makes custom design accessible to everyone."
      />

      {/* ── 5. Categories ───────────────────────────── */}
      <CategoriesSection />

      {/* ── 6. Testimonial ──────────────────────────── */}
      <TestimonialSection
        heading="Loved by creators & clients"
        quote="I described my dream wedding ring and within days had three talented jewelers competing for my project. The AI mockup made it so easy to communicate exactly what I wanted."
        name="Emma Rodriguez"
        role="Customer"
        initials="ER"
      />

      {/* ── 7. Tip ──────────────────────────────────── */}
      <TipSection label="Quick tip" tips={customerTips} />
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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ── 1. Hero Welcome ─────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={heroBg} />
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="relative container mx-auto px-6 py-16 lg:py-24">
          <motion.div initial="hidden" animate="visible" className="max-w-2xl">
            <motion.h1
              custom={0}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-serif tracking-tight text-foreground"
            >
              Welcome back, {firstName}
            </motion.h1>
            <motion.p custom={0.1} variants={fadeUp} className="text-lg text-muted-foreground mt-4 max-w-lg leading-relaxed">
              Discover new projects, connect with clients, and grow your creative business.
            </motion.p>
            <motion.div custom={0.2} variants={fadeUp} className="flex flex-wrap gap-3 mt-8">
              <Link to="/business">
                <Button variant="hero" size="lg" className="group shadow-md hover:shadow-lg transition-shadow">
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

      {/* ── 2. Stats ────────────────────────────────── */}
      <StatsRow stats={[
        { icon: Briefcase, label: 'Matched Projects', value: animMatched },
        { icon: Clock, label: 'Pending Offers', value: animPending },
        { icon: Zap, label: 'Active Jobs', value: animActive },
      ]} />

      {/* ── 3. Featured Project Requests ─────────────── */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="flex items-center justify-between mb-5"
          >
            <h2 className="text-lg font-serif text-foreground">New project requests</h2>
            {matchedProjects.length > 0 && (
              <Link to="/business" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>

          {matchedProjects.length > 0 ? (
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {matchedProjects.slice(0, 3).map((project) => (
                <motion.div key={project.id} variants={staggerItem}>
                  <Link to={`/business/request/${project.id}`}>
                    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                      <Card className="overflow-hidden rounded-2xl cursor-pointer hover:shadow-md transition-all duration-300 h-full group">
                        {project.ai_concept && (
                          <div className="aspect-[16/10] overflow-hidden relative">
                            <img
                              src={project.ai_concept} alt={project.title} loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                          </div>
                        )}
                        <CardContent className="p-5">
                          <h3 className="font-serif text-foreground truncate mb-1">{project.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{project.category}</span>
                            {project.budget_min != null && project.budget_max != null && (
                              <span className="text-xs font-medium text-primary">
                                ${project.budget_min.toLocaleString()}&ndash;${project.budget_max.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Card className="border-dashed border-2 border-border/60 rounded-2xl">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-6">
                    <Package className="w-7 h-7 text-primary/40" />
                  </div>
                  <h3 className="font-serif text-xl mb-2">No project requests yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    {business
                      ? 'New projects matching your categories will appear here. Check back soon!'
                      : 'Complete your profile to start receiving projects that match your skills.'}
                  </p>
                  {!business && (
                    <Link to="/profile">
                      <Button variant="warm" size="lg">Complete Your Profile</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Active conversations */}
          {acceptedOffers.length > 0 && (
            <motion.div className="mt-8" initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif text-foreground">Messages</h2>
                <Link to="/business/conversations" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <Link to="/business/conversations">
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-foreground font-medium">Active Conversations</h3>
                        <p className="text-sm text-muted-foreground">
                          {acceptedOffers.length} active project{acceptedOffers.length !== 1 ? 's' : ''} with messaging
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── 4. How DEXO Works ───────────────────────── */}
      <HowItWorksSection
        steps={creatorSteps}
        label="How it works"
        title="Your path to creative success"
        subtitle="Three simple steps to grow your business and connect with clients on DEXO."
      />

      {/* ── 5. Categories ───────────────────────────── */}
      <CategoriesSection />

      {/* ── 6. Testimonial ──────────────────────────── */}
      <TestimonialSection
        heading="Loved by creators & makers"
        quote="DEXO connects me with clients who actually match my craft. The AI-powered briefs save hours of back-and-forth communication."
        name="Sarah Chen"
        role="Jewelry Designer"
        initials="SC"
      />

      {/* ── 7. Profile Completion ───────────────────── */}
      {profileIncomplete && (
        <section className="py-12">
          <div className="container mx-auto px-6 max-w-2xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
              <Card className="rounded-2xl border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent overflow-hidden">
                <CardContent className="p-8 sm:flex sm:items-start sm:gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center shrink-0 mb-6 sm:mb-0">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-xl text-foreground mb-1.5">
                      {business ? 'Complete your creator profile' : 'Set up your creator profile'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      {business
                        ? 'Finish your profile to maximize project matches and stand out to clients.'
                        : 'Complete your profile to start receiving matched projects.'}
                    </p>
                    {business && (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${(profileScore / profileTotal) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                            />
                          </div>
                          <span className="text-xs font-medium text-primary">{profileScore}/{profileTotal}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-5">
                          {profileChecks.map((check, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + i * 0.08 }}
                              className="flex items-center gap-2"
                            >
                              {check.done ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
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
                      <Button variant="warm" size="default" className="group">
                        {business ? 'Complete Profile' : 'Get Started'}
                        <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── 8. Tip ──────────────────────────────────── */}
      <TipSection label="Creator tip" tips={creatorTips} />
    </>
  );
}

export default AuthenticatedHome;
