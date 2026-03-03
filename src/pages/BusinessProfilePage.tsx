import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/app/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import type { Business, Project } from '@/lib/database.types';
import {
  ArrowLeft,
  Star,
  MapPin,
  MessageSquare,
  Send,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const BusinessProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [fetched, setFetched] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  const loading = authLoading || (!fetched && !!user);

  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // For sending messages to a selected project
  const { sendMessage } = useMessages(selectedProjectId ?? undefined);

  // Fetch business — wait for auth first
  useEffect(() => {
    if (authLoading) return;
    if (!id || !user) { setFetched(true); return; }

    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('[BusinessProfile] fetch error:', error.message);
          setBusiness(null);
        } else {
          setBusiness(data as Business);
        }
      } catch (err) {
        console.error('[BusinessProfile] unexpected error:', err);
      } finally {
        setFetched(true);
      }
    };
    fetchBusiness();
  }, [id, authLoading, user]);

  // Fetch user's projects for "Send a Project" dialog
  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setUserProjects((data as Project[]) ?? []);
    };
    fetchProjects();
  }, [user]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !selectedProjectId) return;

    const { error } = await sendMessage(messageContent, 'customer');
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }

    toast({
      title: "Message sent!",
      description: `Your message has been sent to ${business?.name}.`,
    });

    setMessageContent('');
    setShowMessageDialog(false);
  };

  const handleSendProject = () => {
    if (!selectedProjectId) return;

    toast({
      title: "Project sent!",
      description: `Your project has been sent to ${business?.name} for review.`,
    });

    setSelectedProjectId(null);
    setShowProjectDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4">Business not found</h1>
          <Button onClick={() => navigate('/browse-businesses')}>
            Browse Creators
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/browse-businesses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Creators
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-serif mb-4">{business.name}</h1>
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-medium text-foreground">{business.rating}</span>
                  <span>rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{business.location}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-serif mb-4">About</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {business.description}
                </p>
              </CardContent>
            </Card>

            {/* Portfolio */}
            {business.portfolio.length > 0 && (
              <div>
                <h2 className="text-xl font-serif mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {business.portfolio.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                      <img
                        src={img}
                        alt={`${business.name} portfolio ${i + 1}`}
                        className="w-full h-full object-cover object-center hover:scale-105 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Styles */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">Styles</h3>
                <div className="flex flex-wrap gap-2">
                  {business.styles.map((style) => (
                    <span key={style} className="px-3 py-1 bg-accent/20 rounded-full text-sm">
                      {style}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                {(business.min_price || business.max_price) && (
                  <>
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <DollarSign className="w-5 h-5" />
                      ${(business.min_price ?? 0).toLocaleString()} - ${(business.max_price ?? 0).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Typical price range for projects
                    </p>
                  </>
                )}

                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full gap-2"
                    onClick={() => setShowMessageDialog(true)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowProjectDialog(true)}
                  >
                    <Send className="w-4 h-4" />
                    Send a Project
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {business.categories.map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {business.name}</DialogTitle>
            <DialogDescription>
              Select a project and write your message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {userProjects.length > 0 ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select a project:</p>
                  {userProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
                        selectedProjectId === project.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <h4 className="font-medium text-sm">{project.title}</h4>
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Write your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!messageContent.trim() || !selectedProjectId}>
                    Send Message
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Create a project first to message this creator.
                </p>
                <Button onClick={() => navigate('/create-project')}>
                  Create a Project
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a Project to {business.name}</DialogTitle>
            <DialogDescription>
              Select one of your projects to share with this creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {userProjects.length > 0 ? (
              <div className="space-y-2">
                {userProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                      selectedProjectId === project.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-medium">{project.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You don't have any projects yet.
                </p>
                <Button onClick={() => navigate('/create-project')}>
                  Create a Project
                </Button>
              </div>
            )}
            {userProjects.length > 0 && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendProject} disabled={!selectedProjectId}>
                  Send Project
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default BusinessProfilePage;
