import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useMatchedProjects } from '@/hooks/useMatchedProjects';
import { useBusinessOffers } from '@/hooks/useOffers';
import { useCountUp } from '@/hooks/useCountUp';
import { AppLayout } from '@/components/app/AppLayout';
import { motion } from 'framer-motion';
import {
  Inbox,
  Send,
  MessageSquare,
  DollarSign,
  Clock,
  ArrowRight,
  Loader2,
  ClockIcon,
  Pencil,
  ShieldAlert,
  Sparkles,
  MapPin,
  Palette,
  Image,
  LucideIcon,
} from 'lucide-react';

// ── Animation variants ──────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Glassmorphism card style ────────────────────────────
const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  borderRadius: '16px',
};

// ── Mesh gradient background ────────────────────────────
const meshBackground: React.CSSProperties = {
  background: `
    radial-gradient(ellipse at 10% 20%, rgba(192, 86, 33, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 80%, rgba(192, 86, 33, 0.04) 0%, transparent 50%),
    #FDFCF8
  `,
};

// ── Skeleton Card ───────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl p-6 bg-white/50 animate-pulse" style={glassStyle}>
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
        <div className="h-7 w-14 bg-gray-300 rounded mb-2" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

const SkeletonProjectRow = () => (
  <div className="rounded-2xl p-6 bg-white/50 animate-pulse" style={glassStyle}>
    <div className="flex gap-6">
      <div className="w-48 h-36 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
        <div className="h-5 w-48 bg-gray-300 rounded mb-3" />
        <div className="h-3 w-full bg-gray-200 rounded mb-2" />
        <div className="h-3 w-3/4 bg-gray-200 rounded mb-6" />
        <div className="flex gap-4">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  </div>
);

// ── Count-up stat card ──────────────────────────────────
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  target: number;
  onClick: () => void;
}

const StatCard = ({ icon: Icon, label, target, onClick }: StatCardProps) => {
  const { value, ref } = useCountUp(target);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
      style={glassStyle}
    >
      <div className="flex items-center gap-4">
        {/* Icon with glow */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(192, 86, 33, 0.1)' }}
        >
          <Icon
            className="w-5 h-5"
            style={{
              color: '#C05621',
              filter: 'drop-shadow(0 0 8px rgba(192, 86, 33, 0.4))',
            }}
          />
        </div>
        <div>
          {/* Stat number with upgraded typography */}
          <div
            className="font-extrabold text-[#1a1a1a]"
            style={{
              fontSize: 'clamp(2rem, 3vw, 2.75rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
          {/* Stat label */}
          <div
            className="font-medium text-[#9ca3af] uppercase"
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
            }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Dynamic greeting ────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Empty state SVG illustration ────────────────────────
const EmptyStateIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="60" width="80" height="50" rx="4" stroke="#C05621" strokeWidth="2" strokeDasharray="4 2" opacity="0.4" />
    <path d="M10 60 L60 20 L110 60" stroke="#C05621" strokeWidth="2" opacity="0.4" />
    <rect x="48" y="80" width="24" height="30" rx="2" stroke="#C05621" strokeWidth="1.5" opacity="0.3" />
    <circle cx="90" cy="45" r="8" stroke="#C05621" strokeWidth="1.5" opacity="0.2" />
  </svg>
);

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════
const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { business, loading: bizLoading } = useBusinessProfile();
  const { scoredProjects, loading: projLoading } = useMatchedProjects();
  const { offers: sentOffers } = useBusinessOffers(business?.id);
  const [activeTab, setActiveTab] = useState(0);

  const loading = bizLoading || projLoading;

  // If no business profile yet, redirect to onboarding
  useEffect(() => {
    if (!bizLoading && !business) {
      navigate('/business/onboarding', { replace: true });
    }
  }, [bizLoading, business, navigate]);

  if (bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) return null;

  // ── Gate: show pending/rejected/suspended screen ──────
  if (business.status !== 'approved') {
    return (
      <AppLayout>
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="text-center">
            {/* Icon */}
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              business.status === 'pending'
                ? 'bg-amber-100 text-amber-600'
                : business.status === 'rejected'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {business.status === 'pending' && <ClockIcon className="w-10 h-10" />}
              {business.status === 'rejected' && <ShieldAlert className="w-10 h-10" />}
              {business.status === 'suspended' && <ShieldAlert className="w-10 h-10" />}
            </div>

            {/* Title & message */}
            {business.status === 'pending' && (
              <>
                <h1 className="text-3xl font-serif mb-3">Your profile is under review</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-2">
                  Thanks for joining DEXO! Our team is reviewing your profile and portfolio.
                  You'll receive a notification as soon as you're approved — usually within 24–48 hours.
                </p>
              </>
            )}
            {business.status === 'rejected' && (
              <>
                <h1 className="text-3xl font-serif mb-3">Profile changes requested</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-2">
                  Our team reviewed your profile and has some feedback. Please update your profile and we'll review it again.
                </p>
                {business.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-left mt-4 mb-2">
                    <p className="text-sm font-medium text-red-800 mb-1">Feedback from our team:</p>
                    <p className="text-sm text-red-700">{business.rejection_reason}</p>
                  </div>
                )}
              </>
            )}
            {business.status === 'suspended' && (
              <>
                <h1 className="text-3xl font-serif mb-3">Account suspended</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-2">
                  Your account has been suspended. Please contact support for more information.
                </p>
              </>
            )}
          </div>

          {/* Profile summary card */}
          <Card className="mt-8 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Portfolio thumbnail or placeholder */}
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {business.portfolio?.[0] ? (
                    <img loading="lazy" src={business.portfolio[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-serif truncate">{business.name}</h3>
                  {business.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {business.location}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                  business.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : business.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                  {business.status === 'pending' ? 'Under review' : business.status === 'rejected' ? 'Changes needed' : 'Suspended'}
                </span>
              </div>

              {/* Categories & styles */}
              {(business.categories?.length > 0 || business.styles?.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {business.categories?.map((cat: string) => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Palette className="w-3 h-3" />
                      {cat}
                    </span>
                  ))}
                  {business.styles?.map((style: string) => (
                    <span key={style} className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {style}
                    </span>
                  ))}
                </div>
              )}

              {/* Portfolio preview */}
              {business.portfolio?.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {business.portfolio.slice(0, 4).map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link to="/business/onboarding">
                <Pencil className="w-4 h-4 mr-2" />
                Edit my profile
              </Link>
            </Button>
          </div>

          {/* Tip */}
          {business.status === 'pending' && (
            <div className="mt-8 bg-secondary/50 rounded-xl px-5 py-4 text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                While you wait, make sure your portfolio looks its best!
              </p>
            </div>
          )}
        </main>
      </AppLayout>
    );
  }

  // ── Approved dashboard ────────────────────────────────
  const pendingRequests = scoredProjects.length;
  const dynamicSubtitle = pendingRequests > 0
    ? `You have ${pendingRequests} new ${pendingRequests === 1 ? 'inquiry' : 'inquiries'} waiting for your response.`
    : "Everything is up to date. Here's your overview for today.";

  const stats: StatCardProps[] = [
    {
      icon: Inbox,
      label: 'New Requests',
      target: scoredProjects.length,
      onClick: () => setActiveTab(0),
    },
    {
      icon: Send,
      label: 'Offers Sent',
      target: sentOffers.length,
      onClick: () => navigate('/business/offers'),
    },
    {
      icon: MessageSquare,
      label: 'Active Conversations',
      target: 0,
      onClick: () => navigate('/business/conversations'),
    },
  ];

  return (
    <AppLayout>
      <main className="min-h-screen" style={meshBackground}>
        <div className="container mx-auto px-6 py-10">
          {/* ── Hero with dynamic greeting ── */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1
              className="text-4xl font-serif mb-4"
              style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {getGreeting()}, {business.name?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {dynamicSubtitle}
            </p>
          </motion.div>

          {/* ── Stats with staggered animation ── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={itemVariants}>
                  <StatCard {...stat} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Section Tabs ── */}
          <div className="flex items-center gap-6 border-b border-border mb-8">
            {[
              { label: 'New Requests', path: null },
              { label: 'Offers Sent', path: '/business/offers' },
              { label: 'Conversations', path: '/business/conversations' },
            ].map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => tab.path ? navigate(tab.path) : setActiveTab(i)}
                className={`pb-4 text-sm font-medium transition-colors ${
                  i === activeTab && !tab.path
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Loading skeleton for projects ── */}
          {loading && (
            <div className="space-y-6">
              <SkeletonProjectRow />
              <SkeletonProjectRow />
              <SkeletonProjectRow />
            </div>
          )}

          {/* ── Projects Grid with staggered animation ── */}
          {!loading && scoredProjects.length > 0 && (
            <motion.div
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {scoredProjects.map(({ project, matchScore }) => (
                <motion.div key={project.id} variants={itemVariants}>
                  <Link to={`/business/request/${project.id}`}>
                    <div
                      className="overflow-hidden transition-all duration-200 hover:translate-x-1 hover:shadow-xl cursor-pointer"
                      style={glassStyle}
                    >
                      <div className="flex">
                        {/* Image */}
                        {project.ai_concept && (
                          <div className="w-48 h-48 shrink-0">
                            <img
                              src={project.ai_concept}
                              alt={project.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-xs font-medium uppercase"
                                  style={{
                                    color: '#C05621',
                                    letterSpacing: '0.08em',
                                  }}
                                >
                                  {project.category}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  matchScore >= 70
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : matchScore >= 40
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {matchScore}% match
                                </span>
                                {project.updated_at && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    Updated{' '}
                                    {(() => {
                                      const days = Math.floor(
                                        (Date.now() - new Date(project.updated_at!).getTime()) / (1000 * 60 * 60 * 24)
                                      );
                                      if (days === 0) return 'today';
                                      if (days === 1) return '1 day ago';
                                      return `${days} days ago`;
                                    })()}
                                  </span>
                                )}
                              </div>
                              <h3
                                className="text-xl font-serif mt-1 mb-2"
                                style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
                              >
                                {project.title}
                              </h3>
                              <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                                {project.ai_brief || project.description}
                              </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          </div>

                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="w-4 h-4" />
                              ${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {(project.details as Record<string, unknown>)?.timing as string || 'Flexible'}
                            </div>
                            <div className="flex gap-2">
                              {project.style_tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-secondary rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Upgraded empty state ── */}
          {!loading && scoredProjects.length === 0 && (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="mx-auto mb-6">
                <EmptyStateIllustration />
              </div>
              <h3
                className="text-xl font-serif mb-2"
                style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                Your first project is waiting to be discovered
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Projects matching your profile will appear here. Make sure your portfolio and categories are up to date.
              </p>
              <Button
                onClick={() => navigate('/business/onboarding')}
                style={{ background: '#C05621' }}
                className="hover:opacity-90 text-white"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Update my profile
              </Button>
            </motion.div>
          )}
        </div>
      </main>
    </AppLayout>
  );
};

export default BusinessDashboard;
