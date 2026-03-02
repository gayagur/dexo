import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useOffersForProjects } from '@/hooks/useOffers';
import {
  Plus,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Search,
  Loader2
} from 'lucide-react';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Clock },
  sent: { label: 'Sent to creators', color: 'bg-accent/20 text-accent-foreground', icon: Send },
  offers_received: { label: 'Offers received', color: 'bg-primary/10 text-primary', icon: MessageSquare },
  in_progress: { label: 'In progress', color: 'bg-accent/30 text-accent-foreground', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { projects, loading } = useProjects();
  const { offerCounts } = useOffersForProjects(projects.map(p => p.id));

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-serif font-semibold text-primary">DEXO</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {userName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif mb-4">Your Projects</h1>
          <p className="text-muted-foreground text-lg">
            Manage your custom creation projects and connect with creators.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link to="/create-project">
            <Card hover className="h-full bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif mb-1">Start a new project</h2>
                    <p className="text-muted-foreground">
                      Describe your idea and get matched with creators.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/browse-businesses">
            <Card hover className="h-full bg-gradient-to-br from-accent/5 to-secondary/5 border-accent/20">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <Search className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif mb-1">Find creators</h2>
                    <p className="text-muted-foreground">
                      Browse and connect directly with talented creators.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-accent-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your projects...</p>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const status = statusConfig[project.status];
              const StatusIcon = status.icon;
              const count = offerCounts[project.id] || 0;

              return (
                <Link key={project.id} to={`/project/${project.id}`}>
                  <Card hover className="h-full">
                    {/* Project Image */}
                    {project.ai_concept && (
                      <div className="aspect-video overflow-hidden rounded-t-2xl">
                        <img
                          src={project.ai_concept}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </div>

                      <h3 className="text-xl font-serif mb-2">{project.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                        {project.description}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          ${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}
                        </span>
                        {count > 0 && (
                          <span className="text-primary font-medium">
                            {count} offer{count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your first project and bring your ideas to life.
            </p>
            <Link to="/create-project">
              <Button>Create Your First Project</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
