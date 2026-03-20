import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { BusinessDashboardLayout } from '@/components/business/BusinessDashboardLayout';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useBusinessOffers } from '@/hooks/useOffers';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/database.types';
import {
  Send,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pending', icon: HelpCircle, color: 'text-amber-600 bg-amber-50' },
  accepted: { label: 'Accepted', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

const BusinessOffersSent = () => {
  const navigate = useNavigate();
  const { business, loading: bizLoading } = useBusinessProfile();
  const { offers: sentOffers, loading: offersLoading } = useBusinessOffers(business?.id);
  const [projects, setProjects] = useState<Record<string, Project>>({});

  const loading = bizLoading || offersLoading;

  // Fetch projects for the offers
  useEffect(() => {
    if (sentOffers.length === 0) return;
    const projectIds = [...new Set(sentOffers.map(o => o.project_id))];

    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      if (data) {
        const map: Record<string, Project> = {};
        for (const p of data as Project[]) {
          map[p.id] = p;
        }
        setProjects(map);
      }
    };
    fetchProjects();
  }, [sentOffers]);

  return (
    <BusinessDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Offers Sent</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track the status of your proposals.
          </p>
        </div>

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading offers...</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {sentOffers.map((offer) => {
              const project = projects[offer.project_id];
              const status = statusConfig[offer.status];
              const StatusIcon = status.icon;

              return (
                <Link key={offer.id} to={`/business/request/${offer.project_id}`}>
                  <Card hover className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {project?.ai_concept && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                            <img
                              src={project.ai_concept}
                              alt={project.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-serif text-lg">{project?.title || 'Project'}</h3>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-sm mb-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="w-4 h-4" />
                              ${offer.price.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {offer.timeline}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {offer.note}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {sentOffers.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                  <Send className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-serif mb-2">No offers sent yet</h3>
                <p className="text-muted-foreground mb-6">
                  Browse matching requests and send your first proposal.
                </p>
                <Button onClick={() => navigate('/business')}>
                  View Requests
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </BusinessDashboardLayout>
  );
};

export default BusinessOffersSent;
