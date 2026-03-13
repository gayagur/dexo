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
  Loader2
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
