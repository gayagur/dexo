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
  Palette, Users, Star,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ── Animation variant ──────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut', delay },
  }),
};

// ── Status badge styling ───────────────────────────────────
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

// ── Compact How-It-Works steps ─────────────────────────────
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

// ── Contextual tips ────────────────────────────────────────
const customerTips = [
  "Add reference images to help creators understand your vision better.",
  "The more details in your brief, the better offers you'll receive.",
  "Compare multiple offers before choosing — quality matters more than speed.",
];

const creatorTips = [
  "Complete your profile to get better project matches.",
  "Respond quickly to new projects for a competitive edge.",
  "Portfolio images dramatically increase your offer acceptance rate.",
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
      {isCreator ? (
        <CreatorHome firstName={firstName} />
      ) : (
        <CustomerHome firstName={firstName} />
      )}
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

  const tipIndex = new Date().getDate() % customerTips.length;

  // Status summary
  const parts: string[] = [];
  if (projects.length > 0) parts.push(`${projects.length} project${projects.length !== 1 ? 's' : ''}`);
  if (totalOffers > 0) parts.push(`${totalOffers} offer${totalOffers !== 1 ? 's' : ''} received`);
  if (activeCount > 0) parts.push(`${activeCount} active`);
  const statusSummary = parts.length > 0 ? parts.join(' \u00B7 ') : 'Ready to start your first project?';

  return (
    <>
      {/* ── Command Center Band ── */}
      <section className="border-b border-border/60">
        <div className="container mx-auto px-6 py-8 lg:py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <motion.div custom={0} variants={fadeUp}>
              <h1 className="text-2xl md:text-3xl font-serif text-foreground">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm">{statusSummary}</p>
            </motion.div>

            <motion.div custom={0.1} variants={fadeUp} className="flex items-center gap-3">
              <Link to="/create-project">
                <Button variant="hero" size="lg" className="group">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
              <Link to="/browse-businesses">
                <Button variant="outline" size="lg">Browse Creators</Button>
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
                <motion.section initial="hidden" animate="visible" custom={0.15} variants={fadeUp}>
                  <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                    Continue where you left off
                  </h2>
                  <Link to={`/project/${lastProject.id}`}>
                    <Card hover className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          {lastProject.ai_concept && (
                            <div className="sm:w-48 h-32 sm:h-auto shrink-0">
                              <img
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
                            <h3 className="font-serif text-xl font-semibold text-foreground mb-1">
                              {lastProject.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {lastProject.description}
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center px-5">
                            <ArrowRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.section>
              )}

              {/* Recent Projects */}
              <motion.section initial="hidden" animate="visible" custom={0.25} variants={fadeUp}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-serif font-semibold text-foreground">Recent projects</h2>
                  {projects.length > 0 && (
                    <Link
                      to="/dashboard"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {recentProjects.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recentProjects.map((project) => (
                      <Link key={project.id} to={`/project/${project.id}`}>
                        <Card hover className="overflow-hidden h-full">
                          {project.ai_concept && (
                            <div className="aspect-[16/9] overflow-hidden">
                              <img
                                src={project.ai_concept}
                                alt={project.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  statusColors[project.status] || 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {statusLabels[project.status] || project.status}
                              </span>
                              {offerCounts[project.id] > 0 && (
                                <span className="text-xs text-amber-600 font-medium">
                                  {offerCounts[project.id]} offer{offerCounts[project.id] !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <h3 className="font-serif font-semibold text-foreground truncate">
                              {project.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">{project.category}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}

                    {/* New project card */}
                    <Link to="/create-project">
                      <Card className="overflow-hidden h-full border-dashed hover:border-primary/30 transition-colors group">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[180px]">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                            <Plus className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-serif font-semibold text-foreground">Start new project</h3>
                          <p className="text-xs text-muted-foreground mt-1">Describe your idea to AI</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-serif text-lg font-semibold mb-2">
                        Your creative journey starts here
                      </h3>
                      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                        Describe your idea, let AI visualize it, and connect with talented creators.
                      </p>
                      <Link to="/create-project">
                        <Button variant="hero" size="lg" className="group">
                          Start Your First Project
                          <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </motion.section>
            </div>

            {/* Right Column (1/3) */}
            <div className="space-y-6">
              {/* How DEXO Works — Compact */}
              <motion.div initial="hidden" animate="visible" custom={0.2} variants={fadeUp}>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-serif font-semibold text-foreground mb-4">
                      How DEXO works for you
                    </h3>
                    <div className="space-y-4">
                      {customerSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <step.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{step.title}</div>
                            <div className="text-xs text-muted-foreground">{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tip Card */}
              <motion.div initial="hidden" animate="visible" custom={0.3} variants={fadeUp}>
                <Card className="bg-primary/[0.03] border-primary/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Quick Tip</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {customerTips[tipIndex]}
                    </p>
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
  const tipIndex = new Date().getDate() % creatorTips.length;

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
      <section className="border-b border-border/60">
        <div className="container mx-auto px-6 py-8 lg:py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <motion.div custom={0} variants={fadeUp}>
              <h1 className="text-2xl md:text-3xl font-serif text-foreground">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm">{statusSummary}</p>
            </motion.div>

            <motion.div custom={0.1} variants={fadeUp} className="flex items-center gap-3">
              <Link to="/business">
                <Button variant="hero" size="lg" className="group">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Projects
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="lg">Edit Profile</Button>
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
              <motion.div initial="hidden" animate="visible" className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: FolderOpen, label: 'Matched Projects', value: matchedProjects.length, color: 'text-blue-600 bg-blue-50' },
                  { icon: Send, label: 'Pending Offers', value: pendingOffers.length, color: 'text-amber-600 bg-amber-50' },
                  { icon: MessageSquare, label: 'Active Jobs', value: acceptedOffers.length, color: 'text-green-600 bg-green-50' },
                ].map((stat, i) => (
                  <motion.div key={stat.label} custom={i * 0.08} variants={fadeUp}>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}
                        >
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-2xl font-serif font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* New Project Requests */}
              <motion.section initial="hidden" animate="visible" custom={0.25} variants={fadeUp}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-serif font-semibold text-foreground">
                    New project requests
                  </h2>
                  {matchedProjects.length > 0 && (
                    <Link
                      to="/business"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {matchedProjects.length > 0 ? (
                  <div className="space-y-3">
                    {matchedProjects.slice(0, 3).map((project) => (
                      <Link key={project.id} to={`/business/request/${project.id}`}>
                        <Card hover className="overflow-hidden">
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
                              <h3 className="font-serif font-semibold text-foreground truncate">
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
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-serif font-semibold mb-1.5">No matched projects yet</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {business
                          ? 'New projects matching your categories will appear here.'
                          : 'Complete your profile to start receiving matched projects.'}
                      </p>
                      {!business && (
                        <Link to="/profile" className="mt-4 inline-block">
                          <Button variant="warm" size="default">Set Up Profile</Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.section>

              {/* Active Conversations */}
              {acceptedOffers.length > 0 && (
                <motion.section initial="hidden" animate="visible" custom={0.35} variants={fadeUp}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-serif font-semibold text-foreground">Messages</h2>
                    <Link
                      to="/business/conversations"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <Link to="/business/conversations">
                    <Card hover>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">Active Conversations</h3>
                          <p className="text-sm text-muted-foreground">
                            {acceptedOffers.length} active project{acceptedOffers.length !== 1 ? 's' : ''} with
                            messaging
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.section>
              )}
            </div>

            {/* Right Column (1/3) */}
            <div className="space-y-6">
              {/* How DEXO Works — Compact */}
              <motion.div initial="hidden" animate="visible" custom={0.2} variants={fadeUp}>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-serif font-semibold text-foreground mb-4">
                      How DEXO works for creators
                    </h3>
                    <div className="space-y-4">
                      {creatorSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <step.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{step.title}</div>
                            <div className="text-xs text-muted-foreground">{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Profile Strength Card */}
              {business && (
                <motion.div initial="hidden" animate="visible" custom={0.3} variants={fadeUp}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Profile Strength</h3>
                        <span className="text-xs font-medium text-primary">
                          {profileScore}/{profileTotal}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${(profileScore / profileTotal) * 100}%` }}
                        />
                      </div>
                      <div className="space-y-2.5">
                        {profileChecks.map((check, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            {check.done ? (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                            )}
                            <span className={`text-sm ${check.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {check.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {profileScore < profileTotal && (
                        <Link to="/profile" className="mt-4 block">
                          <Button variant="soft" size="sm" className="w-full">
                            Complete Profile
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* No profile CTA */}
              {!business && !loading && (
                <motion.div initial="hidden" animate="visible" custom={0.3} variants={fadeUp}>
                  <Card className="border-dashed border-primary/20 bg-primary/[0.02]">
                    <CardContent className="p-5 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-serif font-semibold mb-1.5">Set up your creator profile</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Complete your profile to start receiving matched projects.
                      </p>
                      <Link to="/profile">
                        <Button variant="warm" size="default" className="w-full group">
                          Get Started
                          <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Tip Card */}
              <motion.div initial="hidden" animate="visible" custom={0.35} variants={fadeUp}>
                <Card className="bg-primary/[0.03] border-primary/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Quick Tip</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{creatorTips[tipIndex]}</p>
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
