import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Message, SenderType } from "@/lib/database.types";

export function useMessages(projectId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[useMessages] fetch error:", error.message);
    }
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!projectId) return;

    // Clean up previous channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages-rt-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates (from optimistic update or double-fire)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Replace optimistic message if it matches by content+sender
            const withoutOptimistic = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("optimistic-") &&
                  m.content === newMsg.content &&
                  m.sender_id === newMsg.sender_id
                )
            );
            return [...withoutOptimistic, newMsg];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[useMessages] realtime channel error for project:", projectId);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [projectId]);

  const sendMessage = async (
    content: string,
    senderType: SenderType
  ): Promise<{ error: string | null }> => {
    if (!projectId || !user) return { error: "Missing project or user" };

    // Optimistic update — show message immediately
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      project_id: projectId,
      sender_id: user.id,
      sender_type: senderType,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert({
      project_id: projectId,
      sender_id: user.id,
      sender_type: senderType,
      content,
    });

    if (error) {
      console.error("[useMessages] send error:", error.message);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      return { error: error.message };
    }
    return { error: null };
  };

  return { messages, loading, sendMessage, fetchMessages };
}
