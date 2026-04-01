import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useMatchedProjects } from '@/hooks/useMatchedProjects';
import { useBusinessOffers } from '@/hooks/useOffers';
import { AppLayout } from '@/components/app/AppLayout';
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
} from 'lucide-react';

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
                  {business.categories?.map((cat) => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Palette className="w-3 h-3" />
                      {cat}
                    </span>
                  ))}
                  {business.styles?.map((style) => (
                    <span key={style} className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {style}
                    </span>
                  ))}
                </div>
              )}

              {/* Portfolio preview */}
              {business.portfolio?.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {business.portfolio.slice(0, 4).map((img, i) => (
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

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif mb-4">Welcome back</h1>
          <p className="text-muted-foreground text-lg">
            Here are the projects that match your profile.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {[
            { icon: Inbox, label: 'New Requests', value: scoredProjects.length, path: null, tabIndex: 0 },
            { icon: Send, label: 'Offers Sent', value: sentOffers.length, path: '/business/offers' },
            { icon: MessageSquare, label: 'Active Conversations', value: 0, path: '/business/conversations' },
          ].map((stat, i) => (
            <Card
              key={i}
              hover
              className="cursor-pointer"
              onClick={() => stat.path ? navigate(stat.path) : setActiveTab(stat.tabIndex ?? 0)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-serif">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section Tabs */}
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

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && (
          <div className="space-y-6">
            {scoredProjects.map(({ project, matchScore }) => (
              <Link key={project.id} to={`/business/request/${project.id}`}>
                <Card hover className="overflow-hidden">
                  <CardContent className="p-0">
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
                              <span className="text-xs text-primary font-medium uppercase tracking-wider">
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
                            <h3 className="text-xl font-serif mt-1 mb-2">{project.title}</h3>
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
                            {(project.details as any)?.timing || 'Flexible'}
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && scoredProjects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif mb-2">No requests yet</h3>
            <p className="text-muted-foreground">
              Projects matching your profile will appear here.
            </p>
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default BusinessDashboard;
