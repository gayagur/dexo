import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useOffers } from '@/hooks/useOffers';
import { useMessages } from '@/hooks/useMessages';
import type { Project, Business, Offer } from '@/lib/database.types';
import {
  ArrowLeft,
  Send,
  DollarSign,
  Clock,
  Star,
  Check,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [fetched, setFetched] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [completing, setCompleting] = useState(false);

  const loading = authLoading || (!fetched && !!user);

  // Offers for this project
  const { offers, loading: offersLoading, fetchOffersForProject } = useOffers(id);

  // Business info for each offer
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({});

  // Real-time messages
  const { messages, sendMessage } = useMessages(id);

  // Fetch the project — wait for auth first
  useEffect(() => {
    if (authLoading) return;
    if (!id || !user) { setFetched(true); return; }

    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[ProjectDetail] fetch error:', error.message);
        setProject(null);
      } else {
        setProject(data as Project);
      }
      setFetched(true);
    };
    fetchProject();
  }, [id, authLoading, user]);

  // Fetch business info for each offer
  useEffect(() => {
    if (offers.length === 0) return;
    const bizIds = [...new Set(offers.map(o => o.business_id))];
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .in('id', bizIds);
      if (data) {
        const map: Record<string, Business> = {};
        for (const biz of data as Business[]) {
          map[biz.id] = biz;
        }
        setBusinessMap(map);
      }
    };
    fetchBusinesses();
  }, [offers]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { error } = await sendMessage(newMessage, 'customer');
    if (!error) {
      setNewMessage('');
    }
  };

  const handleMarkComplete = async () => {
    if (!id) return;
    setCompleting(true);
    const { error } = await supabase
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setProject(prev => prev ? { ...prev, status: 'completed' } : prev);
      toast({ title: 'Project completed!', description: 'This project has been marked as finished.' });
    }
    setCompleting(false);
  };

  const handleAcceptOffer = async (offerId: string) => {
    const { error } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Transition project status: offers_received → in_progress
    await supabase
      .from('projects')
      .update({ status: 'in_progress' })
      .eq('id', id);
    setProject(prev => prev ? { ...prev, status: 'in_progress' } : prev);

    toast({
      title: "Offer accepted!",
      description: "The creator has been notified. They'll be in touch soon.",
    });
    // Refresh offers
    fetchOffersForProject(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4">Project not found</h1>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4">
                {project.status === 'offers_received' ? 'Offers received' : project.status.replace('_', ' ')}
              </div>
              <h1 className="text-3xl md:text-4xl font-serif mb-4">{project.title}</h1>
              <p className="text-lg text-muted-foreground">{project.description}</p>

              {project.status === 'in_progress' && (
                <Button onClick={handleMarkComplete} disabled={completing} className="mt-4">
                  {completing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Completing...</>
                  ) : (
                    <><Check className="mr-2 h-4 w-4" />Mark as Complete</>
                  )}
                </Button>
              )}
            </div>

            {/* AI Concept */}
            {project.ai_concept && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-serif text-xl mb-4">AI-Generated Concept</h2>
                  <div className="aspect-video rounded-xl overflow-hidden mb-4">
                    <img
                      src={project.ai_concept}
                      alt="AI concept visualization"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {project.ai_brief && (
                    <p className="text-muted-foreground">{project.ai_brief}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Offers */}
            {offers.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-serif text-xl">Offers from Creators</h2>
                {offers.map((offer) => {
                  const business = businessMap[offer.business_id];

                  return (
                    <Card key={offer.id} className={offer.status === 'accepted' ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xl font-serif text-primary">
                                {business?.name?.charAt(0) ?? '?'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium">{business?.name ?? 'Creator'}</h3>
                              {business && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Star className="w-4 h-4 fill-accent text-accent" />
                                  <span>{business.rating}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {offer.status === 'accepted' ? (
                            <div className="flex items-center gap-2 text-primary">
                              <Check className="w-5 h-5" />
                              <span className="font-medium">Accepted</span>
                            </div>
                          ) : (
                            <Button onClick={() => handleAcceptOffer(offer.id)}>
                              Accept Offer
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-secondary/30 rounded-xl">
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-primary" />
                            <div>
                              <div className="text-sm text-muted-foreground">Price</div>
                              <div className="font-medium">${offer.price.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <div>
                              <div className="text-sm text-muted-foreground">Timeline</div>
                              <div className="font-medium">{offer.timeline}</div>
                            </div>
                          </div>
                        </div>

                        <p className="mt-4 text-muted-foreground">{offer.note}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Chat — only show after an offer is accepted */}
            {offers.some(o => o.status === 'accepted') && <Card>
              <CardContent className="p-6">
                <h2 className="font-serif text-xl mb-4">Messages</h2>

                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary rounded-bl-md'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className={`text-xs mt-1 block ${
                          msg.sender_type === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="h-12"
                  />
                  <Button onClick={handleSendMessage} size="icon" className="h-12 w-12 shrink-0">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-serif text-lg mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Category</span>
                    <p className="font-medium">{project.category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Budget</span>
                    <p className="font-medium">${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Style</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {project.style_tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-secondary rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(project.details as any)?.timing && (
                    <div>
                      <span className="text-sm text-muted-foreground">Timeline</span>
                      <p className="font-medium">{(project.details as any).timing}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {project.inspiration_images.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif text-lg mb-4">Inspiration</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {project.inspiration_images.map((img, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetailPage;
