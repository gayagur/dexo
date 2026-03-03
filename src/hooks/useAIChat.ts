import { useState, useCallback, useRef } from "react";
import { streamChat, type ChatMessage } from "@/lib/ai";

export interface DisplayMessage {
  role: "ai" | "user";
  text: string;
  images?: string[];
}

interface UseAIChatReturn {
  messages: DisplayMessage[];
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (
    userText: string,
    images?: string[],
    extraContext?: string
  ) => void;
  addAIMessage: (text: string) => void;
  addUserMessage: (text: string, images?: string[]) => void;
  abort: () => void;
  reset: () => void;
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
}

/**
 * Hook for managing AI chat state with streaming support.
 *
 * Maintains two parallel message arrays:
 * - displayMessages: what the UI shows (ai/user roles, includes images)
 * - llmMessages: what gets sent to the API (user/assistant roles, text only)
 */
export function useAIChat(projectId: string | null = null): UseAIChatReturn {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LLM message history (accumulated for context)
  const llmMessagesRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const addAIMessage = useCallback((text: string) => {
    setDisplayMessages((prev) => [...prev, { role: "ai", text }]);
    llmMessagesRef.current.push({ role: "assistant", content: text });
  }, []);

  const addUserMessage = useCallback(
    (text: string, images?: string[]) => {
      setDisplayMessages((prev) => [...prev, { role: "user", text, images }]);
      llmMessagesRef.current.push({ role: "user", content: text });
    },
    []
  );

  const sendMessage = useCallback(
    (userText: string, images?: string[], extraContext?: string) => {
      setError(null);

      // Add user message to display
      setDisplayMessages((prev) => [
        ...prev,
        { role: "user", text: userText, images },
      ]);

      // Add to LLM context (with extra context if any)
      const llmContent = extraContext
        ? `${userText}\n\n[Context: ${extraContext}]`
        : userText;
      llmMessagesRef.current.push({ role: "user", content: llmContent });

      // Start streaming
      setIsStreaming(true);
      setStreamingContent("");

      const controller = streamChat(
        llmMessagesRef.current,
        projectId,
        // onChunk
        (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        // onDone
        (fullText) => {
          setIsStreaming(false);
          setStreamingContent("");
          setDisplayMessages((prev) => [
            ...prev,
            { role: "ai", text: fullText },
          ]);
          llmMessagesRef.current.push({
            role: "assistant",
            content: fullText,
          });
        },
        // onError
        (errMsg) => {
          setIsStreaming(false);
          setStreamingContent("");
          setError(errMsg);
        }
      );

      abortRef.current = controller;
    },
    [projectId]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();

    // Save partial streaming content as a message
    setStreamingContent((prev) => {
      if (prev) {
        const partial = prev;
        setDisplayMessages((msgs) => [
          ...msgs,
          { role: "ai", text: partial },
        ]);
        llmMessagesRef.current.push({
          role: "assistant",
          content: partial,
        });
      }
      return "";
    });

    setIsStreaming(false);
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setDisplayMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
    setError(null);
    llmMessagesRef.current = [];
    abortRef.current = null;
  }, []);

  return {
    messages: displayMessages,
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    addAIMessage,
    addUserMessage,
    abort,
    reset,
    setMessages: setDisplayMessages,
  };
}
