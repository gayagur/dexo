import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BusinessDashboardLayout } from '@/components/business/BusinessDashboardLayout';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { supabase } from '@/lib/supabase';
import { timed } from '@/lib/timing';
import type { Message, Project } from '@/lib/database.types';
import {
  MessageSquare,
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
  const { business } = useBusinessProfile();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;

    const fetchConversations = async () => {
      setLoading(true);

      // Step 1: Get project IDs where this business has sent offers
      const { data: offerData } = await timed("conversations.offers", () =>
        supabase
          .from('offers')
          .select('project_id')
          .eq('business_id', business.id)
          .limit(100)
      );

      const projectIds = [...new Set(offerData?.map(o => o.project_id) ?? [])];
      if (projectIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch messages + projects in parallel (independent queries)
      const [{ data: msgData }, { data: projData }] = await Promise.all([
        timed("conversations.messages", () =>
          supabase
            .from('messages')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: true })
            .limit(500)
        ),
        timed("conversations.projects", () =>
          supabase
            .from('projects')
            .select('id, title, ai_concept, status, customer_id, category, created_at, description, style_tags, budget_min, budget_max, details, inspiration_images, ai_brief')
            .in('id', projectIds)
        ),
      ]);

      const msgs = (msgData as Message[]) ?? [];
      const projs = (projData as Project[]) ?? [];

      // Build a Map of project_id → messages[] for O(n+m) instead of O(n*m)
      const msgsByProject = new Map<string, Message[]>();
      for (const m of msgs) {
        const arr = msgsByProject.get(m.project_id);
        if (arr) arr.push(m);
        else msgsByProject.set(m.project_id, [m]);
      }

      const items: ConversationItem[] = [];
      for (const proj of projs) {
        const projMsgs = msgsByProject.get(proj.id);
        if (projMsgs && projMsgs.length > 0) {
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

  return (
    <BusinessDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">
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
      </div>
    </BusinessDashboardLayout>
  );
};

export default BusinessConversations;
