import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/app/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import type { Business, Project } from '@/lib/database.types';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Check,
  Clock3,
  DollarSign,
  Globe,
  Instagram,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  UserRound,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  fetchCreatorPublicProfile,
  type CreatorPublicProfile,
} from '@/lib/creatorPublicProfile';

const BusinessProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorPublicProfile | null>(null);
  const [fetched, setFetched] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    const loadCreatorProfile = async () => {
      if (!business?.user_id) {
        setCreatorProfile(null);
        setProfileFetched(true);
        return;
      }

      setProfileFetched(false);

      try {
        const data = await fetchCreatorPublicProfile(business.user_id);
        if (!cancelled) {
          setCreatorProfile(data);
        }
      } catch (err) {
        console.error('[BusinessProfile] public profile fetch error:', err);
        if (!cancelled) {
          setCreatorProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileFetched(true);
        }
      }
    };

    loadCreatorProfile();

    return () => {
      cancelled = true;
    };
  }, [business?.user_id]);

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

  const displayName = creatorProfile?.fullName || business.name;
  const displayBio = creatorProfile?.bio || business.description;
  const displayLocation = creatorProfile
    ? `${creatorProfile.city}, ${creatorProfile.country}`
    : business.location;
  const displayPortfolio = creatorProfile?.portfolioItems ?? [];
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const joinedLabel = creatorProfile
    ? new Date(creatorProfile.joinedAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : new Date(business.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/browse-businesses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Designers
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  <Avatar className="h-24 w-24 border border-border/60">
                    <AvatarImage src={creatorProfile?.profilePhotoUrl} alt={displayName} />
                    <AvatarFallback className="text-lg font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-4xl font-serif">{displayName}</h1>
                      {creatorProfile?.username && (
                        <span className="text-sm text-muted-foreground">
                          @{creatorProfile.username}
                        </span>
                      )}
                    </div>

                    {creatorProfile?.tagline && (
                      <p className="text-lg text-foreground/80 mb-4">
                        {creatorProfile.tagline}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-foreground font-medium">
                          {creatorProfile?.rating ?? business.rating}
                        </span>
                        <span>
                          ({creatorProfile?.reviewCount ?? 'New'} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{displayLocation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span>Joined {joinedLabel}</span>
                      </div>
                      {creatorProfile?.responseTime && (
                        <div className="flex items-center gap-2">
                          <Clock3 className="w-4 h-4" />
                          <span>{creatorProfile.responseTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {profileFetched && creatorProfile && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="text-sm text-muted-foreground mb-1">Specialization</div>
                      <div className="font-medium">{creatorProfile.specialization}</div>
                    </div>
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="text-sm text-muted-foreground mb-1">Experience</div>
                      <div className="font-medium">{creatorProfile.yearsExperience} years</div>
                    </div>
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="text-sm text-muted-foreground mb-1">Completed</div>
                      <div className="font-medium">
                        {creatorProfile.completedProjects} projects
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="text-sm text-muted-foreground mb-1">Availability</div>
                      <div className="font-medium">{creatorProfile.availability}</div>
                    </div>
                  </div>
                )}

                {!profileFetched && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-6">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading creator details...
                  </div>
                )}
              </CardContent>
            </Card>

            {creatorProfile && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-serif mb-4">Contact & Working Style</h2>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserRound className="w-4 h-4 text-muted-foreground" />
                        <span>{creatorProfile.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{creatorProfile.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Instagram className="w-4 h-4 text-muted-foreground" />
                        <span>{creatorProfile.instagram}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={creatorProfile.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {creatorProfile.website}
                        </a>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span>{creatorProfile.priceRangeLabel}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span>
                          Remote work: {creatorProfile.offersRemoteWork ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>
                          Travels to client: {creatorProfile.travelsToClient ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(creatorProfile?.skills?.length || business.styles.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-serif mb-4">Skills & Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {(creatorProfile?.skills ?? business.styles).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {business.styles.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-serif mb-4">Design Styles</h2>
                  <div className="flex flex-wrap gap-2">
                    {business.styles.map((style) => (
                      <span key={style} className="px-3 py-1 bg-accent/20 rounded-full text-sm">
                        {style}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {business.categories.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-serif mb-4">Specialties</h2>
                  <div className="flex flex-wrap gap-2">
                    {business.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-3 py-1 bg-secondary rounded-full text-sm"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-serif mb-4">About</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {displayBio}
                </p>
              </CardContent>
            </Card>

            {/* Portfolio */}
            {displayPortfolio.length > 0 ? (
              <div>
                <h2 className="text-xl font-serif mb-4">Portfolio</h2>
                <div className="grid md:grid-cols-2 gap-5">
                  {displayPortfolio.map((item) => (
                    <Card key={`${item.title}-${item.yearCompleted}`} className="overflow-hidden">
                      <div className="aspect-[4/3] bg-muted">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover object-center hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-medium text-lg leading-snug">{item.title}</h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {item.yearCompleted}
                          </span>
                        </div>
                        <div className="text-xs text-primary mb-3">{item.category}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : business.portfolio.length > 0 ? (
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
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                {creatorProfile?.priceRangeLabel ? (
                  <>
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <DollarSign className="w-5 h-5" />
                      {creatorProfile.priceRangeLabel}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Typical pricing for new projects
                    </p>
                  </>
                ) : business.min_price || business.max_price ? (
                  <>
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <DollarSign className="w-5 h-5" />
                      ${(business.min_price ?? 0).toLocaleString()} - ${(business.max_price ?? 0).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Typical price range for projects
                    </p>
                  </>
                ) : null}

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

            {creatorProfile && (
              <Card>
                <CardContent className="p-6 space-y-4 text-sm">
                  <h3 className="font-medium text-base">At a Glance</h3>
                  <div className="flex items-start gap-3">
                    <Star className="w-4 h-4 mt-0.5 text-amber-500 fill-amber-500" />
                    <div>
                      <div className="font-medium">{creatorProfile.rating.toFixed(1)} / 5.0</div>
                      <div className="text-muted-foreground">
                        {creatorProfile.reviewCount} verified reviews
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{creatorProfile.completedProjects} completed projects</div>
                      <div className="text-muted-foreground">{creatorProfile.availability}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock3 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{creatorProfile.responseTime}</div>
                      <div className="text-muted-foreground">Recent typical response time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="overflow-hidden">
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
                  <p className="text-sm font-medium text-foreground">Select a project:</p>
                  <div className="space-y-1.5 max-h-[30vh] overflow-y-auto -mx-1 px-1">
                    {userProjects.map((project) => {
                      const isSelected = selectedProjectId === project.id;
                      return (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left
                            outline-none transition-all duration-150
                            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                            ${isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border/60 hover:border-primary/40 hover:bg-accent/30'
                            }`}
                        >
                          <h4 className="flex-1 font-medium text-sm text-foreground">{project.title}</h4>
                          <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                            ${isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border/80'
                            }`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Textarea
                  placeholder="Write your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
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
        <DialogContent className="overflow-hidden">
          <DialogHeader>
            <DialogTitle>Send a Project to {business.name}</DialogTitle>
            <DialogDescription>
              Select one of your projects to share with this creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {userProjects.length > 0 ? (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto -mx-1 px-1">
                {userProjects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left
                        outline-none transition-all duration-150
                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                        ${isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/60 hover:border-primary/40 hover:bg-accent/30'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground leading-snug">
                          {project.title}
                        </h4>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            {project.description}
                          </p>
                        )}
                        {(project.budget_min || project.status) && (
                          <div className="flex items-center gap-3 mt-1.5">
                            {project.budget_min && (
                              <span className="text-xs text-muted-foreground">
                                ${project.budget_min.toLocaleString()}
                                {project.budget_max ? `–$${project.budget_max.toLocaleString()}` : '+'}
                              </span>
                            )}
                            {project.status && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/40 text-accent-foreground capitalize">
                                {project.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/80'
                        }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
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
              <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
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
