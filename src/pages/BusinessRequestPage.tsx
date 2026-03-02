import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useBusinessOffers } from '@/hooks/useOffers';
import { useMessages } from '@/hooks/useMessages';
import type { Project } from '@/lib/database.types';
import {
  ArrowLeft,
  Send,
  DollarSign,
  Clock,
  Sparkles,
  Check,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BusinessRequestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { business } = useBusinessProfile();
  const { offers, createOffer } = useBusinessOffers(business?.id);
  const { messages, sendMessage } = useMessages(id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offerData, setOfferData] = useState({
    price: '',
    timeline: '',
    note: '',
  });
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch the project
  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[BusinessRequestPage] fetch project error:', error.message);
      }
      setProject((data as Project) ?? null);
      setLoading(false);
    };
    fetchProject();
  }, [id]);

  const existingOffer = offers.find(o => o.project_id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4">Project not found</h1>
          <Link to="/business">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSendOffer = async () => {
    if (!business) return;
    setSubmittingOffer(true);

    const { error } = await createOffer({
      project_id: project.id,
      business_id: business.id,
      price: parseInt(offerData.price) || 0,
      timeline: offerData.timeline,
      note: offerData.note,
      status: 'pending',
    });

    if (error) {
      toast({ title: "Failed to send offer", description: error, variant: "destructive" });
    } else {
      toast({
        title: "Offer sent!",
        description: "The customer has been notified of your offer.",
      });
      setShowOfferForm(false);
    }
    setSubmittingOffer(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { error } = await sendMessage(newMessage, 'business');
    if (error) {
      toast({ title: "Failed to send message", description: error, variant: "destructive" });
    }
    setNewMessage('');
  };

  const details = project.details as Record<string, any>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link to="/business" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to requests
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Why Matched */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm">
              <Sparkles className="w-4 h-4 inline mr-2 text-primary" />
              You're seeing this project because it fits your profile: {project.category}, {project.style_tags.slice(0, 2).join(', ')}
            </div>

            {/* Project Header */}
            <div>
              <span className="text-xs text-primary font-medium uppercase tracking-wider">
                {project.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-serif mt-2 mb-4">{project.title}</h1>
              <p className="text-lg text-muted-foreground">{project.description}</p>
            </div>

            {/* AI Concept */}
            {project.ai_concept && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-serif text-xl mb-4">AI-Generated Brief</h2>
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

            {/* AI Brief (if no concept image) */}
            {!project.ai_concept && project.ai_brief && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-serif text-xl mb-4">AI-Generated Brief</h2>
                  <p className="text-muted-foreground">{project.ai_brief}</p>
                </CardContent>
              </Card>
            )}

            {/* Offer Section */}
            {existingOffer ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary mb-4">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">You've sent an offer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Your price</div>
                        <div className="font-medium">${existingOffer.price.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Timeline</div>
                        <div className="font-medium">{existingOffer.timeline}</div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-muted-foreground">{existingOffer.note}</p>
                  <div className="mt-4 text-sm">
                    Status: <span className="font-medium capitalize">{existingOffer.status}</span>
                  </div>
                </CardContent>
              </Card>
            ) : showOfferForm ? (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-serif text-xl">Send an Offer</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Your Price ($)</Label>
                      <Input
                        type="number"
                        placeholder="2000"
                        value={offerData.price}
                        onChange={(e) => setOfferData({ ...offerData, price: e.target.value })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timeline</Label>
                      <Input
                        placeholder="e.g., 6-8 weeks"
                        value={offerData.timeline}
                        onChange={(e) => setOfferData({ ...offerData, timeline: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Personal Note</Label>
                    <Textarea
                      placeholder="Introduce yourself and explain why you'd be great for this project..."
                      value={offerData.note}
                      onChange={(e) => setOfferData({ ...offerData, note: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setShowOfferForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendOffer}
                      disabled={!offerData.price || !offerData.timeline || submittingOffer}
                    >
                      {submittingOffer ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                      ) : (
                        'Send Offer'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg mb-1">Interested in this project?</h3>
                    <p className="text-sm text-muted-foreground">
                      Send an offer with your pricing and timeline.
                    </p>
                  </div>
                  <Button onClick={() => setShowOfferForm(true)}>
                    Send Offer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Chat */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col" style={{ maxHeight: 500 }}>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-serif text-lg leading-tight">Chat with Customer</h2>
                  <span className="text-xs text-muted-foreground">Ask about project details</span>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map((msg) => {
                  const isMine = msg.sender_type === 'business';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 animate-in fade-in duration-300 ${isMine ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium ${
                          isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isMine ? (business?.name?.charAt(0) ?? 'B') : 'C'}
                      </div>
                      {/* Bubble */}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary text-foreground rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <span className={`text-[10px] mt-1 block ${
                          isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Start the conversation — ask about the project details
                    </p>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="px-4 py-3 border-t border-border flex items-center gap-3">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="h-12 flex-1"
                />
                <button
                  onClick={handleSendMessage}
                  className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-50"
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-serif text-lg mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Budget</span>
                    <p className="font-medium text-lg">${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Timeline</span>
                    <p className="font-medium">{details?.timing || 'Flexible'}</p>
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
                  {details?.size && (
                    <div>
                      <span className="text-sm text-muted-foreground">Size</span>
                      <p className="font-medium">{details.size}</p>
                    </div>
                  )}
                  {details?.materials && details.materials.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Materials</span>
                      <p className="font-medium">{details.materials.join(', ')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {project.inspiration_images.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif text-lg mb-4">Customer's Inspiration</h3>
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

export default BusinessRequestPage;
