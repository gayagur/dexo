import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useOffers } from '@/hooks/useOffers';
import { useMessages } from '@/hooks/useMessages';
import { AppLayout } from '@/components/app/AppLayout';
import type { Project, Business } from '@/lib/database.types';
import {
  ArrowLeft, Send, DollarSign, Clock, Star, Check,
  Loader2, MessageSquare, Image as ImageIcon, Tag, Wallet, Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Status Config ──────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-muted/80', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
  sent: { label: 'Sent to designers', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  offers_received: { label: 'Offers received', bg: 'bg-accent/15', text: 'text-accent-foreground', dot: 'bg-accent' },
  in_progress: { label: 'In progress', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const [project, setProject] = useState<Project | null>(null);
  const [fetched, setFetched] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [completing, setCompleting] = useState(false);

  const loading = authLoading || (!fetched && !!user);

  const { offers, fetchOffersForProject } = useOffers(id);
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({});
  const { messages, sendMessage } = useMessages(id);

  // Smart scroll: track if user is near bottom
  const handleChatScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  }, []);

  // Auto-scroll only when near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch project
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

  // Fetch businesses for offers
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
        for (const biz of data as Business[]) map[biz.id] = biz;
        setBusinessMap(map);
      }
    };
    fetchBusinesses();
  }, [offers]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { error } = await sendMessage(newMessage, 'customer');
    if (!error) setNewMessage('');
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

    await supabase
      .from('projects')
      .update({ status: 'in_progress' })
      .eq('id', id);
    setProject(prev => prev ? { ...prev, status: 'in_progress' } : prev);

    toast({
      title: 'Offer accepted!',
      description: "The creator has been notified. They'll be in touch soon.",
    });
    fetchOffersForProject(id);
  };

  // ─── Loading / Not Found ──────────────────────────────────
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
          <Link to="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.draft;
  const acceptedOffer = offers.find(o => o.status === 'accepted');
  const hasChat = !!acceptedOffer;

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ═══ Main Column ═══ */}
          <div className="lg:col-span-2 space-y-8 animate-fade-in">
            {/* ─── Project Header ─── */}
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} mb-4`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>
              <h1 className="text-3xl md:text-4xl font-serif mb-3">{project.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">{project.description}</p>

              {project.status === 'in_progress' && (
                <Button onClick={handleMarkComplete} disabled={completing} className="mt-5 gap-2">
                  {completing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Completing...</>
                  ) : (
                    <><Check className="h-4 w-4" />Mark as Complete</>
                  )}
                </Button>
              )}
            </div>

            {/* ─── AI Concept Visual Anchor ─── */}
            {project.ai_concept && (
              <Card className="overflow-hidden">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.ai_concept}
                    alt="AI concept visualization"
                    className="w-full h-full object-cover"
                  />
                </div>
                {project.ai_brief && (
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">AI-Generated Brief</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{project.ai_brief}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* ─── Offers Section ─── */}
            {offers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl">Offers from Designers</h2>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {offers.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {offers.map((offer) => {
                    const business = businessMap[offer.business_id];
                    const isAccepted = offer.status === 'accepted';

                    return (
                      <Card
                        key={offer.id}
                        className={isAccepted ? 'ring-2 ring-primary/60 border-primary/20' : ''}
                      >
                        <CardContent className="p-5">
                          {/* Creator + Action */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-lg font-serif text-primary">
                                  {business?.name?.charAt(0) ?? '?'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{business?.name ?? 'Creator'}</h3>
                                {business && (
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                                    <span>{business.rating}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isAccepted ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                <Check className="w-4 h-4" />
                                Accepted
                              </div>
                            ) : (
                              <Button onClick={() => handleAcceptOffer(offer.id)} size="sm">
                                Accept Offer
                              </Button>
                            )}
                          </div>

                          {/* Price + Timeline */}
                          <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl mb-3">
                            <div className="flex items-center gap-2.5">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">Price</div>
                                <div className="text-sm font-semibold">${offer.price.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">Timeline</div>
                                <div className="text-sm font-semibold">{offer.timeline}</div>
                              </div>
                            </div>
                          </div>

                          {/* Note */}
                          <p className="text-sm text-muted-foreground leading-relaxed">{offer.note}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Chat Section ─── */}
            {hasChat && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/60 bg-muted/30">
                  <MessageSquare className="w-4.5 h-4.5 text-primary" />
                  <h2 className="font-semibold text-foreground">Messages</h2>
                  {messages.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col" style={{ maxHeight: '32rem' }}>
                  {/* Messages */}
                  <div ref={chatContainerRef} onScroll={handleChatScroll} className="space-y-3 flex-1 min-h-0 overflow-y-auto mb-4 scroll-smooth">
                    {messages.map((msg) => {
                      const isCustomer = msg.sender_type === 'customer';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              isCustomer
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted/70 text-foreground rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <span
                              className={`text-[11px] mt-1 block ${
                                isCustomer ? 'text-primary-foreground/60' : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {messages.length === 0 && (
                      <div className="text-center py-10">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No messages yet. Start the conversation!
                        </p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="flex gap-2.5">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="h-11"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* ═══ Sidebar ═══ */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Project Details */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-serif text-lg mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Category</span>
                      <p className="text-sm font-medium text-foreground">{project.category}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Wallet className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Budget</span>
                      <p className="text-sm font-medium text-foreground">
                        ${project.budget_min.toLocaleString()} – ${project.budget_max.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide ml-7">Style</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 ml-7">
                      {project.style_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(project.details as any)?.timing && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Timeline</span>
                        <p className="text-sm font-medium text-foreground">{(project.details as any).timing}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inspiration */}
            {project.inspiration_images.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-serif text-lg">Inspiration</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {project.inspiration_images.map((img, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default ProjectDetailPage;
