import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { supabase } from '@/lib/supabase';
import type { Message, Project } from '@/lib/database.types';
import {
  ArrowLeft,
  MessageSquare,
  LogOut,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface ConversationItem {
  project: Project;
  messages: Message[];
  lastMessage: Message;
}

const BusinessConversations = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { business } = useBusinessProfile();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;

    const fetchConversations = async () => {
      setLoading(true);

      // Get project IDs where this business has sent offers
      const { data: offerData } = await supabase
        .from('offers')
        .select('project_id')
        .eq('business_id', business.id);

      const projectIds = offerData?.map(o => o.project_id) ?? [];
      if (projectIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get messages for those projects
      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true });

      // Get the projects
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      const msgs = (msgData as Message[]) ?? [];
      const projs = (projData as Project[]) ?? [];

      // Only include projects that have messages
      const items: ConversationItem[] = [];
      for (const proj of projs) {
        const projMsgs = msgs.filter(m => m.project_id === proj.id);
        if (projMsgs.length > 0) {
          items.push({
            project: proj,
            messages: projMsgs,
            lastMessage: projMsgs[projMsgs.length - 1],
          });
        }
      }
      setConversations(items);
      setLoading(false);
    };

    fetchConversations();
  }, [business]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-serif font-semibold text-primary">DEXO</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{business?.name ?? ''}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/business')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-12">
          <h1 className="text-4xl font-serif mb-4">Active Conversations</h1>
          <p className="text-muted-foreground text-lg">
            All your ongoing project conversations in one place.
          </p>
        </div>

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {conversations.map(({ project, messages: projMsgs, lastMessage }) => (
              <Link key={project.id} to={`/business/request/${project.id}`}>
                <Card hover className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {project.ai_concept && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={project.ai_concept}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-lg mb-1">{project.title}</h3>
                        {lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {lastMessage.sender_type === 'business' ? 'You: ' : ''}{lastMessage.content}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm">{projMsgs.length}</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {conversations.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-serif mb-2">No conversations yet</h3>
                <p className="text-muted-foreground">
                  Start a conversation by responding to a matched request.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessConversations;
