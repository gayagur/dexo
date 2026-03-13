import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/lib/ai';

// ─── Types ──────────────────────────────────────────────────
interface DisplayMessage {
  role: 'ai' | 'user';
  text: string;
  images?: string[];
}

interface InternalBriefData {
  title: string;
  category: string;
  description: string;
  style: string;
  budget: string;
  materials: string;
  spaceSize: string;
  timeline: string;
  specialRequirements: string;
  roomType: string;
  colorPalette: string;
  [key: string]: string;
}

interface AdditionalDetails {
  inspirations: string;
  materialsToAvoid: string;
  accessibility: string;
  existingItems: string;
  otherNotes: string;
}

type Phase = 'chatting' | 'brief' | 'generating_image' | 'editing_image' | 'done';

export interface ChatSessionState {
  messages: DisplayMessage[];
  llmMessages: ChatMessage[];
  phase: Phase;
  briefData: InternalBriefData | null;
  progressOverrides: Record<string, string>;
  additionalDetails: AdditionalDetails;
  uploadedImages: string[];
  conceptImageUrl: string | null;
  category: string | null;
}

export interface ChatSessionInfo {
  exists: boolean;
  category: string | null;
  updatedAt: string | null;
}

const LS_KEY = 'dexo_chat_session';

// ─── localStorage helpers ───────────────────────────────────
function saveToLocalStorage(state: ChatSessionState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — ignore */ }
}

function loadFromLocalStorage(): ChatSessionState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate basic shape
    if (!Array.isArray(parsed.messages)) return null;
    return parsed as ChatSessionState;
  } catch {
    return null;
  }
}

function clearLocalStorage() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ─── Hook ───────────────────────────────────────────────────
export function useChatSession() {
  const { user } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<ChatSessionInfo>({
    exists: false, category: null, updatedAt: null,
  });
  const [checked, setChecked] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // ─── Check for existing session on mount ──────────────────
  useEffect(() => {
    if (!user) {
      // Check localStorage for anonymous sessions
      const local = loadFromLocalStorage();
      if (local && local.messages.length > 0) {
        setSessionInfo({
          exists: true,
          category: local.category || null,
          updatedAt: null,
        });
      }
      setChecked(true);
      return;
    }

    const checkSession = async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('category, updated_at, messages')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useChatSession] check error:', error.message);
        // Fallback: check localStorage
        const local = loadFromLocalStorage();
        if (local && local.messages.length > 0) {
          setSessionInfo({ exists: true, category: local.category || null, updatedAt: null });
        }
        setChecked(true);
        return;
      }

      if (data && Array.isArray(data.messages) && (data.messages as unknown[]).length > 0) {
        // Check if session is stale (> 3 days)
        const updatedAt = new Date(data.updated_at);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        if (updatedAt < threeDaysAgo) {
          // Auto-cleanup stale session
          await supabase.from('chat_sessions').delete().eq('user_id', user.id);
          clearLocalStorage();
          setChecked(true);
          return;
        }

        setSessionInfo({
          exists: true,
          category: data.category || null,
          updatedAt: data.updated_at,
        });
      }
      setChecked(true);
    };

    checkSession();
  }, [user]);

  // ─── Save session (debounced — 500ms after last call) ─────
  const saveSession = useCallback((state: ChatSessionState) => {
    // Always mirror to localStorage immediately
    saveToLocalStorage(state);

    // Debounce Supabase writes
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (!user) return; // localStorage only for anon users

      const payload = {
        user_id: user.id,
        messages: state.messages as unknown,
        llm_messages: state.llmMessages as unknown,
        phase: state.phase,
        brief_data: state.briefData as unknown,
        progress_overrides: state.progressOverrides as unknown,
        additional_details: state.additionalDetails as unknown,
        uploaded_images: state.uploadedImages,
        concept_image_url: state.conceptImageUrl,
        category: state.category,
      };

      // Skip if nothing changed (compare JSON hash)
      const hash = JSON.stringify(payload);
      if (hash === lastSavedRef.current) return;

      const { error } = await supabase
        .from('chat_sessions')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.error('[useChatSession] save error:', error.message);
        // localStorage already has the data as fallback
      } else {
        lastSavedRef.current = hash;
      }
    }, 500);
  }, [user]);

  // ─── Load session ─────────────────────────────────────────
  const loadSession = useCallback(async (): Promise<ChatSessionState | null> => {
    if (!user) {
      return loadFromLocalStorage();
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      console.error('[useChatSession] load error:', error?.message);
      // Fallback to localStorage
      return loadFromLocalStorage();
    }

    const state: ChatSessionState = {
      messages: (data.messages as DisplayMessage[]) || [],
      llmMessages: (data.llm_messages as ChatMessage[]) || [],
      phase: (data.phase as Phase) || 'chatting',
      briefData: (data.brief_data as InternalBriefData) || null,
      progressOverrides: (data.progress_overrides as Record<string, string>) || {},
      additionalDetails: (data.additional_details as AdditionalDetails) || {
        inspirations: '', materialsToAvoid: '', accessibility: '', existingItems: '', otherNotes: '',
      },
      uploadedImages: data.uploaded_images || [],
      conceptImageUrl: data.concept_image_url || null,
      category: data.category || null,
    };

    return state;
  }, [user]);

  // ─── Delete session ───────────────────────────────────────
  const deleteSession = useCallback(async () => {
    clearLocalStorage();
    setSessionInfo({ exists: false, category: null, updatedAt: null });

    if (!user) return;

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('[useChatSession] delete error:', error.message);
    }
  }, [user]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    sessionInfo,
    checked,
    saveSession,
    loadSession,
    deleteSession,
  };
}
