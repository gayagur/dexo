import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/app/AppLayout";
import { MessageSquare, ArrowRight, Loader2, Search, Inbox } from "lucide-react";
import { fadeUpVariants, staggerContainerVariants } from "@/lib/animations";

interface ConversationThread {
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderIsMe: boolean;
  messageCount: number;
  unread: boolean; // simplified — mark as unread if last sender is not me
}

export default function InboxPage() {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, activeRole]);

  async function loadConversations() {
    if (!user) return;
    setLoading(true);

    try {
      if (activeRole === "business") {
        // Business: find all projects where I have offers or messages
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) { setLoading(false); return; }

        // Get projects I've interacted with (via offers)
        const { data: offers } = await supabase
          .from("offers")
          .select("project_id")
          .eq("business_id", business.id);

        const projectIds = [...new Set((offers ?? []).map(o => o.project_id))];
        if (projectIds.length === 0) { setThreads([]); setLoading(false); return; }

        // Get projects + their messages
        const { data: projects } = await supabase
          .from("projects")
          .select("id, title, status, customer_id")
          .in("id", projectIds);

        const { data: messages } = await supabase
          .from("messages")
          .select("id, project_id, sender_id, sender_type, content, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        // Get customer profiles for display
        const customerIds = [...new Set((projects ?? []).map(p => p.customer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", customerIds);

        const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
        const msgByProject = new Map<string, typeof messages>();
        for (const msg of (messages ?? [])) {
          if (!msgByProject.has(msg.project_id)) msgByProject.set(msg.project_id, []);
          msgByProject.get(msg.project_id)!.push(msg);
        }

        const convos: ConversationThread[] = [];
        for (const project of (projects ?? [])) {
          const msgs = msgByProject.get(project.id) ?? [];
          if (msgs.length === 0) continue;
          const last = msgs[0];
          const customer = profileMap.get(project.customer_id);

          convos.push({
            projectId: project.id,
            projectTitle: project.title,
            projectStatus: project.status,
            otherUserName: customer?.name ?? "Customer",
            otherUserAvatar: customer?.avatar_url ?? null,
            lastMessage: last.content,
            lastMessageAt: last.created_at,
            lastSenderIsMe: last.sender_type === "business",
            messageCount: msgs.length,
            unread: last.sender_type !== "business",
          });
        }

        convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setThreads(convos);
      } else {
        // Customer: find all my projects with messages
        const { data: projects } = await supabase
          .from("projects")
          .select("id, title, status")
          .eq("customer_id", user.id);

        const projectIds = (projects ?? []).map(p => p.id);
        if (projectIds.length === 0) { setThreads([]); setLoading(false); return; }

        const { data: messages } = await supabase
          .from("messages")
          .select("id, project_id, sender_id, sender_type, content, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        // Get business sender profiles
        const businessSenderIds = [...new Set((messages ?? []).filter(m => m.sender_type === "business").map(m => m.sender_id))];
        const { data: bizProfiles } = businessSenderIds.length > 0
          ? await supabase.from("profiles").select("id, name, avatar_url").in("id", businessSenderIds)
          : { data: [] };

        const profileMap = new Map((bizProfiles ?? []).map(p => [p.id, p]));
        const msgByProject = new Map<string, typeof messages>();
        for (const msg of (messages ?? [])) {
          if (!msgByProject.has(msg.project_id)) msgByProject.set(msg.project_id, []);
          msgByProject.get(msg.project_id)!.push(msg);
        }

        const convos: ConversationThread[] = [];
        for (const project of (projects ?? [])) {
          const msgs = msgByProject.get(project.id) ?? [];
          if (msgs.length === 0) continue;
          const last = msgs[0];
          const bizSender = msgs.find(m => m.sender_type === "business");
          const bizProfile = bizSender ? profileMap.get(bizSender.sender_id) : null;

          convos.push({
            projectId: project.id,
            projectTitle: project.title,
            projectStatus: project.status,
            otherUserName: bizProfile?.name ?? "Designer",
            otherUserAvatar: bizProfile?.avatar_url ?? null,
            lastMessage: last.content,
            lastMessageAt: last.created_at,
            lastSenderIsMe: last.sender_type === "customer",
            messageCount: msgs.length,
            unread: last.sender_type !== "customer",
          });
        }

        convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setThreads(convos);
      }
    } catch (err) {
      console.error("[Inbox] Error:", err);
    }

    setLoading(false);
  }

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t =>
      t.otherUserName.toLowerCase().includes(q) ||
      t.projectTitle.toLowerCase().includes(q) ||
      t.lastMessage.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const unreadCount = threads.filter(t => t.unread).length;

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }

  const projectPath = (projectId: string) =>
    activeRole === "business" ? `/business/request/${projectId}` : `/project/${projectId}`;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-[#C05621] mt-0.5">{unreadCount} unread</p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C05621]/20 focus:border-[#C05621]/40 transition-all"
          />
        </div>

        {/* Thread list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeRole === "business"
                ? "Messages from clients will appear here"
                : "Start a project to connect with designers"}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="divide-y divide-gray-100"
          >
            {filteredThreads.map((thread) => (
              <motion.div key={thread.projectId} variants={fadeUpVariants}>
                <Link
                  to={projectPath(thread.projectId)}
                  className="flex items-center gap-3 py-3.5 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {thread.otherUserAvatar ? (
                      <img
                        src={thread.otherUserAvatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C05621]/20 to-[#C05621]/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-[#C05621]">
                          {thread.otherUserName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {thread.unread && (
                      <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#C05621] rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${thread.unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {thread.otherUserName}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {timeAgo(thread.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-0.5">
                      {thread.projectTitle}
                    </p>
                    <p className={`text-xs truncate ${thread.unread ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                      {thread.lastSenderIsMe && <span className="text-gray-400">You: </span>}
                      {thread.lastMessage}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#C05621] transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
